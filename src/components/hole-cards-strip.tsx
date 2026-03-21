"use client";

import { PokerCardImage } from "@/components/poker-card-image";

export function HoleCardsStrip({
  first,
  second,
  isBack = false,
  size = "medium",
}: {
  first?: string;
  second?: string;
  isBack?: boolean;
  size?: "small" | "medium" | "large";
}) {
  const cardClass =
    size === "small"
      ? "h-10 w-7 rounded-[10px]"
      : size === "large"
        ? "h-16 w-11 rounded-[14px]"
        : "h-12 w-8 rounded-[12px]";

  return (
    <div className="flex items-center gap-1.5">
      <PokerCardImage
        card={first}
        alt="First hole card"
        backIfUnknown={isBack}
        sizes={size === "small" ? "28px" : size === "large" ? "44px" : "32px"}
        className={`${cardClass} border border-white/10 bg-white/[0.04]`}
      />
      <PokerCardImage
        card={second}
        alt="Second hole card"
        backIfUnknown={isBack}
        sizes={size === "small" ? "28px" : size === "large" ? "44px" : "32px"}
        className={`${cardClass} border border-white/10 bg-white/[0.04]`}
      />
    </div>
  );
}
