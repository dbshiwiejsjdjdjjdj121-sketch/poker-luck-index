"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "@/components/auth-button";

const NAV_ITEMS = [
  { href: "/", label: "Luck" },
  { href: "/hand-review", label: "Replay" },
  { href: "/history", label: "History" },
  { href: "/bankroll", label: "Bankroll" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/result");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="hidden items-center justify-between gap-4 rounded-[28px] border border-[var(--border)] bg-[rgba(6,18,15,0.72)] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur md:flex">
        <Link href="/" className="min-w-0">
          <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--gold-soft)]">
            ALL IN Poker AI
          </p>
          <p className="mt-1 font-heading text-2xl text-white">Poker Tools</p>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                  active
                    ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-[var(--gold-soft)]"
                    : "border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <AuthButton />
      </header>

      <header className="flex items-center justify-between gap-4 md:hidden">
        <Link href="/" className="min-w-0">
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--gold-soft)]">
            ALL IN Poker AI
          </p>
          <p className="mt-1 font-heading text-2xl text-white">Poker Tools</p>
        </Link>
        <AuthButton />
      </header>

      <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-2 rounded-[24px] border border-[var(--border-strong)] bg-[rgba(6,18,15,0.92)] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center rounded-[18px] px-3 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] transition ${
                active
                  ? "bg-[rgba(214,178,93,0.14)] text-[var(--gold-soft)]"
                  : "text-white/65"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
