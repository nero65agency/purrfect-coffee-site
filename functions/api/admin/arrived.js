// POST /api/admin/arrived {id, arrived}  ->  ticks a booking as arrived (or undoes it)
import { json } from "../../../lib-api/booking.js";

export async function onRequestPost({ request, env }) {
  const { id, arrived } = await request.json().catch(() => ({}));
  const r = await env.DB.prepare("UPDATE bookings SET arrived_at = ? WHERE id = ? AND status = 'confirmed'")
    .bind(arrived ? new Date().toISOString() : null, String(id || "")).run();
  return r.meta.changes ? json({ ok: true }) : json({ error: "Booking not found." }, 404);
}
