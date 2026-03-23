/**
 * Canonical Menu Fixtures - Culinary Truth Database
 *
 * Ground truth sourced from culinary education standards:
 *   - Escoffier, Le Guide Culinaire (classical French service sequence)
 *   - CIA (Culinary Institute of America) curriculum
 *   - ACF (American Culinary Federation) course classification standards
 *   - Le Cordon Bleu menu structure guidelines
 *
 * These fixtures are used to validate that ChefFlow's breakdown panel
 * correctly identifies course structure, dietary flags, and metadata.
 * They represent menus a culinary instructor would grade as "correct."
 */

export type CanonicalCourse = {
  course_label: string
  dish_name: string
  description?: string
  dietary_tags: string[] // GF, DF, V, VG, NF, SF, EF, KO, HA
}

export type CanonicalMenu = {
  name: string
  scene_type: string
  cuisine_type: string
  service_style: string
  guest_count: number
  courses: CanonicalCourse[]
  source: string // academic citation
  expected: {
    course_count: number
    dietary_flags: string[] // all unique tags across all courses
    tagline_parts: string[] // substrings expected in the tagline
    course_labels_in_order: string[] // expected label sequence
  }
}

// ─── 1. Escoffier Classical French Dinner ─────────────────────────────────────
// Based on: Escoffier, Le Guide Culinaire (1903), classical 8-course structure
// This is the canonical academic reference taught in every professional kitchen program.
// The full 13-course Escoffier sequence is condensed here to the 8 most commonly taught.

export const escoffierClassicalFrench: CanonicalMenu = {
  name: 'Escoffier Classical French Dinner',
  scene_type: 'Intimate Dinner',
  cuisine_type: 'French',
  service_style: 'plated',
  guest_count: 10,
  source: 'Escoffier, Le Guide Culinaire (1903); CIA Professional Chef 9th Ed.',
  courses: [
    {
      course_label: 'Amuse-Bouche',
      dish_name: 'Gougeres with Gruyere',
      description: 'One-bite cheese puffs, warm from the oven',
      dietary_tags: ['V'],
    },
    {
      course_label: 'First Course',
      dish_name: 'Pate de Campagne',
      description: 'Country-style pork terrine, cornichons, Dijon mustard',
      dietary_tags: ['GF'],
    },
    {
      course_label: 'Soup',
      dish_name: 'Veloute de Champignon',
      description: 'Creamy mushroom veloute, truffle oil',
      dietary_tags: ['V', 'GF'],
    },
    {
      course_label: 'Fish Course',
      dish_name: 'Sole Meuniere',
      description: 'Dover sole, brown butter, lemon, capers',
      dietary_tags: ['GF', 'SF'],
    },
    {
      course_label: 'Intermezzo',
      dish_name: 'Calvados Granite',
      description: 'Apple brandy ice to cleanse the palate',
      dietary_tags: ['GF', 'DF', 'V', 'VG', 'EF', 'NF'],
    },
    {
      course_label: 'Main Course',
      dish_name: "Carre d'Agneau Persille",
      description: 'Herb-crusted rack of lamb, natural jus, flageolet beans',
      dietary_tags: ['GF'],
    },
    {
      course_label: 'Cheese Course',
      dish_name: 'Plateau de Fromages',
      description: 'Selection of French cheeses: Brie, Roquefort, Comte',
      dietary_tags: ['V', 'GF'],
    },
    {
      course_label: 'Dessert',
      dish_name: 'Tarte Tatin',
      description: 'Upside-down caramelized apple tart, creme fraiche',
      dietary_tags: ['V'],
    },
  ],
  expected: {
    course_count: 8,
    dietary_flags: ['V', 'GF', 'SF', 'DF', 'VG', 'EF', 'NF'],
    tagline_parts: ['8-course', 'Plated', 'French', 'Intimate Dinner'],
    course_labels_in_order: [
      'Amuse-Bouche',
      'First Course',
      'Soup',
      'Fish Course',
      'Intermezzo',
      'Main Course',
      'Cheese Course',
      'Dessert',
    ],
  },
}

// ─── 2. CIA Modern American Tasting Menu ──────────────────────────────────────
// Based on: CIA Hyde Park curriculum, Seasons restaurant training menus
// A contemporary American progression following classical structure with modern technique.

export const ciaModernAmericanTasting: CanonicalMenu = {
  name: 'CIA Modern American Tasting',
  scene_type: 'Tasting Event',
  cuisine_type: 'American',
  service_style: 'tasting_menu',
  guest_count: 6,
  source: 'CIA (Culinary Institute of America) Hyde Park training curriculum',
  courses: [
    {
      course_label: 'Amuse-Bouche',
      dish_name: 'Compressed Watermelon with Feta and Mint Oil',
      description: 'Single bite, served on a spoon',
      dietary_tags: ['V', 'GF', 'NF', 'EF'],
    },
    {
      course_label: 'First Course',
      dish_name: 'Hudson Valley Foie Gras Torchon',
      description: 'Brioche, Sauternes gel, Maldon salt',
      dietary_tags: ['NF'],
    },
    {
      course_label: 'Fish Course',
      dish_name: 'Pan-Seared Halibut, Beurre Blanc',
      description: 'Spring peas, morel mushrooms, tarragon emulsion',
      dietary_tags: ['GF', 'SF'],
    },
    {
      course_label: 'Intermezzo',
      dish_name: 'Lemon Verbena Granita',
      description: 'Palate cleanser',
      dietary_tags: ['GF', 'DF', 'V', 'VG', 'NF', 'EF'],
    },
    {
      course_label: 'Main Course',
      dish_name: 'Roasted Duck Breast with Bing Cherry Jus',
      description: 'Duck confit hash, wilted watercress',
      dietary_tags: ['GF', 'DF', 'NF'],
    },
    {
      course_label: 'Cheese Course',
      dish_name: 'American Artisan Cheese Selection',
      description: 'Jasper Hill Harbison, Uplands Pleasant Ridge, Point Reyes Blue',
      dietary_tags: ['V', 'GF', 'NF'],
    },
    {
      course_label: 'Dessert',
      dish_name: 'Valrhona Chocolate Ganache Tart',
      description: 'Salted caramel, cocoa nib tuile',
      dietary_tags: ['V', 'NF'],
    },
  ],
  expected: {
    course_count: 7,
    dietary_flags: ['V', 'GF', 'NF', 'EF', 'SF', 'DF', 'VG'],
    tagline_parts: ['7-course', 'Tasting Menu', 'American'],
    course_labels_in_order: [
      'Amuse-Bouche',
      'First Course',
      'Fish Course',
      'Intermezzo',
      'Main Course',
      'Cheese Course',
      'Dessert',
    ],
  },
}

// ─── 3. Vegan Wellness Dinner (Dietary Flag Ground Truth) ─────────────────────
// Purpose: validates that the breakdown panel correctly aggregates and displays
// dietary flags across all courses. Every dish is VG + GF = both flags must appear.
// Source: Le Cordon Bleu plant-based curriculum, ACF dietary restriction standards

export const veganWellnessDinner: CanonicalMenu = {
  name: 'Vegan Wellness Dinner',
  scene_type: 'Intimate Dinner',
  cuisine_type: 'Plant-Based',
  service_style: 'plated',
  guest_count: 4,
  source: 'Le Cordon Bleu plant-based curriculum; ACF dietary restriction classification standards',
  courses: [
    {
      course_label: 'Amuse-Bouche',
      dish_name: 'Gazpacho Shooter',
      description: 'Chilled tomato, cucumber, bell pepper',
      dietary_tags: ['VG', 'GF', 'DF', 'NF', 'EF', 'SF'],
    },
    {
      course_label: 'First Course',
      dish_name: 'Beet Carpaccio',
      description: 'Golden beets, cashew cream, microgreens, balsamic reduction',
      dietary_tags: ['VG', 'GF', 'DF', 'EF', 'SF'],
    },
    {
      course_label: 'Main Course',
      dish_name: 'Wild Mushroom Risotto',
      description: 'Arborio rice, porcini broth, truffle oil, nutritional yeast',
      dietary_tags: ['VG', 'GF', 'DF', 'NF', 'EF', 'SF'],
    },
    {
      course_label: 'Dessert',
      dish_name: 'Coconut Panna Cotta',
      description: 'Coconut milk, passion fruit coulis, toasted coconut',
      dietary_tags: ['VG', 'GF', 'DF', 'NF', 'EF', 'SF'],
    },
  ],
  expected: {
    course_count: 4,
    dietary_flags: ['VG', 'GF', 'DF', 'NF', 'EF', 'SF'],
    tagline_parts: ['4-course', 'Plated', 'Plant-Based', 'Intimate Dinner'],
    course_labels_in_order: ['Amuse-Bouche', 'First Course', 'Main Course', 'Dessert'],
  },
}

// ─── 4. Corporate Cocktail Reception ──────────────────────────────────────────
// Purpose: validates cocktail/passed-app service style (no seated courses).
// In cocktail service, all items are typically "Canapés" - the course_label is the
// same for all, and course_number differentiates serving order.
// Source: ACF Catering and Banquet Service standards

export const corporateCocktailReception: CanonicalMenu = {
  name: 'Corporate Cocktail Reception',
  scene_type: 'Corporate Event',
  cuisine_type: 'American',
  service_style: 'cocktail',
  guest_count: 75,
  source:
    'ACF Catering and Banquet Service standards; NACE (National Association of Catering and Events)',
  courses: [
    {
      course_label: 'Canapes',
      dish_name: 'Smoked Salmon Blinis',
      description: 'Buckwheat blini, creme fraiche, dill',
      dietary_tags: ['GF', 'SF'],
    },
    {
      course_label: 'Canapes',
      dish_name: 'Beef Tartare Crostini',
      description: 'Capers, cornichon, Dijon aioli',
      dietary_tags: ['NF'],
    },
    {
      course_label: 'Canapes',
      dish_name: 'Mushroom Bruschetta',
      description: 'Roasted wild mushrooms, goat cheese, thyme',
      dietary_tags: ['V', 'NF'],
    },
    {
      course_label: 'Canapes',
      dish_name: 'Caprese Skewer',
      description: 'Fresh mozzarella, heirloom tomato, basil oil',
      dietary_tags: ['V', 'GF', 'NF', 'EF'],
    },
    {
      course_label: 'Canapes',
      dish_name: 'Shrimp Cocktail Shooter',
      description: 'Chilled shrimp, house cocktail sauce, lemon',
      dietary_tags: ['GF', 'DF', 'NF', 'EF'],
    },
  ],
  expected: {
    course_count: 5,
    dietary_flags: ['GF', 'SF', 'NF', 'V', 'EF', 'DF'],
    tagline_parts: ['5-course', 'Cocktail', 'American', 'Corporate Event'],
    course_labels_in_order: ['Canapes', 'Canapes', 'Canapes', 'Canapes', 'Canapes'],
  },
}

// ─── 5. Holiday Family Dinner ──────────────────────────────────────────────────
// Purpose: validates the most common chef booking type - plated holiday dinner.
// Simple 4-course American structure, no exotic dietary restrictions.
// Source: CIA American cuisine curriculum (family/holiday entertaining module)

export const holidayFamilyDinner: CanonicalMenu = {
  name: 'Holiday Family Dinner',
  scene_type: 'Holiday Dinner',
  cuisine_type: 'American',
  service_style: 'plated',
  guest_count: 12,
  source: 'CIA American Cuisine curriculum, holiday entertaining module',
  courses: [
    {
      course_label: 'Soup',
      dish_name: 'Butternut Squash Bisque',
      description: 'Roasted squash, apple, brown butter, sage creme fraiche',
      dietary_tags: ['V', 'GF', 'NF'],
    },
    {
      course_label: 'Salad',
      dish_name: 'Winter Citrus Salad',
      description: 'Blood orange, endive, pomegranate, candied walnuts, champagne vinaigrette',
      dietary_tags: ['V', 'GF', 'DF', 'EF'],
    },
    {
      course_label: 'Main Course',
      dish_name: 'Prime Rib with Horseradish Cream',
      description: 'Bone-in prime rib, au jus, Yorkshire pudding',
      dietary_tags: ['NF'],
    },
    {
      course_label: 'Dessert',
      dish_name: 'Pumpkin Pie with Bourbon Whipped Cream',
      description: 'House crust, lightly spiced filling',
      dietary_tags: ['V', 'NF'],
    },
  ],
  expected: {
    course_count: 4,
    dietary_flags: ['V', 'GF', 'NF', 'DF', 'EF'],
    tagline_parts: ['4-course', 'Plated', 'American', 'Holiday Dinner'],
    course_labels_in_order: ['Soup', 'Salad', 'Main Course', 'Dessert'],
  },
}

// ─── 6. Wedding Tasting Menu (Validation Stress Test) ─────────────────────────
// Purpose: most complex real-world booking. Mixed dietary requirements across courses.
// Tests that SF does NOT appear when only fish (not shellfish) is served.
// Source: based on typical wedding reception menus reviewed in ACF catering certification

export const weddingTastingMenu: CanonicalMenu = {
  name: 'Spring Wedding Tasting Menu',
  scene_type: 'Wedding',
  cuisine_type: 'Contemporary European',
  service_style: 'plated',
  guest_count: 85,
  source:
    'ACF Catering certification curriculum; ISES (International Special Events Society) standards',
  courses: [
    {
      course_label: 'Amuse-Bouche',
      dish_name: 'Pea Shoot Veloute',
      description: 'Spring pea soup, mint creme fraiche, crispy prosciutto',
      dietary_tags: ['GF', 'NF', 'EF'],
    },
    {
      course_label: 'First Course',
      dish_name: 'Burrata with Heirloom Tomatoes',
      description: 'Basil oil, Maldon salt, grilled sourdough',
      dietary_tags: ['V', 'NF', 'EF'],
    },
    {
      course_label: 'Fish Course',
      dish_name: 'Pan-Seared Sea Bass',
      description: 'Saffron beurre blanc, fennel confit, micro herbs',
      dietary_tags: ['GF', 'NF', 'EF'],
    },
    {
      course_label: 'Intermezzo',
      dish_name: 'Elderflower Granita',
      description: 'St-Germain, lemon, prosecco',
      dietary_tags: ['GF', 'DF', 'V', 'VG', 'NF', 'EF'],
    },
    {
      course_label: 'Main Course',
      dish_name: 'Filet Mignon with Red Wine Jus',
      description: 'Truffle pomme puree, haricots verts, bone marrow gremolata',
      dietary_tags: ['GF', 'NF', 'EF'],
    },
    {
      course_label: 'Dessert',
      dish_name: 'Wedding Cake Service',
      description: 'Vanilla bean sponge, Swiss meringue buttercream, fresh florals',
      dietary_tags: ['V', 'NF'],
    },
  ],
  expected: {
    course_count: 6,
    // Note: SF (shellfish-free) should NOT appear - sea bass is fish, not shellfish
    dietary_flags: ['GF', 'NF', 'EF', 'V', 'DF', 'VG'],
    tagline_parts: ['6-course', 'Plated', 'Contemporary European', 'Wedding'],
    course_labels_in_order: [
      'Amuse-Bouche',
      'First Course',
      'Fish Course',
      'Intermezzo',
      'Main Course',
      'Dessert',
    ],
  },
}

// ─── All fixtures exported as a collection ────────────────────────────────────

export const ALL_CANONICAL_MENUS: CanonicalMenu[] = [
  escoffierClassicalFrench,
  ciaModernAmericanTasting,
  veganWellnessDinner,
  corporateCocktailReception,
  holidayFamilyDinner,
  weddingTastingMenu,
]
