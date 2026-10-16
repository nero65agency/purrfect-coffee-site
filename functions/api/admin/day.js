// GET /api/admin/day?date=YYYY-MM-DD  ->  slots, numbers and every booking for that day
import { availability, isDate, londonNow, json, rules } from "../../../lib-api/booking.js";

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams.get("date");
  const date = isDate(q) ? q : londonNow().date;
  const [av, list] = await Promise.all([
    availability(env.DB, date),
    env.DB.prepare("SELECT * FROM bookings WHERE date = ? ORDER BY hour, created_at").bind(date).all(),
  ]);
  return json({ ...av, hours: av.slots.map((x) => x.hour), maxGuests: av.roomCap, maxChildren: rules.maxChildren, bookings: list.results });
}
