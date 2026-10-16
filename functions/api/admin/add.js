// POST /api/admin/add  ->  Louise adds a booking by hand (phone, walk-in).
// Counts against the room limit (not the online places), so walk-ins fit even when online is blocked.
import { dayRule, isDate, makeRef, json, rules, londonNow, addDays } from "../../../lib-api/booking.js";

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const date = b.date, hour = Number(b.hour);
  const adults = Math.floor(Number(b.adults)), children = Math.floor(Number(b.children) || 0);
  const name = clean(b.name, 80);
  const source = ["phone", "walk-in", "other"].includes(b.source) ? b.source : "phone";
  const today = londonNow().date;

  if (!isDate(date) || date < addDays(today, -7) || date > addDays(today, 365)) return json({ error: "Please choose a date." }, 400);
  const rule = dayRule(date);
  if (!rule.hours.includes(hour)) return json({ error: "Please choose one of the opening times for that day." }, 400);
  if (!(adults >= 0) || !(children >= 0) || adults + children < 1) return json({ error: "Add at least one person." }, 400);
  if (name.length < 1) return json({ error: "Please add a name." }, 400);

  const ref = makeRef();
  const now = new Date().toISOString();
  const res = await env.DB.prepare(
    `INSERT INTO bookings (id, date, hour, adults, children, child_ages, name, email, phone, access,
       price_each, total, payment, status, disclaimer_at, disclaimer_version, created_at, source)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'on_arrival', 'confirmed', ?13, ?14, ?15, ?16
     WHERE (SELECT COALESCE(SUM(adults + children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND status = 'confirmed') + ?4 + ?5 <= ?17
       AND (SELECT COALESCE(SUM(children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND status = 'confirmed') + ?5 <= ?18`
  ).bind(ref, date, hour, adults, children, clean(b.childAges, 60), name, clean(b.email, 120), clean(b.phone, 30), clean(b.access, 120),
         rule.price, rule.price * (adults + children), b.disclaimer ? now : "", b.disclaimer ? "signed in café" : "", now, source,
         rules.maxGuests, rules.maxChildren).run();

  if (res.meta.changes !== 1) {
    return json({ error: `That would take this hour over ${rules.maxGuests} people or ${rules.maxChildren} children.` }, 409);
  }
  return json({ ok: true, ref });
}
