import { DateTime } from "luxon";

type SendBookingConfirmationParams = {
  resendApiKey: string;
  fromEmail: string;
  fromName: string;
  to: string;
  recipientName: string;
  slotStart: Date;
  timezone: string;
  meetLink: string | null;
  calendarHtmlLink: string | null;
};

function formatSlotHuman(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBookingConfirmationEmail(params: SendBookingConfirmationParams): Promise<void> {
  const when = formatSlotHuman(params.slotStart, params.timezone);
  const subjectDate = DateTime.fromJSDate(params.slotStart)
    .setZone(params.timezone)
    .toFormat("d. M. yyyy HH:mm");
  const subject = `Potvrzení konzultace Smartapky - ${subjectDate}`;
  const safeName = escapeHtml(params.recipientName);
  const from = `${params.fromName} <${params.fromEmail}>`;

  const meetBlock = params.meetLink
    ? `<p><strong>Odkaz na Google Meet:</strong><br><a href="${escapeHtml(params.meetLink)}">${escapeHtml(params.meetLink)}</a></p>`
    : "<p>Odkaz na Google Meet najdete v kalendarove pozvance od Google.</p>";
  const calendarBlock = params.calendarHtmlLink
    ? `<p><a href="${escapeHtml(params.calendarHtmlLink)}">Otevrit udalost v Google Kalendari</a></p>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; line-height: 1.55;">
    <p>Dobry den, ${safeName},</p>
    <p>dekujeme za rezervaci. Konzultace je domluvena na:</p>
    <p><strong>${escapeHtml(when)}</strong> (${escapeHtml(params.timezone)})</p>
    ${meetBlock}
    ${calendarBlock}
    <p>Tesime se na hovor.<br>Tym Smartapky</p>
  </body>
</html>`;

  const text = [
    `Dobry den, ${params.recipientName},`,
    "",
    "dekujeme za rezervaci. Konzultace je domluvena na:",
    `${when} (${params.timezone})`,
    "",
    params.meetLink ? `Google Meet: ${params.meetLink}` : "Odkaz na Google Meet najdete v kalendarove pozvance od Google.",
    params.calendarHtmlLink ? `Google Kalendar: ${params.calendarHtmlLink}` : "",
    "",
    "Tesime se na hovor.",
    "Tym Smartapky",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      reply_to: params.fromEmail,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend failed with ${response.status}: ${body.slice(0, 500)}`);
  }
}
