#!/usr/bin/env node
/**
 * Persona Corpus Factory
 *
 * Generates synthetic persona candidates from an axis matrix, validates each
 * candidate, rejects low-novelty duplicates, and optionally imports accepted
 * personas into the local persona inbox.
 *
 * Safe defaults:
 * - Plan mode only unless --execute is passed.
 * - No inbox import or file writes without --execute.
 *
 * Examples:
 *   node devtools/persona-corpus-factory.mjs --plan-only --count 50
 *   node devtools/persona-corpus-factory.mjs --execute --count 100 --type Client
 *   node devtools/persona-corpus-factory.mjs --execute --count 1000 --domain dinner-circles --novelty 0.42
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePersonaContent } from "./persona-validator.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const TAG = "[persona-corpus-factory]";
const PERSONA_ROOT = join(ROOT, "Chef Flow Personas");
const UNCOMPLETED_ROOT = join(PERSONA_ROOT, "Uncompleted");
const COMPLETED_ROOT = join(PERSONA_ROOT, "Completed");
const FAILED_ROOT = join(PERSONA_ROOT, "Failed");
const REPORT_ROOT = join(ROOT, "reports", "persona-corpus-factory");
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.PERSONA_MODEL || "gemma4:e4b";
const DEFAULT_INBOX_URL = process.env.PERSONA_INBOX_URL || "http://127.0.0.1:3977";

const TYPES = ["Chef", "Client", "Guest", "Vendor", "Staff", "Partner", "Public"];

const DOMAINS = [
  {
    id: "dinner-circles",
    label: "Dinner Circles and group coordination",
    pressure:
      "group chat as source of truth, decision history, collapsed archives, role visibility, voting, action traceability",
    featureTargets: ["Dinner Circles", "decision ledger", "group input structuring", "current state view"],
  },
  {
    id: "pricing-checkout",
    label: "real-time pricing and checkout",
    pressure:
      "deterministic price formulas, live carts, instant quote removal, add-ons, market price transparency, checkout continuity",
    featureTargets: ["live pricing engine", "cart state", "quote-to-pay flow", "line item deltas"],
  },
  {
    id: "wallet-payments",
    label: "wallet payments and payment UX",
    pressure:
      "Apple Pay, Google Pay, Samsung Wallet, browser autofill, tokenization, no raw card forms, one-tap deposits",
    featureTargets: ["wallet payments", "saved payment methods", "tokenized deposits", "mobile checkout"],
  },
  {
    id: "first-timer-guidance",
    label: "first-time private dining guidance",
    pressure:
      "guided onboarding, plain language choices, setup validation, expectations, chef-led next steps, reassurance",
    featureTargets: ["guided intake", "experience preview", "home readiness check", "concierge flow"],
  },
  {
    id: "premium-concierge",
    label: "premium concierge and high-touch planning",
    pressure:
      "assistant roles, white-glove onboarding, standards of quality, premium service levels, clear cost framing",
    featureTargets: ["premium onboarding", "assistant access", "service-level recommendations", "executive summary"],
  },
  {
    id: "privacy-stealth",
    label: "privacy, stealth, and discretion",
    pressure:
      "surprise events, hidden notifications, discreet billing, access controls, private timelines, minimal traces",
    featureTargets: ["stealth mode", "private notifications", "discreet payment metadata", "access-controlled planning"],
  },
  {
    id: "venue-logistics",
    label: "venue and logistics uncertainty",
    pressure:
      "unknown kitchens, rentals, power, water, parking, load-in, equipment validation, day-of readiness",
    featureTargets: ["venue profile", "equipment gap check", "load-in plan", "day-of checklist"],
  },
  {
    id: "dietary-safety",
    label: "dietary safety and trust",
    pressure:
      "allergies, cross-contact, guest-specific notes, medical needs, private preferences, auditability",
    featureTargets: ["guest profiles", "allergen propagation", "cross-contact controls", "menu safety validation"],
  },
  {
    id: "accessibility",
    label: "accessibility and inclusive UX",
    pressure:
      "screen reader pricing, keyboard control, plain language, cognitive load, motor accessibility, captions",
    featureTargets: ["accessible checkout", "semantic updates", "keyboard-first controls", "plain language mode"],
  },
  {
    id: "international",
    label: "international logistics and currency",
    pressure:
      "multi-currency pricing, timezone scheduling, local payment methods, travel homes, cultural norms, translation",
    featureTargets: ["multi-currency pricing", "timezone-aware scheduling", "localized payment methods", "translation layer"],
  },
  {
    id: "legal-disputes",
    label: "legal, disputes, refunds, and evidence",
    pressure:
      "cancel terms, refund disputes, invoice audit trails, proof of agreement, chargebacks, terms acceptance",
    featureTargets: ["agreement ledger", "refund workflow", "invoice audit trail", "terms snapshots"],
  },
  {
    id: "offline-rural",
    label: "offline, rural, and unreliable connectivity",
    pressure:
      "bad signal, farm venues, offline guest lists, cached pricing, delayed sync, low bandwidth workflows",
    featureTargets: ["offline mode", "local cached plans", "sync conflict handling", "degraded checkout"],
  },
  {
    id: "adversarial",
    label: "adversarial users and exploit resistance",
    pressure:
      "pricing manipulation, coupon abuse, split payment abuse, fake guests, cancellation loopholes, fraud signals",
    featureTargets: ["pricing guardrails", "abuse detection", "coupon constraints", "payment risk scoring"],
  },
  {
    id: "loyalty-rewards",
    label: "loyalty, perks, and reward economics",
    pressure:
      "points, cashback, tiers, referrals, organizer rewards, experience perks, status ladders, reward visibility",
    featureTargets: ["loyalty ledger", "reward estimates", "tier progress", "referral attribution"],
  },
  {
    id: "ai-local-private",
    label: "private local AI and automation",
    pressure:
      "bring-your-own AI, Ollama, Gemma 4, local memory, local embeddings, permissioned tool calls, no cloud fallback",
    featureTargets: ["local AI backend", "AI permissions", "local memory", "tool-call audit log"],
  },
];

const CONTEXTS = {
  Chef: [
    "solo private chef running high-trust home dinners",
    "event chef juggling pop-ups, private homes, and rentals",
    "chef-owner trying to keep craft time while scaling admin",
    "culinary instructor teaching in clients' homes",
    "local AI obsessive chef who refuses cloud inference",
  ],
  Client: [
    "private dining host coordinating guests and payments",
    "first-time buyer trying to understand what to book",
    "wealthy household decision maker with assistant support",
    "group organizer responsible for friends and split payments",
    "technical buyer who expects modern checkout standards",
  ],
  Guest: [
    "guest with serious restrictions who needs confidence before attending",
    "VIP guest whose preferences are politically sensitive",
    "guest who will not create an account just to RSVP",
    "guest joining a group event late with limited context",
  ],
  Vendor: [
    "specialty supplier with volatile availability and minimums",
    "rental vendor coordinating load-in and deposits",
    "farm partner with seasonal stock and delivery constraints",
    "beverage vendor handling licensing, timing, and substitutions",
  ],
  Staff: [
    "freelance server joining unfamiliar private homes",
    "prep assistant who needs exact day-of instructions",
    "event captain responsible for guest-facing recovery",
    "driver moving temperature-sensitive items between venues",
  ],
  Partner: [
    "venue owner sharing partial operational access",
    "planner managing the client relationship and vendor stack",
    "brand partner funding part of the dinner",
    "farm co-host balancing hospitality and production work",
  ],
  Public: [
    "visitor comparing options from a search page",
    "referral lead who wants proof before reaching out",
    "gift buyer booking for someone else",
    "skeptical first-timer trying to understand private dining value",
  ],
};

const STAKES = [
  "low-stakes but high-friction",
  "emotionally important milestone",
  "reputation-sensitive business dinner",
  "high-dollar event with legal exposure",
  "catastrophic if safety or privacy fails",
];

const TECH_COMFORT = ["tech-averse", "normal consumer", "power user", "software engineer", "security or payments expert"];
const MONEY_POSTURE = ["budget constrained", "value-focused", "comfortable spender", "blank-check but clarity-obsessed"];
const WORKFLOW_STYLE = ["hands-off", "impatient", "collaborative", "control-heavy", "minimalist", "archive-driven"];
const CHANGE_PATTERN = ["stable plan", "late headcount changes", "constant revisions", "last-minute venue uncertainty", "multi-party approvals"];

const STOPWORDS = new Set(
  "the a an and or but if then this that these those with without from into onto over under for to of in on by as is are was were be been being i me my we our you your it its they them their".split(" "),
);

function parseArgs(argv) {
  const opts = {
    count: 25,
    type: null,
    domain: null,
    execute: false,
    planOnly: false,
    importInbox: true,
    writeFiles: false,
    dryRun: false,
    model: DEFAULT_MODEL,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    inboxUrl: DEFAULT_INBOX_URL,
    novelty: 0.38,
    minScore: 70,
    maxAttempts: null,
    report: null,
    seed: 1,
    listDomains: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count" && argv[i + 1]) opts.count = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === "--type" && argv[i + 1]) opts.type = argv[++i];
    else if (arg === "--domain" && argv[i + 1]) opts.domain = argv[++i];
    else if (arg === "--execute") opts.execute = true;
    else if (arg === "--plan-only") opts.planOnly = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--no-inbox") opts.importInbox = false;
    else if (arg === "--write-files") opts.writeFiles = true;
    else if (arg === "--model" && argv[i + 1]) opts.model = argv[++i];
    else if (arg === "--ollama-url" && argv[i + 1]) opts.ollamaUrl = argv[++i];
    else if (arg === "--inbox-url" && argv[i + 1]) opts.inboxUrl = argv[++i].replace(/\/$/, "");
    else if ((arg === "--novelty" || arg === "--novelty-threshold") && argv[i + 1]) opts.novelty = Number(argv[++i]) || opts.novelty;
    else if (arg === "--min-score" && argv[i + 1]) opts.minScore = Number(argv[++i]) || opts.minScore;
    else if (arg === "--max-attempts" && argv[i + 1]) opts.maxAttempts = Math.max(1, Number(argv[++i]) || 1);
    else if (arg === "--report" && argv[i + 1]) opts.report = argv[++i];
    else if (arg === "--seed" && argv[i + 1]) opts.seed = Number(argv[++i]) || opts.seed;
    else if (arg === "--list-domains") opts.listDomains = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (opts.type && !TYPES.includes(opts.type)) {
    throw new Error(`Invalid --type "${opts.type}". Valid: ${TYPES.join(", ")}`);
  }
  if (!opts.listDomains && opts.domain && !DOMAINS.some((domain) => domain.id === opts.domain)) {
    throw new Error(`Invalid --domain "${opts.domain}". Use --list-domains to inspect domains.`);
  }
  if (!opts.maxAttempts) opts.maxAttempts = Math.max(opts.count * 3, opts.count + 10);
  if (!opts.execute) opts.dryRun = true;
  if (opts.planOnly) opts.dryRun = true;

  return opts;
}

function printHelp() {
  console.log("Usage: node devtools/persona-corpus-factory.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --count <N>              Accepted persona target (default: 25)");
  console.log("  --type <Type>            Restrict to Chef, Client, Guest, Vendor, Staff, Partner, or Public");
  console.log("  --domain <id>            Restrict to one product pressure domain");
  console.log("  --plan-only              Print the axis plan without calling Ollama");
  console.log("  --execute                Actually generate and save/import accepted personas");
  console.log("  --no-inbox               Do not import into 127.0.0.1:3977");
  console.log("  --write-files            Write accepted personas directly to Uncompleted/<Type>/");
  console.log("  --novelty <0-1>          Minimum novelty score (default: 0.38)");
  console.log("  --min-score <0-100>      Minimum validator score (default: 70)");
  console.log("  --max-attempts <N>       Candidate generation attempts before stopping");
  console.log("  --model <name>           Ollama model (default: PERSONA_MODEL or gemma4:e4b)");
  console.log("  --report <path>          JSON report path");
  console.log("  --list-domains           Print available product-pressure domains");
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value, max = 64) {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, max) || "persona";
}

function words(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

function tokenSet(value) {
  return new Set(words(value));
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function listPersonaFiles(root) {
  const files = [];
  for (const type of TYPES) {
    const dir = join(root, type);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (![".txt", ".md"].includes(extname(entry.name).toLowerCase())) continue;
      files.push({ type, path: join(dir, entry.name) });
    }
  }
  return files;
}

function extractHeader(text) {
  const match = text.match(/\*\*(Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:\s*"([^"]+)"/i)
    || text.match(/^(Chef|Client|Guest|Vendor|Staff|Partner|Public)\s+Profile:\s*"([^"]+)"/im);
  if (!match) return { type: null, name: null };
  return { type: match[1], name: match[2].trim() };
}

function extractSection(text, label) {
  const pattern = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?:\\n### |\\nPsychological Model|\\nPass / Fail Conditions|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function extractPassFail(text) {
  const marker = /Pass \/ Fail Conditions/i.exec(text);
  if (!marker) return "";
  return text.slice(marker.index).trim();
}

function buildFingerprint(text, fallbackType = "Unknown") {
  const header = extractHeader(text);
  const type = header.type || fallbackType;
  const name = header.name || "Unknown";
  const primaryFailure = extractSection(text, "Primary Failure");
  const passFail = extractPassFail(text);
  const dense = [type, primaryFailure, passFail].join("\n");
  return {
    type,
    name,
    slug: slugify(name),
    tokens: tokenSet(dense),
    passFailTokens: tokenSet(passFail),
    textTokens: tokenSet(text),
  };
}

function collectCorpusFingerprints() {
  const roots = [COMPLETED_ROOT, UNCOMPLETED_ROOT, FAILED_ROOT];
  const fingerprints = [];
  for (const root of roots) {
    for (const file of listPersonaFiles(root)) {
      try {
        const text = readFileSync(file.path, "utf8");
        fingerprints.push({
          ...buildFingerprint(text, file.type),
          path: relative(ROOT, file.path).replace(/\\/g, "/"),
        });
      } catch {}
    }
  }
  return fingerprints;
}

function scoreNovelty(candidateText, corpus) {
  const candidate = buildFingerprint(candidateText);
  let maxSimilarity = 0;
  let nearest = null;
  for (const existing of corpus) {
    const sim = Math.max(
      jaccard(candidate.tokens, existing.tokens),
      jaccard(candidate.passFailTokens, existing.passFailTokens),
      jaccard(candidate.textTokens, existing.textTokens) * 0.7,
    );
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      nearest = existing;
    }
  }
  return {
    novelty: Math.max(0, 1 - maxSimilarity),
    maxSimilarity,
    nearest: nearest ? { name: nearest.name, type: nearest.type, path: nearest.path } : null,
    fingerprint: candidate,
  };
}

function buildAxisPlan(opts) {
  const rng = createRng(opts.seed);
  const domains = opts.domain ? DOMAINS.filter((domain) => domain.id === opts.domain) : DOMAINS;
  const types = opts.type ? [opts.type] : TYPES;
  const plan = [];

  for (let i = 0; i < Math.max(opts.maxAttempts, opts.count); i++) {
    const type = types[i % types.length];
    const domain = domains[i % domains.length];
    const context = pick(CONTEXTS[type], rng);
    plan.push({
      index: i + 1,
      type,
      domain: domain.id,
      domainLabel: domain.label,
      context,
      stakes: pick(STAKES, rng),
      techComfort: pick(TECH_COMFORT, rng),
      moneyPosture: pick(MONEY_POSTURE, rng),
      workflowStyle: pick(WORKFLOW_STYLE, rng),
      changePattern: pick(CHANGE_PATTERN, rng),
      featureTargets: domain.featureTargets,
      pressure: domain.pressure,
    });
  }

  return plan;
}

function buildPrompt(axis, corpusHints) {
  const profileWord = `${axis.type} Profile`;
  const typeLens = {
    Chef: "chef or food service operator",
    Client: "private dining client, host, planner, buyer, or repeat customer",
    Guest: "event guest, attendee, VIP, household member, or invited participant",
    Vendor: "supplier, rental partner, distributor, farm, or service vendor",
    Staff: "event staff, prep worker, server, assistant, driver, or operations worker",
    Partner: "venue, planner, brand, farm, referral, or co-host partner",
    Public: "public visitor, searcher, lead, gift buyer, or referral prospect",
  }[axis.type];

  const avoidList = corpusHints.slice(0, 6).map((item) => `- ${item}`).join("\n") || "- generic pricing, generic messaging, generic scheduling";

  return `You are writing one detailed persona profile for stress-testing a food service operations platform.

Persona type: ${axis.type}
Persona lens: ${typeLens}
Product pressure domain: ${axis.domainLabel}
Context: ${axis.context}
Stakes: ${axis.stakes}
Tech comfort: ${axis.techComfort}
Money posture: ${axis.moneyPosture}
Workflow style: ${axis.workflowStyle}
Change pattern: ${axis.changePattern}
Hidden product feature targets to pressure: ${axis.featureTargets.join(", ")}

This persona must surface a buildable product gap around:
${axis.pressure}

Avoid repeating these already-common patterns unless you add a new edge case:
${avoidList}

Write the persona in FIRST PERSON as if they are describing themselves and their situation to a software evaluation team. Use this exact structure:

**${profileWord}: "[Their Full Name]" - [Their Title/Role] ([One-Word Archetype])**

[2-3 sentence introduction in first person.]

### Business Reality

Right now:
* [5-7 bullet points with specific numbers: event frequency, spend or revenue, headcount, payment constraints, geography, tools used]

### Primary Failure: [Name the Biggest Problem]

[One detailed paragraph about the number-one operational pain point. Be specific: what breaks, what it costs, why current workarounds fail.]

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
- Invent a completely fictional name. Do not use any real celebrity or public figure name.
- Make it feel real: specific dollar amounts, specific tools they currently use, specific frustrations.
- Every pass/fail condition must be something a software system could concretely implement or fail.
- Do not mention ChefFlow by name in the persona text.
- Treat hidden product feature targets as internal guidance. Do not name product-specific features unless a normal user would naturally say that phrase.
- Do not generate recipes or tell a chef what to cook.
- Write 800-1200 words total.
- Do not include preamble or commentary. Start directly with the ${profileWord} line.`;
}

async function callOllama(prompt, opts) {
  const res = await fetch(`${opts.ollamaUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.82,
        top_p: 0.92,
        num_predict: 2200,
      },
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  return String(data.response || "").trim();
}

function cleanGeneratedText(text) {
  return String(text || "")
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/\u2014/g, " - ")
    .trim();
}

function buildCorpusHints(corpus) {
  const hints = new Map();
  for (const item of corpus) {
    if (!item.tokens.size) continue;
    const key = [...item.tokens].slice(0, 5).join(" ");
    if (key) hints.set(key, (hints.get(key) || 0) + 1);
  }
  return [...hints.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

function uniquePath(type, name) {
  const dir = join(UNCOMPLETED_ROOT, type);
  const base = slugify(name);
  let path = join(dir, `${base}.txt`);
  let counter = 2;
  while (existsSync(path)) {
    path = join(dir, `${base}-${counter}.txt`);
    counter++;
  }
  return path;
}

function writeAcceptedFiles(accepted) {
  const written = [];
  for (const item of accepted) {
    const path = uniquePath(item.type, item.name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${item.content.trim()}\n`, "utf8");
    written.push({ ...item, relativePath: relative(ROOT, path).replace(/\\/g, "/") });
  }
  return written;
}

async function importToInbox(accepted, opts) {
  if (!accepted.length) return { created: [], pipeline: "No accepted personas" };

  const entries = accepted.map((item) => ({
    type: item.type,
    name: item.name,
    content: item.content,
  }));

  const res = await fetch(`${opts.inboxUrl}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      defaultType: accepted[0]?.type || "Chef",
      mode: "save-only",
      entries,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Inbox import failed ${res.status}: ${detail.slice(0, 300)}`);
  }

  return await res.json();
}

function inferNameAndType(text, fallbackType) {
  const header = extractHeader(text);
  return {
    type: header.type && TYPES.includes(header.type) ? header.type : fallbackType,
    name: header.name || `${fallbackType} Persona`,
  };
}

function rejection(reason, axis, extra = {}) {
  return {
    axis,
    reason,
    ...extra,
  };
}

async function generateCorpus(opts, plan, corpus) {
  const accepted = [];
  const rejected = [];
  const corpusHints = buildCorpusHints(corpus);

  for (const axis of plan) {
    if (accepted.length >= opts.count) break;

    process.stderr.write(`${TAG} attempt ${axis.index}/${plan.length}: ${axis.type} ${axis.domain} (${accepted.length}/${opts.count} kept)\n`);

    let raw;
    try {
      raw = await callOllama(buildPrompt(axis, corpusHints), opts);
    } catch (err) {
      rejected.push(rejection("ollama_error", axis, { error: err.message }));
      continue;
    }

    const content = cleanGeneratedText(raw);
    const identity = inferNameAndType(content, axis.type);
    const validation = validatePersonaContent(content, { name: identity.name, type: identity.type });
    if (!validation.valid || validation.score < opts.minScore) {
      rejected.push(rejection("validation_failed", axis, { validation }));
      continue;
    }

    const novelty = scoreNovelty(content, corpus);
    if (novelty.novelty < opts.novelty) {
      rejected.push(rejection("low_novelty", axis, { novelty }));
      continue;
    }

    const acceptedItem = {
      type: identity.type,
      name: identity.name,
      slug: slugify(identity.name),
      content,
      axis,
      validation,
      novelty,
      metadata: {
        persona_type: identity.type,
        domain: axis.domain,
        primary_gap: axis.domain,
        severity: axis.stakes.includes("catastrophic") || axis.stakes.includes("legal") ? "high" : "medium",
        feature_implications: axis.featureTargets,
        novelty_score: Number(novelty.novelty.toFixed(3)),
      },
    };

    accepted.push(acceptedItem);
    corpus.push({
      ...novelty.fingerprint,
      path: `generated:${acceptedItem.slug}`,
    });
  }

  return { accepted, rejected };
}

function summarizeRejected(rejected) {
  const counts = {};
  for (const item of rejected) counts[item.reason] = (counts[item.reason] || 0) + 1;
  return counts;
}

function makeReport(opts, plan, corpusCount, result, importResult = null, written = []) {
  return {
    generated_at: new Date().toISOString(),
    mode: opts.execute ? "execute" : "dry-run",
    options: {
      count: opts.count,
      type: opts.type,
      domain: opts.domain,
      model: opts.model,
      novelty: opts.novelty,
      minScore: opts.minScore,
      maxAttempts: opts.maxAttempts,
      importInbox: opts.importInbox,
      writeFiles: opts.writeFiles,
    },
    corpus_count_before: corpusCount,
    plan_count: plan.length,
    accepted_count: result.accepted.length,
    rejected_count: result.rejected.length,
    rejection_counts: summarizeRejected(result.rejected),
    accepted: result.accepted.map((item) => ({
      name: item.name,
      type: item.type,
      domain: item.axis.domain,
      validation_score: item.validation.score,
      novelty_score: Number(item.novelty.novelty.toFixed(3)),
      nearest: item.novelty.nearest,
      metadata: item.metadata,
    })),
    import_result: importResult
      ? {
          created: importResult.created?.length || 0,
          pipeline: importResult.pipeline,
          paths: (importResult.created || []).map((item) => item.relativePath),
        }
      : null,
    written_files: written.map((item) => item.relativePath),
  };
}

function defaultReportPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(REPORT_ROOT, `persona-corpus-${stamp}.json`);
}

function writeReport(path, report) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function assertOllamaReachable(opts) {
  const res = await fetch(`${opts.ollamaUrl.replace(/\/$/, "")}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Ollama health check failed: ${res.status}`);
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.listDomains) {
    console.log(JSON.stringify(DOMAINS.map((domain) => ({
      id: domain.id,
      label: domain.label,
      featureTargets: domain.featureTargets,
    })), null, 2));
    return;
  }
  const plan = buildAxisPlan(opts);

  console.log(`${TAG} Persona Corpus Factory`);
  console.log(`${TAG} target=${opts.count} attempts=${plan.length} type=${opts.type || "all"} domain=${opts.domain || "all"}`);
  console.log(`${TAG} mode=${opts.execute ? "execute" : "dry-run"} model=${opts.model}`);

  if (opts.planOnly || opts.count === 0) {
    console.log(JSON.stringify({ plan: plan.slice(0, opts.count || 25), domains: DOMAINS.map((d) => d.id) }, null, 2));
    return;
  }

  const corpus = collectCorpusFingerprints();
  const corpusCount = corpus.length;
  console.log(`${TAG} corpus fingerprints=${corpusCount}`);

  if (!opts.dryRun) await assertOllamaReachable(opts);
  const result = await generateCorpus(opts, plan, corpus);

  let importResult = null;
  let written = [];

  if (opts.execute && result.accepted.length > 0) {
    if (opts.importInbox) {
      importResult = await importToInbox(result.accepted, opts);
    }
    if (opts.writeFiles) {
      written = writeAcceptedFiles(result.accepted);
    }
  }

  const report = makeReport(opts, plan, corpusCount, result, importResult, written);
  const reportPath = opts.report || (opts.execute ? defaultReportPath() : null);
  if (reportPath) {
    writeReport(resolve(ROOT, reportPath), report);
    console.log(`${TAG} report=${relative(ROOT, resolve(ROOT, reportPath)).replace(/\\/g, "/")}`);
  }

  console.log(`${TAG} accepted=${report.accepted_count} rejected=${report.rejected_count}`);
  console.log(`${TAG} rejection_counts=${JSON.stringify(report.rejection_counts)}`);
  if (importResult) console.log(`${TAG} inbox_created=${importResult.created?.length || 0} pipeline=${importResult.pipeline}`);

  if (result.accepted.length < opts.count) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(`${TAG} ERROR: ${err.message}`);
  process.exit(1);
});
