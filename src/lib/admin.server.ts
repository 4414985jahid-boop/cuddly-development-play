import { getCookie, getRequestIP, getRequestHeader, setCookie, deleteCookie } from "@tanstack/react-start/server";

export const ADMIN_COOKIE = "adm_sess";
const IDLE_MS = 30 * 60 * 1000; // auto-expire after 30 min inactivity
const MAX_MS = 12 * 60 * 60 * 1000;

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array(h.match(/.{2}/g)!.map((x) => parseInt(x, 16)));

export async function sha256(s: string) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

export async function hashPassword(pw: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256);
  return `pbkdf2$100000$${toHex(salt.buffer as ArrayBuffer)}$${toHex(bits)}`;
}

export async function verifyHash(pw: string, stored: string) {
  const [, , salt] = stored.split("$");
  const h = await hashPassword(pw, salt);
  return timingSafe(h, stored);
}

export function timingSafe(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function clientIp() {
  return getRequestIP({ xForwardedFor: true }) ?? getRequestHeader("cf-connecting-ip") ?? "unknown";
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function logAdmin(action: string, detail: Record<string, unknown> = {}, oldValue?: unknown, newValue?: unknown) {
  const db = await admin();
  await db.from("admin_log").insert({
    action, detail: detail as never, ip: clientIp(),
    old_value: (oldValue ?? null) as never, new_value: (newValue ?? null) as never,
  });
}

/** Normal admin password: DB hash, seeded from the ADMIN_PASSWORD secret on first use. */
export async function getNormalHash(): Promise<string | null> {
  const db = await admin();
  const { data } = await db.from("admin_credentials").select("password_hash").eq("id", 1).maybeSingle();
  if (data?.password_hash) return data.password_hash;
  const initial = process.env["ADMIN_PASSWORD"];
  if (!initial) return null;
  const h = await hashPassword(initial);
  await db.from("admin_credentials").upsert({ id: 1, password_hash: h }, { onConflict: "id", ignoreDuplicates: true });
  return h;
}

export async function checkPassword(pw: string): Promise<boolean> {
  const master = process.env["ADMIN_MASTER_PASSWORD"];
  let ok = false;
  if (master) ok = timingSafe(await sha256(pw), await sha256(master));
  const normal = await getNormalHash();
  if (normal && (await verifyHash(pw, normal))) ok = true;
  return ok;
}

export async function createSession() {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
  const db = await admin();
  await db.from("admin_sessions").insert({
    token_hash: await sha256(token), ip: clientIp(), expires_at: new Date(Date.now() + MAX_MS).toISOString(),
  });
  setCookie(ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_MS / 1000 });
}

export async function destroySession() {
  const token = getCookie(ADMIN_COOKIE);
  if (token) {
    const db = await admin();
    await db.from("admin_sessions").update({ revoked: true }).eq("token_hash", await sha256(token));
  }
  deleteCookie(ADMIN_COOKIE, { path: "/" });
}

/** Returns true when the request carries a live admin session; refreshes idle timer. */
export async function hasAdminSession(): Promise<boolean> {
  const token = getCookie(ADMIN_COOKIE);
  if (!token) return false;
  const db = await admin();
  const th = await sha256(token);
  const { data } = await db.from("admin_sessions").select("*").eq("token_hash", th).maybeSingle();
  if (!data || data.revoked) return false;
  const now = Date.now();
  if (new Date(data.expires_at).getTime() < now || new Date(data.last_seen).getTime() + IDLE_MS < now) return false;
  await db.from("admin_sessions").update({ last_seen: new Date().toISOString() }).eq("token_hash", th);
  return true;
}

export async function requireAdmin() {
  if (!(await hasAdminSession())) throw new Error("ADMIN_UNAUTHORIZED");
}
