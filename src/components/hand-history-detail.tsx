"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HandUploadRecordCard } from "@/components/hand-upload-record-card";
import { AuthButton } from "@/components/auth-button";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import { type SavedHandUpload } from "@/lib/hand-upload-types";

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

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${bytes} B`;
}

export function HandHistoryDetail({ handId }: { handId: string }) {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [viewerId, setViewerId] = useState("");
  const [item, setItem] = useState<SavedHandUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"analyze" | "delete" | "refresh" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setViewerId(user?.uid || getOrCreateViewerId());
  }, [user?.uid]);

  const loadItem = useCallback(async () => {
    if (!viewerId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const idToken = await getIdToken();
      const response = await fetch(
        `/api/hand-uploads/${handId}?viewerId=${encodeURIComponent(viewerId)}`,
        {
          headers: idToken
            ? {
                Authorization: `Bearer ${idToken}`,
              }
            : undefined,
        },
      );
      const data = (await response.json()) as {
        item?: SavedHandUpload;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error || "Unable to load this hand.");
      }

      setItem(data.item);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load this hand.",
      );
    } finally {
      setLoading(false);
    }
  }, [getIdToken, handId, viewerId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  async function handleAnalyze(force = false) {
    if (!viewerId) {
      return;
    }

    setBusy(force ? "refresh" : "analyze");
    setError("");
    setNotice("");

    try {
      const idToken = await getIdToken();
      const response = await fetch(`/api/hand-uploads/${handId}/analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          viewerId,
          force,
        }),
      });
      const data = (await response.json()) as {
        item?: SavedHandUpload;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error || "Unable to analyze this hand.");
      }

      setItem(data.item);
      setNotice(force ? "AI analysis refreshed." : "AI analysis saved.");
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Unable to analyze this hand.",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleDelete() {
    if (!viewerId) {
      return;
    }

    setBusy("delete");
    setError("");
    setNotice("");

    try {
      const idToken = await getIdToken();
      const response = await fetch(
        `/api/hand-uploads/${handId}?viewerId=${encodeURIComponent(viewerId)}`,
        {
          method: "DELETE",
          headers: idToken
            ? {
                Authorization: `Bearer ${idToken}`,
              }
            : undefined,
        },
      );
      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete this hand.");
      }

      router.push("/history");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this hand.",
      );
      setBusy("");
    }
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/history"
              className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)] transition hover:text-white"
            >
              <span>←</span>
              <span>Back History</span>
            </Link>
            <Link
              href="/hand-review"
              className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)] transition hover:text-white/80"
            >
              <span>＋</span>
              <span>New Upload</span>
            </Link>
          </div>
          <AuthButton />
        </div>

        {error ? (
          <section className="panel p-4 sm:p-5">
            <p className="text-sm leading-6 text-[#ffb2bc]">{error}</p>
          </section>
        ) : null}

        {notice ? (
          <section className="panel p-4 sm:p-5">
            <p className="text-sm leading-6 text-[#d8f3b1]">{notice}</p>
          </section>
        ) : null}

        {loading ? (
          <section className="panel p-5 text-sm leading-7 text-[var(--muted)]">
            Loading hand...
          </section>
        ) : !item ? (
          <section className="panel p-5 text-sm leading-7 text-[var(--muted)]">
            This hand could not be found.
          </section>
        ) : (
          <>
            <section className="panel panel-strong p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                    Saved Hand Detail
                  </p>
                  <h1 className="mt-3 font-heading text-4xl text-white sm:text-5xl">
                    {item.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                    Reopen the saved note, run premium analysis, or delete the
                    record if you no longer need it.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.analysis ? (
                    <button
                      type="button"
                      onClick={() => void handleAnalyze(false)}
                      disabled={busy !== "" || !subscription.premium}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {busy === "analyze" ? "Analyzing..." : "Analyze Hand"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleAnalyze(true)}
                      disabled={busy !== "" || !subscription.premium}
                      className="btn-secondary disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {busy === "refresh" ? "Refreshing..." : "Refresh Analysis"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={busy !== ""}
                    className="rounded-full border border-[#ff8998]/30 bg-[#ff8998]/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#ffb2bc] transition hover:bg-[#ff8998]/18 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {busy === "delete" ? "Deleting..." : "Delete Hand"}
                  </button>
                </div>
              </div>
            </section>

            {!subscriptionLoading && !subscription.premium ? (
              <section className="panel p-4 sm:p-5">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                  Premium Gate
                </p>
                <p className="mt-2 text-sm leading-6 text-white/86">
                  Manual save stays free. Voice upload, screenshot upload, and
                  AI hand analysis are premium-only features.
                </p>
              </section>
            ) : null}

            <HandUploadRecordCard item={item} showRawInput />

            {item.media ? (
              <section className="panel p-5 sm:p-6">
                <p className="font-heading text-2xl text-white">Attached Media</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Original File
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/88">
                      {item.media.originalName}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Content Type
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/88">
                      {item.media.contentType}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Size
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/88">
                      {formatFileSize(item.media.bytes)}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
