import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0d0d0c]/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-[60px] w-full max-w-[1200px] items-center justify-between gap-6 px-8">
        <Link
          href="https://www.smartapky.cz/"
          className="inline-flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.02em] text-zinc-100 transition hover:text-white"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Smartapky — domů"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-white p-[3px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.14)]"
            aria-hidden
          >
            <Image
              src="/header_logo.png"
              alt=""
              width={30}
              height={30}
              className="block h-full w-full object-contain object-center"
              priority
            />
          </span>
          <span>smartapky</span>
        </Link>
        <span className="hidden text-[13px] text-zinc-500 sm:inline">Rezervace konzultace</span>
      </div>
    </header>
  );
}
