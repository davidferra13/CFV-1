#!/usr/bin/env node
/**
 * ChatGPT Conversation Classifier
 *
 * Reads the _INDEX.md from the obsidian chatgpt-conversations export,
 * classifies each conversation by title keywords into:
 *   - RETAIN: clearly relevant to ChefFlow/OpenClaw/dev work
 *   - REVIEW: potentially relevant, needs human/AI review
 *   - DISCARD: clearly irrelevant noise
 *
 * Outputs: scripts/chatgpt-triage-report.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, 'obsidian_export', 'chatgpt-conversations', '_INDEX.md');

// --- Keyword dictionaries ---

// Strong signals: if title contains any of these, classify as RETAIN
const RETAIN_KEYWORDS = [
  // Product
  'chefflow', 'chef flow', 'chef-flow', 'chefos', 'chef os', 'chef-os',
  'chefbot', 'chef bot', 'openclaw', 'open claw', 'open-claw',
  // Core domains
  'private chef', 'private-chef', 'catering', 'food cost', 'food-cost',
  'recipe', 'menu costing', 'menu creation', 'menu design', 'menu ux',
  'client portal', 'chef portal', 'chef dashboard', 'client profile',
  'event planning', 'dinner event', 'dinner pricing', 'dinner conversation',
  'booking', 'inquiry', 'inquiries', 'quote', 'proposal',
  'ledger', 'invoice', 'payment', 'pricing catalog', 'price catalog',
  // Architecture/dev
  'supabase', 'drizzle', 'migration', 'auth', 'login', 'signup',
  'navigation', 'nav bar', 'sidebar', 'dashboard',
  'vs code', 'vscode', 'copilot', 'codex', 'claude',
  'playwright', 'puppeteer', 'testing',
  'next.js', 'nextjs', 'react', 'typescript',
  'ollama', 'gemma', 'gemini', 'remy',
  'raspberry pi', 'pi-based', 'pi ',
  // Business/ops
  'service lifecycle', 'onboarding', 'archetype',
  'prospecting', 'crm', 'loyalty', 'rewards',
  'grocery', 'ingredient', 'shopping list',
  'document ingestion', 'brain dump',
  'email', 'gmail', 'bot email', 'bot bible',
  'stripe', 'monetiz', 'subscription',
  'webhook', 'sse', 'realtime',
  'deploy', 'vercel', 'cloudflare',
  'prompt', 'agent', 'workflow', 'automation',
  'spec', 'audit', 'blueprint', 'build plan',
  'project', 'app development', 'app component',
  'website', 'web app', 'homepage',
  'n8n', 'opal', 'google ai studio',
  'feature', 'function', 'scaffold',
  'wix', 'base44',
  'database', 'sql', 'postgres', 'rls',
  'api', 'endpoint', 'server action',
  'storage', 'upload', 'pdf',
  'calendar', 'schedule',
  'notification', 'sms',
  'contract', 'tos', 'legal',
  'tax', 'w-9',
  'receipt', 'ocr',
  'staff', 'team',
  'equipment', 'inventory',
  'marketing', 'social media', 'tiktok for chef',
  'brand', 'domain',
  'mobile', 'pwa',
];

// Noise signals: if title contains any of these AND no retain keywords, classify as DISCARD
const DISCARD_KEYWORDS = [
  // Gaming
  'overwatch', 'farlight', 'saitama', 'fubuki', 'one punch',
  'bird game', 'insaniquarium', 'game dev', 'game monet', 'itch.io',
  'pokemon', 'godot', '2.5d', 'gta', 'rockstar',
  'dps moira', 'symmetra', 'sora prompt', 'sora video', 'sora jackass',
  // Health/personal
  'eye pain', 'eye cancer', 'eye strain', 'zinc overdose', 'l-theanine',
  'stool softener', 'snoring', 'caffeine', 'circumcision', 'chlamydia',
  'gooning', 'goon', 'teeth grinding', 'vitamins for',
  'parasite medication', 'drug-induced', 'prostate',
  // Entertainment/trivia
  'stranger things', 'harry potter', 'avatar', 'twin peaks', 'laura palmer',
  'peter pettigrew', 'neville', 'vecna', 'eleven',
  'spongebob', 'eric andre', 'wallace and gromit',
  'josh minott', 'celtics', 'nba free throw', 'mls cup', 'football integrity',
  'ben schwartz', 'lake street dive', 'yg marley',
  'john chungus', 'italian brain rot', 'drum solo', 'card pack',
  'song lyric', 'song identification',
  // Personal/misc
  'giraffe in a house', 'beavers eating', 'catnip', 'cat and onion',
  'massage chair', 'clamp-on under-desk', 'standing desk',
  'christmas gift', 'gift idea', 'ornament photo',
  'black friday', 'robot car gift',
  'bohemian grove', 'otto warmbier', '9/11 survivor',
  'trump and gas', 'florida porn', 'gang banging',
  'dovecotes', 'pigeon', 'parade balloons',
  'military salute', 'racial', 'racism',
  'sebring gas', 'trip a odometer', 'parking rules',
  'funeral', 'neighborhood suggestions',
  'myspace music', 'spotify stats',
  'instagram', 'snapchat', 'discord activity',
  'fear of cold drinks', 'snow and global',
  'red moon', 'aurora visibility', '3i/atlas',
  'dolphin wedding', 'viral ice shatter', 'viral farm flex',
  'absurd animal', 'whimsical dog',
  'louvre crane', 'pneumatic tube',
  'sudoku', 'alphabet letter count',
  'best place to goon', 'flattering s-words',
  'jesus a robot', 'serious talk with god',
  'ai porn', 'describing attraction',
  'handle emotional reactions', 'confusion',
  'sploof backwards', 'porpoise built',
  'uncaptured phenomenon', 'orbital ring',
  'silicon vs carbon',
  'curtain', 'projector visibility',
  'best shaver', 'gimbal coffee',
  'copper cookware', 'vacuum sealer', 'best vacuum',
  'microwave time', 'noodles for stir',
  'asparagus berries', 'concord grape',
  'birria', 'pork butt', 'braising short rib', 'roasting beets',
  'overnight braising', 'prime rib', 'wet brine',
  'braising thinly', 'hot hold', 'scallop juice',
  'tuna color', 'stock for two', 'cookie storage',
  'puff pastry', 'charcuterie board', 'scandinavian potato',
  'mac cheese', 'best cheeses for mac', 'korma',
  'mint chutney', 'boil vs simmer',
  'frenching onions', 'ortolan',
  'wireless hdmi', 'wireless camera', 'wireless third monitor',
  'usb mic', 'audio device', 'mouse spotlight',
  'ssd', 'bios', 'graphics card', 'motherboard',
  'pc upgrade', 'router connection',
  'windows display', 'windows process',
  'obs display', 'canvas landscape',
  'smoking filter', 'honeygain',
  'free monitor', 'free glb', 'free file tree',
  'saving for property', 'saving for a house',
  'credit card payoff', 'government housing',
  'annual income', 'calculate payment',
  'air miles', 'travel rewards', 'cheap flight', 'cheap round-trip',
  'gas card', 'amex', 'top credit card',
  'veneers', 'frewittian', 'snare head',
  'bitcoin pizza', 'scam text', 'scam or legitimate',
  'cancel wyze', 'refund request email', 'email for subscription',
  'customer service number', 'account recovery', 'account deletion',
  'teacher berhanu', 's-pen', 'transfer text message',
  'capcut', 'eye-tracking',
  'health coach roleplay', 'career problem',
  'grass repair', 'playground repair',
  'identify language', 'identify object',
  'words in', 'weeks in',
  'best gambling', 'blackjack',
  'high-commission',
  'transcribe email thread',  // personal email, not dev
  'chopped dad', 'comedian',
];

// --- Parse index ---

function parseIndex(content) {
  const lines = content.split('\n');
  const entries = [];

  for (const line of lines) {
    // Pattern: - [Title](./filename.md) - N messages - updated TIMESTAMP
    const match = line.match(/^- \[(.+?)\]\(\.\/(.+?\.md)\)\s*-\s*(\d+)\s*messages?\s*-\s*updated\s*(.+)$/);
    if (match) {
      entries.push({
        title: match[1],
        filename: match[2],
        messageCount: parseInt(match[3], 10),
        updatedAt: match[4].trim(),
      });
    }
  }

  return entries;
}

// --- Classify ---

function classify(entry) {
  const titleLower = entry.title.toLowerCase();

  // Check retain keywords first
  const retainMatch = RETAIN_KEYWORDS.find(kw => titleLower.includes(kw.toLowerCase()));
  if (retainMatch) {
    return { classification: 'RETAIN', matchedKeyword: retainMatch };
  }

  // Check discard keywords
  const discardMatch = DISCARD_KEYWORDS.find(kw => titleLower.includes(kw.toLowerCase()));
  if (discardMatch) {
    return { classification: 'DISCARD', matchedKeyword: discardMatch };
  }

  // Default: needs review
  return { classification: 'REVIEW', matchedKeyword: null };
}

// --- Main ---

const indexContent = readFileSync(INDEX_PATH, 'utf-8');
const entries = parseIndex(indexContent);

const results = {
  RETAIN: [],
  REVIEW: [],
  DISCARD: [],
};

for (const entry of entries) {
  const { classification, matchedKeyword } = classify(entry);
  results[classification].push({
    ...entry,
    matchedKeyword,
  });
}

// Stats
const stats = {
  total: entries.length,
  retain: results.RETAIN.length,
  review: results.REVIEW.length,
  discard: results.DISCARD.length,
  retainPct: ((results.RETAIN.length / entries.length) * 100).toFixed(1),
  reviewPct: ((results.REVIEW.length / entries.length) * 100).toFixed(1),
  discardPct: ((results.DISCARD.length / entries.length) * 100).toFixed(1),
  retainMessages: results.RETAIN.reduce((sum, e) => sum + e.messageCount, 0),
  reviewMessages: results.REVIEW.reduce((sum, e) => sum + e.messageCount, 0),
  discardMessages: results.DISCARD.reduce((sum, e) => sum + e.messageCount, 0),
};

// High-value: retain with most messages (likely deepest discussions)
const highValue = [...results.RETAIN]
  .sort((a, b) => b.messageCount - a.messageCount)
  .slice(0, 50);

const report = {
  generatedAt: new Date().toISOString(),
  stats,
  highValueConversations: highValue,
  retain: results.RETAIN,
  review: results.REVIEW,
  discard: results.DISCARD,
};

const outPath = join(ROOT, 'scripts', 'chatgpt-triage-report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

// Print summary
console.log('=== ChatGPT Conversation Triage Report ===');
console.log(`Total conversations: ${stats.total}`);
console.log(`  RETAIN: ${stats.retain} (${stats.retainPct}%) - ${stats.retainMessages} messages`);
console.log(`  REVIEW: ${stats.review} (${stats.reviewPct}%) - ${stats.reviewMessages} messages`);
console.log(`  DISCARD: ${stats.discard} (${stats.discardPct}%) - ${stats.discardMessages} messages`);
console.log('');
console.log('Top 20 highest-value conversations (by message count):');
for (const c of highValue.slice(0, 20)) {
  console.log(`  [${c.messageCount} msg] ${c.title} (matched: "${c.matchedKeyword}")`);
}
console.log('');
console.log(`Full report: ${outPath}`);
