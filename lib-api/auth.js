// Louise's login for the bookings page. The password is ADMIN_PASSWORD,
// set as a secret in the Cloudflare project. Logins last 30 days.
const enc = new TextEncoder();

async function sign(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const COOKIE = "pc_admin";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function loginCookie(env) {
  const exp = Date.now() + MAX_AGE * 1000;
  const token = exp + "." + (await sign(env.ADMIN_PASSWORD, "admin:" + exp));
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}
export const logoutCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || Number(exp) < Date.now()) return false;
  return sig === (await sign(env.ADMIN_PASSWORD, "admin:" + exp));
}
