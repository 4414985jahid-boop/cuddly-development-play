import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function sign(db: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"], path?: string | null) {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const { data } = await db.storage.from("music").createSignedUrl(path, 6 * 3600);
  return data?.signedUrl ?? null;
}

/** Public: the admin-selected welcome song with short-lived playable URLs. */
export const getWelcomeSong = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: set } = await db.from("site_settings").select("music_enabled").eq("id", 1).maybeSingle();
  if (set && !set.music_enabled) return null;
  const { data: s } = await db.from("songs").select("*").eq("is_welcome", true).eq("active", true).is("deleted_at", null).maybeSingle();
  if (!s) return null;
  return { id: s.id, title: s.title, artist: s.artist, url: await sign(db, s.file_path), cover: await sign(db, s.cover_path) };
});

async function adm() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  return { s, db };
}

export const adminListSongs = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await adm();
  const [{ data: songs }, { data: set }] = await Promise.all([
    db.from("songs").select("*").order("sort").order("created_at"),
    db.from("site_settings").select("music_enabled").eq("id", 1).maybeSingle(),
  ]);
  const rows = await Promise.all((songs ?? []).map(async (x) => ({ ...x, url: await sign(db, x.file_path), cover: await sign(db, x.cover_path) })));
  return { songs: rows, enabled: set?.music_enabled ?? true };
});

export const adminSongUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await adm();
    const ext = (data.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const path = `songs/${crypto.randomUUID()}.${ext}`;
    const { data: u, error } = await db.storage.from("music").createSignedUploadUrl(path);
    if (error || !u) throw new Error("Could not prepare upload");
    return { path, token: u.token };
  });

const songInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().max(120),
  file_path: z.string().min(1).max(500),
  cover_path: z.string().max(500).nullable(),
  active: z.boolean(),
  sort: z.number().int().min(0).max(9999),
});

export const adminSaveSong = createServerFn({ method: "POST" })
  .inputValidator((d) => songInput.parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await adm();
    const { id, ...row } = data;
    if (id) {
      const { data: old } = await db.from("songs").select("*").eq("id", id).maybeSingle();
      await db.from("songs").update(row).eq("id", id);
      await s.logAdmin("song_updated", { id }, old, row);
    } else {
      const { data: n } = await db.from("songs").insert(row).select("id").single();
      await s.logAdmin("song_added", { id: n?.id }, null, row);
    }
    return { ok: true };
  });

export const adminSongAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["welcome", "unwelcome", "delete", "restore", "on", "off"]) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await adm();
    const { data: old } = await db.from("songs").select("*").eq("id", data.id).maybeSingle();
    if (!old) throw new Error("Not found");
    if (data.action === "welcome") {
      await db.from("songs").update({ is_welcome: false }).eq("is_welcome", true);
      await db.from("songs").update({ is_welcome: true, active: true }).eq("id", data.id);
    } else if (data.action === "unwelcome") await db.from("songs").update({ is_welcome: false }).eq("id", data.id);
    else if (data.action === "delete") await db.from("songs").update({ deleted_at: new Date().toISOString(), is_welcome: false }).eq("id", data.id);
    else if (data.action === "restore") await db.from("songs").update({ deleted_at: null }).eq("id", data.id);
    else await db.from("songs").update({ active: data.action === "on" }).eq("id", data.id);
    await s.logAdmin("song_" + data.action, { id: data.id, title: old.title });
    return { ok: true };
  });

export const adminSetMusicEnabled = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await adm();
    await db.from("site_settings").update({ music_enabled: data.enabled }).eq("id", 1);
    await s.logAdmin("music_enabled_changed", {}, null, { enabled: data.enabled });
    return { ok: true };
  });
