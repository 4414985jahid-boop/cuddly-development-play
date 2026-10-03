import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/ui-kit";

/** Square centre-crop + resize to max 512×512 WEBP. */
async function cropSquare(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const out = Math.min(512, side);
  const c = document.createElement("canvas");
  c.width = out; c.height = out;
  c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85));
}

export function AvatarEditor() {
  const { user, profile, refreshProfile } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast.error("Use a JPG, PNG or WEBP image"); return; }
    if (f.size > 3 * 1024 * 1024) { toast.error("Image must be under 3 MB"); return; }
    try {
      const b = await cropSquare(f);
      setBlob(b); setPreview(URL.createObjectURL(b));
    } catch { toast.error("Could not read that image"); }
  };

  const cancel = () => { setBlob(null); setPreview(null); if (input.current) input.current.value = ""; };

  const save = async () => {
    if (!blob || !user) return;
    setBusy(true);
    const old = profile?.avatar_url;
    const path = `${user.id}/${crypto.randomUUID()}.webp`;
    const up = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/webp" });
    if (up.error) { setBusy(false); toast.error("Upload failed — your old photo is kept"); return; }
    const { error } = await supabase.rpc("set_my_avatar", { _path: path });
    if (error) { await supabase.storage.from("avatars").remove([path]); setBusy(false); toast.error("Could not save photo"); return; }
    if (old) await supabase.storage.from("avatars").remove([old]);
    await refreshProfile();
    setBusy(false); cancel();
    toast.success("Profile photo updated");
  };

  const remove = async () => {
    if (!profile?.avatar_url) return;
    setBusy(true);
    const old = profile.avatar_url;
    const { error } = await supabase.rpc("set_my_avatar", { _path: null as unknown as string });
    if (error) { setBusy(false); toast.error("Could not remove photo"); return; }
    await supabase.storage.from("avatars").remove([old]);
    await refreshProfile();
    setBusy(false);
    toast.success("Photo removed");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={() => input.current?.click()} className="relative" aria-label="Change profile photo">
        <Avatar path={profile?.avatar_url} name={profile?.full_name} previewUrl={preview} className="h-28 w-28 text-3xl" />
        <span className="bg-brand absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground shadow-glow ring-2 ring-background">
          <Camera className="h-4 w-4" />
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {blob ? (
        <div className="flex gap-2">
          <button onClick={cancel} disabled={busy} className="btn-ghost-glow !px-4 !py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-glow !px-4 !py-2 text-sm">{busy && <Spinner />} Save</button>
        </div>
      ) : profile?.avatar_url ? (
        <button onClick={remove} disabled={busy} className="flex items-center gap-1 text-sm text-destructive hover:underline">
          {busy ? <Spinner /> : <Trash2 className="h-4 w-4" />} Remove photo
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">Tap the photo to take or choose a picture</p>
      )}
    </div>
  );
}
