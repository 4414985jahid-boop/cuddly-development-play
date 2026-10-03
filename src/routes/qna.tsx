import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/qna")({
  head: () => ({
    meta: [
      { title: "QnA | Premium SMM Store" },
      { name: "description", content: "Answers to the most common questions about orders and payments." },
      { property: "og:title", content: "QnA | Premium SMM Store" },
      { property: "og:description", content: "Answers to the most common questions about orders and payments." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>QnA</PageTitle>
      <div className="space-y-3">
        <Card><h2 className="label-premium mb-2 text-xl">How long does delivery take?</h2><p className="text-muted-foreground">Each service shows its average time. Our team delivers every order manually.</p></Card>
        <Card><h2 className="label-premium mb-2 text-xl">How do I add funds?</h2><p className="text-muted-foreground">Open Add Funds, choose Binance, USDT or P2P (bKash, Nagad, Rocket), send the payment and submit the Transaction ID. An admin approves it shortly.</p></Card>
        <Card><h2 className="label-premium mb-2 text-xl">Can I cancel an order?</h2><p className="text-muted-foreground">Yes — while the order is still Pending you can cancel it from Order History and get a full refund.</p></Card>
        <Card><h2 className="label-premium mb-2 text-xl">My account is private, what now?</h2><p className="text-muted-foreground">Make the profile or post public before ordering, otherwise delivery may fail.</p></Card>
      </div>
    </div>
  );
}
