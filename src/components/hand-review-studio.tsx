"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HandUploadRecordCard } from "@/components/hand-upload-record-card";
import { AuthButton } from "@/components/auth-button";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import {
  MAX_MANUAL_TEXT_LENGTH,
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

export function HandReviewStudio() {
  const { user, getIdToken } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [viewerId, setViewerId] = useState("");
  const [activeSource, setActiveSource] = useState<UploadSource>("manual");
  const [manualText, setManualText] = useState("");
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

  const manualCountText = useMemo(
    () => `${manualText.length} / ${MAX_MANUAL_TEXT_LENGTH}`,
    [manualText.length],
  );
  const premiumRequired = activeSource === "voice" || activeSource === "screenshot";
  const premiumLocked = premiumRequired && !subscription.premium;

  const refreshHistory = useCallback(async (currentViewerId: string) => {
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
      setHistoryMessage("Unable to load recent uploads right now.");
    }
  }, [getIdToken]);

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
    if (!viewerId) {
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
          handText: manualText,
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
      setManualText("");
      setNotice("Manual hand saved. AI analysis stays optional.");
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

        <section className="panel panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="home-felt absolute inset-x-[12%] top-[-22%] hidden h-[360px] rounded-[999px] lg:block" />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--gold-soft)]">
                <span>♠</span>
                <span>Hand Upload Studio</span>
              </span>
              <div className="space-y-4">
                <h1 className="font-heading text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                  Upload A Real Hand
                  <span className="mt-2 block text-[var(--gold-soft)]">
                    In Three Different Ways
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  This is the web hand lab adapted from All In. Manual upload
                  stays free, while voice, screenshot, and deep AI analysis sit
                  behind the premium layer you can wire to Creem later.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span>♣ Free manual save</span>
                <span>♥ Premium voice + screenshot AI</span>
                <span>♦ Firebase-backed history</span>
              </div>
            </div>

            <div className="panel rounded-[28px] border border-[var(--border-strong)] bg-black/15 p-5 sm:p-6">
              <p className="text-[0.7rem] uppercase tracking-[0.26em] text-[var(--gold-soft)]">
                What Gets Saved
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/86">
                <p>1. The original note, transcript, or screenshot extraction.</p>
                <p>2. A saved hand record you can reopen later.</p>
                <p>3. AI analysis only when you explicitly run it.</p>
                <p>4. Audio or image files in Firebase Storage when used.</p>
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                Setup note: manual save only needs Firebase. AI features need
                `OPENAI_API_KEY` plus Firebase Admin env vars on the server.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <section className="panel p-5 sm:p-6">
              <div className="flex flex-wrap gap-3">
                {(["manual", "voice", "screenshot"] as UploadSource[]).map(
                  (source) => {
                    const isActive = source === activeSource;

                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => {
                          resetMessages();
                          setActiveSource(source);
                        }}
                        className={`rounded-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                          isActive
                            ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-[var(--gold-soft)]"
                            : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]"
                        }`}
                      >
                        {uploadSourceLabels[source]}
                      </button>
                    );
                  },
                )}
              </div>

              {activeSource === "manual" ? (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      Manual Upload
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Paste a hand history or a rough note from the table. This
                      saves for free without calling the AI API.
                    </p>
                  </div>

                  <label className="block">
                    <textarea
                      value={manualText}
                      onChange={(event) => setManualText(event.target.value)}
                      placeholder="Example: Hero opens CO with As Kh to 2.5bb, BTN calls, flop Kd 8s 3c..."
                      className="min-h-[220px] w-full rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/32 focus:border-[var(--border-strong)] focus:bg-white/[0.05]"
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[var(--muted)]">
                      {manualCountText}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleManualSubmit()}
                      disabled={busySource === "manual" || manualText.trim().length === 0}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {busySource === "manual" ? "Saving..." : "Save Manual Hand"}
                    </button>
                  </div>
                </div>
              ) : null}

              {activeSource === "voice" ? (
                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      Voice Upload
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Record the hand in your own words, or upload an audio file
                      if you already have one.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    {premiumLocked ? (
                      <div className="mb-5 rounded-[20px] border border-[var(--border-strong)] bg-[rgba(214,178,93,0.08)] p-4">
                        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                          Premium Required
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/86">
                          Voice upload is part of the premium AI toolkit. Sign in
                          now so we can attach this to your account, then later
                          we can wire Creem into the same entitlement.
                        </p>
                      </div>
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
                            : "Use the microphone or upload a saved audio note."}
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
                          <audio
                            controls
                            src={audioPreviewUrl}
                            className="mt-4 w-full"
                          />
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleAudioSubmit()}
                        disabled={
                          busySource === "voice" || !selectedAudio || premiumLocked
                        }
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
                      Screenshot Upload
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Upload a poker screenshot. GPT will extract what it can,
                      clean it up, and store the result in Firebase.
                    </p>
                  </div>

                  {premiumLocked ? (
                    <div className="rounded-[20px] border border-[var(--border-strong)] bg-[rgba(214,178,93,0.08)] p-4">
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                        Premium Required
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/86">
                        Screenshot recognition is a premium AI feature. The
                        free plan still includes manual upload, bankroll
                        tracking, and the poker luck tool.
                      </p>
                    </div>
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
                        <span className="text-5xl text-[var(--gold-soft)]">
                          ⌘
                        </span>
                        <p className="mt-4 text-base font-semibold text-white">
                          Tap to choose a screenshot
                        </p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                          JPG, PNG, and HEIC screenshots work well as long as
                          the hand action is visible.
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
                      disabled={
                        busySource === "screenshot" ||
                        !selectedImage ||
                        premiumLocked
                      }
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {busySource === "screenshot" ? "Reading Image..." : "Read & Save"}
                    </button>
                  </div>
                </div>
              ) : null}
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

            {!subscriptionLoading ? (
              <section className="panel p-4 sm:p-5">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                  Access Plan
                </p>
                <p className="mt-2 text-sm leading-6 text-white/86">
                  {subscription.premium
                    ? "Premium access is active for AI upload features."
                    : "Free access includes manual upload, bankroll tracking, and luck reading. Voice, screenshot, and AI analysis are reserved for premium."}
                </p>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            <section className="panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-2xl text-white">Latest Read</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Your newest parsed hand shows up here immediately after save.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {latestItem ? (
                  <HandUploadRecordCard
                    item={latestItem}
                    actions={
                      <>
                        <Link
                          href={`/history/${latestItem.id}`}
                          className="btn-secondary"
                        >
                          Open Detail
                        </Link>
                        {!latestItem.analysis ? (
                          <button
                            type="button"
                            onClick={() => void handleAnalyzeItem(latestItem.id)}
                            disabled={
                              Boolean(analyzingItemId) ||
                              !subscription.premium
                            }
                            className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {analyzingItemId === latestItem.id
                              ? "Analyzing..."
                              : "Analyze Hand"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void handleAnalyzeItem(latestItem.id, true)
                            }
                            disabled={
                              Boolean(analyzingItemId) ||
                              !subscription.premium
                            }
                            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {analyzingItemId === latestItem.id
                              ? "Refreshing..."
                              : "Refresh Analysis"}
                          </button>
                        )}
                      </>
                    }
                  />
                ) : (
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-[var(--muted)]">
                    Nothing saved yet. Start with a manual note, a quick voice
                    memo, or a screenshot from the table.
                  </div>
                )}
              </div>
            </section>

            <section className="panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-2xl text-white">
                    Recent Uploads
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Stored in Firebase for this browser or Google account.
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
                  Firebase Admin env vars are still missing, so saved history is
                  not available yet.
                </div>
              ) : historyItems.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-[var(--muted)]">
                  No uploads saved for this viewer yet.
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
                          <p className="text-sm font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                            {uploadSourceLabels[item.source]} •{" "}
                            {formatUploadTime(item.createdAtMs)}
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
    </main>
  );
}
