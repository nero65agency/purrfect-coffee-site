// POST /api/book  ->  creates a booking if there's still room (checked in one step, so two
// people can't take the last places at the same time).
import { dayRule, isPast, londonNow, addDays, isDate, makeRef, json, rules, pad, people, NAMES, weekday,
  ACTIVE, HOLD_MINUTES, payOnlineChosen, DAYS_AHEAD, DISCLAIMER_VERSION } from "../../lib-api/booking.js";
import { sumupReady, createCheckout } from "../../lib-api/sumup.js";

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
  if (adults + children > rule.cap) return json({ error: `We can take up to ${rule.cap} people in one booking.` }, 400);
  if (children > rules.maxChildren) return json({ error: `We can only take ${rules.maxChildren} children at a time.` }, 400);
  if (name.length < 2) return json({ error: "Please add your name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please check your email address." }, 400);
  if (b.agree !== true) return json({ error: "Please agree to the disclaimer to book." }, 400);

  const ref = makeRef();
  const nowIso = new Date().toISOString();
  const total = rule.price * (adults + children);
  // Online payment: hold the places for 15 minutes while the customer pays on SumUp's page.
  // If SumUp isn't connected yet, the booking falls back to paying on arrival.
  const payOnline = payOnlineChosen && sumupReady(env) && total > 0;
  const holdUntil = payOnline ? new Date(Date.now() + HOLD_MINUTES * 60000).toISOString() : null;
  const res = await env.DB.prepare(
    `INSERT INTO bookings (id, date, hour, adults, children, child_ages, name, email, phone, access,
       price_each, total, payment, status, disclaimer_at, disclaimer_version, created_at, source
     , hold_until)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?17, ?18, ?13, ?14, ?13, 'online', ?19
     WHERE (SELECT COALESCE(SUM(adults + children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND ${ACTIVE}) + ?4 + ?5
           <= COALESCE((SELECT max_guests FROM slot_overrides WHERE date = ?2 AND hour = ?3), ?15)
       AND (SELECT COALESCE(SUM(children), 0) FROM bookings WHERE date = ?2 AND hour = ?3 AND ${ACTIVE}) + ?5 <= ?16`
  ).bind(ref, date, hour, adults, children, ages, name, email, phone, access,
         rule.price, total, nowIso, DISCLAIMER_VERSION, rule.cap, rules.maxChildren,
         payOnline ? "online" : "on_arrival", payOnline ? "pending" : "confirmed", holdUntil).run();

  if (!res.meta || res.meta.changes !== 1) return json({ error: "Sorry, that slot has just filled up. Please choose another time." }, 409);
  if (payOnline) {
    const origin = new URL(request.url).origin;
    const d = new Date(date + "T12:00:00Z");
    try {
      const c = await createCheckout(env, {
        ref,
        amount: total,
        description: `Cat café visit ${NAMES[weekday(date)].slice(0, 3)} ${d.getUTCDate()}/${d.getUTCMonth() + 1} ${pad(hour)}, ${people(adults, children)} (${ref})`,
        redirectUrl: `${origin}/booking-confirmed?ref=${ref}`,
        returnUrl: `${origin}/api/sumup-webhook`,
        validUntil: holdUntil,
      });
      await env.DB.prepare("UPDATE bookings SET checkout_id = ?, pay_url = ? WHERE id = ?").bind(c.id, c.url, ref).run();
      return json({ ok: true, ref, payUrl: c.url, total });
    } catch (e) {
      console.log("SumUp checkout failed", e.message);
      await env.DB.prepare("DELETE FROM bookings WHERE id = ? AND status = 'pending'").bind(ref).run();
      return json({ error: "Sorry, online payment isn't working right now. Please call us to book." }, 502);
    }
  }
  // Louise will get an email for each booking once her domain and email are set up.
  return json({ ok: true, ref, date, hour, adults, children, total, payOnArrival: true });
}
