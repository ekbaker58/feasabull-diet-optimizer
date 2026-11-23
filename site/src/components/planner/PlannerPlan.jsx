import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { fmt, money, pct, servingText } from "@/lib/plannerFormat";

/** The answer: what the plan costs, whether it fits the budget, and where the calories come from. */
export function PlanCost({ result, budget, realistic, priceSource, includeWaste, usda, sex }) {
  const totals = result.totals;
  const kcal = totals.kcal;
  const share = {
    protein: ((4 * totals.protein) / kcal) * 100,
    carb: ((4 * totals.carb) / kcal) * 100,
    fat: ((9 * totals.fat) / kcal) * 100,
  };

  return (
    <div className="rounded-[2rem] border border-brand-ink/10 bg-white/65 p-6 sm:p-7">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-brand-green">
        {realistic ? `Your ${result.diet} plan` : `Cheapest possible ${result.diet} plan (textbook)`}
      </p>

      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-5xl font-black leading-none tracking-[-0.04em] text-brand-deep">
          {money(result.costPerWeek)}
        </span>
        <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-brand-ink/40">
          / week
        </span>
      </p>
      <p className="mt-1.5 text-[13px] text-brand-ink/60">
        {money(result.costPerDay)} a day ·{" "}
        {priceSource === "bls" ? "BLS U.S. average prices" : "Walmart prices"}
        {realistic && includeWaste ? " · includes typical food waste" : ""}
      </p>

      <BudgetPill budget={budget} realistic={realistic} />

      {realistic ? (
        <p className="mt-3 text-[12px] leading-snug text-brand-ink/60">
          {result.variety < 1
            ? `Variety: no food gives more than ${pct(result.variety)} of its food group, so at least ${Math.round(1 / result.variety)} different foods per group where the diet allows.`
            : "Variety rule off: this is the cheapest realistic plan, so a food group may come from a single food."}
        </p>
      ) : null}

      <p className="mt-2 text-[12px] leading-snug text-brand-ink/60">
        USDA Thrifty Food Plan for a {sex === "female" ? "woman" : "man"} your age:{" "}
        {money(usda.thrifty)}/week; Moderate-Cost: {money(usda.moderate)} ({usda.month}; +20% if you
        live alone).
      </p>

      {(result.notes || []).map((note) => (
        <p key={note} className="mt-2 text-[12px] leading-snug text-brand-ink/60">
          {note}
        </p>
      ))}

      <div className="mt-5 border-t border-brand-ink/10 pt-4">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-brand-ink/55">
          Where the calories come from
        </p>
        <div
          role="img"
          aria-label={`Protein ${fmt(share.protein)}%, carbohydrate ${fmt(share.carb)}%, fat ${fmt(share.fat)}%`}
          className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-brand-mist"
        >
          <i style={{ width: `${share.protein}%` }} className="block bg-brand-green" />
          <i style={{ width: `${share.carb}%` }} className="block bg-brand-gold" />
          <i style={{ width: `${share.fat}%` }} className="block bg-brand-deep/55" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-ink/60">
          <span>Protein {fmt(share.protein)}%</span>
          <span>Carbs {fmt(share.carb)}%</span>
          <span>Fat {fmt(share.fat)}%</span>
        </div>
      </div>
    </div>
  );
}

function BudgetPill({ budget, realistic }) {
  if (budget.status === "within_budget") {
    return (
      <div className="mt-4">
        <span className="inline-flex rounded-full bg-brand-green px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-cream">
          ✓ Fits your {money(budget.budget, 0)}/week budget
        </span>
        <p className="mt-2 text-[11px] text-brand-ink/50">
          {money(budget.leftover)} a week left over
          {realistic ? " · the most varied plan that fits" : ""}.
        </p>
      </div>
    );
  }
  if (budget.status === "over_budget") {
    return (
      <div className="mt-4">
        <span className="inline-flex rounded-full bg-red-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
          {money(budget.shortBy)}/week over your {money(budget.budget, 0)} budget
        </span>
        <p className="mt-2 text-[12px] leading-snug text-brand-ink/60">
          This is the cheapest plan that meets every rule. To fit {money(budget.budget, 0)}: allow
          more foods, {realistic ? "try the Textbook LP plan type, " : ""}or raise the budget.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <span className="inline-flex rounded-full bg-brand-green px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-cream">
        ✓ Meets every target
      </span>
    </div>
  );
}

/** Nothing worked: say which rule broke, in the words diagnose() produced. */
export function PlanInfeasible({ diet, reasons }) {
  return (
    <div className="rounded-[2rem] border border-red-700/25 bg-red-50/70 p-6 sm:p-7">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-red-700">{diet}</p>
      <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-brand-deep">
        No plan meets every rule.
      </h3>
      <ul className="mt-4 space-y-2">
        {(reasons || []).map((reason) => (
          <li key={reason} className="flex items-start gap-2.5 text-[13px] leading-snug text-brand-ink/70">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-700" />
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The day, split into the four meals the meal matrix M defines. */
export function PlannerMeals({ meals }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {meals.map((meal) => {
        const shown = meal.items.filter((i) => i.grams >= 10);
        const traces = meal.items.filter((i) => i.grams < 10);
        return (
          <article
            key={meal.meal}
            className="rounded-[1.75rem] border border-brand-ink/10 bg-white/65 p-5"
          >
            <header className="flex items-baseline justify-between gap-3 border-b border-brand-ink/10 pb-3">
              <h3 className="font-display text-lg font-extrabold tracking-tight text-brand-deep">
                {meal.meal}
              </h3>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-ink/55">
                {fmt(meal.kcal)} kcal · {fmt(meal.protein)} g protein
              </span>
            </header>

            {shown.length ? (
              shown.map((item) => (
                <div
                  key={item.id}
                  className="flex items-baseline justify-between gap-3 border-b border-dashed border-brand-ink/12 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-snug text-brand-deep">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-brand-ink/45">{servingText(item)}</p>
                  </div>
                  <p className="shrink-0 text-right font-display text-[11px] font-bold leading-tight text-brand-ink/60">
                    {fmt(item.kcal)} kcal
                    <span className="block font-body font-medium text-brand-ink/40">
                      {fmt(item.protein)} g P
                    </span>
                  </p>
                </div>
              ))
            ) : (
              <p className="py-3 text-[12px] text-brand-ink/45">Nothing at this meal.</p>
            )}

            {traces.length ? <TraceAmounts items={traces} /> : null}
          </article>
        );
      })}
    </div>
  );
}

export function SectionHeading({ title, note, id }) {
  return (
    <div id={id} className="scroll-mt-28 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-brand-deep sm:text-[1.7rem]">
        {title}
      </h2>
      {note ? <p className="text-[12.5px] leading-snug text-brand-ink/55">{note}</p> : null}
    </div>
  );
}

export const tableClass = cn("w-full border-collapse text-[12px]");
export const thClass =
  "border-b border-brand-ink/15 pb-2 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-brand-ink/55";
export const tdClass = "border-b border-dashed border-brand-ink/12 py-2.5 align-top text-brand-ink/75";

/**
 * Sub-10 g amounts, folded away. They are an artifact of a linear program
 * having no "a normal portion or none" constraint, and they read badly inline.
 */
function TraceAmounts({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full bg-brand-mist px-2.5 py-1 text-[11px] font-semibold text-brand-ink/60 transition-colors hover:bg-brand-green/12 hover:text-brand-deep"
      >
        +{items.length} trace amount{items.length === 1 ? "" : "s"}{" "}
        <span aria-hidden="true" className={open ? "inline-block rotate-180" : "inline-block"}>
          ▾
        </span>
      </button>
      {open ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-brand-ink/55">
          {items.map((i) => `${i.name.toLowerCase()} (${fmt(i.grams)} g)`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A panel whose headline is always visible and whose body opens on click.
 * Open state lives in React, not in the DOM: the page re-solves on every
 * keystroke, and an uncontrolled <details> would snap shut on each re-render.
 */
export function CollapsiblePanel({ title, summary, tone = "neutral", forceOpen = false, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-brand-ink/10 bg-white/65">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-white/80 sm:p-7"
      >
        <span className="min-w-0">
          <span className="block font-display text-2xl font-extrabold tracking-tight text-brand-deep sm:text-[1.7rem]">
            {title}
          </span>
          {summary ? (
            <span
              className={cn(
                "mt-1 block text-[12.5px] leading-snug",
                tone === "good"
                  ? "font-semibold text-brand-green"
                  : tone === "bad"
                    ? "font-semibold text-red-700"
                    : "text-brand-ink/55",
              )}
            >
              {summary}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "shrink-0 text-lg text-brand-ink/35 transition-transform",
            open ? "rotate-180" : "",
          )}
        >
          ▾
        </span>
      </button>
      {open ? <div className="px-6 pb-6 sm:px-7 sm:pb-7">{children}</div> : null}
    </div>
  );
}
