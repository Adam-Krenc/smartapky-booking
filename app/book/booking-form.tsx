"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { BOOK_COPY, type BookLang } from "@/lib/book-copy";

const TZ = "Europe/Prague";

type SlotsResponse = { timezone: string; slotMinutes: number; slots: string[] };
type Step = "slots" | "details" | "review";

function formatSlot(iso: string, lang: BookLang) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "cs-CZ", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatTimeOnly(iso: string, lang: BookLang) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "cs-CZ", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMonthTitle(dt: DateTime, lang: BookLang) {
  return new Intl.DateTimeFormat(lang === "cs" ? "cs-CZ" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(dt.set({ day: 15 }).toJSDate());
}

function weekdayShortHeaders(lang: BookLang): string[] {
  const loc = lang === "cs" ? "cs-CZ" : "en-GB";
  const fmt = new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" });
  const headers: string[] = [];
  for (let d = 0; d < 7; d++) {
    headers.push(fmt.format(new Date(Date.UTC(2024, 0, 1 + d))));
  }
  return headers;
}

function slotsByDayMap(slots: string[] | null): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const iso of slots ?? []) {
    const key = DateTime.fromISO(iso, { setZone: true }).setZone(TZ).toFormat("yyyy-LL-dd");
    const arr = m.get(key) ?? [];
    arr.push(iso);
    m.set(key, arr);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.localeCompare(b));
  return m;
}

export function BookingForm({ gdprPdfUrl }: { gdprPdfUrl: string }) {
  const [lang, setLang] = useState<BookLang>("cs");
  const t = BOOK_COPY[lang];

  const [step, setStep] = useState<Step>("slots");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [viewMonth, setViewMonth] = useState<DateTime | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ meetLink: string | null; htmlLink: string | null } | null>(null);
  const initFromSlotsRef = useRef(false);

  const slotsByDay = useMemo(() => slotsByDayMap(slots), [slots]);

  const bounds = useMemo(() => {
    if (!slots?.length) return null;
    const first = DateTime.fromISO(slots[0]!, { setZone: true }).setZone(TZ).startOf("month");
    const last = DateTime.fromISO(slots[slots.length - 1]!, { setZone: true }).setZone(TZ).startOf("month");
    return { first, last };
  }, [slots]);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setSlotsError(false);
    try {
      const r = await fetch("/api/slots", { cache: "no-store" });
      if (!r.ok) throw new Error("bad");
      const data = (await r.json()) as SlotsResponse;
      setSlots(data.slots);
    } catch {
      setSlotsError(true);
      setSlots(null);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    if (!slots?.length || initFromSlotsRef.current) return;
    initFromSlotsRef.current = true;
    const first = DateTime.fromISO(slots[0]!, { setZone: true }).setZone(TZ);
    setViewMonth(first.startOf("month"));
    setSelectedDayKey(first.toFormat("yyyy-LL-dd"));
  }, [slots]);

  useEffect(() => {
    if (!viewMonth || !slots?.length) return;
    const prefix = viewMonth.toFormat("yyyy-LL");
    const keysInMonth = [...slotsByDay.keys()].filter((k) => k.startsWith(prefix)).sort();
    if (keysInMonth.length === 0) {
      setSelectedDayKey(null);
      setSelected(null);
      return;
    }
    setSelectedDayKey((cur) => (cur && keysInMonth.includes(cur) ? cur : keysInMonth[0]!));
  }, [viewMonth, slotsByDay, slots]);

  useEffect(() => {
    if (!selected || !selectedDayKey) return;
    const day = DateTime.fromISO(selected, { setZone: true }).setZone(TZ).toFormat("yyyy-LL-dd");
    if (day !== selectedDayKey) setSelected(null);
  }, [selectedDayKey, selected]);

  const calendarCells = useMemo(() => {
    if (!viewMonth) return [];
    const monthStart = viewMonth.startOf("month");
    const start = monthStart.minus({ days: monthStart.weekday - 1 });
    return Array.from({ length: 42 }, (_, i) => start.plus({ days: i }));
  }, [viewMonth]);

  const weekdayHeaders = useMemo(() => weekdayShortHeaders(lang), [lang]);

  const timesForDay = useMemo(() => {
    if (!selectedDayKey) return [];
    return slotsByDay.get(selectedDayKey) ?? [];
  }, [slotsByDay, selectedDayKey]);

  const canPrevMonth = Boolean(bounds && viewMonth && viewMonth > bounds.first);
  const canNextMonth = Boolean(bounds && viewMonth && viewMonth < bounds.last);

  const canDetails = selected && step === "slots";
  const canReview =
    name.trim().length > 0 && email.includes("@") && gdpr && step === "details";

  async function onSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim() || undefined,
          slotStart: selected,
          gdprAccepted: gdpr,
        }),
      });
      const data = (await r.json()) as { ok?: boolean; meetLink?: string | null; htmlLink?: string | null; error?: string };
      if (!r.ok) {
        setSubmitError(data.error ?? "error");
        return;
      }
      setDone({ meetLink: data.meetLink ?? null, htmlLink: data.htmlLink ?? null });
    } catch {
      setSubmitError("network");
    } finally {
      setSubmitting(false);
    }
  }

  const langToggle = useMemo(
    () => (
      <div className="flex gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-1">
        <button
          type="button"
          onClick={() => setLang("cs")}
          className={`rounded-md px-3 py-1 text-sm font-medium ${lang === "cs" ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          {t.langCs}
        </button>
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`rounded-md px-3 py-1 text-sm font-medium ${lang === "en" ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          {t.langEn}
        </button>
      </div>
    ),
    [lang, t.langCs, t.langEn],
  );

  if (done) {
    return (
      <div className="w-full space-y-6">
        <div className="flex justify-end">{langToggle}</div>
        <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl">{t.successTitle}</h2>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-400">{t.successBody}</p>
        {done.meetLink && (
          <p>
            <span className="text-zinc-500">{t.meetLabel}: </span>
            <a href={done.meetLink} className="text-emerald-400 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              {done.meetLink}
            </a>
          </p>
        )}
        {done.htmlLink && (
          <p>
            <span className="text-zinc-500">{t.calendarLabel}: </span>
            <a href={done.htmlLink} className="text-emerald-400 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              {done.htmlLink}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-50 lg:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-500">{t.subtitle}</p>
        </div>
        {langToggle}
      </div>

      {step === "slots" && (
        <section className="space-y-6">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">{t.pickSlot}</h2>
          {loadingSlots && <p className="text-sm text-zinc-500">…</p>}
          {slotsError && <p className="text-sm text-red-400">{t.loadError}</p>}
          {!loadingSlots && !slotsError && slots?.length === 0 && (
            <p className="text-sm text-zinc-400">{t.noSlots}</p>
          )}
          {!loadingSlots && !slotsError && slots && slots.length > 0 && viewMonth && (
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-sm sm:p-8 lg:p-10">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(200px,260px)] lg:gap-14">
              <div className="space-y-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">{t.pickDay}</p>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    aria-label={t.monthPrev}
                    disabled={!canPrevMonth}
                    onClick={() => canPrevMonth && setViewMonth((vm) => (vm ? vm.minus({ months: 1 }).startOf("month") : vm))}
                    className="rounded-lg border border-white/[0.1] bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition hover:border-emerald-500/30 hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="min-w-0 truncate text-center text-sm font-semibold tracking-tight text-zinc-100">
                    {formatMonthTitle(viewMonth, lang)}
                  </span>
                  <button
                    type="button"
                    aria-label={t.monthNext}
                    disabled={!canNextMonth}
                    onClick={() => canNextMonth && setViewMonth((vm) => (vm ? vm.plus({ months: 1 }).startOf("month") : vm))}
                    className="rounded-lg border border-white/[0.1] bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition hover:border-emerald-500/30 hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                  {weekdayHeaders.map((w) => (
                    <div key={w} className="py-1">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarCells.map((cell) => {
                    const key = cell.toFormat("yyyy-LL-dd");
                    const inMonth = cell.month === viewMonth.month && cell.year === viewMonth.year;
                    const hasSlots = slotsByDay.has(key);
                    const isDayPick = key === selectedDayKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!hasSlots}
                        onClick={() => {
                          if (!hasSlots) return;
                          setSelectedDayKey(key);
                          setSelected(null);
                        }}
                        className={[
                          "flex aspect-square max-h-12 items-center justify-center rounded-xl text-sm font-medium transition",
                          !inMonth ? "text-zinc-600" : "text-zinc-100",
                          hasSlots
                            ? isDayPick
                              ? "bg-emerald-500/20 ring-1 ring-emerald-400/50 shadow-[0_0_20px_-4px_rgba(52,211,153,0.35)]"
                              : "border border-transparent bg-zinc-900/70 hover:border-white/10 hover:bg-zinc-800/90"
                            : "cursor-not-allowed opacity-30",
                        ].join(" ")}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
                {selectedDayKey === null && (
                  <p className="text-sm text-zinc-500">{t.emptyMonth}</p>
                )}
              </div>
              <div className="space-y-4 border-t border-white/[0.06] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">{t.pickTime}</p>
                <div className="flex max-h-[min(22rem,50vh)] flex-col gap-2 overflow-y-auto pr-1">
                  {timesForDay.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelected(iso)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                        selected === iso
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-50 shadow-[0_0_24px_-8px_rgba(52,211,153,0.25)]"
                          : "border-white/[0.08] bg-zinc-900/50 text-zinc-200 hover:border-white/15 hover:bg-zinc-800/60"
                      }`}
                    >
                      {formatTimeOnly(iso, lang)}
                    </button>
                  ))}
                </div>
              </div>
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={!canDetails}
            onClick={() => setStep("details")}
            className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.next}
          </button>
        </section>
      )}

      {step === "details" && (
        <section className="max-w-xl space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-zinc-950/40 px-5 py-4 text-sm text-zinc-400">
            {selected ? formatSlot(selected, lang) : ""}
          </div>
          <label className="block space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">{t.name}</span>
            <input
              className="w-full rounded-xl border border-white/[0.1] bg-zinc-950/60 px-4 py-3 text-sm outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">{t.email}</span>
            <input
              className="w-full rounded-xl border border-white/[0.1] bg-zinc-950/60 px-4 py-3 text-sm outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">
              {t.notes} <span className="normal-case text-zinc-500">({t.notesOptional})</span>
            </span>
            <textarea
              className="min-h-[100px] w-full rounded-xl border border-white/[0.1] bg-zinc-950/60 px-4 py-3 text-sm outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/30 p-4 text-sm text-zinc-300">
            <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-1 size-4 rounded border-white/20 accent-emerald-500" />
            <span>
              {t.gdprLabel}{" "}
              <a href={gdprPdfUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline underline-offset-2">
                {t.gdprLink}
              </a>
              .
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("slots")}
              className="rounded-xl border border-white/[0.12] px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900/80"
            >
              {t.back}
            </button>
            <button
              type="button"
              disabled={!canReview}
              onClick={() => setStep("review")}
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.next}
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="max-w-xl space-y-6">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">{t.reviewTitle}</h2>
          <dl className="space-y-4 rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-6 text-sm">
            <div>
              <dt className="text-zinc-500">{t.pickSlot}</dt>
              <dd>{selected ? formatSlot(selected, lang) : "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t.name}</dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t.email}</dt>
              <dd>{email}</dd>
            </div>
            {notes.trim() && (
              <div>
                <dt className="text-zinc-500">{t.notes}</dt>
                <dd className="whitespace-pre-wrap">{notes}</dd>
              </div>
            )}
          </dl>
          {submitError && <p className="text-sm text-red-400">{t.errorGeneric}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("details")}
              disabled={submitting}
              className="rounded-xl border border-white/[0.12] px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900/80 disabled:opacity-50"
            >
              {t.back}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onSubmit()}
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {submitting ? "…" : t.submit}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
