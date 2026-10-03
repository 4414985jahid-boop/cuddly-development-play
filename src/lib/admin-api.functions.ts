import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

/** Orders placed through the reseller API, newest first, plus reseller key info. */
export const adminListApiOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ status: z.string().max(20).optional(), q: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    let q = db.from("orders").select("*").eq("source", "api").is("deleted_at", null).order("created_at", { ascending: false }).limit(300);
    if (data.status && data.status !== "all") q = q.eq("status", data.status as never);
    if (data.q?.trim()) {
      const t = data.q.trim().replace(/[%,()]/g, "");
      q = q.or(`order_code.ilike.%${t}%,link.ilike.%${t}%,service_name.ilike.%${t}%`);
    }
    const { data: orders, error } = await q;
    if (error) throw new Error(error.message);
    const { data: resellers } = await db.from("profiles")
      .select("id, username, full_name, api_enabled, api_key_created_at, api_key_hash")
      .not("api_key_hash", "is", null).order("api_key_created_at", { ascending: false }).limit(500);
    return {
      orders: orders ?? [],
      resellers: (resellers ?? []).map(({ api_key_hash: _h, ...r }) => r),
    };
  });

const STATUSES = ["pending", "processing", "completed", "partial", "rejected", "canceled"] as const;

/** Set an order's status. Partial refunds the undelivered part; rejected/canceled refund the full remaining charge. */
export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(STATUSES),
    delivered: z.number().int().min(0).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: o } = await db.from("orders").select("*").eq("id", data.id).maybeSingle();
    if (!o) throw new Error("Order not found");
    const charge = Number(o.charge), already = Number(o.refunded);
    let target = already;
    let delivered = o.delivered_qty;
    if (data.status === "partial") {
      const d = Math.min(data.delivered ?? 0, o.quantity - 1);
      delivered = d;
      target = Math.floor(charge * (1 - d / o.quantity) * 100) / 100;
    } else if (data.status === "rejected" || data.status === "canceled") {
      target = charge;
    } else if (data.status === "completed") {
      delivered = o.quantity;
    }
    const refund = Math.round((target - already) * 100) / 100;
    if (refund > 0) {
      const { error } = await db.rpc("admin_adjust_balance", { _user: o.user_id, _amount: refund, _note: `Refund ${o.order_code} (${data.status})` });
      if (error) throw new Error(error.message);
    }
    const patch = { status: data.status, refunded: Math.max(already, target), delivered_qty: delivered, updated_at: new Date().toISOString() };
    await db.from("orders").update(patch).eq("id", data.id);
    await s.logAdmin("order_status_changed", { order: o.order_code, refund: refund > 0 ? refund : 0 },
      { status: o.status, refunded: o.refunded }, patch);
    return { ok: true as const, refund: refund > 0 ? refund : 0 };
  });
