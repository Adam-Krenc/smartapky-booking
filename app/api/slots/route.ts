import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { fetchFreeBusy, getCalendarClient } from "@/lib/google-calendar";
import { bookingWindow, buildAvailableSlots } from "@/lib/slots";
import { getWorkHoursFromEnv } from "@/lib/work-hours";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = getEnv();
    const calendar = getCalendarClient(env);
    const now = new Date();
    const { minStart, maxEnd } = bookingWindow(env, now);
    const fbMin = new Date(now.getTime() - 5 * 60_000);
    const busy = await fetchFreeBusy(calendar, env.GOOGLE_CALENDAR_ID, fbMin, maxEnd);
    const work = getWorkHoursFromEnv(env);
    const slots = buildAvailableSlots(env, work, busy, minStart, maxEnd);
    return NextResponse.json({
      timezone: env.TIMEZONE,
      slotMinutes: env.SLOT_MINUTES,
      slots: slots.map((d) => d.toISOString()),
    });
  } catch (e) {
    console.error("[slots]", e);
    return NextResponse.json({ error: "slots_unavailable" }, { status: 503 });
  }
}
