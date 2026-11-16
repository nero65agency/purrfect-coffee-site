// GET /api/admin/day?date=YYYY-MM-DD  ->  slots, numbers and every booking for that day
import { availability, isDate, londonNow, json, rules, ACTIVE } from "../../../lib-api/booking.js";

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams.get("date");
  const date = isDate(q) ? q : londonNow().date;
  const [av, list] = await Promise.all([
    availability(env.DB, date),
    env.DB.prepare(`SELECT * FROM bookings WHERE date = ? AND (status <> 'pending' OR ${ACTIVE}) ORDER BY hour, created_at`).bind(date).all(),
  ]);
  // If opening hours change after people have booked, keep those bookings visible.
  const known = new Set(av.slots.map((x) => x.hour));
  for (const b of list.results) {
    if (b.status === "cancelled" || known.has(b.hour)) continue;
    known.add(b.hour);
    const here = list.results.filter((x) => x.hour === b.hour && x.status !== "cancelled");
    av.slots.push({ hour: b.hour, cap: 0, changed: false, outside: true, booked: here.reduce((n, x) => n + x.adults + x.children, 0),
      kids: here.reduce((n, x) => n + x.children, 0), left: 0, childrenLeft: 0, past: false });
  }
  av.slots.sort((x, y) => x.hour - y.hour);
  return json({ ...av, hours: av.slots.filter((x) => !x.outside).map((x) => x.hour), maxGuests: av.roomCap, maxChildren: rules.maxChildren, bookings: list.results });
}
