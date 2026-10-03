import { useState } from "react";
import { SiGoogle, SiApple } from "react-icons/si";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#f35325" />
      <rect x="12" y="1" width="10" height="10" fill="#81bc06" />
      <rect x="1" y="12" width="10" height="10" fill="#05a6f0" />
      <rect x="12" y="12" width="10" height="10" fill="#ffba08" />
    </svg>
  );
}

export function SocialButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (provider: "google" | "apple" | "microsoft") => {
    setBusy(provider);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Sign-in failed. Please try again."); setBusy(null); return; }
    if (r.redirected) return;
    toast.success("Signed in");
    window.location.assign("/");
  };
  return (
    <div className="mt-5 space-y-2.5">
      <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
      <button type="button" disabled={!!busy} onClick={() => go("google")} className="btn-ghost-glow w-full"><SiGoogle className="h-4 w-4" /> Continue with Google</button>
      <button type="button" disabled={!!busy} onClick={() => go("apple")} className="btn-ghost-glow w-full"><SiApple className="h-4 w-4" /> Continue with Apple</button>
      <button type="button" disabled={!!busy} onClick={() => go("microsoft")} className="btn-ghost-glow w-full"><MicrosoftIcon className="h-4 w-4" /> Continue with Microsoft</button>
    </div>
  );
}
