// Lead workflow shared by Telegram and CRM.
import { db } from "./db.mjs";
import { env, tg, keyboard, renderLead } from "./tg.mjs";

// Set status, record who did it, and keep the order in step with the lead.
export async function applyStatus(lead, status, who, extra = {}) {
  const patch = { status, updated_at: new Date().toISOString(), ...extra };
  if (!lead.owner && who) patch.owner = who;
  await db(`leads?id=eq.${lead.id}`, { method: "PATCH", body: patch });
  await db("lead_events", { method: "POST", body: { lead_id: lead.id, actor: who, kind: "status", status } });
  if (status === "booked" || status === "done") {
    const orders = await db(`orders?lead_id=eq.${lead.id}&status=neq.cancelled&select=id,status,date&order=id.desc&limit=1`);
    if (!orders.length) {
      await db("orders", { method: "POST", body: {
        lead_id: lead.id, client_name: lead.name, phone: lead.phone, district: lead.district,
        service: lead.service, rooms: lead.rooms, price: lead.quote || 0, notes: lead.when_text ? `Когда: ${lead.when_text}` : null,
        status: status === "done" ? "done" : "scheduled",
      } });
    } else if (status === "done" && orders[0].status !== "done") {
      await db(`orders?id=eq.${orders[0].id}`, { method: "PATCH", body: { status: "done", date: orders[0].date || new Date().toISOString().slice(0, 10) } });
    }
  }
}

// Re-render the Telegram message of a lead from the DB.
export async function refreshMessage(leadId) {
  const { token } = env();
  const lead = (await db(`leads?id=eq.${leadId}&select=*`))[0];
  if (!token || !lead || !lead.tg_chat || !lead.tg_message) return false;
  const events = await db(`lead_events?lead_id=eq.${leadId}&select=*&order=created_at.asc`);
  const r = await tg(token, "editMessageText", { chat_id: lead.tg_chat, message_id: lead.tg_message, text: renderLead(lead, events), reply_markup: keyboard(), disable_web_page_preview: true });
  return r.ok || /not modified/.test(r.j.description || "");
}
