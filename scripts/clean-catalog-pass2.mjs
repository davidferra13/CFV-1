/**
 * Catalog Cleanup Pass 2: remove remaining non-food, reclassify Other items
 */
import { getDb } from '../lib/db.mjs';

function main() {
  const db = getDb();
  db.pragma('foreign_keys = OFF');

  // Remove obvious non-food from Other
  const otherItems = db.prepare("SELECT ingredient_id, name FROM canonical_ingredients WHERE category = 'Other'").all();
  const nonFoodPatterns = /bandage|band.aid|condom|trojan|tampon|pad |pads |diaper|wipe |wipes|detergent|cleaner|cleaning|bleach|trash bag|garbage|paper towel|toilet paper|tissue|napkin|laundry|fabric soft|dryer sheet|dish soap|sponge|scrub|mop|broom|vacuum|air fresh|candle|deodor|battery|energizer|duracell|light ?bulb|toothpaste|toothbrush|shampoo|conditioner|body wash|soap |lotion|sunscreen|razor|shav|lip balm|blistex|makeup|mascara|nail polish|hair |schick|dove |axe |old spice|pantene|cat food|dog food|pet |flea|collar|litter|fork |knife |spoon |plate |cup |bowl |pan |pot |container|wrap |foil |plastic bag|zip ?loc|glad|hefty|reynolds|clorox|lysol|tide|downy|gain |all |purex|arm.hammer|oxiclean|febreze|glade|pledge|windex|dawn |cascade|finish |jet.dry|bounty|charmin|cottonelle|scott |quilted|swiff|medicine|allergy|pain relief|ibuprofen|acetaminophen|aspirin|antacid|tums|pepcid|nexium|prilosec|zyrtec|claritin|benadryl|tylenol|advil|motrin|aleve|metamucil|fiber suppl|vitamin|supplement|probiotic|melatonin|colgate|crest|oral.b|listerine|sensodyne|floss|mouthwash|first aid|thermometer|latex|nitrile|glove|mask|hammer|screwdriver|tape |duct|electrical|bulb|fuse|hampton/i;

  let removed = 0;
  for (const item of otherItems) {
    if (nonFoodPatterns.test(item.name)) {
      db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id = ?').run(item.ingredient_id);
      removed++;
    }
  }
  console.log('Non-food removed: ' + removed);

  // Reclassify more food items from Other
  const remaining = db.prepare("SELECT ingredient_id, name FROM canonical_ingredients WHERE category = 'Other'").all();
  let reclassified = 0;
  const rules = [
    [/salad|slaw|coleslaw/i, 'Produce'],
    [/wrap|bagel|pita|naan|flatbread|english muffin|ciabatta/i, 'Grains & Bakery'],
    [/bar |bars |granola|trail mix|fruit snack/i, 'Snacks'],
    [/pickle|relish|olive|caper|preserve|jam|jelly|marmalade/i, 'Pantry'],
    [/wine|whiskey|whisky|scotch|bourbon|tequila|mezcal|rum |vodka|gin |brandy|cognac|liqueur|vermouth|champagne|prosecco|cava|beer|ale |lager|stout|porter|ipa |cider|seltzer|hard |malt/i, 'Beverages'],
    [/dressing|marinade|glaze/i, 'Pantry'],
    [/mix |seasoning|spice blend|rub /i, 'Oils & Spices'],
  ];
  const update = db.prepare('UPDATE canonical_ingredients SET category = ? WHERE ingredient_id = ?');
  for (const item of remaining) {
    for (const [pattern, cat] of rules) {
      if (pattern.test(item.name)) {
        update.run(cat, item.ingredient_id);
        reclassified++;
        break;
      }
    }
  }
  console.log('Reclassified: ' + reclassified);

  db.pragma('foreign_keys = ON');

  // Final stats
  const total = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  const withPrices = db.prepare('SELECT COUNT(DISTINCT canonical_ingredient_id) as c FROM current_prices').get();
  const cats = db.prepare('SELECT category, COUNT(*) as c FROM canonical_ingredients GROUP BY category ORDER BY c DESC').all();
  console.log('');
  console.log('=== FINAL CATALOG ===');
  console.log('Total food items: ' + total.c);
  console.log('Items with prices: ' + withPrices.c);
  console.log('');
  cats.forEach(function(r) { console.log('  ' + r.category + ': ' + r.c); });
  db.close();
}

main();
