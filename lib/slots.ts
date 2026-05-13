import { DateTime } from "luxon";
import type { AppEnv } from "./env";
import type { BusyBlock } from "./google-calendar";
import type { WeekdayHours } from "./work-hours";

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function slotFree(start: Date, end: Date, busy: BusyBlock[]) {
  return !busy.some((b) => overlaps(start, end, b.start, b.end));
}

/**
 * Builds candidate slot starts (UTC instants) within [rangeStart, rangeEnd) from work hours + busy.
 */
export function buildAvailableSlots(
  env: AppEnv,
  work: WeekdayHours,
  busy: BusyBlock[],
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const zone = env.TIMEZONE;
  const slotMin = env.SLOT_MINUTES;
  const out: Date[] = [];

  let day = DateTime.fromJSDate(rangeStart, { zone }).startOf("day");
  const endDay = DateTime.fromJSDate(rangeEnd, { zone }).endOf("day");

  while (day <= endDay) {
    const isoDow = day.weekday; // Luxon: 1 = Monday … 7 = Sunday
    const range = work[isoDow];
    if (range) {
      const { openMin, closeMin } = range;
      for (let m = openMin; m + slotMin <= closeMin; m += slotMin) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const localStart = day.set({ hour: h, minute: min, second: 0, millisecond: 0 });
        const start = localStart.toUTC().toJSDate();
        const end = localStart.plus({ minutes: slotMin }).toUTC().toJSDate();
        if (start >= rangeStart && end <= rangeEnd && slotFree(start, end, busy)) {
          out.push(start);
        }
      }
    }
    day = day.plus({ days: 1 });
  }

  return out.sort((a, b) => a.getTime() - b.getTime());
}

export function bookingWindow(env: AppEnv, now: Date) {
  const zone = env.TIMEZONE;
  const minStart = DateTime.fromJSDate(now, { zone })
    .plus({ hours: env.MIN_BOOKING_LEAD_HOURS })
    .toUTC()
    .toJSDate();
  const maxEnd = DateTime.fromJSDate(now, { zone })
    .plus({ days: env.MAX_BOOKING_DAYS })
    .endOf("day")
    .toUTC()
    .toJSDate();
  return { minStart, maxEnd };
}
