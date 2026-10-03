import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, money } from "@/lib/format";
import { Card, Copyable, PageTitle } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarEditor } from "@/components/AvatarEditor";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Account | Premium SMM Store" },
      { name: "description", content: "Your account details, User ID and security options." },
      { property: "og:title", content: "My Account | Premium SMM Store" },
      { property: "og:description", content: "Your account." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { profile, user, verified } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const out = async (scope: "local" | "global") => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut({ scope });
    toast.success(scope === "global" ? "Logged out from all devices" : "Logged out");
    navigate({ to: "/", replace: true });
  };
  if (!profile) return <Skeleton className="h-64 rounded-3xl" />;
  const rows: [string, React.ReactNode][] = [
    ["User ID", <Copyable value={profile.public_id} className="font-bold" />],
    ["Username", <Copyable value={profile.username} />],
    ["Full name", profile.full_name],
    ["Email", <span>{user?.email} {verified ? <span className="text-success">✓ verified</span> : <span className="text-warning">unverified</span>}</span>],
    ["Phone", profile.phone ?? "—"],
    ["Balance", money(profile.balance)],
    ["Member since", fmtDate(profile.created_at)],
  ];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle>My Account</PageTitle>
      <Card><AvatarEditor /></Card>
      <Card className="divide-y divide-border">
        {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>)}
      </Card>
      <button onClick={() => out("local")} className="btn-ghost-glow w-full"><LogOut className="h-4 w-4" /> Logout</button>
      <button onClick={() => out("global")} className="btn-ghost-glow w-full text-destructive"><ShieldOff className="h-4 w-4" /> Logout from all devices</button>
    </div>
  );
}
