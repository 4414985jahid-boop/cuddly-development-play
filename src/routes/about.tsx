import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us | Premium SMM Store" },
      { name: "description", content: "Who we are and how we deliver." },
      { property: "og:title", content: "About Us | Premium SMM Store" },
      { property: "og:description", content: "Who we are and how we deliver." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>About Us</PageTitle>
      <div className="space-y-3">
        <Card><h2 className="label-premium mb-2 text-xl">Our mission</h2><p className="text-muted-foreground">We help creators and businesses grow on Facebook, Instagram, YouTube, TikTok and Telegram with premium, hand-delivered services.</p></Card>
        <Card><h2 className="label-premium mb-2 text-xl">Real people, real support</h2><p className="text-muted-foreground">Every order is reviewed and delivered by our team, and support is one tap away on WhatsApp or Telegram.</p></Card>
      </div>
    </div>
  );
}
