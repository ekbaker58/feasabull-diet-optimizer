import { Mascot } from "@/components/Mascot";
import bullSmoothie from "@/assets/mascots/bull-smoothie.jpg";

const STEPS = [
  {
    n: "01",
    title: "Calories from the EER equation",
    body: "Your height, weight, age, sex and activity multiplier feed the Institute of Medicine's Estimated Energy Requirement — the same formula behind the USDA DRI calculator, adjusted for your goal.",
  },
  {
    n: "02",
    title: "Macros in acceptable ranges",
    body: "Protein, carbohydrate and fat land inside the Acceptable Macronutrient Distribution Ranges, converted to grams so you can actually use them at the dining hall.",
  },
  {
    n: "03",
    title: "Every vitamin and mineral mapped",
    body: "Recommended intakes shift with age and sex — iron and calcium especially. Your report lists all 19 targets for your exact bracket, plus fiber and water.",
  },
];

export function Method() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-brand-ink/10 bg-brand-mist/50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
              The method
            </p>
            <h2 className="mt-2 max-w-sm font-display text-3xl font-black leading-[0.95] tracking-tight text-brand-deep sm:text-4xl">
              No fads, no{" "}
              <span className="font-serif-display italic text-brand-green">detox tea.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-brand-ink/60">
              Everything here comes from published Dietary Reference Intakes. Nothing is guessed,
              and nothing is sold to you.
            </p>
            <Mascot
              src={bullSmoothie}
              alt="Bull mascot with a smoothie"
              rotate={-5}
              float="slow"
              className="mt-6 h-40 w-40"
            />
          </div>

          <div className="space-y-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="group rounded-[1.75rem] border border-brand-ink/10 bg-brand-cream/80 p-6 transition-colors hover:border-brand-green/30"
              >
                <div className="flex items-start gap-5">
                  <span className="font-display text-[11px] font-black tracking-[0.16em] text-brand-gold">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-extrabold leading-snug tracking-tight text-brand-deep">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-brand-ink/60">
                      {step.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <p className="px-2 pt-2 text-[11px] leading-relaxed text-brand-ink/45">
              Source: Dietary Reference Intakes for Energy, Macronutrients, Vitamins and Minerals
              (National Academies of Sciences, Engineering, and Medicine).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
