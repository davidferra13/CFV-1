#!/usr/bin/env node
/**
 * Persona Eval Compiler
 *
 * Consumes persona corpus factory reports and compiles them into actionable
 * eval assets: coverage gaps, requirement specs, workflow DSL scripts, review
 * queues, golden candidates, negative prompt signals, and next-run commands.
 *
 * Safe defaults:
 * - Reads reports only.
 * - Prints JSON to stdout unless --write is passed.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const TAG = "[persona-eval-case-compiler]";
const REPORT_ROOT = join(ROOT, "reports", "persona-corpus-factory");
const DEFAULT_TARGET_FILE = join(ROOT, "system", "persona-corpus-targets.json");
const DEFAULT_OUT_DIR = join(ROOT, "reports", "persona-eval-case-compiler");

const DEFAULT_DOMAINS = [
  "dinner-circles",
  "pricing-checkout",
  "wallet-payments",
  "first-timer-guidance",
  "premium-concierge",
  "privacy-stealth",
  "venue-logistics",
  "dietary-safety",
  "accessibility",
  "international",
  "legal-disputes",
  "offline-rural",
  "adversarial",
  "loyalty-rewards",
  "ai-local-private",
];

const DEFAULT_TARGETS = {
  minimumAcceptedPerDomain: 25,
  minimumRequirementsPerDomain: 30,
  minimumAcceptedPerEdgeCase: 3,
  minimumGoldenCandidates: 100,
  priorityDomains: [
    "dinner-circles",
    "pricing-checkout",
    "wallet-payments",
    "dietary-safety",
    "legal-disputes",
    "offline-rural",
    "adversarial",
  ],
};

function parseArgs(argv) {
  const opts = {
    reportsDir: REPORT_ROOT,
    reports: [],
    targetFile: DEFAULT_TARGET_FILE,
    out: null,
    write: false,
    latest: 0,
    minRequirementQuality: 60,
    maxSpecs: 250,
    maxWorkflows: 250,
    maxGolden: 300,
    listReports: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--reports-dir" && argv[i + 1]) opts.reportsDir = resolve(ROOT, argv[++i]);
    else if (arg === "--report" && argv[i + 1]) opts.reports.push(resolve(ROOT, argv[++i]));
    else if (arg === "--target-file" && argv[i + 1]) opts.targetFile = resolve(ROOT, argv[++i]);
    else if (arg === "--out" && argv[i + 1]) opts.out = resolve(ROOT, argv[++i]);
    else if (arg === "--write") opts.write = true;
    else if (arg === "--latest" && argv[i + 1]) opts.latest = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === "--min-requirement-quality" && argv[i + 1]) opts.minRequirementQuality = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === "--max-specs" && argv[i + 1]) opts.maxSpecs = Math.max(1, Number(argv[++i]) || opts.maxSpecs);
    else if (arg === "--max-workflows" && argv[i + 1]) opts.maxWorkflows = Math.max(1, Number(argv[++i]) || opts.maxWorkflows);
    else if (arg === "--max-golden" && argv[i + 1]) opts.maxGolden = Math.max(1, Number(argv[++i]) || opts.maxGolden);
    else if (arg === "--list-reports") opts.listReports = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

function printHelp() {
  console.log("Usage: node devtools/persona-eval-case-compiler.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --reports-dir <path>         Corpus report directory");
  console.log("  --report <path>              Include a specific report. Repeatable");
  console.log("  --latest <N>                 Compile only the latest N reports");
  console.log("  --target-file <path>         Coverage target JSON file");
  console.log("  --out <path>                 Output JSON path when --write is used");
  console.log("  --write                      Write compiled JSON to disk");
  console.log("  --max-specs <N>              Max requirement specs to emit");
  console.log("  --max-workflows <N>          Max workflow DSL scripts to emit");
  console.log("  --max-golden <N>             Max golden candidates to emit");
  console.log("  --list-reports               Print discovered report files");
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

function slugify(value, max = 96) {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, max) || "item";
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function safeReadJson(path, fallback) {
  try {
    if (!existsSync(path)) return fallback;
    return readJson(path);
  } catch {
    return fallback;
  }
}

function discoverReports(opts) {
  const explicit = opts.reports.filter((path) => existsSync(path));
  if (explicit.length) return explicit;
  if (!existsSync(opts.reportsDir)) return [];

  const reports = readdirSync(opts.reportsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".json")
    .map((entry) => join(opts.reportsDir, entry.name))
    .filter((path) => {
      try {
        const data = readJson(path);
        return data && (Array.isArray(data.accepted) || Array.isArray(data.requirements) || data.edge_coverage);
      } catch {
        return false;
      }
    })
    .sort((a, b) => readFileTime(b) - readFileTime(a));

  return opts.latest > 0 ? reports.slice(0, opts.latest) : reports;
}

function readFileTime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function loadReports(paths) {
  const loaded = [];
  for (const path of paths) {
    try {
      loaded.push({
        path,
        relativePath: relative(ROOT, path).replace(/\\/g, "/"),
        data: readJson(path),
      });
    } catch (err) {
      loaded.push({
        path,
        relativePath: relative(ROOT, path).replace(/\\/g, "/"),
        error: err.message,
      });
    }
  }
  return loaded;
}

function targetConfig(path) {
  const userTargets = safeReadJson(path, {});
  return {
    ...DEFAULT_TARGETS,
    ...userTargets,
    priorityDomains: userTargets.priorityDomains || DEFAULT_TARGETS.priorityDomains,
    domainTargets: userTargets.domainTargets || {},
    edgeTargets: userTargets.edgeTargets || {},
  };
}

function reportItems(reports, key) {
  const items = [];
  for (const report of reports) {
    if (report.error) continue;
    const values = report.data?.[key];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      items.push({
        ...value,
        source_report: report.relativePath,
      });
    }
  }
  return items;
}

function aggregateEdgeCoverage(reports) {
  const edges = new Map();
  for (const report of reports) {
    if (report.error) continue;
    for (const record of report.data?.edge_coverage?.records || []) {
      const id = record.id || slugify(record.text);
      if (!edges.has(id)) {
        edges.set(id, {
          id,
          domain: record.domain || "unknown",
          text: record.text || id,
          planned: 0,
          accepted: 0,
          accepted_personas: new Set(),
          source_reports: new Set(),
        });
      }
      const edge = edges.get(id);
      edge.planned += Number(record.planned || 0);
      edge.accepted += Number(record.accepted || 0);
      for (const persona of record.accepted_personas || []) edge.accepted_personas.add(persona);
      edge.source_reports.add(report.relativePath);
    }
  }

  return [...edges.values()].map((edge) => ({
    ...edge,
    accepted_personas: [...edge.accepted_personas].sort(),
    source_reports: [...edge.source_reports].sort(),
  }));
}

function aggregateDomainStats(accepted, requirements) {
  const domains = new Map(DEFAULT_DOMAINS.map((domain) => [domain, { domain, accepted: 0, requirements: 0, personas: new Set() }]));

  for (const item of accepted) {
    const domain = item.domain || item.metadata?.domain || "unknown";
    if (!domains.has(domain)) domains.set(domain, { domain, accepted: 0, requirements: 0, personas: new Set() });
    const record = domains.get(domain);
    record.accepted++;
    if (item.name) record.personas.add(item.name);
  }

  for (const req of requirements) {
    const domain = req.domain || "unknown";
    if (!domains.has(domain)) domains.set(domain, { domain, accepted: 0, requirements: 0, personas: new Set() });
    domains.get(domain).requirements += Number(req.count || 1);
  }

  return [...domains.values()].map((record) => ({
    domain: record.domain,
    accepted: record.accepted,
    requirements: record.requirements,
    personas: record.personas.size,
  }));
}

function computeCoverageGaps(domainStats, edgeStats, targets) {
  const domainGaps = domainStats
    .map((record) => {
      const target = targets.domainTargets?.[record.domain]?.accepted || targets.minimumAcceptedPerDomain;
      const requirementTarget = targets.domainTargets?.[record.domain]?.requirements || targets.minimumRequirementsPerDomain;
      return {
        domain: record.domain,
        accepted: record.accepted,
        accepted_target: target,
        accepted_gap: Math.max(0, target - record.accepted),
        requirements: record.requirements,
        requirements_target: requirementTarget,
        requirements_gap: Math.max(0, requirementTarget - record.requirements),
      };
    })
    .filter((record) => record.accepted_gap > 0 || record.requirements_gap > 0)
    .sort((a, b) => b.accepted_gap + b.requirements_gap - (a.accepted_gap + a.requirements_gap));

  const edgeGaps = edgeStats
    .map((record) => {
      const target = targets.edgeTargets?.[record.id] || targets.minimumAcceptedPerEdgeCase;
      return {
        id: record.id,
        domain: record.domain,
        text: record.text,
        accepted: record.accepted,
        accepted_target: target,
        accepted_gap: Math.max(0, target - record.accepted),
      };
    })
    .filter((record) => record.accepted_gap > 0)
    .sort((a, b) => b.accepted_gap - a.accepted_gap || a.id.localeCompare(b.id));

  return { domains: domainGaps, edges: edgeGaps };
}

function scoreRequirementQuality(req) {
  let score = 0;
  const text = String(req.requirement || "");
  if (text.length >= 50) score += 20;
  if (/\b(must|allow|provide|track|show|support|prevent|maintain|generate|alert|ensure|preserve|separate|link)\b/i.test(text)) score += 25;
  if (req.edge_case_id) score += 20;
  if (req.testability === "high") score += 15;
  if (req.feature_area) score += 10;
  if (req.persona || req.personas?.length) score += 10;
  return Math.min(100, score);
}

function routeHint(req) {
  const domain = req.domain || "";
  if (domain.includes("pricing") || req.feature_area === "pricing") return "/client/events/[id]/checkout";
  if (domain.includes("wallet")) return "/client/events/[id]/checkout";
  if (domain.includes("dinner-circles")) return "/client/circles/[id]";
  if (domain.includes("dietary")) return "/client/events/[id]/guests";
  if (domain.includes("legal")) return "/client/events/[id]/agreements";
  if (domain.includes("venue")) return "/client/events/[id]/venue";
  if (domain.includes("offline")) return "/client/events/[id]";
  return "/client/events/[id]";
}

function compileRequirementSpecs(requirements, opts) {
  const specs = requirements
    .map((req) => {
      const quality = scoreRequirementQuality(req);
      const normalized = normalizeText(req.requirement || req.id);
      const id = `req-${slugify(req.domain || "domain", 24)}-${slugify(req.requirement || req.id, 72)}`;
      return {
        schema: "chefflow.requirement_spec.v1",
        id,
        statement: req.requirement,
        normalized_statement: normalized,
        type: inferRequirementType(req),
        domain: req.domain,
        feature_area: req.feature_area,
        priority: quality >= 85 ? "high" : quality >= 70 ? "medium" : "low",
        testability: req.testability || "medium",
        quality_score: quality,
        source: {
          personas: req.personas || (req.persona ? [req.persona] : []),
          source_report: req.source_report,
          requirement_count: Number(req.count || 1),
          edge_case_ids: req.edge_case_id ? [req.edge_case_id] : [],
          edge_case_match_score: Number(req.edge_case_match_score || 0),
        },
        acceptance_criteria: acceptanceCriteria(req),
        data_contract: dataContract(req),
        workflow_refs: [`workflow-${slugify(req.domain || "domain", 24)}-${slugify(req.persona || req.personas?.[0] || "persona", 48)}`],
        dedupe: {
          canonical_key: `${req.domain || "unknown"}:${req.feature_area || "unknown"}:${slugify(normalized, 56)}`,
          similar_requirement_ids: [],
        },
        test_export: {
          test_type: "playwright-or-unit",
          route_hint: routeHint(req),
          assertion: `Verify: ${req.requirement}`,
        },
      };
    })
    .filter((spec) => spec.quality_score >= opts.minRequirementQuality)
    .sort((a, b) => b.quality_score - a.quality_score || a.id.localeCompare(b.id))
    .slice(0, opts.maxSpecs);
  return specs;
}

function inferRequirementType(req) {
  const text = normalizeText(req.requirement);
  if (/\b(invoice|payment|refund|quote|price|ledger|terms|approval)\b/.test(text)) return "financial";
  if (/\b(permission|role|access|private|hidden|visible)\b/.test(text)) return "access-control";
  if (/\b(allergy|dietary|medical|safety)\b/.test(text)) return "safety";
  if (/\b(audit|history|evidence|trace|timestamp|source)\b/.test(text)) return "auditability";
  return "functional";
}

function acceptanceCriteria(req) {
  const statement = String(req.requirement || "The system satisfies the requirement.");
  const actor = (req.personas || [req.persona || "user"])[0];
  return [
    {
      id: "ac_001",
      given: `A ${actor} is using the relevant ${req.domain || "persona"} workflow.`,
      when: statement,
      then: "The system records the resulting state change and shows the user the current authoritative state.",
    },
    {
      id: "ac_002",
      given: "The same workflow is later reviewed during execution, payment, or dispute handling.",
      when: "A user opens the related event, plan, invoice, or evidence view.",
      then: "The system exposes the source actor, timestamp, and relevant linked data without requiring manual reconstruction.",
    },
  ];
}

function dataContract(req) {
  const text = normalizeText(req.requirement);
  return {
    money_fields_minor_units: /\b(price|payment|invoice|refund|quote|deposit|total|balance)\b/.test(text),
    requires_ledger_entry: /\b(payment|invoice|refund|quote|deposit|chargeback|approval)\b/.test(text),
    requires_actor_id: /\b(who|actor|approval|changed|permission|role|acknowledge|source)\b/.test(text),
    requires_tenant_scope: true,
    requires_timestamp: /\b(timestamp|when|history|audit|trace|source|accepted|approved)\b/.test(text),
  };
}

function workflowAction(step, index) {
  const text = String(step || "");
  const lower = normalizeText(text);
  let actor = "system";
  if (lower.includes("host")) actor = "host";
  else if (lower.includes("payer")) actor = "payer";
  else if (lower.includes("guest")) actor = "guest";
  else if (lower.includes("chef")) actor = "chef";
  else if (lower.includes("staff")) actor = "staff";

  let action = "assert_state";
  if (lower.includes("start") || lower.includes("capture")) action = "capture_input";
  else if (lower.includes("apply")) action = "apply_edge_case";
  else if (lower.includes("force")) action = "force_contradiction";
  else if (lower.includes("lock")) action = "lock_final_state";
  else if (lower.includes("trigger")) action = "trigger_failure_path";

  return {
    step: index + 1,
    actor,
    action,
    input: text,
    assert: lower.includes("verify") ? text.replace(/^.*?\bverify\b/i, "verify").trim() : text,
  };
}

function compileWorkflowDsl(scenarioPacks, opts) {
  return scenarioPacks.slice(0, opts.maxWorkflows).map((pack) => ({
    schema: "chefflow.workflow_dsl.v1",
    id: `workflow-${slugify(pack.domain || "domain", 24)}-${slugify(pack.persona || "persona", 48)}`,
    title: `${pack.domain || "persona"} replay for ${pack.persona || "unknown persona"}`,
    source: {
      report_path: pack.source_report,
      persona: pack.persona,
      persona_type: pack.type,
      domain: pack.domain,
      edge_case_ids: pack.edge_case_ids || [],
      requirement_ids: (pack.expected_assertions || []).map((assertion) => `req-${slugify(pack.domain || "domain", 24)}-${slugify(assertion, 72)}`),
    },
    actors: workflowActors(pack),
    initial_state: workflowInitialState(pack),
    persona: pack.persona,
    type: pack.type,
    domain: pack.domain,
    setup: pack.setup || {},
    edge_case_ids: pack.edge_case_ids || [],
    steps: (pack.replay_steps || []).map((step, index) => workflowAction(step, index)),
    failure_paths: workflowFailurePaths(pack),
    expected_assertions: pack.expected_assertions || [],
    coverage: {
      domains: [pack.domain].filter(Boolean),
      feature_areas: inferFeatureAreas(pack.expected_assertions || []),
      risk_tags: (pack.edge_case_ids || []).map((id) => id.split(".").slice(1).join(".")).filter(Boolean).slice(0, 6),
    },
  }));
}

function workflowActors(pack) {
  const base = [
    { id: "host", role: "client_host", permissions: ["plan_event", "invite_guests", "view_current_state"] },
    { id: "chef", role: "chef", permissions: ["propose_plan", "acknowledge_changes"] },
    { id: "system", role: "system", permissions: ["compute_state", "record_evidence"] },
  ];
  const text = normalizeText([pack.domain, ...(pack.expected_assertions || []), ...(pack.edge_case_ids || [])].join(" "));
  if (/\b(payment|payer|invoice|quote|refund|wallet)\b/.test(text)) base.push({ id: "payer", role: "payer", permissions: ["approve_money"] });
  if (/\b(guest|allergy|dietary|rsvp)\b/.test(text)) base.push({ id: "guest", role: "guest", permissions: ["submit_guest_data"] });
  if (/\b(staff|service|day-of)\b/.test(text)) base.push({ id: "staff", role: "staff", permissions: ["view_day_of_snapshot"] });
  return base;
}

function workflowInitialState(pack) {
  const text = normalizeText([pack.domain, ...(pack.expected_assertions || [])].join(" "));
  return {
    event_status: text.includes("payment") || text.includes("quote") ? "proposed" : "draft",
    guest_count: 8,
    quote_total_cents: text.includes("price") || text.includes("payment") || text.includes("invoice") ? 500000 : null,
    terms_snapshot_required: /\b(terms|refund|dispute|approval|audit)\b/.test(text),
    offline_allowed: pack.domain === "offline-rural",
  };
}

function workflowFailurePaths(pack) {
  const assertions = pack.expected_assertions || [];
  return assertions.slice(0, 3).map((assertion, index) => ({
    id: `failure_${String(index + 1).padStart(3, "0")}`,
    trigger_step: `step_${String(Math.min(index + 2, 6)).padStart(3, "0")}`,
    condition: assertion,
    expect: [
      {
        type: "evidence_or_recovery_available",
        assertion: `The system can recover or prove state for: ${assertion}`,
      },
    ],
  }));
}

function inferFeatureAreas(assertions) {
  const areas = new Set();
  for (const assertion of assertions) {
    const text = normalizeText(assertion);
    if (/\b(price|quote|invoice|payment|refund|deposit|total)\b/.test(text)) areas.add("finance");
    if (/\b(permission|role|visible|access|private)\b/.test(text)) areas.add("access-control");
    if (/\b(allergy|dietary|medical|safety)\b/.test(text)) areas.add("dietary-safety");
    if (/\b(history|source|timestamp|evidence|audit|trace)\b/.test(text)) areas.add("audit");
    if (/\b(message|notification|thread|poll)\b/.test(text)) areas.add("communication");
  }
  return [...areas];
}

function compileReviewQueue(accepted) {
  return accepted
    .map((item) => {
      const novelty = Number(item.novelty_score || item.metadata?.novelty_score || 0);
      const validation = Number(item.validation_score || 0);
      const edgeCount = (item.edge_cases || item.metadata?.edge_cases || []).length;
      const evaluator = item.evaluator_lens || item.metadata?.evaluator_lens;
      let state = "useful";
      if (novelty >= 0.75 && validation >= 85 && edgeCount >= 4) state = "gold";
      else if (novelty < 0.45) state = "duplicate_requirement";
      else if (validation < 75 || edgeCount < 2) state = "too_generic";
      return {
        state,
        name: item.name,
        type: item.type,
        domain: item.domain || item.metadata?.domain,
        novelty_score: novelty,
        validation_score: validation,
        edge_count: edgeCount,
        evaluator_lens: evaluator || null,
        source_report: item.source_report,
      };
    })
    .sort((a, b) => stateRank(a.state) - stateRank(b.state) || b.novelty_score - a.novelty_score);
}

function stateRank(state) {
  return {
    gold: 0,
    useful: 1,
    duplicate_requirement: 2,
    too_generic: 3,
  }[state] ?? 4;
}

function compileGoldenCandidates(reviewQueue, opts, targets) {
  const priority = new Set(targets.priorityDomains || []);
  return reviewQueue
    .filter((item) => item.state === "gold" || item.state === "useful")
    .map((item) => ({
      ...item,
      promotion_score: Number((item.novelty_score * 50 + item.validation_score * 0.4 + item.edge_count * 4 + (priority.has(item.domain) ? 10 : 0)).toFixed(2)),
    }))
    .sort((a, b) => b.promotion_score - a.promotion_score)
    .slice(0, opts.maxGolden);
}

function contentHash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 16);
}

function compileNegativePromptBank(reports) {
  const bank = [
    "Avoid generic busy professional personas without a concrete operational consequence.",
    "Avoid vague pass/fail conditions that cannot be implemented or tested.",
    "Avoid repeating pricing complaints unless there is a new pricing state, actor, or edge case.",
    "Avoid fake specificity where numbers do not affect workflow, money, safety, or trust.",
    "Avoid personas that only describe feelings and do not force product behavior.",
  ];

  const rejected = reportItems(reports, "rejected");
  const reasons = new Map();
  for (const item of rejected) {
    const reason = item.reason || "unknown";
    reasons.set(reason, (reasons.get(reason) || 0) + 1);
  }

  return {
    static_rules: bank,
    rejection_counts: Object.fromEntries([...reasons.entries()].sort((a, b) => b[1] - a[1])),
    dynamic_rules: [...reasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([reason]) => `Reduce ${reason} outputs by adding sharper edge cases, stronger contradictions, or narrower domain pressure.`),
  };
}

function compileNextCommands(coverageGaps, targets) {
  const commands = [];
  for (const gap of coverageGaps.domains.slice(0, 10)) {
    const count = Math.max(10, Math.min(100, gap.accepted_gap || Math.ceil(gap.requirements_gap / 2)));
    const mode = targets.priorityDomains.includes(gap.domain) ? "chaos" : "heavy";
    commands.push({
      reason: `domain coverage gap: ${gap.domain}`,
      command: `npm run personas:corpus -- --execute --domain ${gap.domain} --count ${count} --edge-mode ${mode}`,
    });
  }
  for (const gap of coverageGaps.edges.slice(0, 10)) {
    if (commands.some((item) => item.command.includes(`--domain ${gap.domain} `))) continue;
    commands.push({
      reason: `edge coverage gap: ${gap.id}`,
      command: `npm run personas:corpus -- --execute --domain ${gap.domain} --count 25 --edge-mode chaos`,
    });
  }
  return commands;
}

function compileEval(reports, opts) {
  const targets = targetConfig(opts.targetFile);
  const accepted = reportItems(reports, "accepted");
  const requirements = reportItems(reports, "requirements");
  const scenarioPacks = reportItems(reports, "scenario_packs");
  const mutationPlans = reportItems(reports, "mutation_plans");
  const edgeStats = aggregateEdgeCoverage(reports);
  const domainStats = aggregateDomainStats(accepted, requirements);
  const coverageGaps = computeCoverageGaps(domainStats, edgeStats, targets);
  const requirementSpecs = compileRequirementSpecs(requirements, opts);
  const workflowDsl = compileWorkflowDsl(scenarioPacks, opts);
  const reviewQueue = compileReviewQueue(accepted);
  const goldenCandidates = compileGoldenCandidates(reviewQueue, opts, targets);

  return {
    generated_at: new Date().toISOString(),
    source_reports: reports.map((report) => ({
      path: report.relativePath,
      error: report.error || null,
      content_hash: report.error ? null : contentHash(JSON.stringify(report.data || {})),
    })),
    targets,
    summary: {
      reports: reports.length,
      accepted_personas: accepted.length,
      requirements: requirements.length,
      requirement_specs: requirementSpecs.length,
      workflow_scripts: workflowDsl.length,
      mutation_plans: mutationPlans.length,
      edge_cases_seen: edgeStats.length,
      golden_candidates: goldenCandidates.length,
      domain_gaps: coverageGaps.domains.length,
      edge_gaps: coverageGaps.edges.length,
    },
    coverage: {
      domains: domainStats,
      edges: edgeStats,
      gaps: coverageGaps,
    },
    requirement_specs: requirementSpecs,
    workflow_dsl: workflowDsl,
    review_queue: reviewQueue,
    golden_candidates: goldenCandidates,
    mutation_backlog: mutationPlans,
    build_gap_ranking: mergeBuildGaps(reportItems(reports, "build_gap_ranking")),
    negative_prompt_bank: compileNegativePromptBank(reports),
    next_commands: compileNextCommands(coverageGaps, targets),
  };
}

function mergeBuildGaps(gaps) {
  const map = new Map();
  for (const gap of gaps) {
    const id = gap.id || `${gap.domain}:${gap.feature_area}`;
    if (!map.has(id)) {
      map.set(id, {
        id,
        domain: gap.domain,
        feature_area: gap.feature_area,
        score: 0,
        requirement_count: 0,
        persona_count: 0,
        edge_case_count: 0,
        sample_requirements: [],
        source_reports: new Set(),
      });
    }
    const record = map.get(id);
    record.score += Number(gap.score || 0);
    record.requirement_count += Number(gap.requirement_count || 0);
    record.persona_count += Number(gap.persona_count || 0);
    record.edge_case_count += Number(gap.edge_case_count || 0);
    for (const req of gap.sample_requirements || []) {
      if (record.sample_requirements.length < 5 && !record.sample_requirements.includes(req)) record.sample_requirements.push(req);
    }
    if (gap.source_report) record.source_reports.add(gap.source_report);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      source_reports: [...item.source_reports].sort(),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

function defaultOutPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(DEFAULT_OUT_DIR, `persona-eval-compiled-${stamp}.json`);
}

function main() {
  const opts = parseArgs(process.argv);
  const paths = discoverReports(opts);

  if (opts.listReports) {
    console.log(JSON.stringify(paths.map((path) => relative(ROOT, path).replace(/\\/g, "/")), null, 2));
    return;
  }

  const reports = loadReports(paths);
  const compiled = compileEval(reports, opts);

  if (opts.write) {
    const out = opts.out || defaultOutPath();
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(compiled, null, 2)}\n`, "utf8");
    console.log(`${TAG} wrote ${relative(ROOT, out).replace(/\\/g, "/")}`);
    console.log(`${TAG} reports=${compiled.summary.reports} specs=${compiled.summary.requirement_specs} workflows=${compiled.summary.workflow_scripts}`);
  } else {
    console.log(JSON.stringify(compiled, null, 2));
  }
}

main();
