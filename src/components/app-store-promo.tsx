"use client";

import QRCode from "react-qr-code";
import { IOS_APP_STORE_URL } from "@/lib/site";

export function AppStorePromo() {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="grid gap-6 md:grid-cols-[1.4fr_0.6fr] md:items-center">
        <div className="space-y-4">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-[var(--gold-soft)]">
            iPhone App
          </p>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl text-white sm:text-3xl">
              Keep the app handy when you leave the browser.
            </h2>
            <p className="text-sm leading-7 text-[var(--muted)] sm:text-base">
              Use the web for bankroll and replay, then jump into the iPhone app for
              fast table-side notes.
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
        </div>

        <div className="mx-auto w-full max-w-xs rounded-[18px] border border-white/12 bg-white/[0.03] p-4 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[18px] bg-white p-2">
            <QRCode value={IOS_APP_STORE_URL} size={96} />
          </div>
          <p className="mt-3 text-xs font-medium text-white">Scan to open the app</p>
          <p className="mt-1 text-[0.7rem] leading-5 text-[var(--muted)]">
            Best for desktop visitors continuing on phone.
          </p>
        </div>
      </div>
    </section>
  );
}
