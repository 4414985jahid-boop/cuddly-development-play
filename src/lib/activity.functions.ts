import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Records a sign-in (full=true) or a heartbeat for "online now" (full=false). */
export const recordActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ full: z.boolean(), device: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    if (data.full) {
      const { clientIp } = await import("./admin.server");
      const { data: au } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const method = (au?.user?.app_metadata?.provider as string | undefined) ?? "email";
      await supabaseAdmin.from("sign_ins").insert({ user_id: context.userId, ip: clientIp(), device: data.device, method });
      await supabaseAdmin.from("profiles").update({ last_sign_in_at: now, last_seen_at: now, sign_in_method: method }).eq("id", context.userId);
    } else {
      await supabaseAdmin.from("profiles").update({ last_seen_at: now }).eq("id", context.userId);
    }
    return { ok: true };
  });
