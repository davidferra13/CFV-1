/**
 * OpenClaw - Nationwide Configuration
 *
 * Shared config for ALL scrapers. Every scraper imports this
 * instead of hardcoding zip codes and store IDs.
 *
 * Usage in any scraper:
 *   import { getTargetStores, getWalmartStores, getZipsForState } from './nationwide-config.mjs';
 */

// ── WALMART STORE IDS BY STATE ──
// Walmart.com uses store IDs to set location context.
// One representative store per metro area.
export const WALMART_STORES = [
  // Northeast
  { storeId: '2153', zip: '01844', city: 'Methuen', state: 'MA' },
  { storeId: '2165', zip: '06001', city: 'Hartford', state: 'CT' },
  { storeId: '1973', zip: '10001', city: 'New York', state: 'NY' },
  { storeId: '2560', zip: '07102', city: 'Newark', state: 'NJ' },
  { storeId: '2182', zip: '19101', city: 'Philadelphia', state: 'PA' },
  { storeId: '3225', zip: '15201', city: 'Pittsburgh', state: 'PA' },
  // Southeast
  { storeId: '4452', zip: '29201', city: 'Columbia', state: 'SC' },
  { storeId: '4458', zip: '29601', city: 'Greenville', state: 'SC' },
  { storeId: '3462', zip: '28202', city: 'Charlotte', state: 'NC' },
  { storeId: '3463', zip: '27601', city: 'Raleigh', state: 'NC' },
  { storeId: '4454', zip: '23219', city: 'Richmond', state: 'VA' },
  { storeId: '1218', zip: '30301', city: 'Atlanta', state: 'GA' },
  { storeId: '3456', zip: '33101', city: 'Miami', state: 'FL' },
  { storeId: '5277', zip: '32801', city: 'Orlando', state: 'FL' },
  { storeId: '4430', zip: '33601', city: 'Tampa', state: 'FL' },
  { storeId: '4398', zip: '35201', city: 'Birmingham', state: 'AL' },
  { storeId: '2772', zip: '37201', city: 'Nashville', state: 'TN' },
  { storeId: '2735', zip: '40201', city: 'Louisville', state: 'KY' },
  { storeId: '4432', zip: '39201', city: 'Jackson', state: 'MS' },
  { storeId: '5765', zip: '70112', city: 'New Orleans', state: 'LA' },
  { storeId: '131',  zip: '72201', city: 'Little Rock', state: 'AR' },
  // Midwest
  { storeId: '2935', zip: '43201', city: 'Columbus', state: 'OH' },
  { storeId: '5215', zip: '48201', city: 'Detroit', state: 'MI' },
  { storeId: '4262', zip: '46201', city: 'Indianapolis', state: 'IN' },
  { storeId: '1998', zip: '60601', city: 'Chicago', state: 'IL' },
  { storeId: '2638', zip: '53201', city: 'Milwaukee', state: 'WI' },
  { storeId: '5058', zip: '55401', city: 'Minneapolis', state: 'MN' },
  { storeId: '1543', zip: '50309', city: 'Des Moines', state: 'IA' },
  { storeId: '1200', zip: '63101', city: 'St. Louis', state: 'MO' },
  { storeId: '5184', zip: '67201', city: 'Wichita', state: 'KS' },
  { storeId: '1119', zip: '68101', city: 'Omaha', state: 'NE' },
  { storeId: '1780', zip: '58102', city: 'Fargo', state: 'ND' },
  { storeId: '3750', zip: '57101', city: 'Sioux Falls', state: 'SD' },
  // South / Southwest
  { storeId: '5260', zip: '75201', city: 'Dallas', state: 'TX' },
  { storeId: '2516', zip: '77001', city: 'Houston', state: 'TX' },
  { storeId: '5120', zip: '78201', city: 'San Antonio', state: 'TX' },
  { storeId: '1253', zip: '73301', city: 'Austin', state: 'TX' },
  { storeId: '870',  zip: '73101', city: 'Oklahoma City', state: 'OK' },
  { storeId: '838',  zip: '87101', city: 'Albuquerque', state: 'NM' },
  // Mountain / West
  { storeId: '1001', zip: '80201', city: 'Denver', state: 'CO' },
  { storeId: '2501', zip: '84101', city: 'Salt Lake City', state: 'UT' },
  { storeId: '2093', zip: '85001', city: 'Phoenix', state: 'AZ' },
  { storeId: '2032', zip: '89101', city: 'Las Vegas', state: 'NV' },
  { storeId: '4285', zip: '83701', city: 'Boise', state: 'ID' },
  { storeId: '2757', zip: '59601', city: 'Helena', state: 'MT' },
  { storeId: '2225', zip: '82001', city: 'Cheyenne', state: 'WY' },
  // Pacific
  { storeId: '2094', zip: '90001', city: 'Los Angeles', state: 'CA' },
  { storeId: '5434', zip: '94102', city: 'San Francisco', state: 'CA' },
  { storeId: '1594', zip: '95814', city: 'Sacramento', state: 'CA' },
  { storeId: '2150', zip: '98101', city: 'Seattle', state: 'WA' },
  { storeId: '5961', zip: '97201', city: 'Portland', state: 'OR' },
  { storeId: '3470', zip: '99501', city: 'Anchorage', state: 'AK' },
  { storeId: '3659', zip: '96813', city: 'Honolulu', state: 'HI' },
];

// ── TARGET STORE IDS BY STATE ──
// Target's Redsky API uses store IDs. No auth required.
export const TARGET_STORES = [
  { storeId: '1290', zip: '01844', city: 'Methuen', state: 'MA' },
  { storeId: '2102', zip: '10001', city: 'New York', state: 'NY' },
  { storeId: '1285', zip: '19101', city: 'Philadelphia', state: 'PA' },
  { storeId: '2769', zip: '20001', city: 'Washington', state: 'DC' },
  { storeId: '3269', zip: '29201', city: 'Columbia', state: 'SC' },
  { storeId: '870',  zip: '28202', city: 'Charlotte', state: 'NC' },
  { storeId: '3264', zip: '23219', city: 'Richmond', state: 'VA' },
  { storeId: '2400', zip: '30301', city: 'Atlanta', state: 'GA' },
  { storeId: '1849', zip: '33101', city: 'Miami', state: 'FL' },
  { storeId: '1818', zip: '37201', city: 'Nashville', state: 'TN' },
  { storeId: '1768', zip: '43201', city: 'Columbus', state: 'OH' },
  { storeId: '3283', zip: '48201', city: 'Detroit', state: 'MI' },
  { storeId: '1272', zip: '46201', city: 'Indianapolis', state: 'IN' },
  { storeId: '1927', zip: '60601', city: 'Chicago', state: 'IL' },
  { storeId: '1010', zip: '55401', city: 'Minneapolis', state: 'MN' },
  { storeId: '900',  zip: '75201', city: 'Dallas', state: 'TX' },
  { storeId: '498',  zip: '77001', city: 'Houston', state: 'TX' },
  { storeId: '1793', zip: '80201', city: 'Denver', state: 'CO' },
  { storeId: '298',  zip: '85001', city: 'Phoenix', state: 'AZ' },
  { storeId: '2076', zip: '90001', city: 'Los Angeles', state: 'CA' },
  { storeId: '2764', zip: '94102', city: 'San Francisco', state: 'CA' },
  { storeId: '1301', zip: '98101', city: 'Seattle', state: 'WA' },
  { storeId: '2130', zip: '97201', city: 'Portland', state: 'OR' },
  { storeId: '2766', zip: '89101', city: 'Las Vegas', state: 'NV' },
];

// ── COMPREHENSIVE SEARCH TERMS ──
// Every ingredient a chef needs to price
export const CHEF_SEARCH_TERMS = [
  // Proteins - poultry
  'chicken breast', 'chicken thigh', 'chicken wings', 'chicken drumstick',
  'whole chicken', 'ground chicken', 'ground turkey', 'turkey breast',
  // Proteins - beef
  'ground beef', 'ribeye steak', 'sirloin steak', 'strip steak',
  'beef tenderloin', 'chuck roast', 'beef stew meat', 'short ribs',
  'flank steak', 'brisket', 'skirt steak',
  // Proteins - pork
  'pork chop', 'pork loin', 'pork tenderloin', 'pork shoulder',
  'bacon', 'sausage', 'ham', 'pork belly',
  // Proteins - seafood
  'salmon fillet', 'shrimp', 'cod fillet', 'tilapia', 'tuna steak',
  'crab', 'lobster tail', 'scallops', 'canned tuna', 'smoked salmon',
  // Proteins - other
  'eggs', 'tofu', 'lamb chop',
  // Dairy
  'whole milk', 'heavy cream', 'sour cream', 'buttermilk',
  'butter', 'unsalted butter',
  'cheddar cheese', 'mozzarella', 'parmesan', 'cream cheese',
  'goat cheese', 'feta', 'ricotta', 'swiss cheese',
  'yogurt', 'greek yogurt',
  // Produce - fruit
  'apple', 'banana', 'orange', 'lemon', 'lime',
  'strawberry', 'blueberry', 'raspberry', 'grape',
  'avocado', 'mango', 'pineapple', 'peach', 'pear',
  'watermelon', 'cherry', 'coconut',
  // Produce - vegetable
  'potato', 'sweet potato', 'onion', 'garlic', 'shallot',
  'tomato', 'cherry tomato',
  'bell pepper', 'jalapeno', 'poblano',
  'mushroom', 'portobello', 'shiitake',
  'lettuce', 'romaine', 'spinach', 'arugula', 'kale',
  'broccoli', 'cauliflower', 'brussels sprouts', 'cabbage',
  'carrot', 'celery', 'cucumber', 'zucchini', 'squash',
  'corn', 'green bean', 'asparagus', 'eggplant',
  // Fresh herbs
  'basil', 'cilantro', 'parsley', 'rosemary', 'thyme', 'dill', 'mint',
  // Pantry
  'rice', 'pasta', 'bread', 'flour', 'sugar',
  'olive oil', 'vegetable oil', 'coconut oil', 'sesame oil',
  'canned tomato', 'tomato sauce', 'tomato paste',
  'chicken broth', 'beef broth',
  'black beans', 'chickpeas', 'lentils',
  'peanut butter', 'honey', 'maple syrup',
  'vinegar', 'soy sauce', 'hot sauce',
  'salt', 'black pepper', 'garlic powder', 'onion powder',
  'paprika', 'cumin', 'chili powder', 'cayenne',
  'cinnamon', 'oregano', 'italian seasoning',
  'baking powder', 'baking soda', 'vanilla extract',
  'cocoa powder', 'chocolate chips',
  // Frozen
  'frozen vegetables', 'frozen fruit', 'frozen shrimp',
  // Beverages
  'coffee', 'tea', 'orange juice',
];

/**
 * Get stores for a specific scraper, optionally filtered by state.
 */
export function getStoresForScraper(scraper, stateFilter) {
  const stores = scraper === 'walmart' ? WALMART_STORES
    : scraper === 'target' ? TARGET_STORES
    : [];
  return stateFilter ? stores.filter(s => s.state === stateFilter) : stores;
}
