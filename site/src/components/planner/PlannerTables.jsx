import { cn } from "@/lib/utils";
import { fmt, money, pct, buyAmount, NUTRIENT_LABELS } from "@/lib/plannerFormat";
import { thClass, tdClass } from "@/components/planner/PlannerPlan";

const numeric = "text-right tabular-nums";

/**
 * The parametric LP, as a table. One Simplex solve per variety level; the
 * budget picks the most varied row that fits.
 */
export function BudgetLevels({ levels, chosen, budget }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            <th className={thClass}>Variety rule</th>
            <th className={cn(thClass, numeric)}>Foods per group</th>
            <th className={cn(thClass, numeric)}>Cost / week</th>
            <th className={cn(thClass, numeric)}>Fits budget</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => {
            const isChosen = Math.abs(level.variety - chosen) < 1e-9;
            const fits =
              level.costPerWeek != null && budget ? level.costPerWeek <= budget + 1e-9 : null;
            return (
              <tr key={level.variety} className={isChosen ? "font-bold" : undefined}>
                <td className={tdClass}>
                  {level.variety === 1
                    ? "None (cheapest)"
                    : `≤ ${pct(level.variety)} of a group from one food`}
                  {isChosen ? (
                    <span className="ml-2 text-[11px] uppercase tracking-[0.1em] text-brand-green">
                      ← your plan
                    </span>
                  ) : null}
                </td>
                <td className={cn(tdClass, numeric)}>
                  {level.variety === 1 ? "1+" : `${level.foodsPerGroup}+`}
                </td>
                <td className={cn(tdClass, numeric)}>
                  {level.costPerWeek != null ? money(level.costPerWeek) : "not possible"}
                </td>
                <td
                  className={cn(
                    tdClass,
                    numeric,
                    fits ? "text-brand-green" : fits === false ? "text-red-700" : "",
                  )}
                >
                  {fits == null ? "—" : fits ? "✓" : "✗"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
            <th className={cn(thClass, numeric)}>Needed / week</th>
            <th className={cn(thClass, numeric)}>Packages</th>
            <th className={cn(thClass, numeric)}>Register</th>
            <th className={cn(thClass, numeric)}>Lasts</th>
          </tr>
        </thead>
        <tbody>
          {shopping.items.map((item) => (
            <tr key={item.id}>
              <td className={tdClass}>
                <span className="font-semibold text-brand-deep">{item.food}</span>
                <span className="mt-0.5 block text-[11.5px] text-brand-ink/55">
                  {foodsById.get(item.id)?.product || ""} · {money(item.price)}
                </span>
              </td>
              <td className={cn(tdClass, numeric)}>{buyAmount(item.buyG, metric)}</td>
              <td className={cn(tdClass, numeric)}>{item.packages}</td>
              <td className={cn(tdClass, numeric)}>{money(item.checkout)}</td>
              <td className={cn(tdClass, numeric)}>
                {item.weeks >= 1.95 ? `${fmt(item.weeks)} wk` : "1 wk"}
              </td>
            </tr>
          ))}
          <tr className="font-bold text-brand-deep">
            <td className={tdClass}>First trip</td>
            <td className={tdClass} />
            <td className={tdClass} />
            <td className={cn(tdClass, numeric)}>{money(shopping.firstTrip)}</td>
            <td className={tdClass} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** A·x against b, row by row, with a tick when the constraint is satisfied. */
export function TargetCheck({ rows }) {
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
          {rows.map((row) => (
            <tr key={row.label}>
              <td className={tdClass}>
                {NUTRIENT_LABELS[row.label] || row.label}{" "}
                <span className="text-brand-ink/40">({row.unit})</span>
              </td>
              <td className={cn(tdClass, numeric)}>{row.value}</td>
              <td className={cn(tdClass, numeric)}>{row.target}</td>
              <td
                className={cn(tdClass, numeric, row.met ? "text-brand-green" : "text-red-700")}
              >
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
    <details className="group rounded-[2rem] border border-brand-ink/10 bg-white/55 p-6 sm:p-7">
      <summary className="flex cursor-pointer items-center justify-between gap-3 marker:content-['']">
        <span className="font-display text-2xl font-extrabold tracking-tight text-brand-deep sm:text-[1.7rem]">
          Show the math
        </span>
        <span
          aria-hidden="true"
          className="text-brand-ink/35 transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>

      <p className="mt-3 text-[11px] text-brand-ink/45">
        The same model as the spreadsheet&apos;s Matrix Model sheet, solved here in your browser.
      </p>

      <pre className="mt-4 overflow-x-auto rounded-2xl bg-brand-deep p-5 text-[11px] leading-relaxed text-brand-cream/85">
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
              <td className={cn(tdClass, numeric, "font-mono")}>
                ${result.costPerDay.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}
