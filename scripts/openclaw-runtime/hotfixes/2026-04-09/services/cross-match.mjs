/**
 * OpenClaw - Cross-Matcher v2
 * Links priced items to canonical ingredients with expanded rules.
 *
 * v2 changes:
 * - 3x more match rules (pantry, produce, spices, baking, grains)
 * - Brand stripping before matching
 * - Fuzzy token overlap as fallback
 * - Better non-food filtering
 */

import { getDb } from '../lib/db.mjs';
import { isFoodItem } from '../lib/normalize-rules.mjs';
import { lookupMemory, recordMatch } from './norm-memory.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBusyError(err) {
  return err?.code === 'SQLITE_BUSY' || /database is locked/i.test(err?.message || '');
}

async function runWithBusyRetries(label, fn, attempts = 3) {
  let lastErr;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isBusyError(err) || attempt === attempts) {
        throw err;
      }

      const delayMs = attempt * 30000;
      console.warn(`${label}: database is locked; retrying in ${delayMs / 1000}s (${attempt}/${attempts - 1})`);
      await sleep(delayMs);
    }
  }

  throw lastErr;
}

// ============================================================================
// BRAND STRIPPING - remove brand prefixes before matching
// ============================================================================

const BRAND_PREFIXES = [
  'springvale', '365', '365 everyday value', '365 by whole foods',
  'organic valley', 'applegate', 'perdue', 'tyson', 'barilla',
  'dole', 'del monte', 'green giant', 'birds eye', 'stouffers',
  'hannaford', 'market basket', 'stop & shop', 'stop and shop',
  'great value', 'kirkland', 'kirkland signature', 'member\'s mark',
  'private selection', 'simple truth', 'essential everyday',
  'good & gather', 'market pantry', 'archer farms',
  'annie\'s', 'amy\'s', 'newman\'s own', 'kraft', 'heinz',
  'kellogg\'s', 'general mills', 'post', 'quaker',
  'bumble bee', 'starkist', 'chicken of the sea',
  'hellmann\'s', 'best foods', 'french\'s', 'hunt\'s',
  'pillsbury', 'betty crocker', 'duncan hines',
  'land o lakes', 'cabot', 'tillamook', 'horizon',
  'oscar mayer', 'boar\'s head', 'hillshire farm',
  'nature\'s promise', 'bowl & basket', 'clover valley',
  'wyman\'s', 'cascadian farm', 'muir glen',
];

function stripBrand(name) {
  let lower = name.toLowerCase().trim();
  for (const brand of BRAND_PREFIXES) {
    if (lower.startsWith(brand + ' ')) {
      lower = lower.slice(brand.length).trim();
      break;
    }
  }
  return lower;
}

// ============================================================================
// MATCH RULES - expanded for full coverage
// ============================================================================

const MATCH_RULES = [
  // ===== BEEF =====
  { terms: ['ribeye', 'rib eye', 'rib-eye'], target: 'beef-ribeye', cat: 'beef' },
  { terms: ['sirloin'], target: 'beef-sirloin', cat: 'beef' },
  { terms: ['tenderloin', 'filet mignon'], target: 'beef-tenderloin', cat: 'beef', require: ['beef'] },
  { terms: ['strip steak', 'ny strip', 'new york strip'], target: 'beef-strip-steak', cat: 'beef' },
  { terms: ['flank steak'], target: 'beef-flank-steak', cat: 'beef' },
  { terms: ['skirt steak'], target: 'beef-skirt-steak', cat: 'beef' },
  { terms: ['chuck roast', 'chuck steak'], target: 'beef-chuck-roast', cat: 'beef' },
  { terms: ['brisket'], target: 'beef-brisket', cat: 'beef' },
  { terms: ['short rib'], target: 'beef-short-ribs', cat: 'beef' },
  { terms: ['ground beef', 'ground chuck', 'ground round', 'ground sirloin'], target: 'beef-ground-80-20', cat: 'beef' },
  { terms: ['stew meat', 'stewing beef', 'beef stew'], target: 'beef-stew-meat', cat: 'beef' },
  { terms: ['t-bone', 't bone'], target: 'beef-t-bone', cat: 'beef' },
  { terms: ['porterhouse'], target: 'beef-porterhouse', cat: 'beef' },
  { terms: ['prime rib', 'standing rib'], target: 'beef-prime-rib', cat: 'beef' },
  { terms: ['london broil'], target: 'beef-london-broil', cat: 'beef' },
  { terms: ['corned beef'], target: 'corned-beef', cat: 'beef' },
  { terms: ['oxtail', 'ox tail'], target: 'beef-oxtail', cat: 'beef' },
  { terms: ['beef jerky'], target: 'beef-jerky', cat: 'beef' },
  { terms: ['round steak', 'top round', 'bottom round', 'eye round'], target: 'beef-round', cat: 'beef' },
  { terms: ['flat iron'], target: 'beef-flat-iron', cat: 'beef' },
  { terms: ['tri-tip', 'tri tip'], target: 'beef-tri-tip', cat: 'beef' },
  { terms: ['beef shank'], target: 'beef-shank', cat: 'beef' },

  // ===== POULTRY =====
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
  { terms: ['chicken leg', 'chicken quarter'], target: 'chicken-leg-quarters', cat: 'poultry' },
  { terms: ['duck breast'], target: 'duck-breast', cat: 'poultry' },
  { terms: ['whole duck'], target: 'duck-whole', cat: 'poultry' },

  // ===== PORK =====
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
  { terms: ['breakfast sausage', 'pork sausage'], target: 'sausage-breakfast', cat: 'pork' },
  { terms: ['kielbasa'], target: 'sausage-kielbasa', cat: 'pork' },
  { terms: ['andouille'], target: 'sausage-andouille', cat: 'pork' },
  { terms: ['chorizo'], target: 'sausage-chorizo', cat: 'pork' },
  { terms: ['bratwurst', 'brat'], target: 'bratwurst', cat: 'pork' },
  { terms: ['hot dog', 'frank'], target: 'hot-dogs', cat: 'pork' },
  { terms: ['pepperoni'], target: 'pepperoni', cat: 'pork' },
  { terms: ['salami'], target: 'salami', cat: 'pork' },
  { terms: ['ham', 'tavern ham', 'deli ham', 'sliced ham', 'shank ham', 'spiral ham'], target: 'ham-sliced', cat: 'pork' },

  // ===== LAMB =====
  { terms: ['rack of lamb', 'lamb rack'], target: 'lamb-rack', cat: 'lamb' },
  { terms: ['lamb chop', 'lamb loin chop'], target: 'lamb-chops', cat: 'lamb' },
  { terms: ['leg of lamb', 'lamb leg'], target: 'lamb-leg', cat: 'lamb' },
  { terms: ['lamb shank'], target: 'lamb-shank', cat: 'lamb' },
  { terms: ['ground lamb'], target: 'lamb-ground', cat: 'lamb' },
  { terms: ['lamb shoulder'], target: 'lamb-shoulder', cat: 'lamb' },

  // ===== SEAFOOD =====
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
  { terms: ['anchov'], target: 'anchovies', cat: 'seafood' },
  { terms: ['mahi'], target: 'mahi-mahi', cat: 'seafood' },
  { terms: ['sea bass'], target: 'sea-bass', cat: 'seafood' },
  { terms: ['trout'], target: 'trout-rainbow', cat: 'seafood' },
  { terms: ['catfish'], target: 'catfish', cat: 'seafood' },
  { terms: ['canned salmon'], target: 'salmon-canned', cat: 'seafood' },
  { terms: ['fish stick', 'fish finger'], target: 'fish-sticks-frozen', cat: 'seafood' },
  { terms: ['calamari', 'squid'], target: 'calamari', cat: 'seafood' },
  { terms: ['octopus'], target: 'octopus', cat: 'seafood' },
  { terms: ['crawfish', 'crayfish'], target: 'crawfish', cat: 'seafood' },

  // ===== DAIRY =====
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
  { terms: ['gruyere', 'gruyère'], target: 'cheese-gruyere', cat: 'dairy' },
  { terms: ['fontina'], target: 'cheese-fontina', cat: 'dairy' },
  { terms: ['camembert'], target: 'cheese-camembert', cat: 'dairy' },
  { terms: ['manchego'], target: 'cheese-manchego', cat: 'dairy' },
  { terms: ['muenster'], target: 'cheese-muenster', cat: 'dairy' },
  { terms: ['string cheese', 'babybel'], target: 'cheese-string', cat: 'dairy' },
  { terms: ['butter'], target: 'butter-unsalted', cat: 'dairy', exclude: ['peanut butter', 'almond butter', 'cashew butter', 'butter lettuce', 'cookie butter', 'sunflower butter'] },
  { terms: ['heavy cream', 'whipping cream'], target: 'cream-heavy', cat: 'dairy' },
  { terms: ['sour cream'], target: 'sour-cream', cat: 'dairy' },
  { terms: ['half and half', 'half & half'], target: 'half-and-half', cat: 'dairy' },
  { terms: ['milk'], target: 'milk-whole', cat: 'dairy', exclude: ['almond milk', 'oat milk', 'soy milk', 'coconut milk', 'milk-bone', 'milkshake'] },
  { terms: ['almond milk'], target: 'milk-almond', cat: 'dairy' },
  { terms: ['oat milk'], target: 'milk-oat', cat: 'dairy' },
  { terms: ['soy milk'], target: 'milk-soy', cat: 'dairy' },
  { terms: ['coconut milk'], target: 'coconut-milk', cat: 'pantry' },
  { terms: ['buttermilk'], target: 'buttermilk', cat: 'dairy' },
  { terms: ['yogurt', 'greek yogurt'], target: 'yogurt-greek', cat: 'dairy' },
  { terms: ['egg', 'eggs', 'dozen eggs', 'large eggs'], target: 'eggs-large', cat: 'eggs', exclude: ['egg noodle', 'eggplant', 'egg roll', 'egg bite'] },
  { terms: ['whipped cream', 'cool whip', 'reddi-wip'], target: 'cream-heavy', cat: 'dairy' },

  // ===== PRODUCE =====
  { terms: ['grape', 'grapes', 'seedless grape'], target: 'grape-red', cat: 'produce' },
  { terms: ['strawberr'], target: 'strawberries', cat: 'produce' },
  { terms: ['blueberr'], target: 'blueberries', cat: 'produce' },
  { terms: ['raspberr'], target: 'raspberries', cat: 'produce' },
  { terms: ['blackberr'], target: 'blackberries', cat: 'produce' },
  { terms: ['cranberr'], target: 'cranberries', cat: 'produce', exclude: ['cranberry sauce', 'cranberry juice'] },
  { terms: ['cherry', 'cherries'], target: 'cherries', cat: 'produce', exclude: ['cherry tomato', 'cherry pie'] },
  { terms: ['apple'], target: 'apple', cat: 'produce', exclude: ['apple juice', 'apple cider', 'apple sauce', 'applesauce', 'apple butter', 'apple pie'] },
  { terms: ['banana'], target: 'banana', cat: 'produce' },
  { terms: ['orange'], target: 'orange', cat: 'produce', exclude: ['orange juice', 'orange bell', 'orange chicken'] },
  { terms: ['lemon'], target: 'lemon', cat: 'produce', exclude: ['lemon juice', 'lemonade', 'lemongrass', 'lemon extract', 'lemon pepper'] },
  { terms: ['lime'], target: 'lime', cat: 'produce', exclude: ['lime juice', 'limeade', 'key lime pie'] },
  { terms: ['watermelon'], target: 'watermelon', cat: 'produce' },
  { terms: ['cantaloupe'], target: 'cantaloupe', cat: 'produce' },
  { terms: ['honeydew'], target: 'honeydew', cat: 'produce' },
  { terms: ['pineapple'], target: 'pineapple', cat: 'produce', exclude: ['pineapple juice'] },
  { terms: ['mango'], target: 'mango', cat: 'produce', exclude: ['mango juice', 'dried mango', 'mango salsa'] },
  { terms: ['peach'], target: 'peach', cat: 'produce', exclude: ['peach juice', 'peach cobbler'] },
  { terms: ['pear'], target: 'pear', cat: 'produce', exclude: ['pear juice'] },
  { terms: ['plum'], target: 'plum', cat: 'produce' },
  { terms: ['nectarine'], target: 'nectarine', cat: 'produce' },
  { terms: ['apricot'], target: 'apricot', cat: 'produce' },
  { terms: ['kiwi'], target: 'kiwi', cat: 'produce' },
  { terms: ['grapefruit'], target: 'grapefruit', cat: 'produce' },
  { terms: ['coconut'], target: 'coconut', cat: 'produce', exclude: ['coconut milk', 'coconut oil', 'coconut cream', 'coconut water'] },
  { terms: ['fig'], target: 'figs', cat: 'produce', exclude: ['fig bar', 'fig newton'] },
  { terms: ['pomegranate'], target: 'pomegranate', cat: 'produce' },
  { terms: ['avocado'], target: 'avocado', cat: 'produce' },
  { terms: ['tomato'], target: 'tomato', cat: 'produce', exclude: ['tomato sauce', 'tomato paste', 'tomato juice', 'sun-dried', 'sun dried', 'canned tomato', 'crushed tomato', 'diced tomato', 'stewed tomato', 'tomato soup'] },
  { terms: ['cherry tomato', 'grape tomato'], target: 'tomato-cherry', cat: 'produce' },
  { terms: ['onion'], target: 'onion-yellow', cat: 'produce', exclude: ['onion ring', 'onion powder', 'french onion', 'onion dip'] },
  { terms: ['red onion'], target: 'onion-red', cat: 'produce' },
  { terms: ['green onion', 'scallion'], target: 'scallion', cat: 'produce' },
  { terms: ['shallot'], target: 'shallot', cat: 'produce' },
  { terms: ['leek'], target: 'leek', cat: 'produce' },
  { terms: ['potato', 'potatoes'], target: 'potato-russet', cat: 'produce', exclude: ['potato chip', 'potato salad', 'sweet potato', 'mashed potato', 'french fries', 'tater tot'] },
  { terms: ['sweet potato', 'yam'], target: 'sweet-potato', cat: 'produce' },
  { terms: ['carrot'], target: 'carrot', cat: 'produce', exclude: ['carrot cake'] },
  { terms: ['celery'], target: 'celery', cat: 'produce' },
  { terms: ['broccoli'], target: 'broccoli', cat: 'produce', exclude: ['broccoli cheddar'] },
  { terms: ['cauliflower'], target: 'cauliflower', cat: 'produce', exclude: ['riced cauliflower'] },
  { terms: ['spinach'], target: 'spinach', cat: 'produce', exclude: ['spinach dip', 'spinach artichoke'] },
  { terms: ['kale'], target: 'kale', cat: 'produce', exclude: ['kale chip'] },
  { terms: ['lettuce', 'romaine'], target: 'lettuce-romaine', cat: 'produce' },
  { terms: ['arugula'], target: 'arugula', cat: 'produce' },
  { terms: ['mixed greens', 'spring mix', 'salad mix', 'salad greens', 'salad blend'], target: 'mixed-greens', cat: 'produce' },
  { terms: ['cucumber'], target: 'cucumber', cat: 'produce' },
  { terms: ['zucchini'], target: 'zucchini', cat: 'produce' },
  { terms: ['yellow squash', 'summer squash'], target: 'squash-yellow', cat: 'produce' },
  { terms: ['butternut squash'], target: 'squash-butternut', cat: 'produce' },
  { terms: ['acorn squash'], target: 'squash-acorn', cat: 'produce' },
  { terms: ['spaghetti squash'], target: 'squash-spaghetti', cat: 'produce' },
  { terms: ['mushroom'], target: 'mushroom-button', cat: 'produce' },
  { terms: ['cremini', 'baby bella'], target: 'mushroom-cremini', cat: 'produce' },
  { terms: ['portobello', 'portabella'], target: 'mushroom-portobello', cat: 'produce' },
  { terms: ['shiitake'], target: 'mushroom-shiitake', cat: 'produce' },
  { terms: ['asparagus'], target: 'asparagus', cat: 'produce' },
  { terms: ['corn on the cob', 'sweet corn', 'corn ears'], target: 'corn-sweet', cat: 'produce' },
  { terms: ['bell pepper', 'green pepper', 'red pepper'], target: 'bell-pepper-red', cat: 'produce', exclude: ['red pepper flake'] },
  { terms: ['jalapeno', 'jalapeño'], target: 'jalapeno', cat: 'produce' },
  { terms: ['serrano pepper'], target: 'serrano', cat: 'produce' },
  { terms: ['habanero'], target: 'habanero', cat: 'produce' },
  { terms: ['poblano'], target: 'poblano', cat: 'produce' },
  { terms: ['brussels sprout'], target: 'brussels-sprouts', cat: 'produce' },
  { terms: ['green bean'], target: 'green-beans', cat: 'produce', exclude: ['canned green bean'] },
  { terms: ['snap pea', 'sugar snap'], target: 'snap-peas', cat: 'produce' },
  { terms: ['snow pea'], target: 'snow-peas', cat: 'produce' },
  { terms: ['artichoke'], target: 'artichoke', cat: 'produce', exclude: ['artichoke heart', 'canned artichoke'] },
  { terms: ['eggplant'], target: 'eggplant', cat: 'produce' },
  { terms: ['beet', 'beets'], target: 'beet', cat: 'produce', exclude: ['beet juice'] },
  { terms: ['turnip'], target: 'turnip', cat: 'produce' },
  { terms: ['parsnip'], target: 'parsnip', cat: 'produce' },
  { terms: ['radish'], target: 'radish', cat: 'produce' },
  { terms: ['fennel'], target: 'fennel', cat: 'produce' },
  { terms: ['bok choy'], target: 'bok-choy', cat: 'produce' },
  { terms: ['cabbage'], target: 'cabbage', cat: 'produce', exclude: ['cabbage roll'] },
  { terms: ['collard green'], target: 'collard-greens', cat: 'produce' },
  { terms: ['swiss chard', 'chard'], target: 'swiss-chard', cat: 'produce' },
  { terms: ['watercress'], target: 'watercress', cat: 'produce' },
  { terms: ['endive'], target: 'endive', cat: 'produce' },
  { terms: ['radicchio'], target: 'radicchio', cat: 'produce' },
  { terms: ['okra'], target: 'okra', cat: 'produce' },
  { terms: ['plantain'], target: 'plantain', cat: 'produce' },
  { terms: ['jicama'], target: 'jicama', cat: 'produce' },
  { terms: ['tomatillo'], target: 'tomatillo', cat: 'produce' },
  { terms: ['garlic'], target: 'garlic', cat: 'produce', exclude: ['garlic powder', 'garlic salt', 'garlic bread'] },
  { terms: ['ginger root', 'fresh ginger'], target: 'ginger-root', cat: 'produce' },

  // ===== HERBS (fresh) =====
  { terms: ['fresh basil', 'basil'], target: 'basil-fresh', cat: 'herbs', exclude: ['dried basil', 'basil pesto'] },
  { terms: ['fresh cilantro', 'cilantro'], target: 'cilantro', cat: 'herbs' },
  { terms: ['fresh parsley', 'parsley'], target: 'parsley', cat: 'herbs', exclude: ['dried parsley'] },
  { terms: ['fresh rosemary', 'rosemary'], target: 'rosemary-fresh', cat: 'herbs', exclude: ['dried rosemary'] },
  { terms: ['fresh thyme', 'thyme'], target: 'thyme-fresh', cat: 'herbs', exclude: ['dried thyme'] },
  { terms: ['fresh dill', 'dill'], target: 'dill-fresh', cat: 'herbs', exclude: ['dill pickle', 'dill seed'] },
  { terms: ['fresh mint', 'mint'], target: 'mint-fresh', cat: 'herbs', exclude: ['mint chocolate', 'peppermint'] },
  { terms: ['chive'], target: 'chives', cat: 'herbs' },
  { terms: ['sage'], target: 'sage-fresh', cat: 'herbs', exclude: ['sausage'] },
  { terms: ['tarragon'], target: 'tarragon', cat: 'herbs' },
  { terms: ['oregano'], target: 'oregano-fresh', cat: 'herbs' },
  { terms: ['lemongrass'], target: 'lemongrass', cat: 'herbs' },

  // ===== SPICES =====
  { terms: ['black pepper', 'peppercorn'], target: 'pepper-black', cat: 'spices' },
  { terms: ['sea salt', 'kosher salt', 'table salt', 'himalayan salt'], target: 'salt-kosher', cat: 'spices' },
  { terms: ['garlic powder'], target: 'garlic-powder', cat: 'spices' },
  { terms: ['onion powder'], target: 'onion-powder', cat: 'spices' },
  { terms: ['paprika', 'smoked paprika'], target: 'paprika', cat: 'spices' },
  { terms: ['cumin'], target: 'cumin-ground', cat: 'spices' },
  { terms: ['chili powder'], target: 'chili-powder', cat: 'spices' },
  { terms: ['cayenne'], target: 'cayenne-pepper', cat: 'spices' },
  { terms: ['cinnamon'], target: 'cinnamon-ground', cat: 'spices' },
  { terms: ['nutmeg'], target: 'nutmeg', cat: 'spices' },
  { terms: ['turmeric'], target: 'turmeric', cat: 'spices' },
  { terms: ['ginger powder', 'ground ginger'], target: 'ginger-ground', cat: 'spices' },
  { terms: ['coriander'], target: 'coriander-ground', cat: 'spices' },
  { terms: ['cardamom'], target: 'cardamom', cat: 'spices' },
  { terms: ['clove'], target: 'cloves', cat: 'spices', exclude: ['garlic clove'] },
  { terms: ['allspice'], target: 'allspice', cat: 'spices' },
  { terms: ['bay lea'], target: 'bay-leaves', cat: 'spices' },
  { terms: ['red pepper flake', 'crushed red pepper'], target: 'red-pepper-flakes', cat: 'spices' },
  { terms: ['italian seasoning'], target: 'italian-seasoning', cat: 'spices' },
  { terms: ['old bay'], target: 'old-bay', cat: 'spices' },
  { terms: ['everything bagel seasoning'], target: 'everything-seasoning', cat: 'spices' },
  { terms: ['taco seasoning'], target: 'taco-seasoning', cat: 'spices' },
  { terms: ['curry powder'], target: 'curry-powder', cat: 'spices' },
  { terms: ['five spice', '5 spice'], target: 'five-spice', cat: 'spices' },
  { terms: ['mustard seed'], target: 'mustard-seed', cat: 'spices' },
  { terms: ['celery seed'], target: 'celery-seed', cat: 'spices' },
  { terms: ['fennel seed'], target: 'fennel-seed', cat: 'spices' },
  { terms: ['sesame seed'], target: 'sesame-seeds', cat: 'spices' },

  // ===== PANTRY / CANNED / SAUCES =====
  { terms: ['olive oil'], target: 'olive-oil-evoo', cat: 'oils' },
  { terms: ['vegetable oil'], target: 'oil-vegetable', cat: 'oils' },
  { terms: ['canola oil'], target: 'oil-canola', cat: 'oils' },
  { terms: ['coconut oil'], target: 'oil-coconut', cat: 'oils' },
  { terms: ['sesame oil'], target: 'oil-sesame', cat: 'oils' },
  { terms: ['avocado oil'], target: 'oil-avocado', cat: 'oils' },
  { terms: ['peanut oil'], target: 'oil-peanut', cat: 'oils' },
  { terms: ['truffle oil'], target: 'oil-truffle', cat: 'oils' },
  { terms: ['peanut butter'], target: 'peanut-butter', cat: 'pantry' },
  { terms: ['almond butter'], target: 'almond-butter', cat: 'pantry' },
  { terms: ['ketchup'], target: 'ketchup', cat: 'pantry' },
  { terms: ['mustard'], target: 'mustard-yellow', cat: 'pantry', exclude: ['mustard green', 'mustard seed', 'mustard powder'] },
  { terms: ['dijon'], target: 'mustard-dijon', cat: 'pantry' },
  { terms: ['mayonnaise', 'mayo'], target: 'mayonnaise', cat: 'pantry' },
  { terms: ['salsa'], target: 'salsa-jarred', cat: 'pantry' },
  { terms: ['bbq sauce', 'barbecue sauce'], target: 'bbq-sauce', cat: 'pantry' },
  { terms: ['soy sauce', 'tamari'], target: 'soy-sauce', cat: 'pantry' },
  { terms: ['fish sauce'], target: 'fish-sauce', cat: 'pantry' },
  { terms: ['worcestershire'], target: 'worcestershire', cat: 'pantry' },
  { terms: ['hot sauce', 'frank\'s red hot', 'tabasco', 'cholula'], target: 'hot-sauce', cat: 'pantry' },
  { terms: ['sriracha'], target: 'sriracha', cat: 'pantry' },
  { terms: ['pasta sauce', 'marinara', 'tomato sauce', 'spaghetti sauce'], target: 'marinara-jarred', cat: 'pantry' },
  { terms: ['pesto'], target: 'pesto-jarred', cat: 'pantry' },
  { terms: ['alfredo sauce'], target: 'alfredo-jarred', cat: 'pantry' },
  { terms: ['tomato paste'], target: 'tomato-paste', cat: 'pantry' },
  { terms: ['crushed tomato', 'diced tomato', 'canned tomato', 'stewed tomato', 'whole peeled tomato'], target: 'tomatoes-crushed-canned', cat: 'pantry' },
  { terms: ['san marzano'], target: 'tomatoes-san-marzano', cat: 'pantry' },
  { terms: ['broth', 'stock', 'bouillon'], target: 'stock-chicken', cat: 'pantry' },
  { terms: ['chicken broth', 'chicken stock'], target: 'stock-chicken', cat: 'pantry' },
  { terms: ['beef broth', 'beef stock'], target: 'stock-beef', cat: 'pantry' },
  { terms: ['vegetable broth', 'vegetable stock'], target: 'stock-vegetable', cat: 'pantry' },
  { terms: ['pickle', 'claussen', 'vlasic'], target: 'pickles-dill', cat: 'pantry' },
  { terms: ['olive'], target: 'olives-black', cat: 'pantry', exclude: ['olive oil', 'olive garden'] },
  { terms: ['caper'], target: 'capers', cat: 'pantry' },
  { terms: ['vinegar'], target: 'vinegar-white', cat: 'pantry' },
  { terms: ['balsamic'], target: 'vinegar-balsamic', cat: 'pantry' },
  { terms: ['apple cider vinegar'], target: 'vinegar-apple-cider', cat: 'pantry' },
  { terms: ['red wine vinegar'], target: 'vinegar-red-wine', cat: 'pantry' },
  { terms: ['rice vinegar'], target: 'vinegar-rice', cat: 'pantry' },
  { terms: ['canned bean', 'black bean', 'kidney bean', 'pinto bean', 'navy bean', 'cannellini', 'great northern', 'garbanzo', 'chickpea'], target: 'beans-black-canned', cat: 'pantry' },
  { terms: ['lentil'], target: 'lentils', cat: 'pantry' },
  { terms: ['dried bean'], target: 'beans-dried', cat: 'pantry' },
  { terms: ['canned corn'], target: 'corn-canned', cat: 'pantry' },
  { terms: ['canned pea', 'green pea'], target: 'peas-canned', cat: 'pantry' },
  { terms: ['cornstarch', 'corn starch'], target: 'cornstarch', cat: 'pantry' },
  { terms: ['breadcrumb', 'panko'], target: 'breadcrumbs', cat: 'pantry' },
  { terms: ['crouton'], target: 'croutons', cat: 'pantry' },
  { terms: ['taco shell', 'taco kit'], target: 'taco-shells', cat: 'pantry' },
  { terms: ['coconut cream'], target: 'coconut-cream', cat: 'pantry' },
  { terms: ['evaporated milk'], target: 'milk-evaporated', cat: 'pantry' },
  { terms: ['condensed milk'], target: 'milk-condensed', cat: 'pantry' },
  { terms: ['dried fruit', 'raisin', 'dried cranberr', 'craisin'], target: 'cranberries-dried', cat: 'pantry' },
  { terms: ['nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'macadamia'], target: 'almonds', cat: 'pantry', exclude: ['nut butter', 'almond milk', 'almond butter', 'coconut'] },
  { terms: ['pine nut'], target: 'pine-nuts', cat: 'pantry' },
  { terms: ['sunflower seed'], target: 'sunflower-seeds', cat: 'pantry' },
  { terms: ['pumpkin seed', 'pepita'], target: 'pumpkin-seeds', cat: 'pantry' },
  { terms: ['tahini'], target: 'tahini', cat: 'pantry' },

  // ===== GRAINS / BAKERY =====
  { terms: ['rice'], target: 'rice-white-long', cat: 'grains', exclude: ['rice cake', 'rice krispie', 'rice noodle', 'rice vinegar', 'rice milk', 'rice pudding', 'riced'] },
  { terms: ['brown rice'], target: 'rice-brown', cat: 'grains' },
  { terms: ['jasmine rice'], target: 'rice-jasmine', cat: 'grains' },
  { terms: ['basmati rice'], target: 'rice-basmati', cat: 'grains' },
  { terms: ['wild rice'], target: 'rice-wild', cat: 'grains' },
  { terms: ['quinoa'], target: 'quinoa', cat: 'grains' },
  { terms: ['couscous'], target: 'couscous', cat: 'grains' },
  { terms: ['pasta', 'spaghetti', 'penne', 'rigatoni', 'linguine', 'fettuccine', 'angel hair', 'ziti', 'rotini', 'barilla', 'fusilli', 'farfalle', 'orzo', 'elbow'], target: 'pasta-spaghetti', cat: 'grains' },
  { terms: ['egg noodle', 'lo mein noodle', 'ramen noodle', 'rice noodle', 'udon', 'soba'], target: 'noodles', cat: 'grains' },
  { terms: ['bread'], target: 'bread-white', cat: 'grains', exclude: ['breadcrumb', 'bread knife', 'bread pudding'] },
  { terms: ['english muffin'], target: 'english-muffins', cat: 'grains' },
  { terms: ['bagel'], target: 'bagels', cat: 'grains' },
  { terms: ['tortilla'], target: 'tortilla-flour', cat: 'grains' },
  { terms: ['pita'], target: 'pita-bread', cat: 'grains' },
  { terms: ['naan'], target: 'naan', cat: 'grains' },
  { terms: ['ciabatta'], target: 'ciabatta', cat: 'grains' },
  { terms: ['baguette'], target: 'baguette', cat: 'grains' },
  { terms: ['croissant'], target: 'croissant', cat: 'grains' },
  { terms: ['flatbread'], target: 'flatbread', cat: 'grains' },
  { terms: ['flour'], target: 'flour-all-purpose', cat: 'pantry', exclude: ['flour tortilla', 'cauliflower'] },
  { terms: ['bread flour'], target: 'flour-bread', cat: 'pantry' },
  { terms: ['whole wheat flour'], target: 'flour-whole-wheat', cat: 'pantry' },
  { terms: ['sugar'], target: 'sugar-granulated', cat: 'pantry', exclude: ['sugar snap'] },
  { terms: ['brown sugar'], target: 'sugar-brown', cat: 'pantry' },
  { terms: ['powdered sugar', 'confectioner'], target: 'sugar-powdered', cat: 'pantry' },
  { terms: ['cracker', 'ritz', 'triscuit', 'goldfish', 'cheez-it'], target: 'crackers-ritz', cat: 'grains' },
  { terms: ['cereal', 'cheerios', 'frosted flakes'], target: 'oats-rolled', cat: 'grains' },
  { terms: ['granola'], target: 'granola', cat: 'grains' },
  { terms: ['oatmeal', 'oats', 'rolled oats'], target: 'oats-rolled', cat: 'grains' },
  { terms: ['pie crust', 'graham cracker crust'], target: 'pie-crust', cat: 'grains' },

  // ===== BAKING =====
  { terms: ['vanilla extract'], target: 'vanilla-extract', cat: 'pantry' },
  { terms: ['almond extract'], target: 'almond-extract', cat: 'pantry' },
  { terms: ['baking powder'], target: 'baking-powder', cat: 'pantry' },
  { terms: ['baking soda'], target: 'baking-soda', cat: 'pantry' },
  { terms: ['cocoa powder', 'cocoa'], target: 'cocoa-powder', cat: 'pantry' },
  { terms: ['chocolate chip'], target: 'chocolate-chips-semi', cat: 'pantry' },
  { terms: ['honey'], target: 'honey', cat: 'pantry', exclude: ['honeydew', 'honeycrisp', 'honey mustard', 'honey ham'] },
  { terms: ['maple syrup'], target: 'maple-syrup', cat: 'pantry' },
  { terms: ['corn syrup'], target: 'corn-syrup', cat: 'pantry' },
  { terms: ['molasses'], target: 'molasses', cat: 'pantry' },
  { terms: ['yeast', 'active dry yeast'], target: 'yeast', cat: 'pantry' },
  { terms: ['gelatin'], target: 'gelatin', cat: 'pantry' },
  { terms: ['food coloring'], target: 'food-coloring', cat: 'pantry' },
  { terms: ['shortening', 'crisco'], target: 'shortening', cat: 'pantry' },
  { terms: ['lard'], target: 'lard', cat: 'pantry' },

  // ===== BEVERAGES =====
  { terms: ['coffee', 'espresso'], target: 'coffee-ground', cat: 'beverages', exclude: ['coffee cake', 'coffee table', 'coffee creamer'] },
  { terms: ['tea'], target: 'tea-black', cat: 'beverages', exclude: ['tea tree', 'steak', 'steam'] },
  { terms: ['juice', 'tropicana', 'minute maid', 'simply'], target: 'juice-orange', cat: 'beverages', exclude: ['lemon juice', 'lime juice'] },
  { terms: ['seltzer', 'sparkling water', 'polar', 'la croix'], target: 'seltzer', cat: 'beverages' },
  { terms: ['soda', 'coca-cola', 'pepsi', 'sprite', 'dr pepper'], target: 'soda', cat: 'beverages' },

  // ===== SNACKS & SWEETS =====
  { terms: ['chip', 'dorito', 'lays', 'ruffles', 'tostitos', 'pringles'], target: 'chips-potato', cat: 'pantry', exclude: ['chocolate chip'] },
  { terms: ['tortilla chip'], target: 'chips-tortilla', cat: 'pantry' },
  { terms: ['popcorn'], target: 'popcorn', cat: 'pantry' },
  { terms: ['pretzel'], target: 'pretzels', cat: 'pantry' },

  // ===== DELI / PREPARED =====
  { terms: ['lunch meat', 'deli meat', 'deli turkey', 'deli ham', 'deli chicken'], target: 'ham-sliced', cat: 'pork' },
  { terms: ['hummus'], target: 'chickpeas-canned', cat: 'pantry' },
  { terms: ['guacamole'], target: 'avocado', cat: 'produce' },
  { terms: ['tofu'], target: 'tofu', cat: 'produce' },
  { terms: ['tempeh'], target: 'tempeh', cat: 'produce' },

  // ===== CONDIMENTS =====
  { terms: ['jam', 'jelly', 'preserves', 'marmalade'], target: 'jam', cat: 'pantry' },
  { terms: ['syrup'], target: 'maple-syrup', cat: 'pantry', exclude: ['corn syrup', 'cough syrup'] },
  { terms: ['ranch dressing', 'ranch'], target: 'ranch-dressing', cat: 'pantry', exclude: ['ranch style'] },
  { terms: ['italian dressing'], target: 'italian-dressing', cat: 'pantry' },
  { terms: ['caesar dressing'], target: 'caesar-dressing', cat: 'pantry' },
];

// Non-food items to reject
const ADDITIONAL_NON_FOOD = [
  'tulip', 'flower', 'bouquet', 'floral', 'plant', 'garden soil', 'potting',
  'cold & flu', 'cold and flu', 'allergy relief', 'pain relief', 'vitamin', 'supplement',
  'bread knife', 'chef knife', 'kitchen tool', 'baking pan', 'sheet pan',
  'cutting board', 'utensil', 'spatula', 'tong',
  'plastic wrap', 'food wrap', 'aluminum foil', 'parchment paper', 'wax paper',
  'ziploc', 'glad bag', 'hefty bag', 'reynolds wrap',
  'paper plate', 'paper cup', 'plastic cup', 'solo cup', 'paper towel', 'napkin',
  'dexter russell', 'victorinox',
  'air filter', 'water filter', 'brita',
  'gift card', 'prepaid card',
  'magazine', 'book',
  'plant food', 'miracle-gro', 'scotts',
  'flea collar', 'dog collar', 'cat food', 'dog food', 'pet food', 'cat litter',
  'greeting card', 'wrapping paper',
  'trash bag', 'garbage bag', 'lawn bag',
  'dish soap', 'laundry detergent', 'fabric softener', 'bleach',
  'shampoo', 'conditioner', 'body wash', 'deodorant', 'toothpaste', 'toothbrush',
  'diaper', 'baby wipe', 'formula',
  'toilet paper', 'tissue', 'facial tissue',
  'light bulb', 'battery', 'candle',
  'bird food', 'bird seed', 'suet',
];

function ensureDeleteOverrideTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS archived_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      archived_at TEXT NOT NULL DEFAULT (datetime('now')),
      table_name TEXT NOT NULL,
      row_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_archived_deletions_table ON archived_deletions(table_name);
    CREATE INDEX IF NOT EXISTS idx_archived_deletions_ts ON archived_deletions(archived_at);

    CREATE TABLE IF NOT EXISTS _maintenance_override (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      allow_delete INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `);
}

function withDeleteOverride(db, reason, fn) {
  ensureDeleteOverrideTables(db);

  const cleanupStmt = db.prepare(`
    DELETE FROM _maintenance_override
    WHERE expires_at <= datetime('now') OR reason = ?
  `);
  const overrideStmt = db.prepare(`
    INSERT INTO _maintenance_override (allow_delete, reason, expires_at)
    VALUES (1, ?, datetime('now', '+10 minutes'))
  `);

  cleanupStmt.run(reason);
  overrideStmt.run(reason);

  try {
    return fn();
  } finally {
    cleanupStmt.run(reason);
  }
}

function runCrossMatch() {
  console.log('=== OpenClaw Cross-Matcher v2 ===');
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

  let matched = 0, removed = 0, kept = 0;
  const updateStmt = db.prepare('UPDATE current_prices SET canonical_ingredient_id = ? WHERE id = ?');

  withDeleteOverride(db, 'cross-match cleanup deletes', () => {
    for (const item of uncategorized) {
      const lower = stripBrand(item.raw_product_name);

      // Non-food check
      const isNonFood = ADDITIONAL_NON_FOOD.some(kw => lower.includes(kw));
      if (isNonFood || !isFoodItem(item.raw_product_name)) {
        db.prepare('DELETE FROM current_prices WHERE id = ?').run(item.id);
        removed++;
        continue;
      }

      // Try rules
      let bestMatch = null;
      for (const rule of MATCH_RULES) {
        if (!rule.terms.some(t => lower.includes(t))) continue;
        if (rule.exclude && rule.exclude.some(e => lower.includes(e))) continue;
        if (rule.require && !rule.require.every(r => lower.includes(r))) continue;
        bestMatch = rule;
        break;
      }

      if (bestMatch) {
        const exists = db.prepare('SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id = ?').get(bestMatch.target);
        if (exists) {
          updateStmt.run(bestMatch.target, item.id);
          matched++;
          try { recordMatch(db, lower, bestMatch.target, 'rule', 0.9); } catch (e) {}
        } else {
          // Create the canonical ingredient if it doesn't exist
          db.prepare('INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit) VALUES (?, ?, ?, ?)').run(
            bestMatch.target,
            bestMatch.target.replace(/-/g, ' ').replace(/\w/g, c => c.toUpperCase()),
            bestMatch.cat,
            'each'
          );
          updateStmt.run(bestMatch.target, item.id);
          matched++;
          try { recordMatch(db, lower, bestMatch.target, 'rule', 0.9); } catch (e) {}
        }
      } else {
        // No rule matched - check normalization memory before giving up
        const remembered = lookupMemory(db, lower);
        if (remembered && remembered.confirmed) {
          const memTarget = db.prepare('SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id = ?').get(remembered.matched_to);
          if (memTarget) {
            updateStmt.run(remembered.matched_to, item.id);
            matched++;
            continue;
          }
        }
        kept++;
      }
    }

    // Clean orphaned uncategorized ingredients with no prices
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
      } catch {}
    }

    // Final stats
    const totalPrices = db.prepare('SELECT COUNT(*) as c FROM current_prices').get();
    const totalIngredients = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
    const categorizedPrices = db.prepare(`
      SELECT COUNT(*) as c FROM current_prices cp
      JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
      WHERE ci.category != 'uncategorized'
    `).get();

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
    console.log(`Kept as-is: ${kept}`);
    console.log(`Orphans cleaned: ${orphansRemoved}`);
    console.log(`\n=== Updated State ===`);
    console.log(`Total prices: ${totalPrices.c}`);
    console.log(`Categorized: ${categorizedPrices.c} (${((categorizedPrices.c / totalPrices.c) * 100).toFixed(0)}%)`);
    console.log(`Ingredients: ${totalIngredients.c}`);

    console.log(`\n=== Category Coverage ===`);
    byCat.forEach(s => {
      if (s.total > 0) console.log(`  ${s.category}: ${s.priced}/${s.total} (${((s.priced / s.total) * 100).toFixed(0)}%)`);
    });
  });
}

async function main() {
  await runWithBusyRetries('Cross-match', () => runCrossMatch());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
