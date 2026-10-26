// The example person used everywhere (the FeasaBULL Calories site's own placeholder values).
import { calculateTargets, personFromForm } from '../src/lib/personTargets.js';
export const EXAMPLE_FORM = { units: 'standard', sex: 'male', age: 21, ft: 5, inch: 8, lb: 155, activity: 'active', goal: 'maintain' };
export const EXAMPLE_PERSON = personFromForm(EXAMPLE_FORM).person;
export const EXAMPLE_REPORT = calculateTargets(EXAMPLE_PERSON);
export const EXAMPLE = EXAMPLE_REPORT.optimizerTargets;
