import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { SocialButtons } from "@/components/SocialButtons";
import { StrengthBar } from "@/components/StrengthBar";

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [
      { title: "Create Account | Premium SMM Store" },
      { name: "description", content: "Create your free account to start ordering social media growth services." },
      { property: "og:title", content: "Create Account | Premium SMM Store" },
      { property: "og:description", content: "Sign up in seconds." },
    ],
  }),
  component: SignUp,
});

const DISPOSABLE = ["mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "yopmail.com", "trashmail.com", "temp-mail.org", "getnada.com", "sharklasers.com", "dispostable.com"];

const schema = z.object({
  name: z.string().trim().min(2, "Name must be 2–60 characters").max(60, "Name must be 2–60 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255)
    .refine((e) => !DISPOSABLE.includes(e.split("@")[1] ?? ""), "Disposable emails are not allowed"),
  phone: z.string().trim().regex(/^\+?\d{8,15}$/, "Enter a valid phone number"),
  password: z.string().min(8, "At least 8 characters").max(72),
  confirm: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

function SignUp() {
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path[0] as string] ??= i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: r.data.email,
      password: r.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: r.data.name, phone: r.data.phone, accepted_terms: true },
      },
    });
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      toast.error(m.includes("database") ? "That phone number is already registered." : error.message);
      return;
    }
    if (data.session) { toast.success("Welcome!"); navigate({ to: "/" }); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <MailCheck className="mx-auto h-14 w-14 text-primary" />
        <h1 className="text-gradient mt-3 text-2xl font-bold">Check your inbox</h1>
        <p className="mt-2 text-muted-foreground">We sent a verification link to <b>{f.email}</b>. Open it to activate your account.</p>
        <Link to="/sign-in" className="btn-glow mt-6">Go to Sign In</Link>
      </Card>
    );
  }

  const field = (k: keyof typeof f, label: string, type = "text", extra?: React.ReactNode) => (
    <div>
      <label className={labelCls} htmlFor={k}>{label}</label>
      <div className="relative">
        <input id={k} type={type} className={inputCls} value={f[k] as string} onChange={(e) => set(k, e.target.value)} autoComplete="off" />
        {extra}
      </div>
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <PageTitle sub="Join in under a minute.">Create Account</PageTitle>
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {field("name", "Full Name")}
          {field("email", "Email", "email")}
          {field("phone", "Phone Number", "tel")}
          {field("password", "Password", show ? "text" : "password",
            <button type="button" aria-label="Show password" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-muted-foreground">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>)}
          <StrengthBar value={f.password} />
          {field("confirm", "Confirm Password", show ? "text" : "password")}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={f.terms} onChange={(e) => set("terms", e.target.checked)} />
            <span>I agree to the <Link to="/policy" className="text-primary underline">Terms and Privacy Policy</Link></span>
          </label>
          {errors["terms"] && <p className="text-xs text-destructive">{errors["terms"]}</p>}
          <button disabled={busy} className="btn-glow w-full">{busy && <Spinner />} Confirm Sign Up</button>
        </form>
        <SocialButtons />
        <p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <Link to="/sign-in" className="font-semibold text-primary">Sign In</Link></p>
      </Card>
    </div>
  );
}
