import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PlatformIcon } from "@/lib/brand";
import { fmtDate, friendlyError, money } from "@/lib/format";
import { Card, Copyable, Empty, ErrorState, PageTitle, StatusBadge, inputCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Order History | Premium SMM Store" },
      { name: "description", content: "Track every order and its delivery status in real time." },
      { property: "og:title", content: "Order History | Premium SMM Store" },
      { property: "og:description", content: "Your orders." },
    ],
  }),
  component: Orders,
});

const TABS = [
  { k: "all", l: "All" }, { k: "pending", l: "Pending" }, { k: "processing", l: "Processing" },
  { k: "completed", l: "Completed" }, { k: "partial", l: "Partial" }, { k: "rejected", l: "Rejected/Canceled" },
] as const;
const PAGE = 20;
const FLOW = ["pending", "processing", "completed"];

function Orders() {
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const query = useInfiniteQuery({
    queryKey: ["orders", user?.id, tab, term],
    enabled: !!user,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let r = supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).range(pageParam, pageParam + PAGE - 1);
      if (tab === "rejected") r = r.in("status", ["rejected", "canceled"]);
      else if (tab !== "all") r = r.eq("status", tab as "pending");
      if (term) {
        const safe = term.replace(/[%,()]/g, "");
        r = r.or(`order_code.ilike.%${safe}%,service_name.ilike.%${safe}%,link.ilike.%${safe}%`);
      }
      const { data, error } = await r;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`orders-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["orders"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const cancel = async (id: string) => {
    if (!confirm("Cancel this order? The full amount will be refunded.")) return;
    const { error } = await supabase.rpc("cancel_my_order", { _order_id: id });
    if (error) { toast.error(friendlyError(error.message)); return; }
    toast.success("Order canceled and refunded");
    refreshProfile();
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const list = query.data?.pages.flat() ?? [];

  return (
    <div className="space-y-4">
      <PageTitle>Order History</PageTitle>
      <div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" /><input className={`${inputCls} pl-12`} placeholder="Search by Order ID, service or link" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === t.k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{t.l}</button>)}
      </div>
      {query.isError && <ErrorState />}
      {query.isLoading && <Skeleton className="h-40 rounded-3xl" />}
      {query.isSuccess && list.length === 0 && <Empty text="No orders found." />}
      <div className="grid gap-3">
        {list.map((o) => {
          const step = FLOW.indexOf(o.status);
          return (
            <Card key={o.id} className="!p-4">
              <div className="flex items-start gap-3">
                <PlatformIcon slug={o.platform_slug} className="mt-1 h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2"><Copyable value={o.order_code} className="font-bold" /><StatusBadge status={o.status} /></div>
                  <div className="text-xs text-muted-foreground">{o.category_name}</div>
                  <div className="label-premium">{o.service_name}</div>
                  <div className="flex flex-wrap gap-x-4 text-xs"><span>Qty: <b>{o.quantity}</b></span><span>Charge: <b>{money(o.charge)}</b></span><span>{fmtDate(o.created_at)}</span></div>
                  <a href={o.link} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary">{o.link}</a>
                  {o.delivered_qty != null && <div className="text-xs">Delivered: <b>{o.delivered_qty}</b></div>}
                  {Number(o.refunded) > 0 && <div className="text-xs text-success">Refunded: {money(o.refunded)}</div>}
                  {o.admin_note && <div className="text-xs text-muted-foreground">Note: {o.admin_note}</div>}
                  {step >= 0 && (
                    <div className="flex items-center gap-1 pt-2">
                      {FLOW.map((f, i) => <div key={f} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} title={f} />)}
                    </div>
                  )}
                  {o.status === "pending" && <button onClick={() => cancel(o.id)} className="pt-1 text-xs font-semibold text-destructive">Cancel order</button>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {query.hasNextPage && <button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="btn-ghost-glow w-full">Load more</button>}
      <div className="grid grid-cols-2 gap-3"><Link to="/add-funds" className="btn-glow">Add Funds</Link><Link to="/order" className="btn-ghost-glow">Buy Service</Link></div>
    </div>
  );
}
