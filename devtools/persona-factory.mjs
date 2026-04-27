#!/usr/bin/env node
/**
 * Persona Factory - Autonomous persona generator using Ollama (Gemma 4)
 *
 * Generates realistic, diverse personas and drops them into
 * Chef Flow Personas/Uncompleted/{Type}/ for the pipeline to process.
 *
 * Usage:
 *   node devtools/persona-factory.mjs                    # Generate 1 persona (random type)
 *   node devtools/persona-factory.mjs --count 5          # Generate 5 personas
 *   node devtools/persona-factory.mjs --type Chef        # Generate 1 Chef persona
 *   node devtools/persona-factory.mjs --type Client --count 3
 *   node devtools/persona-factory.mjs --dry-run          # Preview without writing
 *   node devtools/persona-factory.mjs --list-archetypes  # Show all seed archetypes
 *
 * Requires: Ollama running (OLLAMA_BASE_URL or localhost:11434)
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";

const ROOT = process.cwd();
const PERSONA_ROOT = join(ROOT, "Chef Flow Personas");
const UNCOMPLETED = join(PERSONA_ROOT, "Uncompleted");
const COMPLETED = join(PERSONA_ROOT, "Completed");
const REGISTRY = join(ROOT, "docs", "stress-tests", "REGISTRY.md");
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.PERSONA_MODEL || "gemma4:e4b";

const TAG = "[persona-factory]";

// ─── Seed Archetypes ───────────────────────────────────────────────

const ARCHETYPES = {
  Chef: [
    { role: "Solo Private Chef", context: "works alone for 3-8 families weekly, manages own books, shops at 4am, no staff" },
    { role: "Meal Prep Specialist", context: "weekly batch cooking for 15-25 clients, delivery logistics, macro tracking, label printing" },
    { role: "Catering Company Owner", context: "5-person team, 200+ person events, insurance/permits, vehicle fleet, seasonal staff" },
    { role: "Pop-Up Chef", context: "nomadic, different venue each week, social media driven bookings, no fixed kitchen" },
    { role: "Cannabis-Infused Chef", context: "dosage precision, legal compliance varies by state, specialized clientele, discretion" },
    { role: "Yacht/Estate Chef", context: "lives on-site, provisioning in remote ports, ultra-high-net-worth principals, NDA culture" },
    { role: "Retreat/Wellness Chef", context: "plant-based menus, Ayurvedic or macrobiotic, group sizes 8-30, remote locations" },
    { role: "Food Truck Operator", context: "commissary kitchen, permits per city, weather-dependent revenue, POS integration" },
    { role: "BBQ Pitmaster", context: "competition circuit, wood/charcoal sourcing, 16-hour cooks, whole animal butchery" },
    { role: "Pastry Specialist", context: "wedding cakes, custom dessert tables, temperature-sensitive transport, allergen matrix" },
    { role: "Personal/Family Chef", context: "one ultra-wealthy family, kids' meals, travel with family, household staff coordination" },
    { role: "Farm-to-Table Chef", context: "direct farm relationships, seasonal-only menus, CSA box integration, foraging" },
    { role: "Culinary Instructor", context: "teaching private cooking classes, corporate team building, recipe IP, group management" },
    { role: "Food Stylist/Recipe Developer", context: "photo shoots, brand partnerships, recipe testing, content calendar" },
    { role: "Grazing/Charcuterie Artist", context: "visual presentation, board sizing per headcount, allergen labeling, delivery timing" },
    { role: "Ghost Kitchen Operator", context: "delivery-only, multiple virtual brands, platform fee management, packaging costs" },
    { role: "Senior Living Chef", context: "dietary restrictions galore, texture modifications, bulk production, nutritionist coordination" },
    { role: "Stadium/Venue Chef", context: "massive scale (5000+ covers), prep team of 30, health dept inspections, union labor" },
    { role: "Traveling Private Chef", context: "flies to clients, ships equipment, vacation homes, international customs for knives" },
    { role: "Newly Independent Chef", context: "just left restaurant life, zero business skills, no client list, building from scratch" },
  ],
  Client: [
    { role: "Busy Tech Executive", context: "family of 4, both parents work 60hrs, kids have allergies, wants weekly meal prep" },
    { role: "Wedding Couple", context: "150-person wedding, 6 months out, tasting appointments, dietary survey for guests" },
    { role: "Corporate Event Planner", context: "quarterly board dinners, strict budget approval process, headcount changes last minute" },
    { role: "Fitness-Focused Client", context: "macro targets, weigh-and-log meals, competition prep, zero tolerance for deviation" },
    { role: "Elderly Care Family", context: "parent with dementia, texture-modified diet, caregiver handoff, medication interactions" },
    { role: "Vacation Rental Host", context: "stocks 3 Airbnbs with welcome meals, rotating guests, dietary unknown until arrival" },
    { role: "Bachelor/Bachelorette Party", context: "group of 12, one weekend, brunch + dinner, food allergies unknown, budget-conscious" },
    { role: "Holiday Host Family", context: "Thanksgiving for 25, multiple generations, 6 dietary restrictions, potluck coordination" },
    { role: "Real Estate Agent", context: "open house catering, 2-hour window, elegant but budget, 4 events per month" },
    { role: "Nonprofit Gala Organizer", context: "$200/plate fundraiser, 300 guests, donor expectations, auction timeline integration" },
    { role: "New Parent", context: "postpartum meal service, freezer meals, nursing diet, partner also needs feeding" },
    { role: "Chronic Illness Patient", context: "autoimmune protocol diet, elimination phase, reintroduction tracking, doctor coordination" },
    { role: "Small Business Owner", context: "daily office lunches for team of 12, rotating menu, delivery by 11:30am sharp" },
    { role: "Divorce Transition Client", context: "never cooked before, learning basics, meal planning for one, emotional context" },
    { role: "Celebrity/Public Figure", context: "NDA required, paparazzi-aware logistics, trainer-approved menus, last-minute schedule changes" },
    { role: "International Expat Family", context: "relocated from abroad, homesick for regional cuisine, sourcing specialty ingredients" },
    { role: "College Student Group", context: "shared house of 6, tight budget, bulk cooking, diverse taste preferences, communal kitchen" },
    { role: "Pet-Inclusive Client", context: "wants chef to also prep dog/cat meals, raw diet, human-grade ingredients" },
  ],
  Vendor: [
    { role: "Specialty Grocer", context: "imports from 12 countries, minimum orders, seasonal availability, credit terms" },
    { role: "Local Farm/CSA", context: "weekly box contents vary, surplus negotiation, delivery schedule rigid, cash preferred" },
    { role: "Fishmonger", context: "daily catch varies, pre-order by 4am, whole fish vs fillet pricing, ice/transport" },
    { role: "Butcher Shop", context: "custom cuts, whole animal programs, aging schedules, bone/offal availability" },
    { role: "Equipment Rental Company", context: "chafing dishes, tent kitchens, generator-powered setups, damage deposits" },
    { role: "Linen/Tableware Service", context: "tablecloth sizes, napkin colors, china patterns, pickup/delivery windows" },
    { role: "Wine/Beverage Distributor", context: "case minimums, pairing consultation, corkage considerations, license requirements" },
    { role: "Bakery/Bread Supplier", context: "par-baked vs fresh, order cutoff times, gluten-free line, holiday surge" },
    { role: "Spice/Dry Goods Importer", context: "bulk pricing tiers, shelf life, authenticity certification, small-batch sourcing" },
    { role: "Ice Sculptor/Specialty Decor", context: "lead time 2 weeks, transport logistics, melting timeline, electrical requirements" },
  ],
  Guest: [
    { role: "Dinner Party Guest (Severe Allergies)", context: "anaphylactic to tree nuts, carries EpiPen, anxious about cross-contamination" },
    { role: "Vegan Guest at Meat-Heavy Event", context: "ethical vegan, uncomfortable watching others eat meat, wants equal culinary attention" },
    { role: "Child Guest (Picky Eater)", context: "age 6, only eats 5 foods, parents embarrassed, chef needs backup plan" },
    { role: "VIP/Celebrity Guest", context: "arriving late, security detail, specific seating, photographer restrictions" },
    { role: "Elderly Guest (Mobility)", context: "wheelchair, difficulty with buffet, needs plated service, medication timing affects meal" },
    { role: "International Guest (Language Barrier)", context: "Japanese-speaking, unfamiliar with Western courses, cultural dining norms differ" },
    { role: "Pregnant Guest", context: "listeria avoidance, no raw fish/soft cheese, nausea triggers, needs frequent small portions" },
    { role: "Recovering Alcoholic Guest", context: "no wine in sauces, no flambé, mocktail alternative, discretion critical" },
  ],
  Staff: [
    { role: "Sous Chef (Freelance)", context: "works for 3 different chefs weekly, needs clear prep lists, own knife kit, hourly rate" },
    { role: "Prep Cook (Part-Time)", context: "culinary student, available weekends only, learning knife skills, needs supervision" },
    { role: "Event Server", context: "hired per event, needs service timeline, dress code, dietary knowledge for guest questions" },
    { role: "Kitchen Manager", context: "runs commissary kitchen, inventory ordering, health dept liaison, staff scheduling" },
    { role: "Delivery Driver", context: "temperature-sensitive cargo, time windows, client-facing, multiple stops per route" },
    { role: "Bartender (Event)", context: "mobile bar setup, liquor license coordination, garnish prep, paired with menu courses" },
    { role: "Dishwasher/Kitchen Porter", context: "event cleanup, equipment return, waste disposal, often overlooked in planning" },
    { role: "Food Photographer", context: "needs plating timeline, lighting setup time, not in the way during service" },
  ],
  Partner: [
    { role: "Farm Owner (Co-Host)", context: "provides venue + ingredients, revenue split, insurance liability, guest parking" },
    { role: "Venue Owner", context: "kitchen access rules, cleanup deposit, noise ordinance, exclusive vendor lists" },
    { role: "Wedding Planner", context: "coordinates 8 vendors simultaneously, timeline is king, client communication gatekeeper" },
    { role: "Sommelier", context: "wine pairing consultation, cellar access, markup negotiation, tasting pour quantities" },
    { role: "Food Blogger/Influencer", context: "wants early access, photo staging, honest review risk, follower demographics" },
    { role: "Culinary School Director", context: "extern placement, curriculum alignment, student skill assessment, insurance" },
    { role: "Nutritionist/Dietitian", context: "meal plan sign-off, macro verification, medical diet compliance, liability" },
    { role: "Referral Partner Chef", context: "overflow bookings, geographic coverage, client handoff protocol, revenue sharing" },
  ],
  Public: [
    { role: "Google Searcher", context: "types 'private chef near me', comparing 5 options, wants pricing transparency, reads reviews" },
    { role: "Instagram Follower", context: "saw beautiful food photos, impulse inquiry, budget reality check, seasonal interest" },
    { role: "Word-of-Mouth Referral", context: "friend had amazing dinner, high expectations, may not understand pricing, warm lead" },
    { role: "Food Journalist", context: "writing piece on private dining trend, needs quotes, photos, behind-scenes access" },
    { role: "Local Foodie", context: "attends every pop-up, knows the scene, price-sensitive, social media amplifier" },
    { role: "Corporate HR Manager", context: "searching team building culinary experiences, needs invoice, dietary survey tool" },
    { role: "Gift Card Buyer", context: "buying for someone else, doesn't know recipient's preferences, wants simple purchase flow" },
    { role: "Skeptical First-Timer", context: "never hired a private chef, thinks it's only for rich people, needs education on value" },
  ],
};

// ─── Diversity Modifiers ───────────────────────────────────────────

const LOCATIONS = [
  "New York City", "Los Angeles", "Chicago", "Miami", "Austin", "Portland OR",
  "Nashville", "Denver", "San Francisco", "Boston", "Seattle", "New Orleans",
  "Atlanta", "Philadelphia", "Phoenix", "Minneapolis", "Charleston SC",
  "Savannah GA", "Santa Fe NM", "Honolulu", "Anchorage", "rural Vermont",
  "suburban Dallas", "Napa Valley", "Martha's Vineyard", "the Florida Keys",
  "Jackson Hole WY", "Aspen CO", "the Hamptons", "Scottsdale AZ",
];

const REVENUE_RANGES = {
  Chef: ["$20K-40K/year (just starting)", "$60K-90K/year (established)", "$120K-200K/year (premium)", "$300K+/year (empire)"],
  Client: ["$500-2000/event (budget)", "$3000-8000/event (mid-range)", "$10K-30K/event (premium)", "$50K+/event (luxury)"],
};

const PERSONALITY_TRAITS = [
  "obsessively organized", "creative chaos", "data-driven", "relationship-first",
  "perfectionist", "scrappy and resourceful", "tech-savvy", "tech-averse",
  "delegation-heavy", "control freak", "quiet professional", "loud personality",
  "risk-averse", "experimental", "tradition-bound", "innovation-obsessed",
];

const PAIN_MULTIPLIERS = [
  "just lost a major client due to miscommunication",
  "recovering from a health scare that forced delegation",
  "scaling from solo to a team of 3 for the first time",
  "switching from restaurant life after 15 years",
  "managing a long-distance move while keeping clients",
  "dealing with a cease-and-desist from a former partner",
  "navigating a rebrand after negative press",
  "returning after a 2-year career break",
  "trying to break into a new geographic market",
  "handling their first six-figure event",
];

// ─── Helpers ───────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

function getExistingNames() {
  const names = new Set();
  // Check Completed/
  for (const type of Object.keys(ARCHETYPES)) {
    const dir = join(COMPLETED, type);
    if (!existsSync(dir)) continue;
    try {
      for (const f of readdirSync(dir)) {
        names.add(slugify(basename(f, extname(f))));
      }
    } catch {}
  }
  // Check Uncompleted/
  for (const type of Object.keys(ARCHETYPES)) {
    const dir = join(UNCOMPLETED, type);
    if (!existsSync(dir)) continue;
    try {
      for (const f of readdirSync(dir)) {
        names.add(slugify(basename(f, extname(f))));
      }
    } catch {}
  }
  // Check registry
  if (existsSync(REGISTRY)) {
    const reg = readFileSync(REGISTRY, "utf8");
    const matches = reg.match(/\|\s*\d+\s*\|\s*([^|]+)/g) || [];
    for (const m of matches) {
      const label = m.replace(/\|\s*\d+\s*\|\s*/, "").trim();
      if (label) names.add(slugify(label));
    }
  }
  return names;
}

async function ollamaGenerate(prompt) {
  const url = `${OLLAMA_URL}/api/generate`;
  const body = {
    model: MODEL,
    prompt,
    stream: false,
    options: {
      temperature: 0.9,
      top_p: 0.95,
      num_predict: 2048,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.response || "";
}

// ─── Generation ────────────────────────────────────────────────────

function buildPrompt(type, archetype, location, revenueRange, traits, painMultiplier) {
  const traitStr = traits.join(", ");

  return `You are a creative writer generating a realistic persona for stress-testing a chef operations platform called ChefFlow.

Generate a FICTIONAL person (invented name, invented details) who is a ${type}: ${archetype.role}.

Context about their situation: ${archetype.context}

Additional details to incorporate:
- Location: ${location}
- ${type === "Chef" || type === "Client" ? `Budget/Revenue: ${revenueRange}` : ""}
- Personality: ${traitStr}
- Current crisis or inflection point: ${painMultiplier}

Write the persona in FIRST PERSON as if they are describing themselves and their situation to a software evaluation team. Use this exact structure:

**${type} Profile: "[Their Full Name]" - [Their Title/Role] ([One-Word Archetype])**

[2-3 sentence introduction in first person]

### Business Reality

Right now:
* [5-7 bullet points with specific numbers: events per month, team size, revenue, geographic scope, current tools used]

### Primary Failure: [Name the Biggest Problem]

[One detailed paragraph about their #1 operational pain point. Be specific: what breaks, what it costs them, why current workarounds fail.]

### Structural Issue: [Issue Name]

[Paragraph describing a systemic problem. Include current workaround and what breaks.]

### Structural Issue: [Different Issue Name]

[Another systemic problem with specifics.]

### Structural Issue: [Third Issue Name]

[Third systemic problem.]

### Psychological Model

I optimize for: [what they prioritize]
I refuse to compromise on: [non-negotiables]
I avoid: [what they hate]
I evaluate tools by: [their lens for software]

### Pass / Fail Conditions

For this system to work for me, it must:

1. [Specific, testable requirement]
2. [Specific, testable requirement]
3. [Specific, testable requirement]
4. [Specific, testable requirement]
5. [Specific, testable requirement]
6. [Specific, testable requirement]
7. [Specific, testable requirement]

IMPORTANT RULES:
- Invent a completely fictional name. Do NOT use any real celebrity or public figure name.
- Make it feel real: specific dollar amounts, specific tools they currently use, specific frustrations.
- Every pass/fail condition must be something a software system could concretely implement or fail.
- Do NOT mention ChefFlow by name in the persona text (they don't know about it yet).
- Write 600-1000 words total.
- Do not include any preamble or commentary. Start directly with the **${type} Profile:** line.`;
}

async function generatePersona(type, existingNames) {
  const archetypes = ARCHETYPES[type];
  if (!archetypes || archetypes.length === 0) {
    throw new Error(`No archetypes for type: ${type}`);
  }

  const archetype = pick(archetypes);
  const location = pick(LOCATIONS);
  const revenueRange = REVENUE_RANGES[type] ? pick(REVENUE_RANGES[type]) : "";
  const traits = pickN(PERSONALITY_TRAITS, 2);
  const painMultiplier = pick(PAIN_MULTIPLIERS);

  const prompt = buildPrompt(type, archetype, location, revenueRange, traits, painMultiplier);

  console.log(`${TAG} Generating ${type} persona: ${archetype.role} in ${location}...`);

  const text = ollamaGenerate(prompt).then((raw) => {
    // Clean up: remove markdown fences if model wraps output
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();
    }
    return cleaned;
  });

  return { text: await text, archetype, location };
}

function extractNameFromText(text) {
  // Try to extract name from the profile header
  const match = text.match(/\*\*\w+ Profile:\s*"([^"]+)"/);
  if (match) return match[1].trim();

  // Fallback: first line with a name-like pattern
  const nameMatch = text.match(/Profile:\s*([A-Z][a-z]+ [A-Z][a-z]+)/);
  if (nameMatch) return nameMatch[1].trim();

  return null;
}

// ─── CLI ───────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { count: 1, type: null, dryRun: false, listArchetypes: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count") opts.count = Math.max(1, Math.min(20, Number(argv[i + 1] || "1")));
    if (argv[i] === "--type") opts.type = argv[i + 1] || null;
    if (argv[i] === "--dry-run") opts.dryRun = true;
    if (argv[i] === "--list-archetypes") opts.listArchetypes = true;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.listArchetypes) {
    for (const [type, archetypes] of Object.entries(ARCHETYPES)) {
      console.log(`\n${type} (${archetypes.length} archetypes):`);
      for (const a of archetypes) {
        console.log(`  - ${a.role}: ${a.context.slice(0, 80)}`);
      }
    }
    const total = Object.values(ARCHETYPES).reduce((s, a) => s + a.length, 0);
    console.log(`\nTotal: ${total} archetypes across ${Object.keys(ARCHETYPES).length} types`);
    return;
  }

  // Validate type
  const validTypes = Object.keys(ARCHETYPES);
  if (opts.type && !validTypes.includes(opts.type)) {
    console.error(`${TAG} Invalid type "${opts.type}". Valid: ${validTypes.join(", ")}`);
    process.exit(1);
  }

  // Check Ollama
  try {
    const ping = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!ping.ok) throw new Error(`${ping.status}`);
  } catch (err) {
    console.error(`${TAG} Ollama not reachable at ${OLLAMA_URL}. Start it: ollama serve`);
    process.exit(1);
  }

  const existingNames = getExistingNames();
  console.log(`${TAG} ${existingNames.size} existing personas in dedup set`);

  let generated = 0;
  let failures = 0;

  for (let i = 0; i < opts.count; i++) {
    const type = opts.type || pick(validTypes);

    try {
      const { text, archetype, location } = await generatePersona(type, existingNames);

      // Validate output
      if (!text || text.length < 200) {
        console.log(`${TAG} Output too short (${text?.length || 0} chars), skipping`);
        failures++;
        continue;
      }

      // Extract name for filename
      let personaName = extractNameFromText(text);
      if (!personaName) {
        personaName = `${archetype.role.replace(/[^a-zA-Z ]/g, "")} ${location.split(",")[0]}`;
      }

      const slug = slugify(personaName);

      // Dedup check
      if (existingNames.has(slug)) {
        console.log(`${TAG} Duplicate "${personaName}" (${slug}), skipping`);
        failures++;
        continue;
      }

      const filename = `${slug}.txt`;
      const outDir = join(UNCOMPLETED, type);
      const outPath = join(outDir, filename);

      if (opts.dryRun) {
        console.log(`${TAG} [dry-run] Would write: Chef Flow Personas/Uncompleted/${type}/${filename}`);
        console.log(`${TAG} [dry-run] Name: ${personaName} | Archetype: ${archetype.role} | Location: ${location}`);
        console.log(`${TAG} [dry-run] Length: ${text.length} chars`);
      } else {
        mkdirSync(outDir, { recursive: true });
        writeFileSync(outPath, text, "utf8");
        console.log(`${TAG} Written: Chef Flow Personas/Uncompleted/${type}/${filename} (${text.length} chars)`);
      }

      existingNames.add(slug);
      generated++;
    } catch (err) {
      console.error(`${TAG} Failed to generate ${type} persona: ${err.message}`);
      failures++;
    }
  }

  console.log(`${TAG} Done. Generated: ${generated}, Failed: ${failures}`);
}

main();
