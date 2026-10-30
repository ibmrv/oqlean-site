// Shared Telegram helpers for OQlean leads.
import { createHash } from "node:crypto";

export const env = () => ({
  token: String(process.env.TG_TOKEN || "").trim().replace(/^bot/i, "").replace(/[\s"'`]/g, ""),
  chat: String(process.env.TG_CHAT_ID || "").trim(),
});
export const secretFor = (token) => createHash("sha256").update("oqlean:" + token).digest("hex").slice(0, 48);

export async function tg(token, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && j.ok, status: r.status, j };
}

// Lead statuses (DB value -> label). Button keys are the same values.
export const STATUS = {
  new: "🆕 Новая", contacted: "📞 Связались", ndz: "📵 НДЗ", booked: "📅 Записан",
  done: "✅ Уборка выполнена", later: "⏸ Позже", lost: "❌ Отказ",
};
const ORDER = [["contacted", "ndz"], ["booked", "done"], ["later", "lost"]];
export const keyboard = () => ({ inline_keyboard: ORDER.map((row) => row.map((k) => ({ text: STATUS[k], callback_data: "st:" + k }))) });

const SERVICE = { standard: "Поддерживающая", deep: "Генеральная", reno: "После ремонта", dry: "Химчистка", office: "Офис / ЖК" };
const SOURCE = { site: "#сайт", instagram: "#instagram", telegram: "#telegram", phone: "#звонок", referral: "#рекомендация", other: "#другое" };
export const fmtTime = (d) => new Date(d || Date.now()).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const money = (n) => Number(n || 0).toLocaleString("ru-RU").replace(/ | /g, " ");
export const whoOf = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "менеджер";

// Build the Telegram message text for a lead from DB rows.
export function renderLead(lead, events = []) {
  const head = [`🧽 Заявка ${lead.source === "site" ? "с сайта" : ""}`.trim(), `${String(lead.name || "").toUpperCase()}, ${lead.phone}`];
  const info = [];
  if (lead.service) info.push(`${SERVICE[lead.service] || lead.service}${lead.rooms ? ` · ${lead.rooms}-комн.` : ""}${lead.baths > 1 ? ` · санузлов ${lead.baths}` : ""}`);
  if (Array.isArray(lead.options) && lead.options.length) info.push(`Доп.: ${lead.options.join(", ")}`);
  if (lead.quote) info.push(`Смета: ${money(lead.quote)} сум`);
  if (lead.district || lead.address) info.push(`Район: ${[lead.district, lead.address].filter(Boolean).join(", ")}`);
  if (lead.when_text) info.push(`Когда: ${lead.when_text}`);
  if (!info.length && lead.details) info.push(lead.details);
  const tail = `${fmtTime(lead.created_at)} · ${SOURCE[lead.source] || "#" + lead.source} #${lead.ref || lead.id}`;
  const notes = events.filter((e) => e.kind === "comment" || e.kind === "status")
    .map((e) => `💬 ${e.actor || "—"} (${fmtTime(e.created_at)}): ${e.kind === "status" ? STATUS[e.status] || e.status : e.text}`);
  const last = [...events].reverse().find((e) => e.kind === "status");
  const status = `Статус: ${STATUS[lead.status] || lead.status}${lead.lost_reason ? ` (${lead.lost_reason})` : ""}${lead.owner ? ` · ведёт ${lead.owner}` : ""}${last ? ` · ${fmtTime(last.created_at)}` : ""}`;
  return [head.join("\n"), info.join("\n"), tail, notes.join("\n"), status].filter(Boolean).join("\n\n").slice(0, 4000);
}

// Fallback for messages that are not in the DB: edit the text itself.
export function parse(text) {
  const paras = String(text || "").split("\n\n");
  let status = "";
  if (paras.length && paras[paras.length - 1].startsWith("Статус:")) status = paras.pop();
  const comments = [];
  while (paras.length && paras[paras.length - 1].split("\n").every((l) => l.startsWith("💬"))) comments.unshift(...paras.pop().split("\n"));
  const m = status.match(/ведёт (.+?)( · |$)/);
  return { head: paras.join("\n\n"), comments, owner: m ? m[1] : "", status };
}
export const build = ({ head, comments, status }) => [head, comments.length ? comments.join("\n") : null, status].filter(Boolean).join("\n\n");
