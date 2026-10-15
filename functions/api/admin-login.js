// POST /api/admin-login {password}  |  DELETE /api/admin-login  (log out)
import { json } from "../../lib-api/booking.js";
import { loginCookie, logoutCookie } from "../../lib-api/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({ error: "The bookings password hasn't been set up yet." }, 503);
  const { password } = await request.json().catch(() => ({}));
  if (password !== env.ADMIN_PASSWORD) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return json({ error: "That password isn't right." }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": await loginCookie(env) });
}
export const onRequestDelete = () => json({ ok: true }, 200, { "set-cookie": logoutCookie() });
