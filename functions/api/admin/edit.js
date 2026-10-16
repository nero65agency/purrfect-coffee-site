// POST /api/admin/edit {id, date, hour, adults, children, childAges, name, phone, email, notes}
// Changes a booking (including moving it). Checks the new hour has room, not counting the booking itself.
import { dayRule, isDate, json, rules } from "../../../lib-api/booking.js";

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const date = b.date, hour = Number(b.hour);
  const adults = Math.floor(Number(b.adults)), children = Math.floor(Number(b.children) || 0);
  const rule = dayRule(date);
  if (!isDate(date) || !rule.hours.includes(hour)) return json({ error: "Please choose one of the opening times for that day." }, 400);
  if (!(adults >= 0) || !(children >= 0) || adults + children < 1) return json({ error: "Add at least one person." }, 400);
  const name = clean(b.name, 80);
  if (!name) return json({ error: "Please add a name." }, 400);

  const res = await env.DB.prepare(
    `UPDATE bookings SET date = ?2, hour = ?3, adults = ?4, children = ?5, child_ages = ?6, name = ?7, phone = ?8, email = ?9, notes = ?10,
       price_each = ?11, total = ?11 * (?4 + ?5)
     WHERE id = ?1 AND status = 'confirmed'
       AND (SELECT COALESCE(SUM(adults + children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND status = 'confirmed' AND id <> ?1) + ?4 + ?5 <= ?12
       AND (SELECT COALESCE(SUM(children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND status = 'confirmed' AND id <> ?1) + ?5 <= ?13`
  ).bind(String(b.id || ""), date, hour, adults, children, clean(b.childAges, 60), name, clean(b.phone, 30), clean(b.email, 120), clean(b.notes, 300),
         rule.price, rule.cap, rules.maxChildren).run();
  return res.meta.changes === 1 ? json({ ok: true }) : json({ error: `That hour doesn't have room (${rule.cap} people, ${rules.maxChildren} children).` }, 409);
}
