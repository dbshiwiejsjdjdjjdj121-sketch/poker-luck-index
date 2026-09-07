"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { observeFirebaseUser } from "@/lib/firebase-client";
import type { SavedFestival } from "@/lib/saved-policy";

type SavedContextValue = {
  user: User | null; authLoading: boolean; ready: boolean; entries: SavedFestival[]; error: string;
  busyId: string | null; refresh: () => void; setSaved: (id: string, saved: boolean) => Promise<boolean>;
};
const SavedContext = createContext<SavedContextValue | null>(null);
export function useSaved() { const value = useContext(SavedContext); if (!value) throw new Error("SavedProvider is missing"); return value; }
export function SavedProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<SavedFestival[]>([]), [ready, setReady] = useState(false), [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; undoId?: string } | null>(null);
  const currentUser = useRef<User | null>(null), revision = useRef(0), writing = useRef(false), lastRead = useRef(0);
  const refresh = useCallback(async () => {
    const active = currentUser.current;
    if (!active || writing.current) return;
    const requestRevision = ++revision.current;
    try {
      const token = await active.getIdToken();
      const response = await fetch("/api/saved", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (revision.current !== requestRevision || currentUser.current?.uid !== active.uid) return;
      setEntries(data.entries); setReady(true); setError(""); lastRead.current = Date.now();
    } catch (cause) {
      if (revision.current === requestRevision && currentUser.current?.uid === active.uid) setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Could not load saved festivals. Please try again.");
    }
  }, []);
  useEffect(() => {
    try {
      return observeFirebaseUser(active => {
        revision.current++; currentUser.current = active; writing.current = false;
        setUser(active); setAuthLoading(false); setEntries([]); setReady(false); setError(""); setBusyId(null); setNotice(null);
        if (active) void refresh();
      });
    } catch {
      // A public page must remain usable if the authentication provider is unavailable.
      setAuthLoading(false); setError("Sign-in is temporarily unavailable. You can still browse every festival.");
    }
  }, [refresh]);
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible" && Date.now() - lastRead.current > 15000) void refresh(); };
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update);
    return () => { window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, [refresh]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 8000); return () => clearTimeout(timer); }, [notice]);
  const setSaved = useCallback(async (id: string, saved: boolean) => {
    const active = currentUser.current;
    if (!active || writing.current) return false;
    writing.current = true; const requestRevision = ++revision.current;
    setBusyId(id); setError(""); setNotice(null);
    try {
      const token = await active.getIdToken();
      const response = await fetch(`/api/saved/${encodeURIComponent(id)}`, { method: saved ? "PUT" : "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (revision.current !== requestRevision || currentUser.current?.uid !== active.uid) return false;
      setEntries(data.entries); setReady(true); lastRead.current = Date.now();
      setNotice(saved ? { text: "Festival saved. Available on your signed-in devices." } : { text: "Festival removed from your saved list.", undoId: id });
      return true;
    } catch (cause) {
      if (currentUser.current?.uid === active.uid) {
        const text = cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Could not update your saved festivals. Please refresh to check and try again.";
        setError(text); setNotice({ text });
      }
      return false;
    } finally {
      if (revision.current === requestRevision) { writing.current = false; setBusyId(null); }
    }
  }, []);
  return <SavedContext.Provider value={{ user, authLoading, ready, entries, error, busyId, refresh: () => void refresh(), setSaved }}>
    {children}
    {notice && <div className="saved-toast" role="status"><span>{notice.text}</span>{notice.undoId && <button disabled={!!busyId} onClick={() => void setSaved(notice.undoId!, true)}>Undo</button>}<button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
  </SavedContext.Provider>;
}
