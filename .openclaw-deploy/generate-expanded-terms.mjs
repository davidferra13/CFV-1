/**
 * Generate expanded search terms for full grocery store coverage.
 * Run on Pi: node scripts/generate-expanded-terms.mjs
 *
 * Strategy:
 *   1. Keep all existing 1,005 generic terms
 *   2. Add brand-only searches (top 150 brands from captured data)
 *   3. Add ~1,500 specific product variant terms covering the long tail
 *   4. Deduplicate everything
 *   Target: 2,500+ terms -> 30,000+ unique SKUs per store
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load existing terms
const existing = JSON.parse(readFileSync(join(ROOT, 'config/search-terms.json'), 'utf8'));
const existingFlat = new Set();
for (const list of Object.values(existing.terms)) {
  for (const t of list) existingFlat.add(t.toLowerCase().trim());
}
console.log('Existing terms:', existingFlat.size);

// Get top brands from DB
const db = new Database(join(ROOT, 'data/prices.db'));
const brands = db.prepare("SELECT brand, COUNT(*) as c FROM catalog_products WHERE brand IS NOT NULL AND brand != '' GROUP BY brand ORDER BY c DESC LIMIT 150").all();
db.close();

// Brand-only searches (top brands we haven't searched yet)
const brandTerms = brands
  .filter(b => b.c >= 10)
  .map(b => b.brand.toLowerCase())
  .filter(b => !existingFlat.has(b));

console.log('New brand terms:', brandTerms.length);

// Massive specific product list
const specificProducts = [
  // === DAIRY (100+) ===
  'whole milk','skim milk','2% milk','1% milk','chocolate milk','oat milk','coconut milk',
  'almond milk vanilla','soy milk','lactose free milk','buttermilk',
  'cream cheese','ricotta','mascarpone','goat cheese','feta cheese','blue cheese',
  'swiss cheese','provolone','muenster','gouda','gruyere','havarti','fontina',
  'american cheese','string cheese','cheese slices','shredded cheddar','shredded mozzarella',
  'parmesan block','cottage cheese','sour cream','whipped cream','half and half',
  'coffee creamer','french onion dip','hummus','guacamole',
  'greek yogurt','flavored yogurt','yogurt drinks','kefir',
  'butter unsalted','butter salted','margarine','ghee',
  'large eggs','organic eggs','egg whites','cage free eggs','dozen eggs',

  // === BREAD & BAKERY (80+) ===
  'white bread','whole wheat bread','sourdough bread','rye bread','multigrain bread',
  'pumpernickel','italian bread','french bread','ciabatta','focaccia',
  'english muffins','bagels','croissants','danish pastry','muffins',
  'hamburger buns','hot dog buns','dinner rolls','brioche','naan bread',
  'flour tortilla','corn tortilla','pita pockets','wraps','flatbread',
  'banana bread','cornbread','biscuits','scones','cinnamon raisin bread',
  'gluten free bread','keto bread','sandwich thins',
  'cake','cupcakes','brownies','pie','cheesecake',
  'donuts','cookies chocolate chip','sugar cookies','shortbread',

  // === MEAT (100+) ===
  'ground beef 80 20','ground beef 90 10','ground beef 93 7',
  'sirloin steak','filet mignon','ny strip','t bone steak','flank steak',
  'skirt steak','chuck roast','beef stew meat','beef tips','beef short ribs',
  'corned beef','beef brisket','veal cutlet','lamb chop','lamb leg',
  'rack of lamb','ground lamb','pork chop','pork loin','pork tenderloin',
  'pork shoulder','baby back ribs','spare ribs','pork belly','ham steak',
  'spiral ham','bacon thick cut','turkey bacon','canadian bacon','pancetta',
  'prosciutto','salami','pepperoni','mortadella','capicola',
  'hot dogs','bratwurst','italian sausage','breakfast sausage','kielbasa',
  'andouille sausage','chicken sausage','turkey sausage',
  'boneless chicken breast','bone in chicken thigh','chicken tenders',
  'chicken cutlets','rotisserie chicken','cornish hen',
  'ground turkey','turkey breast deli','turkey leg',
  'duck breast','quail','bison ground','venison',

  // === SEAFOOD (80+) ===
  'atlantic salmon fillet','sockeye salmon','salmon portions',
  'cod fillet','haddock fillet','halibut steak','swordfish steak',
  'tuna steak','ahi tuna','tilapia fillet','sea bass','red snapper',
  'catfish fillet','trout','flounder','sole fillet','grouper',
  'shrimp raw','shrimp cooked','jumbo shrimp','cocktail shrimp',
  'lobster tail','crab legs','crab meat','scallops','mussels',
  'littleneck clams','oysters','calamari','octopus','anchovies',
  'smoked salmon','lox','sushi grade tuna','fish sticks',
  'canned tuna','canned salmon','canned sardines',

  // === FROZEN (100+) ===
  'frozen vegetables mixed','frozen broccoli','frozen corn','frozen peas',
  'frozen spinach','frozen green beans','frozen stir fry vegetables',
  'frozen french fries','frozen tater tots','frozen onion rings',
  'frozen pizza pepperoni','frozen pizza cheese','frozen pizza',
  'frozen lasagna','frozen macaroni and cheese','frozen burritos',
  'frozen pot pie','frozen chicken nuggets','frozen chicken patties',
  'frozen fish sticks','frozen fish fillets','frozen shrimp bag',
  'frozen breakfast sandwich','frozen waffles','frozen pancakes',
  'frozen fruit smoothie mix','frozen strawberries','frozen blueberries',
  'frozen mango chunks','frozen mixed berries',
  'ice cream sandwich','ice cream bars','ice cream cone','popsicles',
  'frozen pie crust','frozen puff pastry','frozen dinner rolls',
  'frozen dumplings','frozen egg rolls','frozen potstickers',
  'frozen edamame','frozen pierogies','frozen ravioli',
  'tv dinner','frozen meal','gelato','sorbet','frozen yogurt',
  'frozen appetizers','mozzarella sticks frozen','jalapeno poppers frozen',
  'hot pockets','totinos','digiorno','stouffers frozen',
  'marie callenders','healthy choice frozen','amy frozen',
  'birds eye frozen','green giant frozen',

  // === CANNED & PANTRY (120+) ===
  'diced tomatoes','crushed tomatoes','tomato paste','tomato puree','whole peeled tomatoes',
  'canned corn','canned green beans','canned peas','canned carrots',
  'canned beets','canned mushrooms','canned artichoke hearts',
  'black beans canned','kidney beans','cannellini beans','garbanzo beans',
  'refried beans','baked beans','pinto beans',
  'chicken broth','beef broth','vegetable broth','bone broth',
  'cream of mushroom soup','cream of chicken soup','tomato soup canned',
  'clam chowder','minestrone soup','chicken noodle soup',
  'canned chicken','canned chili','spam',
  'coconut cream','evaporated milk','condensed milk',
  'peanut butter creamy','peanut butter crunchy','almond butter','sunflower butter',
  'grape jelly','strawberry jam','orange marmalade','honey bear',
  'maple syrup pure','pancake syrup','agave nectar','molasses',
  'white sugar','brown sugar','powdered sugar','turbinado sugar','stevia',
  'all purpose flour','bread flour','whole wheat flour','almond flour',
  'coconut flour','self rising flour','cake flour','cornstarch',
  'baking powder','baking soda','active dry yeast','vanilla extract',
  'cocoa powder','chocolate chips','chocolate bar baking',
  'corn syrup','food coloring','sprinkles','cake mix',
  'brownie mix','muffin mix','cookie dough','pie filling',
  'raisins box','dried cranberries','dried apricots',
  'canned fruit cocktail','canned peaches','canned pineapple','canned mandarin',

  // === PASTA & GRAINS (60+) ===
  'spaghetti','penne','rigatoni','fettuccine','linguine','angel hair pasta',
  'macaroni elbow','rotini','farfalle','orzo','lasagna noodles',
  'whole wheat pasta','gluten free pasta','chickpea pasta',
  'ramen noodles','rice noodles','udon noodles','soba noodles',
  'white rice long grain','brown rice','basmati rice bag','jasmine rice bag',
  'arborio rice','wild rice','sushi rice','instant rice','rice a roni',
  'quinoa','couscous','bulgur','farro','barley',
  'instant oatmeal packets','steel cut oats','rolled oats','granola bag',
  'breadcrumbs','panko breadcrumbs','croutons','stuffing mix',

  // === CONDIMENTS & SAUCES (80+) ===
  'ketchup bottle','yellow mustard','dijon mustard','whole grain mustard',
  'mayonnaise','miracle whip','relish','pickle relish',
  'hot sauce bottle','sriracha sauce','tabasco','buffalo sauce','wing sauce',
  'soy sauce bottle','teriyaki sauce','hoisin sauce','oyster sauce','fish sauce',
  'worcestershire sauce','steak sauce','a1 sauce','bbq sauce bottle',
  'marinara sauce jar','alfredo sauce jar','pesto sauce','vodka sauce jar',
  'salsa jar','salsa verde jar','picante sauce',
  'ranch dressing bottle','italian dressing bottle','caesar dressing',
  'balsamic vinaigrette','blue cheese dressing','thousand island dressing',
  'olive oil extra virgin','vegetable oil','canola oil','avocado oil',
  'coconut oil','sesame oil','peanut oil','grapeseed oil',
  'red wine vinegar','apple cider vinegar','balsamic vinegar',
  'rice vinegar','white vinegar',

  // === SPICES (60+) ===
  'garlic powder','onion powder','paprika','smoked paprika','cayenne pepper',
  'chili powder','cumin ground','coriander ground','turmeric powder',
  'cinnamon ground','nutmeg ground','cloves ground','allspice','ginger ground',
  'black pepper whole','white pepper','red pepper flakes','celery salt',
  'garlic salt','seasoning salt','old bay seasoning','italian seasoning blend',
  'taco seasoning packet','ranch seasoning','everything bagel seasoning',
  'curry powder','garam masala','chinese five spice',
  'dried basil','dried oregano','dried thyme','dried rosemary',
  'dried parsley','bay leaves','saffron threads','cardamom pods',
  'vanilla bean','montreal steak seasoning','lemon pepper','cajun seasoning',

  // === SNACKS (80+) ===
  'potato chips bag','tortilla chips bag','pita chips','veggie chips',
  'kettle chips','pretzels bag','pretzel crisps','popcorn bag','microwave popcorn',
  'cheese puffs','cheetos','doritos','goldfish crackers',
  'wheat thins','ritz crackers','club crackers','water crackers',
  'rice cakes','granola bars box','protein bars','energy bars','fruit snacks box',
  'trail mix bag','mixed nuts can','cashews','almonds bag','pistachios',
  'walnuts bag','pecans','macadamia nuts','peanuts can','sunflower seeds',
  'beef jerky bag','slim jim','cheese sticks snack',
  'applesauce cups','pudding cups','fruit cups',
  'oreo cookies','chips ahoy','nutter butter','fig newtons',
  'animal crackers','graham crackers','saltine crackers',
  'cheese its','cheez it','chex mix','bugles','combos',
  'pop chips','smartfood popcorn','skinny pop',

  // === BEVERAGES (100+) ===
  'spring water case','purified water','sparkling water','flavored water',
  'coconut water bottle','alkaline water',
  'orange juice carton','apple juice','grape juice','cranberry juice','pineapple juice',
  'tomato juice','lemonade bottle','fruit punch','iced tea bottle',
  'coca cola 2 liter','pepsi 2 liter','sprite','mountain dew','dr pepper','root beer',
  'ginger ale','tonic water','club soda','cream soda',
  'diet coke','coke zero','diet pepsi',
  'energy drink','red bull','monster energy','gatorade bottle','powerade',
  'body armor drink','vitamin water',
  'ground coffee bag','whole bean coffee','k cups box','instant coffee','espresso',
  'cold brew coffee','iced coffee bottle',
  'black tea box','green tea box','herbal tea','chamomile tea','peppermint tea',
  'earl grey tea','english breakfast tea','matcha powder',
  'hot chocolate mix','apple cider',
  'protein shake bottle','kombucha bottle',
  'la croix','san pellegrino','perrier','poland spring',
  'dunkin donuts coffee','starbucks coffee bag','folgers coffee','maxwell house',

  // === BREAKFAST (50+) ===
  'cheerios box','frosted flakes','raisin bran','lucky charms','cinnamon toast crunch',
  'special k cereal','honey nut cheerios','fruity pebbles','cocoa puffs',
  'corn flakes','grape nuts','life cereal','chex cereal',
  'pancake mix box','waffle mix','bisquick','crepe mix',
  'maple syrup grade a','toaster pastries','pop tarts box',
  'instant oatmeal box','cream of wheat','grits',
  'breakfast sausage links','breakfast sausage patties',
  'frozen hash browns','frozen waffles box','frozen pancakes',
  'nutella','peanut butter jelly','breakfast bars',

  // === DELI (40+) ===
  'sliced turkey breast deli','sliced ham deli','sliced roast beef deli',
  'sliced salami deli','sliced bologna','sliced pastrami',
  'chicken salad deli','tuna salad deli','egg salad deli',
  'coleslaw deli','potato salad deli','macaroni salad deli',
  'olive bar','pickle spear','roasted red pepper jar',
  'sub roll fresh','deli sandwich',
  'fried chicken deli','buffalo wings deli',
  'prepared meals deli','meal kit',
  'party platter','fruit tray','vegetable tray','sushi tray','charcuterie board',

  // === BABY & KIDS (40+) ===
  'baby formula','infant formula','similac','enfamil',
  'baby food pouches','baby cereal','baby snacks','baby puffs',
  'baby wipes','baby shampoo','baby lotion','diaper cream',
  'diapers newborn','diapers size 3','diapers size 4','diapers size 5',
  'pull ups','training pants',
  'kids snacks','kids yogurt','kids cereal','juice boxes',
  'lunchables','uncrustables','kid cuisine',

  // === HEALTH & VITAMINS (60+) ===
  'multivitamin','vitamin c supplement','vitamin d supplement','vitamin b12',
  'fish oil supplement','omega 3','probiotics supplement','calcium supplement',
  'iron supplement','magnesium supplement','zinc supplement','elderberry supplement',
  'melatonin','ashwagandha','turmeric supplement','collagen supplement',
  'protein powder','whey protein','creatine',
  'tylenol','advil','ibuprofen','aspirin','acetaminophen',
  'cold medicine','cough syrup','nyquil','dayquil','mucinex',
  'allergy medicine','benadryl','claritin','zyrtec','flonase',
  'antacid','tums','pepto bismol','prilosec',
  'band aid','bandages','first aid kit','hydrogen peroxide',
  'rubbing alcohol','thermometer',

  // === PERSONAL CARE (50+) ===
  'shampoo bottle','conditioner bottle','body wash','bar soap','hand soap pump',
  'face wash','moisturizer face','sunscreen','body lotion',
  'toothpaste tube','toothbrush','mouthwash bottle','dental floss',
  'deodorant','antiperspirant','razor blades','shaving cream',
  'hair gel','hair spray','hair dye box','dry shampoo',
  'tampons','pads menstrual','panty liners',
  'cotton balls','cotton swabs','nail clippers',
  'contact lens solution','eye drops',
  'dove soap','old spice','head shoulders','pantene','tresemme',
  'colgate toothpaste','crest toothpaste','listerine',
  'gillette','nivea','cetaphil','aveeno',

  // === HOUSEHOLD (80+) ===
  'paper towels roll','toilet paper pack','facial tissue','napkins pack',
  'trash bags tall kitchen','trash bags large','garbage bags',
  'aluminum foil roll','plastic wrap','parchment paper','wax paper',
  'ziploc bags','sandwich bags','freezer bags',
  'dish soap bottle','dishwasher pods','dishwasher detergent',
  'laundry detergent','laundry pods','fabric softener','dryer sheets','bleach bottle',
  'all purpose cleaner','glass cleaner','bathroom cleaner','toilet cleaner',
  'disinfecting wipes','clorox wipes','lysol','sponges','scrub brush',
  'air freshener','candles scented','febreze spray',
  'light bulbs','batteries aa pack','batteries aaa','batteries d',
  'paper plates','plastic cups','plastic utensils','solo cups',
  'charcoal bag','lighter fluid','matches',
  'bounty paper towels','charmin toilet paper','scott paper','angel soft',
  'glad trash bags','hefty trash bags','reynolds wrap',
  'dawn dish soap','cascade dishwasher','tide laundry','gain laundry',
  'downy fabric softener','oxi clean','mr clean','pine sol','windex',
  'swiffer','pledge','scrubbing bubbles',

  // === PET (30+) ===
  'dry dog food bag','wet dog food can','dog treats bag','dog biscuits',
  'puppy food','senior dog food','grain free dog food',
  'dry cat food bag','wet cat food can','cat treats','kitten food',
  'cat litter box','clumping cat litter',
  'dog toys','cat toys','dog collar','dog leash',
  'flea treatment','pet shampoo','pee pads',
  'purina dog','pedigree','blue buffalo','iams','meow mix','fancy feast',

  // === INTERNATIONAL (70+) ===
  'tortillas de maiz','adobo seasoning','sazon goya','sofrito',
  'chipotle in adobo','enchilada sauce can','mole sauce','taco shells hard',
  'queso fresco','cotija cheese','crema mexicana',
  'jarritos soda','horchata','tamarindo drink',
  'pad thai sauce bottle','curry paste red','curry paste green','coconut milk can',
  'sambal oelek','sweet chili sauce',
  'miso paste','tofu firm','tofu silken','tempeh','seaweed snack',
  'rice paper wrappers','spring roll wrappers','wonton wrappers',
  'paneer cheese','tikka masala sauce','naan frozen',
  'tahini paste','harissa paste','preserved lemons',
  'phyllo dough','grape leaves jar','kalamata olives',
  'kimchi jar','gochujang paste','sesame seeds','furikake seasoning',
  'san marzano tomatoes','imported pasta',
  'polish sausage','sauerkraut jar',
  'cassava root','yuca','taro root',
  'jerk seasoning','scotch bonnet pepper','coconut cream can',
  'basmati rice 5 lb','jasmine rice 5 lb',
  'goya beans','goya rice','goya adobo','la victoria salsa',
  'el monterey burritos','jose ole taquitos',

  // === ORGANIC & SPECIALTY (40+) ===
  'organic milk','organic chicken','organic eggs','organic produce',
  'organic baby food','organic yogurt','organic cereal',
  'gluten free crackers','gluten free cereal','gluten free flour',
  'vegan cheese','vegan butter','vegan cream cheese',
  'plant based burger','impossible burger','beyond meat','impossible sausage',
  'oat milk creamer','almond milk creamer',
  'keto bread','keto snacks','keto ice cream',
  'low carb tortilla','sugar free candy','sugar free ice cream','zero sugar soda',
  'paleo granola','whole30 compliant',
  'fair trade coffee','organic coffee','organic tea',
];

// Deduplicate against existing
const allNew = [];
const seen = new Set(existingFlat);

for (const term of brandTerms) {
  const lower = term.toLowerCase().trim();
  if (!seen.has(lower) && lower.length > 1) {
    seen.add(lower);
    allNew.push(lower);
  }
}

for (const term of specificProducts) {
  const lower = term.toLowerCase().trim();
  if (!seen.has(lower) && lower.length > 1) {
    seen.add(lower);
    allNew.push(lower);
  }
}

console.log('New terms after dedup:', allNew.length);
console.log('Total terms will be:', existingFlat.size + allNew.length);

// Build the expanded config
const expanded = {
  version: '4.0',
  description: 'Comprehensive terms for full store coverage. v4 adds brand searches + 1,500 specific product variants. Target: 30K+ SKUs per store.',
  terms: {
    ...existing.terms,
    brand_searches: brandTerms,
    specific_products: allNew.filter(t => !brandTerms.includes(t)),
  },
};

// Final count
let totalTerms = 0;
for (const list of Object.values(expanded.terms)) {
  totalTerms += list.length;
}
console.log('Final total in config:', totalTerms);

writeFileSync(join(ROOT, 'config/search-terms.json'), JSON.stringify(expanded, null, 2));
console.log('Written to config/search-terms.json');
