/**
 * Load the optimizer's data from Supabase and save plans for signed-in users.
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   import { optimizeDiet } from "./dietOptimizer.js";
 *   import { loadOptimizerData, savePlan } from "./supabaseData.js";
 *
 *   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 *   const data = await loadOptimizerData(supabase);              // foods, diets, groupCaps, settings
 *   const result = optimizeDiet(targets, { diet: "Vegan", data });
 *   await savePlan(supabase, { targets, prefs: { diet: "Vegan" }, result });   // needs a signed-in user
 *
 * Prices edited in the Supabase table editor reach the website immediately; the built-in data in
 * dietOptimizer.js is only the fallback.
 */

const num = (v) => (v == null ? null : Number(v));

/** Convert a public.foods row to the optimizer's food shape. */
export function foodFromRow(r) {
  return {
    id: r.id, name: r.name, group: r.food_group, type: r.food_type,
    price: num(r.price), package_g: num(r.package_g), edible_yield: num(r.edible_yield),
    cost_per_100g: num(r.cost_per_100g), bls_cost_per_100g: num(r.bls_cost_per_100g),
    serving_g: num(r.serving_g), serving_desc: r.serving_desc, max_servings: num(r.max_servings),
    meal: [num(r.meal_breakfast), num(r.meal_lunch), num(r.meal_dinner), num(r.meal_snacks)],
    flags: r.flags || [], cup_eq_g: num(r.cup_eq_g), cap_group: r.cap_group, ndb: r.usda_ndb,
    per100g: {
      kcal: num(r.kcal), protein: num(r.protein), carb: num(r.carb), fat: num(r.fat), fiber: num(r.fiber),
      sugar: num(r.sugar), calcium: num(r.calcium), iron: num(r.iron), potassium: num(r.potassium),
      sodium: num(r.sodium), vitc: num(r.vitc),
    },
  };
}

export function dietFromRow(r) {
  return { name: r.name, desc: r.description, protein: [num(r.protein_min), num(r.protein_max)],
    carb: [num(r.carb_min), num(r.carb_max)], fat: [num(r.fat_min), num(r.fat_max)], forbid: r.forbid || [],
    forbid_foods: r.forbid_foods || [] };
}

export function groupCapFromRow(r) {
  return { key: r.key, label: r.label, unit: r.unit, max: num(r.max_amount), note: r.note };
}

/** Fetch foods, diets, group caps and default settings (all readable with the anon key). */
export async function loadOptimizerData(supabase) {
  const [foods, diets, caps, settings] = await Promise.all([
    supabase.from("foods").select("*").order("sort_order"),
    supabase.from("diets").select("*").order("sort_order"),
    supabase.from("group_caps").select("*"),
    supabase.from("optimizer_settings").select("key, value"),
  ]);
  for (const r of [foods, diets, caps, settings]) if (r.error) throw r.error;
  return {
    foods: foods.data.map(foodFromRow),
    diets: diets.data.map(dietFromRow),
    groupCaps: caps.data.map(groupCapFromRow),
    settings: Object.fromEntries(settings.data.map((s) => [s.key, s.value])),
  };
}

/** Save a plan for the signed-in user (row level security limits users to their own plans). */
export async function savePlan(supabase, { targets, prefs, result }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to save plans.");
  const { data, error } = await supabase.from("saved_plans").insert({
    user_id: user.id, diet: result.diet, targets, prefs: { ...prefs, data: undefined },
    cost_per_day: result.costPerDay, result: { meals: result.meals, totals: result.totals, plan: result.plan },
  }).select().single();
  if (error) throw error;
  return data;
}

/** The signed-in user's saved plans, newest first. */
export async function listPlans(supabase) {
  const { data, error } = await supabase.from("saved_plans").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
