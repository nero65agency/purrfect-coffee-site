// POST /api/admin/walkin {date, hour, kind: "adult"|"child", delta: 1|-1}
// Keeps one "Walk-ins" entry per hour and counts people up or down, so walk-ins use up places too.
import { dayRule, isDate, makeRef, json, rules } from "../../../lib-api/booking.js";

const NAME = "Walk-ins";

export async function onRequestPost({ request, env }) {
  const { date, hour, kind, delta } = await request.json().catch(() => ({}));
  const rule = dayRule(date);
  if (!isDate(date) || !rule.hours.includes(hour) || ![1, -1].includes(delta) || !["adult", "child"].includes(kind)) return json({ error: "Bad request." }, 400);
  const a = kind === "adult" ? delta : 0, c = kind === "child" ? delta : 0;
  const row = await env.DB.prepare("SELECT id, adults, children FROM bookings WHERE date = ? AND hour = ? AND source = 'walk-in' AND name = ? AND status = 'confirmed' LIMIT 1")
    .bind(date, hour, NAME).first();

  if (delta === -1) {
    if (!row || (kind === "adult" ? row.adults : row.children) < 1) return json({ ok: true });
    if (row.adults + row.children <= 1) await env.DB.prepare("DELETE FROM bookings WHERE id = ?").bind(row.id).run();
    else await env.DB.prepare("UPDATE bookings SET adults = adults + ?, children = children + ?, total = price_each * (adults + children + ? + ?) WHERE id = ?")
      .bind(a, c, a, c, row.id).run();
    return json({ ok: true });
  }

  const room = `(SELECT COALESCE(SUM(adults + children), 0) FROM bookings WHERE date = ?1 AND hour = ?2 AND status = 'confirmed') + 1 <= ?3
     AND (SELECT COALESCE(SUM(children), 0) FROM bookings WHERE date = ?1 AND hour = ?2 AND status = 'confirmed') + ?5 <= ?4`;
  let res;
  if (row) {
    res = await env.DB.prepare(`UPDATE bookings SET adults = adults + ?6, children = children + ?5, total = price_each * (adults + children + 1) WHERE id = ?7 AND ${room}`)
      .bind(date, hour, rule.cap, rules.maxChildren, c, a, row.id).run();
  } else {
    const now = new Date().toISOString();
    res = await env.DB.prepare(
      `INSERT INTO bookings (id, date, hour, adults, children, name, email, price_each, total, payment, status, disclaimer_at, created_at, source, arrived_at)
       SELECT ?7, ?1, ?2, ?6, ?5, '${NAME}', '', ?8, ?8, 'on_arrival', 'confirmed', '', ?9, 'walk-in', ?9 WHERE ${room}`
    ).bind(date, hour, rule.cap, rules.maxChildren, c, a, makeRef(), rule.price, now).run();
  }
  return res.meta.changes === 1 ? json({ ok: true }) : json({ error: `This hour is full (${rule.cap} people, ${rules.maxChildren} children).` }, 409);
}
