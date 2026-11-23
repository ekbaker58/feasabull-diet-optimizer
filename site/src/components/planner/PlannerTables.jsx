import { cn } from "@/lib/utils";
import { fmt, money, pct, buyAmount, NUTRIENT_LABELS } from "@/lib/plannerFormat";
import { thClass, tdClass } from "@/components/planner/PlannerPlan";

const numeric = "text-right tabular-nums";

/**
 * The parametric LP, as a shape. One Simplex solve per variety level: tighten
 * the rule and the feasible set shrinks, so the cost rises. The budget is drawn
 * across it, and the chosen level is the tallest bar still left of the line.
 */
export function BudgetChart({ levels, chosen, budget }) {
  const costs = levels.map((l) => l.costPerWeek).filter((c) => c != null);
  if (!costs.length) return null;
  const max = Math.max(...costs, budget || 0) * 1.08;
  const budgetAt = budget ? (budget / max) * 100 : null;

  return (
    <div>
      <div className="relative">
        {budgetAt != null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-brand-deep/45"
            style={{ left: `calc(10.25rem + (100% - 15.5rem) * ${budgetAt / 100})` }}
          />
        ) : null}

        <ul className="flex flex-col gap-2">
          {levels.map((level) => {
            const isChosen = Math.abs(level.variety - chosen) < 1e-9;
            const cost = level.costPerWeek;
            const fits = cost != null && budget ? cost <= budget + 1e-9 : null;
            const label =
              level.variety === 1 ? "1 food / group" : `${level.foodsPerGroup} foods / group`;
            return (
              <li
                key={level.variety}
                className="flex items-center gap-3"
                aria-label={
                  cost == null
                    ? `${label}: no plan possible`
                    : `${label}: ${money(cost)} per week${fits === false ? ", over budget" : ""}${isChosen ? ", your plan" : ""}`
                }
              >
                <span
                  className={cn(
                    "w-[9.5rem] shrink-0 text-[12.5px] leading-tight",
                    isChosen ? "font-bold text-brand-deep" : "text-brand-ink/60",
                  )}
                >
                  {label}
                  {isChosen ? (
                    <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-brand-green">
                      ◀ your plan
                    </span>
                  ) : null}
                </span>

                <span className="relative h-5 flex-1 overflow-hidden rounded-full bg-brand-mist">
                  {cost != null ? (
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-[width] duration-300",
                        isChosen
                          ? "bg-brand-green"
                          : fits === false
                            ? "bg-red-700/35"
                            : "bg-brand-green/35",
                      )}
                      style={{ width: `${(cost / max) * 100}%` }}
                    />
                  ) : null}
                </span>

                <span
                  className={cn(
                    "w-[4.5rem] shrink-0 text-right text-[12.5px] tabular-nums",
                    isChosen
                      ? "font-bold text-brand-deep"
                      : fits === false
                        ? "text-red-700"
                        : "text-brand-ink/60",
                  )}
                >
                  {cost != null ? money(cost) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-3 text-[12px] leading-snug text-brand-ink/55">
        {budget
          ? `The dashed line is your ${money(budget, 0)} budget. Tighter variety costs more, so the plan is the most varied bar that still fits.`
          : "Tighter variety costs more. Enter a weekly budget and the planner picks the most varied level that fits."}
      </p>
    </div>
  );
}

/** Grams as eaten -> grams as bought -> whole packages at the register. */
export function ShoppingList({ shopping, foodsById, metric }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className={thClass}>Buy</th>
            <th className={cn(thClass, numeric)}>Packages</th>
            <th className={cn(thClass, numeric)}>Register</th>
          </tr>
        </thead>
        <tbody>
          {shopping.items.map((item) => (
            <tr key={item.id}>
              <td className={tdClass}>
                <span className="font-semibold text-brand-deep">{item.food}</span>
                <span className="mt-0.5 block text-[11.5px] text-brand-ink/55">
                  {foodsById.get(item.id)?.product || ""} · {money(item.price)} ·{" "}
                  {buyAmount(item.buyG, metric)} a week
                </span>
              </td>
              <td className={cn(tdClass, numeric)}>{item.packages}</td>
              <td className={cn(tdClass, numeric)}>{money(item.checkout)}</td>
            </tr>
          ))}
          <tr className="font-bold text-brand-deep">
            <td className={tdClass}>First trip</td>
            <td className={tdClass} />
            <td className={cn(tdClass, numeric)}>{money(shopping.firstTrip)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** A·x against b, row by row. Anything missed is sorted to the top and flagged. */
export function TargetCheck({ rows }) {
  const ordered = [...rows].sort((a, b) => Number(a.met) - Number(b.met));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className={thClass}>Target</th>
            <th className={cn(thClass, numeric)}>Plan</th>
            <th className={cn(thClass, numeric)}>Target</th>
            <th className={cn(thClass, numeric)}>Met</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={row.label} className={row.met ? undefined : "bg-red-50/70"}>
              <td className={tdClass}>
                {NUTRIENT_LABELS[row.label] || row.label}{" "}
                <span className="text-brand-ink/40">({row.unit})</span>
              </td>
              <td className={cn(tdClass, numeric)}>{row.value}</td>
              <td className={cn(tdClass, numeric)}>{row.target}</td>
              <td className={cn(tdClass, numeric, row.met ? "text-brand-green" : "text-red-700")}>
                {row.met ? "✓" : "✗"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The LP itself, printed. This is the part the course is actually about. */
export function ShowTheMath({ result, targets, realistic, includeWaste, nutrientCount, foodsById }) {
  const chosen = result.model.foods
    .map((id, j) => ({ id, x: result.model.x[j], c: result.model.c[j] }))
    .filter((e) => e.x > 1e-6);
  const lo = fmt(Math.floor(targets.calories * 0.95));
  const hi = fmt(Math.ceil(targets.calories * 1.05));

  return (
    <>
      <p className="text-[12px] text-brand-ink/55">
        The same model as the spreadsheet&apos;s Matrix Model sheet, solved here in your browser.
      </p>

      <pre className="mt-4 overflow-x-auto rounded-2xl bg-brand-deep p-5 text-[11.5px] leading-relaxed text-brand-cream/85">
{`minimize    cᵀx                      cost per day, c = $ per 100 g as eaten${
        realistic && includeWaste ? " (incl. waste)" : ""
      }
subject to  b_min ≤ A·x ≤ b_max      A is ${nutrientCount} nutrients × ${result.model.foods.length} foods allowed by the ${result.diet} diet
${
  realistic
    ? `            d_min ≤ D·x ≤ d_max      D = Dietary Guidelines servings per 100 g (${result.level}-kcal pattern)
            refined ≤ whole grains, saturated fat ≤ 10% of kcal, variety v = ${pct(result.variety)}
`
    : ""
}            meal, protein-share and food-group rows (${result.model.constraints} rows in total)
            0 ≤ x ≤ u                x = food amounts in 100 g units, as eaten

b from step 2: kcal ${lo}–${hi}, protein ≥ ${targets.proteinMin} g, fiber ≥ ${targets.fiber} g,
               calcium ≥ ${targets.calcium} mg, iron ≥ ${targets.iron} mg, potassium ≥ ${targets.potassium} mg,
               vitamin C ≥ ${targets.vitc} mg, sodium ≤ ${targets.sodium} mg

Simplex: ${result.pivots} pivots (Gauss-Jordan row operations). ${chosen.length} of ${result.model.foods.length} foods are non-zero.`}
      </pre>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className={thClass}>Food</th>
              <th className={cn(thClass, numeric)}>x (100 g)</th>
              <th className={cn(thClass, numeric)}>c ($/100 g)</th>
              <th className={cn(thClass, numeric)}>c·x</th>
            </tr>
          </thead>
          <tbody>
            {chosen.map((entry) => (
              <tr key={entry.id}>
                <td className={tdClass}>{foodsById.get(entry.id)?.name || entry.id}</td>
                <td className={cn(tdClass, numeric, "font-mono")}>{entry.x.toFixed(3)}</td>
                <td className={cn(tdClass, numeric, "font-mono")}>{entry.c.toFixed(3)}</td>
                <td className={cn(tdClass, numeric, "font-mono")}>
                  ${(entry.c * entry.x).toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="font-bold text-brand-deep">
              <td className={tdClass}>cᵀx</td>
              <td className={tdClass} />
              <td className={tdClass} />
              <td className={cn(tdClass, numeric, "font-mono")}>{result.costPerDay.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-brand-ink/55">
        Targets: IOM Estimated Energy Requirement and Dietary Reference Intakes, the same equations
        as the Calculator tab. Nutrients: USDA SR28. Prices: Walmart, Oct 2026, or BLS U.S. city
        averages. Amounts are as eaten — cooked rice, roasted chicken — and the shopping list
        converts them back to what you buy.
      </p>
    </>
  );
}
