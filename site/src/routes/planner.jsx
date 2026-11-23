import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlannerForm } from "@/components/planner/PlannerForm";
import { PlannerTargets } from "@/components/planner/PlannerTargets";
import {
  PlanCost,
  PlanInfeasible,
  PlannerMeals,
  SectionHeading,
} from "@/components/planner/PlannerPlan";
import {
  BudgetLevels,
  ShoppingList,
  TargetCheck,
  ShowTheMath,
} from "@/components/planner/PlannerTables";
import { DEFAULT_FORM, readPerson, writePerson } from "@/lib/person";
import { fmt, money } from "@/lib/plannerFormat";
import { ACTIVITY_LEVELS } from "@/lib/dri";
import { calculateTargets, personFromForm } from "@solver/personTargets";
import {
  DIETS,
  FOODS,
  NUTRIENTS,
  isAllowed,
  planWithBudget,
  usdaFoodPlans,
} from "@solver/dietOptimizer";

export const Route = createFileRoute("/planner")({
  component: Planner,
  head: () => ({
    meta: [
      { title: "Meal planner — Feasabull Calories" },
      {
        name: "description",
        content:
          "Your daily targets turned into the cheapest realistic day of food, by linear programming. 71 foods, Dietary Guidelines servings, a weekly budget and a shopping list.",
      },
    ],
  }),
});

const DEFAULT_PREFS = {
  diet: "Balanced",
  budget: "",
  realistic: true,
  exclude: [],
  priceSource: "walmart",
  includeWaste: true,
};

/** FOODS grouped the way the exclusion list shows them, in the data's own order. */
const FOOD_GROUPS = (() => {
  const groups = new Map();
  for (const food of FOODS) {
    if (!groups.has(food.group)) groups.set(food.group, []);
    groups.get(food.group).push(food);
  }
  return [...groups.entries()];
})();

const FOODS_BY_ID = new Map(FOODS.map((f) => [f.id, f]));
const DIET_NAMES = DIETS.map((d) => d.name);

function Planner() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  // Storage is browser-only: read it after hydration, never during render.
  const hydrated = useRef(false);

  useEffect(() => {
    const saved = readPerson();
    if (saved) setForm((prev) => ({ ...prev, ...saved }));
    hydrated.current = true;
  }, []);

  // Only write once the saved person has been read, or the mount pass would
  // stamp the defaults over it.
  useEffect(() => {
    if (!hydrated.current) return;
    writePerson(form);
  }, [form]);

  // Five Simplex solves run on every change. Deferring keeps typing smooth.
  const deferredForm = useDeferredValue(form);
  const deferredPrefs = useDeferredValue(prefs);

  const solved = useMemo(() => solve(deferredForm, deferredPrefs), [deferredForm, deferredPrefs]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updatePrefs = (patch) => setPrefs((prev) => ({ ...prev, ...patch }));

  const diet = DIETS.find((d) => d.name === prefs.diet);
  const allowedCount = diet ? FOODS.filter((f) => isAllowed(f, diet)).length : FOODS.length;
  const dietNote = diet ? `${allowedCount} of ${FOODS.length} foods` : "";

  return (
    <div id="top" className="min-h-screen bg-brand-cream font-body text-brand-ink">
      <Header />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <header className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
            Step 3 · Linear programming
          </p>
          <h1 className="mt-3 font-display text-4xl font-black leading-[1.05] tracking-[-0.03em] text-brand-deep sm:text-5xl">
            The cheapest day of food
            <span className="block font-serif-display text-[0.95em] font-normal italic text-brand-green">
              that still hits every target.
            </span>
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed text-brand-ink/60">
            Your numbers from the calculator become the right-hand side of a linear program over{" "}
            {FOODS.length} foods. The Simplex method finds the lowest-cost plan that meets every
            nutrient target, follows the Dietary Guidelines servings and fits your weekly budget.
          </p>
          <ol className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-ink/45">
            <li className="rounded-full bg-white/70 px-3 py-1.5">1 · You</li>
            <li aria-hidden="true">→</li>
            <li className="rounded-full bg-white/70 px-3 py-1.5">2 · Targets (EER + DRI)</li>
            <li aria-hidden="true">→</li>
            <li className="rounded-full bg-brand-green px-3 py-1.5 text-brand-cream">
              3 · Cheapest plan (Simplex)
            </li>
          </ol>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <PlannerForm
              form={form}
              prefs={prefs}
              errors={solved.errors}
              foodGroups={FOOD_GROUPS}
              dietNames={DIET_NAMES}
              dietNote={dietNote}
              onForm={updateForm}
              onPrefs={updatePrefs}
            />
          </div>

          <section aria-live="polite" className="space-y-5">
            <Results solved={solved} prefs={prefs} form={form} />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Results({ solved, prefs, form }) {
  if (!solved.report) {
    return (
      <div className="rounded-[2rem] border border-dashed border-brand-green/30 bg-brand-mist/60 p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
          Check the form
        </p>
        <h3 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-brand-deep">
          A couple of numbers need fixing.
        </h3>
        <ul className="mt-4 space-y-2">
          {Object.values(solved.errors).map((message) => (
            <li
              key={message}
              className="flex items-start gap-2.5 text-[13px] leading-snug text-brand-ink/65"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
              {message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const { report, budget, usda, who } = solved;
  const result = budget.result;

  return (
    <>
      <PlannerTargets report={report} who={who} />

      {result.status !== "optimal" ? (
        <PlanInfeasible diet={prefs.diet} reasons={result.reasons} />
      ) : (
        <>
          <PlanCost
            result={result}
            budget={budget}
            realistic={prefs.realistic}
            priceSource={prefs.priceSource}
            includeWaste={prefs.includeWaste}
            usda={usda}
            sex={report.person.sex}
          />

          <div className="space-y-3">
            <SectionHeading
              title="Your day"
              note="Amounts are daily averages over a week: ½ bagel a day means a bagel every other day. Lunch and dinner share one batch-cooked base."
            />
            <PlannerMeals meals={result.meals} />
          </div>

          {prefs.realistic ? (
            <Panel>
              <SectionHeading
                title="What more money buys"
                note={
                  budget.budget
                    ? `Your budget: ${money(budget.budget, 0)}/week`
                    : "Enter a weekly budget to pick a level automatically."
                }
              />
              <div className="mt-4">
                <BudgetLevels
                  levels={budget.levels}
                  chosen={budget.chosen}
                  budget={budget.budget}
                />
              </div>
            </Panel>
          ) : null}

          <Panel>
            <SectionHeading
              title="Shopping list for one week"
              note={`First trip ${money(result.shopping.firstTrip)} · then about ${money(result.shopping.perWeek)}/week`}
            />
            <div className="mt-4">
              <ShoppingList
                shopping={result.shopping}
                foodsById={FOODS_BY_ID}
                metric={form.units === "metric"}
              />
            </div>
          </Panel>

          <Panel>
            <SectionHeading title="Plan vs. targets" />
            <div className="mt-4">
              <TargetCheck rows={checkRows(result, report.optimizerTargets, prefs.realistic)} />
            </div>
          </Panel>

          <ShowTheMath
            result={result}
            targets={report.optimizerTargets}
            realistic={prefs.realistic}
            includeWaste={prefs.includeWaste}
            nutrientCount={NUTRIENTS.length}
            foodsById={FOODS_BY_ID}
          />
        </>
      )}

      <div className="rounded-[2rem] border border-brand-ink/10 bg-white/40 p-5 text-[11px] leading-relaxed text-brand-ink/50 sm:p-6">
        <p>
          Targets: IOM Estimated Energy Requirement and Dietary Reference Intakes, the same
          equations as the Calculator tab. Nutrients: USDA SR28. Prices: Walmart, Oct 2026, or BLS
          U.S. city averages. Amounts are as eaten — cooked rice, roasted chicken — and the shopping
          list converts them back to what you buy.
        </p>
        <p className="mt-2">
          Educational estimates for healthy people 14 and older, not medical advice. Unofficial
          student project, EGN4450 Team 9.
        </p>
      </div>
    </>
  );
}

function Panel({ children }) {
  return (
    <div className="rounded-[2rem] border border-brand-ink/10 bg-white/65 p-6 sm:p-7">{children}</div>
  );
}

/** Form -> person -> targets -> the budget search. Pure, so useMemo can cache it. */
function solve(form, prefs) {
  const { errors, person } = personFromForm({
    units: form.units === "metric" ? "metric" : "standard",
    sex: form.sex,
    age: form.age,
    ft: form.ft,
    inch: form.inch,
    lb: form.lb,
    cm: form.cm,
    kg: form.kg,
    activity: form.activityId,
    goal: form.goal,
  });

  if (Object.keys(errors).length) return { errors, report: null };

  const report = calculateTargets(person);
  const budget = planWithBudget(
    report.optimizerTargets,
    {
      diet: prefs.diet,
      exclude: prefs.exclude,
      priceSource: prefs.priceSource,
      settings: { realistic: prefs.realistic, include_waste: prefs.includeWaste },
    },
    Number.parseFloat(prefs.budget),
  );

  const activityLabel = ACTIVITY_LEVELS.find((a) => a.id === person.activity)?.label ?? "";
  const height =
    form.units === "metric" ? `${person.heightCm} cm` : `${form.ft}′${form.inch || 0}″`;
  const weight = form.units === "metric" ? `${person.weightKg} kg` : `${form.lb} lb`;

  return {
    errors,
    report,
    budget,
    usda: usdaFoodPlans(person.age, person.sex),
    who: `${person.sex === "male" ? "Male" : "Female"}, ${person.age} · ${height} · ${weight} · ${activityLabel} · ${report.goal}`,
  };
}

/** A·x against b, plus the Dietary Guidelines rows when the realistic model is on. */
function checkRows(result, targets, realistic) {
  const totals = result.totals;
  const rows = [
    {
      label: "kcal",
      unit: "kcal",
      value: fmt(Math.round(totals.kcal)),
      target: `${fmt(Math.floor(targets.calories * 0.95))}–${fmt(Math.ceil(targets.calories * 1.05))}`,
      met: Math.abs(totals.kcal - targets.calories) <= targets.calories * 0.05 + 0.5,
    },
    row("protein", "g", totals.protein, targets.proteinMin, 0.5),
    row("fiber", "g", totals.fiber, targets.fiber, 0.5),
    row("calcium", "mg", totals.calcium, targets.calcium, 0.5),
    row("iron", "mg", totals.iron, targets.iron, 0.05, 1),
    row("potassium", "mg", totals.potassium, targets.potassium, 0.5),
    row("vitc", "mg", totals.vitc, targets.vitc, 0.5),
    {
      label: "sodium",
      unit: "mg",
      value: fmt(totals.sodium),
      target: `≤ ${fmt(targets.sodium)}`,
      met: totals.sodium <= targets.sodium + 0.5,
    },
  ];

  if (realistic) {
    for (const group of Object.values(result.groups || {})) {
      rows.push({
        label: group.label,
        unit: "servings",
        value: fmt(group.servings, 1),
        target: group.hi != null ? `${fmt(group.lo, 2)}–${fmt(group.hi, 2)}` : `≥ ${fmt(group.lo, 2)}`,
        met: group.servings >= group.lo - 0.01 && (group.hi == null || group.servings <= group.hi + 0.01),
      });
    }
    const satfatShare = (9 * totals.satfat) / totals.kcal;
    rows.push({
      label: "Saturated fat",
      unit: "% of kcal",
      value: fmt(satfatShare * 100, 1),
      target: "< 10",
      met: satfatShare <= 0.1 + 1e-6,
    });
  }

  return rows;
}

function row(label, unit, value, target, tolerance, digits = 0) {
  return {
    label,
    unit,
    value: fmt(value, digits),
    target: `≥ ${fmt(target, digits)}`,
    met: value >= target - tolerance,
  };
}
