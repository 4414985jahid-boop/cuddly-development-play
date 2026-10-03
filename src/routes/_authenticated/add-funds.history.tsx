import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MethodLogo } from "@/lib/brand";
import { fmtDate, money } from "@/lib/format";
import { Card, Copyable, Empty, ErrorState, PageTitle, StatusBadge, inputCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/add-funds/history")({
  head: () => ({
    meta: [
      { title: "Add Funds History | Premium SMM Store" },
      { name: "description", content: "Track all your Add Funds requests and their status." },
      { property: "og:title", content: "Add Funds History | Premium SMM Store" },
      { property: "og:description", content: "Your Add Funds requests." },
    ],
  }),
  component: History,
});

const TABS = ["all", "pending", "approved", "rejected", "cancelled"] as const;

function History() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["deposits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("deposits").select("*, payment_methods(logo_url)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`deps-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["deposits"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const all = data ?? [];
  const term = q.trim().toLowerCase();
  const list = all.filter((d) => (tab === "all" || d.status === tab) && (!term || d.code.toLowerCase().includes(term) || d.txn_id.toLowerCase().includes(term)));
  const stats = [
    { l: "Total requests", v: all.length },
    { l: "Approved", v: all.filter((d) => d.status === "approved").length },
    { l: "Pending", v: all.filter((d) => d.status === "pending").length },
    { l: "Rejected", v: all.filter((d) => d.status === "rejected" || d.status === "cancelled").length },
    { l: "Approved amount", v: money(all.filter((d) => d.status === "approved").reduce((a, d) => a + Number(d.amount), 0)) },
  ];

  return (
    <div className="space-y-4">
      <PageTitle>Add Funds History</PageTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => <Card key={s.l} className="!p-4 text-center"><div className="text-xs text-muted-foreground">{s.l}</div><div className="font-display text-xl font-bold">{s.v}</div></Card>)}
      </div>
      <div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" /><input className={`${inputCls} pl-12`} placeholder="Search by Add Fund ID or transaction ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{t}</button>)}
      </div>
      {isError && <ErrorState />}
      {isLoading && <Skeleton className="h-32 rounded-3xl" />}
      {data && list.length === 0 && <Empty text="No Add Funds requests yet." />}
      <div className="grid gap-3">
        {list.map((d) => (
          <Card key={d.id} className="!p-4">
            <div className="flex items-start gap-3">
              <MethodLogo name={d.method_name} kind={d.method_kind} logo={(d as { payment_methods?: { logo_url: string | null } | null }).payment_methods?.logo_url} className="h-10 w-10" />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2"><Copyable value={d.code} className="font-bold" /><StatusBadge status={d.status} /></div>
                <div className="font-display text-lg font-bold">{money(d.amount)} {d.bdt_amount && <span className="text-sm text-muted-foreground">(৳{Number(d.bdt_amount).toFixed(2)})</span>}</div>
                <div className="text-xs text-muted-foreground">{d.method_name} • {fmtDate(d.created_at)}</div>
                <div className="text-xs">Txn: <Copyable value={d.txn_id} /></div>
                {d.admin_note && <div className="text-xs text-muted-foreground">Note: {d.admin_note}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3"><Link to="/add-funds" className="btn-glow">Add Funds</Link><Link to="/order" className="btn-ghost-glow">Buy Service</Link></div>
    </div>
  );
}
