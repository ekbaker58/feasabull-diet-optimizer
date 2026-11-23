import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * One header for both tabs. Section links point at the home page's anchors, so
 * they work from the planner too; the current tab is marked for screen readers
 * and underlined for everyone else.
 */
export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onPlanner = pathname.startsWith("/planner");

  return (
    <header className="sticky top-0 z-40 border-b border-brand-ink/10 bg-brand-cream/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-green font-display text-sm font-black tracking-tight text-brand-gold">
            FC
          </span>
          <span className="font-display text-[13px] font-extrabold uppercase leading-none tracking-[0.2em] text-brand-deep">
            Feasabull
            <span className="block text-[9px] font-semibold tracking-[0.3em] text-brand-ink/45">
              Calories
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-medium text-brand-ink/60 md:flex">
          <Link
            to="/"
            hash="calculator"
            aria-current={onPlanner ? undefined : "page"}
            className={cn(
              "transition-colors hover:text-brand-green",
              onPlanner ? "" : "text-brand-deep underline decoration-brand-gold decoration-2 underline-offset-8",
            )}
          >
            Calculator
          </Link>
          <Link
            to="/planner"
            aria-current={onPlanner ? "page" : undefined}
            className={cn(
              "transition-colors hover:text-brand-green",
              onPlanner ? "text-brand-deep underline decoration-brand-gold decoration-2 underline-offset-8" : "",
            )}
          >
            Meal planner
          </Link>
          <Link to="/" hash="how" className="transition-colors hover:text-brand-green">
            The method
          </Link>
          <Link to="/" hash="nutrients" className="transition-colors hover:text-brand-green">
            Nutrients
          </Link>
        </nav>

        {onPlanner ? (
          <Link
            to="/"
            hash="calculator"
            className="rounded-full bg-brand-green px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-cream transition-colors hover:bg-brand-deep"
          >
            Calculator
          </Link>
        ) : (
          <Link
            to="/planner"
            className="rounded-full bg-brand-green px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-cream transition-colors hover:bg-brand-deep"
          >
            Meal planner
          </Link>
        )}
      </div>
    </header>
  );
}
