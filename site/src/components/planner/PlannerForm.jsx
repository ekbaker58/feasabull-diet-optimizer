import { Input } from "@/components/ui/input";
import { Field, SegmentedControl, INPUT_CLASS } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ACTIVITY_LEVELS, GOALS } from "@/lib/dri";

/**
 * Everything the linear program takes as input: the person, the diet, the
 * foods they refuse, the weekly budget and which model to solve. It updates
 * live — every change re-solves — so there is no submit button.
 */
export function PlannerForm({ form, prefs, errors, foodGroups, dietNames, dietNote, onForm, onPrefs }) {
  const isMetric = form.units === "metric";
  const excluded = prefs.exclude.length;

  const toggleFood = (id) =>
    onPrefs({
      exclude: prefs.exclude.includes(id)
        ? prefs.exclude.filter((x) => x !== id)
        : [...prefs.exclude, id],
    });

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="scroll-mt-28 rounded-[2rem] border border-brand-ink/10 bg-white/55 p-5 shadow-[0_30px_70px_-50px_rgba(20,32,28,0.6)] backdrop-blur-sm sm:p-7"
    >
      <div className="flex flex-col gap-5">
        <Field label="Units">
          <SegmentedControl
            ariaLabel="Measurement units"
            value={form.units}
            onChange={(units) => onForm({ units })}
            options={[
              { value: "imperial", label: "Standard" },
              { value: "metric", label: "Metric" },
            ]}
          />
        </Field>

        <Field label="Sex" error={errors.sex}>
          <SegmentedControl
            ariaLabel="Sex"
            value={form.sex}
            onChange={(sex) => onForm({ sex })}
            options={[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Age" hint="years" error={errors.age}>
            <Input
              type="number"
              inputMode="numeric"
              value={form.age}
              aria-invalid={!!errors.age}
              onChange={(e) => onForm({ age: e.target.value })}
              className={cn(INPUT_CLASS, "hide-spin")}
            />
          </Field>

          {isMetric ? (
            <Field label="Weight" hint="kg" error={errors.weight}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.kg}
                aria-invalid={!!errors.weight}
                onChange={(e) => onForm({ kg: e.target.value })}
                className={cn(INPUT_CLASS, "hide-spin")}
              />
            </Field>
          ) : (
            <Field label="Weight" hint="lb" error={errors.weight}>
              <Input
                type="number"
                inputMode="numeric"
                value={form.lb}
                aria-invalid={!!errors.weight}
                onChange={(e) => onForm({ lb: e.target.value })}
                className={cn(INPUT_CLASS, "hide-spin")}
              />
            </Field>
          )}
        </div>

        {isMetric ? (
          <Field label="Height" hint="cm" error={errors.height}>
            <Input
              type="number"
              inputMode="numeric"
              value={form.cm}
              aria-invalid={!!errors.height}
              onChange={(e) => onForm({ cm: e.target.value })}
              className={cn(INPUT_CLASS, "hide-spin")}
            />
          </Field>
        ) : (
          <Field label="Height" error={errors.height}>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                inputMode="numeric"
                aria-label="Height, feet"
                value={form.ft}
                aria-invalid={!!errors.height}
                onChange={(e) => onForm({ ft: e.target.value })}
                className={cn(INPUT_CLASS, "hide-spin")}
              />
              <Input
                type="number"
                inputMode="numeric"
                aria-label="Height, inches"
                value={form.inch}
                onChange={(e) => onForm({ inch: e.target.value })}
                className={cn(INPUT_CLASS, "hide-spin")}
              />
            </div>
          </Field>
        )}

        <Field label="Activity level">
          <div className="grid gap-2 sm:grid-cols-2">
            {ACTIVITY_LEVELS.map((level) => {
              const selected = form.activityId === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onForm({ activityId: level.id })}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    selected
                      ? "border-brand-green bg-brand-green/8 shadow-[inset_0_0_0_1px_rgba(0,103,71,0.35)]"
                      : "border-brand-ink/12 bg-white/60 hover:border-brand-ink/25",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        selected ? "bg-brand-green" : "bg-brand-ink/20",
                      )}
                    />
                    <span className="font-display text-[13px] font-bold text-brand-deep">
                      {level.label}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-brand-ink/55">
                    {level.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Goal">
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((goal) => {
              const selected = form.goal === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onForm({ goal: goal.id })}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center transition-all",
                    selected
                      ? "border-brand-green bg-brand-green text-brand-cream"
                      : "border-brand-ink/12 bg-white/60 text-brand-deep hover:border-brand-ink/25",
                  )}
                >
                  <span className="block font-display text-[12px] font-bold leading-tight">
                    {goal.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="h-px bg-brand-ink/10" />

        <Field label="Diet" hint={dietNote}>
          <select
            value={prefs.diet}
            onChange={(e) => onPrefs({ diet: e.target.value })}
            className={cn(INPUT_CLASS, "w-full")}
          >
            {dietNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Weekly food budget" hint="optional">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-black text-brand-green">$</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder="e.g. 60"
              aria-label="Weekly food budget in dollars"
              value={prefs.budget}
              onChange={(e) => onPrefs({ budget: e.target.value })}
              className={cn(INPUT_CLASS, "hide-spin flex-1")}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-ink/40">
              per week
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-brand-ink/45">
            A bigger budget buys variety: more different foods in each food group.
          </p>
        </Field>

        <Field label="Plan type">
          <SegmentedControl
            ariaLabel="Plan type"
            value={prefs.realistic ? "realistic" : "textbook"}
            onChange={(v) => onPrefs({ realistic: v === "realistic" })}
            options={[
              { value: "realistic", label: "Realistic" },
              { value: "textbook", label: "Textbook LP" },
            ]}
          />
          <p className="mt-2 text-[11px] leading-snug text-brand-ink/45">
            {prefs.realistic
              ? "Dietary Guidelines servings, variety, typical food waste. What a real week of groceries costs."
              : "The classic diet problem: cheapest food that meets the nutrient targets, nothing else. Unrealistic on purpose."}
          </p>
        </Field>

        <details className="group rounded-2xl border border-brand-ink/12 bg-white/55 px-4 py-3">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-ink/60 marker:content-['']">
            <span>
              Foods I won&apos;t eat
              {excluded ? (
                <span className="ml-2 rounded-full bg-brand-green/12 px-2 py-0.5 text-[10px] text-brand-green">
                  {excluded}
                </span>
              ) : null}
            </span>
            <span aria-hidden="true" className="text-brand-ink/35 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {foodGroups.map(([group, foods]) => (
              <div key={group}>
                <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-brand-green">
                  {group}
                </p>
                <div className="flex flex-col gap-1">
                  {foods.map((food) => (
                    <label
                      key={food.id}
                      htmlFor={`x-${food.id}`}
                      className="flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-brand-ink/70"
                    >
                      <input
                        id={`x-${food.id}`}
                        type="checkbox"
                        checked={prefs.exclude.includes(food.id)}
                        onChange={() => toggleFood(food.id)}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand-green"
                      />
                      {food.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>

        <details className="group rounded-2xl border border-brand-ink/12 bg-white/55 px-4 py-3">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-ink/60 marker:content-['']">
            <span>Prices &amp; waste</span>
            <span aria-hidden="true" className="text-brand-ink/35 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-3 grid gap-3">
            <Field label="Price source">
              <select
                value={prefs.priceSource}
                onChange={(e) => onPrefs({ priceSource: e.target.value })}
                className={cn(INPUT_CLASS, "w-full")}
              >
                <option value="walmart">Walmart, October 2026</option>
                <option value="bls">BLS U.S. average, September 2026</option>
              </select>
            </Field>
            <Field label="Food waste in the cost" hint="realistic plan">
              <select
                value={prefs.includeWaste ? "typical" : "none"}
                onChange={(e) => onPrefs({ includeWaste: e.target.value === "typical" })}
                className={cn(INPUT_CLASS, "w-full")}
              >
                <option value="typical">Typical household (USDA ERS, 9–31% by food)</option>
                <option value="none">None: I eat everything I buy</option>
              </select>
            </Field>
          </div>
        </details>

        <p className="text-center text-[11px] leading-relaxed text-brand-ink/40">
          Every change re-solves the linear program in your browser.
        </p>
      </div>
    </form>
  );
}
