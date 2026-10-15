// POST /api/admin/close-day {date, closed}  ->  blocks or reopens every slot on a day
import { dayRule, isDate, json } from "../../../lib-api/booking.js";

export async function onRequestPost({ request, env }) {
  const { date, closed } = await request.json().catch(() => ({}));
  if (!isDate(date)) return json({ error: "Bad request." }, 400);
  if (closed) {
    const stmts = dayRule(date).hours.map((h) =>
      env.DB.prepare("INSERT INTO slot_overrides (date, hour, max_guests) VALUES (?, ?, 0) ON CONFLICT (date, hour) DO UPDATE SET max_guests = 0").bind(date, h));
    if (stmts.length) await env.DB.batch(stmts);
  } else {
    await env.DB.prepare("DELETE FROM slot_overrides WHERE date = ?").bind(date).run();
  }
  return json({ ok: true });
}
