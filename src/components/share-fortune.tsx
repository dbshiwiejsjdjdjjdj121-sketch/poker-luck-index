"use client";

import { useState } from "react";

type ShareFortuneProps = {
  shareUrl: string;
  shareText: string;
};

export function ShareFortune({ shareUrl, shareText }: ShareFortuneProps) {
  const [feedback, setFeedback] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback("Share link copied.");
    } catch {
      setFeedback("Clipboard access is unavailable on this device.");
    }
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: "Poker Luck Index",
        text: shareText,
        url: shareUrl,
      });
      setFeedback("Fortune shared.");
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setFeedback("Sharing failed on this device.");
    }
  }

  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <section className="panel p-6 sm:p-8">
      <div className="flex flex-col gap-6">
        <div className="max-w-xl">
          <p className="font-heading text-2xl text-white">Share This Read</p>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">
            Send your result to friends, copy the exact link, or post it to X
            without leaving the page.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleNativeShare}
            className="btn-primary inline-flex items-center justify-center"
          >
            Share Fortune
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-secondary inline-flex items-center justify-center"
          >
            Copy Link
          </button>
          <a
            href={xShareUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center justify-center"
          >
            Share on X
          </a>
        </div>
      </div>

      <div className="mt-4 min-h-6 text-sm text-[var(--muted)]">{feedback}</div>
    </section>
  );
}
