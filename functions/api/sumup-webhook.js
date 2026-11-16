// POST /api/sumup-webhook  ->  SumUp calls this when a payment's status changes.
// The message only tells us which checkout to look at; syncPayment asks SumUp for the real status.
import { syncPayment } from "../../lib-api/sumup.js";

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const id = body?.id || body?.payload?.id || body?.checkout_id;
  if (id && env.DB) {
    const row = await env.DB.prepare("SELECT * FROM bookings WHERE checkout_id = ?").bind(String(id)).first();
    if (row) await syncPayment(env, row);
  }
  return new Response(null, { status: 204 });
}
