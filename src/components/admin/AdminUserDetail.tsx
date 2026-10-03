import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, KeyRound, Wallet, MessageSquare, Bell, ShieldOff, ShieldCheck, MailCheck, MailPlus, Mail, Code2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { adminApiKey, adminGetUser, adminSendReset, adminUpdateProfile, adminVerification } from "@/lib/admin-users.functions";
import { Avatar } from "@/components/Avatar";
import { Card, Copyable, Empty, ErrorState, Spinner, StatusBadge, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, money } from "@/lib/format";
import { BalanceDialog, BanDialog, MessageDialog, PasswordDialog } from "./UserActionDialogs";

type Dlg = "password" | "balance" | "popup" | "notification" | "ban" | "edit" | null;

export function AdminUserDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const get = useServerFn(adminGetUser);
  const reset = useServerFn(adminSendReset);
  const verify = useServerFn(adminVerification);
  const apiKey = useServerFn(adminApiKey);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "user", id], queryFn: () => get({ data: { id } }) });
  const [dlg, setDlg] = useState<Dlg>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const act = async (k: string, p: Promise<{ ok: boolean; error?: string }>, msg: string) => {
    setBusy(k);
    try { const r = await p; if (!r.ok) toast.error(r.error ?? "Failed"); else { toast.success(msg); refetch(); } }
    catch { toast.error("Something went wrong"); } finally { setBusy(null); }
  };
  const done = () => { setDlg(null); refetch(); };

  if (isError) return <ErrorState text="Could not load this user." />;
  if (isLoading || !data) return <Skeleton className="h-96 rounded-3xl" />;
  const p = data.profile;
  const info: [string, React.ReactNode][] = [
    ["Full name", p.full_name], ["Email", data.email ?? "—"], ["Phone", p.phone ?? "—"],
    ["User ID", <Copyable key="id" value={p.public_id} />], ["Username", <Copyable key="u" value={p.username} />],
    ["Signed up", fmtDate(p.created_at)], ["Last sign-in", data.last_sign_in_at ? fmtDate(data.last_sign_in_at) : "—"],
    ["Sign-in method", data.method], ["Language", p.language], ["Email verified", data.verified ? "Yes" : "No"],
    ["Status", p.banned ? `Banned${p.ban_reason ? ` — ${p.ban_reason}` : ""}` : "Active"],
    ["Balance", <b key="b">{money(p.balance)}</b>], ["Total added", money(data.totalAdded)], ["Total spent", money(data.totalSpent)],
    ["API key", data.apiKey.exists ? (data.apiKey.enabled ? "Active" : "Disabled") : "None"],
    ["Accepted terms", p.accepted_terms_at ? fmtDate(p.accepted_terms_at) : "—"],
    ["Password", <span key="pw">•••••••• <span className="text-xs text-muted-foreground">(encrypted, cannot be viewed) · Last changed: {p.password_changed_at ? fmtDate(p.password_changed_at) : "unknown"}</span></span>],
  ];
  const btn = "btn-ghost-glow !py-2 text-sm";
  const origin = window.location.origin;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to users</button>
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar path={p.avatar_url} name={p.full_name} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-gradient truncate text-2xl font-bold">{p.full_name}</h1>
            <p className="text-sm text-muted-foreground">@{p.username} · ID {p.public_id}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {info.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-border/50 py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 text-right">{v}</dd></div>)}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={btn} onClick={() => setDlg("password")}><KeyRound className="h-4 w-4" /> Change password</button>
          <button className={btn} disabled={busy === "reset"} onClick={() => act("reset", reset({ data: { id, origin } }), "Password reset email sent")}><Mail className="h-4 w-4" /> Send reset email</button>
          <button className={btn} onClick={() => setDlg("balance")}><Wallet className="h-4 w-4" /> Edit balance</button>
          <button className={btn} onClick={() => setDlg("popup")}><MessageSquare className="h-4 w-4" /> Send popup</button>
          <button className={btn} onClick={() => setDlg("notification")}><Bell className="h-4 w-4" /> Send notification</button>
          <button className={btn} onClick={() => setDlg("edit")}><Pencil className="h-4 w-4" /> Edit profile</button>
          <button className={btn} onClick={() => setDlg("ban")}>{p.banned ? <><ShieldCheck className="h-4 w-4" /> Unban</> : <><ShieldOff className="h-4 w-4" /> Ban</>}</button>
          {!data.verified && <>
            <button className={btn} disabled={busy === "mark"} onClick={() => act("mark", verify({ data: { id, action: "mark", origin } }), "Marked as verified")}><MailCheck className="h-4 w-4" /> Mark email verified</button>
            <button className={btn} disabled={busy === "resend"} onClick={() => act("resend", verify({ data: { id, action: "resend", origin } }), "Verification email sent")}><MailPlus className="h-4 w-4" /> Resend verification</button>
          </>}
          <button className={btn} disabled={busy === "key"} onClick={async () => {
            if (data.apiKey.exists && !confirm("Regenerate the API key? The old key stops working.")) return;
            setBusy("key");
            try { const r = await apiKey({ data: { id, action: "regenerate" } }); setNewKey(r.key); refetch(); } catch { toast.error("Failed"); } finally { setBusy(null); }
          }}><Code2 className="h-4 w-4" /> {data.apiKey.exists ? "Regenerate API key" : "Create API key"}</button>
          {data.apiKey.exists && (
            <button className={btn} onClick={() => act("key2", apiKey({ data: { id, action: data.apiKey.enabled ? "disable" : "enable" } }), data.apiKey.enabled ? "API key disabled" : "API key enabled")}>
              {data.apiKey.enabled ? "Disable API key" : "Enable API key"}
            </button>
          )}
        </div>
      </Card>

      <Tabs defaultValue="deposits">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="deposits">Add Funds ({data.deposits.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({data.orders.length})</TabsTrigger>
          <TabsTrigger value="ledger">Ledger ({data.ledger.length})</TabsTrigger>
          <TabsTrigger value="signins">Sign-ins ({data.signIns.length})</TabsTrigger>
          <TabsTrigger value="notes">Messages ({data.notifications.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="deposits"><List empty="No add funds yet" rows={data.deposits.map((d) => [d.code, `${d.method_name} · ${d.txn_id}`, money(d.amount), <StatusBadge key="s" status={d.status} />, fmtDate(d.created_at)])} /></TabsContent>
        <TabsContent value="orders"><List empty="No orders yet" rows={data.orders.map((o) => [o.order_code, `${o.service_name} × ${o.quantity}`, money(o.charge), <StatusBadge key="s" status={o.status} />, fmtDate(o.created_at)])} /></TabsContent>
        <TabsContent value="ledger"><List empty="No balance movements" rows={data.ledger.map((l) => [l.kind, l.ref ?? "", <span key="a" className={Number(l.amount) >= 0 ? "text-success" : "text-destructive"}>{Number(l.amount) >= 0 ? "+" : ""}{money(l.amount)}</span>, `→ ${money(l.balance_after)}`, fmtDate(l.created_at)])} /></TabsContent>
        <TabsContent value="signins"><List empty="No sign-ins recorded yet" rows={data.signIns.map((s) => [s.method ?? "", s.ip ?? "", <span key="d" className="line-clamp-1 text-xs">{s.device}</span>, "", fmtDate(s.created_at)])} /></TabsContent>
        <TabsContent value="notes"><List empty="No messages sent" rows={data.notifications.map((n) => [n.kind, n.title, n.body, n.read_at ? "Seen" : "Unseen", fmtDate(n.created_at)])} /></TabsContent>
      </Tabs>

      {dlg === "password" && <PasswordDialog id={id} name={p.full_name} onClose={() => setDlg(null)} onDone={done} />}
      {dlg === "balance" && <BalanceDialog id={id} name={p.full_name} balance={Number(p.balance)} onClose={() => setDlg(null)} onDone={done} />}
      {(dlg === "popup" || dlg === "notification") && <MessageDialog id={id} name={p.full_name} kind={dlg} onClose={() => setDlg(null)} onDone={done} />}
      {dlg === "ban" && <BanDialog id={id} name={p.full_name} banned={p.banned} onClose={() => setDlg(null)} onDone={done} />}
      {dlg === "edit" && <EditProfile id={id} p={{ full_name: p.full_name, phone: p.phone ?? "", email: data.email ?? "", hasAvatar: !!p.avatar_url }} onClose={() => setDlg(null)} onDone={done} />}
      <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
        <DialogContent>
          <DialogTitle>New API key</DialogTitle>
          <p className="text-sm text-muted-foreground">Copy it now — it is stored encrypted and cannot be shown again.</p>
          {newKey && <Copyable value={newKey} className="rounded-2xl border border-border p-3 text-sm" />}
          <button className="btn-glow" onClick={() => setNewKey(null)}>Done</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function List({ rows, empty }: { rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <Card><Empty text={empty} /></Card>;
  return (
    <Card className="!p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === r.length - 1 ? "whitespace-nowrap text-right text-muted-foreground" : ""}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function EditProfile({ id, p, onClose, onDone }: { id: string; p: { full_name: string; phone: string; email: string; hasAvatar: boolean }; onClose: () => void; onDone: () => void }) {
  const fn = useServerFn(adminUpdateProfile);
  const [f, setF] = useState({ full_name: p.full_name, phone: p.phone, email: p.email, removeAvatar: false });
  const [busy, setBusy] = useState(false);
  const dirty = f.full_name !== p.full_name || f.phone !== p.phone || f.email !== p.email || f.removeAvatar;
  const close = () => { if (dirty && !confirm("Discard unsaved changes?")) return; onClose(); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.full_name.trim()) return void toast.error("Name is required");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return void toast.error("Enter a valid email");
    setBusy(true);
    try { const r = await fn({ data: { id, ...f } }); if (!r.ok) toast.error(r.error); else { toast.success("Profile saved"); onDone(); } }
    catch { toast.error("Something went wrong"); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogTitle className="text-gradient text-xl">Edit profile</DialogTitle>
        <form onSubmit={save} className="space-y-3">
          <div><label className={labelCls} htmlFor="ef-n">Full name</label><input id="ef-n" className={inputCls} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="ef-p">Phone</label><input id="ef-p" className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="ef-e">Email</label><input id="ef-e" type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            {f.email !== p.email && <p className="mt-1 text-xs text-warning">The user will need to verify the new email.</p>}</div>
          {p.hasAvatar && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.removeAvatar} onChange={(e) => setF({ ...f, removeAvatar: e.target.checked })} /> Remove profile photo</label>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={close} className="btn-ghost-glow">Cancel</button>
            <button disabled={busy} className="btn-glow">{busy && <Spinner />} Save</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
