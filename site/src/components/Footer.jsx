export function Footer() {
  return (
    <footer className="border-t border-brand-ink/10 bg-brand-deep text-brand-cream">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-[13px] font-extrabold uppercase tracking-[0.22em] text-brand-gold">
              Feasabull Calories
            </p>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-brand-cream/55">
              A free calorie and nutrient calculator for the USF community. Educational estimates
              only — it does not replace advice from a physician or registered dietitian.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-cream/55">
            <a href="#calculator" className="transition-colors hover:text-brand-gold">
              Calculator
            </a>
            <a href="#how" className="transition-colors hover:text-brand-gold">
              Method
            </a>
            <a href="#nutrients" className="transition-colors hover:text-brand-gold">
              Nutrients
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-5">
          <p className="text-[10px] leading-relaxed tracking-wide text-brand-cream/35">
            Unofficial student project. Not affiliated with, sponsored by, or endorsed by the
            University of South Florida. Mascot artwork is original — swap in official Rocky D. Bull
            art any time. Method: Institute of Medicine Dietary Reference Intakes, the same basis as
            the USDA DRI Calculator.
          </p>
        </div>
      </div>
    </footer>
  );
}
