import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Card, PageTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/balance")({
  head: () => ({
    meta: [
      { title: "Balance | Premium SMM Store" },
      { name: "description", content: "Your wallet balance and spending summary." },
      { property: "og:title", content: "Balance | Premium SMM Store" },
      { property: "og:description", content: "Your wallet balance." },
    ],
  }),
  component: Balance,
});

function Balance() {
  const { profile, user } = useAuth();
  const { data } = useQuery({
    queryKey: ["ledger-stats", user?.id, profile?.balance],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wallet_ledger").select("amount,kind");
      let added = 0, spent = 0;
      (data ?? []).forEach((r) => {
        const a = Number(r.amount);
        if (r.kind === "deposit") added += a;
        if (r.kind === "order") spent += -a;
        if (r.kind === "refund") spent -= a;
      });
      return { added, spent };
    },
  });
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle>Balance</PageTitle>
      <Card className="text-center">
        <div className="text-sm text-muted-foreground">Available balance (USD)</div>
        <div className="text-gradient font-display text-6xl font-extrabold">{money(profile?.balance)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-muted/60 p-3"><div className="text-muted-foreground">Total added</div><b>{money(data?.added)}</b></div>
          <div className="rounded-2xl bg-muted/60 p-3"><div className="text-muted-foreground">Total spent</div><b>{money(data?.spent)}</b></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link to="/add-funds" className="btn-glow">Add Funds</Link>
          <Link to="/" className="btn-ghost-glow">Back to Home</Link>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/orders" className="btn-ghost-glow">Order History</Link>
        <Link to="/order" className="btn-ghost-glow">Services</Link>
        <Link to="/order" className="btn-ghost-glow">New Order</Link>
        <Link to="/add-funds/history" className="btn-ghost-glow">Add Funds History</Link>
      </div>
    </div>
  );
}
