import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Copy, RefreshCw, KeyRound, Link2, BookOpen, ShieldCheck, Code2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/queries";
import { copy, money } from "@/lib/format";
import { Card, PageTitle, Spinner } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/reseller-api")({
  head: () => ({
    meta: [
      { title: "Reseller API | Premium SMM Store" },
      { name: "description", content: "Your personal API key, endpoint and full documentation for reselling our services." },
      { property: "og:title", content: "Reseller API | Premium SMM Store" },
      { property: "og:description", content: "Resell our SMM services through a simple JSON API." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiPage,
});

const ERRS: Record<string, string> = { API_DISABLED: "API access has been disabled for your account. Contact support.", ACCOUNT_SUSPENDED: "Your account is suspended." };

function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-2xl border border-border bg-background/70 p-4 text-xs leading-relaxed"><code>{children}</code></pre>
      <button aria-label="Copy code" onClick={() => copy(children)} className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><Copy className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function ApiPage() {
  const { profile } = useAuth();
  const { data: settings } = useQuery(settingsQuery);
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/public/v2`;

  const { data: key, error, isLoading } = useQuery({
    queryKey: ["my-api-key"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ensure_my_api_key", { _regenerate: false });
      if (error) throw new Error(Object.keys(ERRS).find((k) => error.message.includes(k)) ?? "FAIL");
      return data as string;
    },
    retry: false,
  });

  const regenerate = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("ensure_my_api_key", { _regenerate: true });
    setBusy(false); setConfirm(false);
    if (error) { toast.error("Could not regenerate key"); return; }
    qc.setQueryData(["my-api-key"], data);
    setShow(true);
    toast.success("New API key created — the old one no longer works");
  };

  const k = key ?? "YOUR_API_KEY";
  const masked = key ? key.slice(0, 6) + "•".repeat(20) + key.slice(-4) : "";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle sub="Sell our services on your own panel, website or bot.">Reseller API</PageTitle>

      <Card className="space-y-4">
        <div>
          <div className="label-premium mb-1.5 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Your API key</div>
          {isLoading ? <div className="h-12 animate-pulse rounded-2xl bg-muted" />
            : error ? <p className="text-sm text-destructive">{ERRS[(error as Error).message] ?? "Could not load your API key. Refresh to try again."}</p>
            : (
              <div className="flex items-center gap-2">
                <button onClick={() => copy(key!)} className="min-w-0 flex-1 truncate rounded-2xl border border-input bg-background/60 px-4 py-3 text-left font-mono text-sm" aria-label="Copy API key">
                  {show ? key : masked}
                </button>
                <button aria-label={show ? "Hide key" : "Show key"} onClick={() => setShow(!show)} className="btn-ghost-glow !px-3">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                <button aria-label="Copy key" onClick={() => copy(key!)} className="btn-ghost-glow !px-3"><Copy className="h-4 w-4" /></button>
              </div>
            )}
          {key && <button onClick={() => setConfirm(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><RefreshCw className="h-3.5 w-3.5" /> Regenerate key</button>}
        </div>
        <div>
          <div className="label-premium mb-1.5 flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> API URL</div>
          <button onClick={() => copy(url)} className="w-full truncate rounded-2xl border border-input bg-background/60 px-4 py-3 text-left font-mono text-sm">{url}</button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent/50 px-4 py-3 text-sm">
          <span>API balance (same as your account): <b className="text-primary">{money(profile?.balance ?? 0)}</b></span>
          <Link to="/add-funds" className="btn-glow !px-4 !py-1.5 text-sm">Add Funds</Link>
        </div>
      </Card>

      <Card>
        <h2 className="label-premium mb-3 flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" /> Documentation</h2>
        <p className="mb-3 text-sm text-muted-foreground">Send <b>GET</b> or <b>POST</b> (form or JSON) requests to the API URL with your <code>key</code> and an <code>action</code>. All responses are JSON. Errors return <code>{`{"error": "..."}`}</code> with a matching HTTP status.</p>
        <Tabs defaultValue="services">
          <TabsList className="flex-wrap"><TabsTrigger value="services">Services</TabsTrigger><TabsTrigger value="add">Add order</TabsTrigger><TabsTrigger value="status">Order status</TabsTrigger><TabsTrigger value="balance">Balance</TabsTrigger></TabsList>
          <TabsContent value="services" className="space-y-2">
            <p className="text-sm">Parameters: <code>key</code>, <code>action=services</code></p>
            <Code>{`[\n  {\n    "service": "6f1c…-uuid",\n    "name": "Instagram Followers",\n    "platform": "Instagram",\n    "category": "Followers",\n    "rate": 1.2,\n    "rate_per": 1000,\n    "min": 100,\n    "max": 10000,\n    "avg_time": "24 hours"\n  }\n]`}</Code>
          </TabsContent>
          <TabsContent value="add" className="space-y-2">
            <p className="text-sm">Parameters: <code>key</code>, <code>action=add</code>, <code>service</code> (id from services), <code>link</code>, <code>quantity</code>. The charge is deducted from your balance immediately.</p>
            <Code>{`{\n  "order": "4829103756",\n  "charge": "1.20",\n  "balance": "48.80",\n  "status": "pending"\n}`}</Code>
          </TabsContent>
          <TabsContent value="status" className="space-y-2">
            <p className="text-sm">Parameters: <code>key</code>, <code>action=status</code>, <code>order</code> — or <code>orders</code> with up to 100 comma-separated IDs. Status is one of pending, processing, completed, partial, rejected, canceled.</p>
            <Code>{`{\n  "order": "4829103756",\n  "status": "partial",\n  "quantity": 1000,\n  "delivered": 700,\n  "remains": 300,\n  "charge": "1.20",\n  "refunded": "0.36"\n}`}</Code>
          </TabsContent>
          <TabsContent value="balance" className="space-y-2">
            <p className="text-sm">Parameters: <code>key</code>, <code>action=balance</code></p>
            <Code>{`{\n  "balance": "48.80",\n  "currency": "USD"\n}`}</Code>
          </TabsContent>
        </Tabs>
        <h3 className="label-premium mb-2 mt-5">Errors</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><b>401</b> Invalid API key · <b>403</b> API disabled / account suspended</li>
          <li><b>402</b> Insufficient balance · <b>400</b> Bad quantity, invalid link, service inactive, unknown action</li>
          <li><b>429</b> Rate limit exceeded ({settings?.api_rate_per_min ?? 60} requests per minute)</li>
        </ul>
      </Card>

      <Card>
        <h2 className="label-premium mb-3 flex items-center gap-2 text-lg"><Code2 className="h-5 w-5 text-primary" /> Code samples</h2>
        <Tabs defaultValue="curl">
          <TabsList className="flex-wrap"><TabsTrigger value="curl">cURL</TabsTrigger><TabsTrigger value="php">PHP</TabsTrigger><TabsTrigger value="py">Python</TabsTrigger><TabsTrigger value="node">Node.js</TabsTrigger><TabsTrigger value="tg">Telegram bot</TabsTrigger></TabsList>
          <TabsContent value="curl"><Code>{`curl -X POST "${url}" \\\n  -d key=${k} \\\n  -d action=add \\\n  -d service=SERVICE_ID \\\n  -d link=https://instagram.com/username \\\n  -d quantity=1000`}</Code></TabsContent>
          <TabsContent value="php"><Code>{`<?php\n$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([\n  "key" => "${k}",\n  "action" => "balance",\n]));\n$res = json_decode(curl_exec($ch), true);\necho $res["balance"];`}</Code></TabsContent>
          <TabsContent value="py"><Code>{`import requests\n\nr = requests.post("${url}", data={\n    "key": "${k}",\n    "action": "status",\n    "order": "4829103756",\n})\nprint(r.json())`}</Code></TabsContent>
          <TabsContent value="node"><Code>{`const res = await fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ key: "${k}", action: "services" }),\n});\nconsole.log(await res.json());`}</Code></TabsContent>
          <TabsContent value="tg"><Code>{`# pip install python-telegram-bot requests\nimport requests\nfrom telegram.ext import ApplicationBuilder, CommandHandler\n\nAPI = "${url}"\nKEY = "${k}"\n\nasync def balance(update, ctx):\n    r = requests.post(API, data={"key": KEY, "action": "balance"}).json()\n    await update.message.reply_text(f"Balance: {r.get('balance', r.get('error'))}")\n\nasync def order(update, ctx):\n    service, link, qty = ctx.args\n    r = requests.post(API, data={"key": KEY, "action": "add",\n        "service": service, "link": link, "quantity": qty}).json()\n    await update.message.reply_text(str(r))\n\napp = ApplicationBuilder().token("BOT_TOKEN").build()\napp.add_handler(CommandHandler("balance", balance))\napp.add_handler(CommandHandler("order", order))\napp.run_polling()`}</Code></TabsContent>
        </Tabs>
      </Card>

      <Card>
        <h2 className="label-premium mb-3 flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" /> Rules & API Policy</h2>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Add funds to this account first — every API order is charged from its balance.</li>
          <li>Orders are delivered manually by our team and appear in your Order History.</li>
          <li>Keep your key secret. If it leaks, regenerate it — the old key stops working at once.</li>
          <li>Use public profile or post links in full https:// form.</li>
        </ul>
        <p className="whitespace-pre-line text-sm">{settings?.api_policy}</p>
      </Card>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API key?</AlertDialogTitle>
            <AlertDialogDescription>Your current key will stop working immediately. Any panel or bot using it must be updated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); regenerate(); }} disabled={busy}>{busy && <Spinner />} Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
