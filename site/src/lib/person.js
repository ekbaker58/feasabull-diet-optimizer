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

/** The calculator's form shape -> the planner's, and back. They already match. */
export function fromCalculatorForm(form) {
  const out = { ...DEFAULT_FORM };
  for (const k of FIELDS) if (form[k] != null && form[k] !== "") out[k] = String(form[k]);
  return out;
}
