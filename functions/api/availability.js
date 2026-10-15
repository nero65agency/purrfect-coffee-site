// GET /api/availability?days=7  ->  places left in each slot, starting today (UK time)
import { availability, londonNow, addDays, json, rules } from "../../lib-api/booking.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Booking database isn't connected yet." }, 503);
  const days = Math.min(14, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
  const start = londonNow().date;
  const out = [];
  for (let i = 0; i < days; i++) out.push(await availability(env.DB, addDays(start, i)));
  return json({ today: start, maxGuests: rules.maxGuests, maxChildren: rules.maxChildren, days: out });
}
