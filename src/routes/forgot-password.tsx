import { createFileRoute } from "@tanstack/react-router";
import { telegramUrl } from "@/lib/format";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { TelegramIcon } from "@/lib/brand";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password | Premium SMM Store" },
      { name: "description", content: "Reset your password by email or contact support on Telegram." },
      { property: "og:title", content: "Forgot Password | Premium SMM Store" },
      { property: "og:description", content: "Recover access to your account." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { data: s } = useQuery(settingsQuery);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setDone(true);
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageTitle>Forgot Password</PageTitle>
      <Card>
        <h2 className="label-premium mb-3 text-lg">Reset by Email</h2>
        {done ? (
          <p className="text-muted-foreground">If an account exists for that email, a reset link is on its way.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div><label className={labelCls} htmlFor="em">Email</label><input id="em" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <button disabled={busy} className="btn-glow w-full">{busy && <Spinner />} Send reset link</button>
          </form>
        )}
      </Card>
      {s?.telegram && (
        <a href={telegramUrl(s.telegram)!} target="_blank" rel="noreferrer" className="btn-ghost-glow w-full">
          <TelegramIcon className="h-5 w-5" /> Contact Support on Telegram
        </a>
      )}
    </div>
  );
}
