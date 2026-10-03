import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, History, PlusCircle, ReceiptText, User, Rocket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { platformsQuery, settingsQuery } from "@/lib/queries";
import { PlatformIcon } from "@/lib/brand";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Premium SMM Store — Followers, Likes & Views" },
      { name: "description", content: "Order Facebook, Instagram, YouTube, TikTok and Telegram growth services, hand-delivered by our team." },
      { property: "og:title", content: "Premium SMM Store — Followers, Likes & Views" },
      { property: "og:description", content: "Hand-delivered social growth for Facebook, Instagram, YouTube, TikTok and Telegram." },
    ],
  }),
  component: Home,
});

const TILES = [
  { to: "/balance", label: "Wallet", icon: Wallet },
  { to: "/orders", label: "Order History", icon: History },
  { to: "/add-funds", label: "Add Funds", icon: PlusCircle },
  { to: "/add-funds/history", label: "Add Funds History", icon: ReceiptText },
  { to: "/profile", label: "Account", icon: User },
] as const;

function Home() {
  const { user } = useAuth();
  const { data: s } = useQuery(settingsQuery);
  const { data: platforms, isLoading } = useQuery(platformsQuery);

  return (
    <div className="space-y-12">
      <section className="pt-6 text-center">
        <p className="label-premium mb-3 inline-block rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">Hand-delivered • Secure wallet • 24/7 support</p>
        <h1 className="text-gradient mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          {s?.hero_title ?? "Grow every account, delivered by real people"}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">{s?.hero_text}</p>
        {!user && (
          <div className="mt-7 flex justify-center gap-3">
            <Link to="/sign-in" className="btn-ghost-glow">Sign In</Link>
            <Link to="/sign-up" className="btn-glow">Sign Up</Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="label-premium mb-5 text-center text-2xl">Services</h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)
            : platforms?.map((p) => (
                <Link key={p.id} to="/service/$platform" params={{ platform: p.slug }} className="glass tilt group flex flex-col items-center gap-3 rounded-3xl p-5">
                  <PlatformIcon slug={p.slug} className="h-14 w-14 transition group-hover:animate-spin3d sm:h-16 sm:w-16" />
                  <span className="text-xs font-semibold text-muted-foreground">{p.name}</span>
                </Link>
              ))}
        </div>
      </section>

      <div className="flex justify-center">
        <Link to="/order" className="btn-glow !px-10 !py-4 text-lg"><Rocket className="h-5 w-5" /> Order Now</Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="glass tilt flex flex-col items-center gap-2 rounded-3xl p-5 text-center">
            <span className="bg-brand shadow-glow flex h-11 w-11 items-center justify-center rounded-2xl text-primary-foreground"><t.icon className="h-5 w-5" /></span>
            <span className="label-premium text-sm">{t.label}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
