#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function auditReport(text, slug) {
  let quality = 0;
  const checks = [];
  
  // 1. Has a proper title (## or # with persona name) - 10 points
  if (/^#\s+Persona Stress Test/im.test(text)) {
    quality += 10;
    checks.push({ name: 'title', pass: true });
  } else {
    checks.push({ name: 'title', pass: false, reason: 'Missing "# Persona Stress Test" header' });
  }
  
  // 2. Has a score line (## Score: N/100) - 10 points
  const scoreMatch = /##\s*(?:\d+\)\s*)?Score[:\s]*\**(\d+)\s*\/\s*100\**/i.exec(text);
  if (scoreMatch) {
    quality += 10;
    checks.push({ name: 'score', pass: true, value: parseInt(scoreMatch[1], 10) });
  } else {
    checks.push({ name: 'score', pass: false, reason: 'No "## Score: N/100" found' });
  }
  
  // 3. Has 3+ properly titled gaps (### Gap N: Title with 5+ chars) - 20 points
  const gapHeaders = text.match(/###\s*Gap\s*\d+:\s*.{5,}/gi) || [];
  if (gapHeaders.length >= 3) {
    quality += 20;
    checks.push({ name: 'gap_headers', pass: true, count: gapHeaders.length });
  } else {
    // Also check for numbered list format: 1. **Title**
    const numberedGaps = text.match(/^\s*\d+\.\s+\*\*.{5,}\*\*/gm) || [];
    if (numberedGaps.length >= 3) {
      quality += 15;
      checks.push({ name: 'gap_headers', pass: true, count: numberedGaps.length, format: 'numbered' });
    } else {
      checks.push({ name: 'gap_headers', pass: false, count: gapHeaders.length + numberedGaps.length, reason: 'Fewer than 3 properly titled gaps' });
    }
  }
  
  // 4. Gap titles are descriptive (average title length > 20 chars) - 15 points
  const allGapTitles = [];
  const gapTitlePattern = /###\s*Gap\s*\d+:\s*(.+)/gi;
  let m;
  while ((m = gapTitlePattern.exec(text)) !== null) {
    allGapTitles.push(m[1].trim());
  }
  // Also check numbered format
  const numberedPattern = /^\s*\d+\.\s+\*\*(.+?)\*\*/gm;
  while ((m = numberedPattern.exec(text)) !== null) {
    allGapTitles.push(m[1].trim());
  }
  
  if (allGapTitles.length > 0) {
    const avgLen = allGapTitles.reduce((s, t) => s + t.length, 0) / allGapTitles.length;
    if (avgLen > 20) {
      quality += 15;
      checks.push({ name: 'title_quality', pass: true, avg_length: Math.round(avgLen) });
    } else {
      checks.push({ name: 'title_quality', pass: false, avg_length: Math.round(avgLen), reason: 'Gap titles too short (avg < 20 chars)' });
    }
  } else {
    checks.push({ name: 'title_quality', pass: false, reason: 'No gap titles found' });
  }
  
  // 5. Has severity markers (HIGH/MEDIUM/LOW) - 10 points
  const severityCount = (text.match(/\b(HIGH|MEDIUM|LOW)\b/g) || []).length;
  if (severityCount >= 3) {
    quality += 10;
    checks.push({ name: 'severity_markers', pass: true, count: severityCount });
  } else {
    checks.push({ name: 'severity_markers', pass: false, count: severityCount, reason: 'Fewer than 3 severity markers' });
  }
  
  // 6. Has Quick Wins section - 10 points
  if (/##\s*(?:\d+\)\s*)?Quick Wins/i.test(text)) {
    quality += 10;
    checks.push({ name: 'quick_wins', pass: true });
  } else {
    checks.push({ name: 'quick_wins', pass: false, reason: 'No "## Quick Wins" section' });
  }
  
  // 7. Has Verdict section - 10 points
  if (/##\s*(?:\d+\)\s*)?(?:Two-Sentence\s+)?Verdict/i.test(text)) {
    quality += 10;
    checks.push({ name: 'verdict', pass: true });
  } else {
    checks.push({ name: 'verdict', pass: false, reason: 'No "## Verdict" section' });
  }
  
  // 8. Report length > 1000 chars (not a stub) - 10 points
  if (text.length > 1000) {
    quality += 10;
    checks.push({ name: 'length', pass: true, chars: text.length });
  } else {
    checks.push({ name: 'length', pass: false, chars: text.length, reason: 'Report too short (< 1000 chars)' });
  }
  
  // 9. No single-word gap titles (quality penalty) - 5 points
  const singleWordTitles = allGapTitles.filter(t => /^[A-Za-z]+:?\s*$/.test(t));
  if (singleWordTitles.length === 0) {
    quality += 5;
    checks.push({ name: 'no_junk_titles', pass: true });
  } else {
    checks.push({ name: 'no_junk_titles', pass: false, junk: singleWordTitles, reason: `${singleWordTitles.length} single-word gap titles` });
  }
  
  return { slug, quality, checks };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function collectFiles(dir, extensions) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseReportFile(fileName) {
  const match = /^persona-(.+)-(\d{4}-\d{2}-\d{2})\.md$/i.exec(fileName);
  if (!match) {
    return null;
  }

  return {
    slug: match[1],
    date: match[2],
  };
}

function recommendationFor(quality) {
  if (quality >= 80) {
    return 'good';
  }

  if (quality >= 40) {
    return 're-analyze';
  }

  return 'garbage';
}

function formatIssues(checks) {
  const failed = checks.filter(check => !check.pass).map(check => check.name);
  return failed.length > 0 ? failed.join(', ') : '(clean)';
}

function buildSourceIndex() {
  const completedDir = path.join(ROOT, 'Chef Flow Personas', 'Completed');
  const sourceFiles = collectFiles(completedDir, ['.txt', '.md']);
  const index = new Map();

  for (const sourceFile of sourceFiles) {
    const key = slugify(path.basename(sourceFile));
    if (!index.has(key)) {
      index.set(key, sourceFile);
    }
  }

  return index;
}

function printRerunCommands(rerunSlugs, sourceIndex) {
  process.stdout.write('\n## Re-run Commands (paste these to re-analyze garbage reports)\n\n');

  for (const slug of rerunSlugs) {
    const sourceFile = sourceIndex.get(slug);
    if (!sourceFile) {
      process.stdout.write(`# SKIP: No source file found for ${slug}\n`);
      continue;
    }

    const relativeSource = path.relative(ROOT, sourceFile).replace(/\\/g, '/');
    process.stdout.write(`node devtools/persona-analyzer.mjs "${relativeSource}" --model gemma4:e4b\n`);
  }
}

function main() {
  const rerun = process.argv.includes('--rerun');
  const reportsDir = path.join(ROOT, 'docs', 'stress-tests');
  const reportFiles = fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir)
      .filter(fileName => /^persona-.+\.md$/i.test(fileName))
      .map(fileName => path.join(reportsDir, fileName))
    : [];

  if (reportFiles.length === 0) {
    console.error('No reports found in docs/stress-tests/');
    process.exit(1);
  }

  console.error(`Auditing ${reportFiles.length} persona reports...`);

  const reports = reportFiles
    .map(filePath => {
      const parsed = parseReportFile(path.basename(filePath));
      if (!parsed) {
        return null;
      }

      const text = fs.readFileSync(filePath, 'utf8');
      return {
        ...auditReport(text, parsed.slug),
        date: parsed.date,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.quality - b.quality || a.slug.localeCompare(b.slug));

  if (reports.length === 0) {
    console.error('No reports found in docs/stress-tests/');
    process.exit(1);
  }

  const goodCount = reports.filter(report => report.quality >= 80).length;
  const reanalysisCount = reports.filter(report => report.quality >= 40 && report.quality < 80).length;
  const garbageCount = reports.filter(report => report.quality < 40).length;
  const rerunSlugs = reports.filter(report => report.quality < 60).map(report => report.slug);
  const auditJson = {
    generated_at: new Date().toISOString(),
    total_reports: reports.length,
    good_count: goodCount,
    reanalysis_count: reanalysisCount,
    garbage_count: garbageCount,
    reports: reports.map(report => ({
      slug: report.slug,
      date: report.date,
      quality: report.quality,
      checks: report.checks,
      recommendation: recommendationFor(report.quality),
    })),
    rerun_slugs: rerunSlugs,
  };

  const systemDir = path.join(ROOT, 'system');
  fs.mkdirSync(systemDir, { recursive: true });
  fs.writeFileSync(path.join(systemDir, 'persona-report-audit.json'), `${JSON.stringify(auditJson, null, 2)}\n`);
  console.error('Wrote system/persona-report-audit.json');

  process.stdout.write('=== Persona Report Quality Audit ===\n\n');
  process.stdout.write(`  #  ${'Slug'.padEnd(42)}  Quality  Issues\n`);
  reports.forEach((report, index) => {
    const number = String(index + 1).padStart(3);
    const slug = report.slug.padEnd(42);
    const quality = `${report.quality}/100`.padStart(7);
    process.stdout.write(`${number}  ${slug}  ${quality}  ${formatIssues(report.checks)}\n`);
  });

  process.stdout.write('\nSummary:\n');
  process.stdout.write(`  Total reports: ${reports.length}\n`);
  process.stdout.write(`  Good (80+): ${goodCount}\n`);
  process.stdout.write(`  Needs re-analysis (40-79): ${reanalysisCount}\n`);
  process.stdout.write(`  Garbage (<40): ${garbageCount}\n`);

  process.stdout.write('\nRe-run candidates (quality < 60):\n');
  process.stdout.write(`  ${rerunSlugs.length > 0 ? rerunSlugs.join(', ') : '(none)'}\n`);

  if (rerun) {
    printRerunCommands(rerunSlugs, buildSourceIndex());
  }
}

main();
