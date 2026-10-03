import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

type Db = Awaited<ReturnType<typeof ctx>>["db"];

async function allAuthUsers(db: Db) {
  const map = new Map<string, User>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    data.users.forEach((u) => map.set(u.id, u));
    if (data.users.length < 1000) break;
  }
  return map;
}

function methodOf(u?: User, fallback?: string | null) {
  const p = fallback || (u?.app_metadata?.provider as string | undefined) || "email";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

const ONLINE_MS = 5 * 60_000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

export const adminUserStats = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await ctx();
  const { data } = await db.from("profiles").select("created_at,last_seen_at,banned,balance").is("deleted_at", null);
  const rows = data ?? [];
  const today = startOfToday();
  const now = Date.now();
  const [{ count: pendingDeposits }, { count: pendingOrders }] = await Promise.all([
    db.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return {
    total: rows.length,
    newToday: rows.filter((r) => new Date(r.created_at).getTime() >= today).length,
    online: rows.filter((r) => r.last_seen_at && now - new Date(r.last_seen_at).getTime() < ONLINE_MS).length,
    banned: rows.filter((r) => r.banned).length,
    totalBalance: rows.reduce((a, r) => a + Number(r.balance), 0),
    pendingDeposits: pendingDeposits ?? 0,
    pendingOrders: pendingOrders ?? 0,
  };
});

const listInput = z.object({
  q: z.string().max(200).default(""),
  filter: z.enum(["all", "verified", "unverified", "banned", "balance", "today"]).default("all"),
  sort: z.enum(["newest", "oldest", "balance", "signin"]).default("newest"),
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(10000).default(25),
});

export type AdminUserRow = {
  id: string; full_name: string; email: string | null; phone: string | null; public_id: string; username: string;
  avatar_url: string | null; balance: number; created_at: string; last_sign_in_at: string | null;
  method: string; verified: boolean; banned: boolean;
};

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const { data: profiles, error } = await db.from("profiles").select("*").is("deleted_at", null);
    if (error) throw new Error(error.message);
    const auth = await allAuthUsers(db);
    const q = data.q.trim().toLowerCase();
    const today = startOfToday();
    let rows: AdminUserRow[] = (profiles ?? []).map((p) => {
      const u = auth.get(p.id);
      return {
        id: p.id, full_name: p.full_name, email: p.email ?? u?.email ?? null, phone: p.phone, public_id: p.public_id,
        username: p.username, avatar_url: p.avatar_url, balance: Number(p.balance), created_at: p.created_at,
        last_sign_in_at: p.last_sign_in_at ?? u?.last_sign_in_at ?? null, method: methodOf(u, p.sign_in_method),
        verified: !!u?.email_confirmed_at, banned: p.banned,
      };
    });
    if (q) {
      rows = rows.filter((r) =>
        r.public_id === q || r.public_id.includes(q) || (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\u0000") ||
        r.username.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q));
    }
    rows = rows.filter((r) => {
      switch (data.filter) {
        case "verified": return r.verified;
        case "unverified": return !r.verified;
        case "banned": return r.banned;
        case "balance": return r.balance > 0;
        case "today": return new Date(r.created_at).getTime() >= today;
        default: return true;
      }
    });
    const t = (s: string | null) => (s ? new Date(s).getTime() : 0);
    rows.sort((a, b) => {
      switch (data.sort) {
        case "oldest": return t(a.created_at) - t(b.created_at);
        case "balance": return b.balance - a.balance;
        case "signin": return t(b.last_sign_in_at) - t(a.last_sign_in_at);
        default: return t(b.created_at) - t(a.created_at);
      }
    });
    const total = rows.length;
    const start = (data.page - 1) * data.size;
    return { total, rows: rows.slice(start, start + data.size) };
  });

export const adminGetUser = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const { data: p } = await db.from("profiles").select("*").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("NOT_FOUND");
    const { data: au } = await db.auth.admin.getUserById(data.id);
    const u = au?.user ?? undefined;
    const [deps, ords, ledger, signIns, notes] = await Promise.all([
      db.from("deposits").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(200),
      db.from("orders").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(200),
      db.from("wallet_ledger").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(300),
      db.from("sign_ins").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(100),
      db.from("notifications").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).limit(100),
    ]);
    const deposits = deps.data ?? [];
    const orders = ords.data ?? [];
    const { api_key_hash, ...profile } = p;
    return {
      profile,
      apiKey: { exists: !!api_key_hash, enabled: p.api_enabled, created_at: p.api_key_created_at },
      email: p.email ?? u?.email ?? null,
      verified: !!u?.email_confirmed_at,
      method: methodOf(u, p.sign_in_method),
      last_sign_in_at: p.last_sign_in_at ?? u?.last_sign_in_at ?? null,
      totalAdded: deposits.filter((d) => d.status === "approved").reduce((a, d) => a + Number(d.amount), 0),
      totalSpent: orders.reduce((a, o) => a + Number(o.charge) - Number(o.refunded), 0),
      deposits, orders, ledger: ledger.data ?? [], signIns: signIns.data ?? [], notifications: notes.data ?? [],
    };
  });

async function notify(db: Db, user_id: string, title: string, body: string, kind: "notification" | "popup" = "notification") {
  await db.from("notifications").insert({ user_id, title, body, kind });
}

export const adminSetPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), password: z.string().min(8).max(128), signOut: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { error } = await db.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) return { ok: false as const, error: error.message };
    const now = new Date().toISOString();
    await db.from("profiles").update({ password_changed_at: now, ...(data.signOut ? { sessions_revoked_at: now } : {}) }).eq("id", data.id);
    await notify(db, data.id, "Password changed", "Your password was changed by support.");
    await s.logAdmin("user_password_changed", { user: data.id, signOut: data.signOut });
    return { ok: true as const };
  });

export const adminSendReset = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), origin: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: au } = await db.auth.admin.getUserById(data.id);
    const email = au?.user?.email;
    if (!email) return { ok: false as const, error: "User has no email" };
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${new URL(data.origin).origin}/reset-password` });
    if (error) return { ok: false as const, error: error.message };
    await s.logAdmin("user_reset_email_sent", { user: data.id });
    return { ok: true as const };
  });

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), amount: z.number().positive().max(1_000_000), direction: z.enum(["add", "subtract"]), note: z.string().trim().min(2).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("profiles").select("balance").eq("id", data.id).maybeSingle();
    const delta = data.direction === "add" ? data.amount : -data.amount;
    const { data: newBal, error } = await db.rpc("admin_adjust_balance", { _user: data.id, _amount: delta, _note: data.note });
    if (error) return { ok: false as const, error: error.message.includes("INSUFFICIENT") ? "Balance cannot go below zero" : error.message };
    await notify(db, data.id, data.direction === "add" ? "Balance added" : "Balance deducted",
      `${data.direction === "add" ? "+" : "-"}$${data.amount.toFixed(2)} — ${data.note}`);
    await s.logAdmin("user_balance_" + data.direction, { user: data.id, note: data.note }, { balance: before?.balance }, { balance: newBal });
    return { ok: true as const };
  });

export const adminSendMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), kind: z.enum(["popup", "notification"]), title: z.string().trim().min(1).max(120), body: z.string().trim().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    await notify(db, data.id, data.title, data.body, data.kind);
    await s.logAdmin("user_message_" + data.kind, { user: data.id, title: data.title });
    return { ok: true as const };
  });

export const adminUpdateProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string().uuid(), full_name: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(30), email: z.string().trim().email().max(200), removeAvatar: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("profiles").select("full_name,phone,email,avatar_url").eq("id", data.id).maybeSingle();
    if (!before) return { ok: false as const, error: "User not found" };
    if (data.email !== before.email) {
      const { error } = await db.auth.admin.updateUserById(data.id, { email: data.email, email_confirm: false });
      if (error) return { ok: false as const, error: error.message };
    }
    const next = { full_name: data.full_name, phone: data.phone || null, email: data.email, ...(data.removeAvatar ? { avatar_url: null } : {}) };
    const { error } = await db.from("profiles").update(next).eq("id", data.id);
    if (error) return { ok: false as const, error: error.code === "23505" ? "Phone already used by another user" : error.message };
    await s.logAdmin("user_profile_updated", { user: data.id }, before, next);
    return { ok: true as const };
  });

export const adminSetBan = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), banned: z.boolean(), reason: z.string().trim().max(300).default("") }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { error: aerr } = await db.auth.admin.updateUserById(data.id, { ban_duration: data.banned ? "876000h" : "none" });
    if (aerr) return { ok: false as const, error: aerr.message };
    await db.from("profiles").update({ banned: data.banned, ban_reason: data.banned ? data.reason || null : null }).eq("id", data.id);
    await s.logAdmin(data.banned ? "user_banned" : "user_unbanned", { user: data.id, reason: data.reason }, { banned: !data.banned }, { banned: data.banned });
    return { ok: true as const };
  });

export const adminVerification = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["mark", "resend"]), origin: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    if (data.action === "mark") {
      const { error } = await db.auth.admin.updateUserById(data.id, { email_confirm: true });
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { data: au } = await db.auth.admin.getUserById(data.id);
      const email = au?.user?.email;
      if (!email) return { ok: false as const, error: "User has no email" };
      const { error } = await db.auth.resend({ type: "signup", email, options: { emailRedirectTo: new URL(data.origin).origin } });
      if (error) return { ok: false as const, error: error.message };
    }
    await s.logAdmin(data.action === "mark" ? "user_marked_verified" : "user_verification_resent", { user: data.id });
    return { ok: true as const };
  });

export const adminApiKey = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["disable", "enable", "regenerate"]) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    let key: string | null = null;
    if (data.action === "regenerate") {
      key = "sk_" + [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
      await db.from("profiles").update({ api_key: key, api_key_hash: await s.sha256(key), api_enabled: true, api_key_created_at: new Date().toISOString() }).eq("id", data.id);
    } else {
      await db.from("profiles").update({ api_enabled: data.action === "enable" }).eq("id", data.id);
    }
    await s.logAdmin("user_api_key_" + data.action, { user: data.id });
    return { ok: true as const, key };
  });
