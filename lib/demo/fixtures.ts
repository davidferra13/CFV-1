// Demo Data Fixtures
// Rich, realistic sample data for the demo chef tenant.
// All dates are relative to now so the demo always looks current.
//
// These are NOT intended for the in-app "Load Sample Data" button
// (that's lib/onboarding/demo-data.ts). These are for the dedicated
// demo accounts created by scripts/setup-demo-accounts.ts.

// ─── Date Helpers ────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export const DEMO_CLIENTS = [
  {
    full_name: 'Sarah & Michael Chen',
    email: 'sarah.chen@example.com',
    phone: '617-555-0101',
    dietary_restrictions: ['pescatarian'],
    allergies: [] as string[],
    status: 'vip' as const,
    referral_source: 'referral',
    vibe_notes:
      'Hosts quarterly dinner parties. Prefers modern Japanese fusion. Has referred 3 new clients.',
  },
  {
    full_name: 'James & Patricia Whitfield',
    email: 'james.whitfield@example.com',
    phone: '617-555-0102',
    dietary_restrictions: [] as string[],
    allergies: ['shellfish'],
    status: 'active' as const,
    referral_source: 'referral',
    vibe_notes: 'Anniversary dinners every year. Classic French preferred. Budget flexible.',
  },
  {
    full_name: 'Anika Patel',
    email: 'anika.patel@example.com',
    phone: '617-555-0103',
    dietary_restrictions: ['vegetarian'],
    allergies: ['tree nuts'],
    status: 'active' as const,
    referral_source: 'website',
    vibe_notes:
      'Corporate team dinners for her startup. 15-25 guests typically. Indian-Mediterranean fusion.',
  },
  {
    full_name: 'Robert & Lisa Dominguez',
    email: 'r.dominguez@example.com',
    phone: '617-555-0104',
    dietary_restrictions: [] as string[],
    allergies: [] as string[],
    status: 'active' as const,
    referral_source: 'instagram',
    vibe_notes: 'Love tasting menus. Adventurous eaters. Recently moved to Back Bay.',
  },
  {
    full_name: 'Emily Nakamura',
    email: 'emily.nakamura@example.com',
    phone: '617-555-0105',
    dietary_restrictions: ['gluten-free'],
    allergies: ['wheat', 'barley'],
    status: 'active' as const,
    referral_source: 'website',
    vibe_notes: 'Monthly birthday celebrations for her book club (8-10 guests).',
  },
  {
    full_name: "Thomas & Grace O'Brien",
    email: 't.obrien@example.com',
    phone: '617-555-0106',
    dietary_restrictions: [] as string[],
    allergies: [] as string[],
    status: 'active' as const,
    referral_source: 'referral',
    vibe_notes: 'Holiday parties and summer BBQs. Large groups (20-40). Casual style preferred.',
  },
  {
    full_name: 'Dr. Marcus Washington',
    email: 'marcus.w@example.com',
    phone: '617-555-0107',
    dietary_restrictions: ['keto'],
    allergies: [] as string[],
    status: 'active' as const,
    referral_source: 'referral',
    vibe_notes: 'Intimate dinner parties for 4-6. Wine pairing enthusiast. Prefers Mediterranean.',
  },
  {
    full_name: 'Sofia & Alejandro Reyes',
    email: 'sofia.reyes@example.com',
    phone: '617-555-0108',
    dietary_restrictions: [] as string[],
    allergies: ['dairy'],
    status: 'active' as const,
    referral_source: 'website',
    vibe_notes: 'Engagement party coming up. Latin-Asian fusion. Very detail-oriented.',
  },
  {
    full_name: 'Claire Beaumont',
    email: 'claire.b@example.com',
    phone: '617-555-0109',
    dietary_restrictions: ['vegan'],
    allergies: [] as string[],
    status: 'dormant' as const,
    referral_source: 'website',
    vibe_notes: 'Had one event last year. Loved the vegan tasting menu. Follow up for spring.',
  },
  {
    full_name: 'David & Kim Park',
    email: 'david.park@example.com',
    phone: '617-555-0110',
    dietary_restrictions: [] as string[],
    allergies: ['peanuts'],
    status: 'active' as const,
    referral_source: 'referral',
    vibe_notes: 'Referred by venue partner (The Langham). Formal plated dinners for 8-12.',
  },
]

// ─── Events ──────────────────────────────────────────────────────────────────
// 18 events across all 8 FSM states (draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled)
// clientIndex references DEMO_CLIENTS by position

export const DEMO_EVENTS = [
  // COMPLETED (past) - 4 events
  {
    clientIndex: 0,
    occasion: 'Winter Dinner Party',
    status: 'completed',
    daysOut: -45,
    guest_count: 8,
    serve_time: '19:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  {
    clientIndex: 1,
    occasion: '25th Anniversary Dinner',
    status: 'completed',
    daysOut: -30,
    guest_count: 6,
    serve_time: '19:30:00',
    location_city: 'Cambridge',
    location_state: 'MA',
    service_style: 'plated',
  },
  {
    clientIndex: 6,
    occasion: 'Wine Pairing Dinner',
    status: 'completed',
    daysOut: -21,
    guest_count: 4,
    serve_time: '19:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  {
    clientIndex: 2,
    occasion: 'Q4 Team Celebration',
    status: 'completed',
    daysOut: -14,
    guest_count: 20,
    serve_time: '18:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'buffet',
  },
  // CANCELLED - 2 events
  {
    clientIndex: 8,
    occasion: 'Spring Garden Party',
    status: 'cancelled',
    daysOut: -7,
    guest_count: 12,
    serve_time: '17:00:00',
    location_city: 'Brookline',
    location_state: 'MA',
    service_style: 'family_style',
  },
  {
    clientIndex: 5,
    occasion: 'Postponed Holiday Gathering',
    status: 'cancelled',
    daysOut: -3,
    guest_count: 30,
    serve_time: '18:00:00',
    location_city: 'Newton',
    location_state: 'MA',
    service_style: 'buffet',
  },
  // IN_PROGRESS - 1 event (happening today/tomorrow)
  {
    clientIndex: 3,
    occasion: 'Birthday Tasting Menu',
    status: 'in_progress',
    daysOut: 0,
    guest_count: 10,
    serve_time: '19:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  // CONFIRMED - 2 events (upcoming, all paid + confirmed)
  {
    clientIndex: 0,
    occasion: 'Spring Dinner Party',
    status: 'confirmed',
    daysOut: 5,
    guest_count: 8,
    serve_time: '19:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  {
    clientIndex: 9,
    occasion: 'Formal Charity Gala Dinner',
    status: 'confirmed',
    daysOut: 12,
    guest_count: 12,
    serve_time: '19:30:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  // PAID - 2 events (deposit paid, not yet confirmed)
  {
    clientIndex: 4,
    occasion: 'Book Club Birthday Dinner',
    status: 'paid',
    daysOut: 18,
    guest_count: 10,
    serve_time: '18:30:00',
    location_city: 'Somerville',
    location_state: 'MA',
    service_style: 'family_style',
  },
  {
    clientIndex: 7,
    occasion: 'Engagement Party',
    status: 'paid',
    daysOut: 25,
    guest_count: 16,
    serve_time: '18:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'buffet',
  },
  // ACCEPTED - 2 events (quote accepted, awaiting payment)
  {
    clientIndex: 5,
    occasion: 'Summer BBQ Bash',
    status: 'accepted',
    daysOut: 32,
    guest_count: 35,
    serve_time: '16:00:00',
    location_city: 'Wellesley',
    location_state: 'MA',
    service_style: 'buffet',
  },
  {
    clientIndex: 6,
    occasion: 'Mediterranean Tasting Night',
    status: 'accepted',
    daysOut: 38,
    guest_count: 6,
    serve_time: '19:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  // PROPOSED - 2 events (quote sent, awaiting client response)
  {
    clientIndex: 1,
    occasion: 'Easter Brunch',
    status: 'proposed',
    daysOut: 42,
    guest_count: 14,
    serve_time: '11:00:00',
    location_city: 'Cambridge',
    location_state: 'MA',
    service_style: 'family_style',
  },
  {
    clientIndex: 2,
    occasion: 'Q1 Team Kickoff Dinner',
    status: 'proposed',
    daysOut: 48,
    guest_count: 18,
    serve_time: '18:30:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  // DRAFT - 3 events (work in progress)
  {
    clientIndex: 3,
    occasion: 'Summer Solstice Dinner',
    status: 'draft',
    daysOut: 55,
    guest_count: 8,
    serve_time: '20:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'plated',
  },
  {
    clientIndex: 9,
    occasion: 'Lakehouse Weekend Dinner',
    status: 'draft',
    daysOut: 60,
    guest_count: 10,
    serve_time: '19:00:00',
    location_city: 'Worcester',
    location_state: 'MA',
    service_style: 'family_style',
  },
  {
    clientIndex: 4,
    occasion: 'Bridal Shower Luncheon',
    status: 'draft',
    daysOut: 65,
    guest_count: 15,
    serve_time: '12:00:00',
    location_city: 'Boston',
    location_state: 'MA',
    service_style: 'buffet',
  },
]

// ─── Inquiries ───────────────────────────────────────────────────────────────

export const DEMO_INQUIRIES = [
  {
    clientIndex: 7,
    channel: 'website',
    status: 'new',
    source_message:
      'Hi, we just got engaged and are looking for a private chef for our engagement party. We love Latin-Asian fusion and want something really special for about 16 guests.',
    confirmed_occasion: 'Engagement Party',
    confirmed_guest_count: 16,
    confirmed_budget_cents: 350000,
    next_action_by: 'chef',
    daysAgo: 1,
  },
  {
    clientIndex: 5,
    channel: 'email',
    status: 'awaiting_client',
    source_message:
      'We do a big summer BBQ every year - 30-40 people. Wondering about pricing and availability for a Saturday in July.',
    confirmed_occasion: 'Summer BBQ Bash',
    confirmed_guest_count: 35,
    confirmed_budget_cents: 500000,
    next_action_by: 'client',
    daysAgo: 5,
  },
  {
    clientIndex: 2,
    channel: 'website',
    status: 'quoted',
    source_message:
      "Our company is having a team dinner for about 18 people. We'd like a nice plated dinner - modern American or Mediterranean.",
    confirmed_occasion: 'Q1 Team Kickoff Dinner',
    confirmed_guest_count: 18,
    confirmed_budget_cents: 450000,
    next_action_by: 'client',
    daysAgo: 8,
  },
  {
    clientIndex: 0,
    channel: 'other',
    status: 'confirmed',
    source_message:
      "Our friend Marcus recommended you. We'd love to book a spring dinner party - 8 guests, Japanese or Mediterranean fusion.",
    confirmed_occasion: 'Spring Dinner Party',
    confirmed_guest_count: 8,
    confirmed_budget_cents: 200000,
    next_action_by: 'chef',
    daysAgo: 20,
  },
  {
    clientIndex: 8,
    channel: 'website',
    status: 'declined',
    source_message:
      'Looking for someone to cater our garden party. Budget is about $200 for 12 people.',
    confirmed_occasion: 'Garden Party',
    confirmed_guest_count: 12,
    confirmed_budget_cents: 20000,
    next_action_by: 'chef',
    daysAgo: 30,
  },
  {
    clientIndex: 9,
    channel: 'phone',
    status: 'new',
    source_message:
      "The Langham referred us. We're planning a lakehouse weekend and would love a private chef for one evening. 10 guests, upscale casual.",
    confirmed_occasion: 'Lakehouse Weekend Dinner',
    confirmed_guest_count: 10,
    confirmed_budget_cents: 280000,
    next_action_by: 'chef',
    daysAgo: 2,
  },
]

// ─── Menus ───────────────────────────────────────────────────────────────────

export const DEMO_MENUS = [
  {
    name: 'New England Spring Tasting',
    description: 'A celebration of seasonal New England ingredients with Mediterranean influences.',
    cuisine_type: 'Modern American',
    target_guest_count: 8,
    is_template: true,
    status: 'shared',
    dishes: [
      {
        course_number: 1,
        course_name: 'Chilled Pea Soup with Mint Oil & Crème Fraîche',
        dietary_tags: ['vegetarian', 'gluten-free'],
      },
      {
        course_number: 2,
        course_name: 'Seared Dayboat Scallops with Corn Purée & Crispy Shallots',
        dietary_tags: ['gluten-free'],
      },
      {
        course_number: 3,
        course_name: 'Herb-Crusted Lamb Rack with Spring Vegetables & Rosemary Jus',
        dietary_tags: [],
      },
      {
        course_number: 4,
        course_name: 'Local Cheese Selection with Honeycomb & Fig Compote',
        dietary_tags: ['vegetarian'],
      },
      {
        course_number: 5,
        course_name: 'Lemon Olive Oil Cake with Seasonal Berry Compote',
        dietary_tags: ['vegetarian'],
      },
    ],
  },
  {
    name: 'Mediterranean Voyage',
    description: 'A culinary journey from Barcelona to Beirut - bold flavors, shared plates.',
    cuisine_type: 'Mediterranean',
    target_guest_count: 6,
    is_template: true,
    status: 'shared',
    dishes: [
      {
        course_number: 1,
        course_name: 'Mezze Board: Hummus, Baba Ganoush, Muhammara & Warm Pita',
        dietary_tags: ['vegan'],
      },
      {
        course_number: 2,
        course_name: 'Grilled Octopus with Romesco, Fingerling Potatoes & Arugula',
        dietary_tags: ['gluten-free'],
      },
      {
        course_number: 3,
        course_name: 'Saffron Risotto with Roasted Mushrooms & Truffle Oil',
        dietary_tags: ['vegetarian'],
      },
      {
        course_number: 4,
        course_name: 'Slow-Braised Short Ribs with Pomegranate Glaze & Couscous',
        dietary_tags: [],
      },
      {
        course_number: 5,
        course_name: 'Pistachio Baklava with Rose Water Ice Cream',
        dietary_tags: ['vegetarian'],
      },
    ],
  },
  {
    name: 'Japanese Omakase Experience',
    description:
      'An intimate omakase-style dinner showcasing pristine seafood and seasonal Japanese flavors.',
    cuisine_type: 'Japanese',
    target_guest_count: 4,
    is_template: true,
    status: 'shared',
    dishes: [
      {
        course_number: 1,
        course_name: 'Dashi Custard (Chawanmushi) with Uni & Shiso',
        dietary_tags: ['gluten-free'],
      },
      {
        course_number: 2,
        course_name: 'Sashimi Selection: Hamachi, Toro & Hirame with Fresh Wasabi',
        dietary_tags: ['gluten-free'],
      },
      {
        course_number: 3,
        course_name: 'A5 Wagyu with Miso-Glazed Eggplant & Pickled Ginger',
        dietary_tags: [],
      },
      { course_number: 4, course_name: 'Hand-Rolled Temaki with Seasonal Fish', dietary_tags: [] },
      {
        course_number: 5,
        course_name: 'Yuzu Sorbet with Black Sesame Tuile',
        dietary_tags: ['vegan'],
      },
    ],
  },
  {
    name: 'Vegan Plant-Forward Feast',
    description:
      'An entirely plant-based tasting menu that converts even the most skeptical carnivores.',
    cuisine_type: 'Plant-Based',
    target_guest_count: 10,
    is_template: true,
    status: 'shared',
    dishes: [
      {
        course_number: 1,
        course_name: 'Heirloom Tomato Tartare with Cashew Ricotta & Basil Oil',
        dietary_tags: ['vegan', 'gluten-free'],
      },
      {
        course_number: 2,
        course_name: 'Charred Cauliflower Steak with Chimichurri & Crispy Capers',
        dietary_tags: ['vegan', 'gluten-free'],
      },
      {
        course_number: 3,
        course_name: 'Wild Mushroom & Truffle Ravioli with Sage Brown Butter',
        dietary_tags: ['vegan'],
      },
      {
        course_number: 4,
        course_name: 'Miso-Roasted Kabocha Squash with Coconut & Toasted Seeds',
        dietary_tags: ['vegan', 'gluten-free'],
      },
      {
        course_number: 5,
        course_name: 'Dark Chocolate Avocado Mousse with Sea Salt & Olive Oil',
        dietary_tags: ['vegan', 'gluten-free'],
      },
    ],
  },
  {
    name: 'Summer BBQ & Grill',
    description: 'Laid-back luxury grilling with premium proteins and fresh seasonal sides.',
    cuisine_type: 'American BBQ',
    target_guest_count: 30,
    is_template: true,
    status: 'draft',
    dishes: [
      {
        course_number: 1,
        course_name: 'Grilled Peach & Burrata Salad with Arugula & Balsamic',
        dietary_tags: ['vegetarian', 'gluten-free'],
      },
      {
        course_number: 2,
        course_name: 'Smoked Brisket with House-Made BBQ Sauce',
        dietary_tags: ['gluten-free'],
      },
      {
        course_number: 3,
        course_name: 'Cedar Plank Salmon with Dill Crème Fraîche',
        dietary_tags: ['gluten-free'],
      },
      {
        course_number: 4,
        course_name: 'Grilled Corn with Lime Butter & Cotija',
        dietary_tags: ['vegetarian', 'gluten-free'],
      },
      {
        course_number: 5,
        course_name: "S'mores Bar with Artisan Chocolate & Homemade Marshmallows",
        dietary_tags: ['vegetarian'],
      },
    ],
  },
]

// ─── Recipes ─────────────────────────────────────────────────────────────────

export const DEMO_RECIPES = [
  {
    name: 'Seared Dayboat Scallops with Corn Purée',
    category: 'protein',
    description: 'Pan-seared U10 scallops with sweet corn purée, crispy shallots, and micro herbs.',
    method:
      '1. Pat scallops dry, season with salt. 2. Heat cast iron until smoking, sear 2 min per side. 3. For purée: sweat shallots, add corn kernels, cream, blend until smooth. 4. Fry shallot rings at 350°F until golden. 5. Plate purée, top with scallops, garnish with shallots and micro greens.',
    yield_quantity: 6,
    yield_unit: 'portion',
    prep_time_minutes: 20,
    cook_time_minutes: 15,
    total_time_minutes: 35,
    dietary_tags: ['gluten-free'],
    ingredients: [
      { name: 'U10 Dayboat Scallops', quantity: 18, unit: 'each', cost_cents: 3600 },
      { name: 'Sweet corn (ears)', quantity: 6, unit: 'each', cost_cents: 600 },
      { name: 'Heavy cream', quantity: 0.5, unit: 'cup', cost_cents: 200 },
      { name: 'Shallots', quantity: 4, unit: 'each', cost_cents: 300 },
      { name: 'Micro greens', quantity: 1, unit: 'oz', cost_cents: 400 },
    ],
  },
  {
    name: 'Herb-Crusted Lamb Rack',
    category: 'protein',
    description: 'Dijon-crusted rack of lamb with rosemary, thyme, and a red wine jus.',
    method:
      '1. French the lamb racks. 2. Season, sear all sides. 3. Coat with Dijon, press herb-breadcrumb mixture. 4. Roast at 425°F to 130°F internal (medium-rare). 5. Rest 10 min. 6. Reduce red wine with stock, aromatics, and butter for jus.',
    yield_quantity: 6,
    yield_unit: 'portion',
    prep_time_minutes: 25,
    cook_time_minutes: 30,
    total_time_minutes: 55,
    dietary_tags: [] as string[],
    ingredients: [
      { name: 'Lamb rack (Frenched)', quantity: 2, unit: 'rack', cost_cents: 5600 },
      { name: 'Dijon mustard', quantity: 3, unit: 'tbsp', cost_cents: 100 },
      { name: 'Fresh rosemary', quantity: 3, unit: 'sprig', cost_cents: 150 },
      { name: 'Fresh thyme', quantity: 6, unit: 'sprig', cost_cents: 150 },
      { name: 'Panko breadcrumbs', quantity: 1, unit: 'cup', cost_cents: 100 },
      { name: 'Red wine (Cabernet)', quantity: 1, unit: 'cup', cost_cents: 500 },
    ],
  },
  {
    name: 'Saffron Risotto with Roasted Mushrooms',
    category: 'pasta',
    description:
      'Creamy arborio risotto with saffron threads, mixed roasted mushrooms, and truffle oil.',
    method:
      '1. Toast saffron in warm stock. 2. Sauté shallots in butter, add rice, toast 2 min. 3. Add wine, stir until absorbed. 4. Ladle stock, stirring constantly, 18-20 min. 5. Roast mushrooms at 425°F. 6. Fold in parmesan and butter. 7. Top with mushrooms and truffle oil.',
    yield_quantity: 6,
    yield_unit: 'portion',
    prep_time_minutes: 15,
    cook_time_minutes: 25,
    total_time_minutes: 40,
    dietary_tags: ['vegetarian'],
    ingredients: [
      { name: 'Arborio rice', quantity: 2, unit: 'cup', cost_cents: 400 },
      { name: 'Saffron threads', quantity: 1, unit: 'pinch', cost_cents: 800 },
      {
        name: 'Mixed mushrooms (shiitake, oyster, maitake)',
        quantity: 1,
        unit: 'lb',
        cost_cents: 1200,
      },
      { name: 'Parmesan (Parmigiano Reggiano)', quantity: 4, unit: 'oz', cost_cents: 600 },
      { name: 'White truffle oil', quantity: 1, unit: 'tbsp', cost_cents: 500 },
    ],
  },
  {
    name: 'Grilled Octopus with Romesco',
    category: 'protein',
    description:
      'Tender braised then grilled octopus with smoky romesco sauce and fingerling potatoes.',
    method:
      '1. Braise octopus in court-bouillon for 45 min until tender. 2. Cool, then grill on high heat for char marks. 3. Roast red peppers, almonds, garlic for romesco. Blend with sherry vinegar and smoked paprika. 4. Roast fingerlings with olive oil. 5. Plate potatoes, octopus, drizzle romesco, finish with arugula.',
    yield_quantity: 6,
    yield_unit: 'portion',
    prep_time_minutes: 30,
    cook_time_minutes: 60,
    total_time_minutes: 90,
    dietary_tags: ['gluten-free'],
    ingredients: [
      { name: 'Whole octopus', quantity: 2, unit: 'lb', cost_cents: 3200 },
      { name: 'Roasted red peppers', quantity: 3, unit: 'each', cost_cents: 300 },
      { name: 'Marcona almonds', quantity: 0.5, unit: 'cup', cost_cents: 600 },
      { name: 'Fingerling potatoes', quantity: 1, unit: 'lb', cost_cents: 400 },
      { name: 'Smoked paprika', quantity: 1, unit: 'tbsp', cost_cents: 100 },
    ],
  },
  {
    name: 'Lemon Olive Oil Cake',
    category: 'dessert',
    description: 'Moist, fragrant cake with a tender crumb. Served with seasonal berry compote.',
    method:
      '1. Whisk eggs and sugar until thick. 2. Fold in olive oil, lemon zest, and juice. 3. Sift in flour, baking powder, salt. 4. Bake at 350°F for 35 min. 5. Macerate berries with sugar and lemon. 6. Serve cake warm with berry compote and a dollop of crème fraîche.',
    yield_quantity: 10,
    yield_unit: 'slice',
    prep_time_minutes: 15,
    cook_time_minutes: 35,
    total_time_minutes: 50,
    dietary_tags: ['vegetarian'],
    ingredients: [
      { name: 'Extra virgin olive oil', quantity: 0.75, unit: 'cup', cost_cents: 600 },
      { name: 'Lemons', quantity: 3, unit: 'each', cost_cents: 200 },
      { name: 'All-purpose flour', quantity: 1.5, unit: 'cup', cost_cents: 100 },
      { name: 'Eggs', quantity: 3, unit: 'each', cost_cents: 150 },
      { name: 'Mixed berries', quantity: 2, unit: 'cup', cost_cents: 800 },
    ],
  },
  {
    name: 'A5 Wagyu with Miso Eggplant',
    category: 'protein',
    description: 'Japanese A5 wagyu beef with sweet white miso-glazed eggplant and pickled ginger.',
    method:
      '1. Score eggplant, brush with white miso glaze. 2. Roast at 400°F until caramelized. 3. Slice wagyu thin, sear briefly on extremely hot surface. 4. Plate eggplant, arrange wagyu slices, garnish with pickled ginger and shiso.',
    yield_quantity: 4,
    yield_unit: 'portion',
    prep_time_minutes: 15,
    cook_time_minutes: 20,
    total_time_minutes: 35,
    dietary_tags: [] as string[],
    ingredients: [
      { name: 'A5 Wagyu beef (striploin)', quantity: 12, unit: 'oz', cost_cents: 12000 },
      { name: 'Japanese eggplant', quantity: 4, unit: 'each', cost_cents: 600 },
      { name: 'White miso paste', quantity: 3, unit: 'tbsp', cost_cents: 300 },
      { name: 'Pickled ginger', quantity: 2, unit: 'oz', cost_cents: 200 },
      { name: 'Shiso leaves', quantity: 8, unit: 'each', cost_cents: 400 },
    ],
  },
  {
    name: 'Chilled Pea Soup with Mint',
    category: 'soup',
    description: 'Bright, vibrant spring pea soup served chilled with mint oil and crème fraîche.',
    method:
      '1. Blanch peas for 2 min, shock in ice water. 2. Sauté shallots in butter. 3. Add peas and vegetable stock, simmer 5 min. 4. Blend until smooth, pass through fine sieve. 5. Chill completely. 6. Blend mint with olive oil for mint oil. 7. Serve with crème fraîche swirl and mint oil.',
    yield_quantity: 8,
    yield_unit: 'portion',
    prep_time_minutes: 10,
    cook_time_minutes: 10,
    total_time_minutes: 20,
    dietary_tags: ['vegetarian', 'gluten-free'],
    ingredients: [
      { name: 'Fresh English peas (shelled)', quantity: 2, unit: 'lb', cost_cents: 1000 },
      { name: 'Fresh mint', quantity: 1, unit: 'bunch', cost_cents: 200 },
      { name: 'Crème fraîche', quantity: 4, unit: 'oz', cost_cents: 400 },
      { name: 'Vegetable stock', quantity: 4, unit: 'cup', cost_cents: 200 },
      { name: 'Shallots', quantity: 2, unit: 'each', cost_cents: 150 },
    ],
  },
  {
    name: 'Dark Chocolate Avocado Mousse',
    category: 'dessert',
    description: 'Rich, silky vegan chocolate mousse using ripe avocados as the base.',
    method:
      '1. Melt dark chocolate over double boiler. 2. Blend ripe avocados until smooth. 3. Add melted chocolate, cocoa, maple syrup, vanilla. Blend until silky. 4. Chill 2 hours minimum. 5. Serve with flaky sea salt and a drizzle of olive oil.',
    yield_quantity: 8,
    yield_unit: 'portion',
    prep_time_minutes: 15,
    cook_time_minutes: 5,
    total_time_minutes: 20,
    dietary_tags: ['vegan', 'gluten-free'],
    ingredients: [
      { name: 'Dark chocolate (70%)', quantity: 8, unit: 'oz', cost_cents: 800 },
      { name: 'Ripe avocados', quantity: 3, unit: 'each', cost_cents: 600 },
      { name: 'Cocoa powder', quantity: 3, unit: 'tbsp', cost_cents: 200 },
      { name: 'Maple syrup', quantity: 0.25, unit: 'cup', cost_cents: 300 },
      { name: 'Flaky sea salt (Maldon)', quantity: 1, unit: 'tsp', cost_cents: 100 },
    ],
  },
  {
    name: 'Smoked Brisket with House BBQ Sauce',
    category: 'protein',
    description: 'Low-and-slow smoked beef brisket with a tangy-sweet house-made BBQ sauce.',
    method:
      '1. Trim brisket, apply dry rub generously. Refrigerate overnight. 2. Smoke at 225°F for 12-14 hours until 203°F internal. 3. Rest wrapped in butcher paper for 1 hour. 4. For sauce: sauté onion, add ketchup, vinegar, brown sugar, Worcestershire, spices. Simmer 20 min. 5. Slice against the grain, serve with sauce.',
    yield_quantity: 15,
    yield_unit: 'portion',
    prep_time_minutes: 30,
    cook_time_minutes: 840,
    total_time_minutes: 870,
    dietary_tags: ['gluten-free'],
    ingredients: [
      { name: 'Whole packer brisket', quantity: 14, unit: 'lb', cost_cents: 8400 },
      { name: 'Brown sugar', quantity: 0.5, unit: 'cup', cost_cents: 100 },
      { name: 'Smoked paprika', quantity: 3, unit: 'tbsp', cost_cents: 100 },
      { name: 'Apple cider vinegar', quantity: 0.5, unit: 'cup', cost_cents: 200 },
      { name: 'Hickory wood chunks', quantity: 4, unit: 'lb', cost_cents: 800 },
    ],
  },
  {
    name: 'Pistachio Baklava with Rose Water Ice Cream',
    category: 'dessert',
    description:
      'Layers of crispy phyllo, pistachio, and honey syrup paired with house-made rose water ice cream.',
    method:
      '1. Layer phyllo sheets, brushing each with melted butter. 2. Spread ground pistachios every 5 layers. 3. Cut into diamonds before baking at 350°F for 40 min. 4. Pour cooled honey-rose water syrup over hot baklava. 5. For ice cream: heat cream with rose water, churn in ice cream maker.',
    yield_quantity: 12,
    yield_unit: 'piece',
    prep_time_minutes: 45,
    cook_time_minutes: 40,
    total_time_minutes: 85,
    dietary_tags: ['vegetarian'],
    ingredients: [
      { name: 'Phyllo dough', quantity: 1, unit: 'package', cost_cents: 500 },
      { name: 'Pistachios (shelled)', quantity: 2, unit: 'cup', cost_cents: 1600 },
      { name: 'Honey', quantity: 1, unit: 'cup', cost_cents: 600 },
      { name: 'Rose water', quantity: 2, unit: 'tbsp', cost_cents: 300 },
      { name: 'Heavy cream (for ice cream)', quantity: 2, unit: 'cup', cost_cents: 400 },
    ],
  },
  {
    name: 'Heirloom Tomato Tartare',
    category: 'appetizer',
    description:
      'Diced heirloom tomatoes presented like a tartare with cashew ricotta and basil oil.',
    method:
      '1. Dice heirloom tomatoes, season with flaky salt and olive oil. 2. Blend soaked cashews with lemon juice and nutritional yeast for ricotta. 3. Blend basil with olive oil, strain. 4. Plate ricotta base, mold tomato tartare on top, drizzle basil oil, garnish with micro basil.',
    yield_quantity: 6,
    yield_unit: 'portion',
    prep_time_minutes: 20,
    cook_time_minutes: 0,
    total_time_minutes: 20,
    dietary_tags: ['vegan', 'gluten-free'],
    ingredients: [
      { name: 'Heirloom tomatoes (mixed)', quantity: 2, unit: 'lb', cost_cents: 1000 },
      { name: 'Raw cashews', quantity: 1, unit: 'cup', cost_cents: 500 },
      { name: 'Fresh basil', quantity: 1, unit: 'bunch', cost_cents: 200 },
      { name: 'Nutritional yeast', quantity: 2, unit: 'tbsp', cost_cents: 100 },
      { name: 'Extra virgin olive oil', quantity: 0.25, unit: 'cup', cost_cents: 300 },
    ],
  },
  {
    name: 'Cedar Plank Salmon with Dill Crème Fraîche',
    category: 'protein',
    description:
      'Wild-caught salmon roasted on soaked cedar planks with a fresh dill crème fraîche.',
    method:
      '1. Soak cedar planks 2 hours. 2. Season salmon with olive oil, lemon, salt, pepper. 3. Place on planks, grill or roast at 400°F for 15-18 min. 4. Mix crème fraîche with fresh dill, lemon zest, capers. 5. Serve salmon on plank with sauce on the side.',
    yield_quantity: 8,
    yield_unit: 'portion',
    prep_time_minutes: 15,
    cook_time_minutes: 18,
    total_time_minutes: 33,
    dietary_tags: ['gluten-free'],
    ingredients: [
      { name: 'Wild-caught salmon fillet', quantity: 3, unit: 'lb', cost_cents: 4500 },
      { name: 'Cedar planks', quantity: 2, unit: 'each', cost_cents: 800 },
      { name: 'Fresh dill', quantity: 1, unit: 'bunch', cost_cents: 200 },
      { name: 'Crème fraîche', quantity: 8, unit: 'oz', cost_cents: 600 },
      { name: 'Capers', quantity: 2, unit: 'tbsp', cost_cents: 200 },
    ],
  },
]

// ─── Quotes ──────────────────────────────────────────────────────────────────
// eventIndex references DEMO_EVENTS by position

export const DEMO_QUOTES = [
  // For proposed events
  { eventIndex: 13, status: 'sent', total_cents: 225000, valid_days: 14 }, // Easter Brunch
  { eventIndex: 14, status: 'sent', total_cents: 450000, valid_days: 14 }, // Q1 Team Kickoff
  // For accepted events
  { eventIndex: 11, status: 'accepted', total_cents: 525000, valid_days: 30 }, // Summer BBQ
  { eventIndex: 12, status: 'accepted', total_cents: 180000, valid_days: 30 }, // Mediterranean Tasting
  // For paid events
  { eventIndex: 9, status: 'accepted', total_cents: 200000, valid_days: 30 }, // Book Club Birthday
  { eventIndex: 10, status: 'accepted', total_cents: 350000, valid_days: 30 }, // Engagement Party
]

// ─── Ledger Entries ──────────────────────────────────────────────────────────
// For completed and paid events

export const DEMO_LEDGER_ENTRIES = [
  // Completed event 0: Winter Dinner Party
  {
    eventIndex: 0,
    entry_type: 'deposit',
    amount_cents: 50000,
    description: 'Deposit - Winter Dinner Party',
    daysAgo: 60,
    payment_method: 'venmo',
  },
  {
    eventIndex: 0,
    entry_type: 'payment',
    amount_cents: 150000,
    description: 'Final payment - Winter Dinner Party',
    daysAgo: 44,
    payment_method: 'venmo',
  },
  {
    eventIndex: 0,
    entry_type: 'tip',
    amount_cents: 40000,
    description: 'Gratuity - Winter Dinner Party',
    daysAgo: 44,
    payment_method: 'venmo',
  },
  // Completed event 1: Anniversary Dinner
  {
    eventIndex: 1,
    entry_type: 'deposit',
    amount_cents: 37500,
    description: 'Deposit - 25th Anniversary',
    daysAgo: 45,
    payment_method: 'zelle',
  },
  {
    eventIndex: 1,
    entry_type: 'payment',
    amount_cents: 112500,
    description: 'Final payment - 25th Anniversary',
    daysAgo: 29,
    payment_method: 'zelle',
  },
  {
    eventIndex: 1,
    entry_type: 'tip',
    amount_cents: 30000,
    description: 'Gratuity - 25th Anniversary',
    daysAgo: 29,
    payment_method: 'zelle',
  },
  // Completed event 2: Wine Pairing Dinner
  {
    eventIndex: 2,
    entry_type: 'deposit',
    amount_cents: 45000,
    description: 'Deposit - Wine Pairing',
    daysAgo: 35,
    payment_method: 'card',
  },
  {
    eventIndex: 2,
    entry_type: 'payment',
    amount_cents: 135000,
    description: 'Final payment - Wine Pairing',
    daysAgo: 20,
    payment_method: 'card',
  },
  // Completed event 3: Q4 Team Celebration
  {
    eventIndex: 3,
    entry_type: 'deposit',
    amount_cents: 112500,
    description: 'Deposit - Q4 Team Dinner',
    daysAgo: 28,
    payment_method: 'check',
  },
  {
    eventIndex: 3,
    entry_type: 'payment',
    amount_cents: 337500,
    description: 'Final payment - Q4 Team Dinner',
    daysAgo: 13,
    payment_method: 'check',
  },
  // Paid event: Book Club Birthday (deposit only)
  {
    eventIndex: 9,
    entry_type: 'deposit',
    amount_cents: 50000,
    description: 'Deposit - Book Club Birthday',
    daysAgo: 5,
    payment_method: 'venmo',
  },
  // Paid event: Engagement Party (deposit only)
  {
    eventIndex: 10,
    entry_type: 'deposit',
    amount_cents: 87500,
    description: 'Deposit - Engagement Party',
    daysAgo: 3,
    payment_method: 'zelle',
  },
]

// ─── Expenses ────────────────────────────────────────────────────────────────

export const DEMO_EXPENSES = [
  {
    eventIndex: 0,
    category: 'groceries',
    amount_cents: 42000,
    description: 'Whole Foods - Winter Dinner ingredients',
    daysAgo: 47,
  },
  {
    eventIndex: 0,
    category: 'groceries',
    amount_cents: 18500,
    description: 'Fish market - Scallops & seafood',
    daysAgo: 46,
  },
  {
    eventIndex: 1,
    category: 'groceries',
    amount_cents: 35000,
    description: 'Specialty market - Anniversary dinner',
    daysAgo: 32,
  },
  {
    eventIndex: 1,
    category: 'supplies',
    amount_cents: 8500,
    description: 'Disposable service ware',
    daysAgo: 31,
  },
  {
    eventIndex: 2,
    category: 'groceries',
    amount_cents: 52000,
    description: 'Premium proteins & produce - Wine dinner',
    daysAgo: 23,
  },
  {
    eventIndex: 3,
    category: 'groceries',
    amount_cents: 78000,
    description: 'Costco + Whole Foods - Team dinner (20 pax)',
    daysAgo: 16,
  },
  {
    eventIndex: 3,
    category: 'labor',
    amount_cents: 25000,
    description: 'Sous chef - Q4 Team event',
    daysAgo: 14,
  },
  {
    eventIndex: null,
    category: 'equipment',
    amount_cents: 15000,
    description: 'New knife set (Shun Premier)',
    daysAgo: 40,
  },
]

// ─── Loyalty Config ──────────────────────────────────────────────────────────

export const DEMO_LOYALTY_CONFIG = {
  is_active: true,
  points_per_dollar: 1,
  points_per_event: 50,
  points_per_guest: 5,
  referral_points: 150,
  welcome_points: 100,
  earn_mode: 'all',
  program_mode: 'points',
  tier_bronze_min: 0,
  tier_silver_min: 500,
  tier_gold_min: 1500,
  tier_platinum_min: 5000,
  bonus_large_party_points: 100,
  bonus_large_party_threshold: 15,
}

// ─── Loyalty Transactions ───────────────────────────────────────────────────
// clientIndex references DEMO_CLIENTS by position
// eventIndex references DEMO_EVENTS by position (null for non-event bonuses)

export const DEMO_LOYALTY_TRANSACTIONS = [
  // Client 0 (Sarah & Michael Chen) - VIP, 4 events worth of points
  {
    clientIndex: 0,
    type: 'bonus',
    points: 100,
    description: 'Welcome bonus',
    eventIndex: null,
    daysAgo: 180,
  },
  {
    clientIndex: 0,
    type: 'earned',
    points: 200,
    description: 'Winter Dinner Party ($2,000)',
    eventIndex: 0,
    daysAgo: 45,
  },
  {
    clientIndex: 0,
    type: 'earned',
    points: 40,
    description: '8 guests (Winter Dinner)',
    eventIndex: 0,
    daysAgo: 45,
  },
  {
    clientIndex: 0,
    type: 'earned',
    points: 50,
    description: 'Event completion bonus',
    eventIndex: 0,
    daysAgo: 45,
  },
  {
    clientIndex: 0,
    type: 'bonus',
    points: 150,
    description: 'Referral: James Whitfield',
    eventIndex: null,
    daysAgo: 120,
  },
  {
    clientIndex: 0,
    type: 'bonus',
    points: 150,
    description: 'Referral: Dr. Marcus Washington',
    eventIndex: null,
    daysAgo: 90,
  },
  {
    clientIndex: 0,
    type: 'bonus',
    points: 150,
    description: 'Referral: David & Kim Park',
    eventIndex: null,
    daysAgo: 60,
  },
  {
    clientIndex: 0,
    type: 'redeemed',
    points: -200,
    description: 'Redeemed: complimentary wine pairing',
    eventIndex: null,
    daysAgo: 50,
  },

  // Client 1 (Whitfields) - regular client
  {
    clientIndex: 1,
    type: 'bonus',
    points: 100,
    description: 'Welcome bonus',
    eventIndex: null,
    daysAgo: 150,
  },
  {
    clientIndex: 1,
    type: 'earned',
    points: 150,
    description: '25th Anniversary ($1,500)',
    eventIndex: 1,
    daysAgo: 30,
  },
  {
    clientIndex: 1,
    type: 'earned',
    points: 30,
    description: '6 guests (Anniversary)',
    eventIndex: 1,
    daysAgo: 30,
  },
  {
    clientIndex: 1,
    type: 'earned',
    points: 50,
    description: 'Event completion bonus',
    eventIndex: 1,
    daysAgo: 30,
  },

  // Client 2 (Anika Patel) - corporate
  {
    clientIndex: 2,
    type: 'bonus',
    points: 100,
    description: 'Welcome bonus',
    eventIndex: null,
    daysAgo: 100,
  },
  {
    clientIndex: 2,
    type: 'earned',
    points: 450,
    description: 'Q4 Team Celebration ($4,500)',
    eventIndex: 3,
    daysAgo: 14,
  },
  {
    clientIndex: 2,
    type: 'earned',
    points: 100,
    description: '20 guests (large party bonus)',
    eventIndex: 3,
    daysAgo: 14,
  },
  {
    clientIndex: 2,
    type: 'earned',
    points: 50,
    description: 'Event completion bonus',
    eventIndex: 3,
    daysAgo: 14,
  },

  // Client 6 (Dr. Washington) - wine enthusiast
  {
    clientIndex: 6,
    type: 'bonus',
    points: 100,
    description: 'Welcome bonus',
    eventIndex: null,
    daysAgo: 90,
  },
  {
    clientIndex: 6,
    type: 'earned',
    points: 180,
    description: 'Wine Pairing Dinner ($1,800)',
    eventIndex: 2,
    daysAgo: 21,
  },
  {
    clientIndex: 6,
    type: 'earned',
    points: 20,
    description: '4 guests (Wine Pairing)',
    eventIndex: 2,
    daysAgo: 21,
  },
  {
    clientIndex: 6,
    type: 'earned',
    points: 50,
    description: 'Event completion bonus',
    eventIndex: 2,
    daysAgo: 21,
  },
]

// ─── Client Loyalty State ───────────────────────────────────────────────────
// Final point balances and tiers for each client with loyalty history

export const DEMO_CLIENT_LOYALTY = [
  { clientIndex: 0, loyalty_points: 640, loyalty_tier: 'gold' },
  { clientIndex: 1, loyalty_points: 330, loyalty_tier: 'bronze' },
  { clientIndex: 2, loyalty_points: 700, loyalty_tier: 'silver' },
  { clientIndex: 6, loyalty_points: 350, loyalty_tier: 'bronze' },
]

// ─── Staff Assignments ──────────────────────────────────────────────────────
// Assigns demo staff (Maria Santos) to upcoming and recent events.
// eventIndex references DEMO_EVENTS by position.

export const DEMO_STAFF_ASSIGNMENTS = [
  // Completed events
  {
    eventIndex: 0,
    role_override: 'sous_chef',
    status: 'completed',
    scheduled_hours: 6,
    actual_hours: 6.5,
    notes: 'Handled all appetizer prep and plating. Excellent work.',
  },
  {
    eventIndex: 3,
    role_override: 'sous_chef',
    status: 'completed',
    scheduled_hours: 8,
    actual_hours: 8,
    notes: 'Managed the buffet line and salad station for 20 guests.',
  },
  // In-progress event
  {
    eventIndex: 6,
    role_override: 'sous_chef',
    status: 'confirmed',
    scheduled_hours: 7,
    actual_hours: null,
    notes: 'Appetizer station. Arrive by 4pm for mise en place.',
  },
  // Upcoming confirmed
  {
    eventIndex: 7,
    role_override: 'sous_chef',
    status: 'scheduled',
    scheduled_hours: 6,
    actual_hours: null,
    notes: 'Spring Dinner Party. Prep and plating.',
  },
  {
    eventIndex: 8,
    role_override: 'sous_chef',
    status: 'scheduled',
    scheduled_hours: 8,
    actual_hours: null,
    notes: 'Charity Gala. Full kitchen support for 12 guests.',
  },
]

// ─── Partner Referrals ──────────────────────────────────────────────────────
// Tracks referrals from The Langham to demo chef's pipeline.
// clientIndex references DEMO_CLIENTS. eventIndex references DEMO_EVENTS (null if no event yet).

export const DEMO_PARTNER_REFERRALS = [
  { clientIndex: 9, status: 'converted', eventIndex: 8, daysAgo: 30, commission_cents: 36000 },
  { clientIndex: 9, status: 'converted', eventIndex: 16, daysAgo: 15, commission_cents: 0 },
  { clientIndex: 3, status: 'converted', eventIndex: 6, daysAgo: 10, commission_cents: 25000 },
]

// ─── Calendar Availability Signals ───────────────────────────────────────────

export const DEMO_CALENDAR_ENTRIES = [
  { daysOut: 8, public_note: 'Open for intimate dinner (2-6 guests)', type: 'target_booking' },
  {
    daysOut: 15,
    public_note: 'Available - perfect for a weekend gathering',
    type: 'target_booking',
  },
  { daysOut: 22, public_note: 'Open for private dining or tasting menu', type: 'target_booking' },
  { daysOut: 29, public_note: 'Weekend available - book now', type: 'target_booking' },
  { daysOut: 36, public_note: 'Open for events up to 20 guests', type: 'target_booking' },
  {
    daysOut: 43,
    public_note: 'Last weekend of the month - still available',
    type: 'target_booking',
  },
]
