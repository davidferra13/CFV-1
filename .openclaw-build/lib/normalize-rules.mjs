/**
 * OpenClaw Price Intelligence - Rule-Based Normalization
 * Maps raw product names from scrapers to canonical ingredient IDs.
 * This handles ~70% of cases. The model handles the rest.
 */

// Abbreviation expansions (receipt shorthand -> full words)
const ABBREVIATIONS = {
  'bnls': 'boneless', 'sknls': 'skinless', 'skls': 'skinless',
  'chkn': 'chicken', 'brst': 'breast', 'thgh': 'thigh',
  'grnd': 'ground', 'bf': 'beef', 'pork': 'pork',
  'org': 'organic', 'frz': 'frozen', 'frsh': 'fresh',
  'whl': 'whole', 'slcd': 'sliced', 'dcd': 'diced',
  'shrd': 'shredded', 'crm': 'cream', 'chz': 'cheese',
  'ched': 'cheddar', 'mozz': 'mozzarella', 'parm': 'parmesan',
  'lrg': 'large', 'med': 'medium', 'sml': 'small',
  'dz': 'dozen', 'ea': 'each', 'pk': 'pack',
  'gal': 'gallon', 'qt': 'quart', 'pt': 'pint',
  'lb': 'pound', 'oz': 'ounce', 'ct': 'count',
  'evoo': 'extra virgin olive oil', 'xvoo': 'extra virgin olive oil',
  'sw': 'sweet', 'grn': 'green', 'rd': 'red', 'wht': 'white',
  'ylw': 'yellow', 'blk': 'black', 'brn': 'brown',
  'veg': 'vegetable', 'frt': 'fruit', 'sal': 'salmon',
  'trky': 'turkey', 'hmbrg': 'hamburger', 'rstd': 'roasted',
  'smkd': 'smoked', 'crd': 'cured', 'mrnted': 'marinated',
  'flr': 'flour', 'sgr': 'sugar', 'btr': 'butter',
  'mlk': 'milk', 'hvy': 'heavy', 'lt': 'light',
  'ff': 'fat free', 'lf': 'low fat', 'rf': 'reduced fat',
  'ital': 'italian', 'grk': 'greek', 'mex': 'mexican',
  'spcy': 'spicy', 'pln': 'plain', 'unslt': 'unsalted',
  'sltd': 'salted', 'swtn': 'sweetened', 'unswtn': 'unsweetened',
  'cntr': 'center', 'cut': 'cut', 'bne': 'bone',
  'bnin': 'bone-in', 'tndrloin': 'tenderloin',
  'strp': 'strip', 'rib': 'rib', 'chp': 'chop',
  'stk': 'steak', 'rst': 'roast', 'flt': 'fillet',
  'shmp': 'shrimp', 'scrm': 'scallop', 'lbstr': 'lobster',
  'clm': 'clam', 'mssl': 'mussel', 'sqd': 'squid',
};

// Keyword patterns -> canonical ingredient ID
// Order matters: more specific patterns first
const KEYWORD_RULES = [
  // Poultry
  { patterns: ['chicken', 'breast', 'boneless', 'skinless'], id: 'chicken-breast-boneless-skinless', must: ['chicken', 'breast'] },
  { patterns: ['chicken', 'breast', 'bone'], id: 'chicken-breast-bone-in', must: ['chicken', 'breast'] },
  { patterns: ['chicken', 'thigh', 'boneless'], id: 'chicken-thigh-boneless', must: ['chicken', 'thigh'] },
  { patterns: ['chicken', 'thigh'], id: 'chicken-thigh', must: ['chicken', 'thigh'] },
  { patterns: ['chicken', 'wing'], id: 'chicken-wings', must: ['chicken', 'wing'] },
  { patterns: ['chicken', 'drumstick'], id: 'chicken-drumsticks', must: ['chicken', 'drumstick'] },
  { patterns: ['chicken', 'whole'], id: 'chicken-whole', must: ['chicken', 'whole'] },
  { patterns: ['ground', 'chicken'], id: 'chicken-ground', must: ['chicken', 'ground'] },
  { patterns: ['ground', 'turkey'], id: 'turkey-ground', must: ['turkey', 'ground'] },
  { patterns: ['turkey', 'breast'], id: 'turkey-breast', must: ['turkey', 'breast'] },

  // Beef
  { patterns: ['ground', 'beef'], id: 'beef-ground', must: ['ground', 'beef'] },
  { patterns: ['beef', 'sirloin'], id: 'beef-sirloin', must: ['beef', 'sirloin'] },
  { patterns: ['beef', 'ribeye'], id: 'beef-ribeye', must: ['beef', 'ribeye'] },
  { patterns: ['beef', 'tenderloin', 'filet'], id: 'beef-tenderloin', must: ['beef'] },
  { patterns: ['beef', 'chuck'], id: 'beef-chuck', must: ['beef', 'chuck'] },
  { patterns: ['beef', 'stew'], id: 'beef-stew-meat', must: ['beef', 'stew'] },
  { patterns: ['beef', 'strip', 'steak'], id: 'beef-strip-steak', must: ['beef', 'strip'] },
  { patterns: ['beef', 'flank'], id: 'beef-flank-steak', must: ['beef', 'flank'] },
  { patterns: ['beef', 'short', 'rib'], id: 'beef-short-ribs', must: ['beef', 'short', 'rib'] },
  { patterns: ['beef', 'brisket'], id: 'beef-brisket', must: ['beef', 'brisket'] },

  // Pork
  { patterns: ['pork', 'chop'], id: 'pork-chops', must: ['pork', 'chop'] },
  { patterns: ['pork', 'tenderloin'], id: 'pork-tenderloin', must: ['pork', 'tenderloin'] },
  { patterns: ['pork', 'shoulder'], id: 'pork-shoulder', must: ['pork', 'shoulder'] },
  { patterns: ['pork', 'belly'], id: 'pork-belly', must: ['pork', 'belly'] },
  { patterns: ['ground', 'pork'], id: 'pork-ground', must: ['pork', 'ground'] },
  { patterns: ['bacon'], id: 'bacon', must: ['bacon'] },
  { patterns: ['sausage', 'italian'], id: 'sausage-italian', must: ['sausage', 'italian'] },
  { patterns: ['sausage'], id: 'sausage', must: ['sausage'] },

  // Seafood
  { patterns: ['salmon', 'atlantic', 'fillet'], id: 'salmon-atlantic-fillet', must: ['salmon'] },
  { patterns: ['salmon', 'sockeye'], id: 'salmon-sockeye', must: ['salmon', 'sockeye'] },
  { patterns: ['salmon'], id: 'salmon-atlantic-fillet', must: ['salmon'] },
  { patterns: ['shrimp', 'large'], id: 'shrimp-large', must: ['shrimp'] },
  { patterns: ['shrimp'], id: 'shrimp', must: ['shrimp'] },
  { patterns: ['cod', 'fillet'], id: 'cod-fillet', must: ['cod'] },
  { patterns: ['cod'], id: 'cod-fillet', must: ['cod'] },
  { patterns: ['haddock'], id: 'haddock-fillet', must: ['haddock'] },
  { patterns: ['halibut'], id: 'halibut-fillet', must: ['halibut'] },
  { patterns: ['tuna', 'ahi'], id: 'tuna-ahi', must: ['tuna', 'ahi'] },
  { patterns: ['tuna', 'steak'], id: 'tuna-steak', must: ['tuna', 'steak'] },
  { patterns: ['swordfish'], id: 'swordfish-steak', must: ['swordfish'] },
  { patterns: ['scallop', 'sea'], id: 'scallops-sea', must: ['scallop'] },
  { patterns: ['scallop'], id: 'scallops-sea', must: ['scallop'] },
  { patterns: ['lobster', 'tail'], id: 'lobster-tail', must: ['lobster', 'tail'] },
  { patterns: ['lobster'], id: 'lobster-whole', must: ['lobster'] },
  { patterns: ['clam', 'littleneck'], id: 'clams-littleneck', must: ['clam'] },
  { patterns: ['mussel'], id: 'mussels', must: ['mussel'] },
  { patterns: ['crab', 'meat'], id: 'crab-meat', must: ['crab'] },
  { patterns: ['oyster'], id: 'oysters', must: ['oyster'] },

  // Dairy
  { patterns: ['milk', 'whole'], id: 'milk-whole', must: ['milk'] },
  { patterns: ['milk', '2%'], id: 'milk-2pct', must: ['milk'] },
  { patterns: ['milk', 'skim'], id: 'milk-skim', must: ['milk'] },
  { patterns: ['milk'], id: 'milk-whole', must: ['milk'] },
  { patterns: ['heavy', 'cream'], id: 'cream-heavy', must: ['cream', 'heavy'] },
  { patterns: ['cream', 'whipping'], id: 'cream-heavy', must: ['cream', 'whipping'] },
  { patterns: ['half', 'half'], id: 'half-and-half', must: ['half'] },
  { patterns: ['sour', 'cream'], id: 'sour-cream', must: ['sour', 'cream'] },
  { patterns: ['cream', 'cheese'], id: 'cream-cheese', must: ['cream', 'cheese'] },
  { patterns: ['butter', 'unsalted'], id: 'butter-unsalted', must: ['butter'] },
  { patterns: ['butter', 'salted'], id: 'butter-salted', must: ['butter'] },
  { patterns: ['butter'], id: 'butter-unsalted', must: ['butter'] },
  { patterns: ['cheddar'], id: 'cheese-cheddar', must: ['cheddar'] },
  { patterns: ['mozzarella', 'fresh'], id: 'cheese-mozzarella-fresh', must: ['mozzarella', 'fresh'] },
  { patterns: ['mozzarella'], id: 'cheese-mozzarella', must: ['mozzarella'] },
  { patterns: ['parmigiano', 'reggiano'], id: 'cheese-parmesan', must: ['parmigiano'] },
  { patterns: ['parmesan', 'reggiano'], id: 'cheese-parmesan', must: ['parmesan'] },
  { patterns: ['parmesan'], id: 'cheese-parmesan', must: ['parmesan'] },
  { patterns: ['gruyere'], id: 'cheese-gruyere', must: ['gruyere'] },
  { patterns: ['ricotta'], id: 'cheese-ricotta', must: ['ricotta'] },
  { patterns: ['goat', 'cheese'], id: 'cheese-goat', must: ['goat', 'cheese'] },
  { patterns: ['yogurt', 'greek'], id: 'yogurt-greek', must: ['yogurt', 'greek'] },
  { patterns: ['yogurt'], id: 'yogurt-plain', must: ['yogurt'] },
  { patterns: ['egg', 'large', 'dozen'], id: 'eggs-large', must: ['egg'] },
  { patterns: ['egg', 'large'], id: 'eggs-large', must: ['egg'] },
  { patterns: ['egg'], id: 'eggs-large', must: ['egg'] },

  // Produce - Vegetables
  { patterns: ['onion', 'yellow'], id: 'onion-yellow', must: ['onion'] },
  { patterns: ['onion', 'red'], id: 'onion-red', must: ['onion', 'red'] },
  { patterns: ['onion', 'white'], id: 'onion-white', must: ['onion', 'white'] },
  { patterns: ['onion', 'sweet'], id: 'onion-sweet', must: ['onion', 'sweet'] },
  { patterns: ['onion'], id: 'onion-yellow', must: ['onion'] },
  { patterns: ['garlic'], id: 'garlic', must: ['garlic'] },
  { patterns: ['shallot'], id: 'shallot', must: ['shallot'] },
  { patterns: ['potato', 'russet'], id: 'potato-russet', must: ['potato'] },
  { patterns: ['potato', 'yukon'], id: 'potato-yukon-gold', must: ['potato', 'yukon'] },
  { patterns: ['potato', 'sweet'], id: 'sweet-potato', must: ['potato', 'sweet'] },
  { patterns: ['potato', 'red'], id: 'potato-red', must: ['potato', 'red'] },
  { patterns: ['potato'], id: 'potato-russet', must: ['potato'] },
  { patterns: ['tomato', 'cherry'], id: 'tomato-cherry', must: ['tomato', 'cherry'] },
  { patterns: ['tomato', 'roma'], id: 'tomato-roma', must: ['tomato', 'roma'] },
  { patterns: ['tomato', 'heirloom'], id: 'tomato-heirloom', must: ['tomato', 'heirloom'] },
  { patterns: ['tomato'], id: 'tomato', must: ['tomato'] },
  { patterns: ['carrot'], id: 'carrot', must: ['carrot'] },
  { patterns: ['celery'], id: 'celery', must: ['celery'] },
  { patterns: ['bell', 'pepper', 'red'], id: 'bell-pepper-red', must: ['pepper', 'red'] },
  { patterns: ['bell', 'pepper', 'green'], id: 'bell-pepper-green', must: ['pepper', 'green'] },
  { patterns: ['bell', 'pepper'], id: 'bell-pepper-red', must: ['bell', 'pepper'] },
  { patterns: ['broccoli'], id: 'broccoli', must: ['broccoli'] },
  { patterns: ['cauliflower'], id: 'cauliflower', must: ['cauliflower'] },
  { patterns: ['spinach', 'baby'], id: 'spinach-baby', must: ['spinach'] },
  { patterns: ['spinach'], id: 'spinach', must: ['spinach'] },
  { patterns: ['kale'], id: 'kale', must: ['kale'] },
  { patterns: ['arugula'], id: 'arugula', must: ['arugula'] },
  { patterns: ['mixed', 'greens'], id: 'mixed-greens', must: ['mixed', 'green'] },
  { patterns: ['lettuce', 'romaine'], id: 'lettuce-romaine', must: ['romaine'] },
  { patterns: ['lettuce'], id: 'lettuce-romaine', must: ['lettuce'] },
  { patterns: ['cucumber'], id: 'cucumber', must: ['cucumber'] },
  { patterns: ['zucchini'], id: 'zucchini', must: ['zucchini'] },
  { patterns: ['squash', 'butternut'], id: 'squash-butternut', must: ['squash', 'butternut'] },
  { patterns: ['asparagus'], id: 'asparagus', must: ['asparagus'] },
  { patterns: ['green', 'bean'], id: 'green-beans', must: ['green', 'bean'] },
  { patterns: ['mushroom', 'cremini'], id: 'mushroom-cremini', must: ['mushroom', 'cremini'] },
  { patterns: ['mushroom', 'shiitake'], id: 'mushroom-shiitake', must: ['mushroom', 'shiitake'] },
  { patterns: ['mushroom', 'portobello'], id: 'mushroom-portobello', must: ['mushroom', 'portobello'] },
  { patterns: ['mushroom', 'button'], id: 'mushroom-button', must: ['mushroom'] },
  { patterns: ['mushroom'], id: 'mushroom-button', must: ['mushroom'] },
  { patterns: ['corn', 'sweet'], id: 'corn-sweet', must: ['corn'] },
  { patterns: ['avocado'], id: 'avocado', must: ['avocado'] },
  { patterns: ['artichoke'], id: 'artichoke', must: ['artichoke'] },
  { patterns: ['eggplant'], id: 'eggplant', must: ['eggplant'] },
  { patterns: ['fennel'], id: 'fennel', must: ['fennel'] },
  { patterns: ['leek'], id: 'leek', must: ['leek'] },

  // Produce - Fruits
  { patterns: ['lemon'], id: 'lemon', must: ['lemon'] },
  { patterns: ['lime'], id: 'lime', must: ['lime'] },
  { patterns: ['orange'], id: 'orange', must: ['orange'] },
  { patterns: ['apple', 'granny'], id: 'apple-granny-smith', must: ['apple', 'granny'] },
  { patterns: ['apple'], id: 'apple', must: ['apple'] },
  { patterns: ['banana'], id: 'banana', must: ['banana'] },
  { patterns: ['strawberry', 'strawberries'], id: 'strawberries', must: ['strawberr'] },
  { patterns: ['blueberry', 'blueberries'], id: 'blueberries', must: ['blueberr'] },
  { patterns: ['raspberry', 'raspberries'], id: 'raspberries', must: ['raspberr'] },

  // Herbs (fresh)
  { patterns: ['basil', 'fresh'], id: 'basil-fresh', must: ['basil'] },
  { patterns: ['basil'], id: 'basil-fresh', must: ['basil'] },
  { patterns: ['cilantro'], id: 'cilantro', must: ['cilantro'] },
  { patterns: ['parsley', 'flat'], id: 'parsley-flat-leaf', must: ['parsley'] },
  { patterns: ['parsley'], id: 'parsley-flat-leaf', must: ['parsley'] },
  { patterns: ['rosemary'], id: 'rosemary-fresh', must: ['rosemary'] },
  { patterns: ['thyme', 'fresh'], id: 'thyme-fresh', must: ['thyme'] },
  { patterns: ['thyme'], id: 'thyme-fresh', must: ['thyme'] },
  { patterns: ['dill'], id: 'dill-fresh', must: ['dill'] },
  { patterns: ['mint'], id: 'mint-fresh', must: ['mint'] },
  { patterns: ['chive'], id: 'chives', must: ['chive'] },
  { patterns: ['tarragon'], id: 'tarragon-fresh', must: ['tarragon'] },
  { patterns: ['sage'], id: 'sage-fresh', must: ['sage'] },
  { patterns: ['oregano', 'fresh'], id: 'oregano-fresh', must: ['oregano', 'fresh'] },

  // Pantry / Dry Goods
  { patterns: ['olive', 'oil', 'extra', 'virgin'], id: 'olive-oil-evoo', must: ['olive', 'oil'] },
  { patterns: ['olive', 'oil'], id: 'olive-oil-evoo', must: ['olive', 'oil'] },
  { patterns: ['vegetable', 'oil'], id: 'oil-vegetable', must: ['vegetable', 'oil'] },
  { patterns: ['canola', 'oil'], id: 'oil-canola', must: ['canola', 'oil'] },
  { patterns: ['coconut', 'oil'], id: 'oil-coconut', must: ['coconut', 'oil'] },
  { patterns: ['flour', 'all', 'purpose'], id: 'flour-all-purpose', must: ['flour'] },
  { patterns: ['flour'], id: 'flour-all-purpose', must: ['flour'] },
  { patterns: ['sugar', 'granulated'], id: 'sugar-granulated', must: ['sugar'] },
  { patterns: ['sugar', 'brown'], id: 'sugar-brown', must: ['sugar', 'brown'] },
  { patterns: ['sugar'], id: 'sugar-granulated', must: ['sugar'] },
  { patterns: ['rice', 'white', 'long'], id: 'rice-white-long', must: ['rice'] },
  { patterns: ['rice', 'basmati'], id: 'rice-basmati', must: ['rice', 'basmati'] },
  { patterns: ['rice', 'jasmine'], id: 'rice-jasmine', must: ['rice', 'jasmine'] },
  { patterns: ['rice', 'arborio'], id: 'rice-arborio', must: ['rice', 'arborio'] },
  { patterns: ['rice'], id: 'rice-white-long', must: ['rice'] },
  { patterns: ['pasta', 'spaghetti'], id: 'pasta-spaghetti', must: ['spaghetti'] },
  { patterns: ['pasta', 'penne'], id: 'pasta-penne', must: ['penne'] },
  { patterns: ['pasta'], id: 'pasta', must: ['pasta'] },
  { patterns: ['bread', 'crumb'], id: 'breadcrumbs', must: ['bread', 'crumb'] },
  { patterns: ['panko'], id: 'panko', must: ['panko'] },
  { patterns: ['balsamic', 'vinegar'], id: 'vinegar-balsamic', must: ['balsamic'] },
  { patterns: ['red', 'wine', 'vinegar'], id: 'vinegar-red-wine', must: ['vinegar', 'red'] },
  { patterns: ['apple', 'cider', 'vinegar'], id: 'vinegar-apple-cider', must: ['vinegar', 'apple'] },
  { patterns: ['soy', 'sauce'], id: 'soy-sauce', must: ['soy', 'sauce'] },
  { patterns: ['worcestershire'], id: 'worcestershire-sauce', must: ['worcestershire'] },
  { patterns: ['dijon', 'mustard'], id: 'mustard-dijon', must: ['dijon'] },
  { patterns: ['honey'], id: 'honey', must: ['honey'] },
  { patterns: ['maple', 'syrup'], id: 'maple-syrup', must: ['maple', 'syrup'] },
  { patterns: ['vanilla', 'extract'], id: 'vanilla-extract', must: ['vanilla'] },
  { patterns: ['chicken', 'stock'], id: 'stock-chicken', must: ['chicken', 'stock'] },
  { patterns: ['chicken', 'broth'], id: 'stock-chicken', must: ['chicken', 'broth'] },
  { patterns: ['beef', 'stock'], id: 'stock-beef', must: ['beef', 'stock'] },
  { patterns: ['beef', 'broth'], id: 'stock-beef', must: ['beef', 'broth'] },
  { patterns: ['tomato', 'paste'], id: 'tomato-paste', must: ['tomato', 'paste'] },
  { patterns: ['tomato', 'sauce'], id: 'tomato-sauce', must: ['tomato', 'sauce'] },
  { patterns: ['crushed', 'tomato'], id: 'tomatoes-crushed-canned', must: ['crushed', 'tomato'] },
  { patterns: ['diced', 'tomato'], id: 'tomatoes-diced-canned', must: ['diced', 'tomato'] },
  { patterns: ['san', 'marzano'], id: 'tomatoes-san-marzano', must: ['san', 'marzano'] },
  { patterns: ['coconut', 'milk'], id: 'coconut-milk', must: ['coconut', 'milk'] },

  // Spices (dry)
  { patterns: ['salt', 'kosher'], id: 'salt-kosher', must: ['salt', 'kosher'] },
  { patterns: ['salt', 'sea'], id: 'salt-sea', must: ['salt', 'sea'] },
  { patterns: ['black', 'pepper', 'ground'], id: 'pepper-black-ground', must: ['pepper', 'black'] },
  { patterns: ['pepper', 'black', 'whole'], id: 'peppercorns-black', must: ['pepper', 'black', 'whole'] },
  { patterns: ['cumin'], id: 'cumin-ground', must: ['cumin'] },
  { patterns: ['paprika', 'smoked'], id: 'paprika-smoked', must: ['paprika', 'smoked'] },
  { patterns: ['paprika'], id: 'paprika', must: ['paprika'] },
  { patterns: ['cinnamon'], id: 'cinnamon-ground', must: ['cinnamon'] },
  { patterns: ['nutmeg'], id: 'nutmeg', must: ['nutmeg'] },
  { patterns: ['oregano', 'dried'], id: 'oregano-dried', must: ['oregano'] },
  { patterns: ['red', 'pepper', 'flake'], id: 'red-pepper-flakes', must: ['pepper', 'flake'] },
  { patterns: ['cayenne'], id: 'cayenne-pepper', must: ['cayenne'] },
  { patterns: ['turmeric'], id: 'turmeric', must: ['turmeric'] },
  { patterns: ['ginger', 'ground'], id: 'ginger-ground', must: ['ginger', 'ground'] },
  { patterns: ['ginger', 'fresh'], id: 'ginger-fresh', must: ['ginger', 'fresh'] },
  { patterns: ['ginger'], id: 'ginger-fresh', must: ['ginger'] },
  { patterns: ['bay', 'leaf'], id: 'bay-leaves', must: ['bay', 'leaf'] },
  { patterns: ['coriander'], id: 'coriander-ground', must: ['coriander'] },
];

// ============================================================================
// NON-FOOD DETECTION (Two-Layer: blacklist + whitelist)
// ============================================================================

// Hard blacklist: if ANY of these appear in the name, skip immediately
const NON_FOOD_KEYWORDS = [
  // Paper & disposables
  'paper towel', 'tissue', 'napkin', 'toilet paper', 'paper plate',
  // Cleaning & household
  'detergent', 'soap', 'bleach', 'cleaner', 'sponge', 'trash bag', 'garbage',
  'mop', 'broom', 'dustpan', 'swiffer', 'pledge', 'lysol', 'windex', 'clorox',
  'laundry', 'fabric softener', 'dryer sheet', 'tide', 'downy', 'oxiclean',
  'dish soap', 'dishwasher', 'cascade', 'dawn dish',
  'air freshener', 'febreze', 'air wick', 'glade', 'scented oil',
  // Personal care & beauty
  'shampoo', 'conditioner', 'lotion', 'toothpaste', 'toothbrush', 'mouthwash',
  'deodorant', 'razor', 'shaving', 'tampon', 'pad ', 'diaper', 'wipe',
  'mascara', 'lipstick', 'lip gloss', 'foundation', 'concealer', 'eyeshadow',
  'nail polish', 'hair dye', 'hair color', 'hair care', 'hair gel', 'hair spray',
  'body wash', 'hand soap', 'face wash', 'moisturizer', 'sunscreen', 'spf',
  'perfume', 'cologne', 'fragrance',
  'covergirl', 'l\'oreal', 'loreal', 'revlon', 'maybelline', 'neutrogena',
  'dove body', 'dove bar', 'dove pouch', 'got2b', 'clairol', 'garnier',
  'oral-b', 'colgate', 'crest', 'listerine', 'scope',
  // Medicine & health
  'medicine', 'bandaid', 'band-aid', 'first aid', 'thermometer',
  'allegra', 'zyrtec', 'claritin', 'tylenol', 'advil', 'motrin', 'aleve',
  'benadryl', 'mucinex', 'robitussin', 'nyquil', 'dayquil', 'pepto',
  'tums', 'ibuprofen', 'acetaminophen', 'antibiotic', 'prescription',
  // Pet products
  'dog food', 'cat food', 'pet food', 'dog treat', 'cat treat', 'kitty',
  'litter', 'kibble', 'chow', 'bird food', 'bird seed', 'wild bird',
  'fancy feast', 'purina', 'friskies', 'meow mix', 'pedigree',
  'iams', 'blue buffalo', 'rachael ray nutrish', 'milk-bone',
  'hamster', 'gerbil', 'ferret', 'reptile', 'fish tank',
  'coral', 'aquarium', 'terrarium', 'aquacultured', 'suet cake',
  'dog toy', 'bark ', 'plush dog', 'audubon',
  // Electronics
  'ipad', 'iphone', 'macbook', 'laptop', 'tablet', 'bluetooth', 'wireless',
  'airpods', 'airtag', 'monitor', 'speaker', 'headphone', 'earbuds',
  'samsung', 'acer', 'asus', 'lenovo', 'dell', 'hp monitor', 'gaming',
  'roku', 'firestick', 'chromecast', 'remote control',
  'security camera', 'arlo', 'ring doorbell', 'smart home',
  'phone case', 'charger', 'usb', 'hdmi', 'cable', 'adapter',
  'at&t', 'motorola', 't-mobile', 'verizon', 'cricket',
  // Furniture & home
  'mattress', 'pillow', 'blanket', 'comforter', 'duvet',
  'furniture', 'chair', 'table', 'desk', 'shelf', 'bookcase',
  'gazebo', 'pavilion', 'patio', 'outdoor living', 'pergola',
  'garment rack', 'closet', 'hanger', 'storage bin',
  'area rug', 'carpet', 'curtain', 'drape', 'blinds',
  'lamp', 'light fixture', 'ceiling fan', 'chandelier',
  // Garden & outdoor
  'seed starter', 'potting soil', 'fertilizer', 'mulch', 'gardening',
  'watering can', 'garden hose', 'lawn mower', 'weed killer',
  'flower pot', 'planter', 'peat moss', 'trellis',
  // Automotive
  'tire', 'motor oil', 'brake', 'windshield', 'wiper', 'car wash',
  'antifreeze', 'coolant', 'transmission', 'fuel additive',
  // Clothing & textiles
  'clothing', 'shoes', 'jacket', 'shirt', 'pants', 'dress', 'socks',
  'underwear', 'bra', 'sweater', 'hoodie', 'jeans', 'shorts',
  // Stationery & office
  'notebook', 'pen ', 'pencil', 'marker', 'stapler', 'tape ', 'envelope',
  'printer', 'ink cartridge', 'copy paper',
  // Toys & games
  'toy ', 'action figure', 'board game', 'puzzle', 'lego', 'barbie',
  'nerf', 'hot wheels', 'play-doh', 'plush',
  // Fitness
  'dumbbell', 'yoga mat', 'exercise', 'resistance band',
  // Hardware & tools
  'screwdriver', 'hammer', 'drill', 'saw ', 'wrench', 'plier',
  'paint ', 'primer', 'sandpaper', 'nail ', 'screw ',
  // Baby (non-food)
  'diaper', 'pacifier', 'baby wipe', 'stroller', 'car seat',
  // Survival / supplements
  'nutrient survival', 'survival food', 'emergency food',
  // Misc non-food
  'candle', 'battery', 'lightbulb', 'light bulb', 'extension cord',
  'firewood', 'ice melt', 'de-icer', 'salt crystal',
  'cotton', 'cotton ball', 'cotton swab', 'q-tip',
  'trash can', 'waste basket', 'recycling',
  'insect repellent', 'bug spray', 'ant trap', 'roach',
  'flea', 'tick collar',
];

// FOOD INDICATORS: If an item doesn't match a keyword rule, it must contain
// at least one of these to be considered food. This is the whitelist layer.
const FOOD_INDICATORS = [
  // Proteins & meat
  'chicken', 'beef', 'pork', 'turkey', 'lamb', 'veal', 'duck', 'bison', 'venison',
  'salmon', 'shrimp', 'cod', 'tuna', 'lobster', 'crab', 'scallop', 'clam', 'mussel',
  'tilapia', 'haddock', 'halibut', 'swordfish', 'trout', 'catfish', 'mahi', 'sardine',
  'anchovy', 'oyster', 'squid', 'calamari', 'octopus', 'crawfish', 'crayfish',
  'steak', 'roast', 'chop', 'tenderloin', 'ribeye', 'sirloin', 'filet', 'fillet',
  'ground beef', 'ground turkey', 'bacon', 'sausage', 'ham', 'hot dog', 'bratwurst',
  'pepperoni', 'salami', 'prosciutto', 'mortadella', 'chorizo', 'kielbasa',
  'tofu', 'tempeh', 'seitan', 'beyond meat', 'impossible burger',
  // Dairy
  'milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'eggs',
  'cheddar', 'mozzarella', 'parmesan', 'swiss', 'provolone', 'gouda', 'brie', 'feta',
  'ricotta', 'mascarpone', 'cream cheese', 'cottage cheese', 'sour cream',
  'half and half', 'whipping cream', 'heavy cream', 'gelato',
  // Produce - vegetables
  'tomato', 'potato', 'onion', 'garlic', 'pepper', 'mushroom',
  'carrot', 'celery', 'broccoli', 'cauliflower', 'spinach', 'kale', 'arugula',
  'lettuce', 'cucumber', 'zucchini', 'squash', 'corn', 'asparagus', 'artichoke',
  'avocado', 'eggplant', 'cabbage', 'brussels sprout', 'bok choy', 'collard',
  'green bean', 'pea', 'bean', 'sweet potato', 'beet', 'radish', 'turnip', 'parsnip',
  'leek', 'shallot', 'fennel', 'okra', 'endive', 'radicchio', 'watercress',
  'salad', 'coleslaw', 'slaw',
  // Produce - fruits
  'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berry', 'berries',
  'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry',
  'watermelon', 'cantaloupe', 'honeydew', 'melon', 'pineapple', 'mango',
  'peach', 'pear', 'plum', 'nectarine', 'cherry', 'apricot', 'kiwi',
  'coconut', 'pomegranate', 'fig', 'date', 'grapefruit', 'tangerine', 'clementine',
  'papaya', 'guava', 'passion fruit', 'dragon fruit', 'lychee', 'persimmon',
  // Herbs & spices
  'basil', 'cilantro', 'parsley', 'rosemary', 'thyme', 'dill', 'mint', 'oregano',
  'sage', 'tarragon', 'chive', 'cumin', 'paprika', 'cinnamon', 'nutmeg', 'turmeric',
  'ginger', 'cayenne', 'coriander', 'cardamom', 'clove', 'allspice', 'bay leaf',
  'saffron', 'vanilla', 'seasoning', 'spice',
  // Grains, bread, bakery
  'bread', 'roll', 'bun', 'bagel', 'muffin', 'croissant', 'tortilla', 'pita', 'naan',
  'flour', 'rice', 'pasta', 'noodle', 'cereal', 'oatmeal', 'granola', 'quinoa',
  'couscous', 'barley', 'farro', 'bulgur', 'polenta', 'grits',
  'cake', 'pie', 'cookie', 'brownie', 'donut', 'doughnut', 'pastry', 'danish',
  'cracker', 'pretzel', 'popcorn', 'chip', 'crisp',
  'waffle', 'pancake', 'biscuit', 'scone', 'focaccia', 'ciabatta', 'sourdough',
  'english muffin', 'flatbread', 'lavash', 'rye bread', 'pumpernickel',
  // Pantry & canned
  'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'sesame oil',
  'vinegar', 'balsamic', 'sugar', 'honey', 'maple syrup', 'molasses',
  'soy sauce', 'hot sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise',
  'salsa', 'bbq sauce', 'ranch', 'dressing', 'marinade', 'teriyaki', 'sriracha',
  'peanut butter', 'almond butter', 'jelly', 'jam', 'preserves', 'nutella',
  'tomato sauce', 'tomato paste', 'marinara', 'pesto', 'alfredo', 'gravy',
  'broth', 'stock', 'bouillon', 'soup',
  'beans', 'chickpea', 'lentil', 'hummus',
  'coconut milk', 'condensed milk', 'evaporated milk',
  'canned tuna', 'canned salmon', 'canned chicken', 'sardines',
  'olives', 'pickles', 'capers', 'roasted pepper', 'artichoke heart',
  'worcestershire', 'fish sauce', 'oyster sauce', 'hoisin',
  'tahini', 'miso', 'curry paste',
  'salt', 'kosher salt', 'sea salt', 'pepper', 'peppercorn',
  'baking powder', 'baking soda', 'yeast', 'cornstarch', 'gelatin',
  'extract', 'food coloring',
  // Nuts & seeds
  'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'peanut', 'macadamia',
  'hazelnut', 'pine nut', 'brazil nut', 'chestnut',
  'sunflower seed', 'pumpkin seed', 'chia seed', 'flaxseed', 'sesame seed',
  'trail mix', 'mixed nuts',
  // Frozen foods
  'ice cream', 'frozen pizza', 'frozen dinner', 'frozen vegetable', 'frozen fruit',
  'frozen fish', 'frozen shrimp', 'frozen chicken', 'frozen burrito',
  'popsicle', 'frozen yogurt', 'sorbet', 'sherbet',
  'tater tot', 'french fries', 'frozen fries', 'fish stick',
  'pot pie', 'frozen meal', 'lean cuisine', 'hungry man', 'stouffer',
  // Deli & prepared
  'deli', 'rotisserie', 'fried chicken', 'grilled chicken',
  'charcuterie', 'cheese board', 'spring roll', 'empanada',
  'sub sandwich', 'wrap', 'pinwheel',
  'potato salad', 'macaroni salad', 'antipasto',
  'hummus', 'guacamole', 'tzatziki', 'dip',
  // Beverages (food-adjacent, include them)
  'juice', 'lemonade', 'smoothie', 'kombucha',
  'coffee', 'espresso', 'tea', 'matcha', 'chai',
  'soda', 'cola', 'seltzer', 'sparkling water', 'tonic',
  'beer', 'wine', 'cider', 'spirits',
  'protein shake', 'protein drink', 'meal replacement',
  'energy drink', 'sports drink', 'electrolyte',
  'water', 'spring water', 'mineral water',
  // Chocolate & candy
  'chocolate', 'candy', 'gummy', 'marshmallow', 'caramel',
  'licorice', 'taffy', 'fudge', 'truffle', 'bonbon',
  'jelly bean', 'gum', 'mint candy',
  // Snacks
  'granola bar', 'protein bar', 'energy bar', 'snack bar',
  'dried fruit', 'fruit snack', 'applesauce',
  'pudding', 'jello', 'gelatin',
  // Condiments & misc food
  'relish', 'chutney', 'tapenade', 'bruschetta',
  'crouton', 'breadcrumb', 'panko', 'stuffing',
  'brewer', 'brewing', 'fermented', 'kimchi', 'sauerkraut', 'kombucha',
  'tortellini', 'ravioli', 'gnocchi', 'pierogi', 'dumpling', 'gyoza', 'wonton',
  'pizza', 'calzone', 'stromboli',
  // Food-related descriptors
  'organic', 'fresh cut', 'farm fresh', 'grass fed', 'free range', 'cage free',
  'wild caught', 'sustainable', 'non-gmo', 'gluten free', 'vegan', 'vegetarian',
  'usda choice', 'usda prime', 'usda select', 'angus', 'wagyu',
  'smoked', 'cured', 'marinated', 'seasoned', 'roasted', 'grilled', 'baked',
  'breaded', 'fried', 'sauteed', 'braised', 'slow cooked',
  'sliced', 'diced', 'chopped', 'minced', 'shredded', 'grated',
  '/lb', 'per lb', 'per pound', '/oz', 'per oz',
  // Major food brands
  'barilla', 'del monte', 'dole', 'chiquita', 'driscoll',
  'kraft', 'general mills', 'kellogg', 'post cereal', 'quaker',
  'campbell', 'progresso', 'amy\'s', 'annie\'s', 'newman\'s',
  'tyson', 'perdue', 'hormel', 'oscar mayer', 'hillshire',
  'sargento', 'cabot', 'tillamook', 'chobani', 'fage', 'oikos', 'dannon',
  'pillsbury', 'betty crocker', 'duncan hines', 'bob\'s red mill',
  'hidden valley', 'hellmann', 'french\'s', 'heinz', 'hunts',
  'tostitos', 'doritos', 'lays', 'ruffles', 'pringles', 'kettle brand',
  'nature valley', 'kind bar', 'clif bar', 'rxbar', 'larabar',
  'ben & jerry', 'haagen-dazs', 'breyers', 'edy\'s', 'magnum',
  'birds eye', 'green giant', 'pictsweet', 'cascadian farm',
  'stonyfield', 'horizon', 'organic valley', 'land o lakes',
  'delallo', 'rao\'s', 'classico', 'bertolli', 'prego',
  'bush\'s beans', 'goya', 'la preferida',
  'mission', 'old el paso', 'ortega', 'chi-chi',
  'ocean spray', 'tropicana', 'minute maid', 'simply',
  'starbucks', 'dunkin', 'folgers', 'maxwell house', 'green mountain',
  'lipton', 'tazo', 'celestial', 'twinings', 'bigelow',
  'pepsi', 'coca-cola', 'dr pepper', 'mountain dew', 'sprite',
  'polar seltzer', 'la croix', 'bubly', 'perrier', 'san pellegrino',
  'arizona tea', 'snapple', 'honest tea',
  'red bull', 'monster energy', 'celsius', 'alani nu',
  'gatorade', 'powerade', 'body armor', 'prime',
  'fiji water', 'poland spring', 'deer park', 'dasani', 'aquafina',
  'eternal water', 'essentia', 'smartwater',
  'm&m', 'snickers', 'twix', 'reese', 'hershey', 'kit kat', 'butterfinger',
  'oreo', 'chips ahoy', 'nutter butter', 'fig newton',
  'entenmann', 'hostess', 'little debbie', 'tastykake',
  'smucker', 'welch', 'bonne maman',
  'mccormick', 'tone\'s', 'simply organic', 'badia',
  'frank\'s red hot', 'tabasco', 'cholula', 'tapatio',
  'vlasic', 'mt. olive', 'claussen',
  'cheerios', 'frosted flakes', 'lucky charms', 'cinnamon toast', 'cap\'n crunch',
  'ritz', 'triscuit', 'wheat thin', 'goldfish', 'cheez-it',
  'alexia', 'ore-ida', 'mccain',
  'stouffer', 'lean cuisine', 'smart ones', 'healthy choice', 'banquet',
  'digorno', 'freschetta', 'tombstone', 'red baron',
  'sara lee', 'thomas\'', 'dave\'s killer',
  'wonder bread', 'arnold', 'pepperidge farm', 'martin\'s',
  'smucker', 'jif', 'skippy', 'peter pan',
  'philadelphia cream', 'cool whip', 'reddi-wip',
  'clover valley', 'great value', 'market pantry', 'good & gather',
  // ── Store brands (New England, existing) ──
  'stop & shop', 'shaw\'s', 'big y', 'wegmans', 'aldi',
  'simply nature', 'fit & active', 'friendly farms',
  'culinary tours', 'o organics', 'open nature', 'signature select',
  // ── Store brands (Kroger family) ──
  'kroger', 'private selection', 'simple truth', 'simple truth organic',
  'heritage farm', 'comforts', 'psst', 'big k', 'check this out',
  'fred meyer', 'fry\'s', 'king soopers', 'ralphs', 'smith\'s', 'dillons',
  'mariano\'s', 'pick \'n save', 'qfc', 'ruler', 'food 4 less',
  'harris teeter', 'ht traders', 'harris teeter organics',
  // ── Store brands (Albertsons / Safeway family) ──
  'safeway', 'albertsons', 'vons', 'jewel', 'jewel-osco', 'acme',
  'tom thumb', 'randalls', 'pavilions', 'star market', 'carrs',
  'lucerne', 'waterfront bistro', 'debi lilly', 'primo taglio',
  'open nature', 'o organics', 'signature select', 'signature cafe',
  'ready meals', 'soleil', 'value corner',
  // ── Store brands (Ahold Delhaize) ──
  'nature\'s promise', 'taste of inspirations', 'bowl & basket',
  'wholesome pantry', 'paperbird', 'hannaford', 'food lion',
  'giant', 'martin\'s', 'giant eagle', 'market district',
  // ── Store brands (Southeast) ──
  'publix', 'publix premium', 'greenwise', 'publix bakery',
  'ingles', 'laura lynn', 'lowe\'s foods', 'lowes foods',
  'winn-dixie', 'winn dixie', 'se grocers', 'piggly wiggly',
  'harveys', 'earth fare', 'food city', 'food lion',
  // ── Store brands (Midwest) ──
  'meijer', 'hy-vee', 'hy vee', 'schnucks', 'schnuck\'s',
  'woodman\'s', 'festival foods', 'cub', 'fresh thyme',
  // ── Store brands (Texas / South) ──
  'h-e-b', 'heb', 'hill country fare', 'central market',
  'brookshire\'s', 'fiesta', 'food town',
  // ── Store brands (West Coast) ──
  'safeway select', 'vons', 'sprouts', 'sprouts farmers',
  'winco', 'stater bros', 'smart & final', 'first street',
  'grocery outlet', 'raley\'s', 'nob hill', 'bel air',
  'save mart', 'lucky', 'gelson\'s', 'bristol farms',
  'new seasons', 'pcc', 'metropolitan market',
  // ── Store brands (National) ──
  'great value', 'marketside', 'sam\'s choice', 'member\'s mark',
  'kirkland', 'kirkland signature', 'good & gather', 'market pantry',
  'favorite day', 'up & up', 'target', 'walmart',
  'costco', 'sam\'s club', 'bj\'s', 'wellsley farms', 'berkley jensen',
  'whole foods', 'whole foods market', '365', '365 everyday value',
  '365 by whole foods', 'amazon fresh', 'aplenty',
  'trader joe\'s', 'trader giotto\'s', 'trader ming\'s',
  'lidl', 'preferred selection', 'chef select',
  'aldi', 'specially selected', 'baker\'s corner', 'clancy\'s',
  'deutsche kuche', 'elevation', 'fremont fish market',
  'happy farms', 'l\'oven fresh', 'little salad bar',
  'live gfree', 'mama cozzi', 'park street deli',
  'priano', 'season\'s choice', 'southern grove',
  // ── Store brands (Ethnic / Specialty) ──
  'h mart', 'hmart', '99 ranch', 'patel brothers',
  'el super', 'cardenas', 'vallarta', 'northgate',
  'sedano\'s', 'fiesta mart', 'la michoacana',
  // ── Store brands (Dollar / Discount) ──
  'clover valley', 'dollar general', 'dollar tree',
];

/**
 * Expand abbreviations in a raw product name.
 */
function expandAbbreviations(raw) {
  const words = raw.toLowerCase().replace(/[^a-z0-9%.\s]/g, ' ').split(/\s+/);
  return words.map(w => ABBREVIATIONS[w] || w).join(' ');
}

/**
 * Check if a product name is a food item.
 * Two-layer approach:
 *   1. Hard blacklist: if any NON_FOOD_KEYWORD matches, reject immediately
 *   2. Whitelist: must contain at least one FOOD_INDICATOR to be accepted
 * This prevents non-food items (monitors, tires, cosmetics) from leaking through.
 */
export function isFoodItem(rawName) {
  const lower = rawName.toLowerCase();

  // Layer 1: Hard blacklist
  if (NON_FOOD_KEYWORDS.some(kw => lower.includes(kw))) return false;

  // Layer 2: Must have a food indicator (whitelist)
  return FOOD_INDICATORS.some(fi => lower.includes(fi));
}

/**
 * Check if a product name is DEFINITELY not food (blacklist only).
 * Use this for items that already matched a keyword rule.
 */
export function isBlacklisted(rawName) {
  const lower = rawName.toLowerCase();
  return NON_FOOD_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Attempt rule-based normalization.
 * Returns { ingredientId, confidence } or null if no match.
 */
export function normalizeByRules(rawName, customMappings = null) {
  // Check custom mappings first (learned from corrections)
  if (customMappings) {
    const mapped = customMappings.get(rawName.toLowerCase().trim());
    if (mapped) return { ingredientId: mapped.ingredientId, variantId: mapped.variantId, confidence: 1.0, method: 'cached_mapping' };
  }

  const expanded = expandAbbreviations(rawName);
  const words = expanded.split(/\s+/);

  for (const rule of KEYWORD_RULES) {
    const mustMatch = rule.must.every(m => words.some(w => w.includes(m)));
    if (mustMatch) {
      // Calculate confidence based on how many pattern words matched
      const patternMatches = rule.patterns.filter(p => words.some(w => w.includes(p))).length;
      const confidence = Math.min(patternMatches / rule.patterns.length, 1.0);

      return {
        ingredientId: rule.id,
        variantId: null,
        confidence: Math.max(confidence, 0.7),
        method: 'keyword_rule'
      };
    }
  }

  return null;
}

/**
 * Load cached normalization mappings from the database.
 */
export function loadCachedMappings(db) {
  const rows = db.prepare('SELECT raw_name, canonical_ingredient_id, variant_id FROM normalization_map WHERE confirmed = 1').all();
  const map = new Map();
  for (const row of rows) {
    map.set(row.raw_name.toLowerCase().trim(), {
      ingredientId: row.canonical_ingredient_id,
      variantId: row.variant_id
    });
  }
  return map;
}

/**
 * Save a normalization result to the cache.
 */
export function saveMapping(db, rawName, ingredientId, variantId, method, confidence, confirmed = false) {
  db.prepare(`
    INSERT OR REPLACE INTO normalization_map (raw_name, canonical_ingredient_id, variant_id, method, confidence, confirmed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(rawName.toLowerCase().trim(), ingredientId, variantId, method, confidence, confirmed ? 1 : 0);
}
