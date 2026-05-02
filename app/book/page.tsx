import { BookingForm } from "./booking-form";

export const metadata = {
  title: "Rezervace konzultace | Smartapky",
  description: "Vyberte termín konzultace (Google Meet).",
};

export default function BookPage() {
  const gdprPdfUrl = process.env.NEXT_PUBLIC_GDPR_PDF_URL ?? "https://www.smartapky.cz/assets/legal/GDPR.pdf";

  return (
    <main className="flex flex-1 flex-col px-4 py-12">
      <BookingForm gdprPdfUrl={gdprPdfUrl} />
    </main>
  );
}
