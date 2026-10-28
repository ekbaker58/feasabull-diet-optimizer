#!/usr/bin/env bash
# Apply the Supabase migrations to a throwaway local Postgres (16+) and check row level security.
# Needs initdb/pg_ctl/psql on PATH (or set PGBIN). Run as a normal (non-root) user.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=${PGBIN:-$(dirname "$(command -v initdb || echo /usr/lib/postgresql/16/bin/initdb)")}
D=$(mktemp -d); trap '"$PGBIN/pg_ctl" -D "$D/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$D"' EXIT
"$PGBIN/initdb" -D "$D/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$D/data" -o "-p 55432 -k $D -c listen_addresses=''" -l "$D/log" -w start >/dev/null
P="psql -h $D -p 55432 -U postgres -v ON_ERROR_STOP=1 -q -At"
$P -c "create database t"; $P -d t -f tests/supabase_stubs.sql
for f in supabase/migrations/*.sql; do $P -d t -f "$f" 2>/dev/null; done
$P -d t -f supabase/migrations/20261026193100_seed_diet_data.sql   # second run: upserts must not fail
A=11111111-1111-1111-1111-111111111111; B=22222222-2222-2222-2222-222222222222
$P -d t -c "insert into auth.users values ('$A'),('$B')"
test "$($P -d t -c "set role anon; select count(*) from foods" | tail -1)" = 71
N=$(python3 -c "import json; print(len(json.load(open('config/diets.json'))['diets']))")
test "$($P -d t -c "set role anon; select count(*) from diets where forbid_foods is not null" | tail -1)" = "$N"   # every diet from config/diets.json, with its food-level exclusions column
! $P -d t -c "set role anon; insert into saved_plans (user_id,targets,prefs,result) values ('$A','{}','{}','{}')" 2>/dev/null
$P -d t -c "set request.jwt.claim.sub='$A'; set role authenticated; insert into saved_plans (targets,prefs,result) values ('{}','{}','{}')"
! $P -d t -c "set request.jwt.claim.sub='$A'; set role authenticated; insert into saved_plans (user_id,targets,prefs,result) values ('$B','{}','{}','{}')" 2>/dev/null
test "$($P -d t -c "set request.jwt.claim.sub='$B'; set role authenticated; select count(*) from saved_plans" | tail -1)" = 0
echo "Supabase migrations OK: 71 foods, $N diets, re-runnable seed, row level security behaves as documented."
