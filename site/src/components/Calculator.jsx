import { useRef, useState } from "react";
import { CalculatorForm } from "@/components/CalculatorForm";
import { Report } from "@/components/Report";
import { ACTIVITY_LEVELS, buildPlan, validateForm } from "@/lib/dri";

const EMPTY_FORM = {
  units: "imperial",
  sex: null,
  age: "",
  ft: "",
  inch: "",
  cm: "",
  lb: "",
  kg: "",
  activityId: "active",
  goal: "maintain",
};

export function Calculator() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [metrics, setMetrics] = useState(null);
  const resultsRef = useRef(null);

  // Goal changes re-derive straight from the committed metrics, so the goal
  // pills in the report retarget without a resubmit.
  const plan = metrics ? buildPlan({ ...metrics, goal: form.goal }) : null;

  const update = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { errors: nextErrors, metrics: nextMetrics } = validateForm(form);
    setErrors(nextErrors);
    if (!nextMetrics) return;

    const isFirstResult = !metrics;
    setMetrics(nextMetrics);

    // Only pull focus down to the report the first time it appears.
    if (isFirstResult) {
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const heightLabel = metrics
    ? form.units === "metric"
      ? `${Math.round(metrics.heightCm)} cm`
      : `${form.ft || 0}'${form.inch || 0}"`
    : "";
  const weightLabel = metrics ? (form.units === "metric" ? `${form.kg} kg` : `${form.lb} lb`) : "";
  const activityLabel = ACTIVITY_LEVELS.find((a) => a.id === form.activityId)?.label ?? "";
  const summary = metrics
    ? [
        metrics.sex === "male" ? "Male" : "Female",
        `${metrics.age} yrs`,
        heightLabel,
        weightLabel,
        activityLabel,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section id="calculator" className="relative scroll-mt-20 border-t border-brand-ink/10">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
              The calculator
            </p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-black leading-[0.95] tracking-tight text-brand-deep sm:text-4xl">
              Six inputs. One honest daily target.
            </h2>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-brand-ink/55">
            Built for the 14-and-up crowd — undergrads, grad students, staff and anyone else who
            wants the numbers without the jargon.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-8">
          <CalculatorForm
            form={form}
            errors={errors}
            onChange={update}
            onSubmit={handleSubmit}
            hasResult={!!plan}
          />
          <Report
            plan={plan}
            summary={summary}
            age={metrics?.age}
            sex={metrics?.sex}
            onGoalChange={(goal) => update({ goal })}
            resultsRef={resultsRef}
          />
        </div>
      </div>
    </section>
  );
}
