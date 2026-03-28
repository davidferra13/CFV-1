/**
 * OpenClaw - Cross-Matcher
 * Links Flipp-priced items to proper canonical ingredients.
 *
 * Problem: Flipp items like "Springvale 100% Grass Fed Ribeye Steak" are stored
 * under auto-generated slugs instead of mapping to `beef-ribeye`. This script
 * matches every uncategorized priced item to the best canonical ingredient.
 *
 * Approach:
 *   1. Extract food keywords from the Flipp product name
 *   2. Score against all canonical ingredients (USDA + manual catalog)
 *   3. If score > threshold, re-link the price to the canonical ingredient
 *   4. Remove orphaned auto-generated entries
 */

import { getDb } from '../lib/db.mjs';
import { isFoodItem } from '../lib/normalize-rules.mjs';

// ============================================================================
// SMART MATCHING RULES
// These map common product terms to canonical ingredient IDs.
// Much more aggressive than the scraper's keyword rules.
// ============================================================================

const MATCH_RULES = [
  // BEEF
  { terms: ['ribeye', 'rib eye', 'rib-eye'], target: 'beef-ribeye', cat: 'beef' },
  { terms: ['sirloin'], target: 'beef-sirloin', cat: 'beef' },
  { terms: ['tenderloin', 'filet mignon'], target: 'beef-tenderloin', cat: 'beef', require: ['beef'] },
  { terms: ['strip steak', 'ny strip', 'new york strip'], target: 'beef-strip-steak', cat: 'beef' },
  { terms: ['flank steak'], target: 'beef-flank-steak', cat: 'beef' },
  { terms: ['skirt steak'], target: 'beef-skirt-steak', cat: 'beef' },
  { terms: ['chuck roast', 'chuck steak'], target: 'beef-chuck-roast', cat: 'beef' },
  { terms: ['brisket'], target: 'beef-brisket', cat: 'beef' },
  { terms: ['short rib'], target: 'beef-short-ribs', cat: 'beef' },
  { terms: ['ground beef', 'ground chuck'], target: 'beef-ground-80-20', cat: 'beef' },
  { terms: ['stew meat', 'stewing beef'], target: 'beef-stew-meat', cat: 'beef' },
  { terms: ['t-bone', 't bone'], target: 'beef-t-bone', cat: 'beef' },
  { terms: ['porterhouse'], target: 'beef-porterhouse', cat: 'beef' },
  { terms: ['prime rib'], target: 'beef-prime-rib', cat: 'beef' },
  { terms: ['london broil'], target: 'beef-london-broil', cat: 'beef' },
  { terms: ['corned beef'], target: 'corned-beef', cat: 'beef' },
  { terms: ['beef jerky'], target: 'beef-jerky', cat: 'beef' },
  { terms: ['oxtail', 'ox tail'], target: 'beef-oxtail', cat: 'beef' },

  // POULTRY
  { terms: ['chicken breast'], target: 'chicken-breast-boneless-skinless', cat: 'poultry' },
  { terms: ['chicken thigh'], target: 'chicken-thigh-boneless', cat: 'poultry' },
  { terms: ['chicken wing'], target: 'chicken-wings', cat: 'poultry' },
  { terms: ['chicken drumstick', 'chicken drum'], target: 'chicken-drumsticks', cat: 'poultry' },
  { terms: ['chicken tender'], target: 'chicken-tenders', cat: 'poultry' },
  { terms: ['whole chicken', 'roasting chicken'], target: 'chicken-whole', cat: 'poultry' },
  { terms: ['rotisserie chicken'], target: 'chicken-whole', cat: 'poultry' },
  { terms: ['ground chicken'], target: 'chicken-ground', cat: 'poultry' },
  { terms: ['ground turkey'], target: 'turkey-ground', cat: 'poultry' },
  { terms: ['turkey breast'], target: 'turkey-breast', cat: 'poultry' },
  { terms: ['cornish hen', 'cornish game'], target: 'cornish-hen', cat: 'poultry' },

  // PORK
  { terms: ['pork chop'], target: 'pork-chops', cat: 'pork' },
  { terms: ['pork tenderloin'], target: 'pork-tenderloin', cat: 'pork' },
  { terms: ['pork shoulder', 'pork butt', 'boston butt'], target: 'pork-shoulder', cat: 'pork' },
  { terms: ['pork belly'], target: 'pork-belly', cat: 'pork' },
  { terms: ['pork loin'], target: 'pork-loin', cat: 'pork' },
  { terms: ['baby back rib'], target: 'pork-ribs-baby-back', cat: 'pork' },
  { terms: ['spare rib'], target: 'pork-ribs-spare', cat: 'pork' },
  { terms: ['st. louis rib', 'st louis rib'], target: 'pork-ribs-st-louis', cat: 'pork' },
  { terms: ['ground pork'], target: 'pork-ground', cat: 'pork' },
  { terms: ['bacon'], target: 'bacon', cat: 'pork', exclude: ['turkey bacon'] },
  { terms: ['turkey bacon'], target: 'turkey-bacon', cat: 'poultry' },
  { terms: ['pancetta'], target: 'pancetta', cat: 'pork' },
  { terms: ['prosciutto'], target: 'prosciutto', cat: 'pork' },
  { terms: ['italian sausage'], target: 'sausage-italian', cat: 'pork' },
  { terms: ['breakfast sausage'], target: 'sausage-breakfast', cat: 'pork' },
  { terms: ['kielbasa'], target: 'sausage-kielbasa', cat: 'pork' },
  { terms: ['andouille'], target: 'sausage-andouille', cat: 'pork' },
  { terms: ['chorizo'], target: 'sausage-chorizo', cat: 'pork' },
  { terms: ['bratwurst', 'brat'], target: 'bratwurst', cat: 'pork' },
  { terms: ['hot dog', 'frank'], target: 'hot-dogs', cat: 'pork' },
  { terms: ['pepperoni'], target: 'pepperoni', cat: 'pork' },
  { terms: ['salami'], target: 'salami', cat: 'pork' },
  { terms: ['ham', 'tavern ham', 'deli ham', 'sliced ham', 'shank ham', 'spiral ham'], target: 'ham-sliced', cat: 'pork' },

  // LAMB
  { terms: ['rack of lamb', 'lamb rack'], target: 'lamb-rack', cat: 'lamb' },
  { terms: ['lamb chop', 'lamb loin chop'], target: 'lamb-chops', cat: 'lamb' },
  { terms: ['leg of lamb', 'lamb leg'], target: 'lamb-leg', cat: 'lamb' },
  { terms: ['lamb shank'], target: 'lamb-shank', cat: 'lamb' },
  { terms: ['ground lamb'], target: 'lamb-ground', cat: 'lamb' },

  // SEAFOOD
  { terms: ['salmon', 'atlantic salmon', 'salmon fillet'], target: 'salmon-atlantic-fillet', cat: 'seafood' },
  { terms: ['sockeye salmon'], target: 'salmon-sockeye', cat: 'seafood' },
  { terms: ['smoked salmon', 'lox'], target: 'salmon-smoked', cat: 'seafood' },
  { terms: ['tuna steak', 'ahi tuna', 'yellowfin tuna'], target: 'tuna-ahi', cat: 'seafood' },
  { terms: ['canned tuna', 'tuna pouch', 'chunk light tuna', 'solid white tuna', 'starkist', 'bumble bee'], target: 'tuna-canned', cat: 'seafood' },
  { terms: ['cod', 'cod fillet'], target: 'cod-fillet', cat: 'seafood' },
  { terms: ['haddock'], target: 'haddock-fillet', cat: 'seafood' },
  { terms: ['halibut'], target: 'halibut-fillet', cat: 'seafood' },
  { terms: ['swordfish'], target: 'swordfish-steak', cat: 'seafood' },
  { terms: ['tilapia'], target: 'tilapia', cat: 'seafood' },
  { terms: ['shrimp'], target: 'shrimp-large', cat: 'seafood' },
  { terms: ['scallop'], target: 'scallops-sea', cat: 'seafood' },
  { terms: ['lobster tail'], target: 'lobster-tail', cat: 'seafood' },
  { terms: ['lobster'], target: 'lobster-whole', cat: 'seafood' },
  { terms: ['crab'], target: 'crab-meat', cat: 'seafood' },
  { terms: ['clam'], target: 'clams-littleneck', cat: 'seafood' },
  { terms: ['mussel'], target: 'mussels', cat: 'seafood' },
  { terms: ['sardine'], target: 'sardines', cat: 'seafood' },
  { terms: ['canned salmon'], target: 'salmon-canned', cat: 'seafood' },
  { terms: ['fish stick', 'fish finger'], target: 'fish-sticks-frozen', cat: 'seafood' },
  { terms: ['mahi'], target: 'mahi-mahi', cat: 'seafood' },
  { terms: ['sea bass'], target: 'sea-bass', cat: 'seafood' },
  { terms: ['trout'], target: 'trout-rainbow', cat: 'seafood' },

  // DAIRY
  { terms: ['american cheese'], target: 'cheese-american', cat: 'dairy' },
  { terms: ['cheddar'], target: 'cheese-cheddar', cat: 'dairy' },
  { terms: ['mozzarella', 'mozz'], target: 'cheese-mozzarella', cat: 'dairy' },
  { terms: ['fresh mozzarella', 'burrata'], target: 'cheese-mozzarella-fresh', cat: 'dairy' },
  { terms: ['parmesan', 'parmigiano'], target: 'cheese-parmesan', cat: 'dairy' },
  { terms: ['swiss cheese'], target: 'cheese-swiss', cat: 'dairy' },
  { terms: ['provolone'], target: 'cheese-provolone', cat: 'dairy' },
  { terms: ['gouda'], target: 'cheese-gouda', cat: 'dairy' },
  { terms: ['brie'], target: 'cheese-brie', cat: 'dairy' },
  { terms: ['feta'], target: 'cheese-feta', cat: 'dairy' },
  { terms: ['goat cheese', 'chevre'], target: 'cheese-goat', cat: 'dairy' },
  { terms: ['ricotta'], target: 'cheese-ricotta', cat: 'dairy' },
  { terms: ['cream cheese', 'philadelphia'], target: 'cream-cheese', cat: 'dairy' },
  { terms: ['cottage cheese'], target: 'cheese-cottage', cat: 'dairy' },
  { terms: ['colby jack', 'co-jack'], target: 'cheese-colby-jack', cat: 'dairy' },
  { terms: ['pepper jack'], target: 'cheese-pepper-jack', cat: 'dairy' },
  { terms: ['monterey jack'], target: 'cheese-monterey-jack', cat: 'dairy' },
  { terms: ['havarti'], target: 'cheese-havarti', cat: 'dairy' },
  { terms: ['string cheese'], target: 'cheese-string', cat: 'dairy' },
  { terms: ['babybel', 'laughing cow', 'cheese wedge'], target: 'cheese-string', cat: 'dairy' },
  { terms: ['butter'], target: 'butter-unsalted', cat: 'dairy', exclude: ['peanut butter', 'almond butter', 'cashew butter', 'butter lettuce'] },
  { terms: ['heavy cream', 'whipping cream'], target: 'cream-heavy', cat: 'dairy' },
  { terms: ['sour cream'], target: 'sour-cream', cat: 'dairy' },
  { terms: ['half and half', 'half & half'], target: 'half-and-half', cat: 'dairy' },
  { terms: ['milk'], target: 'milk-whole', cat: 'dairy', exclude: ['almond milk', 'oat milk', 'soy milk', 'coconut milk', 'milk-bone'] },
  { terms: ['almond milk'], target: 'milk-almond', cat: 'dairy' },
  { terms: ['oat milk'], target: 'milk-oat', cat: 'dairy' },
  { terms: ['yogurt', 'greek yogurt'], target: 'yogurt-greek', cat: 'dairy' },
  { terms: ['egg', 'eggs', 'dozen eggs', 'large eggs'], target: 'eggs-large', cat: 'eggs', exclude: ['egg noodle', 'eggplant', 'egg roll'] },
  { terms: ['cool whip', 'reddi-wip', 'whipped cream', 'whipped topping'], target: 'cream-heavy', cat: 'dairy' },

  // PRODUCE
  { terms: ['grape', 'grapes', 'seedless grape'], target: 'grape-red', cat: 'produce' },
  { terms: ['strawberr'], target: 'strawberries', cat: 'produce' },
  { terms: ['blueberr'], target: 'blueberries', cat: 'produce' },
  { terms: ['raspberr'], target: 'raspberries', cat: 'produce' },
  { terms: ['blackberr'], target: 'blackberries', cat: 'produce' },
  { terms: ['cranberr'], target: 'cranberries', cat: 'produce' },
  { terms: ['apple'], target: 'apple', cat: 'produce', exclude: ['apple juice', 'apple cider', 'apple sauce', 'applesauce', 'apple butter'] },
  { terms: ['banana'], target: 'banana', cat: 'produce' },
  { terms: ['orange'], target: 'orange', cat: 'produce', exclude: ['orange juice', 'orange bell'] },
  { terms: ['lemon'], target: 'lemon', cat: 'produce', exclude: ['lemon juice', 'lemonade', 'lemongrass', 'lemon extract'] },
  { terms: ['lime'], target: 'lime', cat: 'produce', exclude: ['lime juice', 'limeade'] },
  { terms: ['watermelon'], target: 'watermelon', cat: 'produce' },
  { terms: ['cantaloupe'], target: 'cantaloupe', cat: 'produce' },
  { terms: ['pineapple'], target: 'pineapple', cat: 'produce' },
  { terms: ['mango'], target: 'mango', cat: 'produce', exclude: ['mango juice', 'dried mango'] },
  { terms: ['peach'], target: 'peach', cat: 'produce', exclude: ['peach juice'] },
  { terms: ['avocado'], target: 'avocado', cat: 'produce' },
  { terms: ['tomato'], target: 'tomato', cat: 'produce', exclude: ['tomato sauce', 'tomato paste', 'tomato juice', 'sun-dried', 'sun dried', 'canned tomato', 'crushed tomato', 'diced tomato', 'stewed tomato'] },
  { terms: ['onion'], target: 'onion-yellow', cat: 'produce', exclude: ['onion ring', 'onion powder', 'french onion', 'onion dip'] },
  { terms: ['potato', 'potatoes'], target: 'potato-russet', cat: 'produce', exclude: ['potato chip', 'potato salad', 'sweet potato', 'mashed potato', 'french fries', 'tater tot'] },
  { terms: ['sweet potato'], target: 'sweet-potato', cat: 'produce' },
  { terms: ['carrot'], target: 'carrot', cat: 'produce', exclude: ['carrot cake'] },
  { terms: ['celery'], target: 'celery', cat: 'produce' },
  { terms: ['broccoli'], target: 'broccoli', cat: 'produce' },
  { terms: ['cauliflower'], target: 'cauliflower', cat: 'produce' },
  { terms: ['spinach'], target: 'spinach', cat: 'produce' },
  { terms: ['kale'], target: 'kale', cat: 'produce' },
  { terms: ['lettuce', 'romaine'], target: 'lettuce-romaine', cat: 'produce' },
  { terms: ['cucumber'], target: 'cucumber', cat: 'produce' },
  { terms: ['zucchini'], target: 'zucchini', cat: 'produce' },
  { terms: ['mushroom'], target: 'mushroom-button', cat: 'produce' },
  { terms: ['asparagus'], target: 'asparagus', cat: 'produce' },
  { terms: ['corn on the cob', 'sweet corn', 'corn ears'], target: 'corn-sweet', cat: 'produce' },
  { terms: ['bell pepper', 'green pepper', 'red pepper'], target: 'bell-pepper-red', cat: 'produce', exclude: ['red pepper flake'] },
  { terms: ['brussels sprout'], target: 'brussels-sprouts', cat: 'produce' },
  { terms: ['green bean'], target: 'green-beans', cat: 'produce', exclude: ['canned green bean'] },
  { terms: ['artichoke'], target: 'artichoke', cat: 'produce', exclude: ['artichoke heart', 'canned artichoke'] },
  { terms: ['eggplant'], target: 'eggplant', cat: 'produce' },

  // PANTRY / CANNED / SAUCES
  { terms: ['olive oil'], target: 'olive-oil-evoo', cat: 'oils' },
  { terms: ['vegetable oil'], target: 'oil-vegetable', cat: 'oils' },
  { terms: ['canola oil'], target: 'oil-canola', cat: 'oils' },
  { terms: ['coconut oil'], target: 'oil-coconut', cat: 'oils' },
  { terms: ['peanut butter'], target: 'peanut-butter', cat: 'pantry' },
  { terms: ['jelly', 'preserves', 'jam'], target: 'peanut-butter', cat: 'pantry' },
  { terms: ['ketchup'], target: 'ketchup', cat: 'pantry' },
  { terms: ['mustard'], target: 'mustard-yellow', cat: 'pantry', exclude: ['mustard green', 'mustard seed', 'mustard powder'] },
  { terms: ['mayonnaise', 'mayo'], target: 'mayonnaise', cat: 'pantry' },
  { terms: ['ranch dressing', 'ranch'], target: 'mayonnaise', cat: 'pantry' },
  { terms: ['salsa'], target: 'salsa-jarred', cat: 'pantry' },
  { terms: ['bbq sauce', 'barbecue sauce'], target: 'mayonnaise', cat: 'pantry' },
  { terms: ['soy sauce', 'tamari'], target: 'soy-sauce', cat: 'pantry' },
  { terms: ['hot sauce', 'frank\'s red hot', 'tabasco', 'cholula'], target: 'hot-sauce', cat: 'pantry' },
  { terms: ['sriracha'], target: 'sriracha', cat: 'pantry' },
  { terms: ['pasta sauce', 'marinara', 'tomato sauce', 'spaghetti sauce'], target: 'marinara-jarred', cat: 'pantry' },
  { terms: ['pesto'], target: 'pesto-jarred', cat: 'pantry' },
  { terms: ['alfredo sauce'], target: 'alfredo-jarred', cat: 'pantry' },
  { terms: ['tomato paste'], target: 'tomato-paste', cat: 'pantry' },
  { terms: ['crushed tomato', 'diced tomato', 'canned tomato', 'stewed tomato', 'whole peeled tomato'], target: 'tomatoes-crushed-canned', cat: 'pantry' },
  { terms: ['san marzano'], target: 'tomatoes-san-marzano', cat: 'pantry' },
  { terms: ['broth', 'stock', 'bouillon'], target: 'stock-chicken', cat: 'pantry' },
  { terms: ['soup'], target: 'stock-chicken', cat: 'pantry', exclude: ['soup bowl', 'soup spoon'] },
  { terms: ['coconut milk'], target: 'coconut-milk', cat: 'pantry' },
  { terms: ['pickle', 'claussen', 'vlasic'], target: 'pickles-dill', cat: 'pantry' },
  { terms: ['olive'], target: 'olives-black', cat: 'pantry', exclude: ['olive oil', 'olive garden'] },

  // GRAINS / BAKERY
  { terms: ['rice'], target: 'rice-white-long', cat: 'grains', exclude: ['rice cake', 'rice krispie', 'rice noodle', 'rice vinegar', 'rice milk', 'rice pudding'] },
  { terms: ['pasta', 'spaghetti', 'penne', 'rigatoni', 'linguine', 'fettuccine', 'angel hair', 'ziti', 'rotini', 'barilla'], target: 'pasta-spaghetti', cat: 'grains' },
  { terms: ['bread'], target: 'bread-white', cat: 'grains', exclude: ['breadcrumb', 'bread knife', 'bread pudding'] },
  { terms: ['english muffin'], target: 'english-muffins', cat: 'grains' },
  { terms: ['bagel'], target: 'bagels', cat: 'grains' },
  { terms: ['tortilla'], target: 'tortilla-flour', cat: 'grains' },
  { terms: ['cereal', 'cheerios', 'frosted flakes', 'lucky charms', 'cinnamon toast', 'puffs'], target: 'oats-rolled', cat: 'grains' },
  { terms: ['granola'], target: 'oats-rolled', cat: 'grains' },
  { terms: ['oatmeal', 'oats'], target: 'oats-rolled', cat: 'grains' },
  { terms: ['flour'], target: 'flour-all-purpose', cat: 'pantry', exclude: ['flour tortilla'] },
  { terms: ['sugar'], target: 'sugar-granulated', cat: 'pantry', exclude: ['sugar snap'] },
  { terms: ['cracker', 'ritz', 'triscuit', 'goldfish', 'cheez-it'], target: 'crackers-ritz', cat: 'grains' },
  { terms: ['pie crust', 'graham cracker'], target: 'pie-crust', cat: 'grains' },
  { terms: ['pizza'], target: 'pizza-dough', cat: 'grains', exclude: ['pizza sauce'] },
  { terms: ['tortellini', 'ravioli'], target: 'tortellini-cheese', cat: 'grains' },

  // FROZEN
  { terms: ['ice cream', 'gelato', 'frozen yogurt'], target: 'yogurt-vanilla', cat: 'dairy' },
  { terms: ['frozen fries', 'french fries', 'tater tot'], target: 'potato-russet', cat: 'produce' },
  { terms: ['frozen pizza'], target: 'pizza-dough', cat: 'grains' },

  // BEVERAGES
  { terms: ['coffee', 'espresso'], target: 'coffee-ground', cat: 'beverages', exclude: ['coffee cake', 'coffee table'] },
  { terms: ['tea'], target: 'tea-black', cat: 'beverages', exclude: ['tea tree', 'steak', 'steam'] },
  { terms: ['juice', 'simply juice', 'tropicana', 'minute maid'], target: 'juice-orange', cat: 'beverages' },
  { terms: ['seltzer', 'sparkling water', 'polar seltzer', 'la croix', 'bubly'], target: 'juice-orange', cat: 'beverages' },
  { terms: ['water', 'fiji', 'poland spring', 'dasani', 'aquafina', 'essentia', 'eternal'], target: 'juice-orange', cat: 'beverages', exclude: ['watermelon', 'water chestnut', 'coconut water'] },
  { terms: ['soda', 'pepsi', 'coca-cola', 'dr pepper', 'mountain dew', 'sprite'], target: 'juice-orange', cat: 'beverages' },
  { terms: ['energy drink', 'red bull', 'monster energy', 'celsius', 'alani nu', 'c4', 'ghost energy'], target: 'juice-orange', cat: 'beverages' },
  { terms: ['protein shake', 'protein drink', 'core power'], target: 'juice-orange', cat: 'beverages' },

  // SNACKS & SWEETS
  { terms: ['chip', 'dorito', 'lays', 'ruffles', 'tostitos', 'pringles', 'kettle'], target: 'crackers-ritz', cat: 'pantry', exclude: ['chocolate chip'] },
  { terms: ['cookie', 'oreo', 'chips ahoy'], target: 'crackers-ritz', cat: 'pantry' },
  { terms: ['chocolate', 'm&m', 'snickers', 'twix', 'reese', 'hershey', 'kit kat'], target: 'chocolate-chips-semi', cat: 'pantry' },
  { terms: ['candy', 'jelly bean', 'gummy', 'nerds'], target: 'chocolate-chips-semi', cat: 'pantry' },
  { terms: ['granola bar', 'protein bar', 'nature valley', 'kind bar', 'clif bar'], target: 'oats-rolled', cat: 'grains' },
  { terms: ['dried cranberr', 'craisin'], target: 'cranberries-dried', cat: 'pantry' },
  { terms: ['popcorn'], target: 'crackers-ritz', cat: 'pantry' },

  // DELI / PREPARED
  { terms: ['lunch meat', 'deli meat', 'deli turkey', 'deli ham', 'deli chicken'], target: 'ham-sliced', cat: 'pork' },
  { terms: ['hummus'], target: 'chickpeas-canned', cat: 'pantry' },
  { terms: ['guacamole'], target: 'avocado', cat: 'produce' },

  // BAKING
  { terms: ['vanilla extract'], target: 'vanilla-extract', cat: 'pantry' },
  { terms: ['baking powder'], target: 'baking-powder', cat: 'pantry' },
  { terms: ['baking soda'], target: 'baking-soda', cat: 'pantry' },
  { terms: ['cocoa powder', 'cocoa'], target: 'cocoa-powder', cat: 'pantry' },
  { terms: ['chocolate chip'], target: 'chocolate-chips-semi', cat: 'pantry' },
  { terms: ['honey'], target: 'honey', cat: 'pantry', exclude: ['honeydew', 'honeycrisp', 'honey mustard'] },
  { terms: ['maple syrup'], target: 'maple-syrup', cat: 'pantry' },
];

// Additional non-food items to reject during cross-matching
const ADDITIONAL_NON_FOOD = [
  'tulip', 'flower', 'bouquet', 'floral', 'plant', 'garden soil', 'potting',
  'cold & flu', 'cold and flu', 'allergy relief', 'pain relief',
  'bread knife', 'chef knife', 'kitchen tool', 'baking pan', 'sheet pan',
  'cutting board', 'utensil', 'spatula', 'tong',
  'plastic wrap', 'food wrap', 'aluminum foil', 'parchment paper', 'wax paper',
  'ziploc', 'glad bag', 'hefty bag', 'reynolds wrap',
  'paper plate', 'paper cup', 'plastic cup', 'solo cup',
  'dexter russell', 'victorinox',
  'air filter', 'water filter', 'brita',
  'gift card', 'prepaid card',
  'magazine', 'book',
  'plant food', 'miracle-gro', 'scotts',
  'flea collar', 'dog collar',
  'greeting card', 'wrapping paper',
];

function main() {
  console.log('=== OpenClaw Cross-Matcher ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Match rules: ${MATCH_RULES.length}`);

  const db = getDb();

  // Get all uncategorized priced items
  const uncategorized = db.prepare(`
    SELECT cp.id, cp.raw_product_name, cp.canonical_ingredient_id, cp.price_cents,
           cp.price_unit, cp.source_id, cp.price_type, cp.price_per_standard_unit_cents,
           cp.standard_unit, cp.package_size, cp.pricing_tier, cp.confidence, cp.source_url
    FROM current_prices cp
    JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.category = 'uncategorized'
  `).all();

  console.log(`Uncategorized priced items: ${uncategorized.length}`);

  let matched = 0;
  let removed = 0;
  let kept = 0;

  const updateStmt = db.prepare('UPDATE current_prices SET canonical_ingredient_id = ? WHERE id = ?');

  for (const item of uncategorized) {
    const lower = item.raw_product_name.toLowerCase();

    // First check additional non-food
    const isNonFood = ADDITIONAL_NON_FOOD.some(kw => lower.includes(kw));
    if (isNonFood || !isFoodItem(item.raw_product_name)) {
      // Delete this non-food price
      db.prepare('DELETE FROM current_prices WHERE id = ?').run(item.id);
      removed++;
      continue;
    }

    // Try to match against rules
    let bestMatch = null;
    for (const rule of MATCH_RULES) {
      // Check if any term matches
      const termMatches = rule.terms.some(t => lower.includes(t));
      if (!termMatches) continue;

      // Check excludes
      if (rule.exclude && rule.exclude.some(e => lower.includes(e))) continue;

      // Check require (must also contain these)
      if (rule.require && !rule.require.every(r => lower.includes(r))) continue;

      bestMatch = rule;
      break;
    }

    if (bestMatch) {
      // Check that the target ingredient exists
      const targetExists = db.prepare('SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id = ?').get(bestMatch.target);
      if (targetExists) {
        updateStmt.run(bestMatch.target, item.id);
        matched++;
      } else {
        // Target doesn't exist, keep as-is
        kept++;
      }
    } else {
      kept++;
    }
  }

  // Clean orphaned ingredients
  const orphans = db.prepare(`
    SELECT ci.ingredient_id FROM canonical_ingredients ci
    LEFT JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE cp.id IS NULL AND ci.category = 'uncategorized' AND ci.ingredient_id NOT LIKE 'usda-%'
  `).all();

  let orphansRemoved = 0;
  for (const o of orphans) {
    try {
      db.prepare('DELETE FROM price_changes WHERE canonical_ingredient_id = ?').run(o.ingredient_id);
      db.prepare('DELETE FROM price_anomalies WHERE canonical_ingredient_id = ?').run(o.ingredient_id);
      db.prepare('DELETE FROM price_trends WHERE canonical_ingredient_id = ?').run(o.ingredient_id);
      db.prepare('DELETE FROM price_monthly_summary WHERE canonical_ingredient_id = ?').run(o.ingredient_id);
      db.prepare('DELETE FROM normalization_map WHERE canonical_ingredient_id = ?').run(o.ingredient_id);
      db.prepare('DELETE FROM ingredient_variants WHERE ingredient_id = ?').run(o.ingredient_id);
      db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id = ?').run(o.ingredient_id);
      orphansRemoved++;
    } catch (err) { /* FK constraint, skip */ }
  }

  // Final stats
  const totalPrices = db.prepare('SELECT COUNT(*) as c FROM current_prices').get();
  const totalIngredients = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  const categorizedPrices = db.prepare(`
    SELECT COUNT(*) as c FROM current_prices cp
    JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.category != 'uncategorized'
  `).get();

  // Category coverage
  const byCat = db.prepare(`
    SELECT ci.category, COUNT(DISTINCT ci.ingredient_id) as total,
      COUNT(DISTINCT cp.canonical_ingredient_id) as priced
    FROM canonical_ingredients ci
    LEFT JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
    GROUP BY ci.category ORDER BY priced DESC
  `).all();

  console.log(`\n=== Cross-Match Results ===`);
  console.log(`Matched to catalog: ${matched}`);
  console.log(`Non-food removed: ${removed}`);
  console.log(`Kept as-is (no match): ${kept}`);
  console.log(`Orphaned ingredients cleaned: ${orphansRemoved}`);
  console.log(`\n=== Updated State ===`);
  console.log(`Total prices: ${totalPrices.c}`);
  console.log(`Categorized prices: ${categorizedPrices.c} (${((categorizedPrices.c/totalPrices.c)*100).toFixed(0)}%)`);
  console.log(`Total ingredients: ${totalIngredients.c}`);

  console.log(`\n=== Category Price Coverage ===`);
  byCat.forEach(s => {
    if (s.total > 0) console.log(`  ${s.category}: ${s.priced}/${s.total} (${((s.priced/s.total)*100).toFixed(0)}%)`);
  });
}

main();
