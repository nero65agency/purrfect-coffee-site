// Reads the JSON files Louise edits in Tina (/content) at build time.
// Every save in Tina commits to Git, Netlify rebuilds, and the site picks up the change.

type Json = Record<string, any>;

const load = (files: Record<string, unknown>): Json[] =>
  Object.values(files).map((m: any) => (m && m.default ? m.default : m));

const byOrder = (a: Json, b: Json) => (a.order ?? 99) - (b.order ?? 99);

export const settings: Json = load(import.meta.glob("/content/settings/site.json", { eager: true }))[0] ?? {};
export const hours: Json = load(import.meta.glob("/content/hours/hours.json", { eager: true }))[0] ?? { days: [] };

export const cats = load(import.meta.glob("/content/cats/*.json", { eager: true })).sort(byOrder);
export const events = load(import.meta.glob("/content/events/*.json", { eager: true }))
  .filter((e) => !e.hidden)
  .sort(byOrder);
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

export const telHref = (phone: string) => "tel:" + String(phone || "").replace(/\s+/g, "");
