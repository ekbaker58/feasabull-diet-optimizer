/**
 * Person -> daily targets, the same way the FeasaBULL Calories site does it
 * (https://feasabull-fuel-stats.base44.app), then -> the food optimizer.
 *
 * Method (matches the site's code line for line, except the three corrections marked "IOM FIX"):
 *   1. Estimated Energy Requirement (IOM 2005, healthy-weight equations), rounded to the nearest 10 kcal.
 *   2. Goal: lose -500, maintain 0, build +350 kcal; floor 1,500 (men) / 1,200 (women).
 *   3. Protein = 1.6 g per kg, kept between 10% and 30% of calories. Fat = 30% of calories. Carbs = the rest.
 *   4. Fiber = 14 g per 1,000 kcal. Vitamins/minerals = DRI table by age bracket and sex. Sodium under 2,300 mg.
 *
 * IOM FIX: the site applies the MEN's activity coefficients to everyone and +20 kcal for teen girls.
 * The IOM 2005 values are sex-specific (women 1.12/1.27/1.45, girls 1.16/1.31/1.56, girls +25 kcal).
 * Pass { coefficients: "site" } to reproduce the site exactly (used by tests/person_targets.test.mjs).
 */

export const ACTIVITY = [
  { id: "inactive", label: "Inactive", blurb: "Mostly sitting — classes, desk work, little movement." },
  { id: "low", label: "Low active", blurb: "Walking across campus, light exercise a few days a week." },
  { id: "active", label: "Active", blurb: "Moderate exercise 3–5 days a week, or an active job." },
  { id: "very", label: "Very active", blurb: "Hard training 6–7 days a week, two-a-days or manual work." },
];
export const GOALS = [
  { id: "lose", label: "Lose fat", blurb: "About 0.5 lb a week", delta: -500 },
  { id: "maintain", label: "Maintain", blurb: "Hold your current weight", delta: 0 },
  { id: "build", label: "Build muscle", blurb: "Slow, lean surplus", delta: 350 },
];

// Physical-activity coefficients, IOM (2005) Dietary Reference Intakes for Energy, healthy-weight equations
export const PA_IOM = {
  male:   { adult: { inactive: 1, low: 1.11, active: 1.25, very: 1.48 }, youth: { inactive: 1, low: 1.13, active: 1.26, very: 1.42 } },
  female: { adult: { inactive: 1, low: 1.12, active: 1.27, very: 1.45 }, youth: { inactive: 1, low: 1.16, active: 1.31, very: 1.56 } },
};
// What the live site currently uses (men's values for everyone)
export const PA_SITE = { male: PA_IOM.male, female: PA_IOM.male };

// DRI table (same values as the site): [male, female] by age bracket
const DRI = {
  "Vitamin C":  { unit: "mg", teen: [75, 65], young: [90, 75], mid: [90, 75], older: [90, 75], oldest: [90, 75] },
  "Calcium":    { unit: "mg", teen: [1300, 1300], young: [1000, 1000], mid: [1000, 1000], older: [1000, 1200], oldest: [1200, 1200] },
  "Iron":       { unit: "mg", teen: [11, 15], young: [8, 18], mid: [8, 18], older: [8, 8], oldest: [8, 8] },
  "Potassium":  { unit: "mg", teen: [3000, 2300], young: [3400, 2600], mid: [3400, 2600], older: [3400, 2600], oldest: [3400, 2600] },
  "Vitamin A":  { unit: "mcg RAE", teen: [900, 700], young: [900, 700], mid: [900, 700], older: [900, 700], oldest: [900, 700] },
  "Vitamin D":  { unit: "mcg", teen: [15, 15], young: [15, 15], mid: [15, 15], older: [15, 15], oldest: [20, 20] },
  "Magnesium":  { unit: "mg", teen: [410, 360], young: [400, 310], mid: [420, 320], older: [420, 320], oldest: [420, 320] },
  "Zinc":       { unit: "mg", teen: [11, 9], young: [11, 8], mid: [11, 8], older: [11, 8], oldest: [11, 8] },
  "Vitamin B12": { unit: "mcg", teen: [2.4, 2.4], young: [2.4, 2.4], mid: [2.4, 2.4], older: [2.4, 2.4], oldest: [2.4, 2.4] },
};
export const bracket = (age) => (age < 19 ? "teen" : age <= 30 ? "young" : age <= 50 ? "mid" : age <= 70 ? "older" : "oldest");
const round10 = (v) => Math.round(v / 10) * 10;

/** Form values (like the site's form) -> metric person. Same conversions and rounding as the site. */
export function personFromForm(f) {
  const sex = String(f.sex).toLowerCase() === "female" ? "female" : "male";
  let heightCm, weightKg;
  if (f.units === "metric") { heightCm = Number(f.cm); weightKg = Number(f.kg); }
  else { heightCm = Math.round((Number(f.ft) * 12 + Number(f.inch || 0)) * 2.54); weightKg = Number(f.lb) * 0.45359237; }
  const errors = {};
  const age = Number(f.age);
  if (!(age >= 14 && age <= 99)) errors.age = "Enter an age between 14 and 99.";
  if (!(heightCm >= 120 && heightCm <= 230)) errors.height = "Enter a height between 120 and 230 cm (3'11\" and 7'7\").";
  if (!(weightKg >= 35 && weightKg <= 275)) errors.weight = "Enter a weight between 35 and 275 kg (77 and 600 lb).";
  return { errors, person: { sex, age, heightCm, weightKg: Math.round(weightKg * 10) / 10, activity: f.activity || "active", goal: f.goal || "maintain" } };
}

/** Estimated Energy Requirement (kcal/day), IOM 2005. */
export function eer({ sex, age, heightCm, weightKg, activity }, { coefficients = "iom" } = {}) {
  const table = coefficients === "site" ? PA_SITE : PA_IOM;
  const m = heightCm / 100, kg = weightKg;
  if (age < 19) {
    const pa = table[sex].youth[activity];
    return sex === "male" ? 88.5 - 61.9 * age + pa * (26.7 * kg + 903 * m) + 25
                          : 135.3 - 30.8 * age + pa * (10 * kg + 934 * m) + (coefficients === "site" ? 20 : 25);
  }
  const pa = table[sex].adult[activity];
  return sex === "male" ? 662 - 9.53 * age + pa * (15.91 * kg + 539.6 * m)
                        : 354 - 6.91 * age + pa * (9.36 * kg + 726 * m);
}

/** Person -> the full daily target report (what the calculator shows) + the optimizer's targets. */
export function calculateTargets(person, opts = {}) {
  const { sex, age, heightCm, weightKg } = person;
  const goal = GOALS.find((g) => g.id === person.goal) || GOALS[1];
  const maintenance = round10(eer(person, opts));
  const calories = Math.max(sex === "male" ? 1500 : 1200, round10(maintenance + goal.delta));
  const g = (pct, f) => Math.round((pct / 100) * (calories / f));
  const protein = Math.min(Math.max(Math.round(1.6 * weightKg), g(10, 4)), g(30, 4));
  const fat = g(30, 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((14 * calories) / 1000);
  const b = bracket(age), i = sex === "male" ? 0 : 1;
  const nutrients = Object.fromEntries(Object.entries(DRI).map(([k, v]) => [k, { amount: v[b][i], unit: v.unit }]));
  const bmiVal = weightKg / (heightCm / 100) ** 2;
  return {
    person, maintenance, calories, goal: goal.label,
    macros: { protein: { grams: protein, range: [g(10, 4), g(35, 4)] }, carbs: { grams: carbs, range: [g(45, 4), g(65, 4)] },
              fat: { grams: fat, range: [g(20, 9), g(35, 9)] } },
    fiber, nutrients, sodiumMax: 2300,
    bmi: { value: Math.round(bmiVal * 10) / 10, category: bmiVal < 18.5 ? "Underweight" : bmiVal >= 30 ? "Obesity range" : bmiVal >= 25 ? "Overweight" : "Healthy range" },
    water: sex === "male" ? 3.7 : 2.7,
    // exactly what optimizeDiet() needs
    optimizerTargets: {
      calories, proteinMin: protein, fiber,
      calcium: nutrients.Calcium.amount, iron: nutrients.Iron.amount, potassium: nutrients.Potassium.amount,
      vitc: nutrients["Vitamin C"].amount, sodium: 2300,
    },
  };
}
