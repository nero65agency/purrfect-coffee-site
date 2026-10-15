// Shared booking rules. Opening hours, prices and limits come from the same
// content files Louise edits, so the booking system always matches the site.
import hours from "../content/hours/hours.json";
import settings from "../content/settings/site.json";

export const NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAYS_AHEAD = 60; // how far ahead people can book
export const DISCLAIMER_VERSION = "2026-10";

const num = (t) => {
  const [h, m] = String(t || "0").split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
};
const money = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;

export const rules = {
  maxGuests: Number(settings.rules?.maxGuests) || 15,
  maxChildren: settings.rules?.maxChildren === undefined ? 4 : Number(settings.rules.maxChildren),
};

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });

// Current date and time in the UK, whatever server the code runs on.
export function londonNow() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) + Number(p.minute) / 60 };
}

export const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export function addDays(date, n) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekday = (date) => new Date(date + "T12:00:00Z").getUTCDay();

// Opening hours, bookable slot start times and entry price for a date.
export function dayRule(date) {
  const wd = weekday(date);
  const r = (hours.days || []).find((d) => d.day === NAMES[wd]);
  const price = wd === 0 ? money(settings.entry?.sunday) : wd === 6 ? money(settings.entry?.saturday) : money(settings.entry?.weekday);
  if (!r || r.closed) return { open: false, hours: [], price };
  const list = [];
  for (let h = Math.ceil(num(r.open)); h <= Math.floor(num(r.lastBooking)); h++) list.push(h);
  return { open: true, hours: list, price };
}

// A slot can be booked until 30 minutes after it starts.
export const isPast = (date, hour, now = londonNow()) =>
  date < now.date || (date === now.date && hour + 0.5 <= now.hour);

export async function availability(db, date) {
  const rule = dayRule(date);
  if (!rule.open) return { date, open: false, price: rule.price, slots: [] };
  const [b, o] = await db.batch([
    db.prepare("SELECT hour, SUM(adults + children) AS guests, SUM(children) AS kids FROM bookings WHERE date = ? AND status = 'confirmed' GROUP BY hour").bind(date),
    db.prepare("SELECT hour, max_guests FROM slot_overrides WHERE date = ?").bind(date),
  ]);
  const booked = Object.fromEntries(b.results.map((r) => [r.hour, r]));
  const over = Object.fromEntries(o.results.map((r) => [r.hour, r.max_guests]));
  const now = londonNow();
  const slots = rule.hours.map((h) => {
    const cap = over[h] ?? rules.maxGuests;
    const guests = booked[h]?.guests || 0;
    const kids = booked[h]?.kids || 0;
    const past = isPast(date, h, now);
    return {
      hour: h,
      cap,
      changed: over[h] !== undefined,
      booked: guests,
      kids,
      left: past ? 0 : Math.max(0, cap - guests),
      childrenLeft: past ? 0 : Math.max(0, rules.maxChildren - kids),
      past,
    };
  });
  return { date, open: slots.some((s) => s.cap > 0), price: rule.price, slots };
}

export function makeRef() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "PC-" + Array.from(bytes, (b) => abc[b % abc.length]).join("");
}
