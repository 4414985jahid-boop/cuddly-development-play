import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, ExternalLink, History, RefreshCw, Check, X, PackageCheck, PieChart } from "lucide-react";
import { toast } from "sonner";
import { adminBulkUpdateOrders, adminExportOrdersCsv, adminListOrders, adminOrderPlatforms, adminUpdateOrder } from "@/lib/admin-orders.functions";
import { Card, Copyable, Empty, ErrorState, PageTitle, Spinner, StatusBadge, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlatformIcon } from "@/lib/brand";
import { fmtDate, money } from "@/lib/format";

const TABS = [
  ["pending", "Pending"], ["processing", "Processing"], ["completed", "Completed"],
  ["partial", "Partial"], ["rejected", "Rejected/Canceled"], ["all", "All"],
] as const;
type Tab = (typeof TABS)[number][0];
type Act = "processing" | "completed" | "partial" | "rejected";
const ACT_LABEL: Record<Act, string> = { processing: "Accept", completed: "Mark Completed", partial: "Partial", rejected: "Reject" };

export function AdminOrders() {
  const [platform, setPlatform] = useState<{ slug: string; name: string } | null>(null);
  return platform ? <PlatformOrders platform={platform} onBack={() => setPlatform(null)} /> : <PlatformGrid onOpen={setPlatform} />;
}

function PlatformGrid({ onOpen }: { onOpen: (p: { slug: string; name: string }) => void }) {
  const fn = useServerFn(adminOrderPlatforms);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-order-platforms"], queryFn: () => fn(), refetchInterval: 5_000 });
  return (
    <div className="space-y-4">
      <PageTitle sub="Manual delivery. Pending counts update live.">Orders</PageTitle>
      {isError ? <ErrorState /> : isLoading ? <Skeleton className="h-40 rounded-3xl" /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data!.map((p) => (
            <button key={p.slug} onClick={() => onOpen(p)} className="glass relative flex flex-col items-center gap-2 rounded-3xl p-5 transition hover:shadow-glow">
              {p.pending > 0 && <span className="absolute right-3 top-3 min-w-6 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">{p.pending}</span>}
              <PlatformIcon slug={p.slug} className="h-10 w-10" />
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.pending} pending</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Order = Awaited<ReturnType<typeof adminListOrders>>[number];

function PlatformOrders({ platform, onBack }: { platform: { slug: string; name: string }; onBack: () => void }) {
  const list = useServerFn(adminListOrders);
  const exportCsv = useServerFn(adminExportOrdersCsv);
  const bulk = useServerFn(adminBulkUpdateOrders);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [action, setAction] = useState<{ order: Order; act: Act } | null>(null);
  const [bulkAct, setBulkAct] = useState<"processing" | "rejected" | null>(null);
  const filters = { platform: platform.slug, tab, q, from: from || undefined, to: to || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["admin-orders", filters], queryFn: () => list({ data: filters }), refetchInterval: 10_000,
  });
  const reload = () => { setSel([]); qc.invalidateQueries({ queryKey: ["admin-orders"] }); qc.invalidateQueries({ queryKey: ["admin-order-platforms"] }); };
  const doExport = async () => {
    try {
      const csv = await exportCsv({ data: filters });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a"); a.href = url; a.download = `orders-${platform.slug}-${tab}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error((e as Error).message); }
  };
  const bulkable = (data ?? []).filter((o) => o.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="btn-ghost-glow !px-3 !py-2"><ArrowLeft className="h-4 w-4" /></button>
        <PlatformIcon slug={platform.slug} className="h-7 w-7" />
        <h1 className="text-gradient flex-1 text-2xl font-bold">{platform.name} orders</h1>
        <button onClick={() => refetch()} className="btn-ghost-glow !py-2 text-sm"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /></button>
        <button onClick={doExport} className="btn-ghost-glow !py-2 text-sm"><Download className="h-4 w-4" /> CSV</button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setSel([]); }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${tab === id ? "bg-brand text-primary-foreground" : "border border-border hover:bg-accent"}`}>{label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search orders" placeholder="Order ID, user name, 8-digit ID, email" className={`${inputCls} !py-2 min-w-0 flex-1`} value={q} onChange={(e) => setQ(e.target.value)} />
        <input aria-label="From date" type="date" className={`${inputCls} !w-auto !py-2`} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input aria-label="To date" type="date" className={`${inputCls} !w-auto !py-2`} value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {bulkable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={sel.length === bulkable.length} onChange={(e) => setSel(e.target.checked ? bulkable.map((o) => o.id) : [])} /> Select all pending</label>
          {sel.length > 0 && <>
            <span className="text-muted-foreground">{sel.length} selected</span>
            <button onClick={() => setBulkAct("processing")} className="btn-glow !px-3 !py-1.5 text-sm"><Check className="h-4 w-4" /> Accept selected</button>
            <button onClick={() => setBulkAct("rejected")} className="btn-ghost-glow !px-3 !py-1.5 text-sm text-destructive"><X className="h-4 w-4" /> Reject selected</button>
          </>}
        </div>
      )}
      {isLoading ? <Skeleton className="h-48 rounded-3xl" /> : isError ? <ErrorState /> : !data?.length ? <Empty text="No orders here." /> : (
        <div className="space-y-3">
          {data.map((o) => <OrderCard key={o.id} o={o} selected={sel.includes(o.id)}
            onSelect={(v) => setSel((s) => v ? [...s, o.id] : s.filter((x) => x !== o.id))} onAct={(act) => setAction({ order: o, act })} />)}
        </div>
      )}
      {action && <ActionDialog order={action.order} act={action.act} onClose={() => setAction(null)} onDone={reload} />}
      {bulkAct && <BulkDialog ids={sel} act={bulkAct} onClose={() => setBulkAct(null)} onDone={reload} run={bulk} />}
    </div>
  );
}

function OrderCard({ o, selected, onSelect, onAct }: { o: Order; selected: boolean; onSelect: (v: boolean) => void; onAct: (a: Act) => void }) {
  const [hist, setHist] = useState(false);
  const acts: Act[] = o.status === "pending" ? ["processing", "rejected"] : o.status === "processing" ? ["completed", "partial", "rejected"] : [];
  return (
    <Card className="!p-4 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {o.status === "pending" && <input type="checkbox" aria-label="Select order" checked={selected} onChange={(e) => onSelect(e.target.checked)} />}
        <Copyable value={o.order_code} className="font-semibold" />
        <StatusBadge status={o.status} />
        <span className="ml-auto text-xs text-muted-foreground">{fmtDate(o.created_at)}</span>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        <div><span className="text-muted-foreground">User: </span>{o.user?.full_name || o.user?.username || "—"} {o.user && <Copyable value={o.user.public_id} className="text-xs" />}</div>
        <div><span className="text-muted-foreground">Category: </span>{o.category_name}</div>
        <div className="sm:col-span-2"><span className="text-muted-foreground">Service: </span>{o.service_name}</div>
        <div><span className="text-muted-foreground">Quantity: </span>{o.quantity}{o.delivered_qty != null && o.status !== "completed" && ` (delivered ${o.delivered_qty})`}</div>
        <div><span className="text-muted-foreground">Charge: </span>{money(o.charge)}{Number(o.refunded) > 0 && <span className="text-success"> · refunded {money(o.refunded)}</span>}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-background/50 p-2">
        <Copyable value={o.link} className="min-w-0 flex-1 text-xs" />
        <a href={o.link} target="_blank" rel="noopener noreferrer" className="btn-ghost-glow !px-3 !py-1 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Open link</a>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {acts.map((a) => (
          <button key={a} onClick={() => onAct(a)} className={`${a === "rejected" ? "btn-ghost-glow text-destructive" : "btn-glow"} !px-3 !py-1.5 text-xs`}>
            {a === "processing" ? <Check className="h-3.5 w-3.5" /> : a === "completed" ? <PackageCheck className="h-3.5 w-3.5" /> : a === "partial" ? <PieChart className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {ACT_LABEL[a]}
          </button>
        ))}
        <button onClick={() => setHist(!hist)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><History className="h-3.5 w-3.5" /> History ({o.history.length})</button>
      </div>
      {hist && (
        <ul className="space-y-1 border-l border-border pl-3 text-xs">
          <li>{fmtDate(o.created_at)} — placed ({o.source})</li>
          {o.history.map((h: { id: string; created_at: string; old_status: string | null; new_status: string; refund: number; note: string | null; delivered_qty: number | null }) => (
            <li key={h.id}>{fmtDate(h.created_at)} — {h.old_status} → <b>{h.new_status}</b>
              {h.new_status === "partial" && ` (delivered ${h.delivered_qty})`}{Number(h.refund) > 0 && `, refunded ${money(h.refund)}`}
              {h.note && <div className="text-muted-foreground">Note: {h.note}</div>}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ActionDialog({ order, act, onClose, onDone }: { order: Order; act: Act; onClose: () => void; onDone: () => void }) {
  const update = useServerFn(adminUpdateOrder);
  const [note, setNote] = useState("");
  const [delivered, setDelivered] = useState("");
  const [busy, setBusy] = useState(false);
  const d = Math.floor(Number(delivered));
  const validD = d > 0 && d < order.quantity;
  const partialRefund = validD ? Math.floor(Number(order.charge) * (order.quantity - d) / order.quantity * 100) / 100 : 0;
  const refund = act === "rejected" ? Number(order.charge) - Number(order.refunded) : act === "partial" ? Math.max(0, partialRefund - Number(order.refunded)) : 0;
  const submit = async () => {
    if (act === "partial" && !validD) { toast.error(`Delivered must be between 1 and ${order.quantity - 1}`); return; }
    setBusy(true);
    try {
      const r = await update({ data: { id: order.id, status: act, delivered: act === "partial" ? d : undefined, note: note.trim() || undefined } });
      toast.success(r.refund > 0 ? `Done — refunded ${money(r.refund)}` : "Order updated");
      onDone(); onClose();
    } catch (e) { toast.error((e as Error).message.includes("INVALID_TRANSITION") ? "Order status already changed — refresh." : (e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ACT_LABEL[act]} order #{order.order_code}?</DialogTitle>
          <DialogDescription>{order.service_name} × {order.quantity} · {money(order.charge)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {act === "partial" && (
            <div>
              <label className={labelCls} htmlFor="delivered">Delivered quantity (1–{order.quantity - 1})</label>
              <input id="delivered" type="number" min={1} max={order.quantity - 1} className={inputCls} value={delivered} onChange={(e) => setDelivered(e.target.value)} />
            </div>
          )}
          {refund > 0 && <p className="rounded-2xl bg-success/10 p-3 text-sm text-success">User will be refunded {money(refund)}.</p>}
          <div>
            <label className={labelCls} htmlFor="note">Note to user (optional)</label>
            <textarea id="note" maxLength={500} rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className="btn-ghost-glow">Cancel</button>
            <button disabled={busy} onClick={submit} className="btn-glow">{busy && <Spinner />} Confirm</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ ids, act, onClose, onDone, run }: { ids: string[]; act: "processing" | "rejected"; onClose: () => void; onDone: () => void; run: ReturnType<typeof useServerFn<typeof adminBulkUpdateOrders>> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await run({ data: { ids, status: act, note: note.trim() || undefined } });
      toast.success(`${r.ok} updated${r.failed ? `, ${r.failed} skipped` : ""}${r.refunded ? ` — refunded ${money(r.refunded)}` : ""}`);
      onDone(); onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{act === "processing" ? "Accept" : "Reject"} {ids.length} orders?</DialogTitle>
          <DialogDescription>{act === "rejected" ? "Each order is fully refunded once." : "Orders move to Processing."}</DialogDescription>
        </DialogHeader>
        <label className={labelCls} htmlFor="bnote">Note to users (optional)</label>
        <textarea id="bnote" maxLength={500} rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="btn-ghost-glow">Cancel</button>
          <button disabled={busy} onClick={submit} className="btn-glow">{busy && <Spinner />} Confirm</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
