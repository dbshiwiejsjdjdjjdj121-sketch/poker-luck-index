"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HandAnalysisCard } from "@/components/hand-analysis-card";
import { HoleCardsStrip } from "@/components/hole-cards-strip";
import { ManualReplayViewer } from "@/components/manual-replay-viewer";
import { PremiumActionGateModal } from "@/components/premium-action-gate-modal";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import { getAllInHandRecord } from "@/lib/allin-hand-record";
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
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatStreet(item: SavedHandUpload) {
  const hand = getAllInHandRecord(item);

  if (!hand) {
    return item.manualReplay?.finalState.street || "Preflop";
  }

  if (hand.streets.river?.card) {
    return "River";
  }

  if (hand.streets.turn?.card) {
    return "Turn";
  }

  if (hand.streets.flop?.board?.length) {
    return "Flop";
  }

  return "Preflop";
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

export function SavedHandReplayPanel({
  handId,
  onDeleted,
}: {
  handId: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { subscription } = useSubscription();
  const [viewerId, setViewerId] = useState("");
  const [item, setItem] = useState<SavedHandUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"analyze" | "refresh" | "delete" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [gateOpen, setGateOpen] = useState(false);

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

    if (!user || !subscription.premium) {
      setGateOpen(true);
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
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete this hand.");
      }

      onDeleted?.();
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

  if (loading) {
    return (
      <section className="panel p-5 text-sm leading-7 text-[var(--muted)]">
        Loading hand...
      </section>
    );
  }

  if (!item) {
    return (
      <section className="panel p-5 text-sm leading-7 text-[#ffb2bc]">
        {error || "This hand could not be found."}
      </section>
    );
  }

  const allinHand = getAllInHandRecord(item);
  const heroPlayer = allinHand?.setup.players.find(
    (player) => player.seat === allinHand.setup.heroSeat,
  );
  const heroHoleCards = heroPlayer?.hole;
  const potBb =
    allinHand?.result.pots[0]?.sizeBb ?? item.manualReplay?.finalState.potBb ?? 0;

  return (
    <>
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

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.66rem] uppercase tracking-[0.18em] text-white/60">
                {uploadSourceLabels[item.source]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.66rem] uppercase tracking-[0.18em] text-white/60">
                {formatUploadTime(item.createdAtMs)}
              </span>
            </div>

            <h2 className="mt-4 text-3xl font-semibold text-white">
              {allinHand?.setup.heroSeat || item.hero.position || "Hero"} · {formatStreet(item)} · Pot {potBb}bb
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {item.analysis?.summary || item.quickSummary}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {heroHoleCards ? (
              <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <HoleCardsStrip
                  first={heroHoleCards.first}
                  second={heroHoleCards.second}
                  size="large"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {!item.analysis ? (
                <button
                  type="button"
                  onClick={() => void handleAnalyze(false)}
                  disabled={busy !== ""}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busy === "analyze" ? "Analyzing..." : "Analyze"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleAnalyze(true)}
                  disabled={busy !== ""}
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busy === "refresh" ? "Refreshing..." : "Refresh Analysis"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy !== ""}
                className="rounded-full border border-[#ff8998]/30 bg-[#ff8998]/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb2bc] transition hover:bg-[#ff8998]/18 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy === "delete" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-white/48">
          <span>{allinHand?.setup.players.length ?? ((item.manualSetup?.opponents.length || 0) + 1)} players</span>
          <span>{item.confidence} confidence</span>
          {item.media ? <span>{formatFileSize(item.media.bytes)}</span> : null}
          {item.media?.originalName ? <span>{item.media.originalName}</span> : null}
        </div>
      </section>

      {item.analysis ? <HandAnalysisCard analysis={item.analysis} /> : null}

      {item.manualSetup && item.manualReplay ? (
        <ManualReplayViewer setup={item.manualSetup} replay={item.manualReplay} />
      ) : (
        <section className="panel p-5 sm:p-6">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
            Saved Hand Text
          </p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/84">
            {item.normalizedHandText}
          </p>
        </section>
      )}

      <PremiumActionGateModal
        open={gateOpen}
        action="analysis"
        onClose={() => setGateOpen(false)}
      />
    </>
  );
}
