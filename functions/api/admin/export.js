// GET /api/admin/export  ->  every booking as a spreadsheet (CSV), including disclaimer records
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM bookings ORDER BY date, hour, created_at").all();
  const cols = ["id", "date", "hour", "adults", "children", "child_ages", "name", "email", "phone", "access", "price_each", "total", "payment", "status", "disclaimer_at", "disclaimer_version", "created_at", "cancelled_at"];
  const cell = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s; // stops spreadsheet formula tricks
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [cols.join(","), ...results.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="purrfect-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
