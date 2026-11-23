/**
 * Dietary Reference Intake maths, from the Institute of Medicine tables — the
 * same basis as the USDA DRI calculator.
 *
 * Source: Dietary Reference Intakes for Energy, Macronutrients, Vitamins and
 * Minerals (National Academies of Sciences, Engineering, and Medicine).
 */

export const ACTIVITY_LEVELS = [
  {
    id: "inactive",
    label: "Inactive",
    blurb: "Mostly sitting — classes, desk work, little movement.",
    adultPA: 1.0,
    youthPA: 1.0,
  },
  {
    id: "low",
    label: "Low active",
    blurb: "Walking across campus, light exercise a few days a week.",
    adultPA: 1.11,
    youthPA: 1.13,
  },
  {
    id: "active",
    label: "Active",
    blurb: "Moderate exercise 3–5 days a week, or an active job.",
    adultPA: 1.25,
    youthPA: 1.26,
  },
  {
    id: "very",
    label: "Very active",
    blurb: "Hard training 6–7 days a week, two-a-days or manual work.",
    adultPA: 1.48,
    youthPA: 1.42,
  },
];

export const GOALS = [
  { id: "lose", label: "Lose fat", blurb: "About 0.5 lb a week", delta: -500 },
  { id: "maintain", label: "Maintain", blurb: "Hold your current weight", delta: 0 },
  { id: "build", label: "Build muscle", blurb: "Slow, lean surplus", delta: 350 },
];

const round = (n) => Math.round(n);
const roundTo10 = (n) => Math.round(n / 10) * 10;

/**
 * Estimated Energy Requirement. Under 19s use the IOM youth equations, which
 * carry their own physical-activity coefficients plus an energy-deposition
 * allowance for growth.
 */
export function estimateEnergyRequirement({ sex, age, heightCm, weightKg, activityId }) {
  const activity = ACTIVITY_LEVELS.find((a) => a.id === activityId) ?? ACTIVITY_LEVELS[2];
  const heightM = heightCm / 100;
  const kg = weightKg;

  if (age < 19) {
    return sex === "male"
      ? 88.5 - 61.9 * age + activity.youthPA * (26.7 * kg + 903 * heightM) + 25
      : 135.3 - 30.8 * age + activity.youthPA * (10 * kg + 934 * heightM) + 20;
  }

  return sex === "male"
    ? 662 - 9.53 * age + activity.adultPA * (15.91 * kg + 539.6 * heightM)
    : 354 - 6.91 * age + activity.adultPA * (9.36 * kg + 726 * heightM);
}

export function calculateBmi({ heightCm, weightKg }) {
  const heightM = heightCm / 100;
  const value = weightKg / (heightM * heightM);

  let category = "Healthy range";
  if (value < 18.5) category = "Underweight";
  else if (value >= 30) category = "Obesity range";
  else if (value >= 25) category = "Overweight";

  return { value: Math.round(value * 10) / 10, category };
}

export function waterTarget(sex) {
  const liters = sex === "male" ? 3.7 : 2.7;
  return { liters, cups: Math.round(liters / 0.237) };
}

/**
 * Macros inside the Acceptable Macronutrient Distribution Ranges. Protein is
 * anchored at 1.6 g/kg but clamped into its 10–35% AMDR, fat takes 30% of
 * calories, and carbohydrate absorbs the remainder.
 */
export function macroTargets(calories, weightKg, fiberGrams) {
  const gramsFromPercent = (percent, kcalPerGram) =>
    round((percent / 100) * (calories / kcalPerGram));
  const percentFromGrams = (grams, kcalPerGram) =>
    round(((grams * kcalPerGram) / calories) * 100);

  const proteinGrams = Math.min(
    Math.max(round(1.6 * weightKg), gramsFromPercent(10, 4)),
    gramsFromPercent(30, 4),
  );
  const fatGrams = gramsFromPercent(30, 9);
  const carbGrams = Math.max(0, round((calories - proteinGrams * 4 - fatGrams * 9) / 4));

  const proteinPercent = percentFromGrams(proteinGrams, 4);
  const fatPercent = percentFromGrams(fatGrams, 9);
  const carbPercent = Math.max(0, 100 - proteinPercent - fatPercent);

  return [
    {
      key: "protein",
      label: "Protein",
      low: 10,
      high: 35,
      suggested: proteinPercent,
      grams: proteinGrams,
      lowGrams: gramsFromPercent(10, 4),
      highGrams: gramsFromPercent(35, 4),
      note: `Anchored at 1.6 g per kg for ${round(weightKg)} kg of body weight`,
    },
    {
      key: "carbs",
      label: "Carbs",
      low: 45,
      high: 65,
      suggested: carbPercent,
      grams: carbGrams,
      lowGrams: gramsFromPercent(45, 4),
      highGrams: gramsFromPercent(65, 4),
      note: `Covers the rest of your energy — ${fiberGrams} g of it as fiber`,
    },
    {
      key: "fat",
      label: "Fat",
      low: 20,
      high: 35,
      suggested: fatPercent,
      grams: fatGrams,
      lowGrams: gramsFromPercent(20, 9),
      highGrams: gramsFromPercent(35, 9),
      note: "30% of calories — keep saturated fat under 10%",
    },
  ];
}

function ageBand(age) {
  if (age < 19) return "teen";
  if (age <= 30) return "young";
  if (age <= 50) return "mid";
  if (age <= 70) return "older";
  return "oldest";
}

/** Each band holds [male, female] recommended intakes. */
export const NUTRIENT_DRI = [
  { name: "Vitamin A", unit: "mcg RAE", teen: [900, 700], young: [900, 700], mid: [900, 700], older: [900, 700], oldest: [900, 700] },
  { name: "Vitamin C", unit: "mg", teen: [75, 65], young: [90, 75], mid: [90, 75], older: [90, 75], oldest: [90, 75] },
  { name: "Vitamin D", unit: "mcg", teen: [15, 15], young: [15, 15], mid: [15, 15], older: [15, 15], oldest: [20, 20] },
  { name: "Vitamin E", unit: "mg", teen: [15, 15], young: [15, 15], mid: [15, 15], older: [15, 15], oldest: [15, 15] },
  { name: "Vitamin K", unit: "mcg", teen: [120, 75], young: [120, 90], mid: [120, 90], older: [120, 90], oldest: [120, 90] },
  { name: "Thiamin (B1)", unit: "mg", teen: [1.2, 1.0], young: [1.2, 1.1], mid: [1.2, 1.1], older: [1.2, 1.1], oldest: [1.2, 1.1] },
  { name: "Riboflavin (B2)", unit: "mg", teen: [1.3, 1.0], young: [1.3, 1.1], mid: [1.3, 1.1], older: [1.3, 1.1], oldest: [1.3, 1.1] },
  { name: "Niacin (B3)", unit: "mg", teen: [16, 14], young: [16, 14], mid: [16, 14], older: [16, 14], oldest: [16, 14] },
  { name: "Vitamin B6", unit: "mg", teen: [1.3, 1.2], young: [1.3, 1.3], mid: [1.3, 1.3], older: [1.7, 1.5], oldest: [1.7, 1.5] },
  { name: "Folate", unit: "mcg DFE", teen: [400, 400], young: [400, 400], mid: [400, 400], older: [400, 400], oldest: [400, 400] },
  { name: "Vitamin B12", unit: "mcg", teen: [2.4, 2.4], young: [2.4, 2.4], mid: [2.4, 2.4], older: [2.4, 2.4], oldest: [2.4, 2.4] },
  { name: "Calcium", unit: "mg", teen: [1300, 1300], young: [1000, 1000], mid: [1000, 1000], older: [1000, 1200], oldest: [1200, 1200] },
  { name: "Iron", unit: "mg", teen: [11, 15], young: [8, 18], mid: [8, 18], older: [8, 8], oldest: [8, 8] },
  { name: "Magnesium", unit: "mg", teen: [410, 360], young: [400, 310], mid: [420, 320], older: [420, 320], oldest: [420, 320] },
  { name: "Zinc", unit: "mg", teen: [11, 9], young: [11, 8], mid: [11, 8], older: [11, 8], oldest: [11, 8] },
  { name: "Potassium", unit: "mg", teen: [3000, 2300], young: [3400, 2600], mid: [3400, 2600], older: [3400, 2600], oldest: [3400, 2600] },
  { name: "Omega-3 (ALA)", unit: "g", teen: [1.6, 1.1], young: [1.6, 1.1], mid: [1.6, 1.1], older: [1.6, 1.1], oldest: [1.6, 1.1] },
];

/**
 * The DRI table plus the two calorie-dependent / intake-capped rows. Fiber
 * lands at index 15 and sodium at the end, which is the order the report
 * renders them in.
 */
export function nutrientTargets(sex, age, calories) {
  const band = ageBand(age);
  const column = sex === "male" ? 0 : 1;
  const fiber = Math.round((14 * calories) / 1000);

  const rows = NUTRIENT_DRI.map((n) => ({
    name: n.name,
    unit: n.unit,
    amount: n[band][column],
  }));

  rows.splice(15, 0, { name: "Fiber", unit: "g", amount: fiber });
  rows.push({
    name: "Sodium",
    unit: "mg",
    amount: 1500,
    note: "Adequate intake — keep under 2,300 mg",
  });

  return rows;
}

/** Calorie floors, so an aggressive deficit can't drop below a safe intake. */
const CALORIE_FLOOR = { male: 1500, female: 1200 };

export function buildPlan({ sex, age, heightCm, weightKg, activityId, goal = "maintain" }) {
  const maintenance = roundTo10(
    estimateEnergyRequirement({ sex, age, heightCm, weightKg, activityId }),
  );
  const floor = CALORIE_FLOOR[sex] ?? CALORIE_FLOOR.female;

  const goals = GOALS.map((g) => ({
    ...g,
    calories: Math.max(floor, roundTo10(maintenance + g.delta)),
  }));
  const selected = goals.find((g) => g.id === goal) ?? goals[1];
  const calories = selected.calories;
  const fiber = Math.round((14 * calories) / 1000);

  return {
    maintenance,
    calories,
    goal: selected,
    goals,
    macros: macroTargets(calories, weightKg, fiber),
    fiber,
    bmi: calculateBmi({ heightCm, weightKg }),
    water: waterTarget(sex),
    nutrients: nutrientTargets(sex, age, calories),
  };
}

export function validateForm(form) {
  const errors = {};

  if (!form.sex) errors.sex = "Pick one — the equations differ by sex.";

  const age = Number(form.age);
  if (!form.age || Number.isNaN(age) || age < 14 || age > 99) {
    errors.age = "Enter an age between 14 and 99.";
  }

  let heightCm;
  let weightKg;

  if (form.units === "metric") {
    heightCm = Number(form.cm);
    if (!heightCm || heightCm < 120 || heightCm > 230) {
      errors.height = "Enter a height between 120 and 230 cm.";
    }
    weightKg = Number(form.kg);
    if (!weightKg || weightKg < 35 || weightKg > 275) {
      errors.weight = "Enter a weight between 35 and 275 kg.";
    }
  } else {
    const totalInches = Number(form.ft) * 12 + Number(form.inch || 0);
    heightCm = Math.round(totalInches * 2.54);
    if (!form.ft || totalInches < 47 || totalInches > 91) {
      errors.height = `Enter a height between 3'11" and 7'7".`;
    }
    weightKg = Number(form.lb) * 0.45359237;
    if (!form.lb || weightKg < 35 || weightKg > 275) {
      errors.weight = "Enter a weight between 77 and 600 lb.";
    }
  }

  if (Object.keys(errors).length) return { errors };

  return {
    errors: {},
    metrics: {
      sex: form.sex,
      age,
      heightCm,
      weightKg: Math.round(weightKg * 10) / 10,
      activityId: form.activityId,
    },
  };
}

/** Plain-text version of a plan, for the Copy report button. */
export function formatReport(plan, summary) {
  return [
    "Feasabull Calories — USF",
    summary,
    "",
    `${plan.calories} kcal a day (${plan.goal.label})`,
    `Maintenance: ${plan.maintenance} kcal`,
    "",
    ...plan.macros.map(
      (m) =>
        `${m.label}: ${m.grams} g (${m.suggested}% — range ${m.lowGrams}–${m.highGrams} g)`,
    ),
    `Fiber: ${plan.fiber} g`,
    `Water: ${plan.water.liters} L (about ${plan.water.cups} cups, including food)`,
    `BMI: ${plan.bmi.value} (${plan.bmi.category})`,
    "",
    "Daily vitamin & mineral targets:",
    ...plan.nutrients.map((n) => `· ${n.name}: ${n.amount} ${n.unit}`),
    "",
    "Estimates based on the Institute of Medicine DRIs. Not medical advice.",
  ].join("\n");
}
