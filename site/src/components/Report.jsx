import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatReport } from "@/lib/dri";

function MacroBars({ macros }) {
  return (
    <div className="space-y-5">
      {macros.map((macro) => (
        <div key={macro.key}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-brand-deep">
                {macro.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-brand-ink/50">{macro.note}</p>
            </div>
            <p className="shrink-0 font-display text-2xl font-black leading-none text-brand-green">
              {macro.grams}
              <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-brand-ink/40">
                g
              </span>
            </p>
          </div>

          {/* Shaded band is the AMDR; the gold dot is where this plan lands. */}
          <div className="relative mt-3 h-2.5 rounded-full bg-brand-mist">
            <div
              className="absolute inset-y-0 rounded-full bg-brand-green/25"
              style={{ left: `${macro.low}%`, right: `${100 - macro.high}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-cream bg-brand-gold shadow-[0_2px_6px_rgba(20,32,28,0.25)]"
              style={{ left: `${macro.suggested}%` }}
            />
          </div>

          <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-ink/40">
            <span>{macro.low}%</span>
            <span>acceptable range</span>
            <span>{macro.high}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NutrientChecklist({ rows, sex, age }) {
  return (
    <div className="rounded-[2rem] border border-brand-ink/10 bg-white/65 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
            The checklist
          </p>
          <h3 className="mt-1.5 font-display text-xl font-extrabold tracking-tight text-brand-deep sm:text-2xl">
            Daily vitamin &amp; mineral targets
          </h3>
        </div>
        <span className="rounded-full bg-brand-green/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-green">
          {"DRI · "}
          {sex === "male" ? "male" : "female"} {age}
        </span>
      </div>

      <div className="mt-5 grid gap-x-10 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-baseline justify-between gap-4 border-b border-dashed border-brand-ink/12 py-2.5"
          >
            <div>
              <p className="text-[13px] font-semibold text-brand-deep">{row.name}</p>
              {row.note ? (
                <p className="mt-0.5 text-[10px] text-brand-ink/45">{row.note}</p>
              ) : null}
            </div>
            <p className="shrink-0 font-display text-[13px] font-bold text-brand-ink">
              {row.amount}
              <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-brand-ink/40">
                {row.unit}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyReport() {
  const bullets = [
    "Daily calorie target from the EER equation",
    "Protein, carb and fat grams with ranges",
    "BMI, fiber and water targets",
    "19 vitamin and mineral goals for your age",
  ];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-brand-green/30 bg-brand-mist/60 p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
        Awaiting numbers
      </p>
      <h3 className="mt-3 max-w-[16ch] font-display text-2xl font-extrabold leading-tight tracking-tight text-brand-deep">
        Your report lands here.
      </h3>
      <ul className="mt-5 space-y-2.5">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-2.5 text-[13px] leading-snug text-brand-ink/65"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Report({ plan, summary, age, sex, onGoalChange, resultsRef }) {
  if (!plan) {
    return (
      <div ref={resultsRef} className="scroll-mt-28">
        <EmptyReport />
      </div>
    );
  }

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(formatReport(plan, summary));
      toast.success("Report copied to your clipboard");
    } catch {
      toast.error("Couldn't copy — select the text instead");
    }
  };

  const tiles = [
    { label: "BMI", value: plan.bmi.value, unit: plan.bmi.category },
    { label: "Water", value: plan.water.liters, unit: "liters total" },
    { label: "Fiber", value: plan.fiber, unit: "grams" },
  ];

  return (
    <div ref={resultsRef} className="scroll-mt-28 space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-brand-deep p-6 text-brand-cream sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-gold/20 blur-2xl"
        />
        <div className="relative">
          <div className="flex flex-wrap gap-1.5">
            {plan.goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => onGoalChange(goal.id)}
                aria-pressed={goal.id === plan.goal.id}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                  goal.id === plan.goal.id
                    ? "bg-brand-gold text-brand-deep"
                    : "bg-white/10 text-brand-cream/65 hover:bg-white/20 hover:text-brand-cream",
                )}
              >
                {goal.label}
              </button>
            ))}
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-brand-gold">
            Your daily target
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-6xl font-black leading-none tracking-[-0.04em] sm:text-7xl">
              {plan.calories}
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand-cream/60">
              kcal
            </span>
          </p>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-brand-cream/60">
            {plan.goal.blurb}
            {". Maintenance sits at "}
            {plan.maintenance}
            {" kcal — the goal pills above shift the target by 500 down or 350 up."}
          </p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-cream/55">
            <span>{summary}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-brand-ink/10 bg-white/65 p-6 sm:p-7">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-extrabold tracking-tight text-brand-deep">
            Macros
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-ink/40">
            Grams / day
          </span>
        </div>
        <MacroBars macros={plan.macros} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl border border-brand-ink/10 bg-white/65 px-4 py-4 text-center"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-brand-ink/45">
              {tile.label}
            </p>
            <p className="mt-1.5 font-display text-2xl font-black leading-none text-brand-deep">
              {tile.value}
            </p>
            <p className="mt-1 text-[10px] leading-tight text-brand-ink/45">{tile.unit}</p>
          </div>
        ))}
      </div>

      <div id="nutrients" className="scroll-mt-28">
        <NutrientChecklist rows={plan.nutrients} sex={sex} age={age} />
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-brand-ink/10 bg-white/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="max-w-md text-[11px] leading-relaxed text-brand-ink/50">
          Estimates from the Institute of Medicine DRI equations, rounded to the nearest 10
          calories. Individual needs vary — talk to a clinician or dietitian before big changes.
        </p>
        <button
          type="button"
          onClick={copyReport}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-brand-green/30 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-green transition-colors hover:bg-brand-green hover:text-brand-cream"
        >
          Copy report
        </button>
      </div>
    </div>
  );
}
