/**
 * Digital Twin Simulation Runner
 * Executes all phases, collects findings, generates learning report.
 *
 * Usage:
 *   node scripts/sim-runner.mjs              # Run all phases
 *   node scripts/sim-runner.mjs --phase 1    # Run specific phase
 *   node scripts/sim-runner.mjs --report     # Just generate report from existing JSON
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPORTS_DIR = 'docs/simulation-reports';
const BACKLOG_FILE = 'docs/simulation-reports/simulation-backlog.md';

// ── Phase Registry ───────────────────────────────────────────

const PHASES = [
  { id: 0, name: 'Setup',   script: 'scripts/sim-phase0.mjs', pillar: 'SETUP' },
  { id: 1, name: 'Sell',    script: 'scripts/sim-phase1.mjs', pillar: 'SELL' },
  // Future phases:
  // { id: 2, name: 'Plan',    script: 'scripts/sim-phase2.mjs', pillar: 'PLAN' },
  // { id: 3, name: 'Cook',    script: 'scripts/sim-phase3.mjs', pillar: 'COOK' },
  // { id: 4, name: 'Money',   script: 'scripts/sim-phase4.mjs', pillar: 'MONEY' },
  // { id: 5, name: 'Grow',    script: 'scripts/sim-phase5.mjs', pillar: 'GROW' },
  // { id: 6, name: 'Operate', script: 'scripts/sim-phase6.mjs', pillar: 'OPS' },
  // { id: 7, name: 'Edge',    script: 'scripts/sim-phase7.mjs', pillar: 'EDGE' },
];

// ── Run Phases ───────────────────────────────────────────────

function runPhase(phase) {
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`# Phase ${phase.id}: ${phase.name} (${phase.pillar})`);
  console.log(`${'#'.repeat(60)}\n`);

  const start = Date.now();
  try {
    execSync(`node ${phase.script}`, {
      stdio: 'inherit',
      timeout: 300000, // 5 min max per phase
      cwd: process.cwd(),
    });
    return { phase: phase.id, name: phase.name, success: true, durationMs: Date.now() - start };
  } catch (err) {
    console.error(`Phase ${phase.id} failed: ${err.message}`);
    return { phase: phase.id, name: phase.name, success: false, durationMs: Date.now() - start, error: err.message };
  }
}

// ── Collect & Aggregate ──────────────────────────────────────

function collectFindings() {
  const all = { findings: [], timings: [], consoleErrors: [], phaseResults: [] };

  for (const phase of PHASES) {
    const reportFile = path.join(REPORTS_DIR, `phase-${phase.id}-raw.json`);
    if (!fs.existsSync(reportFile)) continue;

    try {
      const report = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
      const findings = (report.findings || []).map(f => ({ ...f, phase: phase.id, pillar: phase.pillar }));
      const timings = (report.timings || []).map(t => ({ ...t, phase: phase.id }));
      const errors = (report.consoleErrors || []).map(e => ({ ...e, phase: phase.id }));

      all.findings.push(...findings);
      all.timings.push(...timings);
      all.consoleErrors.push(...errors);
      all.phaseResults.push({
        phase: phase.id,
        name: phase.name,
        pillar: phase.pillar,
        timestamp: report.timestamp,
        summary: report.summary,
      });
    } catch (err) {
      console.error(`Failed to read ${reportFile}: ${err.message}`);
    }
  }

  return all;
}

// ── Generate Learning Report ─────────────────────────────────

function generateBacklog(data) {
  const { findings, timings } = data;

  // Categorize
  const bugs = findings.filter(f => f.type === 'BUG');
  const slow = findings.filter(f => f.type === 'SLOW');
  const dead = findings.filter(f => f.type === 'DEAD');
  const confusing = findings.filter(f => f.type === 'CONFUSING');
  const missing = findings.filter(f => f.type === 'MISSING');
  const ok = findings.filter(f => f.type === 'OK');

  // Score
  const score = ok.length > 0
    ? Math.round((ok.length / findings.length) * 100)
    : 0;

  const now = new Date().toISOString().split('T')[0];

  let md = `# Digital Twin Simulation Backlog\n\n`;
  md += `> Generated: ${now} | Score: ${score}% (${ok.length}/${findings.length} OK)\n\n`;

  // Summary table
  md += `## Summary\n\n`;
  md += `| Category | Count | Impact |\n`;
  md += `|----------|-------|--------|\n`;
  md += `| BROKEN (BUG) | ${bugs.length} | Action fails, data not saved |\n`;
  md += `| SLOW | ${slow.length} | Page or action >3s |\n`;
  md += `| DEAD | ${dead.length} | Element exists but does nothing |\n`;
  md += `| CONFUSING | ${confusing.length} | Flow unclear or unexpected |\n`;
  md += `| MISSING | ${missing.length} | Expected element not found |\n`;
  md += `| OK | ${ok.length} | Working as expected |\n\n`;

  // Bugs (highest priority)
  if (bugs.length > 0) {
    md += `## BROKEN (Fix Immediately)\n\n`;
    for (const b of bugs) {
      md += `- [ ] **${b.id}** [Phase ${b.phase}/${b.pillar}]: ${b.desc}`;
      if (b.details) md += ` (${b.details})`;
      md += `\n`;
    }
    md += `\n`;
  }

  // Slow
  if (slow.length > 0) {
    md += `## SLOW (Performance)\n\n`;
    for (const s of slow) {
      md += `- [ ] **${s.id}** [Phase ${s.phase}]: ${s.desc}\n`;
    }
    md += `\n`;
  }

  // Dead
  if (dead.length > 0) {
    md += `## DEAD (Zero Hallucination Violations)\n\n`;
    for (const d of dead) {
      md += `- [ ] **${d.id}** [Phase ${d.phase}]: ${d.desc}\n`;
    }
    md += `\n`;
  }

  // Confusing
  if (confusing.length > 0) {
    md += `## CONFUSING (UX Friction)\n\n`;
    for (const c of confusing) {
      md += `- [ ] **${c.id}** [Phase ${c.phase}]: ${c.desc}\n`;
    }
    md += `\n`;
  }

  // Missing
  if (missing.length > 0) {
    md += `## MISSING (Gaps)\n\n`;
    for (const m of missing) {
      md += `- [ ] **${m.id}** [Phase ${m.phase}]: ${m.desc}\n`;
    }
    md += `\n`;
  }

  // Timing analysis
  if (timings.length > 0) {
    md += `## Timing Analysis\n\n`;
    const sorted = [...timings].sort((a, b) => b.ms - a.ms);
    md += `| Action | Time (ms) | Phase | Status |\n`;
    md += `|--------|-----------|-------|--------|\n`;
    for (const t of sorted.slice(0, 20)) {
      const status = t.ms > 3000 ? 'SLOW' : t.ms > 1500 ? 'WARN' : 'OK';
      md += `| ${t.action} | ${t.ms} | ${t.phase} | ${status} |\n`;
    }
    md += `\n`;
  }

  // What worked
  if (ok.length > 0) {
    md += `## Working Correctly\n\n`;
    for (const o of ok) {
      md += `- ${o.id}: ${o.desc}\n`;
    }
    md += `\n`;
  }

  // Phase results
  if (data.phaseResults.length > 0) {
    md += `## Phase Results\n\n`;
    md += `| Phase | Pillar | Run Date | OK | BUG | SLOW | DEAD |\n`;
    md += `|-------|--------|----------|----|-----|------|------|\n`;
    for (const p of data.phaseResults) {
      const s = p.summary || {};
      md += `| ${p.phase}: ${p.name} | ${p.pillar} | ${p.timestamp?.split('T')[0] || '-'} | ${s.OK || 0} | ${s.BUG || 0} | ${s.SLOW || 0} | ${s.DEAD || 0} |\n`;
    }
    md += `\n`;
  }

  // Learning prompts
  md += `## Learning Prompts\n\n`;
  md += `After reviewing findings, consider:\n\n`;
  md += `1. **Patterns**: Do bugs cluster in one pillar? (shared root cause?)\n`;
  md += `2. **Dead code**: Are DEAD findings no-op buttons or real features?\n`;
  md += `3. **Speed**: Are SLOW pages doing N+1 queries or loading too much data?\n`;
  md += `4. **Flow breaks**: Where does the happy path diverge from expectation?\n`;
  md += `5. **Delta tracking**: Compare this run vs previous to see if fixes landed.\n`;

  return md;
}

// ── Main ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
const reportOnly = args.includes('--report');
const phaseArg = args.indexOf('--phase');
const specificPhase = phaseArg >= 0 ? parseInt(args[phaseArg + 1]) : null;

if (reportOnly) {
  console.log('Generating report from existing data...\n');
} else {
  const phasesToRun = specificPhase !== null
    ? PHASES.filter(p => p.id === specificPhase)
    : PHASES;

  if (phasesToRun.length === 0) {
    console.error(`Phase ${specificPhase} not found`);
    process.exit(1);
  }

  console.log(`Digital Twin Simulation Runner`);
  console.log(`Phases: ${phasesToRun.map(p => `${p.id}:${p.name}`).join(', ')}\n`);

  const results = [];
  for (const phase of phasesToRun) {
    results.push(runPhase(phase));
  }

  console.log('\n\nPhase execution complete:');
  for (const r of results) {
    console.log(`  Phase ${r.phase} (${r.name}): ${r.success ? 'PASS' : 'FAIL'} (${Math.round(r.durationMs / 1000)}s)`);
  }
}

// Always generate report
console.log('\nCollecting findings...');
const data = collectFindings();
const backlog = generateBacklog(data);
fs.writeFileSync(BACKLOG_FILE, backlog);
console.log(`\nBacklog written: ${BACKLOG_FILE}`);
console.log(`Total findings: ${data.findings.length}`);
console.log(`Total timings: ${data.timings.length}`);
