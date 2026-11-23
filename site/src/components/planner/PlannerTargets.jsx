import { useState } from "react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/plannerFormat";

/**
 * Step 2 of the chain, compressed: the person as the b vector of the linear
 * program. The Calculator tab already showed these in full, so here the two
 * that drive the plan sit on the surface and the rest open on request.
 */
export function PlannerTargets({ report, who, isExample = false }) {
  const [open, setOpen] = useState(false);
  const t = report.optimizerTargets;

  const rest = [
    ["Calcium", "at least", `${fmt(t.calcium)} mg`],
    ["Iron", "at least", `${fmt(t.iron)} mg`],
    ["Potassium", "at least", `${fmt(t.potassium)} mg`],
    ["Vitamin C", "at least", `${fmt(t.vitc)} mg`],
    ["Sodium", "under", `${fmt(t.sodium)} mg`],
  ];
  const delta = report.calories - report.maintenance;

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-brand-deep p-5 text-brand-cream sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-gold/20 blur-2xl"
      />
      <div className="relative">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.18em] text-brand-gold">
            Daily targets
            {isExample ? (
              <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
                Example
              </span>
            ) : null}
          </p>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-cream/70">
            {who}
          </p>
        </div>

        {isExample ? (
          <p className="mt-2 text-[12px] leading-snug text-brand-cream/60">
            These are a sample person&apos;s numbers so you can see a finished plan. Change
            anything on the left and they become yours.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-black leading-none tracking-[-0.03em] sm:text-5xl">
              {fmt(report.calories)}
            </span>
            <span className="font-display text-[12px] font-bold uppercase tracking-[0.18em] text-brand-cream/60">
              kcal
            </span>
          </p>

          <Chip>≥ {fmt(t.proteinMin)} g protein</Chip>
          <Chip>≥ {fmt(t.fiber)} g fiber</Chip>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="rounded-full border border-white/25 px-3 py-1.5 text-[11.5px] font-semibold text-brand-cream/75 transition-colors hover:border-brand-gold hover:text-brand-gold"
          >
            {open ? "Fewer" : `+${rest.length} more`}{" "}
            <span aria-hidden="true" className={cn("inline-block", open && "rotate-180")}>
              ▾
            </span>
          </button>
        </div>

        {open ? (
          <>
            <dl className="mt-4 border-t border-white/15 pt-1">
              {rest.map(([name, qualifier, value]) => (
                <div
                  key={name}
                  className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2"
                >
                  <dt className="text-[13px] text-brand-cream/70">
                    <span className="font-semibold text-brand-cream">{name}</span> {qualifier}
                  </dt>
                  <dd className="shrink-0 font-display text-[14px] font-bold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-brand-cream/55">
              Maintenance {fmt(report.maintenance)} kcal
              {delta !== 0
                ? `, ${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))} for your goal`
                : ""}
              . Protein is 1.6 g per kg, kept within 10–30% of calories. BMI {report.bmi.value} (
              {report.bmi.category}).
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="rounded-full bg-white/12 px-3 py-1.5 text-[12.5px] font-semibold text-brand-cream/85">
      {children}
    </span>
  );
}
