// GET /api/admin/summary?from=YYYY-MM-DD&days=15  ->  guests booked per day, for the day strip
import { isDate, addDays, londonNow, json } from "../../../lib-api/booking.js";

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const from = isDate(q.get("from")) ? q.get("from") : londonNow().date;
  const days = Math.min(45, Math.max(1, Number(q.get("days")) || 15));
  const { results } = await env.DB.prepare(
    "SELECT date, SUM(adults + children) AS guests FROM bookings WHERE date BETWEEN ? AND ? AND status = 'confirmed' GROUP BY date"
  ).bind(from, addDays(from, days - 1)).all();
  return json(Object.fromEntries(results.map((r) => [r.date, r.guests])));
}
