import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GENERIC = "Invalid password";
const LOCK_MIN = 15;

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200), device: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const s = await import("./admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = s.clientIp();
    const keys = [`ip:${ip}`, `dev:${data.device}`];
    const since = new Date(Date.now() - LOCK_MIN * 60_000).toISOString();
    for (const key of keys) {
      const { data: rows } = await supabaseAdmin.from("admin_login_attempts")
        .select("success").eq("key", key).gte("created_at", since).order("created_at", { ascending: false }).limit(5);
      if (rows && rows.length >= 5 && rows.every((r) => !r.success)) {
        return { ok: false as const, error: `Too many attempts. Try again in ${LOCK_MIN} minutes.` };
      }
    }
    const ok = await s.checkPassword(data.password);
    await supabaseAdmin.from("admin_login_attempts").insert(keys.map((key) => ({ key, ip, success: ok })));
    await s.logAdmin(ok ? "login_success" : "login_failed", { device: data.device });
    if (!ok) return { ok: false as const, error: GENERIC };
    await s.createSession();
    return { ok: true as const };
  });

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const s = await import("./admin.server");
  return { admin: await s.hasAdminSession() };
});

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const s = await import("./admin.server");
  await s.destroySession();
  await s.logAdmin("logout");
  return { ok: true };
});

export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ current: z.string().min(1).max(200), next: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const s = await import("./admin.server");
    await s.requireAdmin();
    if (!(await s.checkPassword(data.current))) return { ok: false as const, error: "Current password is incorrect" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const h = await s.hashPassword(data.next);
    const { error } = await supabaseAdmin.from("admin_credentials").upsert({ id: 1, password_hash: h, updated_at: new Date().toISOString() });
    if (error) return { ok: false as const, error: "Could not save" };
    await s.logAdmin("password_changed");
    return { ok: true as const };
  });
