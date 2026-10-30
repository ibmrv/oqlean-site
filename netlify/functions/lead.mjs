// Receives a lead from the site form and posts it to the OQlean Telegram chat with status buttons.
// Netlify env vars (set in Netlify UI, never in code): TG_TOKEN, TG_CHAT_ID
import { env, tg, keyboard, secretFor, STATUS, now, build } from "./_tg.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let d;
  try { d = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (d.company) return Response.json({ ok: true }); // honeypot
  const phone = String(d.phone || "").slice(0, 40).trim();
  const name = String(d.name || "").slice(0, 80).trim();
  if (!name || phone.replace(/\D/g, "").length < 9) return new Response("Missing contact", { status: 422 });
  const { token, chat } = env();
  if (!token || !chat) return new Response("Not configured", { status: 500 });

  const id = Date.now().toString(36).slice(-5).toUpperCase();
  const lines = String(d.text || "").slice(0, 3000).split("\n")
    .filter((l) => !/^(Заявка OQlean|OQlean arizasi|Имя:|Ism:|Телефон:|Telefon:)/.test(l));
  const head = [`🧽 Заявка с сайта`, `${name.toUpperCase()}, ${phone}`, "", ...lines, "", `${now()} · ${d.lang === "uz" ? "UZ" : "RU"} · #сайт #${id}`].join("\n");
  const text = build({ head, comments: [], status: `Статус: ${STATUS.new}` });

  const r = await tg(token, "sendMessage", { chat_id: chat, text, reply_markup: keyboard(), disable_web_page_preview: true });
  // Point button presses and replies to /api/tg (idempotent).
  const host = new URL(req.url).host;
  await tg(token, "setWebhook", { url: `https://${host}/api/tg`, secret_token: secretFor(token), allowed_updates: ["callback_query", "message"] }).catch(() => {});
  if (r.ok) return Response.json({ ok: true });
  return new Response(`Telegram error: ${r.j.error_code || r.status} ${r.j.description || ""}`, { status: 502 });
};
export const config = { path: "/api/lead" };
