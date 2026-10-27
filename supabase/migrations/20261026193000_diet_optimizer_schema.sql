-- FeasaBULL diet optimizer — schema (EGN4450 Team 9)
-- Reference data the optimizer reads (foods, diets, group caps, settings) + plans users save.
-- Reference tables: anyone can read, only the service role / dashboard can write.
-- saved_plans: each signed-in user sees and manages only their own rows.

-- ---------------------------------------------------------------- foods
create table if not exists public.foods (
  id                text primary key,
  name              text not null,
  food_group        text not null,          -- Proteins, Dairy & Alternatives, Carbohydrates, Fruits, Vegetables, Fats, Oils & Nuts, Snacks & Sweets
  food_type         text not null,          -- Poultry, Red Meat & Pork, Fish & Seafood, Eggs, Plant Proteins, ...
  sort_order        integer not null,
  store_product     text,
  price             numeric(10, 3) not null check (price >= 0),
  package_g         numeric not null check (package_g > 0),
  edible_yield      numeric not null check (edible_yield > 0 and edible_yield <= 1),
  price_note        text,
  price_observed    date,
  bls_price         numeric,
  bls_unit_g        numeric,
  serving_g         numeric not null check (serving_g > 0),
  serving_desc      text,
  max_servings      numeric not null check (max_servings >= 0),
  meal_breakfast    numeric not null default 0,
  meal_lunch        numeric not null default 0,
  meal_dinner       numeric not null default 0,
  meal_snacks       numeric not null default 0,
  flags             text[] not null default '{}',   -- meat, pork, poultry, fish, egg, dairy, gluten
  cup_eq_g          numeric,                        -- grams per USDA cup-equivalent (vegetables and fruit only)
  cap_group         text,                           -- key in public.group_caps
  usda_ndb          text,
  usda_desc         text,
  -- nutrients per 100 g edible portion (USDA SR28)
  kcal numeric not null, protein numeric not null, carb numeric not null, fat numeric not null,
  fiber numeric not null, sugar numeric not null, calcium numeric not null, iron numeric not null,
  potassium numeric not null, sodium numeric not null, vitc numeric not null,
  -- $ per 100 g edible, always consistent with the price columns
  cost_per_100g     numeric generated always as (price / (package_g * edible_yield) * 100) stored,
  bls_cost_per_100g numeric generated always as (
                      case when bls_price is null or bls_unit_g is null then null
                           else bls_price / (bls_unit_g * edible_yield) * 100 end) stored,
  updated_at        timestamptz not null default now(),
  constraint meal_shares_sum_to_one check (abs(meal_breakfast + meal_lunch + meal_dinner + meal_snacks - 1) < 0.0001)
);
comment on table public.foods is 'Foods the optimizer can choose from: price, edible yield, serving, meal pattern, diet flags and USDA nutrients per 100 g.';

-- ---------------------------------------------------------------- diets
create table if not exists public.diets (
  name         text primary key,
  description  text not null,
  sort_order   integer not null,
  protein_min  numeric not null, protein_max numeric not null,
  carb_min     numeric not null, carb_max    numeric not null,
  fat_min      numeric not null, fat_max     numeric not null,
  forbid       text[] not null default '{}',   -- food attributes the diet excludes (meat, pork, poultry, fish, egg, dairy, gluten)
  forbid_foods text[] not null default '{}',   -- individual food ids the diet excludes (from its "no" list in config/diets.json)
  constraint macro_ranges_valid check (
    protein_min <= protein_max and carb_min <= carb_max and fat_min <= fat_max
    and protein_min + carb_min + fat_min <= 1 and protein_max + carb_max + fat_max >= 1)
);
comment on table public.diets is 'Diet presets (source: config/diets.json): macro split as fractions of calories, the food flags each diet forbids, and individual foods it excludes.';

-- ---------------------------------------------------------------- group caps and settings
create table if not exists public.group_caps (
  key         text primary key,
  label       text not null,
  unit        text not null check (unit in ('grams', 'servings')),
  max_amount  numeric not null check (max_amount >= 0),
  note        text
);

create table if not exists public.optimizer_settings (
  key    text primary key,
  value  jsonb not null
);
comment on table public.optimizer_settings is 'Default balance rules (calorie tolerance, protein share, meal calorie bands, veg/fruit minimums).';

-- ---------------------------------------------------------------- saved plans (per user)
create table if not exists public.saved_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  diet          text references public.diets (name),
  targets       jsonb not null,     -- what the calculator produced
  prefs         jsonb not null,     -- exclusions, must-include foods, price source
  cost_per_day  numeric,
  result        jsonb not null      -- optimizeDiet() output (meals, totals)
);
create index if not exists saved_plans_user_created_idx on public.saved_plans (user_id, created_at desc);

-- ---------------------------------------------------------------- row level security
alter table public.foods              enable row level security;
alter table public.diets              enable row level security;
alter table public.group_caps         enable row level security;
alter table public.optimizer_settings enable row level security;
alter table public.saved_plans        enable row level security;

drop policy if exists "foods are public" on public.foods;
create policy "foods are public" on public.foods for select to anon, authenticated using (true);
drop policy if exists "diets are public" on public.diets;
create policy "diets are public" on public.diets for select to anon, authenticated using (true);
drop policy if exists "group caps are public" on public.group_caps;
create policy "group caps are public" on public.group_caps for select to anon, authenticated using (true);
drop policy if exists "settings are public" on public.optimizer_settings;
create policy "settings are public" on public.optimizer_settings for select to anon, authenticated using (true);

drop policy if exists "read own plans" on public.saved_plans;
create policy "read own plans" on public.saved_plans for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "save own plans" on public.saved_plans;
create policy "save own plans" on public.saved_plans for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "delete own plans" on public.saved_plans;
create policy "delete own plans" on public.saved_plans for delete to authenticated using ((select auth.uid()) = user_id);

-- keep updated_at current when a price or nutrient is edited
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists foods_touch_updated_at on public.foods;
create trigger foods_touch_updated_at before update on public.foods
  for each row execute function public.touch_updated_at();
