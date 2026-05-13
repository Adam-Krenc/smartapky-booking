/** ISO weekday: Monday = 1 … Sunday = 7 */
export type DayWorkWindow = { openMin: number; closeMin: number };
export type WeekdayHours = Record<number, DayWorkWindow>;

const DEFAULT_WEEKDAY: WeekdayHours = {
  1: { openMin: 9 * 60, closeMin: 17 * 60 },
  2: { openMin: 9 * 60, closeMin: 17 * 60 },
  3: { openMin: 9 * 60, closeMin: 17 * 60 },
  4: { openMin: 9 * 60, closeMin: 17 * 60 },
  5: { openMin: 9 * 60, closeMin: 17 * 60 },
};

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return null;
  if (h < 0 || h > 24 || min < 0 || min > 59) return null;
  if (h === 24 && min !== 0) return null;
  return h * 60 + min;
}

function parseDayValue(v: unknown): DayWorkWindow | null {
  if (Array.isArray(v)) {
    if (v.length === 2) {
      const [a, b] = v;
      if (typeof a !== "number" || typeof b !== "number") return null;
      if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
      if (a < 0 || a > 23 || b < 1 || b > 24 || a >= b) return null;
      return { openMin: a * 60, closeMin: b * 60 };
    }
    if (v.length === 4) {
      const [oh, om, ch, cm] = v;
      if (typeof oh !== "number" || typeof om !== "number" || typeof ch !== "number" || typeof cm !== "number") {
        return null;
      }
      if (![oh, om, ch, cm].every((n) => Number.isInteger(n))) return null;
      if (oh < 0 || oh > 23 || om < 0 || om > 59) return null;
      if (ch < 0 || ch > 24 || cm < 0 || cm > 59) return null;
      if (ch === 24 && cm !== 0) return null;
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;
      if (openMin >= closeMin) return null;
      return { openMin, closeMin };
    }
    return null;
  }
  if (v && typeof v === "object" && "from" in v && "to" in v) {
    const from = parseHHMM(String((v as { from: unknown }).from));
    const to = parseHHMM(String((v as { to: unknown }).to));
    if (from === null || to === null) return null;
    if (from >= to) return null;
    return { openMin: from, closeMin: to };
  }
  return null;
}

/**
 * Parses WORK_HOURS env JSON. Supported shapes per weekday key "1"…"7":
 * - Legacy hours: `[9, 17]` → 09:00–17:00 (same semantics as before).
 * - With minutes: `[15, 30, 23, 0]` → 15:30–23:00.
 * - Strings: `{"from":"15:30","to":"23:00"}`.
 * `close` / end is exclusive for slot *starts*: last 60‑min slot starts at `to` minus 60 minutes.
 */
export function parseWorkHours(raw: string | undefined): WeekdayHours {
  if (!raw?.trim()) return { ...DEFAULT_WEEKDAY };
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: WeekdayHours = {};
    for (const [k, val] of Object.entries(obj)) {
      const d = Number(k);
      if (!Number.isInteger(d) || d < 1 || d > 7) continue;
      const win = parseDayValue(val);
      if (win) out[d] = win;
    }
    if (Object.keys(out).length === 0) return { ...DEFAULT_WEEKDAY };
    return out;
  } catch {
    return { ...DEFAULT_WEEKDAY };
  }
}

export function getWorkHoursFromEnv(env: { WORK_HOURS?: string }): WeekdayHours {
  return parseWorkHours(env.WORK_HOURS);
}
