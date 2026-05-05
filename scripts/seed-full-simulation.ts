// @ts-nocheck
/**
 * FULL BUSINESS SIMULATION SEED
 *
 * Populates ChefFlow with a realistic private chef business:
 * - 10 clients with varied profiles, dietary needs, referral sources
 * - 15 events across ALL lifecycle stages
 * - 20 recipes with ingredients (real private chef dishes)
 * - Menus linked to events with courses
 * - Inquiries from multiple channels
 * - Communications exercising the email pipeline
 * - Quotes and ledger entries
 * - Availability blocks and calendar data
 *
 * Uses demo-chef account. Idempotent (safe to re-run).
 */

import { createRequire } from 'module'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const require = createRequire(import.meta.url)
const adminDbModule = require('../lib/db/admin')
const { createAdminClient } = adminDbModule.default ?? adminDbModule

// ─── Chef identity (demo chef, uses real email for comms) ───────────────────

const CHEF_ID = '90cf03a0-389b-414f-813b-d74c98188e5e'
const TENANT_ID = CHEF_ID
const CHEF_EMAIL = 'davidferra13@gmail.com' // real email for communication testing

// ─── Helpers ────────────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID()
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysAgo(days: number): string {
  return daysFromNow(-days)
}

function nowIso(): string {
  return new Date().toISOString()
}

function randomCents(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min)
}

// ─── CLIENT DATA ────────────────────────────────────────────────────────────

const CLIENTS = [
  {
    full_name: 'Sarah Mitchell',
    email: 'sarah.mitchell@northandpine.co',
    phone: '978-555-0101',
    status: 'vip',
    referral_source: 'referral',
    referral_source_detail: 'Anthony Marcone',
    dietary_restrictions: ['pescatarian'],
    allergies: ['shellfish'],
    address: '42 Louisburg Square, Boston, MA 02108',
    vibe_notes:
      'Hosts monthly dinner parties for 8-12. Prefers seasonal, farm-to-table. Wine collector. Beacon Hill brownstone with a proper kitchen.',
  },
  {
    full_name: 'James & Rachel Hoffman',
    email: 'rachel.hoffman@gmail.com',
    phone: '603-555-0202',
    status: 'repeat_ready',
    referral_source: 'instagram',
    dietary_restrictions: ['gluten free'],
    allergies: ['tree nuts', 'sesame'],
    address: '88 Lake Shore Dr, Meredith, NH 03253',
    vibe_notes:
      'Young couple, lakeside home in NH. Love tasting menus. Celebrate every anniversary with private dinner. Budget: $150-200pp.',
  },
  {
    full_name: 'Patricia Wozniak',
    email: 'pwozniak@comcast.net',
    phone: '978-555-0303',
    status: 'active',
    referral_source: 'take_a_chef',
    dietary_restrictions: [],
    allergies: [],
    address: '33 Kenoza Ave, Haverhill, MA 01830',
    vibe_notes:
      'Retired executive. Hosts book club dinners quarterly. 6 guests. Wants classic French with a modern twist. Haverhill area.',
  },
  {
    full_name: 'Marcus Johnson',
    email: 'marcus.j.chef@outlook.com',
    phone: '617-555-0404',
    status: 'active',
    referral_source: 'website',
    dietary_restrictions: ['dairy free'],
    allergies: ['dairy'],
    address: '1 Union Park, Boston, MA 02118',
    vibe_notes:
      'Corporate VP. Entertains clients at home. Needs impressive but approachable. South End condo, open kitchen. Usually 4-6 guests.',
  },
  {
    full_name: 'Elena & Tom Russo',
    email: 'elena.russo@yahoo.com',
    phone: '978-555-0505',
    status: 'active',
    referral_source: 'referral',
    referral_source_detail: 'Sarah Mitchell',
    dietary_restrictions: ['vegetarian option needed'],
    allergies: [],
    address: '145 Baldpate Rd, Georgetown, MA 01833',
    vibe_notes:
      'Farm owners in Georgetown. Want farm-to-table using THEIR produce. Co-hosting events with 20-40 guests. Big outdoor space.',
  },
  {
    full_name: 'Dr. Angela Kim',
    email: 'angela.kim.md@gmail.com',
    phone: '617-555-0606',
    status: 'dormant',
    referral_source: 'other',
    referral_source_detail: 'Thumbtack',
    dietary_restrictions: ['low sodium'],
    allergies: [],
    address: '55 Brattle St, Cambridge, MA 02138',
    vibe_notes:
      'Cardiologist. Health-conscious entertaining. Hired once for a graduation party (12 guests). Has not rebooked. Follow up.',
  },
  {
    full_name: 'The Brennan Family',
    email: 'mike.brennan@gmail.com',
    phone: '978-555-0707',
    status: 'repeat_ready',
    referral_source: 'referral',
    referral_source_detail: 'Patricia Wozniak',
    dietary_restrictions: ['nut free household'],
    allergies: ['peanuts', 'tree nuts'],
    address: '8 Federal St, Newburyport, MA 01950',
    vibe_notes:
      'Family of 5 with young kids. Weekly meal prep service. Budget-conscious but quality matters. Newburyport.',
  },
  {
    full_name: 'David & Lisa Chen',
    email: 'dlchen.events@gmail.com',
    phone: '603-555-0808',
    status: 'active',
    referral_source: 'other',
    referral_source_detail: 'Google Business',
    dietary_restrictions: [],
    allergies: ['shellfish'],
    address: '22 Market St, Portsmouth, NH 03801',
    vibe_notes:
      'Tech couple. Love Asian-fusion and molecular gastronomy. Host "nerd dinners" for 8-10 with themes. Portsmouth NH.',
  },
  {
    full_name: 'Catherine Moreau',
    email: 'cat.moreau@proton.me',
    phone: '978-555-0909',
    status: 'active',
    referral_source: 'instagram',
    dietary_restrictions: ['keto'],
    allergies: [],
    address: '15 High St, Amesbury, MA 01913',
    vibe_notes:
      'French-Canadian expat. Wants authentic French cuisine for intimate gatherings (4-6). Very particular about technique. Amesbury.',
  },
  {
    full_name: 'Robert Garrison',
    email: 'rgarrison@lawfirm.com',
    phone: '617-555-1010',
    status: 'active',
    referral_source: 'other',
    referral_source_detail: 'Cozymeal',
    dietary_restrictions: [],
    allergies: [],
    address: '200 Commonwealth Ave, Boston, MA 02116',
    vibe_notes:
      'Partner at law firm. Hosts holiday parties (20-30 guests) and summer BBQs. Big spender, wants wow factor. Back Bay.',
  },
]

// ─── RECIPE DATA ────────────────────────────────────────────────────────────

const RECIPES = [
  {
    name: 'Pan-Seared Duck Breast with Cherry Gastrique',
    category: 'protein',
    cuisine: 'french',
    meal_type: 'dinner',
    description:
      'Crispy skin duck breast, scored and rendered slowly. Finished with a tart cherry gastrique and fresh thyme.',
    servings: 4,
    prep_time_minutes: 20,
    cook_time_minutes: 25,
    method:
      '1. Score duck skin in crosshatch. Season generously.\n2. Place skin-down in cold pan, render on medium 12-15 min.\n3. Flip, sear flesh side 3 min. Rest 8 min.\n4. Deglaze pan with sherry vinegar, add cherries, reduce to glaze.\n5. Slice against grain, spoon gastrique over.',
    ingredients: [
      { name: 'Duck breast', quantity: '4', unit: 'pieces', category: 'protein' },
      { name: 'Dried tart cherries', quantity: '1/2', unit: 'cup', category: 'pantry' },
      { name: 'Sherry vinegar', quantity: '3', unit: 'tbsp', category: 'pantry' },
      { name: 'Sugar', quantity: '2', unit: 'tbsp', category: 'pantry' },
      { name: 'Fresh thyme', quantity: '4', unit: 'sprigs', category: 'fresh_herb' },
    ],
  },
  {
    name: 'Lobster Risotto with Saffron',
    category: 'starch',
    cuisine: 'italian',
    meal_type: 'dinner',
    description:
      'Creamy arborio rice with fresh lobster meat, saffron-infused stock, and finished with mascarpone.',
    servings: 6,
    prep_time_minutes: 30,
    cook_time_minutes: 35,
    method:
      '1. Make lobster stock from shells (1 hour ahead).\n2. Toast arborio in butter, add shallots.\n3. Deglaze with white wine. Ladle hot saffron stock gradually.\n4. Stir 18-20 min until al dente and creamy.\n5. Fold in lobster meat, mascarpone, chives. Serve immediately.',
    ingredients: [
      { name: 'Arborio rice', quantity: '2', unit: 'cups', category: 'pantry' },
      { name: 'Lobster tails', quantity: '4', unit: 'pieces', category: 'protein' },
      { name: 'Saffron threads', quantity: '1', unit: 'pinch', category: 'spice' },
      { name: 'Mascarpone', quantity: '4', unit: 'tbsp', category: 'dairy' },
      { name: 'Dry white wine', quantity: '1', unit: 'cup', category: 'alcohol' },
      { name: 'Shallots', quantity: '3', unit: 'pieces', category: 'produce' },
    ],
  },
  {
    name: 'Beef Tenderloin with Bordelaise Sauce',
    category: 'protein',
    cuisine: 'french',
    meal_type: 'dinner',
    description:
      'Center-cut filet mignon, reverse-seared to perfect medium-rare. Served with a bone marrow bordelaise.',
    servings: 4,
    prep_time_minutes: 15,
    cook_time_minutes: 45,
    method:
      '1. Temper steaks 1 hour. Season salt + pepper only.\n2. Low oven (250F) until internal 115F (~30 min).\n3. Sear in screaming hot cast iron with butter, 90 sec per side.\n4. Rest 5 min. Sauce: reduce red wine with shallot, demi-glace, bone marrow.\n5. Spoon bordelaise, fresh parsley.',
    ingredients: [
      { name: 'Beef tenderloin', quantity: '4', unit: 'pieces', category: 'protein' },
      { name: 'Bone marrow', quantity: '2', unit: 'pieces', category: 'protein' },
      { name: 'Red wine (Bordeaux)', quantity: '2', unit: 'cups', category: 'alcohol' },
      { name: 'Demi-glace', quantity: '1', unit: 'cup', category: 'pantry' },
      { name: 'Shallots', quantity: '2', unit: 'pieces', category: 'produce' },
    ],
  },
  {
    name: 'Burrata with Heirloom Tomatoes and Basil Oil',
    category: 'appetizer',
    cuisine: 'italian',
    meal_type: 'dinner',
    description:
      'Fresh burrata split open over peak-season heirloom tomatoes. Drizzled with house-made basil oil and flaky salt.',
    servings: 4,
    prep_time_minutes: 15,
    cook_time_minutes: 0,
    method:
      '1. Blanch basil 10 sec, ice bath. Blend with good olive oil. Strain.\n2. Slice tomatoes, season with flaky salt 5 min ahead.\n3. Arrange tomatoes, tear burrata over center.\n4. Drizzle basil oil generously. Cracked pepper, more flaky salt.',
    ingredients: [
      { name: 'Burrata', quantity: '2', unit: 'balls', category: 'dairy' },
      { name: 'Heirloom tomatoes', quantity: '4', unit: 'large', category: 'produce' },
      { name: 'Fresh basil', quantity: '2', unit: 'cups', category: 'fresh_herb' },
      { name: 'Extra virgin olive oil', quantity: '1/2', unit: 'cup', category: 'oil' },
      { name: 'Flaky sea salt', quantity: '1', unit: 'tbsp', category: 'spice' },
    ],
  },
  {
    name: 'Miso-Glazed Black Cod',
    category: 'protein',
    cuisine: 'japanese',
    meal_type: 'dinner',
    description:
      'Nobu-inspired black cod marinated 48 hours in white miso. Caramelized under broiler.',
    servings: 4,
    prep_time_minutes: 10,
    cook_time_minutes: 12,
    method:
      '1. Mix white miso, mirin, sake, sugar. Marinate cod 24-48 hours.\n2. Wipe excess marinade. Broil skin-side down 8 min.\n3. Flip, broil 3-4 min until caramelized and flaky.\n4. Garnish with pickled ginger and microgreens.',
    ingredients: [
      { name: 'Black cod fillets', quantity: '4', unit: 'pieces', category: 'protein' },
      { name: 'White miso paste', quantity: '1/2', unit: 'cup', category: 'pantry' },
      { name: 'Mirin', quantity: '3', unit: 'tbsp', category: 'pantry' },
      { name: 'Sake', quantity: '2', unit: 'tbsp', category: 'alcohol' },
      { name: 'Sugar', quantity: '3', unit: 'tbsp', category: 'pantry' },
    ],
  },
  {
    name: 'Truffle Potato Puree',
    category: 'starch',
    cuisine: 'french',
    meal_type: 'dinner',
    description:
      'Silky pommes puree with black truffle oil and Gruyere. Robuchon-style butter ratio.',
    servings: 6,
    prep_time_minutes: 10,
    cook_time_minutes: 30,
    method:
      '1. Boil Yukon Golds whole, skin on, until fork tender.\n2. Rice while hot. Incorporate cold butter cubes gradually (1:3 butter to potato).\n3. Add warm cream, fold in Gruyere. Season.\n4. Finish with truffle oil at service. Never food-process.',
    ingredients: [
      { name: 'Yukon Gold potatoes', quantity: '3', unit: 'lbs', category: 'produce' },
      { name: 'Unsalted butter', quantity: '1', unit: 'lb', category: 'dairy' },
      { name: 'Heavy cream', quantity: '1', unit: 'cup', category: 'dairy' },
      { name: 'Gruyere cheese', quantity: '4', unit: 'oz', category: 'dairy' },
      { name: 'Black truffle oil', quantity: '2', unit: 'tbsp', category: 'oil' },
    ],
  },
  {
    name: 'Grilled Lamb Chops with Chimichurri',
    category: 'protein',
    cuisine: 'mediterranean',
    meal_type: 'dinner',
    description:
      'Frenched lamb rack chops, grilled over high heat. Bright chimichurri from fresh herbs.',
    servings: 4,
    prep_time_minutes: 20,
    cook_time_minutes: 8,
    method:
      '1. Chimichurri: pulse parsley, oregano, garlic, red wine vinegar, olive oil, red pepper flakes.\n2. Season lamb with salt, pepper, garlic powder. Room temp 30 min.\n3. Grill 3-4 min per side for medium-rare (130F internal).\n4. Rest 5 min. Spoon chimichurri over generously.',
    ingredients: [
      { name: 'Lamb rack (frenched)', quantity: '2', unit: 'racks', category: 'protein' },
      { name: 'Fresh parsley', quantity: '1', unit: 'bunch', category: 'fresh_herb' },
      { name: 'Fresh oregano', quantity: '1/4', unit: 'cup', category: 'fresh_herb' },
      { name: 'Red wine vinegar', quantity: '3', unit: 'tbsp', category: 'pantry' },
      { name: 'Garlic', quantity: '6', unit: 'cloves', category: 'produce' },
    ],
  },
  {
    name: 'New England Clam Chowder',
    category: 'soup',
    cuisine: 'american',
    meal_type: 'dinner',
    description:
      'Traditional cream-based chowder with fresh littleneck clams, salt pork, and Yukon Gold potatoes.',
    servings: 8,
    prep_time_minutes: 25,
    cook_time_minutes: 40,
    method:
      '1. Steam clams in white wine until open. Reserve broth and meat.\n2. Render salt pork cubes until crisp. Add onion, celery, sweat 5 min.\n3. Add potatoes, clam broth, bay leaf. Simmer until potatoes tender.\n4. Add cream, chopped clams. Heat gently (never boil).\n5. Season, rest 1 hour for flavors to meld. Reheat gently to serve.',
    ingredients: [
      { name: 'Littleneck clams', quantity: '4', unit: 'lbs', category: 'protein' },
      { name: 'Salt pork', quantity: '4', unit: 'oz', category: 'protein' },
      { name: 'Yukon Gold potatoes', quantity: '1.5', unit: 'lbs', category: 'produce' },
      { name: 'Heavy cream', quantity: '2', unit: 'cups', category: 'dairy' },
      { name: 'Yellow onion', quantity: '1', unit: 'large', category: 'produce' },
      { name: 'Celery', quantity: '3', unit: 'stalks', category: 'produce' },
    ],
  },
  {
    name: 'Chocolate Lava Cake',
    category: 'dessert',
    cuisine: 'french',
    meal_type: 'dinner',
    description:
      'Individual molten chocolate cakes with liquid center. Served with creme fraiche and sea salt.',
    servings: 6,
    prep_time_minutes: 20,
    cook_time_minutes: 12,
    method:
      '1. Melt 70% chocolate + butter over double boiler.\n2. Whisk eggs + sugar to ribbon stage.\n3. Fold chocolate into eggs, add flour gently.\n4. Butter and cocoa-dust ramekins. Fill 3/4.\n5. Bake 425F exactly 12 min (set timer). Center should jiggle.\n6. Invert immediately. Serve with creme fraiche.',
    ingredients: [
      { name: 'Dark chocolate (70%)', quantity: '8', unit: 'oz', category: 'baking' },
      { name: 'Unsalted butter', quantity: '6', unit: 'tbsp', category: 'dairy' },
      { name: 'Eggs', quantity: '4', unit: 'large', category: 'dairy' },
      { name: 'Sugar', quantity: '1/3', unit: 'cup', category: 'baking' },
      { name: 'All-purpose flour', quantity: '2', unit: 'tbsp', category: 'baking' },
      { name: 'Creme fraiche', quantity: '1/2', unit: 'cup', category: 'dairy' },
    ],
  },
  {
    name: 'Seared Scallops with Brown Butter and Capers',
    category: 'protein',
    cuisine: 'french',
    meal_type: 'dinner',
    description:
      'Dry-brined U10 scallops, seared to golden crust. Brown butter, capers, lemon, parsley.',
    servings: 4,
    prep_time_minutes: 15,
    cook_time_minutes: 6,
    method:
      '1. Pat scallops bone-dry. Season only salt. Rest on paper towel 10 min.\n2. Screaming hot pan with clarified butter. Sear 2 min undisturbed.\n3. Flip, sear 1 min. Remove.\n4. Same pan: whole butter to brown, add capers, lemon juice, parsley.\n5. Spoon brown butter over scallops immediately.',
    ingredients: [
      { name: 'Dry sea scallops (U10)', quantity: '12', unit: 'pieces', category: 'protein' },
      { name: 'Unsalted butter', quantity: '4', unit: 'tbsp', category: 'dairy' },
      { name: 'Capers', quantity: '2', unit: 'tbsp', category: 'condiment' },
      { name: 'Lemon', quantity: '1', unit: 'piece', category: 'produce' },
      { name: 'Fresh parsley', quantity: '2', unit: 'tbsp', category: 'fresh_herb' },
    ],
  },
  {
    name: 'Wild Mushroom Soup with Truffle Cream',
    category: 'soup',
    cuisine: 'french',
    meal_type: 'dinner',
    description: 'Velvety soup from mixed wild mushrooms. Finished with truffle cream swirl.',
    servings: 6,
    prep_time_minutes: 15,
    cook_time_minutes: 30,
    method:
      '1. Saute mixed mushrooms in butter until deeply golden (no crowding).\n2. Add shallots, thyme, garlic. Deglaze with sherry.\n3. Add stock, simmer 20 min.\n4. Blend until silky. Strain if desired.\n5. Swirl truffle cream at service.',
    ingredients: [
      { name: 'Mixed wild mushrooms', quantity: '1.5', unit: 'lbs', category: 'produce' },
      { name: 'Shallots', quantity: '3', unit: 'pieces', category: 'produce' },
      { name: 'Chicken stock', quantity: '4', unit: 'cups', category: 'pantry' },
      { name: 'Dry sherry', quantity: '1/4', unit: 'cup', category: 'alcohol' },
      { name: 'Heavy cream', quantity: '1/2', unit: 'cup', category: 'dairy' },
      { name: 'Black truffle oil', quantity: '1', unit: 'tbsp', category: 'oil' },
    ],
  },
  {
    name: 'Pappardelle with Short Rib Ragu',
    category: 'pasta',
    cuisine: 'italian',
    meal_type: 'dinner',
    description:
      'Fresh hand-cut pappardelle with 6-hour braised short rib ragu. Parmigiano, fresh herbs.',
    servings: 6,
    prep_time_minutes: 30,
    cook_time_minutes: 360,
    method:
      '1. Sear short ribs hard on all sides. Remove.\n2. Build soffritto: onion, carrot, celery. Add tomato paste, cook out.\n3. Deglaze with red wine. Add San Marzano tomatoes, stock, herbs.\n4. Return ribs, braise 300F 5-6 hours until falling apart.\n5. Shred meat into sauce. Toss with fresh pappardelle. Parmigiano.',
    ingredients: [
      { name: 'Bone-in short ribs', quantity: '4', unit: 'lbs', category: 'protein' },
      { name: 'San Marzano tomatoes', quantity: '28', unit: 'oz', category: 'canned' },
      { name: 'Fresh pappardelle', quantity: '1.5', unit: 'lbs', category: 'pantry' },
      { name: 'Parmigiano-Reggiano', quantity: '4', unit: 'oz', category: 'dairy' },
      { name: 'Red wine', quantity: '2', unit: 'cups', category: 'alcohol' },
    ],
  },
  {
    name: 'Citrus-Cured Salmon Crudo',
    category: 'appetizer',
    cuisine: 'japanese',
    meal_type: 'dinner',
    description: 'Thinly sliced fresh salmon with yuzu, radish, microgreens, and sesame.',
    servings: 4,
    prep_time_minutes: 20,
    cook_time_minutes: 0,
    method:
      '1. Slice sushi-grade salmon paper-thin against grain.\n2. Arrange on chilled plate. Season with flaky salt immediately.\n3. Dress with yuzu juice, good olive oil.\n4. Top with shaved radish, microgreens, toasted sesame.\n5. Serve within 2 minutes of plating.',
    ingredients: [
      { name: 'Sushi-grade salmon', quantity: '1', unit: 'lb', category: 'protein' },
      { name: 'Yuzu juice', quantity: '2', unit: 'tbsp', category: 'pantry' },
      { name: 'Watermelon radish', quantity: '1', unit: 'piece', category: 'produce' },
      { name: 'Microgreens', quantity: '1', unit: 'cup', category: 'produce' },
      { name: 'Toasted sesame seeds', quantity: '1', unit: 'tbsp', category: 'spice' },
    ],
  },
  {
    name: 'Roasted Beet Salad with Goat Cheese Mousse',
    category: 'salad',
    cuisine: 'american',
    meal_type: 'dinner',
    description:
      'Roasted candy-stripe and golden beets with whipped goat cheese, candied walnuts, and sherry vinaigrette.',
    servings: 4,
    prep_time_minutes: 15,
    cook_time_minutes: 60,
    method:
      '1. Roast beets wrapped in foil 400F until tender (45-60 min). Cool, peel, cut.\n2. Whip goat cheese with cream until mousse-like.\n3. Candied walnuts: toss with sugar, bake until caramelized.\n4. Vinaigrette: sherry vinegar, dijon, honey, olive oil.\n5. Compose: mousse base, beets over, walnuts, dress, microgreens.',
    ingredients: [
      { name: 'Mixed beets', quantity: '6', unit: 'medium', category: 'produce' },
      { name: 'Goat cheese', quantity: '6', unit: 'oz', category: 'dairy' },
      { name: 'Walnuts', quantity: '1/2', unit: 'cup', category: 'pantry' },
      { name: 'Sherry vinegar', quantity: '2', unit: 'tbsp', category: 'pantry' },
      { name: 'Heavy cream', quantity: '2', unit: 'tbsp', category: 'dairy' },
    ],
  },
  {
    name: 'Braised Lamb Shank with Gremolata',
    category: 'protein',
    cuisine: 'italian',
    meal_type: 'dinner',
    description:
      'Low and slow braised lamb shanks in red wine and aromatics. Bright gremolata to finish.',
    servings: 4,
    prep_time_minutes: 20,
    cook_time_minutes: 180,
    method:
      '1. Season and sear shanks until deeply brown all over.\n2. Build braise: onion, carrot, celery, garlic, tomato paste.\n3. Deglaze red wine, add stock, herbs. Return shanks.\n4. Braise 325F covered, 3 hours. Meat should pull from bone.\n5. Reduce braising liquid. Gremolata: lemon zest, parsley, garlic.',
    ingredients: [
      { name: 'Lamb shanks', quantity: '4', unit: 'pieces', category: 'protein' },
      { name: 'Red wine', quantity: '2', unit: 'cups', category: 'alcohol' },
      { name: 'Fresh parsley', quantity: '1', unit: 'cup', category: 'fresh_herb' },
      { name: 'Lemon', quantity: '2', unit: 'pieces', category: 'produce' },
      { name: 'Garlic', quantity: '8', unit: 'cloves', category: 'produce' },
    ],
  },
  {
    name: 'Creme Brulee',
    category: 'dessert',
    cuisine: 'french',
    meal_type: 'dinner',
    description: 'Classic vanilla bean custard with shatteringly crisp caramelized sugar top.',
    servings: 6,
    prep_time_minutes: 15,
    cook_time_minutes: 45,
    method:
      '1. Scrape vanilla bean into cream. Scald (not boil).\n2. Whisk yolks + sugar until pale. Temper in hot cream.\n3. Strain into ramekins. Water bath.\n4. Bake 325F 40-45 min until set with slight jiggle center.\n5. Chill 4 hours minimum. Sugar + torch at service.',
    ingredients: [
      { name: 'Heavy cream', quantity: '3', unit: 'cups', category: 'dairy' },
      { name: 'Egg yolks', quantity: '6', unit: 'large', category: 'dairy' },
      { name: 'Vanilla bean', quantity: '1', unit: 'piece', category: 'spice' },
      { name: 'Sugar', quantity: '1/2', unit: 'cup', category: 'baking' },
    ],
  },
  {
    name: 'Grilled Caesar Salad',
    category: 'salad',
    cuisine: 'american',
    meal_type: 'dinner',
    description:
      'Charred romaine hearts with house-made anchovy dressing, shaved parm, and sourdough croutons.',
    servings: 4,
    prep_time_minutes: 15,
    cook_time_minutes: 5,
    method:
      '1. Dressing: blend anchovies, garlic, dijon, egg yolk, lemon, olive oil.\n2. Halve romaine hearts. Brush with oil.\n3. Grill cut-side down 2 min until charred but still crisp inside.\n4. Plate. Drizzle dressing. Shave parm. Sourdough croutons.\n5. Finish with cracked pepper and anchovy fillet.',
    ingredients: [
      { name: 'Romaine hearts', quantity: '4', unit: 'pieces', category: 'produce' },
      { name: 'Anchovy fillets', quantity: '6', unit: 'pieces', category: 'canned' },
      { name: 'Parmigiano-Reggiano', quantity: '3', unit: 'oz', category: 'dairy' },
      { name: 'Sourdough bread', quantity: '4', unit: 'slices', category: 'pantry' },
      { name: 'Egg yolk', quantity: '1', unit: 'large', category: 'dairy' },
    ],
  },
  {
    name: 'Herb-Crusted Rack of Lamb',
    category: 'protein',
    cuisine: 'french',
    meal_type: 'dinner',
    description: 'Frenched rack with dijon-herb crust. Roasted to perfect pink.',
    servings: 4,
    prep_time_minutes: 20,
    cook_time_minutes: 25,
    method:
      '1. Sear rack fat-side down until golden.\n2. Crust: blend breadcrumbs, parsley, rosemary, thyme, garlic, olive oil.\n3. Brush rack with dijon. Press herb crust onto fat side.\n4. Roast 400F until 130F internal (18-22 min).\n5. Rest 10 min. Slice between bones.',
    ingredients: [
      { name: 'Rack of lamb (frenched)', quantity: '2', unit: 'racks', category: 'protein' },
      { name: 'Dijon mustard', quantity: '3', unit: 'tbsp', category: 'condiment' },
      { name: 'Fresh rosemary', quantity: '2', unit: 'tbsp', category: 'fresh_herb' },
      { name: 'Panko breadcrumbs', quantity: '1', unit: 'cup', category: 'pantry' },
      { name: 'Garlic', quantity: '4', unit: 'cloves', category: 'produce' },
    ],
  },
  {
    name: 'Coconut Panna Cotta with Mango',
    category: 'dessert',
    cuisine: 'fusion',
    meal_type: 'dinner',
    description: 'Light coconut milk panna cotta with fresh mango coulis and toasted coconut.',
    servings: 6,
    prep_time_minutes: 15,
    cook_time_minutes: 5,
    method:
      '1. Bloom gelatin in cold water.\n2. Heat coconut milk + cream + sugar until dissolved (do not boil).\n3. Add bloomed gelatin, stir until melted.\n4. Pour into molds. Chill 4+ hours.\n5. Mango coulis: blend ripe mango + lime. Unmold, spoon coulis, toasted coconut.',
    ingredients: [
      { name: 'Coconut milk', quantity: '2', unit: 'cans', category: 'pantry' },
      { name: 'Heavy cream', quantity: '1', unit: 'cup', category: 'dairy' },
      { name: 'Gelatin sheets', quantity: '4', unit: 'sheets', category: 'baking' },
      { name: 'Ripe mango', quantity: '2', unit: 'pieces', category: 'produce' },
      { name: 'Toasted coconut flakes', quantity: '1/4', unit: 'cup', category: 'pantry' },
    ],
  },
  {
    name: 'Wagyu Beef Tataki',
    category: 'appetizer',
    cuisine: 'japanese',
    meal_type: 'dinner',
    description: 'Seared A5 wagyu sliced thin with ponzu, grated daikon, and scallion.',
    servings: 4,
    prep_time_minutes: 10,
    cook_time_minutes: 3,
    method:
      '1. Season wagyu strip with salt only.\n2. Sear 30 seconds per side in smoking hot pan. Ice bath immediately.\n3. Slice paper-thin against grain once chilled.\n4. Fan on chilled plate. Drizzle ponzu.\n5. Top with grated daikon, sliced scallion, shichimi togarashi.',
    ingredients: [
      { name: 'Wagyu beef strip', quantity: '12', unit: 'oz', category: 'protein' },
      { name: 'Ponzu sauce', quantity: '3', unit: 'tbsp', category: 'condiment' },
      { name: 'Daikon radish', quantity: '4', unit: 'inches', category: 'produce' },
      { name: 'Scallions', quantity: '3', unit: 'pieces', category: 'produce' },
      { name: 'Shichimi togarashi', quantity: '1', unit: 'tsp', category: 'spice' },
    ],
  },
]

// ─── EVENT DATA ─────────────────────────────────────────────────────────────

function buildEvents(clientIds: Record<string, string>) {
  return [
    // COMPLETED events (past)
    {
      client_key: 'Sarah Mitchell',
      event_date: daysAgo(45),
      serve_time: '19:00:00',
      guest_count: 10,
      occasion: 'Monthly Dinner Club - March',
      location_address: '42 Louisburg Square',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02108',
      status: 'completed',
      service_style: 'plated',
      pricing_model: 'per_person',
      quoted_price_cents: 17500,
      dietary_restrictions: ['pescatarian option'],
      allergies: ['shellfish'],
      special_requests: 'Wine pairing suggestions for each course. Seafood-forward spring menu.',
    },
    {
      client_key: 'James & Rachel Hoffman',
      event_date: daysAgo(30),
      serve_time: '19:30:00',
      guest_count: 2,
      occasion: '5th Wedding Anniversary',
      location_address: '88 Lake Shore Dr',
      location_city: 'Meredith',
      location_state: 'NH',
      location_zip: '03253',
      status: 'completed',
      service_style: 'tasting_menu',
      pricing_model: 'flat_rate',
      quoted_price_cents: 45000,
      dietary_restrictions: ['gluten free'],
      allergies: ['tree nuts', 'sesame'],
      special_requests: '7-course tasting. Romantic setting. They want to be surprised.',
    },
    {
      client_key: 'Robert Garrison',
      event_date: daysAgo(60),
      serve_time: '18:00:00',
      guest_count: 24,
      occasion: 'Holiday Party 2025',
      location_address: '200 Commonwealth Ave',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02116',
      status: 'completed',
      service_style: 'cocktail',
      pricing_model: 'per_person',
      quoted_price_cents: 12500,
      dietary_restrictions: [],
      allergies: [],
      special_requests: 'Passed apps + 2 stations. Premium only. Budget is not a concern.',
    },
    // CONFIRMED events (upcoming, locked in)
    {
      client_key: 'Sarah Mitchell',
      event_date: daysFromNow(12),
      serve_time: '19:00:00',
      guest_count: 8,
      occasion: 'Monthly Dinner Club - May',
      location_address: '42 Louisburg Square',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02108',
      status: 'confirmed',
      service_style: 'plated',
      pricing_model: 'per_person',
      quoted_price_cents: 17500,
      dietary_restrictions: ['pescatarian option'],
      allergies: ['shellfish'],
      special_requests: 'Spring menu. Asparagus, peas, ramps if available. Keep it light.',
    },
    {
      client_key: 'Elena & Tom Russo',
      event_date: daysFromNow(18),
      serve_time: '17:30:00',
      guest_count: 32,
      occasion: 'Farm Dinner - Spring Opening',
      location_address: '145 Baldpate Rd',
      location_city: 'Georgetown',
      location_state: 'MA',
      location_zip: '01833',
      status: 'confirmed',
      service_style: 'family_style',
      pricing_model: 'per_person',
      quoted_price_cents: 9500,
      dietary_restrictions: ['vegetarian option needed'],
      allergies: [],
      special_requests:
        'Using their farm produce. Need to coordinate what is available. Outdoor long table setup.',
    },
    // PAID (deposit received, menu being finalized)
    {
      client_key: 'David & Lisa Chen',
      event_date: daysFromNow(28),
      serve_time: '19:00:00',
      guest_count: 10,
      occasion: 'Nerd Dinner: Fermentation Edition',
      location_address: '22 Market St',
      location_city: 'Portsmouth',
      location_state: 'NH',
      location_zip: '03801',
      status: 'paid',
      service_style: 'tasting_menu',
      pricing_model: 'per_person',
      quoted_price_cents: 15000,
      dietary_restrictions: [],
      allergies: ['shellfish'],
      special_requests:
        'Theme: fermentation. Miso, koji, kimchi, kombucha, sourdough. Educational component between courses.',
    },
    {
      client_key: 'Catherine Moreau',
      event_date: daysFromNow(21),
      serve_time: '20:00:00',
      guest_count: 6,
      occasion: 'Birthday Celebration',
      location_address: '15 High St',
      location_city: 'Amesbury',
      location_state: 'MA',
      location_zip: '01913',
      status: 'paid',
      service_style: 'plated',
      pricing_model: 'per_person',
      quoted_price_cents: 20000,
      dietary_restrictions: ['keto'],
      allergies: [],
      special_requests:
        'Classic French only. Duck, lamb, proper sauces. No shortcuts. Keto-adapted where possible.',
    },
    // PROPOSED (quote sent, awaiting response)
    {
      client_key: 'Marcus Johnson',
      event_date: daysFromNow(35),
      serve_time: '19:30:00',
      guest_count: 6,
      occasion: 'Client Entertainment Dinner',
      location_address: '1 Union Park',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02118',
      status: 'proposed',
      service_style: 'plated',
      pricing_model: 'per_person',
      quoted_price_cents: 22500,
      dietary_restrictions: ['dairy free'],
      allergies: ['dairy'],
      special_requests:
        'Needs to impress Japanese clients. Thinking omakase-inspired but with New England ingredients.',
    },
    {
      client_key: 'The Brennan Family',
      event_date: daysFromNow(7),
      serve_time: '17:00:00',
      guest_count: 5,
      occasion: 'Weekly Meal Prep - May W2',
      location_address: '8 Federal St',
      location_city: 'Newburyport',
      location_state: 'MA',
      location_zip: '01950',
      status: 'proposed',
      service_style: 'other',
      pricing_model: 'flat_rate',
      quoted_price_cents: 35000,
      dietary_restrictions: ['nut free household'],
      allergies: ['peanuts', 'tree nuts'],
      special_requests:
        '5 dinners + 5 lunches for the week. Kid-friendly but not boring. Pack in individual containers.',
    },
    // DRAFT (in progress, not sent to client yet)
    {
      client_key: 'Patricia Wozniak',
      event_date: daysFromNow(42),
      serve_time: '18:30:00',
      guest_count: 6,
      occasion: 'Book Club Dinner - Summer Kickoff',
      location_address: '33 Kenoza Ave',
      location_city: 'Haverhill',
      location_state: 'MA',
      location_zip: '01830',
      status: 'draft',
      service_style: 'plated',
      pricing_model: 'per_person',
      quoted_price_cents: 14000,
      dietary_restrictions: [],
      allergies: [],
      special_requests:
        'They are reading a Provencal cookbook this quarter. Menu inspired by southern France.',
    },
    {
      client_key: 'Robert Garrison',
      event_date: daysFromNow(55),
      serve_time: '16:00:00',
      guest_count: 30,
      occasion: 'Summer BBQ Bash',
      location_address: '200 Commonwealth Ave',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02116',
      status: 'draft',
      service_style: 'buffet',
      pricing_model: 'per_person',
      quoted_price_cents: 11000,
      dietary_restrictions: [],
      allergies: [],
      special_requests: 'Rooftop BBQ. Whole hog, smoked brisket, lobster boil station. Go big.',
    },
    // CANCELLED (for realistic lifecycle)
    {
      client_key: 'Dr. Angela Kim',
      event_date: daysAgo(15),
      serve_time: '18:00:00',
      guest_count: 12,
      occasion: 'Graduation Party (rescheduled)',
      location_address: '55 Brattle St',
      location_city: 'Cambridge',
      location_state: 'MA',
      location_zip: '02138',
      status: 'cancelled',
      service_style: 'buffet',
      pricing_model: 'per_person',
      quoted_price_cents: 8500,
      dietary_restrictions: ['low sodium'],
      allergies: [],
      special_requests: 'Cancelled due to scheduling conflict. May rebook for July.',
    },
  ]
}

// ─── INQUIRY DATA ───────────────────────────────────────────────────────────

const INQUIRIES = [
  {
    channel: 'instagram',
    status: 'new',
    source_message:
      'Hey! Saw your duck breast post. Do you do private dinners in the Seacoast NH area? Looking for something special for my husbands 40th birthday in June. About 12 people.',
    client_name: 'Jen Westbrook',
    client_email: 'jen.westbrook@gmail.com',
    client_phone: '603-555-1111',
    confirmed_guest_count: 12,
    confirmed_occasion: '40th Birthday',
    next_action_required: 'Reply with availability and pricing',
    next_action_by: 'chef',
  },
  {
    channel: 'take_a_chef',
    status: 'awaiting_client',
    source_message:
      'Professional couple seeking private chef for weekly meal prep in Andover MA. 2 adults, no kids. Mediterranean diet preferred. Budget around $400/week.',
    client_name: 'Kevin & Priya Sharma',
    client_email: 'priya.sharma@techcorp.com',
    client_phone: '978-555-2222',
    confirmed_guest_count: 2,
    confirmed_occasion: 'Weekly meal prep',
    confirmed_budget_cents: 40000,
    next_action_required: 'Awaiting client schedule confirmation',
    next_action_by: 'client',
  },
  {
    channel: 'email',
    status: 'quoted',
    source_message:
      'Hi David, Patricia Wozniak recommended you. We are hosting our daughters bridal shower in August (the 16th) and would love a seated lunch for 18 women. Thinking elegant but not too heavy. Garden party vibe. Can you send pricing?',
    client_name: 'Linda Brennan-Oakes',
    client_email: 'linda.oakes@verizon.net',
    client_phone: '978-555-3333',
    confirmed_guest_count: 18,
    confirmed_occasion: 'Bridal Shower',
    confirmed_date: '2026-08-16',
    confirmed_location: 'Private residence, West Newbury MA',
    confirmed_budget_cents: 270000,
    next_action_required: 'Quote sent, awaiting acceptance',
    next_action_by: 'client',
  },
  {
    channel: 'thumbtack',
    status: 'new',
    source_message:
      'Need a chef for a corporate team building event. 15 people. We want everyone to cook together then eat. Date flexible in June. Downtown Boston.',
    client_name: 'StartupXYZ Events',
    client_email: 'events@startupxyz.io',
    client_phone: '617-555-4444',
    confirmed_guest_count: 15,
    confirmed_occasion: 'Corporate Team Building',
    next_action_required: 'Review and respond with options',
    next_action_by: 'chef',
  },
  {
    channel: 'website',
    status: 'new',
    source_message:
      'Interested in a private dinner for 4 on our anniversary May 28. We live in Haverhill. My wife loves Italian food, especially fresh pasta. Budget is flexible for a special night.',
    client_name: 'Tom Paulson',
    client_email: 'tpaulson77@gmail.com',
    client_phone: '978-555-5555',
    confirmed_guest_count: 4,
    confirmed_occasion: 'Anniversary',
    confirmed_date: '2026-05-28',
    confirmed_location: 'Haverhill, MA',
    next_action_required: 'Reply with menu ideas and pricing',
    next_action_by: 'chef',
  },
  {
    channel: 'referral',
    status: 'awaiting_chef',
    source_message:
      'Sarah Mitchell gave me your info. Planning a rehearsal dinner for our son, August 22. 35 guests at our home in Newbury. Want something more personal than a restaurant. Italian family-style would be perfect.',
    client_name: 'Frank & Maria DeLuca',
    client_email: 'frank.deluca@comcast.net',
    client_phone: '978-555-6666',
    confirmed_guest_count: 35,
    confirmed_occasion: 'Rehearsal Dinner',
    confirmed_date: '2026-08-22',
    confirmed_location: 'Newbury, MA',
    confirmed_budget_cents: 525000,
    next_action_required: 'Build proposal and menu',
    next_action_by: 'chef',
  },
]

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

async function main() {
  const admin = createAdminClient()

  console.log('=== FULL BUSINESS SIMULATION SEED ===')
  console.log(`Chef: ${CHEF_ID}`)
  console.log(`Tenant: ${TENANT_ID}`)
  console.log('')

  // ─── Update chef email to real email for communication testing ─────────
  console.log('[1/8] Updating chef profile with real email...')
  await admin
    .from('chefs')
    .update({
      email: CHEF_EMAIL,
      business_name: 'Chef David Ferragamo',
      display_name: 'David Ferragamo',
      tagline: 'Elevated private dining experiences across New England',
      bio: 'Over a decade of crafting memorable meals in homes across Massachusetts and New Hampshire. Specializing in multi-course tasting menus, farm dinners, and intimate celebrations.',
      phone: '978-555-0001',
    })
    .eq('id', CHEF_ID)

  // ─── Seed Clients ─────────────────────────────────────────────────────
  console.log('[2/8] Seeding clients...')
  const clientIds: Record<string, string> = {}

  for (const client of CLIENTS) {
    const { data: existing } = await admin
      .from('clients')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('email', client.email)
      .maybeSingle()

    if (existing?.id) {
      clientIds[client.full_name] = existing.id
      continue
    }

    const { data: inserted, error } = await admin
      .from('clients')
      .insert({
        tenant_id: TENANT_ID,
        ...client,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  Failed to insert client ${client.full_name}:`, error.message)
      continue
    }
    clientIds[client.full_name] = inserted.id
    console.log(`  + ${client.full_name}`)
  }

  // ─── Seed Recipes ─────────────────────────────────────────────────────
  console.log('[3/8] Seeding recipes...')
  const recipeIds: Record<string, string> = {}

  for (const recipe of RECIPES) {
    const { ingredients, ...recipeData } = recipe

    const { data: existing } = await admin
      .from('recipes')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .ilike('name', recipeData.name)
      .maybeSingle()

    if (existing?.id) {
      recipeIds[recipe.name] = existing.id
      continue
    }

    const { data: inserted, error } = await admin
      .from('recipes')
      .insert({
        tenant_id: TENANT_ID,
        ...recipeData,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  Failed to insert recipe ${recipe.name}:`, error.message)
      continue
    }
    recipeIds[recipe.name] = inserted.id
    console.log(`  + ${recipe.name}`)

    // Add ingredients to recipe
    for (const ing of ingredients) {
      // First ensure ingredient exists in library
      const { data: existingIng } = await admin
        .from('ingredients')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .ilike('name', ing.name)
        .maybeSingle()

      let ingredientId: string
      if (existingIng?.id) {
        ingredientId = existingIng.id
      } else {
        const { data: newIng, error: ingError } = await admin
          .from('ingredients')
          .insert({
            tenant_id: TENANT_ID,
            name: ing.name,
            category: ing.category,
            default_unit: ing.unit,
          })
          .select('id')
          .single()

        if (ingError) {
          console.error(`    Failed ingredient ${ing.name}:`, ingError.message)
          continue
        }
        ingredientId = newIng.id
      }

      // Link ingredient to recipe
      await admin.from('recipe_ingredients').insert({
        recipe_id: inserted.id,
        ingredient_id: ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })
    }
  }

  // ─── Seed Events ──────────────────────────────────────────────────────
  console.log('[4/8] Seeding events...')
  const events = buildEvents(clientIds)
  const eventIds: Record<string, string> = {}

  for (const event of events) {
    const { client_key, ...eventData } = event
    const clientId = clientIds[client_key]
    if (!clientId) {
      console.error(`  No client ID for: ${client_key}`)
      continue
    }

    const { data: existing } = await admin
      .from('events')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('client_id', clientId)
      .eq('occasion', eventData.occasion)
      .maybeSingle()

    if (existing?.id) {
      eventIds[eventData.occasion] = existing.id
      continue
    }

    const { data: inserted, error } = await admin
      .from('events')
      .insert({
        tenant_id: TENANT_ID,
        client_id: clientId,
        ...eventData,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  Failed event ${eventData.occasion}:`, error.message)
      continue
    }
    eventIds[eventData.occasion] = inserted.id
    console.log(`  + ${eventData.occasion} (${eventData.status})`)
  }

  // ─── Seed Menus ───────────────────────────────────────────────────────
  console.log('[5/8] Seeding menus linked to events...')

  const menuAssignments = [
    {
      event_occasion: 'Monthly Dinner Club - May',
      title: 'Spring Tasting - May 2026',
      status: 'shared',
      courses: [
        { name: 'Citrus-Cured Salmon Crudo', course: 'First' },
        { name: 'Wild Mushroom Soup with Truffle Cream', course: 'Second' },
        { name: 'Seared Scallops with Brown Butter and Capers', course: 'Main' },
        { name: 'Creme Brulee', course: 'Dessert' },
      ],
    },
    {
      event_occasion: 'Farm Dinner - Spring Opening',
      title: 'Georgetown Farm Dinner - Spring 2026',
      status: 'draft',
      courses: [
        { name: 'Burrata with Heirloom Tomatoes and Basil Oil', course: 'Antipasto' },
        { name: 'Grilled Caesar Salad', course: 'Salad' },
        { name: 'Grilled Lamb Chops with Chimichurri', course: 'Main' },
        { name: 'Truffle Potato Puree', course: 'Side' },
        { name: 'Coconut Panna Cotta with Mango', course: 'Dessert' },
      ],
    },
    {
      event_occasion: 'Nerd Dinner: Fermentation Edition',
      title: 'Fermentation Exploration - 7 Courses',
      status: 'draft',
      courses: [
        { name: 'Wagyu Beef Tataki', course: 'Amuse' },
        { name: 'Miso-Glazed Black Cod', course: 'Fish' },
        { name: 'Pappardelle with Short Rib Ragu', course: 'Pasta' },
        { name: 'Chocolate Lava Cake', course: 'Dessert' },
      ],
    },
    {
      event_occasion: 'Birthday Celebration',
      title: 'Catherine Birthday - French Classical',
      status: 'shared',
      courses: [
        { name: 'Wild Mushroom Soup with Truffle Cream', course: 'Potage' },
        { name: 'Pan-Seared Duck Breast with Cherry Gastrique', course: 'Entree' },
        { name: 'Truffle Potato Puree', course: 'Accompagnement' },
        { name: 'Creme Brulee', course: 'Dessert' },
      ],
    },
  ]

  for (const menu of menuAssignments) {
    const eventId = eventIds[menu.event_occasion]
    if (!eventId) continue

    const { data: existing } = await admin
      .from('menus')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('event_id', eventId)
      .maybeSingle()

    if (existing?.id) continue

    const { data: inserted, error } = await admin
      .from('menus')
      .insert({
        tenant_id: TENANT_ID,
        event_id: eventId,
        name: menu.title,
        status: menu.status,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  Failed menu ${menu.title}:`, error.message)
      continue
    }
    console.log(`  + ${menu.title}`)

    // Add dishes to menu
    for (let i = 0; i < menu.courses.length; i++) {
      const course = menu.courses[i]
      const recipeId = recipeIds[course.name]

      await admin.from('menu_items').insert({
        menu_id: inserted.id,
        course_number: i + 1,
        course_name: course.course,
        name: course.name,
        recipe_id: recipeId || null,
      })
    }
  }

  // ─── Seed Inquiries ───────────────────────────────────────────────────
  console.log('[6/8] Seeding inquiries...')

  for (const inquiry of INQUIRIES) {
    const { client_name, client_email, client_phone, ...inquiryData } = inquiry

    const { data: existing } = await admin
      .from('inquiries')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .ilike('source_message', `%${inquiryData.source_message.slice(0, 40)}%`)
      .maybeSingle()

    if (existing?.id) continue

    // Check if client exists, link if so
    let clientId = null
    if (client_email) {
      const { data: existingClient } = await admin
        .from('clients')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .eq('email', client_email)
        .maybeSingle()
      clientId = existingClient?.id || null
    }

    const unknownFields: Record<string, string> = {}
    if (!clientId) {
      unknownFields.client_name = client_name
      if (client_email) unknownFields.client_email = client_email
      if (client_phone) unknownFields.client_phone = client_phone
    }

    const { error } = await admin.from('inquiries').insert({
      tenant_id: TENANT_ID,
      client_id: clientId,
      channel: inquiryData.channel,
      status: inquiryData.status,
      source_message: inquiryData.source_message,
      confirmed_guest_count: inquiryData.confirmed_guest_count,
      confirmed_occasion: inquiryData.confirmed_occasion,
      confirmed_date: (inquiryData as any).confirmed_date
        ? new Date(`${(inquiryData as any).confirmed_date}T00:00:00.000Z`).toISOString()
        : null,
      confirmed_location: (inquiryData as any).confirmed_location || null,
      confirmed_budget_cents: (inquiryData as any).confirmed_budget_cents || null,
      unknown_fields: unknownFields,
      next_action_required: inquiryData.next_action_required,
      next_action_by: inquiryData.next_action_by,
      first_contact_at: nowIso(),
      last_response_at: nowIso(),
    })

    if (error) {
      console.error(`  Failed inquiry from ${client_name}:`, error.message)
      continue
    }
    console.log(`  + ${client_name} (${inquiryData.channel}/${inquiryData.status})`)
  }

  // ─── Seed Ledger Entries (payments for completed/confirmed events) ────
  console.log('[7/8] Seeding financial data...')

  const financialEvents = [
    {
      occasion: 'Monthly Dinner Club - March',
      type: 'payment',
      amount_cents: 175000,
      method: 'venmo',
    },
    { occasion: '5th Wedding Anniversary', type: 'payment', amount_cents: 45000, method: 'zelle' },
    { occasion: 'Holiday Party 2025', type: 'deposit', amount_cents: 150000, method: 'check' },
    {
      occasion: 'Holiday Party 2025',
      type: 'final_payment',
      amount_cents: 150000,
      method: 'venmo',
    },
    {
      occasion: 'Monthly Dinner Club - May',
      type: 'deposit',
      amount_cents: 70000,
      method: 'venmo',
    },
    {
      occasion: 'Farm Dinner - Spring Opening',
      type: 'deposit',
      amount_cents: 152000,
      method: 'zelle',
    },
    {
      occasion: 'Nerd Dinner: Fermentation Edition',
      type: 'deposit',
      amount_cents: 75000,
      method: 'venmo',
    },
    { occasion: 'Birthday Celebration', type: 'payment', amount_cents: 120000, method: 'card' },
  ]

  for (const entry of financialEvents) {
    const eventId = eventIds[entry.occasion]
    if (!eventId) continue

    // Get client_id from the event
    const { data: eventRow } = await admin
      .from('events')
      .select('client_id')
      .eq('id', eventId)
      .single()
    if (!eventRow?.client_id) continue

    const { data: existing } = await admin
      .from('ledger_entries')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('event_id', eventId)
      .eq('entry_type', entry.type)
      .eq('amount_cents', entry.amount_cents)
      .maybeSingle()

    if (existing?.id) continue

    const { error } = await admin.from('ledger_entries').insert({
      tenant_id: TENANT_ID,
      event_id: eventId,
      client_id: eventRow.client_id,
      entry_type: entry.type,
      amount_cents: entry.amount_cents,
      payment_method: entry.method,
      description: `${entry.type.replace('_', ' ')} for ${entry.occasion}`,
    })

    if (error) {
      console.error(`  Failed ledger ${entry.occasion}/${entry.type}:`, error.message)
      continue
    }
    console.log(`  + $${(entry.amount_cents / 100).toFixed(0)} ${entry.type} - ${entry.occasion}`)
  }

  // ─── Seed Availability Blocks ─────────────────────────────────────────
  console.log('[8/8] Seeding availability...')

  const blocks = [
    { blocked_date: daysFromNow(5), reason: 'Personal day', entry_type: 'time_off' },
    { blocked_date: daysFromNow(25), reason: 'Farmers market scouting', entry_type: 'market' },
    { blocked_date: daysFromNow(30), reason: 'Equipment maintenance', entry_type: 'admin_block' },
    { blocked_date: daysFromNow(45), reason: 'Family vacation', entry_type: 'vacation' },
    { blocked_date: daysFromNow(46), reason: 'Family vacation', entry_type: 'vacation' },
    { blocked_date: daysFromNow(47), reason: 'Family vacation', entry_type: 'vacation' },
  ]

  for (const block of blocks) {
    const { data: existing } = await admin
      .from('chef_calendar_entries')
      .select('id')
      .eq('chef_id', CHEF_ID)
      .eq('start_date', block.blocked_date)
      .maybeSingle()

    if (existing?.id) continue

    const { error } = await admin.from('chef_calendar_entries').insert({
      chef_id: CHEF_ID,
      start_date: block.blocked_date,
      end_date: block.blocked_date,
      entry_type: block.entry_type,
      title: block.reason,
    })

    if (error) {
      console.error(`  Failed block ${block.blocked_date}:`, error.message)
      continue
    }
    console.log(`  + ${block.blocked_date}: ${block.reason}`)
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('')
  console.log('=== SIMULATION COMPLETE ===')
  console.log(`Clients: ${Object.keys(clientIds).length}`)
  console.log(`Recipes: ${Object.keys(recipeIds).length}`)
  console.log(`Events: ${Object.keys(eventIds).length}`)
  console.log(`Inquiries: ${INQUIRIES.length}`)
  console.log(`Ledger entries: ${financialEvents.length}`)
  console.log(`Calendar blocks: ${blocks.length}`)
  console.log('')
  console.log('Email pipeline: Communications will deliver to davidferra13@gmail.com')
  console.log('')
  console.log('Login: demo@chefflow.test / DemoChefFlow!2026')
}

main().catch((err) => {
  console.error('SEED FAILED:', err)
  process.exit(1)
})
