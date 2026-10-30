// Shared Telegram helpers for OQlean site leads.
import { createHash } from "node:crypto";

export const env = () => ({
  token: String(process.env.TG_TOKEN || "").trim().replace(/^bot/i, "").replace(/[\s"'`]/g, ""),
  chat: String(process.env.TG_CHAT_ID || "").trim(),
});

// Webhook secret derived from the bot token, so no extra setting is needed.
export const secretFor = (token) => createHash("sha256").update("oqlean:" + token).digest("hex").slice(0, 48);

export async function tg(token, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && j.ok, status: r.status, j };
}

export const STATUS = {
  new:    "🆕 Новая",
  call:   "📞 Связались",
  ndz:    "📵 НДЗ",
  booked: "📅 Записан",
  done:   "✅ Уборка выполнена",
  later:  "⏸ Позже",
  lost:   "❌ Отказ",
};
const ORDER = [["call", "ndz"], ["booked", "done"], ["later", "lost"]];
export const keyboard = () => ({
  inline_keyboard: ORDER.map((row) => row.map((k) => ({ text: STATUS[k], callback_data: "st:" + k }))),
});

export const now = () => new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", ",");
export const whoOf = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "менеджер";

// Message layout: <head>\n\n[💬 comments...]\n\nСтатус: ...
export function parse(text) {
  const paras = String(text || "").split("\n\n");
  let status = "";
  if (paras.length && paras[paras.length - 1].startsWith("Статус:")) status = paras.pop();
  const comments = [];
  while (paras.length && paras[paras.length - 1].split("\n").every((l) => l.startsWith("💬"))) comments.unshift(...paras.pop().split("\n"));
  const m = status.match(/ведёт (.+?) · /);
  return { head: paras.join("\n\n"), comments, owner: m ? m[1] : "" };
}
export const build = ({ head, comments, status }) => [head, comments.length ? comments.join("\n") : null, status].filter(Boolean).join("\n\n");
