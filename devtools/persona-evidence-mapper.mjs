#!/usr/bin/env node
/**
 * Persona Evidence Mapper
 *
 * Reads compiled persona eval cases and maps each requirement to code evidence.
 * The mapper is intentionally static: it does not execute app flows, mutate DB
 * state, or call AI. It connects persona requirements to files, routes, tests,
 * and likely missing implementation pieces.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const TAG = "[persona-evidence-mapper]";
const DEFAULT_COMPILED_DIR = join(ROOT, "reports", "persona-eval-case-compiler");
const DEFAULT_OUT_DIR = join(ROOT, "reports", "persona-evidence-mapper");
const DEFAULT_QUEUE_DIR = join(ROOT, "system", "codex-build-queue");

const SOURCE_ROOTS = ["app", "components", "lib", "tests"];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".md"]);
const STOPWORDS = new Set(
  "the a an and or but if then this that these those with without from into onto over under for to of in on by as is are was were be been being i me my we our you your it its they them their must should allow provide track show support prevent maintain generate alert ensure preserve separate link exact every relevant related".split(
    " ",
  ),
);

function parseArgs(argv) {
  const opts = {
    compiled: [],
    compiledDir: DEFAULT_COMPILED_DIR,
    latest: 1,
    out: null,
    write: false,
    writeBuildQueue: false,
    queueDir: DEFAULT_QUEUE_DIR,
    maxRequirements: 500,
    maxBuildTasks: 50,
    minTokenMatches: 2,
    listCompiled: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--compiled" && argv[i + 1]) opts.compiled.push(resolve(ROOT, argv[++i]));
    else if (arg === "--compiled-dir" && argv[i + 1]) opts.compiledDir = resolve(ROOT, argv[++i]);
    else if (arg === "--latest" && argv[i + 1]) opts.latest = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === "--out" && argv[i + 1]) opts.out = resolve(ROOT, argv[++i]);
    else if (arg === "--write") opts.write = true;
    else if (arg === "--write-build-queue") opts.writeBuildQueue = true;
    else if (arg === "--queue-dir" && argv[i + 1]) opts.queueDir = resolve(ROOT, argv[++i]);
    else if (arg === "--max-requirements" && argv[i + 1]) opts.maxRequirements = Math.max(1, Number(argv[++i]) || opts.maxRequirements);
    else if (arg === "--max-build-tasks" && argv[i + 1]) opts.maxBuildTasks = Math.max(1, Number(argv[++i]) || opts.maxBuildTasks);
    else if (arg === "--min-token-matches" && argv[i + 1]) opts.minTokenMatches = Math.max(1, Number(argv[++i]) || opts.minTokenMatches);
    else if (arg === "--list-compiled") opts.listCompiled = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return opts;
}

function printHelp() {
  console.log("Usage: node devtools/persona-evidence-mapper.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --compiled <path>          Compiled eval report path. Repeatable");
  console.log("  --compiled-dir <path>      Directory of compiled eval reports");
  console.log("  --latest <N>               Use latest N compiled reports (default: 1)");
  console.log("  --out <path>               Output JSON path when --write is used");
  console.log("  --write                    Write evidence map JSON to disk");
  console.log("  --write-build-queue        Write build queue markdown tasks for missing/partial requirements");
  console.log("  --queue-dir <path>         Build queue directory");
  console.log("  --max-requirements <N>     Max requirements to map");
  console.log("  --max-build-tasks <N>      Max queue tasks to write");
  console.log("  --list-compiled            Print discovered compiled reports");
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

function words(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

function uniqueWords(value) {
  return [...new Set(words(value))];
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function mtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function discoverCompiled(opts) {
  if (opts.compiled.length) return opts.compiled.filter((path) => existsSync(path));
  if (!existsSync(opts.compiledDir)) return [];
  const files = readdirSync(opts.compiledDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".json")
    .map((entry) => join(opts.compiledDir, entry.name))
    .filter((path) => {
      try {
        const data = readJson(path);
        return Array.isArray(data.requirement_specs);
      } catch {
        return false;
      }
    })
    .sort((a, b) => mtime(b) - mtime(a));
  return opts.latest > 0 ? files.slice(0, opts.latest) : files;
}

function loadCompiled(paths) {
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

function compileRequirements(reports, maxRequirements) {
  const map = new Map();
  for (const report of reports) {
    if (report.error) continue;
    for (const spec of report.data.requirement_specs || []) {
      const key = spec.id || `${spec.domain}:${slugify(spec.statement || spec.requirement)}`;
      if (!map.has(key)) {
        map.set(key, {
          ...spec,
          source_reports: [],
        });
      }
      map.get(key).source_reports.push(report.relativePath);
    }
  }
  return [...map.values()]
    .sort((a, b) => Number(b.quality_score || 0) - Number(a.quality_score || 0))
    .slice(0, maxRequirements);
}

function listSourceFiles() {
  const files = [];
  for (const rootName of SOURCE_ROOTS) {
    const root = join(ROOT, rootName);
    if (!existsSync(root)) continue;
    walk(root, files);
  }
  return files;
}

function walk(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SOURCE_EXTS.has(extname(entry.name).toLowerCase())) continue;
    files.push(path);
  }
}

function loadSourceIndex() {
  return listSourceFiles().map((path) => {
    let content = "";
    try {
      content = readFileSync(path, "utf8");
    } catch {}
    return {
      path,
      relativePath: relative(ROOT, path).replace(/\\/g, "/"),
      content,
      normalized: normalizeText(content),
    };
  });
}

function requirementTokens(spec) {
  const text = [
    spec.statement,
    spec.normalized_statement,
    spec.domain,
    spec.feature_area,
    spec.type,
    spec.source?.edge_case_ids?.join(" "),
    spec.test_export?.route_hint,
  ].join(" ");
  return uniqueWords(text)
    .filter((word) => word.length >= 5)
    .slice(0, 30);
}

function fileScore(file, tokens, spec) {
  let score = 0;
  const hits = [];
  for (const token of tokens) {
    if (file.normalized.includes(token)) {
      score += 1;
      hits.push(token);
    }
  }
  const domain = normalizeText(spec.domain || "");
  const feature = normalizeText(spec.feature_area || "");
  if (domain && file.normalized.includes(domain.replace(/-/g, " "))) score += 3;
  if (feature && file.normalized.includes(feature.replace(/-/g, " "))) score += 2;
  if (file.relativePath.startsWith("tests/")) score += 2;
  if (file.relativePath.includes(domain.split("-")[0])) score += 1;
  return { score, hits };
}

function routeCandidates(routeHint) {
  const route = String(routeHint || "").replace(/^\//, "");
  if (!route) return [];
  const parts = route.split("/");
  const candidates = [];

  const raw = join(ROOT, "app", ...parts);
  candidates.push(join(raw, "page.tsx"));
  candidates.push(join(raw, "route.ts"));

  if (parts[0] === "client") {
    const grouped = join(ROOT, "app", "(client)", ...parts.slice(1));
    candidates.push(join(grouped, "page.tsx"));
    candidates.push(join(grouped, "route.ts"));
  }
  if (parts[0] === "chef") {
    const grouped = join(ROOT, "app", "(chef)", ...parts.slice(1));
    candidates.push(join(grouped, "page.tsx"));
    candidates.push(join(grouped, "route.ts"));
  }

  return candidates;
}

function routeEvidence(spec) {
  const routeHint = spec.test_export?.route_hint || spec.route_hint;
  const candidates = routeCandidates(routeHint);
  const existing = candidates.filter((path) => existsSync(path));
  return {
    route_hint: routeHint || null,
    exists: existing.length > 0,
    files: existing.map((path) => relative(ROOT, path).replace(/\\/g, "/")),
  };
}

function testEvidence(files) {
  return files.filter((file) => file.path.startsWith("tests/")).slice(0, 5);
}

function mapRequirement(spec, sourceIndex, opts) {
  const tokens = requirementTokens(spec);
  const scored = sourceIndex
    .map((file) => {
      const result = fileScore(file, tokens, spec);
      return {
        path: file.relativePath,
        score: result.score,
        hits: result.hits,
      };
    })
    .filter((item) => item.score >= opts.minTokenMatches)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 10);

  const route = routeEvidence(spec);
  const tests = testEvidence(scored);
  const dataContractFindings = inspectDataContract(spec, scored, sourceIndex);
  const status = classifyStatus(scored, route, tests, dataContractFindings);

  return {
    requirement_id: spec.id,
    statement: spec.statement,
    domain: spec.domain,
    feature_area: spec.feature_area,
    type: spec.type,
    priority: spec.priority,
    quality_score: spec.quality_score,
    status,
    confidence: confidenceScore(scored, route, tests, dataContractFindings),
    route,
    evidence: scored,
    tests: tests.map((item) => item.path),
    data_contract: dataContractFindings,
    source: spec.source,
    source_reports: spec.source_reports || [],
    missing: missingPieces(spec, scored, route, tests, dataContractFindings),
    recommended_files: recommendFiles(spec),
  };
}

function inspectDataContract(spec, evidence, sourceIndex) {
  const contract = spec.data_contract || {};
  const allEvidenceText = evidence
    .map((item) => sourceIndex.find((file) => file.relativePath === item.path)?.normalized || "")
    .join(" ");

  return {
    money_fields_minor_units: {
      required: Boolean(contract.money_fields_minor_units),
      evidence: !contract.money_fields_minor_units || /\bcents?\b|\bminor units?\b|\bamount_cents\b|\btotal_cents\b/.test(allEvidenceText),
    },
    requires_ledger_entry: {
      required: Boolean(contract.requires_ledger_entry),
      evidence: !contract.requires_ledger_entry || /\bledger\b|appendledger|append ledger|ledger_entry/.test(allEvidenceText),
    },
    requires_actor_id: {
      required: Boolean(contract.requires_actor_id),
      evidence: !contract.requires_actor_id || /\bactor_id\b|\buser\.id\b|\bcreated_by\b|\bapproved_by\b/.test(allEvidenceText),
    },
    requires_tenant_scope: {
      required: Boolean(contract.requires_tenant_scope),
      evidence: !contract.requires_tenant_scope || /\btenant_id\b|\bchef_id\b|requirechef|requireclient|requireauth/.test(allEvidenceText),
    },
    requires_timestamp: {
      required: Boolean(contract.requires_timestamp),
      evidence: !contract.requires_timestamp || /\bcreated_at\b|\bupdated_at\b|\btimestamp\b|\bapproved_at\b/.test(allEvidenceText),
    },
  };
}

function classifyStatus(evidence, route, tests, contract) {
  const requiredFailures = Object.values(contract).filter((item) => item.required && !item.evidence).length;
  if (evidence.length >= 3 && (route.exists || !route.route_hint) && tests.length > 0 && requiredFailures === 0) return "covered";
  if (evidence.length > 0 || route.exists || tests.length > 0) return "partial";
  return "missing";
}

function confidenceScore(evidence, route, tests, contract) {
  let score = 0;
  score += Math.min(40, evidence.reduce((sum, item) => sum + item.score, 0));
  if (route.exists) score += 15;
  if (tests.length) score += 20;
  for (const item of Object.values(contract)) {
    if (!item.required) continue;
    score += item.evidence ? 5 : -8;
  }
  return Math.max(0, Math.min(100, score));
}

function missingPieces(spec, evidence, route, tests, contract) {
  const missing = [];
  if (!evidence.length) missing.push("No matching implementation evidence found.");
  if (route.route_hint && !route.exists) missing.push(`Route hint not found: ${route.route_hint}`);
  if (!tests.length) missing.push("No matching test evidence found.");
  for (const [key, item] of Object.entries(contract)) {
    if (item.required && !item.evidence) missing.push(`Missing data contract evidence: ${key}`);
  }
  if (!missing.length && evidence.length < 3) missing.push("Evidence is thin; verify workflow manually.");
  return missing;
}

function recommendFiles(spec) {
  const domain = String(spec.domain || "");
  const feature = String(spec.feature_area || domain);
  const route = spec.test_export?.route_hint || "";
  const recommendations = [];

  if (route.includes("/client/")) recommendations.push("app/(client)/...");
  if (route.includes("/chef/")) recommendations.push("app/(chef)/...");
  recommendations.push(`lib/${feature.replace(/[^a-z0-9-]/gi, "-")}/actions.ts`);
  recommendations.push(`tests/unit/${slugify(domain || feature, 40)}.test.ts`);
  return [...new Set(recommendations)];
}

function buildQueueTask(item, index) {
  const id = `${String(index + 1).padStart(3, "0")}-${slugify(item.domain || "persona", 24)}-${slugify(item.feature_area || "gap", 32)}-${slugify(item.requirement_id, 40)}.md`;
  const content = `# Persona Evidence Gap: ${item.feature_area || item.domain}

Status: ready
Priority: ${item.status === "missing" ? "P1" : "P2"}
Source: ${item.requirement_id}

## Requirement

${item.statement}

## Evidence Status

- Status: ${item.status}
- Confidence: ${item.confidence}
- Domain: ${item.domain}
- Feature area: ${item.feature_area}
- Route hint: ${item.route.route_hint || "none"}

## Missing

${item.missing.map((line) => `- ${line}`).join("\n")}

## Existing Evidence

${item.evidence.length ? item.evidence.map((ev) => `- ${ev.path} (score ${ev.score}: ${ev.hits.slice(0, 8).join(", ")})`).join("\n") : "- None found"}

## Recommended Files

${item.recommended_files.map((file) => `- ${file}`).join("\n")}

## Acceptance Checks

- Implement the requirement without duplicating existing logic.
- Preserve tenant scoping and auth rules for every server-side path.
- Use cents for money fields.
- Add or update focused tests for the requirement.
- Re-run the evidence mapper and move this requirement from missing/partial toward covered.
`;
  return { id, content };
}

function writeBuildQueue(items, opts) {
  const candidates = items
    .filter((item) => item.status === "missing" || item.status === "partial")
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || Number(b.quality_score || 0) - Number(a.quality_score || 0))
    .slice(0, opts.maxBuildTasks);

  mkdirSync(opts.queueDir, { recursive: true });
  const written = [];
  candidates.forEach((item, index) => {
    const task = buildQueueTask(item, index);
    const path = uniquePath(opts.queueDir, task.id);
    writeFileSync(path, task.content, "utf8");
    written.push(relative(ROOT, path).replace(/\\/g, "/"));
  });
  return written;
}

function statusRank(status) {
  return { missing: 0, partial: 1, covered: 2 }[status] ?? 3;
}

function uniquePath(dir, name) {
  let path = join(dir, name);
  if (!existsSync(path)) return path;
  const base = name.replace(/\.md$/i, "");
  let counter = 2;
  while (existsSync(path)) {
    path = join(dir, `${base}-${counter}.md`);
    counter++;
  }
  return path;
}

function defaultOutPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(DEFAULT_OUT_DIR, `persona-evidence-map-${stamp}.json`);
}

function compileEvidenceMap(opts) {
  const compiledPaths = discoverCompiled(opts);
  const compiledReports = loadCompiled(compiledPaths);
  const requirements = compileRequirements(compiledReports, opts.maxRequirements);
  const sourceIndex = loadSourceIndex();
  const mapped = requirements.map((spec) => mapRequirement(spec, sourceIndex, opts));
  const byStatus = mapped.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return {
    schema: "chefflow.persona_evidence_map.v1",
    generated_at: new Date().toISOString(),
    source_compiled_reports: compiledReports.map((report) => ({
      path: report.relativePath,
      error: report.error || null,
    })),
    source_file_count: sourceIndex.length,
    summary: {
      compiled_reports: compiledReports.length,
      requirements: requirements.length,
      covered: byStatus.covered || 0,
      partial: byStatus.partial || 0,
      missing: byStatus.missing || 0,
    },
    requirements: mapped.sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.quality_score - a.quality_score),
    next_actions: nextActions(mapped),
  };
}

function nextActions(mapped) {
  const missing = mapped.filter((item) => item.status === "missing").slice(0, 10);
  const partial = mapped.filter((item) => item.status === "partial").slice(0, 10);
  const actions = [];
  for (const item of missing) {
    actions.push({
      reason: `missing requirement ${item.requirement_id}`,
      action: `Build ${item.feature_area || item.domain} support for: ${item.statement}`,
      recommended_files: item.recommended_files,
    });
  }
  for (const item of partial) {
    actions.push({
      reason: `partial requirement ${item.requirement_id}`,
      action: `Connect or test existing evidence for: ${item.statement}`,
      evidence: item.evidence.slice(0, 3).map((ev) => ev.path),
    });
  }
  return actions;
}

function contentHash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 16);
}

function main() {
  const opts = parseArgs(process.argv);
  const compiledPaths = discoverCompiled(opts);
  if (opts.listCompiled) {
    console.log(JSON.stringify(compiledPaths.map((path) => relative(ROOT, path).replace(/\\/g, "/")), null, 2));
    return;
  }

  const evidence = compileEvidenceMap(opts);
  evidence.content_hash = contentHash(JSON.stringify(evidence.requirements || []));

  let writtenQueue = [];
  if (opts.writeBuildQueue) {
    writtenQueue = writeBuildQueue(evidence.requirements, opts);
    evidence.written_build_queue = writtenQueue;
  }

  if (opts.write) {
    const out = opts.out || defaultOutPath();
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(`${TAG} wrote ${relative(ROOT, out).replace(/\\/g, "/")}`);
    console.log(`${TAG} requirements=${evidence.summary.requirements} covered=${evidence.summary.covered} partial=${evidence.summary.partial} missing=${evidence.summary.missing}`);
    if (writtenQueue.length) console.log(`${TAG} build_queue=${writtenQueue.length}`);
  } else {
    console.log(JSON.stringify(evidence, null, 2));
  }
}

main();
