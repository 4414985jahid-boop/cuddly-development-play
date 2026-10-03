import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Download, Users, UserPlus, Wifi, Ban, Eye, KeyRound, Wallet, MessageSquare, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminListUsers, type AdminUserRow } from "@/lib/admin-users.functions";
import { Avatar } from "@/components/Avatar";
import { Copyable, Empty, ErrorState, PageTitle, inputCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate, money } from "@/lib/format";
import { useUserStats, Stat } from "./AdminDashboard";
import { BalanceDialog, BanDialog, MessageDialog, PasswordDialog } from "./UserActionDialogs";

type Filter = "all" | "verified" | "unverified" | "banned" | "balance" | "today";
type Sort = "newest" | "oldest" | "balance" | "signin";
const FILTERS: [Filter, string][] = [["all", "All"], ["verified", "Verified"], ["unverified", "Not verified"], ["banned", "Banned"], ["balance", "Has balance"], ["today", "New today"]];

type Action = { kind: "password" | "balance" | "message" | "ban"; user: AdminUserRow } | null;

export function AdminUsers({ initialQ, onOpen }: { initialQ: string; onOpen: (id: string) => void }) {
  const list = useServerFn(adminListUsers);
  const stats = useUserStats();
  const [input, setInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [action, setAction] = useState<Action>(null);

  useEffect(() => { setInput(initialQ); setQ(initialQ); setPage(1); }, [initialQ]);
  useEffect(() => { const t = setTimeout(() => { setQ(input); setPage(1); }, 300); return () => clearTimeout(t); }, [input]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "users", q, filter, sort, page, size],
    queryFn: () => list({ data: { q, filter, sort, page, size } }),
    placeholderData: keepPreviousData,
  });
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / size));

  const exportCsv = async () => {
    try {
      const all = await list({ data: { q, filter, sort, page: 1, size: 10000 } });
      const cols = ["full_name", "email", "phone", "public_id", "username", "balance", "created_at", "last_sign_in_at", "method", "verified", "banned"] as const;
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [cols.join(","), ...all.rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success(`Exported ${all.rows.length} users`);
    } catch { toast.error("Export failed"); }
  };

  const done = () => { setAction(null); refetch(); stats.refetch(); };

  return (
    <div>
      <PageTitle sub="Search, view and manage every customer account.">Users</PageTitle>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="Total users" value={stats.data?.total ?? "…"} />
        <Stat icon={UserPlus} label="New today" value={stats.data?.newToday ?? "…"} />
        <Stat icon={Wifi} label="Online now" value={stats.data?.online ?? "…"} />
        <Stat icon={Ban} label="Banned" value={stats.data?.banned ?? "…"} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setQ(input); setPage(1); }} className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search" className={`${inputCls} pl-9`} placeholder="User ID, email, phone, username or name" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <button className="btn-glow">Search</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(([id, label]) => (
          <button key={id} onClick={() => { setFilter(id); setPage(1); }} className={`rounded-full border px-3 py-1 text-sm ${filter === id ? "bg-brand border-transparent text-primary-foreground" : "border-border hover:bg-accent"}`}>{label}</button>
        ))}
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="ml-auto rounded-full border border-border bg-background px-3 py-1 text-sm">
          <option value="newest">Newest</option><option value="oldest">Oldest</option>
          <option value="balance">Highest balance</option><option value="signin">Last sign-in</option>
        </select>
        <button onClick={exportCsv} className="btn-ghost-glow !py-1 text-sm"><Download className="h-4 w-4" /> Export CSV</button>
      </div>

      {isError ? <ErrorState /> : isLoading || !data ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : data.rows.length === 0 ? <Empty text="No users match" /> : (
        <>
          {/* Desktop table */}
          <div className="glass hidden overflow-x-auto rounded-3xl md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  {["#", "", "Full name", "Email", "Phone", "User ID", "Username", "Balance", "Signed up", "Last sign-in", "Method", "Verified", "Status", "Actions"].map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-3 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u, i) => (
                  <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-2 text-muted-foreground">{(page - 1) * size + i + 1}</td>
                    <td className="px-3 py-2"><Avatar path={u.avatar_url} name={u.full_name} className="h-8 w-8" /></td>
                    <td className="max-w-40 truncate px-3 py-2 font-medium">{u.full_name}</td>
                    <td className="max-w-48 truncate px-3 py-2">{u.email ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{u.phone ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2"><Copyable value={u.public_id} className="[&_span]:break-normal" /></td>
                    <td className="whitespace-nowrap px-3 py-2"><Copyable value={u.username} className="[&_span]:break-normal" /></td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">{money(u.balance)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(u.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "—"}</td>
                    <td className="px-3 py-2">{u.method}</td>
                    <td className="px-3 py-2">{u.verified ? <span className="text-success">Yes</span> : <span className="text-warning">No</span>}</td>
                    <td className="px-3 py-2">{u.banned ? <span className="text-destructive">Banned</span> : <span className="text-success">Active</span>}</td>
                    <td className="px-3 py-2"><RowActions u={u} onOpen={onOpen} setAction={setAction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {data.rows.map((u, i) => (
              <div key={u.id} className="glass rounded-3xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{(page - 1) * size + i + 1}</span>
                  <Avatar path={u.avatar_url} name={u.full_name} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{u.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email ?? u.phone ?? "—"}</p>
                  </div>
                  <span className="font-semibold">{money(u.balance)}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span>ID: <Copyable value={u.public_id} /></span>
                  <span>@<Copyable value={u.username} /></span>
                  <span className="text-muted-foreground">Joined {fmtDate(u.created_at)}</span>
                  <span className="text-muted-foreground">{u.method} · {u.verified ? "Verified" : "Not verified"} · {u.banned ? "Banned" : "Active"}</span>
                </div>
                <div className="mt-3"><RowActions u={u} onOpen={onOpen} setAction={setAction} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{data.total} users · page {page} of {pages}</span>
            <div className="flex items-center gap-2">
              <select aria-label="Page size" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} className="rounded-full border border-border bg-background px-3 py-1">
                {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-ghost-glow !py-1">Prev</button>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-ghost-glow !py-1">Next</button>
            </div>
          </div>
        </>
      )}

      {action?.kind === "password" && <PasswordDialog id={action.user.id} name={action.user.full_name} onClose={() => setAction(null)} onDone={done} />}
      {action?.kind === "balance" && <BalanceDialog id={action.user.id} name={action.user.full_name} balance={action.user.balance} onClose={() => setAction(null)} onDone={done} />}
      {action?.kind === "message" && <MessageDialog id={action.user.id} name={action.user.full_name} onClose={() => setAction(null)} onDone={done} />}
      {action?.kind === "ban" && <BanDialog id={action.user.id} name={action.user.full_name} banned={action.user.banned} onClose={() => setAction(null)} onDone={done} />}
    </div>
  );
}

function RowActions({ u, onOpen, setAction }: { u: AdminUserRow; onOpen: (id: string) => void; setAction: (a: Action) => void }) {
  const b = "rounded-full p-1.5 hover:bg-accent";
  return (
    <div className="flex items-center gap-0.5">
      <button title="View" aria-label="View" className={b} onClick={() => onOpen(u.id)}><Eye className="h-4 w-4" /></button>
      <button title="Change password" aria-label="Change password" className={b} onClick={() => setAction({ kind: "password", user: u })}><KeyRound className="h-4 w-4" /></button>
      <button title="Edit balance" aria-label="Edit balance" className={b} onClick={() => setAction({ kind: "balance", user: u })}><Wallet className="h-4 w-4" /></button>
      <button title="Send popup" aria-label="Send popup" className={b} onClick={() => setAction({ kind: "message", user: u })}><MessageSquare className="h-4 w-4" /></button>
      <button title={u.banned ? "Unban" : "Ban"} aria-label={u.banned ? "Unban" : "Ban"} className={b} onClick={() => setAction({ kind: "ban", user: u })}>
        {u.banned ? <ShieldCheck className="h-4 w-4 text-success" /> : <ShieldOff className="h-4 w-4 text-destructive" />}
      </button>
    </div>
  );
}
