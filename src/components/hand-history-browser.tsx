"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { HoleCardsStrip } from "@/components/hole-cards-strip";
import { useAuth } from "@/components/auth-provider";
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

function getStreetLabel(item: SavedHandUpload) {
  const allinHand = getAllInHandRecord(item);

  if (!allinHand) {
    return item.manualReplay?.finalState.street || "Preflop";
  }

  if (allinHand.streets.river?.card) {
    return "River";
  }

  if (allinHand.streets.turn?.card) {
    return "Turn";
  }

  if (allinHand.streets.flop?.board?.length) {
    return "Flop";
  }

  return "Preflop";
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
    <main className="px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppNavigation />

        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Hand History
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Review past hands and jump back into replay.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/hand-review" className="btn-secondary">
                New Replay
              </Link>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="btn-secondary"
              >
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
              (() => {
                const allinHand = getAllInHandRecord(item);
                const heroPlayer = allinHand?.setup.players.find(
                  (player) => player.seat === allinHand.setup.heroSeat,
                );
                const heroHoleCards = heroPlayer?.hole;
                const potBb =
                  allinHand?.result.pots[0]?.sizeBb ?? item.manualReplay?.finalState.potBb ?? 0;

                return (
                  <article
                    key={item.id}
                    className="panel rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {formatUploadTime(item.createdAtMs)}
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          {(allinHand?.setup.heroSeat || item.hero.position || "Hero")} · {getStreetLabel(item)} · Pot: {potBb}bb
                        </p>
                        {item.analysis ? (
                          <p className="mt-3 text-sm leading-6 text-white/65 line-clamp-2">
                            {item.analysis.summary}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-[12px] border border-white/8 bg-white/[0.03] px-2 py-2">
                        {heroHoleCards ? (
                          <HoleCardsStrip
                            first={heroHoleCards.first}
                            second={heroHoleCards.second}
                            size="medium"
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs text-white/50">
                        {allinHand?.setup.players.length ?? item.manualSetup?.opponents.length ? `${allinHand?.setup.players.length ?? ((item.manualSetup?.opponents.length || 0) + 1)} players` : uploadSourceLabels[item.source]}
                      </div>
                      <Link
                        href={`/hand-review?handId=${item.id}`}
                        className={item.analysis ? "btn-secondary" : "btn-primary"}
                      >
                        {item.analysis ? "View Analysis" : "Analyze"}
                      </Link>
                    </div>
                  </article>
                );
              })()
            ))
          )}
        </section>
      </div>
    </main>
  );
}
