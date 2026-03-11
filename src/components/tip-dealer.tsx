"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { DONATION_URL } from "@/lib/site";

const tipAmounts = [1, 3, 5] as const;

export function TipDealer() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<(typeof tipAmounts)[number]>(3);

  const donationUrlWithAmount = `${DONATION_URL}/${selectedAmount}`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(donationUrlWithAmount);
      setFeedback("PayPal link copied.");
    } catch {
      setFeedback("Clipboard access is unavailable on this device.");
    }
  }

  return (
    <>
      <section className="panel p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-xl">
            <p className="font-heading text-[1.7rem] text-white">Tip the Dealer</p>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              If this read made you smile, you can support the project here.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--gold-soft)]">
              Tip Amount
            </p>
            <div className="flex flex-wrap gap-3">
            {tipAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setSelectedAmount(amount)}
                className={amount === selectedAmount ? "tip-amount is-active" : "tip-amount"}
                aria-pressed={amount === selectedAmount}
              >
                ${amount}
              </button>
            ))}
          </div>
          </div>

          <div className="flex flex-col gap-4 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="btn-primary inline-flex items-center justify-center"
            >
              Tip with PayPal
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary btn-secondary-muted inline-flex items-center justify-center"
            >
              Copy Link
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-6 text-sm text-[var(--muted)]">{feedback}</div>
      </section>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="panel panel-strong w-full max-w-md p-6 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-3xl text-white">Support the Project</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Scan the QR code from another device, copy the PayPal link, or
                  open PayPal in a new tab with your selected tip amount.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
                aria-label="Close support sheet"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="rounded-[28px] bg-white p-4 shadow-[0_18px_32px_rgba(0,0,0,0.24)]">
                <QRCode value={donationUrlWithAmount} size={180} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--muted)]">
              {donationUrlWithAmount}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCopy}
                className="btn-secondary inline-flex flex-1 items-center justify-center"
              >
                Copy Link
              </button>
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex flex-1 items-center justify-center"
              >
                Open PayPal
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
