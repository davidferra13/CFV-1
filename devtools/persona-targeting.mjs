#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve, extname } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const PERSONA_TYPES = ['Chef', 'Client', 'Guest', 'Vendor', 'Staff', 'Partner', 'Public'];
const STARVED_THRESHOLD = 15;
const SATURATED_THRESHOLD = 50;

const TYPE_CATEGORY_PREFERENCES = {
  Chef: ['recipe-menu', 'reporting-analytics', 'payment-financial', 'dosing-cannabis', 'compliance-legal', 'sourcing-supply', 'scheduling-calendar'],
  Client: ['payment-financial', 'communication', 'scheduling-calendar', 'dietary-medical', 'recipe-menu', 'onboarding-ux', 'reporting-analytics'],
  Guest: ['dietary-medical', 'ticketing-drops', 'access-control', 'communication', 'onboarding-ux', 'audience-community', 'location-venue'],
  Vendor: ['sourcing-supply', 'payment-financial', 'delivery-logistics', 'communication', 'documentation-records', 'scheduling-calendar'],
  Staff: ['staffing-team', 'scheduling-calendar', 'recipe-menu', 'communication', 'documentation-records', 'onboarding-ux'],
  Partner: ['location-venue', 'payment-financial', 'audience-community', 'ticketing-drops', 'reporting-analytics', 'communication'],
  Public: ['audience-community', 'location-venue', 'ticketing-drops', 'onboarding-ux', 'communication', 'access-control'],
};

function parseArgs(argv) {
  const opts = {
    execute: false,
    count: 3,
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--execute') {
      opts.execute = true;
    } else if (argv[i] === '--count' && argv[i + 1]) {
      opts.count = parseInt(argv[++i], 10) || 3;
    } else if (argv[i] === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

function printHelp() {
  console.log('Usage: node devtools/persona-targeting.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --execute      Print recommendations and run generator commands');
  console.log('  --count <N>    Number of targeted personas to recommend/generate (default: 3)');
}

function readSaturation() {
  const saturationPath = join(ROOT, 'system', 'persona-batch-synthesis', 'saturation.json');
  if (!existsSync(saturationPath)) {
    console.error('No saturation data. Run: node devtools/persona-batch-synthesizer.mjs');
    process.exit(1);
  }

  return JSON.parse(readFileSync(saturationPath, 'utf-8'));
}

function countCompletedPersonas() {
  const completedRoot = join(ROOT, 'Chef Flow Personas', 'Completed');
  const counts = Object.fromEntries(PERSONA_TYPES.map(type => [type, 0]));

  for (const type of PERSONA_TYPES) {
    const typeDir = join(completedRoot, type);
    if (!existsSync(typeDir)) continue;

    counts[type] = readdirSync(typeDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .filter(entry => ['.txt', '.md'].includes(extname(entry.name).toLowerCase()))
      .length;
  }

  return counts;
}

function buildCoverage(counts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return PERSONA_TYPES.map(type => {
    const count = counts[type] || 0;
    const percent = total > 0 ? (count / total) * 100 : 0;
    const status = percent < STARVED_THRESHOLD
      ? 'STARVED'
      : percent > SATURATED_THRESHOLD
        ? 'SATURATED'
        : 'OK';

    return { type, count, total, percent, status };
  });
}

function getPriorityCategories(saturation) {
  const ranking = Array.isArray(saturation.priority_ranking) ? saturation.priority_ranking : [];

  return [...ranking]
    .filter(item => item && item.category && item.category !== 'uncategorized')
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
    .slice(0, 5);
}

function getZeroNewPersonas(saturation) {
  const recent = saturation.saturation?.new_categories_by_persona || {};

  return Object.values(recent)
    .filter(item => Array.isArray(item.new_categories) && item.new_categories.length === 0)
    .map(item => item.slug)
    .filter(Boolean);
}

function pickCategoriesForType(type, priorityCategories) {
  const priorityIds = priorityCategories.map(item => item.category);
  const prefs = TYPE_CATEGORY_PREFERENCES[type] || [];
  const matched = prefs.filter(id => priorityIds.includes(id));
  const fallback = priorityIds.filter(id => !matched.includes(id));

  return [...matched, ...fallback].slice(0, 2);
}

function buildRecommendations(coverage, priorityCategories, count) {
  const starved = coverage
    .filter(item => item.status === 'STARVED')
    .sort((a, b) => a.percent - b.percent || a.count - b.count);

  const fallback = coverage
    .filter(item => item.status !== 'SATURATED')
    .sort((a, b) => a.percent - b.percent || a.count - b.count);

  const typePool = starved.length > 0 ? starved : fallback;
  const recommendations = [];

  for (let i = 0; i < count && typePool.length > 0; i++) {
    const target = typePool[i % typePool.length];
    recommendations.push({
      type: target.type,
      categories: pickCategoriesForType(target.type, priorityCategories),
    });
  }

  return recommendations;
}

function formatPercent(percent) {
  return `${Math.round(percent)}%`;
}

function printReport(coverage, priorityCategories, zeroNewPersonas, recommendations) {
  const total = coverage[0]?.total || 0;
  const saturatedTypes = coverage.filter(item => item.status === 'SATURATED');
  const starvedTypes = coverage.filter(item => item.status === 'STARVED');
  const focusCategories = [...new Set(recommendations.flatMap(item => item.categories))];

  console.log('=== Persona Pipeline Targeting Report ===');
  console.log('');
  console.log('Type Coverage:');
  for (const item of coverage) {
    const type = `${item.type}:`.padEnd(9);
    const count = `${item.count}/${total}`.padStart(6);
    const percent = `(${formatPercent(item.percent)})`.padStart(6);
    console.log(`  ${type} ${count} ${percent} [${item.status}]`);
  }

  console.log('');
  console.log('Top Priority Gap Categories (underserved):');
  priorityCategories.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.category} (score: ${item.priority_score}, ${item.count} personas)`);
  });

  console.log('');
  console.log('Recent Saturation Signal:');
  console.log(`  ${zeroNewPersonas.length} recent personas contributed zero new categories.`);
  if (zeroNewPersonas.length > 0) {
    console.log(`  Saturated personas: ${zeroNewPersonas.slice(0, 5).join(', ')}${zeroNewPersonas.length > 5 ? ', ...' : ''}`);
  }

  console.log('');
  console.log('Recommendation:');
  console.log(`  Generate ${recommendations.length} personas of types: ${recommendations.map(item => item.type).join(', ')}`);
  console.log(`  Focus categories: ${focusCategories.join(', ') || 'none'}`);
  console.log(`  Rationale: ${buildRationale(saturatedTypes, starvedTypes)}`);

  console.log('');
  console.log('Command:');
  for (const rec of recommendations) {
    const args = ['devtools/persona-generator.mjs', '--type', rec.type, '--count', '1'];
    if (rec.categories.length > 0) {
      args.push('--target-categories', rec.categories.join(','));
    }
    console.log(`  node ${args.join(' ')}`);
  }
}

function buildRationale(saturatedTypes, starvedTypes) {
  const saturatedText = saturatedTypes.length > 0
    ? `${saturatedTypes.map(item => `${item.type} type saturated at ${formatPercent(item.percent)}`).join('; ')}.`
    : 'No persona type is above the saturation threshold.';

  const starvedText = starvedTypes.length > 0
    ? `${starvedTypes.map(item => item.type).join('/')} have <15% coverage.`
    : 'No persona type is below the starvation threshold.';

  return `${saturatedText} ${starvedText}`;
}

function executeRecommendations(recommendations) {
  for (const rec of recommendations) {
    const args = ['devtools/persona-generator.mjs', '--type', rec.type, '--count', '1'];
    if (rec.categories.length > 0) {
      args.push('--target-categories', rec.categories.join(','));
    }

    console.log('');
    console.log(`Running: node ${args.join(' ')}`);
    const result = spawnSync('node', args, { stdio: 'inherit', cwd: ROOT });
    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
}

function main() {
  const opts = parseArgs(process.argv);
  const saturation = readSaturation();
  const counts = countCompletedPersonas();
  const coverage = buildCoverage(counts);
  const priorityCategories = getPriorityCategories(saturation);
  const zeroNewPersonas = getZeroNewPersonas(saturation);
  const recommendations = buildRecommendations(coverage, priorityCategories, opts.count);

  printReport(coverage, priorityCategories, zeroNewPersonas, recommendations);

  if (opts.execute) {
    executeRecommendations(recommendations);
  }
}

main();
