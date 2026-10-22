"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { publicAnalyticsUrl } from "@/lib/analytics-policy";

type GoogleTag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
    pokerGaInitialized?: boolean;
  }
}

export function GoogleAnalytics({ paths }: { paths: string[] }) {
  const pathname = usePathname();
  const previousPage = useRef<string | null>(null);
  useEffect(() => {
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    const page = publicAnalyticsUrl(window.location.href, paths);
    if (!page || privacy.doNotTrack === "1" || privacy.globalPrivacyControl) {
      previousPage.current = null;
      return;
    }
    if (previousPage.current === page) return;
    const id = "G-SC7WV63E2M";
    if (!window.pokerGaInitialized) {
      window.dataLayer ||= [];
      // Google's documented tag queue uses an Arguments object, not a rest array.
      // eslint-disable-next-line prefer-rest-params
      window.gtag ||= function () { window.dataLayer!.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: page,
        page_referrer: "",
      });
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      script.dataset.pokerGa = id;
      document.head.appendChild(script);
      window.pokerGaInitialized = true;
    }
    window.gtag!("event", "page_view", {
      send_to: id,
      page_location: page,
      page_referrer: previousPage.current || "",
      page_title: document.title,
    });
    previousPage.current = page;
  }, [pathname, paths]);
  return null;
}
