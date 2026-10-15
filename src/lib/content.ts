// Reads the JSON files Louise edits in Tina (/content) at build time.
// Every save in Tina commits to Git, Netlify rebuilds, and the site picks up the change.

type Json = Record<string, any>;

const load = (files: Record<string, unknown>): Json[] =>
  Object.values(files).map((m: any) => (m && m.default ? m.default : m));

const byOrder = (a: Json, b: Json) => (a.order ?? 99) - (b.order ?? 99);

export const settings: Json = load(import.meta.glob("/content/settings/site.json", { eager: true }))[0] ?? {};
export const hours: Json = load(import.meta.glob("/content/hours/hours.json", { eager: true }))[0] ?? { days: [] };

export const photos: Json = load(import.meta.glob("/content/photos/photos.json", { eager: true }))[0] ?? {};

// Policy pages (Markdown). Astro turns each file into a renderable component.
export const policyPages = Object.entries(import.meta.glob("/content/pages/*.md", { eager: true })).map(
  ([path, m]: [string, any]) => ({ slug: path.split("/").pop()!.replace(/\.md$/, ""), title: m.frontmatter?.title ?? "", Content: m.Content })
);

// Links that point somewhere real, or nothing (so no dead "#" buttons).
export const facebookUrl: string = settings.facebookUrl || "";
export const reviewUrl: string =
  settings.googleReviewUrl ||
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("The Purr-fect Coffee Shop, " + (settings.address || "Skegness"));

export const cats = load(import.meta.glob("/content/cats/*.json", { eager: true })).sort(byOrder);
const eventFiles = import.meta.glob("/content/events/*.json", { eager: true });
const allEvents = Object.entries(eventFiles).map(([path, m]: [string, any]) => ({
  ...(m && m.default ? m.default : m),
  slug: path.split("/").pop()!.replace(/\.json$/, ""),
}));
export const events = allEvents.filter((e) => !e.hidden).sort(byOrder);
// True when an event (by file name, e.g. "afternoon-tea") is switched on in What's on.
export const eventLive = (slug: string) => events.some((e) => e.slug === slug);
export const reviews = load(import.meta.glob("/content/reviews/*.json", { eager: true })).sort(byOrder);

export const menuSections = ["Drinks", "Sandwiches and wraps", "Light bites", "Cakes and treats"];
const menuItems = load(import.meta.glob("/content/menu/*.json", { eager: true })).sort(byOrder);
export const menu = menuSections.map((name) => ({
  name,
  items: menuItems.filter((i) => i.category === name),
}));

// Shows a bracketed reminder while something is still to come from Louise.
// Once everything is filled in, set SHOW_GAPS to false so empty fields simply disappear.
export const SHOW_GAPS = true;
export const todo = (value: unknown, reminder: string) =>
  value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : SHOW_GAPS ? `[${reminder}]` : "";

// "seven" / "Seven", so copy keeps up when Louise adds or removes a cat.
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const catWord = WORDS[cats.length] ?? String(cats.length);
export const CatWord = catWord.charAt(0).toUpperCase() + catWord.slice(1);

// Online booking stays switched off until the booking system is connected.
export const bookingOn = settings.rules?.onlineBooking === true;
// Card payments need Stripe. Until it's connected, everyone pays on arrival whatever the setting says.
export const stripeReady = false;
export const payOnArrival = !stripeReady || settings.rules?.payment !== "Pay online when booking";

export const telHref = (phone: string) => "tel:" + String(phone || "").replace(/\s+/g, "");
