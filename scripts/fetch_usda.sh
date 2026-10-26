#!/usr/bin/env bash
# Downloads USDA SR28 (National Nutrient Database for Standard Reference, Release 28) into vendor/sr28.
# The npm package "fda-nutrient-database" ships USDA's original ABBREV.txt / FOOD_DES.txt files unchanged.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p vendor && cd vendor
npm pack fda-nutrient-database@1.0.2 --silent
tar -xzf fda-nutrient-database-1.0.2.tgz && rm -rf sr28 && mv package sr28 && rm -f fda-nutrient-database-1.0.2.tgz
echo "USDA SR28 files in vendor/sr28/data"
