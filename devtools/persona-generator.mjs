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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// --- Seed categories ---

const SEED_CATEGORIES = [
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
    constraints: 'Curriculum, student tracking, recipe documentation, technique library, scheduling classes',
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
];

// --- CLI ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    count: 1,
    category: null,
    seed: null,
    spread: false,
    model: process.env.PERSONA_GENERATOR_MODEL || 'hermes3:8b',
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count': opts.count = parseInt(args[++i], 10) || 1; break;
      case '--category': opts.category = args[++i]; break;
      case '--seed': opts.seed = args[++i]; break;
      case '--spread': opts.spread = true; break;
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

function printHelp() {
  console.log('Usage: node devtools/persona-generator.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --count <N>          Generate N personas (default: 1)');
  console.log('  --category <id>      Use specific seed category');
  console.log('  --seed "Name"        Use specific celebrity seed');
  console.log('  --spread             Spread across all categories');
  console.log('  --model <name>       Ollama model (default: hermes3:8b)');
  console.log('  --ollama-url <url>   Ollama URL (default: http://localhost:11434)');
  console.log('  --dry-run            Generate + validate but do not save');
  console.log('');
  console.log('Categories:');
  for (const cat of SEED_CATEGORIES) {
    console.log(`  ${cat.id.padEnd(25)} ${cat.label}`);
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
  if (opts.category) {
    const cat = SEED_CATEGORIES.find(c => c.id === opts.category);
    if (!cat) {
      console.error(`ERROR: Unknown category "${opts.category}". Use --help to see options.`);
      process.exit(1);
    }
    return cat;
  }

  if (opts.spread) {
    return SEED_CATEGORIES[index % SEED_CATEGORIES.length];
  }

  return SEED_CATEGORIES[Math.floor(Math.random() * SEED_CATEGORIES.length)];
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

function buildPrompt(category, seed) {
  const seedInstruction = seed
    ? `Base this persona on **${seed}**. Use their actual business model, cuisine, philosophy, and scale as the foundation. Adapt to operational reality, not media personality.`
    : `Create a realistic fictional persona for the "${category.label}" category. Give them a full name, specific location, and grounded business details.`;

  return `You are writing a detailed persona profile for stress-testing a food service operations platform called ChefFlow.

${seedInstruction}

Category: ${category.label}
Constraints: ${category.constraints}

Write the persona using EXACTLY this structure. First person voice. Be specific, grounded, and detailed. Minimum 600 words.

---

**Chef Profile: "{Full Name}" - {Specific Role} ({2-3 word business model descriptor})**

[2-3 sentences introducing who they are and what they do. First person.]

### Business Reality

Right now:
* I manage **[specific number]** [clients/locations/events] [details]
* [Revenue model with dollar amounts]
* [Team size and structure]
* [Geographic scope with specific location]
* [Current tech setup - what they actually use today]

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
- Do NOT write generic pain points. Every gap must be specific to this person's business model
- Do NOT write software feature requests. Write business problems with real consequences
- The identity header MUST start with **Chef Profile: (or Client Profile:, etc.)`;
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
  process.stderr.write(`[generator] #${index + 1}: ${category.label} / ${seedLabel}\n`);

  // Build prompt
  const prompt = buildPrompt(category, seed);

  // Call Ollama
  let text = await callOllama(prompt, opts.model, opts.ollamaUrl, 0.7);

  // Validate
  let result = validatePersonaContent(text, { name: seed || 'Unknown', type: 'Chef' });

  if (!result.valid) {
    process.stderr.write(`[generator] Validation failed (score: ${result.score}). Retrying with temperature 0.1...\n`);
    if (result.rejection_reasons.length > 0) {
      process.stderr.write(`[generator] Reasons: ${result.rejection_reasons.join('; ')}\n`);
    }

    // Retry with lower temperature and explicit fix instructions
    const fixPrompt = prompt + `\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Issues: ${result.rejection_reasons.join('. ')}. Missing sections: ${result.sections_missing.join(', ')}. Fix these issues. Follow the template EXACTLY.`;
    text = await callOllama(fixPrompt, opts.model, opts.ollamaUrl, 0.1);
    result = validatePersonaContent(text, { name: seed || 'Unknown', type: 'Chef' });
  }

  // Re-extract name from generated content
  const nameMatch = text.match(/\*\*(?:Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:\s*"?([^"*\n]+)"?\s*/i);
  const personaName = nameMatch ? nameMatch[1].replace(/\s*[-].*/,'').trim() : (seed || `fictional-${category.id}-${index}`);

  // Determine type from content
  const typeMatch = text.match(/\*\*(Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:/i);
  const personaType = typeMatch ? typeMatch[1] : 'Chef';

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
