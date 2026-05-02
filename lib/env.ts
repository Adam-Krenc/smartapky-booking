import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REFRESH_TOKEN: z.string().min(1),
  GOOGLE_CALENDAR_ID: z.string().min(1),
  OFFICE_EMAIL: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? s.trim() : "obchod@smartapky.cz"))
    .pipe(z.string().email()),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  TIMEZONE: z.string().default("Europe/Prague"),
  SLOT_MINUTES: z.coerce.number().int().positive().default(60),
  MIN_BOOKING_LEAD_HOURS: z.coerce.number().int().nonnegative().default(24),
  MAX_BOOKING_DAYS: z.coerce.number().int().positive().default(30),
  /** JSON: ISO weekday 1=Mon … 7=Sun → [startHour, endHour] e.g. {"1":[9,17],"2":[9,17]} */
  WORK_HOURS: z.string().optional(),
  BOOK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  BOOK_RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  NEXT_PUBLIC_GDPR_PDF_URL: z
    .string()
    .url()
    .default("https://www.smartapky.cz/assets/legal/GDPR.pdf"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache() {
  cached = null;
}
