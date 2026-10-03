import { useEffect } from "react";
import { trackVisit } from "@/lib/admin-dashboard.functions";

export function VisitTracker() {
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem("visit_day") === today) return;
      let v = localStorage.getItem("visitor_id");
      if (!v) { v = crypto.randomUUID(); localStorage.setItem("visitor_id", v); }
      localStorage.setItem("visit_day", today);
      trackVisit({ data: { v } }).catch(() => {});
    } catch { /* ignore */ }
  }, []);
  return null;
}
