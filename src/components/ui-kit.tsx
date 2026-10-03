import type { ReactNode } from "react";
import { Copy, Loader2, Inbox, AlertTriangle } from "lucide-react";
import { copy } from "@/lib/format";

export function Copyable({ value, className = "" }: { value: string; className?: string }) {
  return (
    <button type="button" onClick={() => copy(value)} className={`inline-flex items-center gap-1.5 font-mono hover:text-primary ${className}`} aria-label={`Copy ${value}`}>
      <span className="break-all">{value}</span> <Copy className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-gradient text-3xl font-bold sm:text-4xl">{children}</h1>
      {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl p-5 ${className}`}>{children}</div>;
}

export function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <Inbox className="h-10 w-10" /> <p>{text}</p>
    </div>
  );
}
export function ErrorState({ text = "Could not load data." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-destructive">
      <AlertTriangle className="h-10 w-10" /> <p>{text}</p>
    </div>
  );
}

export const inputCls =
  "w-full rounded-2xl border border-input bg-background/60 px-4 py-3 text-base outline-none transition focus:border-primary focus:shadow-glow";
export const labelCls = "label-premium mb-1.5 block text-sm";

const STATUS: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/40",
  processing: "bg-info/15 text-info border-info/40",
  completed: "bg-success/15 text-success border-success/40",
  approved: "bg-success/15 text-success border-success/40",
  partial: "bg-info/15 text-info border-info/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
  canceled: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS[status] ?? ""}`}>{status}</span>;
}
