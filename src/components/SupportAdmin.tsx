import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { settingsQuery } from "@/lib/queries";
import { adminLogin } from "@/lib/admin.functions";
import { inputCls, labelCls, Spinner } from "@/components/ui-kit";
import { telegramUrl } from "@/lib/format";

const GAP = 800;
const Ctx = createContext<() => void>(() => {});

function deviceId() {
  let d = localStorage.getItem("dev_id");
  if (!d) { d = crypto.randomUUID(); localStorage.setItem("dev_id", d); }
  return d;
}

function openExternal(url: string) {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) window.location.href = url;
}

/** One shared tap handler: 1 tap → Telegram, 6 quick taps → admin login. */
export function SupportAdminProvider({ children }: { children: ReactNode }) {
  const { data: s } = useQuery(settingsQuery);
  const count = useRef(0);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const tg = telegramUrl(s?.telegram);

  const tap = useCallback(() => {
    const now = Date.now();
    if (now - last.current > GAP) count.current = 0;
    last.current = now;
    count.current += 1;
    if (timer.current) clearTimeout(timer.current);
    if (count.current >= 6) { count.current = 0; setOpen(true); return; }
    timer.current = setTimeout(() => {
      if (count.current >= 1 && count.current <= 5 && tg) openExternal(tg);
      count.current = 0;
    }, GAP);
  }, [tg]);

  return (
    <Ctx.Provider value={tap}>
      {children}
      <AdminLoginModal open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

export const useSupportTap = () => useContext(Ctx);

export function SupportAdminButton({ className, children }: { className?: string; children: ReactNode }) {
  const tap = useSupportTap();
  return <button type="button" onClick={tap} className={className}>{children}</button>;
}

function AdminLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();
  const close = () => { setPw(""); setErr(null); onClose(); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true); setErr(null);
    try {
      const r = await login({ data: { password: pw, device: deviceId() } });
      if (!r.ok) { setErr(r.error); return; }
      close();
      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
    } catch (e) {
      const m = String((e as Error)?.message ?? "");
      setErr(m.includes("SUPABASE_SERVICE_ROLE_KEY") || m.includes("environment variable")
        ? "Admin server is not configured yet (missing server key)."
        : "Something went wrong. Try again.");
    }
    finally { setBusy(false); setPw(""); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogTitle className="text-gradient text-2xl">Admin Login</DialogTitle>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="admpw" className={labelCls}>Admin Password</label>
            <div className="relative">
              <input id="admpw" type={show ? "text" : "password"} autoComplete="current-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={close} className="btn-ghost-glow">Cancel</button>
            <button disabled={busy} className="btn-glow">{busy && <Spinner />} Enter</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
