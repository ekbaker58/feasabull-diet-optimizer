import { fmt } from "@/lib/plannerFormat";

/**
 * Step 2 of the chain: the person turned into the b vector of the linear
 * program. Same equations as the Calculator tab — both call personTargets.js.
 */
export function PlannerTargets({ report, who }) {
  const t = report.optimizerTargets;
  const rows = [
    ["Protein", "at least", `${fmt(t.proteinMin)} g`],
    ["Fiber", "at least", `${fmt(t.fiber)} g`],
    ["Calcium", "at least", `${fmt(t.calcium)} mg`],
    ["Iron", "at least", `${fmt(t.iron)} mg`],
    ["Potassium", "at least", `${fmt(t.potassium)} mg`],
    ["Vitamin C", "at least", `${fmt(t.vitc)} mg`],
    ["Sodium", "under", `${fmt(t.sodium)} mg`],
  ];
  const delta = report.calories - report.maintenance;

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-brand-deep p-6 text-brand-cream sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-gold/20 blur-2xl"
      />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-gold">
          Daily targets
        </p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-cream/55">
          {who}
        </p>

        <p className="mt-5 flex items-baseline gap-2">
          <span className="font-display text-6xl font-black leading-none tracking-[-0.04em] sm:text-7xl">
            {fmt(report.calories)}
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand-cream/60">
            kcal
          </span>
        </p>

        <dl className="mt-6 border-t border-white/15 pt-1">
          {rows.map(([name, qualifier, value]) => (
            <div
              key={name}
              className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5"
            >
              <dt className="text-[13px] text-brand-cream/70">
                <span className="font-semibold text-brand-cream">{name}</span> {qualifier}
              </dt>
              <dd className="shrink-0 font-display text-[14px] font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[11px] leading-relaxed text-brand-cream/50">
          Maintenance {fmt(report.maintenance)} kcal
          {delta !== 0
            ? `, ${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))} for your goal`
            : ""}
          . Protein is 1.6 g per kg, kept within 10–30% of calories. BMI {report.bmi.value} (
          {report.bmi.category}).
        </p>
      </div>
    </div>
  );
}
