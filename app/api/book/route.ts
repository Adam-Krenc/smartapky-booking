import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendBookingConfirmationEmail } from "@/lib/booking-confirmation-email";
import { getEnv } from "@/lib/env";
import { fetchFreeBusy, getCalendarClient } from "@/lib/google-calendar";
import { bookingWindow, buildAvailableSlots } from "@/lib/slots";
import { clientIp, getBookRatelimit } from "@/lib/rate-limit";
import { getWorkHoursFromEnv } from "@/lib/work-hours";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  notes: z.string().max(4000).optional(),
  slotStart: z.string().datetime(),
  gdprAccepted: z.literal(true),
});

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function slotFree(start: Date, end: Date, busy: { start: Date; end: Date }[]) {
  return !busy.some((b) => overlaps(start, end, b.start, b.end));
}

export async function POST(req: Request) {
  try {
    const env = getEnv();
    const rl = getBookRatelimit(env);
    const { success } = await rl.limit(clientIp(req.headers));
    if (!success) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, notes, slotStart } = parsed.data;
    const start = new Date(slotStart);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
    }
    const end = new Date(start.getTime() + env.SLOT_MINUTES * 60_000);
    const now = new Date();
    const { minStart, maxEnd } = bookingWindow(env, now);
    if (start < minStart || end > maxEnd) {
      return NextResponse.json({ error: "slot_out_of_range" }, { status: 400 });
    }

    const calendar = getCalendarClient(env);
    const work = getWorkHoursFromEnv(env);
    const fbMin = new Date(now.getTime() - 5 * 60_000);
    const busyFull = await fetchFreeBusy(calendar, env.GOOGLE_CALENDAR_ID, fbMin, maxEnd);
    if (!slotFree(start, end, busyFull)) {
      return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
    }

    const allowed = buildAvailableSlots(env, work, busyFull, minStart, maxEnd);
    const allowedSet = new Set(allowed.map((d) => d.getTime()));
    if (!allowedSet.has(start.getTime())) {
      return NextResponse.json({ error: "slot_invalid" }, { status: 400 });
    }

    let res;
    try {
      res = await calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Smartapky — konzultace (${name})`,
        description: notes?.trim()
          ? `Klient: ${name} <${email}>\n\nPoznámka:\n${notes.trim()}`
          : `Klient: ${name} <${email}>`,
        start: { dateTime: start.toISOString(), timeZone: env.TIMEZONE },
        end: { dateTime: end.toISOString(), timeZone: env.TIMEZONE },
        attendees: [{ email, displayName: name }, { email: env.OFFICE_EMAIL, displayName: "Smartapky" }],
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 409) {
        return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
      }
      throw err;
    }

    const meetUri =
      res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      res.data.hangoutLink ??
      null;
    const calendarHtmlLink = res.data.htmlLink ?? null;

    if (env.RESEND_API_KEY) {
      try {
        await sendBookingConfirmationEmail({
          resendApiKey: env.RESEND_API_KEY,
          fromEmail: env.BOOKING_FROM_EMAIL,
          fromName: env.BOOKING_FROM_NAME,
          to: email,
          recipientName: name,
          slotStart: start,
          timezone: env.TIMEZONE,
          meetLink: meetUri,
          calendarHtmlLink,
        });
      } catch (err) {
        console.error("[book.confirmation_email]", err);
      }
    }

    return NextResponse.json({
      ok: true,
      eventId: res.data.id ?? null,
      htmlLink: calendarHtmlLink,
      meetLink: meetUri,
    });
  } catch (e) {
    console.error("[book]", e);
    return NextResponse.json({ error: "booking_failed" }, { status: 500 });
  }
}
