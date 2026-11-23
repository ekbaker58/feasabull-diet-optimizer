import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The person the two tabs share.
 *
 * The Calculator and the Meal planner ask for the same six numbers, so
 * whichever you fill in first hands them to the other. Storage is read and
 * written in effects and handlers only — never during render — so the server
 * and the first client render always agree (see AGENTS.md).
 */

const KEY = "feasabull:person";

/** The site's own placeholder person, so the planner has something to show. */
export const DEFAULT_FORM = {
  units: "imperial",
  sex: "male",
  age: "21",
  ft: "5",
  inch: "8",
  lb: "155",
  cm: "173",
  kg: "70.3",
  activityId: "active",
  goal: "maintain",
};

const FIELDS = Object.keys(DEFAULT_FORM);

/** Read the stored person. Call from an effect; returns null on the server. */
export function readPerson() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return null;
    // Only keep known fields, so a stale or hand-edited entry can't break the form.
    const out = {};
    for (const k of FIELDS) if (typeof saved[k] === "string") out[k] = saved[k];
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Store the person. Call from a handler or an effect. */
export function writePerson(form) {
  if (typeof window === "undefined") return;
  try {
    const out = {};
    for (const k of FIELDS) if (form[k] != null) out[k] = String(form[k]);
    window.localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    // Private windows and blocked site data: the tabs just stop sharing.
  }
}

/**
 * The one person in the app. Both tabs mount this, so whatever you type in
 * either one is in the other when you get there, and is still there when you
 * come back.
 *
 * Three rules keep it honest:
 *   - storage is touched in effects only, never in render or a state
 *     initializer, so the server and the first client render agree;
 *   - nothing is written until the saved person has been read back, or the
 *     mount pass would stamp the fallback over it;
 *   - an untouched fallback is never written. The planner's example person is
 *     a placeholder, not something you typed, and it must not end up looking
 *     like your own numbers on the other tab.
 */
export function useSharedPerson(fallback) {
  const [form, setForm] = useState(fallback);
  const [state, setState] = useState("loading"); // loading -> restored | fresh
  const touched = useRef(false);

  useEffect(() => {
    const saved = readPerson();
    if (saved) {
      setForm((prev) => ({ ...prev, ...saved }));
      setState("restored");
    } else {
      setState("fresh");
    }
  }, []);

  const update = useCallback((patch) => {
    touched.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (state === "loading") return undefined;          // the read has not landed yet
    if (state === "fresh" && !touched.current) return undefined;  // untouched placeholder
    const id = setTimeout(() => writePerson(form), 300);
    return () => clearTimeout(id);
  }, [form, state]);

  return {
    form,
    update,
    /** true once a previously saved person has been loaded into the form */
    restored: state === "restored",
    /** true while the form still holds an untouched fallback */
    isExample: state === "fresh" && !touched.current,
  };
}
