export type BookLang = "cs" | "en";

export const BOOK_COPY: Record<
  BookLang,
  {
    title: string;
    subtitle: string;
    pickSlot: string;
    noSlots: string;
    loadError: string;
    next: string;
    back: string;
    name: string;
    email: string;
    notes: string;
    notesOptional: string;
    gdprLabel: string;
    gdprLink: string;
    reviewTitle: string;
    submit: string;
    successTitle: string;
    successBody: string;
    meetLabel: string;
    calendarLabel: string;
    errorGeneric: string;
    langCs: string;
    langEn: string;
  }
> = {
  cs: {
    title: "Rezervace konzultace",
    subtitle: "Vyberte volný termín (60 minut, online Google Meet).",
    pickSlot: "Dostupné termíny",
    noSlots: "Momentálně nejsou k dispozici žádné termíny. Zkuste to prosím později nebo napište na obchod@smartapky.cz.",
    loadError: "Nepodařilo se načíst termíny. Zkuste obnovit stránku.",
    next: "Pokračovat",
    back: "Zpět",
    name: "Jméno",
    email: "E-mail",
    notes: "Poznámka",
    notesOptional: "volitelné",
    gdprLabel: "Souhlasím se zpracováním osobních údajů za účelem domluvení schůzky dle",
    gdprLink: "zásad ochrany osobních údajů",
    reviewTitle: "Shrnutí rezervace",
    submit: "Potvrdit rezervaci",
    successTitle: "Rezervace vytvořena",
    successBody: "Pozvánku do kalendáře a odkaz na Meet najdete v e-mailu. Tým Smartapky zároveň obdrží kopii.",
    meetLabel: "Google Meet",
    calendarLabel: "Událost v kalendáři",
    errorGeneric: "Rezervaci se nepodařilo dokončit. Zkuste jiný termín nebo nás kontaktujte e-mailem.",
    langCs: "CZ",
    langEn: "EN",
  },
  en: {
    title: "Book a consultation",
    subtitle: "Pick a free slot (60 minutes, Google Meet online).",
    pickSlot: "Available slots",
    noSlots: "No slots are available right now. Please try again later or email obchod@smartapky.cz.",
    loadError: "Could not load slots. Try refreshing the page.",
    next: "Continue",
    back: "Back",
    name: "Name",
    email: "Email",
    notes: "Note",
    notesOptional: "optional",
    gdprLabel: "I agree to the processing of personal data for arranging this meeting, as described in the",
    gdprLink: "privacy policy",
    reviewTitle: "Review booking",
    submit: "Confirm booking",
    successTitle: "Booking created",
    successBody: "Check your inbox for the calendar invite and Meet link. Smartapky will receive a copy as well.",
    meetLabel: "Google Meet",
    calendarLabel: "Calendar event",
    errorGeneric: "We could not complete the booking. Try another slot or email us.",
    langCs: "CZ",
    langEn: "EN",
  },
};
