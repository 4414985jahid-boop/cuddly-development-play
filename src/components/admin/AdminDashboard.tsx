import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, UserPlus, Wifi, Eye, Globe, Wallet, PlusCircle, ShoppingCart, Clock, Loader, DollarSign, Package, BellRing } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { adminDashboardStats } from "@/lib/admin-dashboard.functions";
import { Card, ErrorState, PageTitle } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { money } from "@/lib/format";
import { adminUserStats } from "@/lib/admin-users.functions";

export function useUserStats() {
  const fn = useServerFn(adminUserStats);
  return useQuery({ queryKey: ["admin", "user-stats"], queryFn: () => fn(), refetchInterval: 60_000 });
}

export function Stat({ icon: Icon, label, value, onClick }: { icon: typeof Users; label: string; value: string | number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="glass flex items-center gap-3 rounded-3xl p-4 text-left disabled:cursor-default">
      <span className="bg-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary-foreground"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate font-display text-xl font-bold">{value}</span>
      </span>
    </button>
  );
}

const cfg = {
  orders: { label: "Orders", color: "var(--primary)" },
  revenue: { label: "Revenue", color: "var(--primary)" },
  users: { label: "New users", color: "var(--primary)" },
};

function MiniChart({ title, data, k, bar }: { title: string; data: Record<string, unknown>[]; k: "orders" | "revenue" | "users"; bar?: boolean }) {
  return (
    <Card>
      <h3 className="mb-2 text-sm font-semibold">{title} — last 30 days</h3>
      <ChartContainer config={cfg} className="h-48 w-full">
        {bar ? (
          <BarChart data={data}><CartesianGrid vertical={false} strokeOpacity={0.15} /><XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={10} /><YAxis allowDecimals={false} fontSize={10} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey={k} fill={`var(--color-${k})`} radius={4} /></BarChart>
        ) : (
          <AreaChart data={data}><CartesianGrid vertical={false} strokeOpacity={0.15} /><XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={10} /><YAxis fontSize={10} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} /><Area dataKey={k} stroke={`var(--color-${k})`} fill={`var(--color-${k})`} fillOpacity={0.25} type="monotone" /></AreaChart>
        )}
      </ChartContainer>
    </Card>
  );
}

export function AdminDashboard({ onGo }: { onGo: (id: string) => void }) {
  const fn = useServerFn(adminDashboardStats);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => fn(), refetchInterval: 15_000 });
  const quick = [
    { label: "Pending Orders", icon: ShoppingCart, go: "orders" },
    { label: "Pending Add Funds", icon: PlusCircle, go: "add-funds" },
    { label: "Add Service", icon: Package, go: "services" },
    { label: "Send Popup", icon: BellRing, go: "users" },
  ];
  return (
    <div className="space-y-4">
      <PageTitle sub="Live overview — refreshes every 15 seconds.">Dashboard</PageTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quick.map((q) => (
          <button key={q.label} onClick={() => onGo(q.go)} className="btn-ghost-glow"><q.icon className="h-4 w-4" /> {q.label}</button>
        ))}
      </div>
      {isError ? <ErrorState /> : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-3xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Wifi} label="Online now" value={data.online} />
            <Stat icon={Eye} label="Visitors today" value={data.visitorsToday} />
            <Stat icon={Globe} label="Visitors total" value={data.visitorsTotal} />
            <Stat icon={Users} label="Total users" value={data.totalUsers} onClick={() => onGo("users")} />
            <Stat icon={UserPlus} label="New users today" value={data.newToday} onClick={() => onGo("users")} />
            <Stat icon={ShoppingCart} label="Total orders" value={data.totalOrders} />
            <Stat icon={Clock} label="Pending orders" value={data.pendingOrders} />
            <Stat icon={Loader} label="Processing orders" value={data.processingOrders} />
            <Stat icon={PlusCircle} label="Pending Add Funds" value={data.pendingDeposits} />
            <Stat icon={DollarSign} label="Revenue today" value={money(data.revenueToday)} />
            <Stat icon={DollarSign} label="Revenue this month" value={money(data.revenueMonth)} />
            <Stat icon={DollarSign} label="Revenue all time" value={money(data.revenueAll)} />
            <Stat icon={Wallet} label="Balance held by users" value={money(data.totalBalance)} />
          </div>
          <Card>
            <h3 className="mb-2 text-sm font-semibold">Pending orders by platform</h3>
            {data.pendingByPlatform.length === 0 ? <p className="text-sm text-muted-foreground">No pending orders.</p> : (
              <div className="flex flex-wrap gap-2">
                {data.pendingByPlatform.map(([name, n]) => (
                  <span key={name} className="rounded-full border border-primary/40 px-3 py-1 text-sm">{name}: <b>{n}</b></span>
                ))}
              </div>
            )}
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            <MiniChart title="Orders" data={data.series} k="orders" bar />
            <MiniChart title="Revenue" data={data.series} k="revenue" />
            <MiniChart title="New users" data={data.series} k="users" bar />
          </div>
        </>
      )}
    </div>
  );
}
