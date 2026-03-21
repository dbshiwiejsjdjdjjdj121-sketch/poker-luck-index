"use client";

type ProPricingModalProps = {
  open: boolean;
  onClose: () => void;
  onPurchase: () => Promise<void>;
  purchasing: boolean;
  purchaseDisabled?: boolean;
  purchaseError?: string;
  actionLabel: string;
  actionReadyCopy: string;
  accountEmail?: string | null;
};

export function ProPricingModal({
  open,
  onClose,
  onPurchase,
  purchasing,
  purchaseDisabled = false,
  purchaseError = "",
  actionLabel,
  actionReadyCopy,
  accountEmail,
}: ProPricingModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-[40rem] rounded-[28px] border border-[var(--border-strong)] bg-[rgba(29,31,34,0.98)] p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[0.7rem] uppercase tracking-[0.24em] text-white/52">
              Choose a plan
            </p>
            <div className="space-y-2">
              <h2 className="font-heading text-3xl leading-tight text-white sm:text-4xl">
                Unlock Pro before we continue
              </h2>
              <p className="max-w-[36rem] text-sm leading-7 text-[var(--muted)] sm:text-base">
                {accountEmail
                  ? `Signed in as ${accountEmail}. ${actionReadyCopy} Pick a plan to continue.`
                  : `Pick a plan to continue with ${actionLabel.toLowerCase()}.`}
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

        <div className="mt-6">
          <article className="rounded-[24px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Pro Monthly</p>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-5xl leading-none text-white">
                    $9.99
                  </span>
                  <span className="pb-1 text-sm text-[var(--muted)]">
                    / month
                  </span>
                </div>
              </div>
              <span className="rounded-full border border-[#57c878]/18 bg-[#1c2a21] px-3 py-1 text-xs font-semibold text-[#6fe294]">
                Active after checkout
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/88">
                Voice upload
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/88">
                Screenshot upload
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/88">
                AI hand analysis
              </div>
            </div>

            <button
              className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
              disabled={purchasing || purchaseDisabled}
              onClick={() => void onPurchase()}
              type="button"
            >
              {purchasing ? "Opening checkout..." : "Start monthly"}
            </button>
          </article>
        </div>

        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
          {purchasing
            ? "Opening secure checkout. Keep this tab open so we can restore Pro access after payment."
            : "Checkout opens on Creem. Pro access is applied to the same account after payment."}
        </p>

        {purchaseError ? (
          <div className="mt-4 rounded-[20px] border border-[#ff8d72]/30 bg-[#2b1f1d] px-4 py-3 text-sm leading-6 text-[#ffb39d]">
            {purchaseError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
