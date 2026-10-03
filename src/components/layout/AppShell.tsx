import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home, User, Wallet, ShoppingCart, History, PlusCircle, ReceiptText, ShieldCheck, HelpCircle, Info,
  LogOut, Sun, Moon, Bell, X, Mail, Sparkles, Code2, LayoutDashboard, Languages, Music, Check,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/queries";
import { money, telegramUrl, whatsappUrl } from "@/lib/format";
import { SupportAdminButton } from "@/components/SupportAdmin";
import { Avatar } from "@/components/Avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { UserInbox } from "@/components/UserInbox";
import { PlatformIcon, TelegramIcon, WhatsAppIcon } from "@/lib/brand";
import { toast } from "sonner";
import { MusicProvider, useMusic } from "@/components/MusicPlayer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const d = saved ? saved === "dark" : true;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);
  const toggle = () => {
    const d = !dark;
    setDark(d);
    localStorage.setItem("theme", d ? "dark" : "light");
    document.documentElement.classList.toggle("dark", d);
  };
  return { dark, toggle };
}

function FloatingBackground() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const f = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  const items = [
    { s: "facebook", c: "left-[6%] top-[12%] h-24 w-24", d: "0s" },
    { s: "instagram", c: "right-[8%] top-[22%] h-28 w-28", d: "-4s" },
    { s: "youtube", c: "left-[12%] bottom-[18%] h-28 w-28", d: "-8s" },
    { s: "tiktok", c: "right-[14%] bottom-[10%] h-20 w-20", d: "-12s" },
    { s: "telegram", c: "left-[45%] top-[45%] h-24 w-24", d: "-6s" },
  ];
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${hidden ? "paused-hidden" : ""}`}>
      <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      {items.map((i) => (
        <div key={i.s} className={`absolute ${i.c} animate-floaty opacity-[0.12] blur-[2px] will-change-transform`} style={{ animationDelay: i.d }}>
          <PlatformIcon slug={i.s} className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}

const MENU = [
  { to: "/", label: "Home", icon: Home },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/balance", label: "Balance", icon: Wallet },
  { to: "/order", label: "New Order", icon: ShoppingCart },
  { to: "/orders", label: "Order History", icon: History },
  { to: "/add-funds", label: "Add Funds", icon: PlusCircle },
  { to: "/add-funds/history", label: "Add Funds History", icon: ReceiptText },
  { to: "/reseller-api", label: "API", icon: Code2 },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

const MENU_AFTER = [
  { to: "/policy", label: "Policy", icon: ShieldCheck },
  { to: "/qna", label: "QnA", icon: HelpCircle },
  { to: "/about", label: "About Us", icon: Info },
] as const;

const BOTTOM = [
  { to: "/", label: "Home", icon: Home },
  { to: "/order", label: "New Order", icon: ShoppingCart },
  { to: "/orders", label: "Orders", icon: History },
  { to: "/add-funds", label: "Add Funds", icon: PlusCircle },
  { to: "/profile", label: "Account", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return <MusicProvider><Shell>{children}</Shell></MusicProvider>;
}

const LANGS = [{ code: "en", label: "English", ready: true }, { code: "bn", label: "বাংলা (Bangla)", ready: false }];

function Shell({ children }: { children: ReactNode }) {
  const music = useMusic();
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("en");
  useEffect(() => { setLang(localStorage.getItem("lang") ?? "en"); }, []);
  const { dark, toggle } = useTheme();
  const { user, profile, verified } = useAuth();
  const { data: settings } = useQuery(settingsQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [cookieOk, setCookieOk] = useState(true);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const siteName = settings?.site_name ?? "Premium SMM Store";
  const tg = telegramUrl(settings?.telegram);
  const wa = whatsappUrl(settings?.whatsapp);
  const isMobile = useIsMobile();
  useEffect(() => { setMenuOpen(false); }, [path]);

  useEffect(() => { setCookieOk(localStorage.getItem("cookie_ok") === "1"); }, []);

  const logout = async () => {
    setMenuOpen(false);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate({ to: "/", replace: true });
  };

  const resend = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email, options: { emailRedirectTo: window.location.origin } });
    if (error) toast.error(error.message); else toast.success("Verification email sent");
  };

  return (
    <div className="relative min-h-screen pb-28">
      <FloatingBackground />

      {settings?.announcement_on && settings.announcement_text && !bannerClosed && (
        <div className="bg-brand flex items-center justify-center gap-3 px-4 py-2 text-sm text-primary-foreground">
          <Sparkles className="h-4 w-4 shrink-0" /> <span className="text-center">{settings.announcement_text}</span>
          <button aria-label="Dismiss" onClick={() => setBannerClosed(true)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="bg-brand shadow-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-primary-foreground">
              {siteName.charAt(0)}
            </span>
            <span className="text-gradient truncate font-display text-base font-bold sm:text-lg">{siteName}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <Link to={user ? "/balance" : "/sign-in"} className="btn-ghost-glow !px-3 !py-1.5 text-sm">
              <Wallet className="h-4 w-4 text-primary" /> {money(profile?.balance ?? 0)}
            </Link>
            <UserInbox />
            <button aria-label="Toggle theme" onClick={toggle} className="rounded-full p-2 hover:bg-accent">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className={`menu-btn ${menuOpen ? "is-open" : ""}`}>
              <span className="menu-dots" aria-hidden><i /><i /><i /></span>
            </button>
          </div>
        </div>
      </header>

      {user && !verified && (
        <div className="mx-auto mt-3 flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm sm:mx-4 lg:mx-auto">
          <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-warning" /> Verify your email to order and add funds.</span>
          <button onClick={resend} className="font-semibold text-primary underline-offset-2 hover:underline">Resend</button>
        </div>
      )}

      <main className={`mx-auto px-4 pt-6 ${path.startsWith("/admin") ? "max-w-7xl" : "max-w-5xl"}`}>{children}</main>

      <footer className="mx-auto mt-16 max-w-5xl px-4 pb-6">
        <div className="glass rounded-3xl p-6">
          <h3 className="label-premium mb-3 text-lg">Quick Links</h3>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            {tg && <SupportAdminButton className="hover:text-primary">Support Admin</SupportAdminButton>}
            <Link to="/qna" className="hover:text-primary">QnA</Link>
            <Link to="/order" className="hover:text-primary">Buy Services</Link>
            <Link to="/about" className="hover:text-primary">About Us</Link>
            <Link to="/policy" className="hover:text-primary">Policy</Link>
          </div>
          <h3 className="label-premium mb-3 mt-6 text-lg">Info</h3>
          <div className="flex gap-4">
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="tilt glass flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs"><WhatsAppIcon className="h-6 w-6 text-success" />WhatsApp</a>}
            {tg && <a href={tg} target="_blank" rel="noreferrer" className="tilt glass flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs"><TelegramIcon className="h-6 w-6" />Telegram</a>}
            {settings?.email && <a href={`mailto:${settings.email}`} className="tilt glass flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs"><Mail className="h-6 w-6 text-primary" />E-mail</a>}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
        </div>
      </footer>

      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
          className="animate-pulse-ring fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-success text-primary-foreground shadow-glow">
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      )}

      {!cookieOk && (
        <div className="glass fixed bottom-24 left-4 right-20 z-40 flex items-center gap-3 rounded-2xl p-3 text-xs sm:right-auto sm:max-w-sm">
          <span>We use cookies to keep you signed in and remember your preferences.</span>
          <button className="btn-glow !px-3 !py-1.5 text-xs" onClick={() => { localStorage.setItem("cookie_ok", "1"); setCookieOk(true); }}>OK</button>
        </div>
      )}

      <nav className="glass fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0" aria-label="Shortcuts">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {BOTTOM.map((b) => {
            const active = b.to === "/" ? path === "/" : path.startsWith(b.to);
            return (
              <Link key={b.to} to={b.to} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${active ? "text-primary" : "text-muted-foreground"}`}>
                <b.icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_var(--glow)]" : ""}`} />
                {b.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "max-h-[85vh] overflow-y-auto rounded-t-3xl" : "w-80 overflow-y-auto"}>
          <SheetHeader><SheetTitle className="text-gradient font-display">{siteName}</SheetTitle></SheetHeader>
          {user && profile && (
            <Link to="/profile" className="glass mx-4 flex items-center gap-3 rounded-2xl p-3">
              <Avatar path={profile.avatar_url} name={profile.full_name} className="h-12 w-12" />
              <div className="min-w-0">
                <div className="label-premium truncate">{profile.full_name || profile.username}</div>
                <div className="font-mono text-xs text-muted-foreground">ID {profile.public_id}</div>
                <div className="text-sm font-bold text-primary">{money(profile.balance)}</div>
              </div>
            </Link>
          )}
          <div className="mt-2 flex flex-col gap-1 px-2">
            {MENU.map((m) => (
              <Link key={m.to} to={m.to} onClick={() => setMenuOpen(false)} className="label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent">
                <m.icon className="h-5 w-5 text-primary" /> {m.label}
              </Link>
            ))}
            <button onClick={() => { setMenuOpen(false); setLangOpen(true); }} className="label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent text-left">
              <Languages className="h-5 w-5 text-primary" /> Language
            </button>
            <button onClick={() => { setMenuOpen(false); music.toggleOpen(); }} className="label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent text-left">
              <Music className="h-5 w-5 text-primary" /> Music
            </button>
            {MENU_AFTER.map((m) => (
              <Link key={m.to} to={m.to} onClick={() => setMenuOpen(false)} className="label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent">
                <m.icon className="h-5 w-5 text-primary" /> {m.label}
              </Link>
            ))}
            {tg && (
              <SupportAdminButton className="label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent">
                <TelegramIcon className="h-5 w-5" /> Support Admin
              </SupportAdminButton>
            )}
            {user && (
              <button onClick={logout} className="label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-destructive hover:bg-accent">
                <LogOut className="h-5 w-5" /> Logout
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={langOpen} onOpenChange={setLangOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-gradient">Language</DialogTitle>
          <div className="space-y-2">
            {LANGS.map((l) => (
              <button key={l.code} disabled={!l.ready} onClick={() => { localStorage.setItem("lang", l.code); setLang(l.code); setLangOpen(false); toast.success(`Language: ${l.label}`); }}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${lang === l.code ? "border-primary bg-primary/10" : "border-border"} disabled:opacity-50`}>
                <span>{l.label}</span>{lang === l.code ? <Check className="h-4 w-4 text-primary" /> : !l.ready && <span className="text-xs">Coming soon</span>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
