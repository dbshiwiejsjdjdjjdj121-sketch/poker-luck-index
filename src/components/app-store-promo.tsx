"use client";

import QRCode from "react-qr-code";
import { IOS_APP_STORE_URL } from "@/lib/site";

const APP_FEATURES = [
  "Open the iPhone app straight from the App Store.",
  "Scan the QR code on desktop and continue on your phone.",
  "Use web for deep review and iPhone for fast table-side access.",
] as const;

export function AppStorePromo() {
  return (
    <section className="panel relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-x-[-8%] bottom-[-28%] h-48 rounded-full bg-[radial-gradient(circle,rgba(240,213,199,0.12),transparent_68%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
            <span>iPhone App</span>
            <span>•</span>
            <span>App Store</span>
          </div>

          <div className="space-y-3">
            <h2 className="max-w-2xl font-heading text-3xl leading-tight text-white sm:text-4xl">
              Keep ALL IN Poker AI on your phone when you leave the browser.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Use the website for bankroll, history, and larger review screens, then
              jump into the iPhone app when you want a faster table-side workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={IOS_APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-primary inline-flex items-center justify-center"
            >
              View On The App Store
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {APP_FEATURES.map((feature) => (
              <div
                key={feature}
                className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[var(--muted)]"
              >
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm rounded-[28px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
          <div className="rounded-[22px] border border-white/8 bg-[rgba(18,18,18,0.96)] p-5 text-center">
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-[26px] bg-white p-4 shadow-[0_14px_32px_rgba(0,0,0,0.24)]">
              <QRCode value={IOS_APP_STORE_URL} size={144} />
            </div>
            <p className="mt-4 text-sm font-medium text-white">Scan to open the iPhone app</p>
            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              Best for desktop visitors who want to continue in the App Store on their
              phone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
