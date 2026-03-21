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
      <header className="hidden items-center justify-between gap-4 rounded-[26px] border border-[var(--border)] bg-[rgba(31,31,31,0.92)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur md:flex">
        <Link href="/" className="min-w-0">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/52">
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
                className={`rounded-[16px] border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-white/30 bg-black/45 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_0_rgba(0,0,0,0.45)]"
                    : "border-white/16 bg-white/[0.02] text-white/66 hover:bg-white/[0.05]"
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
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/52">
            ALL IN Poker AI
          </p>
          <p className="mt-1 font-heading text-2xl text-white">Poker Tools</p>
        </Link>
        <AuthButton />
      </header>

      <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-2 rounded-[22px] border border-[var(--border)] bg-[rgba(31,31,31,0.96)] p-2 shadow-[var(--shadow)] backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center rounded-[16px] px-3 py-3 text-[0.78rem] font-semibold transition ${
                active
                  ? "border border-white/26 bg-black/45 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_0_rgba(0,0,0,0.35)]"
                  : "border border-transparent text-white/58"
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
