// Site form -> Supabase (if configured) -> Telegram message with status buttons.
// Netlify env vars: TG_TOKEN, TG_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY
import { env, tg, keyboard, secretFor, renderLead } from "../lib/tg.mjs";
import { db, dbOn } from "../lib/db.mjs";

const SERVICES = ["standard", "deep", "reno", "dry", "office"];

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let d;
  try { d = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (d.company) return Response.json({ ok: true }); // honeypot
  const s = (v, n) => String(v ?? "").trim().slice(0, n);
  const phone = s(d.phone, 40), name = s(d.name, 80);
  if (!name || phone.replace(/\D/g, "").length < 9) return new Response("Missing contact", { status: 422 });
  const { token, chat } = env();

  const lead = {
    ref: Date.now().toString(36).slice(-6).toUpperCase(),
    source: "site", name, phone,
    district: s(d.area, 120) || null, when_text: s(d.when, 120) || null,
    service: SERVICES.includes(d.type) ? d.type : null,
    rooms: Number.isFinite(+d.rooms) && +d.rooms > 0 ? Math.min(20, +d.rooms) : null,
    baths: Number.isFinite(+d.baths) && +d.baths > 0 ? Math.min(10, +d.baths) : null,
    options: Array.isArray(d.options) ? d.options.slice(0, 20).map((o) => s(o, 60)) : [],
    quote: Number.isFinite(+d.total) && +d.total > 0 ? Math.round(+d.total) : null,
    details: s(d.text, 3000), lang: d.lang === "uz" ? "uz" : "ru",
    created_at: new Date().toISOString(),
  };

  let row = null;
  if (dbOn()) {
    try { row = (await db("leads", { method: "POST", body: lead }))[0]; } catch (e) { console.error(e.message); }
  }
  if (!token || !chat) return row ? Response.json({ ok: true }) : new Response("Not configured", { status: 500 });

  const r = await tg(token, "sendMessage", { chat_id: chat, text: renderLead(row || lead, []), reply_markup: keyboard(), disable_web_page_preview: true });
  if (row && r.ok) {
    await db(`leads?id=eq.${row.id}`, { method: "PATCH", body: { tg_chat: String(chat), tg_message: r.j.result.message_id } }).catch((e) => console.error(e.message));
  }
  const host = new URL(req.url).host;
  await tg(token, "setWebhook", { url: `https://${host}/api/tg`, secret_token: secretFor(token), allowed_updates: ["callback_query", "message"] }).catch(() => {});
  if (r.ok || row) return Response.json({ ok: true });
  return new Response(`Telegram error: ${r.j.error_code || r.status} ${r.j.description || ""}`, { status: 502 });
};
export const config = { path: "/api/lead" };
