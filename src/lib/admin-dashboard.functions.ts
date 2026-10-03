import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const trackVisit = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ v: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("site_visits").upsert({ visitor_id: data.v }, { onConflict: "visitor_id,day", ignoreDuplicates: true });
    } catch { /* ignore */ }
    return { ok: true };
  });

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export const adminDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const today = dayKey(now);
  const startToday = new Date(today + "T00:00:00Z").getTime();
  const startMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const since30 = new Date(startToday - 29 * 86400_000);

  const [profiles, orders, pendingDeposits, visitsToday, visitsTotal] = await Promise.all([
    db.from("profiles").select("created_at,last_seen_at,balance").is("deleted_at", null),
    db.from("orders").select("created_at,status,charge,refunded,platform_name").is("deleted_at", null),
    db.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("site_visits").select("visitor_id", { count: "exact", head: true }).eq("day", today),
    db.from("site_visits").select("visitor_id", { count: "exact", head: true }),
  ]);
  const P = profiles.data ?? [];
  const O = orders.data ?? [];
  const t = (x: string) => new Date(x).getTime();
  const net = (o: (typeof O)[number]) => (o.status === "canceled" || o.status === "rejected" ? 0 : Number(o.charge) - Number(o.refunded));

  const pendingByPlatform: Record<string, number> = {};
  O.filter((o) => o.status === "pending").forEach((o) => { pendingByPlatform[o.platform_name] = (pendingByPlatform[o.platform_name] ?? 0) + 1; });

  const series = Array.from({ length: 30 }, (_, i) => ({ day: dayKey(new Date(since30.getTime() + i * 86400_000)), orders: 0, revenue: 0, users: 0 }));
  const idx = new Map(series.map((r, i) => [r.day, i]));
  O.forEach((o) => { const i = idx.get(dayKey(o.created_at)); const r = i === undefined ? undefined : series[i]; if (r) { r.orders++; r.revenue += net(o); } });
  P.forEach((p) => { const i = idx.get(dayKey(p.created_at)); const r = i === undefined ? undefined : series[i]; if (r) r.users++; });
  series.forEach((r) => (r.revenue = Math.round(r.revenue * 100) / 100));

  return {
    online: P.filter((p) => p.last_seen_at && Date.now() - t(p.last_seen_at) < 5 * 60_000).length,
    visitorsToday: visitsToday.count ?? 0,
    visitorsTotal: visitsTotal.count ?? 0,
    totalUsers: P.length,
    newToday: P.filter((p) => t(p.created_at) >= startToday).length,
    totalOrders: O.length,
    pendingOrders: O.filter((o) => o.status === "pending").length,
    pendingByPlatform: Object.entries(pendingByPlatform).sort((a, b) => b[1] - a[1]),
    processingOrders: O.filter((o) => o.status === "processing").length,
    pendingDeposits: pendingDeposits.count ?? 0,
    revenueToday: O.filter((o) => t(o.created_at) >= startToday).reduce((a, o) => a + net(o), 0),
    revenueMonth: O.filter((o) => t(o.created_at) >= startMonth).reduce((a, o) => a + net(o), 0),
    revenueAll: O.reduce((a, o) => a + net(o), 0),
    totalBalance: P.reduce((a, p) => a + Number(p.balance), 0),
    series,
  };
});
