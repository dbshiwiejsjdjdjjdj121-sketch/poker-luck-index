"use client";

import { useEffect, useRef } from "react";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function HomeForm() {
  const birthDateRef = useRef<HTMLInputElement>(null);
  const todayDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (todayDateRef.current && !todayDateRef.current.value) {
      todayDateRef.current.value = formatLocalDate(new Date());
    }
  }, []);

  function openNativePicker(input: HTMLInputElement | null) {
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }

    pickerInput.focus();
  }

  return (
    <section className="panel panel-strong relative overflow-hidden p-5 sm:p-6">
      <div className="absolute right-5 top-5 text-xl text-[rgba(247,223,160,0.55)]">
        ♠
      </div>
      <div className="mb-6">
        <p className="font-heading text-2xl text-white">Daily Draw</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter your table, seat, and dates. The read takes about ten seconds.
        </p>
      </div>

      <form action="/result" className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.32em] text-[var(--gold-soft)]">
              Table Number
            </span>
            <div className="field-shell transition">
              <input
                className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/30"
                id="table_number"
                name="table_number"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="12"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.32em] text-[var(--gold-soft)]">
              Seat Number
            </span>
            <div className="field-shell transition">
              <input
                className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/30"
                id="seat_number"
                name="seat_number"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder="6"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.32em] text-[var(--gold-soft)]">
              Birth Date
            </span>
            <div className="field-shell transition">
              <input
                className="w-full bg-transparent text-base text-white outline-none"
                id="birth_date"
                name="birth_date"
                ref={birthDateRef}
                type="date"
                autoComplete="bday"
                lang="en-US"
                required
              />
              <button
                type="button"
                aria-label="Open birth date calendar"
                className="date-trigger"
                onClick={() => openNativePicker(birthDateRef.current)}
              >
                📅
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.32em] text-[var(--gold-soft)]">
              Today&apos;s Date
            </span>
            <div className="field-shell transition">
              <input
                className="w-full bg-transparent text-base text-white outline-none"
                id="today_date"
                name="today_date"
                ref={todayDateRef}
                type="date"
                lang="en-US"
                required
              />
              <button
                type="button"
                aria-label="Open today date calendar"
                className="date-trigger"
                onClick={() => openNativePicker(todayDateRef.current)}
              >
                📅
              </button>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="btn-primary mt-2 inline-flex w-full items-center justify-center"
        >
          Reveal My Poker Fortune
        </button>

        <p className="text-center text-xs text-[var(--muted)]">
          Use the calendar picker for the fastest input. You&apos;ll get a
          10-point read, a session plan, and three hands to watch.
        </p>
      </form>
    </section>
  );
}
