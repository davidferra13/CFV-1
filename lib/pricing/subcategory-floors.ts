/**
 * Subcategory Price Floors
 *
 * Granular USDA/BLS-anchored price floors that replace the old 15-category
 * system. The old system returned $4.99/lb for BOTH chicken thighs AND wagyu.
 *
 * Each subcategory reflects real retail averages from USDA ERS Average Price
 * data (2024-2025) and BLS CPI item strata. These are conservative FLOOR
 * estimates (25th percentile of retail), not averages.
 *
 * Pure function: no database, no auth, no side effects.
 */

// --- Subcategory floors (cents per standard unit) ---
// Keyed by subcategory slug. Unit is per-lb unless noted.

export const SUBCATEGORY_FLOOR_CENTS: Record<string, number> = {
  // PROTEIN - per lb
  chicken_whole: 189, // USDA: whole fryer ~$1.89/lb
  chicken_breast: 399, // USDA: boneless breast ~$3.99/lb
  chicken_thigh: 299, // USDA: bone-in thighs ~$2.99/lb
  chicken_wing: 349, // USDA: wings ~$3.49/lb
  ground_beef: 549, // USDA: ground beef lean ~$5.49/lb
  beef_steak: 999, // USDA: choice sirloin ~$9.99/lb
  beef_roast: 799, // USDA: chuck roast ~$7.99/lb
  beef_premium: 2499, // Wagyu, prime rib, tenderloin
  beef_ribs: 899, // Short ribs, back ribs
  pork_chop: 449, // USDA: bone-in chops ~$4.49/lb
  pork_loin: 399, // USDA: boneless loin ~$3.99/lb
  pork_shoulder: 349, // USDA: butt/shoulder ~$3.49/lb
  pork_ribs: 499, // USDA: spareribs ~$4.99/lb
  pork_bacon: 699, // USDA: sliced bacon ~$6.99/lb
  pork_ground: 499, // Ground pork
  lamb: 1299, // USDA: leg of lamb ~$12.99/lb
  lamb_rack: 2999, // Rack of lamb, frenched
  lamb_ground: 899, // Ground lamb
  veal: 1499, // Veal cutlets
  turkey_whole: 199, // USDA: whole turkey ~$1.99/lb
  turkey_breast: 549, // USDA: breast ~$5.49/lb
  turkey_ground: 549, // Ground turkey
  duck: 899, // Whole duck
  bison: 1199, // Bison steaks/ground
  venison: 1499, // Game meat
  sausage: 549, // Italian sausage, bratwurst
  hot_dog: 449, // Frankfurters
  deli_meat: 899, // Per lb, sliced deli

  // SEAFOOD - per lb
  shrimp: 999, // USDA: frozen raw ~$9.99/lb
  shrimp_cooked: 1299, // Cooked, peeled
  salmon: 1099, // USDA: fresh Atlantic ~$10.99/lb
  salmon_smoked: 1999, // Smoked/lox
  tuna_fresh: 1499, // Fresh ahi/yellowfin
  tuna_canned: 299, // Per can (each)
  cod: 899, // Fresh cod
  halibut: 1999, // Fresh halibut
  tilapia: 599, // Fresh tilapia
  catfish: 699, // Fresh catfish
  trout: 999, // Fresh trout
  sea_bass: 1999, // Chilean sea bass
  swordfish: 1699, // Fresh swordfish
  crab: 1999, // Crab legs, lump crab
  lobster: 2499, // Whole lobster, tail
  scallop: 1999, // Dry sea scallops
  mussel: 599, // Fresh mussels
  clam: 799, // Fresh clams
  oyster: 1499, // Fresh oysters per lb
  calamari: 899, // Squid/calamari
  sardine: 399, // Canned/fresh

  // PRODUCE - per lb (or per each for large items)
  tomato: 249, // USDA: field grown ~$2.49/lb
  tomato_cherry: 399, // Cherry/grape tomatoes
  tomato_heirloom: 499, // Heirloom varieties
  onion: 149, // USDA: yellow onion ~$1.49/lb
  garlic: 499, // Garlic bulbs (per lb)
  potato: 129, // USDA: russet ~$1.29/lb
  potato_sweet: 199, // Sweet potatoes
  carrot: 149, // USDA: carrots ~$1.49/lb
  celery: 199, // Per bunch
  bell_pepper: 299, // Per lb
  lettuce: 199, // USDA: iceberg ~$1.99/head
  spinach: 499, // Fresh baby spinach per lb
  kale: 349, // Fresh kale per bunch
  broccoli: 249, // USDA: per lb ~$2.49
  cauliflower: 299, // Per head/lb
  zucchini: 199, // Per lb
  squash_winter: 199, // Butternut, acorn per lb
  mushroom_common: 399, // White/cremini per lb
  mushroom_specialty: 1299, // Shiitake, oyster, chanterelle
  mushroom_truffle: 9999, // Truffles (per oz, treated as lb floor)
  avocado: 199, // Per each
  lemon: 99, // Per each
  lime: 59, // Per each
  apple: 199, // USDA: ~$1.99/lb
  banana: 69, // USDA: ~$0.69/lb
  berry_common: 399, // Strawberries per lb
  berry_premium: 599, // Blueberries, raspberries per lb/pint
  grape: 299, // Per lb
  mango: 199, // Per each
  pineapple: 349, // Per each
  melon: 99, // Per lb (watermelon, cantaloupe)
  citrus: 199, // Oranges, grapefruit per lb
  corn: 79, // Per ear
  asparagus: 449, // USDA: per lb ~$4.49
  artichoke: 299, // Per each
  eggplant: 249, // Per lb
  green_bean: 299, // Per lb
  pea: 399, // Snow/snap peas per lb
  cucumber: 149, // Per each
  radish: 199, // Per bunch
  beet: 249, // Per lb/bunch
  turnip: 199, // Per lb
  cabbage: 99, // Per lb

  // DAIRY - per unit varies
  milk: 449, // USDA: whole gallon ~$4.49
  cream: 499, // Heavy cream per quart
  half_and_half: 399, // Per quart
  butter: 549, // USDA: per lb ~$5.49
  butter_premium: 799, // European, cultured, Kerrygold
  cheese_common: 599, // USDA: cheddar per lb ~$5.99
  cheese_premium: 1299, // Brie, gouda, gruyere per lb
  cheese_artisan: 2499, // Aged parm, manchego per lb
  yogurt: 449, // Per 32oz container
  sour_cream: 349, // Per 16oz
  cream_cheese: 399, // Per 8oz
  egg: 399, // USDA: per dozen ~$3.99

  // HERB - per bunch/oz
  herb_common: 199, // Cilantro, parsley per bunch
  herb_premium: 299, // Basil, tarragon, chervil per bunch
  herb_dried: 399, // Dried herbs per oz jar

  // GRAIN - per lb or package
  rice: 149, // USDA: long grain per lb
  rice_premium: 399, // Jasmine, basmati, arborio per lb
  pasta_dry: 199, // Per lb box
  pasta_fresh: 599, // Fresh pasta per lb
  flour: 69, // Per lb (5lb bag = $3.49)
  bread: 399, // Per loaf
  bread_artisan: 699, // Sourdough, specialty
  oat: 299, // Per canister/lb
  quinoa: 599, // Per lb
  couscous: 399, // Per lb

  // SPICE - per oz (small quantities, high per-unit)
  spice_common: 399, // Paprika, cumin, oregano per jar
  spice_premium: 799, // Vanilla bean, cardamom per oz
  saffron: 1499, // Per gram (saffron is $10-30/g retail)
  peppercorn: 499, // Whole peppercorns per oz
  cinnamon: 399, // Ground cinnamon per jar
  vanilla_extract: 999, // Per 4oz bottle

  // OIL - per bottle/unit
  olive_oil: 799, // USDA: per liter ~$7.99
  olive_oil_premium: 1499, // EVOO estate/single origin
  vegetable_oil: 449, // Per 48oz bottle
  sesame_oil: 599, // Per bottle
  coconut_oil: 699, // Per jar
  vinegar: 349, // Per bottle
  vinegar_balsamic: 799, // Balsamic per bottle

  // NUT - per lb
  almond: 799, // Per lb
  walnut: 899, // Per lb
  pecan: 1199, // Per lb
  cashew: 999, // Per lb
  pistachio: 1299, // Per lb
  pine_nut: 2499, // Per lb
  macadamia: 1999, // Per lb
  peanut: 399, // Per lb

  // LEGUME - per lb
  bean_dry: 149, // Dried beans per lb
  bean_canned: 129, // Per can
  lentil: 199, // Per lb
  chickpea: 149, // Dried per lb

  // BEVERAGE - per unit
  coffee: 999, // Per lb ground
  tea: 499, // Per box
  juice: 449, // Per half gallon
  wine_cooking: 699, // Per bottle
  beer: 199, // Per bottle/can

  // CONDIMENT - per unit
  soy_sauce: 349, // Per bottle
  hot_sauce: 299, // Per bottle
  mustard: 299, // Per jar
  ketchup: 349, // Per bottle
  mayo: 449, // Per jar
  salsa: 399, // Per jar
  fish_sauce: 399, // Per bottle
  miso: 599, // Per tub
  tahini: 699, // Per jar
  harissa: 599, // Per jar/tube

  // SWEET - per unit
  sugar: 99, // Per lb (5lb bag = $4.99)
  honey: 899, // Per lb jar
  maple_syrup: 1299, // Pure maple per 12oz
  chocolate: 499, // Baking chocolate per bar
  chocolate_premium: 999, // Valrhona, Callebaut per lb
}

// Broad category floors (fallback when no subcategory matches)
// These are the MEDIAN of all subcategories in each category,
// not the old arbitrary numbers.
export const CATEGORY_FLOOR_CENTS: Record<string, number> = {
  protein: 549, // Was 499. Median of poultry/pork/beef subcats
  seafood: 999, // Was 899. Median of fish/shellfish subcats
  produce: 249, // Was 199. Median of fruit/veg subcats
  dairy: 449, // Was 349. Median of dairy subcats
  herb: 249, // Was 199. Median of herb subcats
  grain: 299, // Was 149. Median of grain subcats
  pantry: 349, // Was 249. Pantry staples
  spice: 499, // Was 399. Median of spice subcats
  oil: 599, // Was 549. Median of oil subcats
  nut: 999, // Was 799. Median of nut subcats
  legume: 149, // Was 149. Legumes are cheap (no change)
  beverage: 499, // Was 299. Coffee/juice pulls this up
  baked: 449, // Was 349. Artisan bread
  sweet: 499, // Was 299. Honey/maple pull this up
  condiment: 399, // Was 349. Slight adjustment
}

export const DEFAULT_FLOOR_CENTS = 349

// --- Subcategory inference from ingredient name ---
// Maps keyword patterns to subcategory slugs. Checked in order;
// first match wins. More specific patterns go first.

const SUBCATEGORY_PATTERNS: Array<{ pattern: RegExp; subcategory: string }> = [
  // PROTEIN - specific cuts/types first, then broad
  { pattern: /wagyu|a5|kobe/i, subcategory: 'beef_premium' },
  {
    pattern: /prime rib|tenderloin|filet mignon|ribeye|strip steak|porterhouse|t-bone/i,
    subcategory: 'beef_premium',
  },
  { pattern: /rack of lamb|lamb rack|frenched lamb/i, subcategory: 'lamb_rack' },
  { pattern: /ground lamb|lamb mince/i, subcategory: 'lamb_ground' },
  { pattern: /lamb/i, subcategory: 'lamb' },
  { pattern: /veal/i, subcategory: 'veal' },
  { pattern: /bison|buffalo/i, subcategory: 'bison' },
  { pattern: /venison|elk|game/i, subcategory: 'venison' },
  { pattern: /duck/i, subcategory: 'duck' },
  { pattern: /chicken breast/i, subcategory: 'chicken_breast' },
  { pattern: /chicken thigh/i, subcategory: 'chicken_thigh' },
  { pattern: /chicken wing/i, subcategory: 'chicken_wing' },
  { pattern: /whole chicken|chicken whole|roasting chicken/i, subcategory: 'chicken_whole' },
  { pattern: /chicken/i, subcategory: 'chicken_breast' }, // default chicken = breast
  { pattern: /ground beef|hamburger|minced beef/i, subcategory: 'ground_beef' },
  { pattern: /steak|sirloin|flank|skirt/i, subcategory: 'beef_steak' },
  { pattern: /beef roast|chuck roast|pot roast|brisket/i, subcategory: 'beef_roast' },
  { pattern: /short rib|beef rib/i, subcategory: 'beef_ribs' },
  { pattern: /beef/i, subcategory: 'beef_steak' }, // default beef = steak
  { pattern: /bacon/i, subcategory: 'pork_bacon' },
  { pattern: /pork chop/i, subcategory: 'pork_chop' },
  { pattern: /pork loin|pork tenderloin/i, subcategory: 'pork_loin' },
  { pattern: /pork shoulder|pork butt|pulled pork/i, subcategory: 'pork_shoulder' },
  { pattern: /pork rib|spareribs|baby back/i, subcategory: 'pork_ribs' },
  { pattern: /ground pork/i, subcategory: 'pork_ground' },
  { pattern: /pork/i, subcategory: 'pork_chop' }, // default pork = chop
  { pattern: /turkey breast/i, subcategory: 'turkey_breast' },
  { pattern: /ground turkey/i, subcategory: 'turkey_ground' },
  { pattern: /turkey/i, subcategory: 'turkey_whole' },
  { pattern: /sausage|bratwurst|chorizo|andouille|kielbasa/i, subcategory: 'sausage' },
  { pattern: /hot dog|frankfurter/i, subcategory: 'hot_dog' },
  {
    pattern: /deli|prosciutto|salami|pepperoni|mortadella|capicola|pancetta/i,
    subcategory: 'deli_meat',
  },

  // SEAFOOD - specific species first
  { pattern: /lobster/i, subcategory: 'lobster' },
  { pattern: /crab/i, subcategory: 'crab' },
  { pattern: /scallop/i, subcategory: 'scallop' },
  { pattern: /oyster/i, subcategory: 'oyster' },
  { pattern: /smoked salmon|lox|gravlax/i, subcategory: 'salmon_smoked' },
  { pattern: /salmon/i, subcategory: 'salmon' },
  { pattern: /halibut/i, subcategory: 'halibut' },
  { pattern: /sea bass|branzino|chilean/i, subcategory: 'sea_bass' },
  { pattern: /swordfish/i, subcategory: 'swordfish' },
  { pattern: /fresh tuna|ahi|yellowfin/i, subcategory: 'tuna_fresh' },
  { pattern: /canned tuna|tuna can/i, subcategory: 'tuna_canned' },
  { pattern: /tuna/i, subcategory: 'tuna_fresh' },
  { pattern: /cooked shrimp/i, subcategory: 'shrimp_cooked' },
  { pattern: /shrimp|prawn/i, subcategory: 'shrimp' },
  { pattern: /cod/i, subcategory: 'cod' },
  { pattern: /tilapia/i, subcategory: 'tilapia' },
  { pattern: /catfish/i, subcategory: 'catfish' },
  { pattern: /trout/i, subcategory: 'trout' },
  { pattern: /mussel/i, subcategory: 'mussel' },
  { pattern: /clam/i, subcategory: 'clam' },
  { pattern: /calamari|squid/i, subcategory: 'calamari' },
  { pattern: /sardine|anchov/i, subcategory: 'sardine' },
  { pattern: /fish/i, subcategory: 'cod' }, // generic fish = cod price

  // PRODUCE - specific varieties first
  { pattern: /truffle/i, subcategory: 'mushroom_truffle' },
  {
    pattern: /shiitake|oyster mushroom|chanterelle|morel|porcini|maitake|enoki/i,
    subcategory: 'mushroom_specialty',
  },
  { pattern: /mushroom|cremini|portobello|baby bella|button/i, subcategory: 'mushroom_common' },
  { pattern: /heirloom tomato/i, subcategory: 'tomato_heirloom' },
  { pattern: /cherry tomato|grape tomato/i, subcategory: 'tomato_cherry' },
  { pattern: /tomato/i, subcategory: 'tomato' },
  { pattern: /sweet potato|yam/i, subcategory: 'potato_sweet' },
  { pattern: /potato/i, subcategory: 'potato' },
  { pattern: /avocado/i, subcategory: 'avocado' },
  { pattern: /asparagus/i, subcategory: 'asparagus' },
  { pattern: /artichoke/i, subcategory: 'artichoke' },
  { pattern: /raspberry|blackberry|blueberry/i, subcategory: 'berry_premium' },
  { pattern: /strawberry|berry/i, subcategory: 'berry_common' },
  { pattern: /spinach/i, subcategory: 'spinach' },
  { pattern: /kale/i, subcategory: 'kale' },
  { pattern: /lettuce|romaine|arugula/i, subcategory: 'lettuce' },
  { pattern: /broccoli/i, subcategory: 'broccoli' },
  { pattern: /cauliflower/i, subcategory: 'cauliflower' },
  { pattern: /bell pepper|capsicum/i, subcategory: 'bell_pepper' },
  { pattern: /onion/i, subcategory: 'onion' },
  { pattern: /garlic/i, subcategory: 'garlic' },
  { pattern: /carrot/i, subcategory: 'carrot' },
  { pattern: /celery/i, subcategory: 'celery' },
  { pattern: /zucchini|courgette/i, subcategory: 'zucchini' },
  { pattern: /butternut|acorn|spaghetti squash|delicata/i, subcategory: 'squash_winter' },
  { pattern: /eggplant|aubergine/i, subcategory: 'eggplant' },
  { pattern: /green bean|string bean|haricot/i, subcategory: 'green_bean' },
  { pattern: /snow pea|snap pea|pea(?!nut|can)/i, subcategory: 'pea' },
  { pattern: /cucumber/i, subcategory: 'cucumber' },
  { pattern: /corn\b/i, subcategory: 'corn' },
  { pattern: /cabbage/i, subcategory: 'cabbage' },
  { pattern: /beet\b/i, subcategory: 'beet' },
  { pattern: /radish/i, subcategory: 'radish' },
  { pattern: /turnip/i, subcategory: 'turnip' },
  { pattern: /lemon/i, subcategory: 'lemon' },
  { pattern: /lime\b/i, subcategory: 'lime' },
  { pattern: /apple/i, subcategory: 'apple' },
  { pattern: /banana/i, subcategory: 'banana' },
  { pattern: /grape\b/i, subcategory: 'grape' },
  { pattern: /mango/i, subcategory: 'mango' },
  { pattern: /pineapple/i, subcategory: 'pineapple' },
  { pattern: /watermelon|cantaloupe|honeydew|melon/i, subcategory: 'melon' },
  { pattern: /orange|grapefruit|tangerine|clementine/i, subcategory: 'citrus' },

  // DAIRY
  {
    pattern: /parmigiano|parmesan|pecorino|aged cheese|gruyere|comte/i,
    subcategory: 'cheese_artisan',
  },
  {
    pattern:
      /brie|camembert|gouda|havarti|manchego|fontina|goat cheese|chevre|blue cheese|roquefort|gorgonzola/i,
    subcategory: 'cheese_premium',
  },
  {
    pattern: /cheddar|mozzarella|swiss|jack|colby|provolone|american|pepper jack|cheese/i,
    subcategory: 'cheese_common',
  },
  { pattern: /kerrygold|european butter|cultured butter|plugra/i, subcategory: 'butter_premium' },
  { pattern: /butter/i, subcategory: 'butter' },
  { pattern: /heavy cream|whipping cream|double cream/i, subcategory: 'cream' },
  { pattern: /half and half|half & half/i, subcategory: 'half_and_half' },
  { pattern: /cream cheese/i, subcategory: 'cream_cheese' },
  { pattern: /sour cream|creme fraiche/i, subcategory: 'sour_cream' },
  { pattern: /yogurt/i, subcategory: 'yogurt' },
  { pattern: /milk/i, subcategory: 'milk' },
  { pattern: /egg/i, subcategory: 'egg' },

  // SPICE
  { pattern: /saffron/i, subcategory: 'saffron' },
  { pattern: /vanilla extract|vanilla bean/i, subcategory: 'vanilla_extract' },
  { pattern: /vanilla/i, subcategory: 'spice_premium' },
  {
    pattern: /cardamom|star anise|sumac|za'?atar|ras el hanout|garam masala/i,
    subcategory: 'spice_premium',
  },
  { pattern: /peppercorn|black pepper|white pepper/i, subcategory: 'peppercorn' },
  { pattern: /cinnamon/i, subcategory: 'cinnamon' },

  // OIL
  { pattern: /evoo|extra virgin olive/i, subcategory: 'olive_oil_premium' },
  { pattern: /olive oil/i, subcategory: 'olive_oil' },
  { pattern: /sesame oil/i, subcategory: 'sesame_oil' },
  { pattern: /coconut oil/i, subcategory: 'coconut_oil' },
  { pattern: /vegetable oil|canola|rapeseed|neutral oil/i, subcategory: 'vegetable_oil' },
  { pattern: /balsamic/i, subcategory: 'vinegar_balsamic' },
  { pattern: /vinegar/i, subcategory: 'vinegar' },

  // NUT
  { pattern: /pine nut|pignoli/i, subcategory: 'pine_nut' },
  { pattern: /macadamia/i, subcategory: 'macadamia' },
  { pattern: /pistachio/i, subcategory: 'pistachio' },
  { pattern: /pecan/i, subcategory: 'pecan' },
  { pattern: /cashew/i, subcategory: 'cashew' },
  { pattern: /walnut/i, subcategory: 'walnut' },
  { pattern: /almond/i, subcategory: 'almond' },
  { pattern: /peanut/i, subcategory: 'peanut' },

  // LEGUME
  { pattern: /lentil/i, subcategory: 'lentil' },
  { pattern: /chickpea|garbanzo/i, subcategory: 'chickpea' },
  { pattern: /canned bean|can.*bean|bean.*can/i, subcategory: 'bean_canned' },
  { pattern: /bean|black bean|kidney|navy|pinto|cannellini/i, subcategory: 'bean_dry' },

  // GRAIN
  { pattern: /jasmine|basmati|arborio|sushi rice|wild rice/i, subcategory: 'rice_premium' },
  { pattern: /rice/i, subcategory: 'rice' },
  { pattern: /fresh pasta|egg pasta/i, subcategory: 'pasta_fresh' },
  {
    pattern: /pasta|spaghetti|penne|rigatoni|linguine|fettuccine|fusilli|farfalle|macaroni|orzo/i,
    subcategory: 'pasta_dry',
  },
  { pattern: /sourdough|artisan bread|ciabatta|baguette|focaccia/i, subcategory: 'bread_artisan' },
  { pattern: /bread|roll|bun/i, subcategory: 'bread' },
  { pattern: /flour/i, subcategory: 'flour' },
  { pattern: /quinoa/i, subcategory: 'quinoa' },
  { pattern: /oat|oatmeal/i, subcategory: 'oat' },
  { pattern: /couscous/i, subcategory: 'couscous' },

  // SWEET
  { pattern: /maple syrup|pure maple/i, subcategory: 'maple_syrup' },
  { pattern: /honey/i, subcategory: 'honey' },
  { pattern: /valrhona|callebaut|guittard|couverture/i, subcategory: 'chocolate_premium' },
  { pattern: /chocolate/i, subcategory: 'chocolate' },
  { pattern: /sugar/i, subcategory: 'sugar' },

  // CONDIMENT
  { pattern: /miso/i, subcategory: 'miso' },
  { pattern: /tahini/i, subcategory: 'tahini' },
  { pattern: /harissa/i, subcategory: 'harissa' },
  { pattern: /fish sauce|nam pla|nuoc mam/i, subcategory: 'fish_sauce' },
  { pattern: /soy sauce|tamari|shoyu/i, subcategory: 'soy_sauce' },
  { pattern: /hot sauce|sriracha|tabasco|cholula|gochujang/i, subcategory: 'hot_sauce' },
  { pattern: /mustard/i, subcategory: 'mustard' },
  { pattern: /ketchup|catsup/i, subcategory: 'ketchup' },
  { pattern: /mayonnaise|mayo/i, subcategory: 'mayo' },
  { pattern: /salsa/i, subcategory: 'salsa' },

  // BEVERAGE
  { pattern: /coffee/i, subcategory: 'coffee' },
  { pattern: /tea\b/i, subcategory: 'tea' },
  { pattern: /cooking wine|marsala|sherry/i, subcategory: 'wine_cooking' },
  { pattern: /juice/i, subcategory: 'juice' },
  { pattern: /beer|ale|stout|lager/i, subcategory: 'beer' },

  // HERB
  {
    pattern: /dried (?:basil|oregano|thyme|rosemary|sage|dill|parsley|cilantro|tarragon)/i,
    subcategory: 'herb_dried',
  },
  { pattern: /basil|tarragon|chervil|lemongrass|mint|sage/i, subcategory: 'herb_premium' },
  { pattern: /cilantro|parsley|dill|chive|rosemary|thyme|oregano/i, subcategory: 'herb_common' },
]

/**
 * Infer the best subcategory for an ingredient name within a known broad category.
 * Returns the subcategory slug or null if no specific match.
 */
export function inferSubcategory(ingredientName: string, broadCategory: string): string | null {
  const name = ingredientName.toLowerCase()
  for (const { pattern, subcategory } of SUBCATEGORY_PATTERNS) {
    if (pattern.test(name)) return subcategory
  }
  return null
}
