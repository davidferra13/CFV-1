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
 *   node devtools/persona-corpus-factory.mjs --plan-only --count 25 --edge-mode chaos
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
const EDGE_MODES = ["light", "heavy", "chaos"];
const EDGE_MODE_COUNTS = {
  light: 2,
  heavy: 4,
  chaos: 7,
};

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

const CONTRADICTIONS = [
  "I want zero friction, but I need a complete audit trail if something goes wrong",
  "I want the system to lead me, but I do not want to feel upsold or boxed in",
  "I want total privacy, but I still need clean reimbursement and legal records",
  "I want instant checkout, but I expect every constraint to be validated before payment",
  "I want full customization, but I refuse to become the project manager",
  "I want the lowest possible effort, but I blame the system if a detail is missed",
  "I want everything visible to me, but only selected details visible to other participants",
  "I want pricing locked, but I also expect late changes to be supported cleanly",
  "I trust professionals, but I want proof that critical details were acknowledged",
  "I want automation, but I need human override with traceable responsibility",
];

const EVALUATOR_LENSES = [
  {
    id: "qa-breaker",
    label: "QA engineer trying to break state, validation, and recovery paths",
    pressure: "they intentionally test rapid changes, invalid combinations, stale screens, and inconsistent totals",
  },
  {
    id: "legal-reviewer",
    label: "lawyer reviewing terms, refunds, evidence, and invoice defensibility",
    pressure: "they care about who accepted what, when terms changed, and whether records survive disputes",
  },
  {
    id: "accessibility-reviewer",
    label: "accessibility tester using assistive technology and keyboard-only flows",
    pressure: "they verify dynamic updates, labels, focus order, plain language, and non-visual states",
  },
  {
    id: "security-reviewer",
    label: "security reviewer checking privacy boundaries and least-privilege access",
    pressure: "they look for overexposed data, weak permissions, unsafe defaults, and hidden retention",
  },
  {
    id: "ops-replay",
    label: "operations manager replaying the event from intake to recovery",
    pressure: "they need every handoff, decision, failure, and recovery step to be reconstructable",
  },
];

const MUTATION_AXES = [
  "same persona, but the payer and planner are different people",
  "same persona, but the event moves from a home kitchen to a rural outdoor venue",
  "same persona, but one strict allergy becomes a life-safety issue",
  "same persona, but payment changes from single payer to split group payment",
  "same persona, but connectivity fails during setup or checkout",
  "same persona, but a VIP is added after the plan is locked",
  "same persona, but the assistant can edit logistics and cannot approve money",
  "same persona, but the user needs screen reader and keyboard-only access",
  "same persona, but the booking becomes a cancellation or refund dispute",
  "same persona, but private details must expire after the event",
];

const GLOBAL_EDGE_CASES = [
  "the primary decision maker is not the payer, and the payer refuses extra steps",
  "one participant changes their mind after payment but before the chef has purchased ingredients",
  "a late VIP addition creates a conflict with seating, dietary notes, or privacy boundaries",
  "the event crosses midnight, making dates, staffing hours, and payment deadlines ambiguous",
  "a browser refresh, phone swap, or device handoff must not lose the current configuration",
  "one person needs view-only access while another person can approve money",
  "the user starts on mobile, continues on desktop, then confirms from a different phone",
  "a last-minute cancellation must preserve evidence of who accepted which terms",
  "some information should be visible to the host but hidden from guests",
  "guest count changes after a deposit has been captured but before final payment",
  "a system-generated summary must cite the original message or decision it came from",
  "the user wants a one-tap flow but still needs legally reliable records later",
  "two people give conflicting instructions, and the system must show which one wins",
  "the user has a low tolerance for notifications but needs critical alerts to break through",
  "the event has private notes that must never appear in guest-facing views",
  "a repeat guest has stale dietary data that needs confirmation before reuse",
  "a price, policy, or availability value changes while the user is mid-checkout",
  "a participant only responds verbally or through a forwarded screenshot",
  "the user needs to undo a change without erasing the record that it happened",
  "the system must distinguish a preference from a medical restriction",
  "someone needs a plain-language explanation without exposing internal operations",
  "the user needs proof that an assistant, partner, or chef acknowledged a critical detail",
  "the workflow must survive intermittent connectivity without duplicating actions",
  "the event is emotionally sensitive, and the user does not want public-facing language",
  "a participant intentionally or accidentally tries to exploit a pricing or coupon edge",
  "the user wants full control but refuses to become the project manager",
  "a change is valid operationally but financially unacceptable to one stakeholder",
  "the final plan must be simple, but the history must remain fully searchable",
  "a sensitive detail must expire after the event while the financial record persists",
  "a human can override the system, but the override needs a reason and audit trail",
];

const DOMAIN_EDGE_CASES = {
  "dinner-circles": [
    "a group vote ties, and the host needs a clean tie-break rule",
    "old menu options must stay collapsed but recoverable for later questions",
    "guests keep asking already-answered questions inside the same planning space",
    "one guest should see arrival details but not budget or host notes",
    "a decision was made from several messages, reactions, and a poll, not one clean approval",
    "a late plus-one needs to inherit the current plan without reopening every decision",
    "the final current-state view must explain why discarded options lost",
  ],
  "pricing-checkout": [
    "market-priced seafood or meat changes cost during configuration",
    "an add-on is optional per guest, but the base menu is fixed per event",
    "a user applies a promo, removes a course, then re-adds it to test the price",
    "service fees, travel fees, and staffing minimums interact with guest count",
    "the user needs a locked quote window with a visible expiration time",
    "a quote is valid for payment but invalid for additional customization",
    "the displayed estimate needs a confidence range without feeling fake",
  ],
  "wallet-payments": [
    "the deposit uses Apple Pay, but the final balance is paid from a different wallet",
    "the user's browser wallet is available on desktop but not on the event owner's phone",
    "a saved payment token needs scope limits for add-ons and final charges",
    "the wallet payment succeeds but the booking confirmation webhook arrives late",
    "the user rejects raw card entry even as a fallback path",
    "a group payment split includes one person whose wallet authorization fails",
    "the receipt must be private, but the payer needs reimbursement documentation",
  ],
  "first-timer-guidance": [
    "the buyer does not know whether their kitchen is usable",
    "the user cannot tell the difference between plated, family-style, tasting, and class formats",
    "the user is afraid of looking unsophisticated in front of the chef",
    "the system must explain what the host provides versus what the chef brings",
    "the budget is a stretch, so every unknown creates anxiety",
    "the user wants the chef to lead without feeling upsold",
    "a simple apartment constraint changes what formats are realistic",
  ],
  "premium-concierge": [
    "the principal wants a polished summary while the assistant needs operational detail",
    "unlimited budget still requires a defensible explanation of cost drivers",
    "the event requires Michelin-level expectations without the client knowing the vocabulary",
    "a household staff member is available but not authorized to approve money",
    "the client expects recommendations, not a blank customization form",
    "the system must distinguish luxury optionality from operational necessity",
    "a concierge needs to prepare multiple scenarios without bothering the principal",
  ],
  "privacy-stealth": [
    "notifications, receipts, calendar entries, and vendor names can reveal the surprise",
    "a shared credit card or family email account can expose the booking",
    "the chef needs access instructions but must not call or text at the wrong moment",
    "the user needs a private execution plan that can be hidden quickly",
    "a collaborator should know setup timing but not the surprise details",
    "the user wants records after the event but minimal traces before the reveal",
    "a delivery, rental, or staff arrival could ruin the surprise if mistimed",
  ],
  "venue-logistics": [
    "the kitchen photos are incomplete and the host does not know what matters",
    "parking, elevator access, and load-in time change staffing assumptions",
    "power or water constraints are discovered only after the menu is chosen",
    "a rental home listing says full kitchen but lacks key equipment",
    "the venue has noise, fire, or HOA restrictions that affect service style",
    "an outdoor event needs a weather fallback that changes the prep plan",
    "the chef must acknowledge venue risk before the host pays",
  ],
  "dietary-safety": [
    "one allergy is life-threatening while another note is only a preference",
    "the host knows a guest's restriction but does not want it exposed to the group",
    "a shared fryer, cutting board, or sauce creates cross-contact risk",
    "a repeat guest's old restriction conflicts with their newest message",
    "the final menu needs ingredient-level safety confirmation without recipe generation",
    "a substitution must preserve safety, price, and guest experience",
    "the system needs a day-of safety snapshot that staff can understand quickly",
  ],
  accessibility: [
    "dynamic price updates must be announced to screen readers without becoming noisy",
    "keyboard-only users need to configure guest count, courses, add-ons, and payment",
    "a color-coded safety or pricing state needs non-visual labels",
    "a user with cognitive overload needs a simplified flow without losing details",
    "touch targets, timers, and modal focus traps can block checkout",
    "the same flow needs to work with browser zoom and reduced motion",
    "a user needs plain-language summaries of legal and payment states",
  ],
  international: [
    "the host pays in one currency while the chef sources and staffs in another",
    "timezone confusion changes whether an event is today, tomorrow, or next week",
    "local payment methods differ by country and affect deposit timing",
    "translation needs to preserve legal, dietary, and service details",
    "the event crosses jurisdictions with different tax, permit, or invoice requirements",
    "the user wants local units and language but global payment visibility",
    "exchange rates change between quote lock, deposit, and final balance",
  ],
  "legal-disputes": [
    "the host cancels after sourcing has started and disputes the non-refundable portion",
    "a guest claims an allergy was ignored, and the host needs an evidence trail",
    "a chargeback arrives after the event despite signed approval",
    "the invoice includes a change that was approved only in a message thread",
    "terms changed between proposal and payment, and the accepted version matters",
    "a partial refund must account for deposits, ingredients, labor, and platform fees",
    "a client needs corporate reimbursement records that match the exact quote",
  ],
  "offline-rural": [
    "the event site has no reliable signal during setup or service",
    "offline edits from two devices conflict when connection returns",
    "cached pricing must show whether it is authoritative or stale",
    "the chef needs guest notes and safety details even when the network is down",
    "a rural address is hard to geocode and affects travel cost",
    "payment authorization must be completed before connectivity is lost",
    "low bandwidth should not block a text-only operational plan",
  ],
  adversarial: [
    "a user rapidly changes headcount to find a pricing loophole",
    "a coupon is applied to excluded premium add-ons",
    "a group organizer tries to shift costs unfairly after others have paid",
    "a fake guest profile is used to trigger a dietary accommodation or discount",
    "a user cancels and rebooks to bypass a locked quote or cancellation fee",
    "a participant disputes a charge after consuming the service",
    "an automated abuse rule must not punish a legitimate edge case",
  ],
  "loyalty-rewards": [
    "the organizer wants rewards for the full booking even when guests split payments",
    "card category coding determines whether the transaction earns dining rewards",
    "points expire before the next likely booking",
    "tier progress should change the booking recommendation",
    "a refund or adjustment must claw back rewards correctly",
    "a referral reward conflicts with a promo reward",
    "the user needs cash value, points value, and perk value shown separately",
  ],
  "ai-local-private": [
    "local AI is allowed to summarize messages but not generate recipes",
    "the user wants Gemma 4 through an Ollama-compatible endpoint with no cloud fallback",
    "AI tool calls need field-level permissions and an audit trail",
    "the model is offline, and the system must fail clearly instead of faking output",
    "local memory should expire sensitive client data but keep operational history",
    "a model can read a recipe index but cannot create or edit recipe content",
    "the user wants to swap local models without changing the rest of the workflow",
  ],
};

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
    listEdgeCases: false,
    selfTest: false,
    edgeMode: "heavy",
    evaluatorRate: 0.2,
    mutationsPerPersona: 3,
    scenarioPacks: true,
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
    else if (arg === "--list-edge-cases") opts.listEdgeCases = true;
    else if (arg === "--self-test") opts.selfTest = true;
    else if (arg === "--edge-mode" && argv[i + 1]) opts.edgeMode = argv[++i];
    else if (arg === "--evaluator-rate" && argv[i + 1]) opts.evaluatorRate = Math.max(0, Math.min(1, Number(argv[++i]) || 0));
    else if (arg === "--mutations-per-persona" && argv[i + 1]) opts.mutationsPerPersona = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === "--no-scenario-packs") opts.scenarioPacks = false;
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
  if (!EDGE_MODES.includes(opts.edgeMode)) {
    throw new Error(`Invalid --edge-mode "${opts.edgeMode}". Valid: ${EDGE_MODES.join(", ")}`);
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
  console.log("  --list-edge-cases        Print edge-case pools by domain");
  console.log("  --self-test              Build a deterministic report fixture without Ollama");
  console.log("  --edge-mode <mode>       light, heavy, or chaos edge-case pressure (default: heavy)");
  console.log("  --evaluator-rate <0-1>   Share of plans using evaluator personas (default: 0.2)");
  console.log("  --mutations-per-persona <N>  Mutation ideas per accepted persona (default: 3)");
  console.log("  --no-scenario-packs      Do not include deterministic replay packs in reports");
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

function shuffleCopy(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickEdgeCases(domainId, rng, mode) {
  const count = EDGE_MODE_COUNTS[mode] || EDGE_MODE_COUNTS.heavy;
  const domainCases = shuffleCopy(DOMAIN_EDGE_CASES[domainId] || [], rng);
  const globalCases = shuffleCopy(GLOBAL_EDGE_CASES, rng);
  const selected = [];

  const domainTarget = Math.max(1, Math.ceil(count * 0.6));
  for (const item of domainCases) {
    if (selected.length >= domainTarget) break;
    selected.push(item);
  }

  for (const item of [...globalCases, ...domainCases]) {
    if (selected.length >= count) break;
    if (!selected.includes(item)) selected.push(item);
  }

  return selected;
}

function pickMany(items, rng, count) {
  return shuffleCopy(items, rng).slice(0, Math.max(0, count));
}

function edgeCaseId(domainId, text) {
  const pool = (DOMAIN_EDGE_CASES[domainId] || []).includes(text) ? domainId : "global";
  return `${pool}.${slugify(text, 72)}`;
}

function edgeCaseRecords(domainId, edgeCases) {
  return edgeCases.map((text) => ({
    id: edgeCaseId(domainId, text),
    domain: (DOMAIN_EDGE_CASES[domainId] || []).includes(text) ? domainId : "global",
    text,
  }));
}

function buildCoverageLedger(plan, accepted = []) {
  const ledger = new Map();
  for (const axis of plan) {
    for (const edge of edgeCaseRecords(axis.domain, axis.edgeCases || [])) {
      if (!ledger.has(edge.id)) {
        ledger.set(edge.id, {
          ...edge,
          planned: 0,
          accepted: 0,
          accepted_personas: [],
        });
      }
      ledger.get(edge.id).planned++;
    }
  }

  for (const item of accepted) {
    for (const edge of edgeCaseRecords(item.axis.domain, item.axis.edgeCases || [])) {
      if (!ledger.has(edge.id)) {
        ledger.set(edge.id, {
          ...edge,
          planned: 0,
          accepted: 0,
          accepted_personas: [],
        });
      }
      const record = ledger.get(edge.id);
      record.accepted++;
      record.accepted_personas.push(item.name);
    }
  }

  const records = [...ledger.values()].sort((a, b) => a.id.localeCompare(b.id));
  return {
    planned_edge_cases: records.length,
    accepted_edge_cases: records.filter((item) => item.accepted > 0).length,
    uncovered_edge_cases: records.filter((item) => item.accepted === 0).map((item) => item.id),
    records,
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
      edgeMode: opts.edgeMode,
      edgeCases: pickEdgeCases(domain.id, rng, opts.edgeMode),
      contradictions: pickMany(CONTRADICTIONS, rng, 2),
      evaluatorLens: rng() < opts.evaluatorRate ? pick(EVALUATOR_LENSES, rng) : null,
    });
  }

  return plan;
}

function intensifyAxisForSaturation(axis, lowNoveltyStreak) {
  if (lowNoveltyStreak < 2) return axis;
  const rng = createRng(axis.index * 997 + lowNoveltyStreak);
  const extraEdges = pickMany([...GLOBAL_EDGE_CASES, ...(DOMAIN_EDGE_CASES[axis.domain] || [])], rng, EDGE_MODE_COUNTS.chaos);
  const mergedEdges = [...axis.edgeCases];
  for (const edge of extraEdges) {
    if (mergedEdges.length >= EDGE_MODE_COUNTS.chaos) break;
    if (!mergedEdges.includes(edge)) mergedEdges.push(edge);
  }
  return {
    ...axis,
    edgeMode: "chaos",
    edgeCases: mergedEdges,
    contradictions: pickMany(CONTRADICTIONS, rng, 3),
    evaluatorLens: axis.evaluatorLens || pick(EVALUATOR_LENSES, rng),
    saturationPivot: {
      reason: "low_novelty_streak",
      streak: lowNoveltyStreak,
    },
  };
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
  const edgeCaseList = axis.edgeCases.map((item) => `- ${item}`).join("\n");
  const contradictionList = axis.contradictions.map((item) => `- ${item}`).join("\n");
  const evaluatorText = axis.evaluatorLens
    ? `Evaluator lens: ${axis.evaluatorLens.label}
Evaluator pressure: ${axis.evaluatorLens.pressure}`
    : "Evaluator lens: none. Write as the actual stakeholder, not as a product reviewer.";

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
${evaluatorText}

This persona must surface a buildable product gap around:
${axis.pressure}

Mandatory edge cases to pressure-test:
${edgeCaseList}

Mandatory contradictions to include:
${contradictionList}

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
- At least 4 of the 7 pass/fail conditions must directly test the mandatory edge cases above.
- Include at least one operational consequence, one financial or legal consequence, and one emotional stake tied to the edge cases.
- Do not make the edge cases abstract. Anchor them in exact channels, dates, roles, payment states, devices, permissions, or venue constraints.
- Preserve the mandatory contradictions as real tradeoffs. Do not resolve them with a generic "balance" statement.
- If an evaluator lens is present, make the persona feel like a real buyer or operator who evaluates systems through that lens, not like an auditor checklist.
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

function splitPassFailRequirements(text) {
  const passFail = extractPassFail(text);
  const matches = [...passFail.matchAll(/^\s*(?:\d+\.|-|\*)\s+(.+?)(?=\n\s*(?:\d+\.|-|\*)\s+|\n*$)/gms)];
  return matches
    .map((match) => match[1].replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 20)
    .slice(0, 12);
}

function edgeCaseMatch(requirement, edgeRecords) {
  const reqTokens = tokenSet(requirement);
  let best = null;
  let bestScore = 0;
  for (const edge of edgeRecords) {
    const score = jaccard(reqTokens, tokenSet(edge.text));
    if (score > bestScore) {
      best = edge;
      bestScore = score;
    }
  }
  return bestScore >= 0.08 ? { ...best, score: Number(bestScore.toFixed(3)) } : null;
}

function classifyRequirement(requirement, axis) {
  const text = normalizeText(requirement);
  const feature = axis.featureTargets.find((target) => {
    const targetWords = words(target);
    return targetWords.some((word) => text.includes(word));
  });
  const signals = [
    ["payment", "payment"],
    ["price", "pricing"],
    ["quote", "pricing"],
    ["invoice", "finance"],
    ["refund", "finance"],
    ["permission", "access-control"],
    ["role", "access-control"],
    ["allergy", "dietary-safety"],
    ["dietary", "dietary-safety"],
    ["offline", "offline"],
    ["sync", "sync"],
    ["audit", "audit"],
    ["history", "audit"],
    ["wallet", "wallet"],
    ["notification", "communication"],
    ["message", "communication"],
    ["venue", "venue"],
  ];
  const signal = signals.find(([needle]) => text.includes(needle));
  return feature || signal?.[1] || axis.domain;
}

function extractRequirementRecords(accepted) {
  const seen = new Map();
  const records = [];

  for (const item of accepted) {
    const edgeRecords = edgeCaseRecords(item.axis.domain, item.axis.edgeCases || []);
    for (const requirement of splitPassFailRequirements(item.content)) {
      const normalized = slugify(requirement, 96);
      const existing = seen.get(normalized);
      const edgeMatch = edgeCaseMatch(requirement, edgeRecords);
      const record = {
        id: normalized,
        requirement,
        type: item.type,
        persona: item.name,
        domain: item.axis.domain,
        feature_area: classifyRequirement(requirement, item.axis),
        edge_case_id: edgeMatch?.id || null,
        edge_case_match_score: edgeMatch?.score || 0,
        testability: requirement.length > 45 && /\b(must|allow|provide|track|show|support|prevent|maintain|generate|alert|ensure)\b/i.test(requirement)
          ? "high"
          : "medium",
      };

      if (existing) {
        existing.personas.push(item.name);
        existing.count++;
      } else {
        seen.set(normalized, {
          ...record,
          personas: [item.name],
          count: 1,
        });
        records.push(seen.get(normalized));
      }
    }
  }

  return records.sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

function buildScenarioPack(item) {
  const edges = edgeCaseRecords(item.axis.domain, item.axis.edgeCases || []);
  const requirements = splitPassFailRequirements(item.content);
  return {
    persona: item.name,
    type: item.type,
    domain: item.axis.domain,
    setup: {
      context: item.axis.context,
      stakes: item.axis.stakes,
      workflowStyle: item.axis.workflowStyle,
      changePattern: item.axis.changePattern,
      evaluatorLens: item.axis.evaluatorLens?.id || null,
    },
    replay_steps: [
      "Start from the first inquiry or planning action and capture the initial source channel.",
      "Apply the first edge case and verify current state, history, permissions, and pricing remain coherent.",
      "Apply the second edge case as a mid-flow change and verify the system shows who changed what.",
      "Force one contradiction into the workflow and verify the system supports both sides without hiding risk.",
      "Lock the final state and verify it can be traced back to original inputs.",
      "Trigger a failure or dispute path and verify the evidence, recovery step, and responsible actor are visible.",
    ],
    edge_case_ids: edges.map((edge) => edge.id),
    expected_assertions: requirements.slice(0, 7),
  };
}

function buildMutationPlans(accepted, perPersona) {
  if (perPersona <= 0) return [];
  const plans = [];
  for (const item of accepted) {
    const rng = createRng(words(item.name).join("").length + item.axis.index);
    for (const mutation of pickMany(MUTATION_AXES, rng, perPersona)) {
      plans.push({
        source_persona: item.name,
        type: item.type,
        domain: item.axis.domain,
        mutation,
        expected_new_pressure: `${item.axis.domain}: ${mutation}`,
        keep_constant: ["persona voice", "core business context", "primary domain"],
        change_only: mutation,
      });
    }
  }
  return plans;
}

function rankBuildGaps(requirements, accepted) {
  const severityWeights = new Map();
  for (const item of accepted) {
    const weight = item.metadata.severity === "high" ? 3 : 2;
    for (const target of item.axis.featureTargets || []) {
      severityWeights.set(target, (severityWeights.get(target) || 0) + weight);
    }
  }

  const groups = new Map();
  for (const requirement of requirements) {
    const key = `${requirement.domain}:${requirement.feature_area}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: slugify(key, 96),
        domain: requirement.domain,
        feature_area: requirement.feature_area,
        requirement_count: 0,
        persona_count: 0,
        edge_case_count: 0,
        score: 0,
        sample_requirements: [],
      });
    }
    const group = groups.get(key);
    group.requirement_count += requirement.count;
    group.persona_count += requirement.personas.length;
    if (requirement.edge_case_id) group.edge_case_count++;
    if (group.sample_requirements.length < 3) group.sample_requirements.push(requirement.requirement);
  }

  for (const group of groups.values()) {
    const featureWeight = severityWeights.get(group.feature_area) || 1;
    group.score = group.requirement_count * 2 + group.persona_count + group.edge_case_count * 3 + featureWeight;
  }

  return [...groups.values()].sort((a, b) => b.score - a.score).slice(0, 25);
}

async function generateCorpus(opts, plan, corpus) {
  const accepted = [];
  const rejected = [];
  const corpusHints = buildCorpusHints(corpus);
  let lowNoveltyStreak = 0;

  for (const axis of plan) {
    if (accepted.length >= opts.count) break;

    const activeAxis = intensifyAxisForSaturation(axis, lowNoveltyStreak);
    const pivotText = activeAxis.saturationPivot ? ` pivot=${activeAxis.saturationPivot.streak}` : "";
    process.stderr.write(`${TAG} attempt ${axis.index}/${plan.length}: ${activeAxis.type} ${activeAxis.domain}${pivotText} (${accepted.length}/${opts.count} kept)\n`);

    let raw;
    try {
      raw = await callOllama(buildPrompt(activeAxis, corpusHints), opts);
    } catch (err) {
      rejected.push(rejection("ollama_error", activeAxis, { error: err.message }));
      continue;
    }

    const content = cleanGeneratedText(raw);
    const identity = inferNameAndType(content, activeAxis.type);
    const validation = validatePersonaContent(content, { name: identity.name, type: identity.type });
    if (!validation.valid || validation.score < opts.minScore) {
      lowNoveltyStreak = 0;
      rejected.push(rejection("validation_failed", activeAxis, { validation }));
      continue;
    }

    const novelty = scoreNovelty(content, corpus);
    if (novelty.novelty < opts.novelty) {
      lowNoveltyStreak++;
      rejected.push(rejection("low_novelty", activeAxis, { novelty }));
      continue;
    }

    lowNoveltyStreak = 0;
    const acceptedItem = {
      type: identity.type,
      name: identity.name,
      slug: slugify(identity.name),
      content,
      axis: activeAxis,
      validation,
      novelty,
      metadata: {
        persona_type: identity.type,
        domain: axis.domain,
        primary_gap: axis.domain,
        severity: axis.stakes.includes("catastrophic") || axis.stakes.includes("legal") ? "high" : "medium",
        feature_implications: axis.featureTargets,
        edge_cases: axis.edgeCases,
        edge_case_ids: edgeCaseRecords(axis.domain, axis.edgeCases).map((item) => item.id),
        edge_mode: axis.edgeMode,
        contradictions: axis.contradictions,
        evaluator_lens: axis.evaluatorLens?.id || null,
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
      edgeMode: opts.edgeMode,
      evaluatorRate: opts.evaluatorRate,
      mutationsPerPersona: opts.mutationsPerPersona,
      scenarioPacks: opts.scenarioPacks,
      importInbox: opts.importInbox,
      writeFiles: opts.writeFiles,
    },
    corpus_count_before: corpusCount,
    plan_count: plan.length,
    accepted_count: result.accepted.length,
    rejected_count: result.rejected.length,
    rejection_counts: summarizeRejected(result.rejected),
    saturation_pivots: result.rejected.filter((item) => item.axis?.saturationPivot).length
      + result.accepted.filter((item) => item.axis?.saturationPivot).length,
    edge_coverage: buildCoverageLedger(plan, result.accepted),
    requirements: extractRequirementRecords(result.accepted),
    scenario_packs: opts.scenarioPacks ? result.accepted.map((item) => buildScenarioPack(item)) : [],
    mutation_plans: buildMutationPlans(result.accepted, opts.mutationsPerPersona),
    build_gap_ranking: rankBuildGaps(extractRequirementRecords(result.accepted), result.accepted),
    accepted: result.accepted.map((item) => ({
      name: item.name,
      type: item.type,
      domain: item.axis.domain,
      validation_score: item.validation.score,
      novelty_score: Number(item.novelty.novelty.toFixed(3)),
      nearest: item.novelty.nearest,
      edge_cases: item.axis.edgeCases,
      contradictions: item.axis.contradictions,
      evaluator_lens: item.axis.evaluatorLens?.id || null,
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

function selfTestPersonaContent(axis) {
  return `**Client Profile: "Marina Vale" - Operations Host (Verifier)**

I coordinate private dinners for partners who expect the plan to be exact before money moves. I am willing to pay, but I need proof that every decision, payment, and change remains traceable.

### Business Reality

Right now:
* I book 8 private dinners per year with 8-14 guests and budgets from $4,000 to $12,000.
* Deposits are usually 40%, final invoices need approval from my finance lead, and guest count changes happen until 48 hours before service.
* One guest has a strict nut allergy, one stakeholder is view-only, and the payer refuses extra account setup.
* Events happen in rented homes, partner offices, and private residences across 3 cities.
* I coordinate through email, SMS, shared docs, calendar holds, and forwarded screenshots.

### Primary Failure: Missing Decision Proof

The biggest problem is that final plans lose the evidence behind them. If a menu, guest count, or payment term changes, I need to know who approved it, when it changed, and whether the payer saw the final amount. My workaround is copying messages into a document, but it creates stale versions and still does not prove what was accepted.

### Structural Issue: Split Authority

The person choosing the experience is often not the payer. I currently forward summaries to finance, but that creates delays and unclear responsibility when the price changes.

### Structural Issue: Collapsed Context

I need a clean final view, but old options cannot disappear. When someone asks why a choice was rejected, I need the poll, messages, and final decision available without cluttering the current plan.

### Structural Issue: Late Safety Changes

Dietary notes can arrive after the deposit. I need those updates to affect the final plan without reopening every approved decision.

### Psychological Model

I optimize for: traceability, speed, and clean approvals
I refuse to compromise on: payment clarity, allergy safety, and decision evidence
I avoid: stale summaries, hidden changes, and repeated explanations
I evaluate tools by: whether they preserve proof while keeping the current plan simple

### Pass / Fail Conditions

For this system to work for me, it must:

1. Maintain a locked quote snapshot with payer approval, timestamp, accepted terms, and exact total.
2. Show who changed guest count after deposit and automatically recalculate the final balance.
3. Preserve discarded menu options in a collapsed history with the reason each option lost.
4. Separate host, payer, guest, and view-only stakeholder permissions without duplicating the event.
5. Link every final decision to its source message, poll, file, or screenshot.
6. Distinguish medical allergies from preferences and require acknowledgement before final service.
7. Generate an invoice and evidence packet that match the final approved quote exactly.`;
}

function runSelfTest(opts) {
  const plan = buildAxisPlan({ ...opts, count: 1, maxAttempts: 1, type: opts.type || "Client", domain: opts.domain || "dinner-circles" });
  const axis = plan[0];
  const content = selfTestPersonaContent(axis);
  const identity = inferNameAndType(content, axis.type);
  const validation = validatePersonaContent(content, { name: identity.name, type: identity.type });
  const novelty = scoreNovelty(content, []);
  const accepted = [
    {
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
        severity: "high",
        feature_implications: axis.featureTargets,
        edge_cases: axis.edgeCases,
        edge_case_ids: edgeCaseRecords(axis.domain, axis.edgeCases).map((item) => item.id),
        edge_mode: axis.edgeMode,
        contradictions: axis.contradictions,
        evaluator_lens: axis.evaluatorLens?.id || null,
        novelty_score: Number(novelty.novelty.toFixed(3)),
      },
    },
  ];
  return makeReport({ ...opts, execute: false }, plan, 0, { accepted, rejected: [] });
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
  if (opts.listEdgeCases) {
    console.log(JSON.stringify({
      modes: EDGE_MODE_COUNTS,
      global: GLOBAL_EDGE_CASES,
      domains: DOMAIN_EDGE_CASES,
      contradictions: CONTRADICTIONS,
      evaluator_lenses: EVALUATOR_LENSES,
      mutation_axes: MUTATION_AXES,
    }, null, 2));
    return;
  }
  if (opts.selfTest) {
    console.log(JSON.stringify(runSelfTest(opts), null, 2));
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
