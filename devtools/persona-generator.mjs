#!/usr/bin/env node

/**
 * Persona Generator
 *
 * Generates persona files using Ollama from seed categories.
 * Validates each one via persona-validator. Saves valid personas to Uncompleted/.
 *
 * Usage:
 *   node devtools/persona-generator.mjs                          # 1 random persona
 *   node devtools/persona-generator.mjs --count 5                # 5 personas
 *   node devtools/persona-generator.mjs --category farm-to-table # specific category
 *   node devtools/persona-generator.mjs --seed "Gordon Ramsay"   # celebrity seed
 *   node devtools/persona-generator.mjs --count 50 --spread      # spread across categories
 *   node devtools/persona-generator.mjs --model hermes3:8b       # specific model
 *   node devtools/persona-generator.mjs --dry-run                # generate + validate, don't save
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { resolve, basename, dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { validatePersonaContent } from './persona-validator.mjs';
import { vaultStore } from './persona-vault.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// --- Seed categories ---

const PERSONA_TYPES = ['Chef', 'Client', 'Guest', 'Vendor', 'Staff', 'Partner', 'Public'];

const SEED_CATEGORIES = {
  Chef: [
    {
      id: 'multi-unit-empire',
      label: 'Multi-Unit Restaurant Empire',
      seeds: ['Gordon Ramsay', 'Jose Andres', 'Danny Meyer', 'David Chang'],
      constraints: 'Multiple locations, delegation, brand management, high revenue, large teams',
    },
    {
      id: 'farm-to-table',
      label: 'Farm-to-Table Purist',
      seeds: ['Alice Waters', 'Dan Barber', 'Sean Brock'],
      constraints: 'Sourcing obsession, seasonal menus, supplier relationships, small-medium scale',
    },
    {
      id: 'street-food-truck',
      label: 'Street Food / Food Truck',
      seeds: ['Roy Choi', 'Aaron Sanchez'],
      constraints: 'High volume, low margin, mobile, weather-dependent, cash-heavy, permit chaos',
    },
    {
      id: 'private-personal-chef',
      label: 'Private / Personal Chef',
      seeds: ['fictional - generate realistic'],
      constraints: 'Solo or tiny team, 2-8 clients, retainer model, discretion, dietary management, travel',
    },
    {
      id: 'catering-operator',
      label: 'Catering Company',
      seeds: ['fictional - generate realistic'],
      constraints: 'Large events 50-500 guests, staffing, logistics, costing per head, seasonal demand',
    },
    {
      id: 'culinary-educator',
      label: 'Culinary Educator / School',
      seeds: ['Jacques Pepin', 'Samin Nosrat', 'Thomas Keller'],
      constraints: 'Recipe documentation, technique library, class scheduling as events, menu planning for teaching sessions, ingredient sourcing for demos, costing per class, managing bookings',
    },
    {
      id: 'cannabis-culinary',
      label: 'Cannabis Culinary',
      seeds: ['fictional - generate realistic'],
      constraints: 'Compliance, dosing precision, guest safety, documentation, legal variation by state',
    },
    {
      id: 'meal-prep-subscription',
      label: 'Meal Prep / Subscription Service',
      seeds: ['fictional - generate realistic'],
      constraints: 'Batch production, delivery logistics, recurring clients, nutritional tracking, packaging',
    },
    {
      id: 'popup-supper-club',
      label: 'Pop-Up / Supper Club',
      seeds: ['fictional - generate realistic'],
      constraints: 'Ephemeral events, waitlists, venue scouting, one-night menus, controlled access',
    },
    {
      id: 'medical-dietary',
      label: 'Medical / Dietary Specialist',
      seeds: ['fictional - generate realistic'],
      constraints: 'Health conditions, doctor coordination, allergen enforcement, liability, documentation',
    },
    {
      id: 'pastry-bakery',
      label: 'Pastry Chef / Bakery',
      seeds: ['Dominique Ansel', 'Christina Tosi'],
      constraints: 'Production scheduling, perishability, retail + wholesale, recipe precision, seasonal items',
    },
    {
      id: 'institutional-relief',
      label: 'Institutional / Disaster Relief',
      seeds: ['Jose Andres (WCK)', 'school lunch programs'],
      constraints: 'Massive scale, nutrition requirements, cost constraints, regulatory compliance, volunteers',
    },
    {
      id: 'celebrity-media',
      label: 'Celebrity Chef / Media Personality',
      seeds: ['Guy Fieri', 'Ina Garten', 'Alton Brown'],
      constraints: 'Brand management, content production, licensing, restaurant oversight from distance',
    },
    {
      id: 'ghost-kitchen',
      label: 'Ghost Kitchen / Virtual Brand',
      seeds: ['fictional - generate realistic'],
      constraints: 'No dining room, delivery-only, multiple brands from one kitchen, data-driven menu optimization',
    },
    {
      id: 'hotel-resort',
      label: 'Hotel / Resort Executive Chef',
      seeds: ['fictional - generate realistic'],
      constraints: 'Multiple outlets, banquets, room service, cost control, large brigade, seasonal tourism',
    },
    {
      id: 'food-scientist',
      label: 'Food Scientist / R&D Chef',
      seeds: ['Nathan Myhrvold', 'Heston Blumenthal'],
      constraints: 'Experimentation, documentation, equipment tracking, ingredient science, long development cycles',
    },
  ],
  Client: [
    {
      id: 'high-net-worth-private-dinner-client',
      label: 'High-Net-Worth Private Dinner Client',
      seeds: ['fictional - generate realistic'],
      constraints: 'Private dinners, high expectations, concierge communication, deposits, contracts, privacy, dietary preferences',
    },
    {
      id: 'corporate-event-planner',
      label: 'Corporate Event Planner',
      seeds: ['fictional - generate realistic'],
      constraints: 'Recurring company events, approvals, budgets, guest lists, invoices, venue coordination, changing headcount',
    },
    {
      id: 'budget-family-meal-prep-client',
      label: 'Budget Family Meal Prep Client',
      seeds: ['fictional - generate realistic'],
      constraints: 'Weekly meal prep, allergies, changing preferences, strict budget, payment timing, family feedback',
    },
  ],
  Guest: [
    {
      id: 'dietary-restricted-guest',
      label: 'Dietary-Restricted Guest',
      seeds: ['fictional - generate realistic'],
      constraints: 'Allergies, dietary survey accuracy, menu visibility, accommodation confirmation, event trust',
    },
    {
      id: 'first-time-private-dining-guest',
      label: 'First-Time Private Dining Guest',
      seeds: ['fictional - generate realistic'],
      constraints: 'Unfamiliar RSVP flow, ticket details, seating, check-in expectations, event communication',
    },
    {
      id: 'frequent-farm-dinner-attendee',
      label: 'Frequent Farm Dinner Attendee',
      seeds: ['fictional - generate realistic'],
      constraints: 'Repeat attendance, waitlists, seasonal menus, farm location logistics, post-event feedback',
    },
  ],
  Vendor: [
    {
      id: 'local-farm-supplier',
      label: 'Local Farm Supplier',
      seeds: ['fictional - generate realistic'],
      constraints: 'Seasonal availability, produce quality, order changes, delivery windows, wholesale pricing, invoices',
    },
    {
      id: 'specialty-ingredient-distributor',
      label: 'Specialty Ingredient Distributor',
      seeds: ['fictional - generate realistic'],
      constraints: 'Catalog complexity, substitutions, bulk orders, freshness, minimums, chef communication',
    },
    {
      id: 'equipment-rental-company',
      label: 'Equipment Rental Company',
      seeds: ['fictional - generate realistic'],
      constraints: 'Event rentals, availability, delivery, pickup, damage deposits, venue coordination, invoices',
    },
  ],
  Staff: [
    {
      id: 'event-service-captain',
      label: 'Event Service Captain',
      seeds: ['fictional - generate realistic'],
      constraints: 'Shift assignments, guest service, briefing details, uniform requirements, cleanup handoff, team leads',
    },
    {
      id: 'prep-kitchen-assistant',
      label: 'Prep Kitchen Assistant',
      seeds: ['fictional - generate realistic'],
      constraints: 'Prep lists, schedule changes, training gaps, kitchen roles, certification, ingredient handoff',
    },
    {
      id: 'rotating-sous-chef',
      label: 'Rotating Sous Chef',
      seeds: ['fictional - generate realistic'],
      constraints: 'Multiple chefs, recipe notes, service timing, team availability, lead assignments, kitchen standards',
    },
  ],
  Partner: [
    {
      id: 'venue-collaboration-partner',
      label: 'Venue Collaboration Partner',
      seeds: ['fictional - generate realistic'],
      constraints: 'Shared events, contracts, revenue share, promotion, guest handoff, venue availability',
    },
    {
      id: 'farm-dinner-cohost',
      label: 'Farm Dinner Co-host',
      seeds: ['fictional - generate realistic'],
      constraints: 'Farm collaboration, seasonal menus, broadcast lists, ticketing, joint promotion, referral tracking',
    },
    {
      id: 'brand-sponsorship-partner',
      label: 'Brand Sponsorship Partner',
      seeds: ['fictional - generate realistic'],
      constraints: 'Cross-sell offers, partnership terms, event placement, reporting, referrals, contract approvals',
    },
  ],
  Public: [
    {
      id: 'local-food-explorer',
      label: 'Local Food Explorer',
      seeds: ['fictional - generate realistic'],
      constraints: 'Chef discovery, cuisine browsing, ratings, location filters, price range, menu previews',
    },
    {
      id: 'search-driven-event-booker',
      label: 'Search-Driven Event Booker',
      seeds: ['fictional - generate realistic'],
      constraints: 'Public search, availability, chef profiles, inquiry flow, contact confidence, reviews',
    },
    {
      id: 'review-focused-browser',
      label: 'Review-Focused Browser',
      seeds: ['fictional - generate realistic'],
      constraints: 'Portfolio review, ratings, menu comparison, booking trust, location fit, contact timing',
    },
  ],
};

// --- CLI ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    count: 1,
    type: 'Chef',
    category: null,
    seed: null,
    spread: false,
    targetCategories: null,
    model: process.env.PERSONA_GENERATOR_MODEL || 'hermes3:8b',
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count': opts.count = parseInt(args[++i], 10) || 1; break;
      case '--type': opts.type = normalizePersonaType(args[++i]); break;
      case '--category': opts.category = args[++i]; break;
      case '--seed': opts.seed = args[++i]; break;
      case '--spread': opts.spread = true; break;
      case '--target-categories':
        if (args[i + 1]) opts.targetCategories = args[++i].split(',').map(s => s.trim());
        break;
      case '--model': opts.model = args[++i]; break;
      case '--ollama-url': opts.ollamaUrl = args[++i]; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return opts;
}

function normalizePersonaType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const found = PERSONA_TYPES.find(type => type.toLowerCase() === normalized);
  if (!found) {
    console.error(`ERROR: Unknown persona type "${value}". Valid types: ${PERSONA_TYPES.join(', ')}`);
    process.exit(1);
  }
  return found;
}

function printHelp() {
  console.log('Usage: node devtools/persona-generator.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --count <N>          Generate N personas (default: 1)');
  console.log('  --type <type>        Persona type: Chef, Client, Guest, Vendor, Staff, Partner, Public (default: Chef)');
  console.log('  --category <id>      Use specific seed category');
  console.log('  --seed "Name"        Use specific celebrity seed');
  console.log('  --spread             Spread across all categories');
  console.log('  --model <name>       Ollama model (default: hermes3:8b)');
  console.log('  --ollama-url <url>   Ollama URL (default: http://localhost:11434)');
  console.log('  --dry-run            Generate + validate but do not save');
  console.log('');
  console.log('Categories:');
  for (const type of PERSONA_TYPES) {
    console.log(`  ${type}:`);
    for (const cat of SEED_CATEGORIES[type]) {
      console.log(`    ${cat.id.padEnd(36)} ${cat.label}`);
    }
  }
}

// --- Deduplication ---

function collectExistingPersonaNames() {
  const names = new Set();
  const baseDirs = [
    join(ROOT, 'Chef Flow Personas', 'Completed'),
    join(ROOT, 'Chef Flow Personas', 'Uncompleted'),
    join(ROOT, 'Chef Flow Personas', 'Failed'),
  ];

  for (const base of baseDirs) {
    if (!existsSync(base)) continue;
    try {
      for (const typeDir of readdirSync(base)) {
        const typePath = join(base, typeDir);
        try {
          for (const f of readdirSync(typePath)) {
            const ext = extname(f).toLowerCase();
            if (ext === '.txt' || ext === '.md') {
              names.add(f.replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '-'));
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return names;
}

function isNameTaken(name, existingNames) {
  const norm = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
  return existingNames.has(norm);
}

// --- Category/seed selection ---

function pickCategory(opts, index) {
  const categories = SEED_CATEGORIES[opts.type] || SEED_CATEGORIES.Chef;

  if (opts.category) {
    const cat = categories.find(c => c.id === opts.category);
    if (!cat) {
      console.error(`ERROR: Unknown ${opts.type} category "${opts.category}". Use --help to see options.`);
      process.exit(1);
    }
    return cat;
  }

  if (opts.spread) {
    return categories[index % categories.length];
  }

  return categories[Math.floor(Math.random() * categories.length)];
}

function pickSeed(category, existingNames) {
  if (category.seeds.length === 1 && category.seeds[0].startsWith('fictional')) {
    return null; // Will instruct LLM to generate a fictional name
  }

  // Shuffle seeds and pick first non-duplicate
  const shuffled = [...category.seeds].sort(() => Math.random() - 0.5);
  for (const seed of shuffled) {
    if (!isNameTaken(seed, existingNames)) return seed;
  }

  // All seeds taken, return with variation modifier
  const base = shuffled[0];
  const variations = [
    `${base}'s early career days`,
    `${base} as a startup operator`,
    `${base}'s second restaurant era`,
    `${base} running a pop-up`,
    `${base} in a small-town market`,
  ];
  return variations[Math.floor(Math.random() * variations.length)];
}

// --- Prompt building ---

const TYPE_PROMPT_CONTEXT = {
  Chef: {
    actor: 'food service operator',
    headerRole: '{Specific Role}',
    challenge: "How does this chef's operation challenge ChefFlow?",
    realityBullets: [
      'I manage **[specific number]** [clients/locations/events] [details]',
      '[Revenue model with dollar amounts]',
      '[Team size and structure]',
      '[Geographic scope with specific location]',
      '[Current tech setup - what they actually use today]',
    ],
  },
  Client: {
    actor: 'ChefFlow client or buyer',
    headerRole: '{Specific client role}',
    challenge: "How does this client's booking, payment, and communication journey challenge ChefFlow?",
    realityBullets: [
      'I book or manage **[specific number]** private dining, catering, or meal prep events per [period]',
      '[Budget, deposit, quote, or payment details with dollar amounts]',
      '[Household, company, family, or stakeholder group involved]',
      '[Venue, date, headcount, guest list, dietary, and preference complexity]',
      '[Current booking and communication setup - texts, email, spreadsheets, portal, or nothing]',
    ],
  },
  Guest: {
    actor: 'event guest',
    headerRole: '{Specific guest role}',
    challenge: "How does this guest's RSVP, dietary, event, and feedback experience challenge ChefFlow?",
    realityBullets: [
      'I attend **[specific number]** private dining, farm dinner, or ticketed events per [period]',
      '[Ticket, RSVP, travel, accommodation, or event spend details with dollar amounts]',
      '[Dietary, allergy, seating, accessibility, or preference details]',
      '[Event context with specific location, venue, date, and headcount]',
      '[Current communication setup - texts, email, links, surveys, or no reliable channel]',
    ],
  },
  Vendor: {
    actor: 'ChefFlow vendor or supplier',
    headerRole: '{Specific vendor role}',
    challenge: "How does this vendor's fulfillment, pricing, delivery, and invoicing workflow challenge ChefFlow?",
    realityBullets: [
      'I fulfill **[specific number]** chef orders, deliveries, or event rentals per [period]',
      '[Wholesale pricing, invoice, minimum order, deposit, or payment details with dollar amounts]',
      '[Catalog, inventory, availability, freshness, seasonal, or equipment constraints]',
      '[Delivery, pickup, venue, farm, warehouse, or service geography with specific location]',
      '[Current ordering and communication setup - calls, texts, PDFs, spreadsheets, or portal]',
    ],
  },
  Staff: {
    actor: 'ChefFlow staff member',
    headerRole: '{Specific staff role}',
    challenge: "How does this staff member's schedule, assignment, prep, and service workflow challenge ChefFlow?",
    realityBullets: [
      'I work **[specific number]** shifts, events, kitchens, or service roles per [period]',
      '[Pay, hours, certification, or assignment details with numbers]',
      '[Team structure, lead, role, training, uniform, or availability constraints]',
      '[Kitchen, venue, service, prep, cleanup, or geographic scope with specific location]',
      '[Current briefing and scheduling setup - texts, spreadsheets, printed sheets, or verbal updates]',
    ],
  },
  Partner: {
    actor: 'ChefFlow partner',
    headerRole: '{Specific partner role}',
    challenge: "How does this partner's collaboration, venue, promotion, referral, and revenue share workflow challenge ChefFlow?",
    realityBullets: [
      'I co-host, promote, or support **[specific number]** events, referrals, or partnerships per [period]',
      '[Revenue share, contract, promotion, referral, or payment details with dollar amounts]',
      '[Venue, farm, brand, broadcast, joint offer, or collaboration details]',
      '[Shared event location, calendar, guest list, or availability constraints]',
      '[Current coordination setup - email, texts, shared docs, contracts, or no single source of truth]',
    ],
  },
  Public: {
    actor: 'public discovery user',
    headerRole: '{Specific public user role}',
    challenge: "How does this public user's discovery, search, profile review, inquiry, and booking trust journey challenge ChefFlow?",
    realityBullets: [
      'I search for or compare **[specific number]** chefs, events, cuisines, or menus per [period]',
      '[Budget, price range, ticket, or booking details with dollar amounts]',
      '[Location, availability, review, rating, cuisine, menu, or portfolio needs]',
      '[Inquiry, contact, referral, or booking context with specific venue or city]',
      '[Current discovery setup - search engines, social media, referrals, review sites, or scattered links]',
    ],
  },
};

function buildPrompt(category, seed, type, opts = {}) {
  const context = TYPE_PROMPT_CONTEXT[type] || TYPE_PROMPT_CONTEXT.Chef;
  const seedInstruction = seed
    ? `Base this ${type} persona on **${seed}**. Use their actual context, incentives, scale, and constraints as the foundation. Adapt to operational reality, not media personality.`
    : `Create a realistic fictional ${type} persona for the "${category.label}" category. Give them a full name, specific location, and grounded business details.`;

  const businessReality = context.realityBullets.map(item => `* ${item}`).join('\n');
  let constraints = category.constraints;

  if (opts.targetCategories && opts.targetCategories.length > 0) {
    const categoryDescriptions = {
      'event-lifecycle': 'event lifecycle management, ephemeral events, pop-ups',
      'access-control': 'access control, invite-only, waitlists, tiered permissions',
      'ticketing-drops': 'ticketing, controlled releases, demand management',
      'audience-community': 'audience tracking, repeat guests, community curation',
      'location-venue': 'location adaptation, venue constraints, mobile setups',
      'payment-financial': 'payment workflows, billing, pricing, deposits, invoices',
      'compliance-legal': 'compliance, legal, regulation, audit trails, licensing',
      'dosing-cannabis': 'cannabis dosing, THC/CBD precision, compliance',
      'dietary-medical': 'dietary restrictions, allergies, medical constraints',
      'recipe-menu': 'recipe management, menu building, ingredient tracking, prep',
      'scheduling-calendar': 'scheduling, calendar, booking, availability, conflicts',
      'communication': 'client communication, notifications, messaging',
      'staffing-team': 'staff management, team coordination, delegation',
      'sourcing-supply': 'sourcing, suppliers, procurement, farm relationships',
      'costing-margin': 'food cost, margins, per-head costing, waste tracking',
      'reporting-analytics': 'reporting, analytics, dashboards, performance metrics',
      'onboarding-ux': 'onboarding, first-time experience, learning curve',
      'scaling-multi': 'scaling, multi-location, growth, franchise',
      'delivery-logistics': 'delivery, logistics, transport, packaging',
      'documentation-records': 'documentation, records, archives, audit trails',
    };
    
    const targetDescs = opts.targetCategories
      .map(id => categoryDescriptions[id] || id)
      .join('; ');
    
    constraints += `. IMPORTANT: This persona MUST have strong operational needs in these areas: ${targetDescs}. Design their business reality so these categories are central pain points.`;
  }

  return `You are writing a detailed persona profile for stress-testing a food service operations platform called ChefFlow.

${seedInstruction}

Persona type: ${type}
Category: ${category.label}
Constraints: ${constraints}
Perspective: ${context.challenge}

Write the persona using EXACTLY this structure. First person voice. Be specific, grounded, and detailed. Minimum 600 words.

---

**${type} Profile: "{Full Name}" - ${context.headerRole} ({2-3 word descriptor})**

[2-3 sentences introducing who they are and what they do. First person.]

### Business Reality

Right now:
${businessReality}

---

### Primary Failure: [Specific Title]

[Describe the ONE biggest operational problem. Not a feature request. A real business pain point. What happens because this problem exists? What does it cost them? 3-5 sentences minimum.]

---

### Structural Issue: [Title 1]

[Problem + current workaround + what breaks. 2-3 sentences.]

---

### Structural Issue: [Title 2]

[Problem + current workaround + what breaks. 2-3 sentences.]

---

### Structural Issue: [Title 3]

[Problem + current workaround + what breaks. 2-3 sentences.]

---

### Structural Issue: [Title 4]

[Problem + current workaround + what breaks. 2-3 sentences.]

---

### Psychological Model

I optimize for: [what they prioritize]
I refuse to compromise on: [non-negotiable]
I avoid: [tech/processes they hate]
I evaluate tools by: [how they judge new software]

[2-3 more sentences on how they think and make decisions.]

---

### Pass / Fail Conditions

For this system to work for me, it must:

1. [The system must (specific, testable action)]
2. [The system must (specific, testable action)]
3. [The system must (specific, testable action)]
4. [The system must (specific, testable action)]
5. [The system must (specific, testable action)]
6. [The system must (specific, testable action)]
7. [The system must (specific, testable action)]

---

CRITICAL RULES:
- Write in first person
- Use SPECIFIC numbers everywhere (client count, revenue, team size, event frequency)
- Describe REAL workarounds for every gap (paper planners, text messages, spreadsheets, nothing)
- Minimum 3 structural issues with distinct titles
- Minimum 5 testable pass/fail conditions written as "The system must [verb] [specific thing]"
- Do NOT write generic pain points. Every gap must be specific to this ${context.actor}
- Do NOT write software feature requests. Write business problems with real consequences
- The identity header MUST start with **${type} Profile:

PRODUCT DRIFT RULES (MANDATORY):
ChefFlow is a food service operations platform: events, clients, guests, recipes, menus, ingredients, pricing, costing, sourcing, scheduling, staff, vendors, compliance, tickets, RSVPs, bookings, public discovery, and partner collaboration.
ChefFlow is NOT: an LMS, a marketplace, a warehouse system, a social network, a generic CRM, or project management software.
- NEVER include pass/fail conditions about: student tracking, skill progression, learning paths, curriculum systems, enrollment, grades, seller dashboards, fleet tracking, supply chain management, lead scoring, sales pipelines, or kanban boards.
- If the persona involves teaching/education (e.g. culinary educator), frame ALL problems as chef ops problems: class scheduling = event management, recipe library = recipe documentation, class costing = event costing, student bookings = client bookings.
- Every pass/fail condition must map to something ChefFlow would handle for a ${type}. If it sounds like it belongs in a different product category, rewrite it as a ChefFlow problem or remove it.`;
}

// --- Ollama streaming ---

async function callOllama(prompt, model, ollamaUrl, temperature = 0.7) {
  let response;
  try {
    response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { temperature, num_predict: 4000 },
      }),
    });
  } catch (err) {
    console.error(`ERROR: Ollama not reachable at ${ollamaUrl}. Is it running?`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`ERROR: Ollama returned HTTP ${response.status}. Model "${model}" available?`);
    process.exit(1);
  }

  let full = '';
  let tokenCount = 0;
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        if (chunk.response) {
          full += chunk.response;
          tokenCount++;
          if (tokenCount % 50 === 0) {
            process.stderr.write(`\r[generator] ${tokenCount} tokens...`);
          }
        }
        if (chunk.done) {
          process.stderr.write(`\r[generator] ${tokenCount} tokens, done.     \n`);
        }
      } catch { /* skip malformed */ }
    }
  }

  return full;
}

// --- Slug ---

function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// --- Main generation loop ---

async function generateOne(opts, index, existingNames) {
  const category = pickCategory(opts, index);
  const seed = opts.seed || pickSeed(category, existingNames);

  const seedLabel = seed || `fictional ${category.label}`;
  process.stderr.write(`[generator] #${index + 1}: ${opts.type} / ${category.label} / ${seedLabel}\n`);

  // Build prompt
  const prompt = buildPrompt(category, seed, opts.type, opts);

  // Call Ollama
  let text = await callOllama(prompt, opts.model, opts.ollamaUrl, 0.7);

  // Validate
  let result = validatePersonaContent(text, { name: seed || 'Unknown', type: opts.type });

  if (!result.valid) {
    process.stderr.write(`[generator] Validation failed (score: ${result.score}). Retrying with temperature 0.1...\n`);
    if (result.rejection_reasons.length > 0) {
      process.stderr.write(`[generator] Reasons: ${result.rejection_reasons.join('; ')}\n`);
    }

    // Retry with lower temperature and explicit fix instructions
    const fixPrompt = prompt + `\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Issues: ${result.rejection_reasons.join('. ')}. Missing sections: ${result.sections_missing.join(', ')}. Fix these issues. Follow the template EXACTLY.`;
    text = await callOllama(fixPrompt, opts.model, opts.ollamaUrl, 0.1);
    result = validatePersonaContent(text, { name: seed || 'Unknown', type: opts.type });
  }

  // Re-extract name from generated content
  const nameMatch = text.match(/\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:\s*"?([^"*\n]+)"?\s*/i);
  const personaName = nameMatch ? nameMatch[1].replace(/\s*[-].*/,'').trim() : (seed || `fictional-${category.id}-${index}`);

  // Determine type from content
  const typeMatch = text.match(/\*\*(Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:/i);
  const personaType = typeMatch ? typeMatch[1] : opts.type;

  const slug = makeSlug(personaName);

  if (result.valid) {
    if (opts.dryRun) {
      console.log(`[generator] VALID (dry-run, not saved): ${personaName} (${result.score}/100)`);
      console.log('---');
      console.log(text.trim());
      console.log('---');
    } else {
      // Save to Uncompleted/
      const destDir = join(ROOT, 'Chef Flow Personas', 'Uncompleted', personaType);
      mkdirSync(destDir, { recursive: true });
      const destPath = join(destDir, `${slug}.txt`);
      writeFileSync(destPath, text.trim() + '\n', 'utf-8');
      // Store verbatim in vault (original LLM output, no trimming)
      try {
        const relPath = `Chef Flow Personas/Uncompleted/${personaType}/${slug}.txt`;
        vaultStore({
          content: text,
          persona_type: personaType,
          persona_name: personaName,
          author: { type: 'ai', name: opts.model || 'hermes3:8b', tool: 'persona-generator' },
          source_file: relPath,
        });
      } catch (err) { console.error('[vault]', err.message); }
      console.log(`[generator] SAVED: Chef Flow Personas/Uncompleted/${personaType}/${slug}.txt (score: ${result.score}/100)`);
      existingNames.add(slug);
    }
    return { success: true, name: personaName, score: result.score, slug };
  } else {
    // Save to Failed/
    if (!opts.dryRun) {
      const failedDir = join(ROOT, 'Chef Flow Personas', 'Failed', personaType);
      mkdirSync(failedDir, { recursive: true });
      const failedPath = join(failedDir, `${slug}.txt`);
      const reasons = result.rejection_reasons.join('\n');
      const comment = `\n\n---\n<!-- GENERATION VALIDATION FAILED (score: ${result.score})\n${reasons}\nFlags: ${result.flags.join('; ') || 'none'}\nGenerated: ${new Date().toISOString()}\nModel: ${opts.model}\nCategory: ${category.id}\nSeed: ${seed || 'fictional'}\n-->\n`;
      writeFileSync(failedPath, text.trim() + comment, 'utf-8');
      console.log(`[generator] FAILED: Chef Flow Personas/Failed/${personaType}/${slug}.txt (score: ${result.score}/100)`);
    } else {
      console.log(`[generator] FAILED (dry-run): ${personaName} (score: ${result.score}/100)`);
      console.log(`  Reasons: ${result.rejection_reasons.join('; ')}`);
    }
    return { success: false, name: personaName, score: result.score, slug };
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const existingNames = collectExistingPersonaNames();

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < opts.count; i++) {
    try {
      const result = await generateOne(opts, i, existingNames);
      if (result.success) generated++;
      else failed++;
    } catch (err) {
      console.error(`[generator] Error on #${i + 1}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[generator] Done: ${generated} generated, ${failed} failed out of ${opts.count}.`);
  process.exit(failed > 0 && generated === 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
