"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { HandUploadRecordCard } from "@/components/hand-upload-record-card";
import { ManualHandWizard } from "@/components/manual-hand-wizard";
import { SubscriptionCta } from "@/components/subscription-cta";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import {
  type ManualHandSetup,
  uploadSourceLabels,
  type SavedHandUpload,
  type UploadSource,
} from "@/lib/hand-upload-types";

const VIEWER_ID_STORAGE_KEY = "poker-luck-index-viewer-id";

function formatUploadTime(timestamp: number) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

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

function summarizeSetup(setup: ManualHandSetup | null) {
  if (!setup) {
    return "No hand setup saved yet.";
  }

  return `${setup.hero.name} in ${setup.hero.seat} with ${setup.hero.holeCards.first} ${setup.hero.holeCards.second} against ${setup.opponents.length} opponent${setup.opponents.length === 1 ? "" : "s"}.`;
}

function formatCards(first: string, second: string, unknown?: boolean) {
  if (unknown || first === "Unknown" || second === "Unknown") {
    return "Unknown cards";
  }

  return `${first} ${second}`;
}

export function HandReviewStudio() {
  const { user, getIdToken } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [viewerId, setViewerId] = useState("");
  const [activeSource, setActiveSource] = useState<UploadSource>("manual");
  const [busySource, setBusySource] = useState<UploadSource | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyConfigured, setHistoryConfigured] = useState(true);
  const [historyItems, setHistoryItems] = useState<SavedHandUpload[]>([]);
  const [latestItem, setLatestItem] = useState<SavedHandUpload | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [analyzingItemId, setAnalyzingItemId] = useState("");
  const [isRecordingSupported, setIsRecordingSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [manualWizardVisible, setManualWizardVisible] = useState(false);
  const [manualSetup, setManualSetup] = useState<ManualHandSetup | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const localViewerId = getOrCreateViewerId();
    setViewerId(user?.uid || localViewerId);
    setIsRecordingSupported(
      typeof window !== "undefined" &&
        Boolean(window.MediaRecorder && navigator.mediaDevices),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }

      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioPreviewUrl, imagePreviewUrl]);

  const premiumRequired = activeSource === "voice" || activeSource === "screenshot";
  const premiumLocked = premiumRequired && !subscription.premium;

  const refreshHistory = useCallback(
    async (currentViewerId: string) => {
      try {
        const idToken = await getIdToken();
        const response = await fetch(
          `/api/hand-uploads?viewerId=${encodeURIComponent(currentViewerId)}`,
          {
            headers: idToken
              ? {
                  Authorization: `Bearer ${idToken}`,
                }
              : undefined,
          },
        );
        const data = (await response.json()) as {
          configured?: boolean;
          items?: SavedHandUpload[];
          message?: string;
        };
        const items = Array.isArray(data.items) ? data.items : [];

        setHistoryConfigured(data.configured !== false);
        setHistoryItems(items);
        setLatestItem((current) => {
          if (!items.length) {
            return current;
          }

          if (!current) {
            return items[0] ?? null;
          }

          return items.find((entry) => entry.id === current.id) || items[0] || current;
        });
        setHistoryMessage(data.message ?? "");
      } catch {
        setHistoryMessage("Unable to load saved hands right now.");
      }
    },
    [getIdToken],
  );

  useEffect(() => {
    if (!viewerId) {
      return;
    }

    void refreshHistory(viewerId);
  }, [refreshHistory, viewerId]);

  function upsertHistoryItem(item: SavedHandUpload) {
    setLatestItem(item);
    setHistoryItems((current) => {
      const next = [item, ...current.filter((entry) => entry.id !== item.id)];
      return next.slice(0, 12);
    });
  }

  function resetMessages() {
    setError("");
    setNotice("");
  }

  function clearImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(null);
    setImagePreviewUrl("");
  }

  function clearAudio() {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    setSelectedAudio(null);
    setAudioPreviewUrl("");
  }

  async function handleManualSubmit() {
    if (!viewerId || !manualSetup) {
      setError("Start with Manual Input and build the hand first.");
      return;
    }

    resetMessages();
    setBusySource("manual");

    try {
      const idToken = await getIdToken();
      const response = await fetch("/api/hand-uploads/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          viewerId,
          setup: manualSetup,
        }),
      });
      const data = (await response.json()) as {
        item?: SavedHandUpload;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error || "Manual upload failed.");
      }

      upsertHistoryItem(data.item);
      setNotice("Manual hand saved. You can analyze it later without rebuilding the setup.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Manual upload failed.",
      );
    } finally {
      setBusySource(null);
    }
  }

  async function handleImageSubmit() {
    if (!viewerId || !selectedImage) {
      return;
    }

    resetMessages();
    setBusySource("screenshot");

    try {
      const idToken = await getIdToken();
      const formData = new FormData();
      formData.append("viewerId", viewerId);
      formData.append("image", selectedImage);

      const response = await fetch("/api/hand-uploads/screenshot", {
        method: "POST",
        headers: idToken
          ? {
              Authorization: `Bearer ${idToken}`,
            }
          : undefined,
        body: formData,
      });
      const data = (await response.json()) as {
        item?: SavedHandUpload;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error || "Screenshot upload failed.");
      }

      upsertHistoryItem(data.item);
      clearImage();
      setNotice("Screenshot upload saved and parsed.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Screenshot upload failed.",
      );
    } finally {
      setBusySource(null);
    }
  }

  async function handleAudioSubmit() {
    if (!viewerId || !selectedAudio) {
      return;
    }

    resetMessages();
    setBusySource("voice");

    try {
      const idToken = await getIdToken();
      const formData = new FormData();
      formData.append("viewerId", viewerId);
      formData.append("audio", selectedAudio);

      const response = await fetch("/api/hand-uploads/audio", {
        method: "POST",
        headers: idToken
          ? {
              Authorization: `Bearer ${idToken}`,
            }
          : undefined,
        body: formData,
      });
      const data = (await response.json()) as {
        item?: SavedHandUpload;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error || "Voice upload failed.");
      }

      upsertHistoryItem(data.item);
      clearAudio();
      setNotice("Voice upload transcribed and saved.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Voice upload failed.",
      );
    } finally {
      setBusySource(null);
    }
  }

  async function beginRecording() {
    resetMessages();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const audioFile = new File(
          [blob],
          `voice-note-${Date.now()}.${blob.type.includes("mp4") ? "m4a" : "webm"}`,
          { type: blob.type || "audio/webm" },
        );
        const previewUrl = URL.createObjectURL(blob);

        clearAudio();
        setSelectedAudio(audioFile);
        setAudioPreviewUrl(previewUrl);
        setIsRecording(false);
        audioChunksRef.current = [];

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (recordingError) {
      setError(
        recordingError instanceof Error
          ? recordingError.message
          : "Microphone permission was denied.",
      );
      setIsRecording(false);
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      return;
    }

    recorder.stop();
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearImage();
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleAudioFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearAudio();
    setSelectedAudio(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
  }

  async function handleAnalyzeItem(itemId: string, force = false) {
    if (!viewerId) {
      return;
    }

    resetMessages();
    setAnalyzingItemId(itemId);

    try {
      const idToken = await getIdToken();
      const response = await fetch(`/api/hand-uploads/${itemId}/analysis`, {
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
        throw new Error(data.error || "AI analysis failed.");
      }

      upsertHistoryItem(data.item);
      setLatestItem(data.item);
      setNotice(force ? "AI analysis refreshed." : "AI analysis saved.");
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "AI analysis failed.",
      );
    } finally {
      setAnalyzingItemId("");
    }
  }

  const methodCards: Array<{
    source: UploadSource;
    title: string;
    description: string;
  }> = useMemo(
    () => [
      {
        source: "manual",
        title: "Manual Input",
        description: "Build the hand the same way All In starts it: seat, stacks, hole cards, then save.",
      },
      {
        source: "voice",
        title: "Voice Recording",
        description: "Describe the hand out loud and let the transcript create the saved replay.",
      },
      {
        source: "screenshot",
        title: "Import Image",
        description: "Upload a table screenshot and let vision parsing turn it into a saved hand.",
      },
    ],
    [],
  );

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppNavigation />

        <section className="panel panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="home-felt absolute inset-x-[10%] top-[-18%] hidden h-[360px] rounded-[999px] lg:block" />

          <div className="relative grid gap-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-end">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--gold-soft)]">
                <span>♠</span>
                <span>Hand Replay</span>
              </span>

              <div className="space-y-4">
                <h1 className="font-heading text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                  Upload A Real Hand
                  <span className="mt-2 block text-[var(--gold-soft)]">
                    The All In Way
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  Start with the same three paths as the app: Manual Input, Voice Recording, or Import Image.
                  Manual save stays free. Voice, screenshot, and AI review stay in Pro.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {methodCards.map((method) => {
                  const active = method.source === activeSource;

                  return (
                    <button
                      key={method.source}
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setActiveSource(method.source);
                      }}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        active
                          ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)]"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                        {uploadSourceLabels[method.source]}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {method.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {method.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border-strong)] bg-black/15 p-5 sm:p-6">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                Current Manual Setup
              </p>
              <p className="mt-4 text-base leading-7 text-white/88">
                {summarizeSetup(manualSetup)}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setActiveSource("manual");
                    setManualWizardVisible(true);
                  }}
                  className="btn-primary"
                >
                  {manualSetup ? "Edit Manual Input" : "Start Manual Input"}
                </button>
                <Link href="/history" className="btn-secondary">
                  Open History
                </Link>
              </div>
            </div>
          </div>
        </section>

        {(error || notice || historyMessage) && (
          <section className="panel p-4 sm:p-5">
            {error ? (
              <p className="text-sm leading-6 text-[#ffb2bc]">{error}</p>
            ) : null}
            {!error && notice ? (
              <p className="text-sm leading-6 text-[#d8f3b1]">{notice}</p>
            ) : null}
            {!error && !notice && historyMessage ? (
              <p className="text-sm leading-6 text-[var(--muted)]">
                {historyMessage}
              </p>
            ) : null}
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="space-y-6">
            <section className="panel p-5 sm:p-6">
              <div className="flex flex-wrap gap-3">
                {methodCards.map((method) => {
                  const active = method.source === activeSource;

                  return (
                    <button
                      key={method.source}
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setActiveSource(method.source);
                      }}
                      className={`rounded-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                        active
                          ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-[var(--gold-soft)]"
                          : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]"
                      }`}
                    >
                      {method.title}
                    </button>
                  );
                })}
              </div>

              {activeSource === "manual" ? (
                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      Manual Input
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Build the table first, then add the action line. This stays on the free tier and
                      saves the setup for later AI review.
                    </p>
                  </div>

                  {!manualSetup ? (
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[18px] border border-white/8 bg-black/15 p-4">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                            Step 1
                          </p>
                          <p className="mt-2 text-base font-semibold text-white">
                            Choose Hero
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            Seat, stack, and hole cards.
                          </p>
                        </div>
                        <div className="rounded-[18px] border border-white/8 bg-black/15 p-4">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                            Step 2
                          </p>
                          <p className="mt-2 text-base font-semibold text-white">
                            Add Opponents
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            Seats, stacks, and known cards.
                          </p>
                        </div>
                        <div className="rounded-[18px] border border-white/8 bg-black/15 p-4">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                            Step 3
                          </p>
                          <p className="mt-2 text-base font-semibold text-white">
                            Save Replay
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            Keep it free now, analyze later.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => setManualWizardVisible(true)}
                          className="btn-primary"
                        >
                          Start Manual Input
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                            Hero
                          </p>
                          <p className="mt-3 text-xl font-semibold text-white">
                            {manualSetup.hero.name}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            {manualSetup.hero.seat} • {manualSetup.hero.stackBb}bb •{" "}
                            {formatCards(
                              manualSetup.hero.holeCards.first,
                              manualSetup.hero.holeCards.second,
                            )}
                          </p>

                          <div className="mt-5 rounded-[18px] border border-white/8 bg-black/15 p-4">
                            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                              Button
                            </p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {manualSetup.buttonSeat}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                                Opponents
                              </p>
                              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                                Same order and seat structure as the app.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setManualWizardVisible(true)}
                              className="btn-secondary"
                            >
                              Edit Setup
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3">
                            {manualSetup.opponents.map((opponent) => (
                              <div
                                key={`${opponent.seat}-${opponent.name}`}
                                className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                              >
                                <p className="text-sm font-semibold text-white">
                                  {opponent.name}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/55">
                                  {opponent.seat} • {opponent.stackBb}bb
                                </p>
                                <p className="mt-2 text-sm text-white/82">
                                  {formatCards(
                                    opponent.holeCards.first,
                                    opponent.holeCards.second,
                                    opponent.unknownCards,
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                          Action Notes
                        </span>
                        <textarea
                          value={manualSetup.actionNotes}
                          onChange={(event) =>
                            setManualSetup((current) =>
                              current
                                ? { ...current, actionNotes: event.target.value }
                                : current,
                            )
                          }
                          placeholder="CO opens to 2.5bb, BTN calls, flop Kd 8s 3c, c-bet 30%, BTN calls..."
                          className="min-h-[180px] w-full rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/32 focus:border-[var(--border-strong)] focus:bg-white/[0.05]"
                        />
                      </label>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm leading-6 text-[var(--muted)]">
                          Save now for free, or come back later and run Pro analysis on this same hand.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleManualSubmit()}
                          disabled={busySource === "manual"}
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {busySource === "manual" ? "Saving..." : "Save Manual Hand"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {activeSource === "voice" ? (
                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      Voice Recording
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Describe the hand out loud. The saved replay will be created from the transcript.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    {premiumLocked ? (
                      <SubscriptionCta
                        className="mb-5"
                        compact
                        title="Premium Required"
                        description="Voice Recording is part of Pro because transcription uses the API."
                      />
                    ) : null}

                    <div className="flex flex-wrap items-center gap-4">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          disabled={premiumLocked}
                          className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[rgba(143,29,45,0.3)] text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:scale-[1.02]"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void beginRecording()}
                          disabled={!isRecordingSupported || premiumLocked}
                          className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-sm font-semibold uppercase tracking-[0.16em] text-[var(--gold-soft)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Record
                        </button>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm leading-6 text-white">
                          {isRecording
                            ? `Recording... ${recordingSeconds}s`
                            : "Record a fresh memo or upload an existing audio note."}
                        </p>
                        <button
                          type="button"
                          onClick={() => audioInputRef.current?.click()}
                          disabled={premiumLocked}
                          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Choose Audio File
                        </button>
                        <input
                          ref={audioInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {selectedAudio ? (
                      <div className="mt-5 rounded-[20px] border border-white/8 bg-black/15 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {selectedAudio.name}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {(selectedAudio.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={clearAudio}
                            className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] transition hover:text-white"
                          >
                            Clear
                          </button>
                        </div>
                        {audioPreviewUrl ? (
                          <audio controls src={audioPreviewUrl} className="mt-4 w-full" />
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleAudioSubmit()}
                        disabled={busySource === "voice" || !selectedAudio || premiumLocked}
                        className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {busySource === "voice" ? "Transcribing..." : "Transcribe & Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSource === "screenshot" ? (
                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      Import Image
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Upload a screenshot from the table and turn it into a saved replay.
                    </p>
                  </div>

                  {premiumLocked ? (
                    <SubscriptionCta
                      compact
                      title="Premium Required"
                      description="Import Image is part of Pro because screenshot parsing uses the vision API."
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={premiumLocked}
                    className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-white/[0.03] px-6 py-10 text-center transition hover:bg-white/[0.05]"
                  >
                    {imagePreviewUrl ? (
                      <Image
                        src={imagePreviewUrl}
                        alt="Selected poker screenshot preview"
                        width={920}
                        height={620}
                        unoptimized
                        className="max-h-[260px] w-auto rounded-[20px] border border-white/8 object-contain shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                      />
                    ) : (
                      <>
                        <span className="text-5xl text-[var(--gold-soft)]">⌘</span>
                        <p className="mt-4 text-base font-semibold text-white">
                          Tap to choose a screenshot
                        </p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                          JPG, PNG, and HEIC screenshots work best when the action line is visible.
                        </p>
                      </>
                    )}
                  </button>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {selectedImage ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/15 p-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {selectedImage.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] transition hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleImageSubmit()}
                      disabled={busySource === "screenshot" || !selectedImage || premiumLocked}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {busySource === "screenshot" ? "Reading Image..." : "Read & Save"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            {!subscriptionLoading ? (
              <section className="panel p-4 sm:p-5">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                  Access Plan
                </p>
                {subscription.premium ? (
                  <p className="mt-2 text-sm leading-6 text-white/86">
                    Pro is active. Voice Recording, Import Image, and AI hand analysis are unlocked.
                  </p>
                ) : (
                  <div className="mt-3">
                    <SubscriptionCta
                      title="Free + Pro Access"
                      description="Manual Input, bankroll tracking, and luck reading stay free. Upgrade only for the API-powered tools."
                    />
                  </div>
                )}
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            <section className="panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-2xl text-white">Latest Replay</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    The newest saved hand appears here right after upload.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {latestItem ? (
                  <HandUploadRecordCard
                    item={latestItem}
                    actions={
                      <>
                        <Link href={`/history/${latestItem.id}`} className="btn-secondary">
                          Open Detail
                        </Link>
                        {!latestItem.analysis ? (
                          <button
                            type="button"
                            onClick={() => void handleAnalyzeItem(latestItem.id)}
                            disabled={Boolean(analyzingItemId) || !subscription.premium}
                            className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {analyzingItemId === latestItem.id ? "Analyzing..." : "Analyze Hand"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleAnalyzeItem(latestItem.id, true)}
                            disabled={Boolean(analyzingItemId) || !subscription.premium}
                            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {analyzingItemId === latestItem.id ? "Refreshing..." : "Refresh Analysis"}
                          </button>
                        )}
                      </>
                    }
                  />
                ) : (
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-[var(--muted)]">
                    Start with Manual Input, a voice memo, or a screenshot from the table. The saved hand will show up here.
                  </div>
                )}
              </div>
            </section>

            <section className="panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-2xl text-white">Recent History</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Saved hands for this browser or signed-in account.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/history" className="btn-secondary">
                    Full History
                  </Link>
                  <button
                    type="button"
                    onClick={() => void refreshHistory(viewerId)}
                    className="btn-secondary"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {!historyConfigured ? (
                <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-[var(--muted)]">
                  Saved history is temporarily unavailable.
                </div>
              ) : historyItems.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-[var(--muted)]">
                  No hands saved yet for this viewer.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {historyItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLatestItem(item)}
                      className="w-full rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                            {uploadSourceLabels[item.source]} • {formatUploadTime(item.createdAtMs)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.analysis ? (
                            <span className="rounded-full border border-[#d8f3b1]/30 bg-[#d8f3b1]/10 px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-[#d8f3b1]">
                              Analyzed
                            </span>
                          ) : null}
                          <span className="text-xs uppercase tracking-[0.18em] text-white/56">
                            {item.confidence}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                        {item.quickSummary}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>

      {manualWizardVisible ? (
        <ManualHandWizard
          initialSetup={manualSetup}
          onClose={() => setManualWizardVisible(false)}
          onComplete={(setup) => {
            setManualSetup(setup);
            setNotice("Manual setup saved locally. Add action notes and press Save Manual Hand when ready.");
            setError("");
          }}
        />
      ) : null}
    </main>
  );
}
