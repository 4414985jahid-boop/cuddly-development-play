import { SiFacebook, SiInstagram, SiYoutube, SiTiktok, SiTelegram, SiWhatsapp, SiBinance, SiTether } from "react-icons/si";
import { useState } from "react";
import { useStorageUrl } from "@/lib/storage-url";
import type { IconType } from "react-icons";

// Brand colors are part of each third-party logo's identity, so they live here
// rather than in the theme tokens.
export const PLATFORM_META: Record<string, { Icon: IconType; color: string }> = {
  facebook: { Icon: SiFacebook, color: "#1877F2" },
  instagram: { Icon: SiInstagram, color: "#E4405F" },
  youtube: { Icon: SiYoutube, color: "#FF0000" },
  tiktok: { Icon: SiTiktok, color: "currentColor" },
  telegram: { Icon: SiTelegram, color: "#26A5E4" },
};

export function PlatformIcon({ slug, className }: { slug: string; className?: string }) {
  const m = PLATFORM_META[slug];
  if (!m) return null;
  return <m.Icon className={className} style={{ color: m.color }} aria-hidden />;
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return <SiWhatsapp className={className} aria-hidden />;
}
export function TelegramIcon({ className }: { className?: string }) {
  return <SiTelegram className={className} style={{ color: "#26A5E4" }} aria-hidden />;
}

const METHOD_LOGO: Record<string, { label: string; bg: string; fg: string }> = {
  bkash: { label: "bKash", bg: "#E2136E", fg: "#fff" },
  nagad: { label: "Nagad", bg: "#F6921E", fg: "#fff" },
  rocket: { label: "Rocket", bg: "#8C3494", fg: "#fff" },
};

const KIND_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  binance: { label: "Binance", bg: "#F0B90B", fg: "#1E2026" },
  usdt: { label: "USDT", bg: "#26A17B", fg: "#fff" },
};

function Badge({ name, kind, className }: { name: string; kind: string; className: string }) {
  const m = METHOD_LOGO[name.toLowerCase()] ?? KIND_BADGE[kind] ?? { label: name, bg: "var(--primary)", fg: "var(--primary-foreground)" };
  return (
    <span className={`${className} inline-flex items-center justify-center overflow-hidden rounded-xl px-0.5 text-center text-[10px] font-bold leading-tight`} style={{ background: m.bg, color: m.fg }} aria-hidden>
      {m.label}
    </span>
  );
}

/** Payment method logo: uploaded image (square, contain, white tile) → brand icon → coloured name badge. */
export function MethodLogo({ name, kind, logo, className = "h-10 w-10" }: { name: string; kind: string; logo?: string | null | undefined; className?: string }) {
  const url = useStorageUrl("logos", logo);
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <span className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-border`}>
        <img src={url} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </span>
    );
  }
  if (!logo && kind === "binance") return <SiBinance className={className} style={{ color: "#F0B90B" }} aria-hidden />;
  if (!logo && kind === "usdt") return <SiTether className={className} style={{ color: "#26A17B" }} aria-hidden />;
  return <Badge name={name} kind={kind} className={className} />;
}
