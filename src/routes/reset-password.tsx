import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { StrengthBar } from "@/components/StrengthBar";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password | Premium SMM Store" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Set New Password | Premium SMM Store" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast.error("At least 8 characters"); return; }
    if (pw !== cf) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/" });
  };
  return (
    <div className="mx-auto max-w-md">
      <PageTitle>Set new password</PageTitle>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div><label className={labelCls}>New Password</label><input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} /><StrengthBar value={pw} /></div>
          <div><label className={labelCls}>Confirm Password</label><input type="password" className={inputCls} value={cf} onChange={(e) => setCf(e.target.value)} /></div>
          <button disabled={busy} className="btn-glow w-full">{busy && <Spinner />} Save</button>
        </form>
      </Card>
    </div>
  );
}
