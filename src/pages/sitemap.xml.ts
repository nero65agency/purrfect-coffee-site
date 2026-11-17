// Lists the public pages for Google.
import type { APIRoute } from "astro";
import { policyPages } from "../lib/content";

export const GET: APIRoute = ({ site }) => {
  const urls = ["/", ...policyPages.map((p) => "/" + p.slug)].map((path) => new URL(path, site).toString());
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml" } });
};
