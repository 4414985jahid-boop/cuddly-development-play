import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Copy, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { adminAdjustBalance, adminSendMessage, adminSetBan, adminSetPassword } from "@/lib/admin-users.functions";
import { Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { StrengthBar } from "@/components/StrengthBar";
import { copy, money } from "@/lib/format";

type Base = { id: string; name: string; onClose: () => void; onDone: () => void };

function Shell({ title, children, onClose, dirty }: { title: string; children: ReactNode; onClose: () => void; dirty?: boolean }) {
  const close = () => { if (dirty && !confirm("Discard unsaved changes?")) return; onClose(); };
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-gradient text-xl">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?";
  const r = crypto.getRandomValues(new Uint32Array(16));
  return [...r].map((n) => chars[n % chars.length]).join("");
}

async function run<T extends { ok: boolean; error?: string }>(p: Promise<T>, msg: string, onDone: () => void, setBusy: (b: boolean) => void) {
  setBusy(true);
  try {
    const r = await p;
    if (!r.ok) toast.error(r.error ?? "Failed");
    else { toast.success(msg); onDone(); }
  } catch (e) {
    toast.error(String((e as Error).message).includes("ADMIN_UNAUTHORIZED") ? "Admin session expired — log in again" : "Something went wrong");
  } finally { setBusy(false); }
}

export function PasswordDialog({ id, name, onClose, onDone }: Base) {
  const fn = useServerFn(adminSetPassword);
  const [pw, setPw] = useState("");
  const [confirm2, setConfirm2] = useState("");
  const [show, setShow] = useState(false);
  const [signOut, setSignOut] = useState(true);
  const [busy, setBusy] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return void toast.error("Password must be at least 8 characters");
    if (pw !== confirm2) return void toast.error("Passwords do not match");
    run(fn({ data: { id, password: pw, signOut } }), "Password changed", onDone, setBusy);
  };
  return (
    <Shell title={`Change password — ${name}`} onClose={onClose} dirty={!!pw}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={labelCls} htmlFor="npw">New password</label>
          <div className="relative">
            <input id="npw" type={show ? "text" : "password"} autoComplete="new-password" className={`${inputCls} pr-20`} value={pw} onChange={(e) => setPw(e.target.value)} />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-2 text-muted-foreground">
              <button type="button" aria-label="Copy password" onClick={() => pw && copy(pw)}><Copy className="h-4 w-4" /></button>
              <button type="button" aria-label={show ? "Hide" : "Show"} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <StrengthBar value={pw} />
          <button type="button" onClick={() => { const g = genPassword(); setPw(g); setConfirm2(g); setShow(true); }} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"><Wand2 className="h-4 w-4" /> Generate strong password</button>
        </div>
        <div>
          <label className={labelCls} htmlFor="cpw">Confirm password</label>
          <input id="cpw" type={show ? "text" : "password"} autoComplete="new-password" className={inputCls} value={confirm2} onChange={(e) => setConfirm2(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={signOut} onChange={(e) => setSignOut(e.target.checked)} /> Sign the user out of all devices</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="btn-ghost-glow">Cancel</button>
          <button disabled={busy} className="btn-glow">{busy && <Spinner />} Save</button>
        </div>
      </form>
    </Shell>
  );
}

export function BalanceDialog({ id, name, balance, onClose, onDone }: Base & { balance: number }) {
  const fn = useServerFn(adminAdjustBalance);
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = Number(amount);
    if (!(a > 0)) return void toast.error("Enter an amount above 0");
    if (note.trim().length < 2) return void toast.error("A note is required");
    if (direction === "subtract" && a > balance) return void toast.error("Balance cannot go below zero");
    run(fn({ data: { id, amount: a, direction, note } }), direction === "add" ? "Balance added" : "Balance subtracted", onDone, setBusy);
  };
  return (
    <Shell title={`Edit balance — ${name}`} onClose={onClose} dirty={!!amount || !!note}>
      <p className="text-sm text-muted-foreground">Current balance: <b className="text-foreground">{money(balance)}</b></p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["add", "subtract"] as const).map((d) => (
            <button type="button" key={d} onClick={() => setDirection(d)} className={direction === d ? "btn-glow" : "btn-ghost-glow"}>{d === "add" ? "Add balance" : "Subtract balance"}</button>
          ))}
        </div>
        <div><label className={labelCls} htmlFor="amt">Amount (USD)</label><input id="amt" inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></div>
        <div><label className={labelCls} htmlFor="note">Note (required)</label><input id="note" maxLength={200} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="btn-ghost-glow">Cancel</button>
          <button disabled={busy} className="btn-glow">{busy && <Spinner />} Save</button>
        </div>
      </form>
    </Shell>
  );
}

export function MessageDialog({ id, name, onClose, onDone, kind: initial = "popup" }: Base & { kind?: "popup" | "notification" }) {
  const fn = useServerFn(adminSendMessage);
  const [kind, setKind] = useState(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return void toast.error("Title is required");
    run(fn({ data: { id, kind, title, body } }), kind === "popup" ? "Popup sent" : "Notification sent", onDone, setBusy);
  };
  return (
    <Shell title={`Message — ${name}`} onClose={onClose} dirty={!!title || !!body}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setKind("popup")} className={kind === "popup" ? "btn-glow" : "btn-ghost-glow"}>Popup (show once)</button>
          <button type="button" onClick={() => setKind("notification")} className={kind === "notification" ? "btn-glow" : "btn-ghost-glow"}>Notification</button>
        </div>
        <div><label className={labelCls} htmlFor="mt">Title</label><input id="mt" maxLength={120} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><label className={labelCls} htmlFor="mb">Message</label><textarea id="mb" rows={4} maxLength={2000} className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="btn-ghost-glow">Cancel</button>
          <button disabled={busy} className="btn-glow">{busy && <Spinner />} Send</button>
        </div>
      </form>
    </Shell>
  );
}

export function BanDialog({ id, name, banned, onClose, onDone }: Base & { banned: boolean }) {
  const fn = useServerFn(adminSetBan);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell title={`${banned ? "Unban" : "Ban"} ${name}?`} onClose={onClose}>
      {!banned && (
        <div><label className={labelCls} htmlFor="br">Reason</label><input id="br" maxLength={300} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      )}
      <p className="text-sm text-muted-foreground">{banned ? "The user will be able to sign in again." : "The user will be blocked from signing in and ordering."}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="btn-ghost-glow">Cancel</button>
        <button disabled={busy} onClick={() => run(fn({ data: { id, banned: !banned, reason } }), banned ? "User unbanned" : "User banned", onDone, setBusy)} className="btn-glow">{busy && <Spinner />} {banned ? "Unban" : "Ban"}</button>
      </div>
    </Shell>
  );
}
