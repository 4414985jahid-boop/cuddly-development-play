import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { adminListApiOrders, adminSetOrderStatus } from "@/lib/admin-api.functions";
import { adminApiKey } from "@/lib/admin-users.functions";
import { Card, Copyable, Empty, ErrorState, PageTitle, inputCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate, money } from "@/lib/format";

const STATUSES = ["pending", "processing", "completed", "partial", "rejected", "canceled"] as const;
type St = (typeof STATUSES)[number];

export function AdminApi() {
  const list = useServerFn(adminListApiOrders);
  const setStatus = useServerFn(adminSetOrderStatus);
  const keyFn = useServerFn(adminApiKey);
  const qc = useQueryClient();
  const [status, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["admin-api-orders", status, q],
    queryFn: () => list({ data: { status, q } }),
    refetchInterval: 15_000,
  });
  const reload = () => qc.invalidateQueries({ queryKey: ["admin-api-orders"] });

  const change = async (id: string, st: St, qty: number) => {
    let delivered: number | undefined;
    if (st === "partial") {
      const v = prompt(`How many were delivered? (0–${qty - 1})`);
      if (v === null) return;
      delivered = Math.max(0, Math.floor(Number(v) || 0));
    } else if ((st === "rejected" || st === "canceled") && !confirm(`Mark as ${st} and refund the remaining charge?`)) return;
    try {
      const r = await setStatus({ data: { id, status: st, delivered } });
      toast.success(r.refund ? `Updated — refunded ${money(r.refund)}` : "Status updated");
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const keyAction = async (id: string, action: "disable" | "enable" | "regenerate") => {
    if (action === "regenerate" && !confirm("Regenerate this API key? The old key stops working immediately.")) return;
    try {
      const r = await keyFn({ data: { id, action } });
      if (r.key) { await navigator.clipboard.writeText(r.key).catch(() => {}); toast.success("New key copied to clipboard"); }
      else toast.success(action === "disable" ? "API key disabled" : "API key enabled");
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <PageTitle sub="Orders placed by resellers through the API. Refreshes every 15 seconds.">API (Reseller)</PageTitle>
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <input aria-label="Search API orders" placeholder="Search order ID, link or service" className={`${inputCls} !py-2 min-w-0 flex-1`} value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Filter status" className={`${inputCls} !w-auto !py-2`} value={status} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => refetch()} className="btn-ghost-glow !py-2 text-sm"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
        {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : isError ? <ErrorState /> : !data?.orders.length ? <Empty text="No API orders yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-2">Order</th><th className="p-2">Reseller</th><th className="p-2">Service</th><th className="p-2">Link</th><th className="p-2">Charge</th><th className="p-2">Status</th><th className="p-2">Time</th></tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="border-t border-border/50 align-top">
                    <td className="p-2"><Copyable value={o.order_code} className="text-xs" /></td>
                    <td className="p-2"><Copyable value={o.user_id.slice(0, 8)} className="text-xs" /></td>
                    <td className="p-2"><div className="font-medium">{o.service_name}</div><div className="text-xs text-muted-foreground">Qty {o.quantity}</div></td>
                    <td className="max-w-[220px] p-2"><Copyable value={o.link} className="text-xs" /></td>
                    <td className="p-2">{money(o.charge)}{Number(o.refunded) > 0 && <div className="text-xs text-success">−{money(o.refunded)}</div>}</td>
                    <td className="p-2">
                      <select aria-label={`Status for ${o.order_code}`} value={o.status} onChange={(e) => change(o.id, e.target.value as St, o.quantity)}
                        className={`${inputCls} !w-auto !py-1 text-xs`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="label-premium mb-3 flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-primary" /> Reseller API keys</h2>
        {!data?.resellers.length ? <Empty text="No users have API keys yet." /> : (
          <div className="space-y-2">
            {data.resellers.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.full_name || r.username || "User"} {r.username && <span className="text-xs text-muted-foreground">@{r.username}</span>}</div>
                  <div className="text-xs text-muted-foreground"><Copyable value={r.id} className="text-xs" /> · {r.api_key_created_at ? `created ${fmtDate(r.api_key_created_at)}` : ""}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.api_enabled ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{r.api_enabled ? "Active" : "Disabled"}</span>
                {r.api_enabled
                  ? <button onClick={() => keyAction(r.id, "disable")} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><Ban className="h-3.5 w-3.5" /> Disable</button>
                  : <button onClick={() => keyAction(r.id, "enable")} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Enable</button>}
                <button onClick={() => keyAction(r.id, "regenerate")} className="btn-glow !px-3 !py-1.5 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Regenerate</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
