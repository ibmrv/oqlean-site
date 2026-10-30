// Called by the CRM after a manager changes a lead: applies the change server-side and refreshes Telegram.
import { db, dbOn, userFromToken } from "../lib/db.mjs";
import { STATUS } from "../lib/tg.mjs";
import { applyStatus, refreshMessage } from "../lib/leads.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!dbOn()) return new Response("DB not configured", { status: 500 });
  const user = await userFromToken((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!user || !["manager", "admin"].includes(user.role)) return new Response("Forbidden", { status: 403 });
  const d = await req.json().catch(() => ({}));
  const lead = (await db(`leads?id=eq.${+d.lead_id}&select=*`))[0];
  if (!lead) return new Response("Not found", { status: 404 });
  const who = user.name || user.email;
  if (d.status && STATUS[d.status]) await applyStatus(lead, d.status, who, d.status === "lost" && d.reason ? { lost_reason: String(d.reason).slice(0, 120) } : {});
  if (d.comment) await db("lead_events", { method: "POST", body: { lead_id: lead.id, actor: who, kind: "comment", text: String(d.comment).slice(0, 1000) } });
  const tgOk = await refreshMessage(lead.id).catch(() => false);
  return Response.json({ ok: true, telegram: tgOk });
};
export const config = { path: "/api/sync" };
