"use client";

import Image from "next/image";

function convertCardToAssetKey(card?: string, backIfUnknown = false) {
  if (!card) {
    return backIfUnknown ? "BACK" : null;
  }

  const trimmed = card.trim();

  if (!trimmed) {
    return backIfUnknown ? "BACK" : null;
  }

  if (trimmed === "Unknown" || trimmed === "??" || trimmed === "?") {
    return backIfUnknown ? "BACK" : null;
  }

  let match = trimmed.match(/^([0-9AJQKT]+)([shdc])$/i);

  if (match) {
    const [, rank, suit] = match;
    const rankKey = rank.toUpperCase() === "10" ? "T" : rank.toUpperCase();
    return `${rankKey}${suit.toUpperCase()}`;
  }

  match = trimmed.match(/^([0-9AJQK]+)([♠♥♦♣])$/);

  if (match) {
    const [, rank, suit] = match;
    const suitKey =
      suit === "♠" ? "S" : suit === "♥" ? "H" : suit === "♦" ? "D" : "C";
    const rankKey = rank === "10" ? "T" : rank.toUpperCase();
    return `${rankKey}${suitKey}`;
  }

  return backIfUnknown ? "BACK" : null;
}

export function getPokerCardImagePath(card?: string, backIfUnknown = false) {
  const assetKey = convertCardToAssetKey(card, backIfUnknown);
  return assetKey ? `/cards/${assetKey}.png` : null;
}

export function PokerCardImage({
  card,
  alt,
  className,
  sizes = "64px",
  backIfUnknown = false,
  fit = "contain",
}: {
  card?: string;
  alt: string;
  className: string;
  sizes?: string;
  backIfUnknown?: boolean;
  fit?: "contain" | "cover";
}) {
  const src = getPokerCardImagePath(card, backIfUnknown);

  if (!src) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={fit === "cover" ? "object-cover" : "object-contain"}
      />
    </div>
  );
}
