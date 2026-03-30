import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const dir = new URL('./usda-sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const foods = parse(readFileSync(dir + 'food.csv', 'utf8'), { columns: true, skip_empty_lines: true });
const cats = parse(readFileSync(dir + 'food_category.csv', 'utf8'), { columns: true, skip_empty_lines: true });
const catMap = Object.fromEntries(cats.map(c => [c.id, c.description]));

const mapping = JSON.parse(readFileSync(new URL('./usda-category-mapping.json', import.meta.url), 'utf8'));
const excluded = JSON.parse(readFileSync(new URL('./usda-excluded-groups.json', import.meta.url), 'utf8'));
const exclSet = new Set(excluded.excluded_ids);

const ids = new Set(foods.map(f => f.food_category_id));
for (const id of [...ids].sort((a,b) => Number(a) - Number(b))) {
  const inMap = id in mapping.group_defaults;
  const inExcl = exclSet.has(id);
  const count = foods.filter(f => f.food_category_id === id).length;
  const status = inMap ? 'MAPPED' : inExcl ? 'EXCLUDED' : 'UNMAPPED';
  if (status === 'UNMAPPED') {
    console.log(`UNMAPPED: id=${id} name="${catMap[id] || '?'}" count=${count}`);
  }
}
