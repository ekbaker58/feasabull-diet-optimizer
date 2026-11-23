import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalculatorForm } from "@/components/CalculatorForm";
import { Report } from "@/components/Report";
import { ACTIVITY_LEVELS, buildPlan, validateForm } from "@/lib/dri";
import { EMPTY_PERSON, useSharedPerson } from "@/lib/person";


export function Calculator({ onReportRestored }) {
  // The person is shared with the Meal planner tab and saved as you type.
  const { form, update: updatePerson, restored } = useSharedPerson(EMPTY_PERSON);
  const [errors, setErrors] = useState({});
  const [metrics, setMetrics] = useState(null);
  const resultsRef = useRef(null);

  // Coming back with saved numbers: fill the form AND show the report, so
  // there is nothing to re-click.
  const justRestored = useRef(false);

  useEffect(() => {
    if (!restored) return;
    const { metrics: saved } = validateForm(form);
    if (saved) {
      setMetrics(saved);
      justRestored.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  // The restored report has just grown the page, pushing #how and #nutrients
  // down past wherever the browser already scrolled to. Put them back.
  useEffect(() => {
    if (!justRestored.current || !metrics) return;
    justRestored.current = false;
    onReportRestored?.();
  }, [metrics, onReportRestored]);

  // Goal changes re-derive straight from the committed metrics, so the goal
  // pills in the report retarget without a resubmit.
  const plan = metrics ? buildPlan({ ...metrics, goal: form.goal }) : null;

  const update = (patch) => {
    updatePerson(patch);
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

        {plan ? <PlannerHandoff calories={plan.calories} /> : null}
      </div>
    </section>
  );
}

/** Step 2 is done; this is the door to step 3. */
function PlannerHandoff({ calories }) {
  return (
    <div className="mt-5 flex flex-col gap-4 rounded-[2rem] border border-brand-green/25 bg-brand-green/8 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
          Next step
        </p>
        <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-brand-deep">
          Now turn {calories} kcal into actual food.
        </h3>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-brand-ink/60">
          The meal planner takes these targets and solves a linear program over 71 foods for the
          cheapest day that meets every one of them — with a shopping list and a weekly budget.
        </p>
      </div>
      <Link
        to="/planner"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-deep px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-cream transition-colors hover:bg-brand-green"
      >
        Build my meal plan
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
