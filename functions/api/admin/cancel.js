// POST /api/admin/cancel {id}  ->  cancels a booking and frees its places (the record is kept)
import { json } from "../../../lib-api/booking.js";

export async function onRequestPost({ request, env }) {
  const { id } = await request.json().catch(() => ({}));
  const r = await env.DB.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND status = 'confirmed'")
    .bind(new Date().toISOString(), String(id || "")).run();
  return r.meta.changes ? json({ ok: true }) : json({ error: "Booking not found." }, 404);
}
