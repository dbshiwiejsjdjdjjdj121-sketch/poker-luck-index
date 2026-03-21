"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { ManualReplayBuilder } from "@/components/manual-replay-builder";
import { ManualHandWizard } from "@/components/manual-hand-wizard";
import {
  PremiumActionGateModal,
  type PremiumAction,
} from "@/components/premium-action-gate-modal";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import {
  type ManualHandSetup,
  type ManualReplayData,
  uploadSourceLabels,
  type SavedHandUpload,
  type UploadSource,
} from "@/lib/hand-upload-types";

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

export function HandReviewStudio() {
  const { user, getIdToken } = useAuth();
  const { subscription } = useSubscription();
  const [viewerId, setViewerId] = useState("");
  const [activeSource, setActiveSource] = useState<UploadSource>("manual");
  const [busySource, setBusySource] = useState<UploadSource | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSavedItem, setLastSavedItem] = useState<SavedHandUpload | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [isRecordingSupported, setIsRecordingSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [manualWizardVisible, setManualWizardVisible] = useState(false);
  const [manualSetup, setManualSetup] = useState<ManualHandSetup | null>(null);
  const [gateAction, setGateAction] = useState<PremiumAction | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
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

  useEffect(() => {
    if (!gateOpen || !gateAction || !subscription.premium) {
      return;
    }

    if (gateAction === "voice" || gateAction === "screenshot") {
      setActiveSource(gateAction);
    }

    setGateOpen(false);
    setGateAction(null);
  }, [gateAction, gateOpen, subscription.premium]);

  function resetMessages() {
    setError("");
    setNotice("");
  }

  function openGate(action: PremiumAction) {
    resetMessages();
    setGateAction(action);
    setGateOpen(true);
  }

  function handleSourceSelect(source: UploadSource) {
    resetMessages();

    if (source === "manual") {
      setActiveSource("manual");
      return;
    }

    if (!user || !subscription.premium) {
      openGate(source);
      return;
    }

    setActiveSource(source);
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

  async function handleManualSubmit(payload: {
    setup: ManualHandSetup;
    replay: ManualReplayData;
  }) {
    if (!viewerId) {
      setError("Start with manual input first.");
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
          setup: payload.setup,
          replay: payload.replay,
        }),
      });
      const data = (await response.json()) as {
        item?: SavedHandUpload;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error || "Manual upload failed.");
      }

      setManualSetup(payload.setup);
      setLastSavedItem(data.item);
      setNotice("Hand saved. Open it from History when you are ready.");
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

    if (!user || !subscription.premium) {
      openGate("screenshot");
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

      setLastSavedItem(data.item);
      clearImage();
      setNotice("Screenshot saved. Open it from History when you are ready.");
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

    if (!user || !subscription.premium) {
      openGate("voice");
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

      setLastSavedItem(data.item);
      clearAudio();
      setNotice("Voice upload saved. Open it from History when you are ready.");
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
    if (!user || !subscription.premium) {
      openGate("voice");
      return;
    }

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

  const methodCards: Array<{
    source: UploadSource;
    title: string;
    description: string;
  }> = useMemo(
    () => [
      {
        source: "manual",
        title: "Manual Input",
        description: "Set seats, stacks, cards, and replay the hand street by street.",
      },
      {
        source: "voice",
        title: "Voice Recording",
        description: "Record the hand and let AI turn it into a saved replay.",
      },
      {
        source: "screenshot",
        title: "Import Image",
        description: "Upload a screenshot and let AI extract the hand.",
      },
    ],
    [],
  );

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppNavigation />

        <section className="panel panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="home-felt absolute inset-x-[12%] top-[-24%] hidden h-[320px] rounded-[999px] lg:block" />

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--gold-soft)]">
                <span>♠</span>
                <span>Hand Replay</span>
              </span>
              <div className="space-y-3">
                <h1 className="font-heading text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                  Upload A Real Hand
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  Choose one way to save the hand. History stays in the History page.
                </p>
              </div>
            </div>

            <Link href="/history" className="btn-secondary">
              Open History
            </Link>
          </div>

          <div className="relative mt-8 grid gap-3 md:grid-cols-3">
            {methodCards.map((method) => {
              const active = method.source === activeSource;

              return (
                <button
                  key={method.source}
                  type="button"
                  onClick={() => handleSourceSelect(method.source)}
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
        </section>

        {(error || notice) && (
          <section className="panel p-4 sm:p-5">
            {error ? (
              <p className="text-sm leading-6 text-[#ffb2bc]">{error}</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm leading-6 text-[#d8f3b1]">{notice}</p>
                {lastSavedItem ? (
                  <Link href={`/history/${lastSavedItem.id}`} className="btn-secondary">
                    Open Saved Hand
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        )}

        <section className="panel p-5 sm:p-6">
          {activeSource === "manual" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                    Manual Input
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Start with setup, then replay the action from preflop to river.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManualWizardVisible(true)}
                  className="btn-secondary"
                >
                  {manualSetup ? "Edit Setup" : "Start Setup"}
                </button>
              </div>

              {!manualSetup ? (
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-[var(--muted)]">
                  Start the setup first. After that, the full replay builder will appear here.
                </div>
              ) : (
                <ManualReplayBuilder
                  key={JSON.stringify(manualSetup)}
                  setup={manualSetup}
                  saving={busySource === "manual"}
                  onEditSetup={() => setManualWizardVisible(true)}
                  onSave={handleManualSubmit}
                />
              )}
            </div>
          ) : null}

          {activeSource === "voice" ? (
            <div className="space-y-5">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                  Voice Recording
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Record a memo or upload an audio file, then save it as a hand.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[rgba(143,29,45,0.3)] text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:scale-[1.02]"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void beginRecording()}
                      disabled={!isRecordingSupported}
                      className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-sm font-semibold uppercase tracking-[0.16em] text-[var(--gold-soft)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Record
                    </button>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm leading-6 text-white">
                      {isRecording
                        ? `Recording... ${recordingSeconds}s`
                        : "Record live or upload an audio file."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!user || !subscription.premium) {
                          openGate("voice");
                          return;
                        }

                        audioInputRef.current?.click();
                      }}
                      className="btn-secondary"
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
                    disabled={busySource === "voice" || !selectedAudio}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {busySource === "voice" ? "Transcribing..." : "Transcribe & Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {activeSource === "screenshot" ? (
            <div className="space-y-5">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                  Import Image
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Upload a screenshot from the table and save it as a hand.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!user || !subscription.premium) {
                    openGate("screenshot");
                    return;
                  }

                  imageInputRef.current?.click();
                }}
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
                      JPG, PNG, and HEIC work best when the action line is visible.
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
                  disabled={busySource === "screenshot" || !selectedImage}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busySource === "screenshot" ? "Reading Image..." : "Read & Save"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {manualWizardVisible ? (
        <ManualHandWizard
          initialSetup={manualSetup}
          onClose={() => setManualWizardVisible(false)}
          onComplete={(setup) => {
            setManualSetup(setup);
            setNotice("Setup saved. Continue with the replay builder.");
            setError("");
          }}
        />
      ) : null}

      <PremiumActionGateModal
        open={gateOpen}
        action={gateAction}
        onClose={() => {
          setGateOpen(false);
          setGateAction(null);
        }}
      />
    </main>
  );
}
