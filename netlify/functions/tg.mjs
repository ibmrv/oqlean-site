// Telegram webhook: status buttons and reply-comments on site lead messages.
import { env, tg, keyboard, secretFor, STATUS, now, whoOf, parse, build } from "./_tg.mjs";

const ok = () => Response.json({ ok: true });

export default async (req) => {
  const { token, chat } = env();
  if (!token) return new Response("Not configured", { status: 500 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== secretFor(token)) return new Response("Forbidden", { status: 403 });
  const u = await req.json().catch(() => ({}));

  // Status button pressed
  const q = u.callback_query;
  if (q && q.message && String(q.message.chat.id) === chat && String(q.data || "").startsWith("st:")) {
    const key = q.data.slice(3);
    if (!STATUS[key]) return ok();
    const p = parse(q.message.text);
    const owner = p.owner || whoOf(q.from);
    const status = `Статус: ${STATUS[key]} · ведёт ${owner} · ${now()}`;
    p.comments.push(`💬 ${whoOf(q.from)} (${now()}): ${STATUS[key]}`);
    await tg(token, "editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: build({ ...p, status }), reply_markup: keyboard(), disable_web_page_preview: true });
    await tg(token, "answerCallbackQuery", { callback_query_id: q.id, text: STATUS[key] + " ✓" });
    return ok();
  }

  // Manager replied to a lead message: add the reply as a comment
  const m = u.message;
  const orig = m && m.reply_to_message;
  if (m && orig && m.text && String(m.chat.id) === chat && orig.from && orig.from.is_bot && (orig.text || "").startsWith("🧽 Заявка с сайта")) {
    const p = parse(orig.text);
    const statusLine = (orig.text.split("\n\n").pop() || "").startsWith("Статус:") ? orig.text.split("\n\n").pop() : `Статус: ${STATUS.new}`;
    p.comments.push(`💬 ${whoOf(m.from)} (${now()}): ${m.text.slice(0, 500)}`);
    await tg(token, "editMessageText", { chat_id: m.chat.id, message_id: orig.message_id, text: build({ ...p, status: statusLine }), reply_markup: keyboard(), disable_web_page_preview: true });
    await tg(token, "setMessageReaction", { chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: "emoji", emoji: "👌" }] }).catch(() => {});
  }
  return ok();
};
export const config = { path: "/api/tg" };
