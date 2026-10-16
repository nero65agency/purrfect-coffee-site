// POST /api/admin/slot {date, hour, places}  ->  set online places for one slot (0 blocks it, null resets)
import { isDate, json, dayRule } from "../../../lib-api/booking.js";

export async function onRequestPost({ request, env }) {
  const { date, hour, places } = await request.json().catch(() => ({}));
  if (!isDate(date) || !Number.isInteger(hour)) return json({ error: "Bad request." }, 400);
  const cap = dayRule(date).cap;
  if (places === null || places === undefined || places === cap) {
    await env.DB.prepare("DELETE FROM slot_overrides WHERE date = ? AND hour = ?").bind(date, hour).run();
  } else {
    const n = Math.max(0, Math.min(cap, Math.floor(Number(places))));
    await env.DB.prepare("INSERT INTO slot_overrides (date, hour, max_guests) VALUES (?, ?, ?) ON CONFLICT (date, hour) DO UPDATE SET max_guests = excluded.max_guests")
      .bind(date, hour, n).run();
  }
  return json({ ok: true });
}
