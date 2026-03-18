"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { useAuth } from "@/components/auth-provider";
import { uploadSourceLabels, type SavedHandUpload } from "@/lib/hand-upload-types";

const VIEWER_ID_STORAGE_KEY = "poker-luck-index-viewer-id";

function createViewerId() {
  return `viewer-${crypto.randomUUID()}`;
}

function getOrCreateViewerId() {
  const existing = window.localStorage.getItem(VIEWER_ID_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const nextId = createViewerId();
  window.localStorage.setItem(VIEWER_ID_STORAGE_KEY, nextId);
  return nextId;
}

function formatUploadTime(timestamp: number) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

export function HandHistoryBrowser() {
  const { user, getIdToken } = useAuth();
  const [viewerId, setViewerId] = useState("");
  const [items, setItems] = useState<SavedHandUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setViewerId(user?.uid || getOrCreateViewerId());
  }, [user?.uid]);

  const loadHistory = useCallback(async () => {
    if (!viewerId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const idToken = await getIdToken();
      const response = await fetch(
        `/api/hand-uploads?viewerId=${encodeURIComponent(viewerId)}&limit=60`,
        {
          headers: idToken
            ? {
                Authorization: `Bearer ${idToken}`,
              }
            : undefined,
        },
      );
      const data = (await response.json()) as {
        items?: SavedHandUpload[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Unable to load hand history.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load hand history.",
      );
    } finally {
      setLoading(false);
    }
  }, [getIdToken, viewerId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)] transition hover:text-white"
          >
            <span>←</span>
            <span>Back Home</span>
          </Link>
          <AuthButton />
        </div>

        <section className="panel panel-strong p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--gold-soft)]">
                <span>♠</span>
                <span>Hand History</span>
              </span>
              <div>
                <h1 className="font-heading text-4xl leading-tight text-white sm:text-5xl">
                  Review Saved Hands
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
                  Reopen any manual note, voice upload, or screenshot parse.
                  Premium AI analysis stays attached to the record once it is
                  generated.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/hand-review" className="btn-secondary">
                Upload Another Hand
              </Link>
              <button type="button" onClick={() => void loadHistory()} className="btn-secondary">
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="panel p-4 sm:p-5">
            <p className="text-sm leading-6 text-[#ffb2bc]">{error}</p>
          </section>
        ) : null}

        <section className="space-y-4">
          {loading ? (
            <div className="panel p-5 text-sm leading-7 text-[var(--muted)]">
              Loading hand history...
            </div>
          ) : items.length === 0 ? (
            <div className="panel p-5 text-sm leading-7 text-[var(--muted)]">
              No saved hands yet. Your uploads from the hand studio will show up
              here.
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="panel rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1 text-[0.66rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                        {uploadSourceLabels[item.source]}
                      </span>
                      {item.analysis ? (
                        <span className="rounded-full border border-[#d8f3b1]/30 bg-[#d8f3b1]/10 px-3 py-1 text-[0.66rem] uppercase tracking-[0.2em] text-[#d8f3b1]">
                          AI analyzed
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className="font-heading text-2xl text-white">
                        {item.title}
                      </p>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                        {item.quickSummary}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                      {formatUploadTime(item.createdAtMs)} • {item.confidence} confidence
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/history/${item.id}`} className="btn-primary">
                      Open Hand
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
