import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { platformsQuery } from "@/lib/queries";
import { PlatformIcon } from "@/lib/brand";
import { PageTitle, Empty, ErrorState } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Order Now — Pick a Platform | Premium SMM Store" },
      { name: "description", content: "Choose Facebook, Instagram, YouTube, TikTok or Telegram to start your order." },
      { property: "og:title", content: "Order Now — Premium SMM Store" },
      { property: "og:description", content: "Choose a platform and start growing." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { data, isLoading, isError } = useQuery(platformsQuery);
  return (
    <div>
      <PageTitle sub="Tap a platform to open its order form.">Order Now</PageTitle>
      {isError && <ErrorState />}
      {data && data.length === 0 && <Empty text="No platforms available right now." />}
      <div className="grid gap-3">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-3xl" />)}
        {data?.map((p) => (
          <Link key={p.id} to="/service/$platform" params={{ platform: p.slug }} className="glass tilt flex items-center gap-4 rounded-3xl p-4">
            <PlatformIcon slug={p.slug} className="h-12 w-12" />
            <span className="label-premium text-lg">{p.name} Service</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
