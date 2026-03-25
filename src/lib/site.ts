import type { FortuneInput, FortuneOutput } from "@/lib/fortune";

export type SearchParams = Record<string, string | string[] | undefined>;

export const SITE_NAME = "ALL IN Poker AI";
export const SITE_URL = "https://www.allinpokerai.com";
export const SITE_LOCALE = "en_US";
export const SITE_DESCRIPTION =
  "ALL IN Poker AI helps you replay poker hands, track bankroll, save hand history, and check a fast luck index before you play.";
export const SITE_KEYWORDS = [
  "all in poker ai",
  "allinpokerai",
  "poker ai",
  "poker hand replay",
  "poker bankroll tracker",
  "poker hand history",
  "poker luck index",
  "poker analysis tool",
];

export function buildAbsoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function readSearchParam(params: SearchParams, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function getFortuneInputFromSearchParams(
  params: SearchParams,
): FortuneInput | null {
  const tableNumber = readSearchParam(params, "table_number").trim();
  const seatNumber = readSearchParam(params, "seat_number").trim();
  const birthDate = readSearchParam(params, "birth_date").trim();
  const todayDate = readSearchParam(params, "today_date").trim();

  if (!tableNumber || !seatNumber || !birthDate || !todayDate) {
    return null;
  }

  return {
    tableNumber,
    seatNumber,
    birthDate,
    todayDate,
  };
}

export function buildResultQueryString(input: FortuneInput) {
  const params = new URLSearchParams({
    table_number: input.tableNumber,
    seat_number: input.seatNumber,
    birth_date: input.birthDate,
    today_date: input.todayDate,
  });

  return params.toString();
}

export function buildResultPath(input: FortuneInput) {
  return `/result?${buildResultQueryString(input)}`;
}

export function buildResultDescription(fortune: FortuneOutput) {
  return `Poker Luck Index ${fortune.luckScore}/10. ${fortune.scoreLabel}. Recommended style: ${fortune.recommendedStyle}. Coin flip: ${fortune.coinFlipDecision}.`;
}

export function buildShareText(fortune: FortuneOutput) {
  return `My Poker Luck Index today is ${fortune.luckScore}/10. ${fortune.scoreLabel}. Recommended style: ${fortune.recommendedStyle}.`;
}

export function buildOgImageUrl(options: {
  view: "home" | "result";
  fortune?: FortuneOutput;
}) {
  const params = new URLSearchParams({ view: options.view });

  if (options.fortune) {
    params.set("luck_score", `${options.fortune.luckScore}`);
    params.set("score_label", options.fortune.scoreLabel);
    params.set("style", options.fortune.recommendedStyle);
    params.set("flip", options.fortune.coinFlipDecision);
    params.set("hands", options.fortune.luckyHands.join(" "));
  }

  return buildAbsoluteUrl(`/api/og?${params.toString()}`);
}

export function buildStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        alternateName: "allinpokerai.com",
        url: SITE_URL,
        inLanguage: "en-US",
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser",
        inLanguage: "en-US",
        areaServed: "Worldwide",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description: SITE_DESCRIPTION,
      },
    ],
  };
}
