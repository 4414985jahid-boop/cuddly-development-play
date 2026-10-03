import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/queries";
import { MethodLogo, TelegramIcon } from "@/lib/brand";
import { SupportAdminButton } from "@/components/SupportAdmin";
import { friendlyError, money, newIdemKey } from "@/lib/format";
import { Card, Copyable, Empty, ErrorState, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/add-funds/")({
  head: () => ({
    meta: [
      { title: "Add Funds | Premium SMM Store" },
      { name: "description", content: "Top up your wallet with Binance, USDT, bKash, Nagad or Rocket." },
      { property: "og:title", content: "Add Funds | Premium SMM Store" },
      { property: "og:description", content: "Top up your wallet." },
    ],
  }),
  component: AddFunds,
});

type PM = Tables<"payment_methods">;

async function compress(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = img.width * scale; c.height = img.height * scale;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/webp", 0.82));
}

function AddFunds() {
  const { user, verified } = useAuth();
  const { data: s } = useQuery(settingsQuery);
  const { data: methods, isLoading, isError } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods").select("*").order("sort");
      if (error) throw error;
      return data;
    },
  });
  const [group, setGroup] = useState<"binance" | "usdt" | "p2p" | null>(null);
  const [m, setM] = useState<PM | null>(null);
  const [amount, setAmount] = useState("");
  const [txn, setTxn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const idem = useRef(newIdemKey());

  const rate = Number(s?.bdt_rate ?? 130);
  const amt = Number(amount || 0);
  const groups = (["binance", "usdt", "p2p"] as const).filter((g) => methods?.some((x) => x.kind === g));
  const p2p = methods?.filter((x) => x.kind === "p2p") ?? [];

  const pickGroup = (g: "binance" | "usdt" | "p2p") => {
    setGroup(g);
    setM(g === "p2p" ? null : methods!.find((x) => x.kind === g) ?? null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!m || !user) return;
    if (!verified) { toast.error("Please verify your email first."); return; }
    if (!(amt >= Number(m.min_amount) && amt <= Number(m.max_amount))) { toast.error(`Amount must be ${money(m.min_amount)}–${money(m.max_amount)}`); return; }
    if (txn.trim().length < 4) { toast.error("Enter the Transaction ID"); return; }
    setBusy(true);
    let path: string | null = null;
    if (file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setBusy(false); { toast.error("Screenshot must be JPG/PNG/WEBP under 5 MB"); return; } }
      const blob = await compress(file);
      path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, blob, { contentType: "image/webp" });
      if (error) { setBusy(false); { toast.error("Screenshot upload failed"); return; } }
    }
    const { data, error } = await supabase.rpc("create_deposit", { _method_id: m.id, _amount: amt, _txn: txn.trim(), _screenshot: path as string, _idem: idem.current });
    setBusy(false);
    if (error) { toast.error(friendlyError(error.message)); return; }
    idem.current = newIdemKey();
    setDone((data as { code: string }).code);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle sub={group ? undefined : "Select Payment Method"}>Add Funds</PageTitle>
      {isError && <ErrorState />}
      {isLoading && <Skeleton className="h-40 rounded-3xl" />}
      {methods && groups.length === 0 && <Empty text="No payment methods available right now." />}

      {!group && (
        <div className="grid gap-3">
          {groups.map((g) => (
            <button key={g} onClick={() => pickGroup(g)} className="glass tilt flex items-center gap-4 rounded-3xl p-4 text-left">
              {g === "p2p" ? (
                <div className="flex -space-x-2">{p2p.slice(0, 3).map((x) => <MethodLogo key={x.id} name={x.name} kind="p2p" logo={x.logo_url} className="h-10 w-10" />)}</div>
              ) : <MethodLogo name={g} kind={g} logo={methods?.find((x) => x.kind === g)?.logo_url} className="h-10 w-10" />}
              <div>
                <div className="label-premium text-lg">{g === "p2p" ? "P2P" : g === "usdt" ? "USDT" : "Binance"}</div>
                <div className="text-xs text-muted-foreground">{g === "p2p" ? p2p.map((x) => x.name).join(" • ") : g === "usdt" ? "Crypto wallet transfer" : "Binance Pay"}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {group && (
        <Card>
          <button onClick={() => { setGroup(null); setM(null); }} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Change method</button>

          {group === "p2p" && (
            <div className="mb-5 grid grid-cols-3 gap-2">
              {p2p.map((x) => (
                <button key={x.id} onClick={() => setM(x)} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition ${m?.id === x.id ? "border-primary bg-primary/10 shadow-glow" : "border-border"}`}>
                  <MethodLogo name={x.name} kind="p2p" logo={x.logo_url} className="h-10 w-12" />
                  <span className="text-xs font-semibold">{x.name}</span>
                </button>
              ))}
            </div>
          )}

          {m && (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4">
                <MethodLogo name={m.name} kind={m.kind} logo={m.logo_url} className="h-12 w-12" />
                <div className="min-w-0">
                  <div className="label-premium">{m.name}{m.network ? ` • ${m.network}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{m.kind === "binance" ? "Binance ID" : m.kind === "usdt" ? "Wallet address" : `Number (${m.account_type ?? "Personal"})`}</div>
                  <Copyable value={m.account} className={m.kind === "usdt" ? "text-xs" : "text-base font-bold"} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="amt">Amount (USD)</label>
                <input id="amt" inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
                <p className="mt-1 text-xs text-muted-foreground">Min {money(m.min_amount)} — Max {money(m.max_amount)}</p>
              </div>
              {m.kind === "p2p" && (
                <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-center">
                  <div className="text-xs text-muted-foreground">Send exactly (rate ৳{rate}/USD)</div>
                  <div className="text-gradient font-display text-4xl font-extrabold">৳{(Math.round(amt * rate * 100) / 100).toFixed(2)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Send exactly this amount via Send Money, then enter the Transaction ID.</p>
                </div>
              )}
              <div>
                <label className={labelCls} htmlFor="txn">Transaction ID</label>
                <input id="txn" className={inputCls} value={txn} onChange={(e) => setTxn(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary">
                <ImagePlus className="h-5 w-5 text-primary" />
                {file ? file.name : "Upload payment screenshot (optional)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <button disabled={busy} className="btn-glow w-full !py-4">{busy && <Spinner />} {m.kind === "p2p" ? "Confirm Add Funds" : "Add Funds"}</button>
            </form>
          )}
        </Card>
      )}

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent className="text-center">
          <Clock className="mx-auto h-14 w-14 text-warning" />
          <DialogTitle className="text-gradient text-2xl">Add Funds Submitted – Pending</DialogTitle>
          {done && <Copyable value={done} className="mx-auto text-lg font-bold" />}
          <p className="text-sm text-muted-foreground">Your request is pending admin approval.</p>
          <div className="mt-2 grid gap-2">
            <Link to="/" className="btn-glow">Go to Home</Link>
            {s?.telegram && <SupportAdminButton className="btn-ghost-glow"><TelegramIcon className="h-4 w-4" /> Support Admin</SupportAdminButton>}
            <Link to="/order" className="btn-ghost-glow">Buy Service</Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
