// POST /api/book  ->  creates a booking if there's still room (checked in one step, so two
// people can't take the last places at the same time).
import { dayRule, isPast, londonNow, addDays, isDate, makeRef, json, rules, DAYS_AHEAD, DISCLAIMER_VERSION } from "../../lib-api/booking.js";

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Booking database isn't connected yet." }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Something went wrong. Please try again." }, 400); }

  const date = b.date, hour = Number(b.hour);
  const adults = Math.floor(Number(b.adults)), children = Math.floor(Number(b.children) || 0);
  const name = clean(b.name, 80), email = clean(b.email, 120), phone = clean(b.phone, 30);
  const ages = clean(b.childAges, 60), access = clean(b.access, 120);
  const today = londonNow().date;

  if (!isDate(date) || date < today || date > addDays(today, DAYS_AHEAD)) return json({ error: "Please choose a different day." }, 400);
  const rule = dayRule(date);
  if (!rule.open || !rule.hours.includes(hour) || isPast(date, hour)) return json({ error: "That time isn't available. Please choose another." }, 409);
  if (!(adults >= 1) || children < 0) return json({ error: "Every booking needs at least one adult." }, 400);
  if (adults + children > rules.maxGuests) return json({ error: `We can take up to ${rules.maxGuests} people in one booking.` }, 400);
  if (children > rules.maxChildren) return json({ error: `We can only take ${rules.maxChildren} children at a time.` }, 400);
  if (name.length < 2) return json({ error: "Please add your name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please check your email address." }, 400);
  if (b.agree !== true) return json({ error: "Please agree to the disclaimer to book." }, 400);

  const ref = makeRef();
  const nowIso = new Date().toISOString();
  const res = await env.DB.prepare(
    `INSERT INTO bookings (id, date, hour, adults, children, child_ages, name, email, phone, access,
       price_each, total, payment, status, disclaimer_at, disclaimer_version, created_at, source)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'on_arrival', 'confirmed', ?13, ?14, ?13, 'online'
     WHERE (SELECT COALESCE(SUM(adults + children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND status = 'confirmed') + ?4 + ?5
           <= COALESCE((SELECT max_guests FROM slot_overrides WHERE date = ?2 AND hour = ?3), ?15)
       AND (SELECT COALESCE(SUM(children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND status = 'confirmed') + ?5 <= ?16`
  ).bind(ref, date, hour, adults, children, ages, name, email, phone, access,
         rule.price, rule.price * (adults + children), nowIso, DISCLAIMER_VERSION, rules.maxGuests, rules.maxChildren).run();

  if (!res.meta || res.meta.changes !== 1) return json({ error: "Sorry, that slot has just filled up. Please choose another time." }, 409);
  return json({ ok: true, ref, date, hour, adults, children, total: rule.price * (adults + children) });
}
