const GDPR_URL = process.env.NEXT_PUBLIC_GDPR_PDF_URL ?? "https://www.smartapky.cz/assets/legal/GDPR.pdf";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-[#0a0a0a]">
      <div className="mx-auto w-full max-w-[1200px] px-8 py-14">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-100">Smartapky</p>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
              AI automatizace pro malé a střední firmy — rezervace bez závazku, první call zdarma.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-600">Kontakt</p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a className="transition hover:text-emerald-400" href="mailto:obchod@smartapky.cz">
                  obchod@smartapky.cz
                </a>
              </li>
              <li>
                <a className="transition hover:text-emerald-400" href="tel:+420605822363">
                  +420 605 822 363
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-600">Právní</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
              <li>
                <a className="transition hover:text-emerald-400" href={GDPR_URL} target="_blank" rel="noopener noreferrer">
                  Ochrana osobních údajů (PDF)
                </a>
              </li>
              <li>
                <a
                  className="transition hover:text-emerald-400"
                  href="https://www.smartapky.cz/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  smartapky.cz
                </a>
              </li>
              <li>
                <a
                  className="transition hover:text-emerald-400"
                  href="https://www.linkedin.com/company/smartapky"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-8 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 smartapky.cz — IČO 17634199</span>
          <span className="text-zinc-600">Všechny systémy v provozu</span>
        </div>
      </div>
    </footer>
  );
}
