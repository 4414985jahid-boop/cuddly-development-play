import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  KeyRound, LogOut, ShieldAlert, LayoutDashboard, Users, ShoppingCart, PlusCircle, Package, Code2, Music,
  Type, Menu as MenuIcon, Home, LifeBuoy, HelpCircle, FileText, Languages, BellRing, Palette, Settings,
  DatabaseBackup, Activity, Trash2, Search, PanelLeft,
} from "lucide-react";
import { toast } from "sonner";
import { adminLogout, adminStatus, changeAdminPassword } from "@/lib/admin.functions";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminUserDetail } from "@/components/admin/AdminUserDetail";
import { AdminMusic } from "@/components/admin/AdminMusic";
import { AdminApi } from "@/components/admin/AdminApi";
import { AdminOrders } from "@/components/admin/AdminOrders";

const search = z.object({
  section: z.string().optional(),
  user: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/admin")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Admin | Premium SMM Store" },
      { name: "description", content: "Store administration." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin | Premium SMM Store" },
      { property: "og:description", content: "Store administration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { id: "users", label: "Users", icon: Users, ready: true },
  { id: "orders", label: "Orders", icon: ShoppingCart, ready: true },
  { id: "add-funds", label: "Add Funds", icon: PlusCircle },
  { id: "services", label: "Services", icon: Package },
  { id: "api", label: "API (Reseller)", icon: Code2, ready: true },
  { id: "music", label: "Music", icon: Music, ready: true },
  { id: "content", label: "Website Content & Labels", icon: Type },
  { id: "menu", label: "Menu & Navigation", icon: MenuIcon },
  { id: "home", label: "Home Page", icon: Home },
  { id: "support", label: "Support & Contacts", icon: LifeBuoy },
  { id: "qna", label: "QnA", icon: HelpCircle },
  { id: "pages", label: "Policies & Pages", icon: FileText },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "notifications", label: "Notifications & Popups", icon: BellRing },
  { id: "theme", label: "Theme & Branding", icon: Palette },
  { id: "settings", label: "Settings", icon: Settings, ready: true },
  { id: "backup", label: "Backup & Health", icon: DatabaseBackup },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "trash", label: "Trash", icon: Trash2 },
] as const;

function AdminPage() {
  const status = useServerFn(adminStatus);
  const { data, isLoading } = useQuery({ queryKey: ["admin-status"], queryFn: () => status(), staleTime: 0 });
  if (isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (!data?.admin) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-warning" />
        <p className="mt-3 font-semibold">Admin session required or expired.</p>
      </Card>
    );
  }
  return <AdminLayout />;
}

function SideNav({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  return (
    <nav className="space-y-0.5">
      {NAV.map((n) => {
        const ready = "ready" in n && n.ready;
        const active = current === n.id;
        return (
          <button key={n.id} disabled={!ready} onClick={() => onPick(n.id)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${active ? "bg-brand text-primary-foreground shadow-glow" : ready ? "hover:bg-accent" : "cursor-not-allowed opacity-45"}`}>
            <n.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{n.label}</span>
            {!ready && <span className="text-[10px] uppercase tracking-wide">Soon</span>}
          </button>
        );
      })}
    </nav>
  );
}

function AdminLayout() {
  const { section = "dashboard", user, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin" });
  const logout = useServerFn(adminLogout);
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState(false);
  const [global, setGlobal] = useState("");
  const pick = (id: string) => { setDrawer(false); navigate({ search: { section: id } }); };
  const out = async () => {
    await logout();
    qc.removeQueries({ queryKey: ["admin-status"] });
    toast.success("Logged out from admin");
    navigate({ to: "/" });
  };
  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: { section: "users", q: global.trim() || undefined } });
  };

  return (
    <div className="flex gap-6">
      <aside className="glass sticky top-24 hidden h-[calc(100vh-8rem)] w-60 shrink-0 overflow-y-auto rounded-3xl p-3 lg:block">
        <SideNav current={section} onPick={pick} />
      </aside>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader><SheetTitle>Admin</SheetTitle></SheetHeader>
          <div className="px-3 pb-6"><SideNav current={section} onPick={pick} /></div>
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button aria-label="Open admin menu" onClick={() => setDrawer(true)} className="btn-ghost-glow !px-3 lg:hidden"><PanelLeft className="h-4 w-4" /></button>
          <form onSubmit={runSearch} className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search users" placeholder="Search users by ID, email, phone, username or name" className={`${inputCls} !py-2 pl-9`} value={global} onChange={(e) => setGlobal(e.target.value)} />
          </form>
          <button onClick={out} className="btn-ghost-glow !py-2 text-sm"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
        {section === "users" && user ? <AdminUserDetail id={user} onBack={() => navigate({ search: { section: "users", q } })} />
          : section === "users" ? <AdminUsers initialQ={q ?? ""} onOpen={(id) => navigate({ search: { section: "users", user: id, q } })} />
          : section === "settings" ? <SettingsSection />
          : section === "music" ? <AdminMusic />
          : section === "orders" ? <AdminOrders />
          : section === "api" ? <AdminApi />
          : <AdminDashboard onGo={pick} />}
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="max-w-2xl space-y-4">
      <PageTitle>Settings</PageTitle>
      <ChangePassword />
    </div>
  );
}

function ChangePassword() {
  const change = useServerFn(changeAdminPassword);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (f.next !== f.confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const r = await change({ data: { current: f.current, next: f.next } });
      if (!r.ok) toast.error(r.error);
      else { toast.success("Admin password changed"); setEditing(false); setF({ current: "", next: "", confirm: "" }); }
    } catch { toast.error("Session expired — log in again"); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <h2 className="label-premium mb-3 flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-primary" /> Change Admin Password</h2>
      {!editing ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg tracking-widest">••••••••</span>
          <button onClick={() => setEditing(true)} className="btn-glow !px-4 !py-2 text-sm">Change</button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          {(["current", "next", "confirm"] as const).map((k) => (
            <div key={k}>
              <label className={labelCls} htmlFor={`pw-${k}`}>{k === "current" ? "Current password" : k === "next" ? "New password" : "Confirm new password"}</label>
              <input id={`pw-${k}`} type="password" autoComplete={k === "current" ? "current-password" : "new-password"} className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost-glow">Cancel</button>
            <button disabled={busy} className="btn-glow">{busy && <Spinner />} Save</button>
          </div>
        </form>
      )}
    </Card>
  );
}
