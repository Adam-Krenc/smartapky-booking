import { BookingForm } from "./booking-form";

export const metadata = {
  title: "Rezervace konzultace | Smartapky",
  description: "Vyberte termín konzultace (Google Meet).",
};

export default function BookPage() {
  const gdprPdfUrl = process.env.NEXT_PUBLIC_GDPR_PDF_URL ?? "https://www.smartapky.cz/assets/legal/GDPR.pdf";

  return (
    <main className="flex w-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1200px] px-8 py-14 lg:py-20">
        <BookingForm gdprPdfUrl={gdprPdfUrl} />
      </div>
    </main>
  );
}
