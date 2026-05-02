import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import type { AppEnv } from "./env";

function getOAuth(env: AppEnv) {
  return new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, undefined);
}

export function getCalendarClient(env: AppEnv): calendar_v3.Calendar {
  const auth = getOAuth(env);
  auth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: "v3", auth });
}

export type BusyBlock = { start: Date; end: Date };

export async function fetchFreeBusy(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<BusyBlock[]> {
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    },
  });
  const busy = res.data.calendars?.[calendarId]?.busy ?? [];
  return busy
    .filter((b): b is { start?: string | null; end?: string | null } => Boolean(b?.start && b?.end))
    .map((b) => ({
      start: new Date(b.start as string),
      end: new Date(b.end as string),
    }));
}
