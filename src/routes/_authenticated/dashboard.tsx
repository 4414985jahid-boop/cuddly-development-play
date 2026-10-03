import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ShoppingCart, Clock, CheckCircle2, PlusCircle, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Premium SMM Store" },
      { name: "description", content: "Your balance, orders and quick actions at a glance." },
      { property: "og:title", content: "Dashboard | Premium SMM Store" },
      { property: "og:description", content: "Your account overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status,charge");
      const rows = data ?? [];
      return {
        total: rows.length,
        active: rows.filter((r) => r.status === "pending" || r.status === "processing").length,
        done: rows.filter((r) => r.status === "completed").length,
        spent: rows.filter((r) => r.status !== "canceled" && r.status !== "rejected").reduce((a, r) => a + Number(r.charge), 0),
      };
    },
  });
  const stats = [
    { label: "Balance", value: money(profile?.balance ?? 0), icon: Wallet },
    { label: "Total orders", value: data?.total ?? "—", icon: ShoppingCart },
    { label: "In progress", value: data?.active ?? "—", icon: Clock },
    { label: "Completed", value: data?.done ?? "—", icon: CheckCircle2 },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle sub={`Welcome back${profile?.full_name ? ", " + profile.full_name : ""}.`}>Dashboard</PageTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4">
            <s.icon className="h-5 w-5 text-primary" />
            <div className="mt-2 text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Total spent: <b>{money(data?.spent ?? 0)}</b></p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/order" className="btn-glow"><ShoppingCart className="h-4 w-4" /> New Order</Link>
        <Link to="/add-funds" className="btn-ghost-glow"><PlusCircle className="h-4 w-4" /> Add Funds</Link>
        <Link to="/reseller-api" className="btn-ghost-glow"><Code2 className="h-4 w-4" /> Reseller API</Link>
      </div>
    </div>
  );
}
