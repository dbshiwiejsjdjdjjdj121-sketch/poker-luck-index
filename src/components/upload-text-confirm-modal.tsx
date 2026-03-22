"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { ExtractedUploadDraft } from "@/lib/hand-upload-types";

type UploadTextConfirmModalProps = {
  open: boolean;
  draft: ExtractedUploadDraft | null;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (nextText: string) => Promise<void>;
};

const sourceLabels: Record<ExtractedUploadDraft["source"], string> = {
  voice: "Voice Draft",
  screenshot: "Screenshot Draft",
};

function UploadTextConfirmDialog({
  draft,
  saving,
  error,
  onClose,
  onConfirm,
}: Omit<UploadTextConfirmModalProps, "open"> & {
  draft: ExtractedUploadDraft;
}) {
  const [text, setText] = useState(draft.extractedText);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[220] overflow-y-auto overscroll-contain bg-black/78 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
      role="dialog"
    >
      <div className="grid min-h-full w-full place-items-start sm:place-items-center">
        <div className="my-4 w-full max-w-[52rem] overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[rgba(29,31,34,0.98)] shadow-[var(--shadow)]">
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-h-[min(48rem,calc(100dvh-3rem))] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-white/52">
                  {sourceLabels[draft.source]}
                </p>
                <div className="space-y-2">
                  <h2 className="font-heading text-3xl leading-tight text-white sm:text-4xl">
                    Review the extracted hand first
                  </h2>
                  <p className="max-w-[42rem] text-sm leading-7 text-[var(--muted)] sm:text-base">
                    This follows the allin flow: we extract the hand text first,
                    then you confirm it before we build the replay.
                  </p>
                </div>
              </div>

              <button
                aria-label="Close"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-white/[0.03] text-xl text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white/78">
                    Extracted hand text
                  </span>
                  <textarea
                    className="field-shell min-h-[22rem] w-full rounded-[22px] px-4 py-4 text-sm leading-7 text-white outline-none"
                    onChange={(event) => setText(event.target.value)}
                    placeholder="The extracted hand text will appear here."
                    value={text}
                  />
                </label>
                <p className="text-xs leading-6 text-[var(--muted)]">
                  You can clean this up, fix seats, cards, or action wording, then
                  continue.
                </p>
              </div>

              <div className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Quick Read
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/88">
                    {draft.preview.quickSummary || "We extracted enough detail to build a replay draft."}
                  </p>
                </div>

                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Missing
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                    {(draft.preview.missingDetails.length > 0
                      ? draft.preview.missingDetails
                      : ["Nothing major is missing from the extracted draft."]).map(
                      (item) => (
                        <li key={item}>{item}</li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-[20px] border border-[#ff8d72]/30 bg-[#2b1f1d] px-4 py-3 text-sm leading-6 text-[#ffb39d]">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className="btn-secondary justify-center"
                onClick={onClose}
                type="button"
              >
                Back
              </button>
              <button
                className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-55"
                disabled={saving || !text.trim()}
                onClick={() => void onConfirm(text)}
                type="button"
              >
                {saving ? "Saving hand..." : "Build replay"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UploadTextConfirmModal({
  open,
  draft,
  saving,
  error = "",
  onClose,
  onConfirm,
}: UploadTextConfirmModalProps) {
  if (!open || !draft || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <UploadTextConfirmDialog
      key={`${draft.source}-${draft.extractedText}`}
      draft={draft}
      saving={saving}
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
    document.body,
  );
}
