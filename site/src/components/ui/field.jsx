import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Shared form primitives, so the Calculator and the Meal planner look identical. */

export const INPUT_CLASS =
  "h-12 rounded-xl border-brand-ink/15 bg-white/85 px-4 font-display text-[15px] font-semibold text-brand-ink placeholder:font-body placeholder:font-normal placeholder:text-brand-ink/35 focus-visible:ring-2 focus-visible:ring-brand-green/30 focus-visible:ring-offset-0";

export const SELECT_CLASS = cn(
  INPUT_CLASS,
  "w-full appearance-none border bg-[length:14px] bg-[right_1rem_center] bg-no-repeat pr-10",
);

export function Field({ label, hint, error, children }) {
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

export function SegmentedControl({ options, value, onChange, ariaLabel }) {
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
