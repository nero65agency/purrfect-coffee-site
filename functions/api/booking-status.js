// GET /api/booking-status?ref=PC-XXXXX  ->  used by the page customers land on after paying.
// Returns only what that page needs (no names, emails or phone numbers).
import { json } from "../../lib-api/booking.js";
import { syncPayment } from "../../lib-api/sumup.js";

export async function onRequestGet({ request, env }) {
  const ref = String(new URL(request.url).searchParams.get("ref") || "").toUpperCase().slice(0, 12);
  if (!env.DB || !/^PC-[A-Z0-9]{5}$/.test(ref)) return json({ status: "missing" }, 404);
  let row = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(ref).first();
  if (!row) return json({ status: "missing" }, 404);

  let status = row.status;
  if (status === "pending") {
    status = await syncPayment(env, row);
    if (status === "pending" && row.hold_until && row.hold_until <= new Date().toISOString()) status = "expired";
  }
  return json({
    status, // confirmed | pending | failed | expired | cancelled
    ref: row.id,
    date: row.date,
    hour: row.hour,
    adults: row.adults,
    children: row.children,
    total: row.total,
    paid: status === "confirmed" && row.payment === "online",
    holdUntil: status === "pending" ? row.hold_until : null,
    payUrl: status === "pending" ? row.pay_url : null,
  });
}
