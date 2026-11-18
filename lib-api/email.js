// Booking emails, sent through Resend (resend.com).
// Needs three settings in Cloudflare:
//   RESEND_API_KEY  (Secret)  the key from Resend
//   EMAIL_FROM      (Text)    e.g. The Purr-fect Coffee Shop <bookings@thepurrfectcoffee.co.uk>
//   NOTIFY_EMAIL    (Text)    Louise's inbox: gets a copy of every booking, and customers' replies
// If any are missing, no emails are sent and bookings carry on as normal.
import settings from "../content/settings/site.json";
import { NAMES, weekday, pad, people } from "./booking.js";

export const emailReady = (env) => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (date) => {
  const d = new Date(date + "T12:00:00Z");
  return `${NAMES[weekday(date)]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const when = (b) => `${longDate(b.date)}, ${pad(b.hour)} – ${pad(b.hour + 1)}`;
const paidLine = (b) => (b.payment === "online" && (b.paid_at || b.status === "confirmed") ? `£${b.total} paid online` : `£${b.total} to pay on arrival`);

async function send(env, { to, subject, html, text, replyTo }) {
  if (!emailReady(env) || !to) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!r.ok) console.log("Email failed", r.status, (await r.text()).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.log("Email failed", e.message);
    return false;
  }
}

const shell = (title, body) => `<!doctype html><html><body style="margin:0;background:#F4E4D2;font-family:Arial,Helvetica,sans-serif;color:#3E2415">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<div style="background:#ffffff;border-radius:18px;padding:28px 24px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;font-size:28px;line-height:1.2">${title}</h1>
${body}
</div>
<p style="font-size:12px;color:#7a6252;text-align:center;margin:16px 0 0">The Purr-fect Coffee Shop · ${esc(settings.address)} · ${esc(settings.phone)}</p>
</div></body></html>`;

const rows = (list) =>
  `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:8px 0 16px">${list
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 0;border-top:1px solid #efe2d3;color:#7a6252;width:40%">${k}</td><td style="padding:8px 0;border-top:1px solid #efe2d3;font-weight:bold">${v}</td></tr>`)
    .join("")}</table>`;

// To Louise: one email per new booking (online bookings only; she adds phone and walk-in bookings herself).
export async function notifyOwner(env, b, siteUrl) {
  if (!env.NOTIFY_EMAIL) return false;
  const subject = `New booking: ${longDate(b.date).replace(/^(\w{3})\w*/, "$1")} ${pad(b.hour)}, ${b.name}, ${people(b.adults, b.children)}`;
  const html = shell(
    "New booking",
    rows([
      ["When", esc(when(b))],
      ["Name", esc(b.name)],
      ["Guests", esc(people(b.adults, b.children))],
      ["Children's ages", esc(b.child_ages)],
      ["Access needs", esc(b.access)],
      ["Payment", esc(paidLine(b))],
      ["Phone", b.phone ? `<a href="tel:${esc(b.phone).replace(/\s+/g, "")}" style="color:#3E2415">${esc(b.phone)}</a>` : ""],
      ["Email", `<a href="mailto:${esc(b.email)}" style="color:#3E2415">${esc(b.email)}</a>`],
      ["Reference", esc(b.id)],
    ]) +
      `<p style="margin:0"><a href="${siteUrl}/bookings" style="display:inline-block;background:#3E2415;color:#F4E4D2;text-decoration:none;padding:12px 20px;border-radius:99px;font-weight:bold">Open bookings</a></p>`
  );
  const text = `New booking\n\n${when(b)}\n${b.name}, ${people(b.adults, b.children)}\n${paidLine(b)}\n${b.phone || ""} ${b.email}\nRef ${b.id}\n\n${siteUrl}/bookings`;
  return send(env, { to: env.NOTIFY_EMAIL, subject, html, text, replyTo: b.email });
}

// To the customer: confirmation of their visit.
export async function confirmCustomer(env, b) {
  const first = String(b.name || "").trim().split(/\s+/)[0] || "there";
  const policy = settings.rules?.rescheduling ? ` ${settings.rules.rescheduling}` : "";
  const subject = `You're booked in: ${longDate(b.date)}, ${pad(b.hour)}`;
  const html = shell(
    `You're booked in, ${esc(first)}!`,
    `<p style="margin:0 0 8px;font-size:16px">Thank you for booking. The cats can't wait to meet you.</p>` +
      rows([
        ["When", esc(when(b))],
        ["Guests", esc(people(b.adults, b.children))],
        ["Payment", esc(paidLine(b))],
        ["Reference", esc(b.id)],
        ["Where", esc(settings.address)],
      ]) +
      `<p style="margin:0 0 12px;font-size:15px">Please give your name or reference when you arrive. Children must be supervised by an adult at all times.</p>
<p style="margin:0 0 12px;font-size:14px;color:#7a6252">All payments are non-refundable.${esc(policy)} If you can't make it, please call us on ${esc(settings.phone)} so we can offer your place to someone else.</p>
<p style="margin:0;font-size:14px;color:#7a6252">Any questions? Just reply to this email.</p>`
  );
  const text = `You're booked in, ${first}!\n\n${when(b)}\n${people(b.adults, b.children)}\n${paidLine(b)}\nReference: ${b.id}\n${settings.address}\n\nAll payments are non-refundable.${policy}\nIf you can't make it, please call ${settings.phone}.`;
  return send(env, { to: b.email, subject, html, text, replyTo: env.NOTIFY_EMAIL });
}

// Both emails for a newly confirmed online booking. Never throws.
export async function bookingEmails(env, bookingId, siteUrl) {
  if (!emailReady(env) || !env.DB) return;
  try {
    const b = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(bookingId).first();
    if (!b || b.status !== "confirmed") return;
    await Promise.all([notifyOwner(env, b, siteUrl), confirmCustomer(env, b)]);
  } catch (e) {
    console.log("Booking emails failed", e.message);
  }
}
