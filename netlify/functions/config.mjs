// Public CRM config: Supabase URL and anon key (both are safe to expose; RLS protects data).
export default async () => Response.json({
  url: process.env.SUPABASE_URL || null,
  anon: process.env.SUPABASE_ANON_KEY || null,
}, { headers: { "Cache-Control": "no-store" } });
export const config = { path: "/api/config" };
