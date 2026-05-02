/** ISO weekday: Monday = 1 … Sunday = 7 */
export type WeekdayHours = Record<number, [number, number]>;

const DEFAULT_WEEKDAY: WeekdayHours = {
  1: [9, 17],
  2: [9, 17],
  3: [9, 17],
  4: [9, 17],
  5: [9, 17],
};

/**
 * Parses WORK_HOURS env JSON. Expected shape: {"1":[9,17],"2":[9,17],...}
 * Second number is closing hour (last slot starts endHour - slotHours).
 */
export function parseWorkHours(raw: string | undefined): WeekdayHours {
  if (!raw?.trim()) return { ...DEFAULT_WEEKDAY };
  try {
    const obj = JSON.parse(raw) as Record<string, [number, number]>;
    const out: WeekdayHours = {};
    for (const [k, v] of Object.entries(obj)) {
      const d = Number(k);
      if (!Number.isInteger(d) || d < 1 || d > 7) continue;
      if (!Array.isArray(v) || v.length !== 2) continue;
      const [a, b] = v;
      if (typeof a !== "number" || typeof b !== "number") continue;
      if (a < 0 || a > 23 || b < 1 || b > 24 || a >= b) continue;
      out[d] = [a, b];
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
