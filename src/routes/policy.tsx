import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Policy, Terms & Refunds | Premium SMM Store" },
      { name: "description", content: "Our terms of service, privacy policy and refund rules." },
      { property: "og:title", content: "Policy, Terms & Refunds | Premium SMM Store" },
      { property: "og:description", content: "Our terms of service, privacy policy and refund rules." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>Policy, Terms & Refunds</PageTitle>
      <div className="space-y-3">
        <Card><h2 className="label-premium mb-2 text-xl">Terms of Service</h2><p className="text-muted-foreground">By using this store you agree to provide valid public links. We are not responsible for drops caused by platform updates or private accounts.</p></Card>
        <Card><h2 className="label-premium mb-2 text-xl">Privacy</h2><p className="text-muted-foreground">We store only the data needed to run your account: name, email, phone, orders and payments. We never sell your data.</p></Card>
        <Card><h2 className="label-premium mb-2 text-xl">Refunds</h2><p className="text-muted-foreground">Rejected or canceled orders are refunded in full to your wallet balance instantly. Partially delivered orders are refunded for the undelivered amount. Wallet funds are not withdrawable as cash.</p></Card>
      </div>
    </div>
  );
}
