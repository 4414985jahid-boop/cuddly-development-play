import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Signed URL for a file in a private bucket (cached ~50 min). Full http(s) URLs pass through. */
export function useStorageUrl(bucket: "avatars" | "logos", path?: string | null) {
  const { data } = useQuery({
    queryKey: ["signed", bucket, path],
    enabled: !!path && !/^https?:/.test(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (path && /^https?:/.test(path)) return path;
  return data ?? null;
}
