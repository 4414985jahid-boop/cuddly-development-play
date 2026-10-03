import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Music, Upload, Star, Trash2, RotateCcw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { adminListSongs, adminSaveSong, adminSetMusicEnabled, adminSongAction, adminSongUploadUrl } from "@/lib/music.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, Empty, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";

type Form = { id?: string; title: string; artist: string; file_path: string; cover_path: string | null; active: boolean; sort: number };
const blank: Form = { title: "", artist: "", file_path: "", cover_path: null, active: true, sort: 0 };

export function AdminMusic() {
  const list = useServerFn(adminListSongs);
  const save = useServerFn(adminSaveSong);
  const act = useServerFn(adminSongAction);
  const setEnabled = useServerFn(adminSetMusicEnabled);
  const upUrl = useServerFn(adminSongUploadUrl);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-songs"], queryFn: () => list() });
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => { qc.invalidateQueries({ queryKey: ["admin-songs"] }); qc.invalidateQueries({ queryKey: ["welcome-song"] }); };

  const upload = async (file: File, kind: "file_path" | "cover_path") => {
    if (kind === "file_path" && !file.type.startsWith("audio/")) { toast.error("Choose an audio file"); return; }
    if (kind === "cover_path" && !file.type.startsWith("image/")) { toast.error("Choose an image"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20 MB"); return; }
    setBusy(true);
    try {
      const { path, token } = await upUrl({ data: { name: file.name } });
      const { error } = await supabase.storage.from("music").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      setF((p) => ({ ...(p ?? blank), [kind]: path, ...(kind === "file_path" && !p?.title ? { title: file.name.replace(/\.[^.]+$/, "") } : {}) }));
      toast.success("Uploaded");
    } catch (e) { toast.error((e as Error).message || "Upload failed"); }
    finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f?.file_path) { toast.error("Upload an audio file first"); return; }
    if (!f.title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    try { await save({ data: f }); toast.success("Song saved"); setF(null); reload(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const action = async (id: string, a: "welcome" | "unwelcome" | "delete" | "restore" | "on" | "off") => {
    try { await act({ data: { id, action: a } }); toast.success("Updated"); reload(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle sub="The welcome song plays for visitors after a one-time “Tap to enter” on their first visit.">Music</PageTitle>
      <Card className="flex items-center justify-between gap-3">
        <div><div className="label-premium">Welcome autoplay</div><div className="text-xs text-muted-foreground">Turn the welcome song on or off for the whole site.</div></div>
        <button role="switch" aria-checked={data?.enabled ?? true} aria-label="Welcome autoplay"
          onClick={async () => { await setEnabled({ data: { enabled: !data?.enabled } }); toast.success(!data?.enabled ? "Autoplay on" : "Autoplay off"); reload(); }}
          className={`relative h-7 w-12 rounded-full transition ${data?.enabled ? "bg-primary" : "bg-muted"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-background transition ${data?.enabled ? "left-6" : "left-1"}`} />
        </button>
      </Card>

      <Card>
        {!f ? (
          <button onClick={() => setF(blank)} className="btn-glow w-full"><Upload className="h-4 w-4" /> Add a song</button>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="song-file">Audio file {f.file_path && <span className="text-success">✓ uploaded</span>}</label>
              <input id="song-file" type="file" accept="audio/*" className={inputCls} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "file_path")} />
            </div>
            <div>
              <label className={labelCls} htmlFor="song-cover">Cover image (optional) {f.cover_path && <span className="text-success">✓</span>}</label>
              <input id="song-cover" type="file" accept="image/*" className={inputCls} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover_path")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={labelCls} htmlFor="song-title">Title</label><input id="song-title" className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
              <div><label className={labelCls} htmlFor="song-artist">Artist</label><input id="song-artist" className={inputCls} value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setF(null)} className="btn-ghost-glow">Cancel</button>
              <button disabled={busy} className="btn-glow">{busy && <Spinner />} Save</button>
            </div>
          </form>
        )}
      </Card>

      <Card>
        {isLoading ? <Skeleton className="h-32 rounded-2xl" /> : !data?.songs.length ? <Empty text="No songs yet." /> : (
          <div className="space-y-2">
            {data.songs.map((s) => (
              <div key={s.id} className={`rounded-2xl border border-border/50 p-3 ${s.deleted_at ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-brand flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-primary-foreground">
                    {s.cover ? <img src={s.cover} alt="" className="h-full w-full object-cover" /> : <Music className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="label-premium truncate">{s.title} {s.is_welcome && <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">WELCOME</span>}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.artist || "—"}{!s.active && " · inactive"}</div>
                  </div>
                  {s.deleted_at ? (
                    <button onClick={() => action(s.id, "restore")} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Restore</button>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => action(s.id, s.is_welcome ? "unwelcome" : "welcome")} className={`${s.is_welcome ? "btn-glow" : "btn-ghost-glow"} !px-3 !py-1.5 text-xs`}><Star className="h-3.5 w-3.5" /> {s.is_welcome ? "Welcome song" : "Set as welcome"}</button>
                      <button onClick={() => setF({ id: s.id, title: s.title, artist: s.artist, file_path: s.file_path, cover_path: s.cover_path, active: s.active, sort: s.sort })} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      <button onClick={() => action(s.id, s.active ? "off" : "on")} className="btn-ghost-glow !px-3 !py-1.5 text-xs">{s.active ? "Deactivate" : "Activate"}</button>
                      <button aria-label="Delete song" onClick={() => confirm("Move this song to trash?") && action(s.id, "delete")} className="btn-ghost-glow !px-3 !py-1.5 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
                {s.url && !s.deleted_at && <audio controls preload="none" src={s.url} className="mt-2 h-9 w-full" />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
