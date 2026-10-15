// Everything under /api/admin needs Louise's login.
import { json } from "../../../lib-api/booking.js";
import { isAdmin } from "../../../lib-api/auth.js";

export async function onRequest(ctx) {
  if (!(await isAdmin(ctx.request, ctx.env))) return json({ error: "Please log in." }, 401);
  if (!ctx.env.DB) return json({ error: "Booking database isn't connected yet." }, 503);
  return ctx.next();
}
