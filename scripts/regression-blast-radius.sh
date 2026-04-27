#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ChefFlow Blast Radius Calculator
# ═══════════════════════════════════════════════════════════════════
# Shows everything that would break if a file was deleted.
# Essential for 10+ parallel agents editing files constantly.
#
# Usage:
#   bash scripts/regression-blast-radius.sh <file-path>
#   bash scripts/regression-blast-radius.sh <file-path> --json
#
# Examples:
#   bash scripts/regression-blast-radius.sh lib/events/actions.ts
#   bash scripts/regression-blast-radius.sh app/(chef)/dashboard/page.tsx --json
# ═══════════════════════════════════════════════════════════════════

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Args ──────────────────────────────────────────────────────────
TARGET="$1"
JSON_MODE=false

if [ -z "$TARGET" ]; then
  echo "Usage: bash scripts/regression-blast-radius.sh <file-path> [--json]"
  echo ""
  echo "Shows everything that would break if a file was deleted."
  exit 1
fi

if [ "$2" = "--json" ] || [ "$1" = "--json" ]; then
  JSON_MODE=true
  if [ "$1" = "--json" ]; then
    TARGET="$2"
  fi
fi

# ── Normalize the target path ─────────────────────────────────────
# Strip leading ./ or project root prefix
TARGET="${TARGET#./}"
TARGET="${TARGET#$PROJECT_ROOT/}"
# Convert backslashes to forward slashes (Windows)
TARGET="${TARGET//\\//}"

if [ ! -f "$TARGET" ]; then
  echo "Error: File not found: $TARGET"
  exit 1
fi

# ── Use node for the heavy lifting ────────────────────────────────
# node handles path resolution, import pattern matching, and JSON output
# grep alone can't reliably resolve @/ aliases vs relative paths

node -e '
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = process.argv[1];
const targetRel = process.argv[2];
const jsonMode = process.argv[3] === "true";

// ── Helpers ──────────────────────────────────────────────────────

// Get the import-friendly path (no extension, no /index)
function toImportPath(filePath) {
  let p = filePath
    .replace(/\\/g, "/")
    .replace(/\.(tsx?|jsx?|mjs|cjs)$/, "")
    .replace(/\/index$/, "");
  return p;
}

// Build all possible import strings that could reference this file
function getImportPatterns(targetRel) {
  const importPath = toImportPath(targetRel);
  const patterns = [];

  // @/ alias pattern (most common in this project)
  patterns.push("@/" + importPath);

  // Also match with extension included (some imports do this)
  patterns.push("@/" + targetRel);

  // The bare import path for relative matching
  patterns.push(importPath);

  return patterns;
}

// Check if a line imports from the target file
function lineImportsTarget(line, targetPatterns, importerDir) {
  // Match import/require/dynamic import patterns
  const importMatch = line.match(
    /(?:import\s+.*?from\s+|import\s*\(|require\s*\()[\x27"](.*?)[\x27"]/
  );
  if (!importMatch) return false;

  const importSpec = importMatch[1];

  // Check @/ alias matches
  for (const pat of targetPatterns) {
    if (pat.startsWith("@/")) {
      if (importSpec === pat || importSpec === pat.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "")) {
        return true;
      }
    }
  }

  // Check relative path matches
  if (importSpec.startsWith(".")) {
    const resolved = path.posix.join(importerDir, importSpec);
    const resolvedClean = toImportPath(resolved);
    const targetClean = toImportPath(targetRel);

    if (resolvedClean === targetClean) return true;

    // Also check if importing a directory index
    if (resolvedClean + "/index" === targetClean) return true;
    if (resolvedClean === targetClean + "/index") return true;
  }

  return false;
}

// Get all source files (fast, uses git ls-files if available)
function getSourceFiles() {
  try {
    const output = execSync("git ls-files --cached --others --exclude-standard", {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return output
      .split("\n")
      .filter(f => /\.(tsx?|jsx?|mjs|cjs)$/.test(f))
      .filter(f => !f.startsWith("node_modules/"))
      .filter(f => !f.startsWith(".next/"))
      .filter(f => !f.startsWith("public/"));
  } catch {
    // Fallback: use find
    const output = execSync(
      "find . -type f \\( -name \"*.ts\" -o -name \"*.tsx\" -o -name \"*.js\" -o -name \"*.jsx\" -o -name \"*.mjs\" \\) " +
      "-not -path \"*/node_modules/*\" -not -path \"*/.next/*\" -not -path \"*/public/*\"",
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    );
    return output.split("\n").filter(Boolean).map(f => f.replace(/^\.\//, ""));
  }
}

// Extract exported names from a file
function getExports(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const exports = new Set();

  // export function name
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
    exports.add(m[1]);
  }
  // export const/let/var name
  for (const m of content.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) {
    exports.add(m[1]);
  }
  // export class name
  for (const m of content.matchAll(/export\s+class\s+(\w+)/g)) {
    exports.add(m[1]);
  }
  // export type/interface name
  for (const m of content.matchAll(/export\s+(?:type|interface|enum)\s+(\w+)/g)) {
    exports.add(m[1]);
  }
  // export default function name / export default class name
  for (const m of content.matchAll(/export\s+default\s+(?:async\s+)?(?:function|class)\s+(\w+)/g)) {
    exports.add(m[1]);
  }
  // Named re-exports: export { X, Y } from ...
  for (const m of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    const names = m[1].split(",").map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim();
    });
    names.filter(Boolean).forEach(n => exports.add(n));
  }
  // export default (unnamed)
  if (/export\s+default\s+(?!function|class)\S/.test(content)) {
    exports.add("default");
  }

  return [...exports];
}

// Count how many files reference a specific export name
function countExportUsage(exportName, sourceFiles, targetRel) {
  const users = [];
  // Skip single-char or very common names to avoid false positives
  if (exportName.length <= 2) return users;

  for (const file of sourceFiles) {
    if (file === targetRel) continue;
    try {
      const content = fs.readFileSync(file, "utf8");
      // Check if the name appears in import statements or usage
      if (content.includes(exportName)) {
        // Verify it is actually referencing this name, not a substring
        const wordBoundary = new RegExp("\\b" + exportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (wordBoundary.test(content)) {
          users.push(file);
        }
      }
    } catch {}
  }
  return users;
}

// ── Main ─────────────────────────────────────────────────────────

const targetPatterns = getImportPatterns(targetRel);
const sourceFiles = getSourceFiles();

// Phase 1: Find direct importers
const directImporters = [];
for (const file of sourceFiles) {
  if (file === targetRel) continue;
  try {
    const content = fs.readFileSync(file, "utf8");
    const importerDir = path.posix.dirname(file);
    const lines = content.split("\n");
    for (const line of lines) {
      if (lineImportsTarget(line, targetPatterns, importerDir)) {
        directImporters.push(file);
        break;
      }
    }
  } catch {}
}

// Phase 2: Find transitive dependents (1 level deep)
const transitiveMap = {}; // parent -> [grandchildren]
for (const importer of directImporters) {
  const importerPatterns = getImportPatterns(importer);
  const transitive = [];
  for (const file of sourceFiles) {
    if (file === targetRel || file === importer || directImporters.includes(file)) continue;
    try {
      const content = fs.readFileSync(file, "utf8");
      const dir = path.posix.dirname(file);
      const lines = content.split("\n");
      for (const line of lines) {
        if (lineImportsTarget(line, importerPatterns, dir)) {
          transitive.push(file);
          break;
        }
      }
    } catch {}
  }
  if (transitive.length > 0) {
    transitiveMap[importer] = transitive;
  }
}

// Flatten transitive into unique list
const allTransitive = [...new Set(Object.values(transitiveMap).flat())];

// Phase 3: Export usage analysis
const exportNames = getExports(targetRel);
const exportUsage = {};
for (const name of exportNames) {
  const users = countExportUsage(name, directImporters, targetRel);
  if (users.length > 0) {
    exportUsage[name] = users.length;
  }
}

// Phase 4: Risk assessment
const totalRadius = new Set([...directImporters, ...allTransitive]).size;
let riskLevel, riskColor;
if (totalRadius <= 3) { riskLevel = "LOW"; riskColor = "\x1b[32m"; }
else if (totalRadius <= 10) { riskLevel = "MEDIUM"; riskColor = "\x1b[33m"; }
else if (totalRadius <= 25) { riskLevel = "HIGH"; riskColor = "\x1b[31m"; }
else { riskLevel = "CRITICAL"; riskColor = "\x1b[35m"; }

// ── Output ───────────────────────────────────────────────────────

if (jsonMode) {
  const result = {
    target: targetRel,
    direct_importers: directImporters.sort(),
    transitive_dependents: transitiveMap,
    transitive_unique: allTransitive.sort(),
    exports_used: exportUsage,
    summary: {
      direct_count: directImporters.length,
      transitive_count: allTransitive.length,
      total_blast_radius: totalRadius,
      risk_level: riskLevel,
      exported_symbols: exportNames.length,
    },
  };
  console.log(JSON.stringify(result, null, 2));
} else {
  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";
  const DIM = "\x1b[2m";
  const CYAN = "\x1b[36m";
  const YELLOW = "\x1b[33m";

  console.log("");
  console.log(`${BOLD}[BLAST RADIUS]${RESET} ${targetRel}`);
  console.log("");

  // Direct importers
  console.log(`  ${BOLD}DIRECT IMPORTS (${directImporters.length} files):${RESET}`);
  if (directImporters.length === 0) {
    console.log(`    ${DIM}(none found)${RESET}`);
  } else {
    const showCount = 15;
    const sorted = directImporters.sort();
    sorted.slice(0, showCount).forEach(f => console.log(`    ${CYAN}${f}${RESET}`));
    if (sorted.length > showCount) {
      console.log(`    ${DIM}... ${sorted.length - showCount} more${RESET}`);
    }
  }
  console.log("");

  // Transitive deps
  if (Object.keys(transitiveMap).length > 0) {
    console.log(`  ${BOLD}TRANSITIVE (${allTransitive.length} files):${RESET}`);
    for (const [through, deps] of Object.entries(transitiveMap)) {
      console.log(`    ${DIM}through ${through}:${RESET}`);
      deps.slice(0, 5).forEach(f => console.log(`      ${CYAN}${f}${RESET}`));
      if (deps.length > 5) {
        console.log(`      ${DIM}... ${deps.length - 5} more${RESET}`);
      }
    }
    console.log("");
  }

  // Export usage
  const usedExports = Object.entries(exportUsage).sort((a, b) => b[1] - a[1]);
  if (usedExports.length > 0) {
    console.log(`  ${BOLD}EXPORTS USED (${usedExports.length}/${exportNames.length} symbols):${RESET}`);
    usedExports.slice(0, 15).forEach(([name, count]) => {
      console.log(`    ${YELLOW}${name}${RESET} -> ${count} files`);
    });
    if (usedExports.length > 15) {
      console.log(`    ${DIM}... ${usedExports.length - 15} more${RESET}`);
    }
    const unusedExports = exportNames.filter(n => !exportUsage[n]);
    if (unusedExports.length > 0) {
      console.log(`    ${DIM}Unused exports: ${unusedExports.join(", ")}${RESET}`);
    }
    console.log("");
  }

  // Summary
  console.log(`  ${BOLD}SUMMARY:${RESET}`);
  console.log(`    Direct dependents:    ${directImporters.length}`);
  console.log(`    Transitive dependents:${allTransitive.length > 0 ? " " + allTransitive.length : " 0"}`);
  console.log(`    Total blast radius:   ${totalRadius}`);
  console.log(`    Exported symbols:     ${exportNames.length}`);
  console.log(`    Risk level:           ${riskColor}${BOLD}${riskLevel}${RESET} ${DIM}(LOW 0-3, MED 4-10, HIGH 11-25, CRIT 25+)${RESET}`);
  console.log("");
}
' "$PROJECT_ROOT" "$TARGET" "$JSON_MODE"
