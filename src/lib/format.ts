import { toast } from "sonner";

export function money(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return `$${v.toFixed(2)}`;
}

/** charge = quantity × (rate ÷ per), computed in integer ten-thousandths, rounded up to the cent. */
export function computeCharge(quantity: number, rate: number, per: number) {
  if (!quantity || !per) return 0;
  const rate4 = Math.round(rate * 10000);
  const cents = Math.ceil((quantity * rate4) / per / 100);
  return cents / 100;
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy");
  }
}

export function newIdemKey() {
  return crypto.randomUUID();
}

export function fmtDate(s: string) {
  return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "Please sign in first.",
  ORDERS_PAUSED: "New orders are temporarily paused.",
  ACCOUNT_SUSPENDED: "Account suspended – contact support.",
  EMAIL_NOT_VERIFIED: "Please verify your email first.",
  SERVICE_UNAVAILABLE: "This service is no longer available.",
  QUANTITY_OUT_OF_RANGE: "Quantity is outside the allowed range.",
  INVALID_LINK: "Please enter a valid link.",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  METHOD_UNAVAILABLE: "This payment method is unavailable.",
  AMOUNT_OUT_OF_RANGE: "Amount is outside the allowed range.",
  INVALID_TXN: "Please enter a valid Transaction ID.",
  DUPLICATE_TXN: "This Transaction ID has already been used.",
  CANNOT_CANCEL: "Only pending orders can be canceled.",
};
export function friendlyError(msg?: string) {
  if (!msg) return "Something went wrong.";
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return key ? ERRORS[key] : msg;
}

/** WhatsApp link from the WhatsApp setting only (digits only); null when empty. */
export function whatsappUrl(n?: string | null) {
  const d = (n ?? "").replace(/\D/g, "");
  return d ? `https://wa.me/${d}` : null;
}
/** Telegram link from the Telegram setting only; null when empty. */
export function telegramUrl(u?: string | null) {
  const v = (u ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
  return v ? `https://t.me/${v}` : null;
}
