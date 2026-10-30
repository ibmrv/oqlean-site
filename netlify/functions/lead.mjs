// Sends a site lead to the OQlean Telegram chat.
// Netlify env vars (set in Netlify UI, never in code): TG_TOKEN, TG_CHAT_ID
export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let d;
  try { d = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (d.company) return Response.json({ ok: true }); // honeypot: bots fill hidden field
  const phone = String(d.phone || "").slice(0, 40);
  const name = String(d.name || "").slice(0, 80);
  if (!name || phone.replace(/\D/g, "").length < 9) return new Response("Missing contact", { status: 422 });
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const body = String(d.text || "").slice(0, 3000);
  const text = `🧽 <b>Новая заявка с сайта</b>\n\n${esc(body)}\n\n🌐 ${d.lang === "uz" ? "UZ" : "RU"} · oqlean.uz`;
  const TG_TOKEN = String(process.env.TG_TOKEN || "").trim().replace(/^bot/i, "").replace(/[\s"'`]/g, "");
  const TG_CHAT_ID = String(process.env.TG_CHAT_ID || "").trim();
  if (!TG_TOKEN || !TG_CHAT_ID) return new Response("Not configured", { status: 500 });
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (r.ok) return Response.json({ ok: true });
  const t = await r.json().catch(() => ({}));
  return new Response("Telegram error: " + (t.error_code || r.status) + " " + (t.description || ""), { status: 502 });
};
export const config = { path: "/api/lead" };
