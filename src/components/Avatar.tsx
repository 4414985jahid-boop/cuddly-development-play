import { useStorageUrl } from "@/lib/storage-url";

export function initials(name?: string | null) {
  const p = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "U") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ path, name, className = "h-10 w-10", previewUrl }: { path?: string | null | undefined; name?: string | null | undefined; className?: string; previewUrl?: string | null }) {
  const url = useStorageUrl("avatars", path);
  const src = previewUrl ?? url;
  return (
    <span className={`${className} bg-brand inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-primary-foreground ring-2 ring-primary/40`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="text-[0.9em]">{initials(name)}</span>}
    </span>
  );
}
