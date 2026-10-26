import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ACTIVITY_LEVELS, GOALS } from "@/lib/dri";

const INPUT_CLASS =
  "h-12 rounded-xl border-brand-ink/15 bg-white/85 px-4 font-display text-[15px] font-semibold text-brand-ink placeholder:font-body placeholder:font-normal placeholder:text-brand-ink/35 focus-visible:ring-2 focus-visible:ring-brand-green/30 focus-visible:ring-offset-0";

function Field({ label, hint, error, children }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Label className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-ink/60">
          {label}
        </Label>
        {hint ? <span className="text-[11px] text-brand-ink/40">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1.5 text-[12px] font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-full border border-brand-ink/12 bg-white/70 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-all",
            value === option.value
              ? "bg-brand-green text-brand-cream shadow-sm"
              : "text-brand-ink/50 hover:text-brand-deep",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CalculatorForm({ form, errors, onChange, onSubmit, hasResult }) {
  const isMetric = form.units === "metric";

  return (
    <form
      id="calculator-form"
      onSubmit={onSubmit}
      className="scroll-mt-28 rounded-[2rem] border border-brand-ink/10 bg-white/55 p-5 shadow-[0_30px_70px_-50px_rgba(20,32,28,0.6)] backdrop-blur-sm sm:p-7"
    >
      <div className="flex flex-col gap-5">
        <Field label="Units">
          <SegmentedControl
            ariaLabel="Measurement units"
            value={form.units}
            onChange={(units) => onChange({ units })}
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
            onChange={(sex) => onChange({ sex })}
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
              placeholder="21"
              value={form.age}
              aria-invalid={!!errors.age}
              onChange={(e) => onChange({ age: e.target.value })}
              className={cn(INPUT_CLASS, "hide-spin")}
            />
          </Field>

          {isMetric ? (
            <Field label="Height" hint="cm" error={errors.height}>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="170"
                value={form.cm}
                aria-invalid={!!errors.height}
                onChange={(e) => onChange({ cm: e.target.value })}
                className={cn(INPUT_CLASS, "hide-spin")}
              />
            </Field>
          ) : (
            <Field label="Height" hint="ft / in" error={errors.height}>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="5"
                  value={form.ft}
                  aria-invalid={!!errors.height}
                  onChange={(e) => onChange({ ft: e.target.value })}
                  className={cn(INPUT_CLASS, "hide-spin")}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="8"
                  value={form.inch}
                  aria-invalid={!!errors.height}
                  onChange={(e) => onChange({ inch: e.target.value })}
                  className={cn(INPUT_CLASS, "hide-spin")}
                />
              </div>
            </Field>
          )}
        </div>

        <Field label="Weight" hint={isMetric ? "kg" : "lb"} error={errors.weight}>
          <Input
            type="number"
            inputMode="decimal"
            placeholder={isMetric ? "70" : "155"}
            value={isMetric ? form.kg : form.lb}
            aria-invalid={!!errors.weight}
            onChange={(e) => onChange(isMetric ? { kg: e.target.value } : { lb: e.target.value })}
            className={cn(INPUT_CLASS, "hide-spin")}
          />
        </Field>

        <Field label="Activity level">
          <div className="grid gap-2 sm:grid-cols-2">
            {ACTIVITY_LEVELS.map((level) => {
              const selected = form.activityId === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ activityId: level.id })}
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
                  onClick={() => onChange({ goal: goal.id })}
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

        <button
          type="submit"
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-deep px-6 py-4 text-[12px] font-bold uppercase tracking-[0.18em] text-brand-cream transition-colors hover:bg-brand-green"
        >
          {hasResult ? "Update my numbers" : "Calculate my numbers"}
          <span aria-hidden="true">→</span>
        </button>

        <p className="text-center text-[11px] leading-relaxed text-brand-ink/40">
          Estimates for healthy adults and teens 14+. Nothing here is medical advice.
        </p>
      </div>
    </form>
  );
}
