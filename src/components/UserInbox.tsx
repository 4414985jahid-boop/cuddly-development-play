import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui-kit";

/** Bell with unread count + list, and show-once popups sent by support. */
export function UserInbox() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const key = ["notifications", user?.id];
  const { data = [] } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notes-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const unread = data.filter((n) => !n.read_at);
  const popup = data.find((n) => n.kind === "popup" && !n.shown_at);

  const mark = async (ids: string[], shown: boolean) => {
    if (!ids.length) return;
    await supabase.rpc("mark_my_notifications", { _ids: ids, _shown: shown });
    qc.invalidateQueries({ queryKey: key });
  };

  const openList = () => {
    if (!user) { toast("Sign in to see notifications"); return; }
    setOpen(true);
    mark(unread.filter((n) => n.kind !== "popup" || n.shown_at).map((n) => n.id), false);
  };

  return (
    <>
      <button aria-label="Notifications" className="relative rounded-full p-2 hover:bg-accent" onClick={openList}>
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="bg-brand absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-primary-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Notifications</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2 overflow-y-auto px-4 pb-6">
            {data.length === 0 ? <Empty text="No notifications yet" /> : data.map((n) => (
              <div key={n.id} className="rounded-2xl border border-border p-3">
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={!!popup} onOpenChange={(o) => { if (!o && popup) mark([popup.id], true); }}>
        <DialogContent>
          <DialogTitle className="text-gradient text-2xl">{popup?.title}</DialogTitle>
          {popup?.body && <p className="whitespace-pre-wrap text-muted-foreground">{popup.body}</p>}
          <button className="btn-glow" onClick={() => popup && mark([popup.id], true)}>OK</button>
        </DialogContent>
      </Dialog>
    </>
  );
}
