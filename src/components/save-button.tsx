"use client";
import { usePathname, useRouter } from "next/navigation";
import { useSaved } from "./saved-provider";
import { savedSignInUrl } from "@/lib/saved-policy";
export function SaveButton({ festivalId, name, compact = false }: { festivalId: string; name: string; compact?: boolean }) {
  const { user, authLoading, ready, entries, busyId, error, refresh, setSaved } = useSaved();
  const pathname = usePathname(), router = useRouter();
  const saved = entries.some(entry => entry.festivalId === festivalId);
  const waiting = authLoading || (!!user && !ready && !error);
  return <button type="button" className={`save-button ${compact ? "save-compact" : ""} ${saved ? "is-saved" : ""}`} aria-pressed={saved} aria-label={user && !ready && error ? "Retry loading saved festivals" : `${saved ? "Unsave" : "Save"} ${name}`} title={user && !ready && error ? error : `${saved ? "Unsave" : "Save"} ${name}`} disabled={waiting || !!busyId}
    onClick={() => {
      if (!user) { router.push(savedSignInUrl(festivalId, pathname + window.location.search)); return; }
      if (!ready) { refresh(); return; }
      void setSaved(festivalId, !saved);
    }}>
    <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true"><path d="M4 2h10v16l-5-3-5 3Z" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
    {!compact && <span>{busyId === festivalId ? (saved ? "Removing…" : "Saving…") : user && !ready && error ? "Retry saved list" : saved ? "Saved ✓" : "Save festival"}</span>}
  </button>;
}
