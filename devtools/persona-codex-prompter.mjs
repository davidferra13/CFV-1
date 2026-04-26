#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const BATCH_DIR = join(ROOT, 'system', 'persona-batch-synthesis');
const OUT_DIR = join(ROOT, 'system', 'codex-prompts');
const SEARCH_DIRS = ['lib', 'app', 'components'];

function printUsageAndExit(message) {
  if (message) console.error(`Error: ${message}`);
  console.error('Usage: node devtools/persona-codex-prompter.mjs [--top N] [--category slug] [--all] [--dry-run]');
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    top: 5,
    category: null,
    all: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--top') {
      const value = argv[i + 1];
      if (!value) printUsageAndExit('--top requires a number');
      options.top = parseTop(value);
      i += 1;
    } else if (arg.startsWith('--top=')) {
      options.top = parseTop(arg.slice('--top='.length));
    } else if (arg === '--category') {
      const value = argv[i + 1];
      if (!value) printUsageAndExit('--category requires a slug');
      options.category = parseCategory(value);
      i += 1;
    } else if (arg.startsWith('--category=')) {
      options.category = parseCategory(arg.slice('--category='.length));
    } else {
      printUsageAndExit(`unknown argument ${arg}`);
    }
  }

  return options;
}

function parseTop(value) {
  const top = Number.parseInt(value, 10);
  if (!Number.isFinite(top) || top < 1) printUsageAndExit('--top must be a positive integer');
  return top;
}

function parseCategory(value) {
  const category = String(value || '').trim();
  if (!/^[a-z0-9-]+$/.test(category)) {
    printUsageAndExit('--category must be a slug containing only lowercase letters, numbers, and hyphens');
  }
  return category;
}

function readJson(path, required = true) {
  if (!existsSync(path)) {
    if (required) {
      console.error(`Error: required file not found: ${relative(ROOT, path).replace(/\\/g, '/')}`);
      process.exit(1);
    }
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`Error: failed to parse ${relative(ROOT, path).replace(/\\/g, '/')}: ${error.message}`);
    process.exit(1);
  }
}

function titleCaseCategory(category) {
  return category
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function regexFromTerms(terms) {
  const parts = (Array.isArray(terms) ? terms : [])
    .slice(0, 3)
    .map((term) => String(term || '').trim())
    .filter(Boolean)
    .map(escapeRegExp);

  if (parts.length === 0) return null;
  return new RegExp(parts.join('|'), 'i');
}

function quickGrep(pattern, dirs, maxResults) {
  const results = [];
  let filesScanned = 0;
  const maxFiles = 500;

  function walk(dir) {
    if (results.length >= maxResults || filesScanned >= maxFiles) return;

    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults || filesScanned >= maxFiles) return;

      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.next', '.git', 'system', 'docs'].includes(entry.name)) continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        filesScanned += 1;
        try {
          const content = readFileSync(full, 'utf8');
          if (pattern.test(content)) {
            results.push(relative(ROOT, full).replace(/\\/g, '/'));
          }
        } catch {
          // Ignore unreadable files; this is only a hint search.
        }
      }
    }
  }

  for (const dir of dirs) {
    if (results.length >= maxResults || filesScanned >= maxFiles) break;
    const absDir = join(ROOT, dir);
    if (existsSync(absDir)) walk(absDir);
  }

  return results;
}

function getSection(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const startPattern = new RegExp(`^##\\s+${escapeRegExp(heading)}(?:\\s|$)`, 'i');
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    if (startPattern.test(lines[i])) {
      start = i + 1;
      break;
    }
  }

  if (start === -1) return '';

  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  return lines.slice(start, end).join('\n').trim();
}

function parseExistingBuildTasks(section) {
  if (!section) return [];

  const tasks = [];
  for (const line of section.split(/\r?\n/)) {
    const ticked = line.match(/^\s*-\s+`([^`]+)`/);
    const plain = line.match(/^\s*-\s+(.+?)\s*$/);
    const task = ticked ? ticked[1].trim() : plain ? plain[1].trim() : '';
    if (task) tasks.push(task.replace(/^`|`$/g, ''));
  }
  return tasks;
}

function parseAcceptanceCriteria(section) {
  if (!section) return [];

  const criteria = [];
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+\.\s+(.+?)\s*$/);
    if (match) criteria.push(match[1].trim());
  }
  return criteria;
}

function parseIndividualGaps(section) {
  if (!section) return [];

  const gaps = [];
  const lines = section.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i].match(/^\s*\d+\.\s+\*\*(.+?)\*\*\s+-\s+from\s+(.+?)\s+-\s+([A-Z]+)\s*$/);
    if (!header) continue;

    const description = (lines[i + 1] || '').trim();
    const hintLine = (lines[i + 2] || '').match(/Search hints:\s*(.+)$/i);
    const grepTerms = hintLine
      ? hintLine[1].split(',').map((term) => term.trim()).filter(Boolean)
      : [];

    gaps.push({
      title: header[1].trim(),
      from_name: header[2].trim(),
      severity: header[3].trim(),
      description,
      search_hints: { grep_terms: grepTerms },
    });
  }

  return gaps;
}

function parseBuildPlan(markdown) {
  return {
    gaps: parseIndividualGaps(getSection(markdown, 'Individual Gaps')),
    existingBuildTasks: parseExistingBuildTasks(getSection(markdown, 'Existing Build Tasks')),
    acceptanceCriteria: parseAcceptanceCriteria(getSection(markdown, 'Acceptance Criteria')),
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function severityRank(severity) {
  if (severity === 'HIGH') return 3;
  if (severity === 'MEDIUM') return 2;
  if (severity === 'LOW') return 1;
  return 0;
}

function computeAvgSeverity(gaps) {
  const ranked = gaps.map((gap) => severityRank(gap.severity)).filter((value) => value > 0);
  if (ranked.length === 0) return 'UNKNOWN';
  const avg = ranked.reduce((sum, value) => sum + value, 0) / ranked.length;
  if (avg >= 2.5) return 'HIGH';
  if (avg >= 1.5) return 'MEDIUM';
  return 'LOW';
}

function makeCategoryMeta(category, priorityRanking, queue) {
  const rankIndex = priorityRanking.findIndex((item) => item.category === category);
  const ranking = rankIndex >= 0 ? priorityRanking[rankIndex] : null;
  const gaps = queue.filter((gap) => gap.category === category);
  const personas = unique(gaps.flatMap((gap) => Array.isArray(gap.personas) ? gap.personas : [gap.from]));

  return {
    category,
    rank: rankIndex >= 0 ? rankIndex + 1 : '?',
    total: priorityRanking.length || 1,
    priorityScore: ranking?.priority_score ?? gaps.reduce((sum, gap) => sum + (Number(gap.priority_score) || 0), 0),
    count: ranking?.count ?? personas.length,
    avgSeverity: ranking?.avg_severity ?? computeAvgSeverity(gaps),
  };
}

function selectCategories(options, priorityRanking, queue) {
  if (options.category) {
    return [makeCategoryMeta(options.category, priorityRanking, queue)];
  }

  const ranked = priorityRanking.filter((item) => item.count > 0);
  const selected = options.all
    ? ranked
    : ranked.filter((item) => item.category !== 'uncategorized').slice(0, options.top);

  return selected.map((item) => makeCategoryMeta(item.category, priorityRanking, queue));
}

function formatList(items, formatter = (item) => `- ${item}`) {
  if (!items.length) return 'None';
  return items.map(formatter).join('\n');
}

function generatePrompt({ meta, gaps, parsedPlan, generatedAt }) {
  const categoryLabel = titleCaseCategory(meta.category);
  const files = unique(gaps.flatMap((gap) => gap.relevantFiles || []));
  const existingTasks = parsedPlan.existingBuildTasks;
  const criteria = parsedPlan.acceptanceCriteria;

  const gapLines = gaps.map((gap, index) => {
    const filesText = gap.relevantFiles?.length ? gap.relevantFiles.join(', ') : 'search needed';
    const fromName = gap.from_name || gap.from || 'Unknown';
    const severity = gap.severity || 'UNKNOWN';
    const description = String(gap.description || '').trim() || 'No description provided.';

    return `${index + 1}. **${gap.title}** (from ${fromName}, ${severity})\n   ${description}\n   Relevant files: ${filesText}`;
  }).join('\n\n');

  const filesList = formatList(files);
  const tasksList = formatList(existingTasks, (task) => `- \`${task}\``);
  const criteriaList = criteria.length
    ? criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n')
    : 'None';

  return `# Codex Prompt: ${categoryLabel}
# Priority: ${meta.rank} of ${meta.total} | Severity: ${meta.avgSeverity} | Personas: ${meta.count}
# Generated: ${generatedAt}

## Prompt (copy-paste to Codex)

---

Read the build plan at system/persona-batch-synthesis/build-${meta.category}.md for full context.

You are fixing gaps in ChefFlow (a Next.js chef operations platform) for the "${categoryLabel}" category.

### Gaps to Address (in priority order)

${gapLines || 'None'}

### Constraints

- Only modify files in lib/, app/, components/, or types/
- Do NOT modify database migrations, schema files, or drizzle config
- Do NOT modify any devtools/ scripts
- Do NOT modify CLAUDE.md or any docs/ files
- Do NOT add new npm dependencies
- All monetary values are in cents (integers)
- All new server actions need: auth gate, tenant scoping, input validation, error propagation
- Use existing patterns from nearby files as reference
- If a gap requires database changes, SKIP IT and note it in a comment at the top of the file

### Files You May Need

${filesList}

### Existing Build Tasks (reference only)

${tasksList}

### Testing

After implementation, verify with:
- npx tsc --noEmit --skipLibCheck (must pass)
- Manually check that modified files still export correctly

---

## Acceptance Criteria

${criteriaList}
`;
}

function generateIndex(records, generatedAt) {
  const rows = records.map((record, index) => {
    const categoryLabel = titleCaseCategory(record.meta.category);
    const priority = record.meta.priorityScore;
    const gaps = record.gaps.length;
    return `| ${index + 1} | ${categoryLabel} | ${priority} | ${gaps} | [${record.meta.category}.md](${record.meta.category}.md) |`;
  }).join('\n');

  return `# Codex Prompt Queue
Generated: ${generatedAt}

| # | Category | Priority | Gaps | Prompt |
|---|----------|----------|------|--------|
${rows}
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const priorityPath = join(BATCH_DIR, 'priority-queue.json');
  const saturationPath = join(BATCH_DIR, 'saturation.json');

  if (!existsSync(priorityPath)) {
    console.error('Error: system/persona-batch-synthesis/priority-queue.json does not exist');
    process.exit(1);
  }

  const priorityData = readJson(priorityPath);
  const saturationData = readJson(saturationPath, false) || {};
  const queue = Array.isArray(priorityData.queue) ? priorityData.queue : [];
  const priorityRanking = Array.isArray(saturationData.priority_ranking)
    ? saturationData.priority_ranking
    : [];
  const selectedCategories = selectCategories(options, priorityRanking, queue);
  const generatedAt = new Date().toISOString();
  const records = [];

  console.error(`Selected ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}.`);

  for (const meta of selectedCategories) {
    const planPath = join(BATCH_DIR, `build-${meta.category}.md`);
    const relPlanPath = relative(ROOT, planPath).replace(/\\/g, '/');

    if (!existsSync(planPath)) {
      console.error(`Warning: missing build plan ${relPlanPath}; skipping ${meta.category}.`);
      continue;
    }

    console.error(`Reading ${relPlanPath}.`);
    const parsedPlan = parseBuildPlan(readFileSync(planPath, 'utf8'));
    let gaps = queue.filter((gap) => gap.category === meta.category);
    if (gaps.length === 0) gaps = parsedPlan.gaps;

    gaps = gaps.map((gap) => {
      const grepTerms = gap.search_hints?.grep_terms || [];
      const pattern = regexFromTerms(grepTerms);
      const relevantFiles = pattern ? quickGrep(pattern, SEARCH_DIRS, 5) : [];
      console.error(`Searched ${meta.category}: ${gap.title} (${relevantFiles.length} match${relevantFiles.length === 1 ? '' : 'es'}).`);
      return { ...gap, relevantFiles };
    });

    const prompt = generatePrompt({ meta, gaps, parsedPlan, generatedAt });
    records.push({ meta, gaps, prompt });
  }

  const index = generateIndex(records, generatedAt);

  if (options.dryRun) {
    for (const record of records) {
      process.stdout.write(`# Would write system/codex-prompts/${record.meta.category}.md\n\n`);
      process.stdout.write(record.prompt);
      process.stdout.write('\n');
    }
    process.stdout.write('# Would write system/codex-prompts/INDEX.md\n\n');
    process.stdout.write(index);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  for (const record of records) {
    const outputPath = join(OUT_DIR, `${record.meta.category}.md`);
    writeFileSync(outputPath, record.prompt, 'utf8');
    console.error(`Wrote ${relative(ROOT, outputPath).replace(/\\/g, '/')}.`);
  }

  const indexPath = join(OUT_DIR, 'INDEX.md');
  writeFileSync(indexPath, index, 'utf8');
  console.error(`Wrote ${relative(ROOT, indexPath).replace(/\\/g, '/')}.`);
}

main();
