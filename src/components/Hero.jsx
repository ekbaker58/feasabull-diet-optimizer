import { Mascot } from "@/components/Mascot";
import bullFlexing from "@/assets/mascots/bull-flexing.jpg";
import bullBarbell from "@/assets/mascots/bull-barbell.jpg";
import bullSmoothie from "@/assets/mascots/bull-smoothie.jpg";
import bullBadge from "@/assets/mascots/bull-badge.jpg";

const STATS = [
  { value: "18", label: "nutrients mapped" },
  { value: "4", label: "activity levels" },
  { value: "60s", label: "to a full report" },
  { value: "$0", label: "no account needed" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_85%_-10%,rgba(207,196,147,0.55),transparent_60%),radial-gradient(90%_70%_at_0%_100%,rgba(0,103,71,0.10),transparent_65%)]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-6">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-white/60 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
              University of South Florida
            </span>
          </div>

          <h1 className="mt-6 max-w-[15ch] font-display text-[13vw] font-black leading-[0.88] tracking-[-0.035em] text-brand-deep sm:text-6xl lg:text-[68px]">
            Your daily numbers,
            <span className="mt-1 block font-serif-display italic text-brand-green">
              without the guesswork.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-brand-ink/70">
            Feasabull Calories runs the same equations as the USDA DRI calculator. Tell it your
            height, weight, age and how much you move, and it hands back your calorie target, macro
            split, BMI and a full vitamin and mineral checklist.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#calculator"
              className="group inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-brand-cream transition-all hover:bg-brand-deep"
            >
              Run my numbers
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-brand-ink/15 px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-brand-deep transition-colors hover:border-brand-green/40 hover:text-brand-green"
            >
              How it works
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl font-black leading-none text-brand-deep">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-end gap-2 lg:hidden">
            <Mascot src={bullFlexing} alt="Bull mascot flexing" rotate={-4} className="h-28 w-28" />
            <Mascot
              src={bullSmoothie}
              alt="Bull mascot with a smoothie"
              rotate={5}
              float="slow"
              className="h-24 w-24"
            />
            <Mascot
              src={bullBarbell}
              alt="Bull mascot lifting a barbell"
              rotate={-3}
              className="h-24 w-24"
            />
          </div>
        </div>

        <div className="relative mx-auto hidden aspect-square w-full max-w-[520px] lg:block">
          <Mascot
            src={bullBadge}
            alt="Feasabull bull badge"
            rotate={-6}
            round
            float="slow"
            className="absolute right-2 top-0 h-32 w-32"
          />
          <Mascot
            src={bullBarbell}
            alt="Bull mascot lifting a barbell"
            rotate={-7}
            float="slow"
            className="absolute left-0 top-16 h-44 w-44"
          />
          <Mascot
            src={bullSmoothie}
            alt="Bull mascot with a smoothie"
            rotate={6}
            className="absolute bottom-6 right-0 z-10 h-40 w-40"
          />
          <Mascot
            src={bullFlexing}
            alt="Bull mascot flexing"
            rotate={-2}
            className="absolute bottom-0 left-6 h-[380px] w-[380px]"
          />
        </div>
      </div>
    </section>
  );
}
