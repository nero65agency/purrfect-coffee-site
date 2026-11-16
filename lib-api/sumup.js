// SumUp online payments (Louise's own SumUp account).
// Needs two settings in Cloudflare: SUMUP_API_KEY (Secret) and SUMUP_MERCHANT_CODE (Text).
const API = "https://api.sumup.com/v0.1";

export const sumupReady = (env) => Boolean(env.SUMUP_API_KEY && env.SUMUP_MERCHANT_CODE);

async function call(env, path, init = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${env.SUMUP_API_KEY}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`SumUp ${r.status}: ${text.slice(0, 300)}`);
  return data;
}

// Creates a SumUp-hosted payment page for one booking.
export async function createCheckout(env, { ref, amount, description, redirectUrl, returnUrl, validUntil }) {
  const c = await call(env, "/checkouts", {
    method: "POST",
    body: JSON.stringify({
      checkout_reference: ref,
      amount: Math.round(amount * 100) / 100,
      currency: "GBP",
      merchant_code: env.SUMUP_MERCHANT_CODE,
      description,
      redirect_url: redirectUrl, // where the customer goes after paying
      return_url: returnUrl, // where SumUp tells us the payment status changed
      valid_until: validUntil, // payment page stops working when the hold runs out
      hosted_checkout: { enabled: true },
    }),
  });
  const url = c.hosted_checkout_url || c.hosted_checkout?.url;
  if (!c.id || !url) throw new Error("SumUp didn't return a payment page: " + JSON.stringify(c).slice(0, 300));
  return { id: c.id, url };
}

export const getCheckout = (env, id) => call(env, `/checkouts/${encodeURIComponent(id)}`);

// Asks SumUp whether a booking waiting for payment has been paid, and confirms it if so.
// Never trusts the browser or the notification on its own: the answer always comes from SumUp.
export async function syncPayment(env, row) {
  if (!row || row.status !== "pending" || !row.checkout_id || !sumupReady(env)) return row?.status ?? "missing";
  let c;
  try { c = await getCheckout(env, row.checkout_id); } catch (e) { console.log("SumUp check failed", e.message); return "pending"; }

  if (c.status === "PAID") {
    if (Math.abs(Number(c.amount) - Number(row.total)) > 0.01) {
      console.log(`Amount mismatch on ${row.id}: paid ${c.amount}, expected ${row.total}`);
      return "pending";
    }
    const now = new Date().toISOString();
    const late = row.hold_until && row.hold_until < now;
    await env.DB.prepare(
      `UPDATE bookings SET status = 'confirmed', paid_at = ?1,
         notes = CASE WHEN ?2 = 1 THEN TRIM(COALESCE(notes, '') || ' Paid after the 15-minute hold ran out, so check this hour isn''t over the limit.') ELSE notes END
       WHERE id = ?3 AND status = 'pending'`
    ).bind(now, late ? 1 : 0, row.id).run();
    return "confirmed";
  }
  if (c.status === "FAILED" || c.status === "EXPIRED") return "failed";
  return "pending";
}
