"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BOOK_COPY, type BookLang } from "@/lib/book-copy";

type SlotsResponse = { timezone: string; slotMinutes: number; slots: string[] };

type Step = "slots" | "details" | "review";

function formatSlot(iso: string, lang: BookLang) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "cs-CZ", {
    timeZone: "Europe/Prague",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BookingForm({ gdprPdfUrl }: { gdprPdfUrl: string }) {
  const [lang, setLang] = useState<BookLang>("cs");
  const t = BOOK_COPY[lang];

  const [step, setStep] = useState<Step>("slots");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ meetLink: string | null; htmlLink: string | null } | null>(null);

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
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex justify-end">{langToggle}</div>
        <h2 className="text-xl font-semibold tracking-tight">{t.successTitle}</h2>
        <p className="text-zinc-400">{t.successBody}</p>
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
    <div className="mx-auto max-w-lg space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{t.subtitle}</p>
        </div>
        {langToggle}
      </div>

      {step === "slots" && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">{t.pickSlot}</h2>
          {loadingSlots && <p className="text-sm text-zinc-500">…</p>}
          {slotsError && <p className="text-sm text-red-400">{t.loadError}</p>}
          {!loadingSlots && !slotsError && slots?.length === 0 && (
            <p className="text-sm text-zinc-400">{t.noSlots}</p>
          )}
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(slots ?? []).map((iso) => (
              <li key={iso}>
                <button
                  type="button"
                  onClick={() => setSelected(iso)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                    selected === iso
                      ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-100"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-200 hover:border-zinc-600"
                  }`}
                >
                  {formatSlot(iso, lang)}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!canDetails}
            onClick={() => setStep("details")}
            className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.next}
          </button>
        </section>
      )}

      {step === "details" && (
        <section className="space-y-4">
          <p className="text-sm text-zinc-400">{selected ? formatSlot(selected, lang) : ""}</p>
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.name}</span>
            <input
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none ring-emerald-500/40 focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.email}</span>
            <input
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none ring-emerald-500/40 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t.notes} <span className="normal-case text-zinc-600">({t.notesOptional})</span>
            </span>
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none ring-emerald-500/40 focus:ring-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
            <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-1" />
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
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              {t.back}
            </button>
            <button
              type="button"
              disabled={!canReview}
              onClick={() => setStep("review")}
              className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.next}
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">{t.reviewTitle}</h2>
          <dl className="space-y-2 text-sm">
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
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
            >
              {t.back}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onSubmit()}
              className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 disabled:opacity-60"
            >
              {submitting ? "…" : t.submit}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
