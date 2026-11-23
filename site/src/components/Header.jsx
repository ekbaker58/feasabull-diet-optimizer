export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-ink/10 bg-brand-cream/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-green font-display text-sm font-black tracking-tight text-brand-gold">
            FC
          </span>
          <span className="font-display text-[13px] font-extrabold uppercase leading-none tracking-[0.2em] text-brand-deep">
            Feasabull
            <span className="block text-[9px] font-semibold tracking-[0.3em] text-brand-ink/45">
              Calories
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-[13px] font-medium text-brand-ink/60 md:flex">
          <a href="#calculator" className="transition-colors hover:text-brand-green">
            Calculator
          </a>
          <a href="#how" className="transition-colors hover:text-brand-green">
            The method
          </a>
          <a href="#nutrients" className="transition-colors hover:text-brand-green">
            Nutrients
          </a>
        </nav>

        <a
          href="#calculator"
          className="rounded-full bg-brand-green px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-cream transition-colors hover:bg-brand-deep"
        >
          Run numbers
        </a>
      </div>
    </header>
  );
}
