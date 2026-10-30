// Minimal Supabase REST client using the service role key (bypasses RLS; server-side only).
// Netlify env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (secret), SUPABASE_ANON_KEY (public, for the CRM page).
export const dbOn = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const base = () => String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = () => String(process.env.SUPABASE_SERVICE_KEY || "").trim();

export async function db(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${base()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key(), Authorization: `Bearer ${key()}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : method !== "GET" ? { Prefer: "return=representation" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  if (!r.ok) throw new Error(`db ${method} ${path}: ${r.status} ${t.slice(0, 200)}`);
  return j;
}

// Verify a CRM user's access token and return their profile (or null).
export async function userFromToken(token) {
  if (!token) return null;
  const r = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: key(), Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  const rows = await db(`profiles?id=eq.${u.id}&select=id,name,email,role`);
  return rows && rows[0] ? rows[0] : null;
}
