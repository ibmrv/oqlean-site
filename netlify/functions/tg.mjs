// Telegram webhook: status buttons and reply-comments on lead messages. DB is the source of truth when configured.
import { env, tg, keyboard, secretFor, STATUS, whoOf, renderLead, fmtTime, parse, build } from "../lib/tg.mjs";
import { db, dbOn } from "../lib/db.mjs";
import { applyStatus, refreshMessage } from "../lib/leads.mjs";

const ok = () => Response.json({ ok: true });

export default async (req) => {
  const { token, chat } = env();
  if (!token) return new Response("Not configured", { status: 500 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== secretFor(token)) return new Response("Forbidden", { status: 403 });
  const u = await req.json().catch(() => ({}));

  const q = u.callback_query;
  if (q && q.message && String(q.message.chat.id) === chat && String(q.data || "").startsWith("st:")) {
    const key = q.data.slice(3);
    if (!STATUS[key]) return ok();
    const who = whoOf(q.from);
    let lead = null;
    if (dbOn()) {
      lead = (await db(`leads?tg_chat=eq.${chat}&tg_message=eq.${q.message.message_id}&select=*`).catch(() => []))[0];
    }
    if (lead) {
      await applyStatus(lead, key, who);
      await refreshMessage(lead.id);
    } else {
      const p = parse(q.message.text);
      p.comments.push(`💬 ${who} (${fmtTime()}): ${STATUS[key]}`);
      const status = `Статус: ${STATUS[key]} · ведёт ${p.owner || who} · ${fmtTime()}`;
      await tg(token, "editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: build({ ...p, status }), reply_markup: keyboard(), disable_web_page_preview: true });
    }
    await tg(token, "answerCallbackQuery", { callback_query_id: q.id, text: STATUS[key] + " ✓" });
    return ok();
  }

  const m = u.message, orig = m && m.reply_to_message;
  if (m && orig && m.text && String(m.chat.id) === chat && orig.from && orig.from.is_bot && (orig.text || "").startsWith("🧽 Заявка")) {
    const who = whoOf(m.from);
    let lead = null;
    if (dbOn()) lead = (await db(`leads?tg_chat=eq.${chat}&tg_message=eq.${orig.message_id}&select=id`).catch(() => []))[0];
    if (lead) {
      await db("lead_events", { method: "POST", body: { lead_id: lead.id, actor: who, kind: "comment", text: m.text.slice(0, 1000) } });
      await refreshMessage(lead.id);
    } else {
      const p = parse(orig.text);
      p.comments.push(`💬 ${who} (${fmtTime()}): ${m.text.slice(0, 500)}`);
      await tg(token, "editMessageText", { chat_id: m.chat.id, message_id: orig.message_id, text: build({ ...p, status: p.status || "Статус: " + STATUS.new }), reply_markup: keyboard(), disable_web_page_preview: true });
    }
    await tg(token, "setMessageReaction", { chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: "emoji", emoji: "👌" }] }).catch(() => {});
  }
  return ok();
};
export const config = { path: "/api/tg" };
