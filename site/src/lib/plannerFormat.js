/** Formatters for the planner. Explicit locale everywhere, so SSR matches the client. */

export const fmt = (n, digits = 0) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const money = (n, digits = 2) => `$${fmt(n, digits)}`;

export const pct = (v) => `${Math.round(v * 100)}%`;

/** "2.5 × 1/2 cup cooked · 214 g", or just the serving when it is about one. */
export function servingText(item) {
  const s = item.servings;
  const quantity =
    s >= 0.95 && s <= 1.05 ? item.serving : `${fmt(s, s < 10 ? 1 : 0)} × ${item.serving}`;
  return `${quantity} · ${fmt(item.grams)} g`;
}

/** Grams as bought -> the unit a shopper thinks in. */
export function buyAmount(grams, metric) {
  if (metric) return grams >= 1000 ? `${fmt(grams / 1000, 1)} kg` : `${fmt(grams)} g`;
  return grams >= 453.6 ? `${fmt(grams / 453.592, 1)} lb` : `${fmt(grams / 28.3495, 1)} oz`;
}

export const NUTRIENT_LABELS = {
  kcal: "Calories",
  protein: "Protein",
  carb: "Carbohydrate",
  fat: "Fat",
  fiber: "Fiber",
  sugar: "Total sugars",
  calcium: "Calcium",
  iron: "Iron",
  potassium: "Potassium",
  sodium: "Sodium",
  vitc: "Vitamin C",
};
