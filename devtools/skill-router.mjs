#!/usr/bin/env node
import {
  loadSkills,
  loadSkillMaturity,
  nowStamp,
  parseArgs,
  projectSkillRoot,
  readStdin,
  reportsRoot,
  skillMaturityState,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'
import path from 'node:path'

const args = parseArgs()
const prompt = String(args.prompt || args.p || args._.join(' ') || readStdin()).trim()

if (!prompt) {
  console.error('Missing prompt. Pass --prompt "..." or pipe text on stdin.')
  process.exit(1)
}

const skills = loadSkills(projectSkillRoot)
const skillNames = new Set(skills.map((skill) => skill.name).filter(Boolean))
const maturityManifest = loadSkillMaturity()
const lowerPrompt = prompt.toLowerCase()

const rules = [
  {
    skill: 'backup',
    terms: ['backup database', 'pg_dump', 'database backup'],
  },
  {
    skill: 'host-integrity',
    terms: [
      'task scheduler',
      'watchdog',
      'cloudflare tunnel',
      'port 3100',
      'port 3200',
      'port 3300',
      'zombie process',
      'running server',
      'restart server',
      'kill server',
    ],
  },
  {
    skill: 'persona-dump',
    terms: ['persona dump', 'huge blurb', 'third-party chatgpt', 'paste them all'],
  },
  {
    skill: 'persona-build',
    terms: ['persona findings', 'build from personas', 'persona gaps'],
  },
  {
    skill: 'persona-inbox',
    terms: [
      'persona inbox',
      'persona pipeline',
      'persona status',
      'persona queue',
      '3977',
      'build queue',
      'ready task',
      'ready tasks',
      'claim task',
    ],
  },
  {
    skill: 'skill-garden',
    terms: [
      'codex should',
      'make codex smarter',
      'self-heal',
      'self healing',
      'create skills',
      'new skill',
      'developer behavior',
      'always',
      'always remember',
      'automatically',
      'constantly',
      'from now on',
      'keep running',
      'hermes',
      'opencloy',
    ],
  },
  {
    skill: 'software-fundamentals',
    terms: [
      'matt pocock',
      'software fundamentals',
      'architecture audit',
      'codebase audit',
      'deep module',
      'deep modules',
      'module ownership',
      'module owner',
      'interface-first',
      'shared language',
    ],
  },
  {
    skill: 'question-optimizer',
    terms: [
      'optimize this question',
      'optimize that question',
      'random question',
      'project question',
      'what should codex do',
      'does codex know what to do',
      'should we build',
      'what should we build',
      'what should we improve',
      'what should we research',
      'best question',
    ],
  },
  {
    skill: 'market-research-router',
    terms: [
      'market research',
      'customer research',
      'buyer research',
      'who should we ask',
      'who is it calling on',
      'chefs',
      'clients',
      'guests',
      'vendors',
      'staff',
      'public buyers',
      'demand',
      'want this',
      'need this',
      'vendor tools',
    ],
  },
  {
    skill: 'evidence-broker',
    terms: [
      'evidence map',
      'what evidence',
      'real user evidence',
      'persona simulation',
      'public market research',
      'developer intent',
      'is this validated',
      'validated fact',
      'hypothesis',
    ],
  },
  {
    skill: 'research-brief-generator',
    terms: [
      'research brief',
      'generate a research brief',
      'research packet',
      'brief to report',
      'report scaffold',
      'evidence source index',
      'source index',
      'question outcome scorer',
      'score the answer',
      'question brief',
      'source plan',
      'evidence threshold',
      'audience lenses',
    ],
  },
  {
    skill: 'answer-provenance',
    terms: [
      'provenance',
      'label the answer',
      'where did this conclusion come from',
      'codebase verified',
      'real user evidence',
      'unknowns',
      'unsupported claims',
    ],
  },
  {
    skill: 'context-continuity',
    terms: [
      'duplicate build',
      'duplicating builds',
      'fragmented',
      'fragmentation',
      'same thing',
      'similar thing',
      'not attaching',
      'attach it',
      'canonical surface',
      'canonical route',
      'homepage',
      'homepages',
      'obsidian',
      'conversation memory',
      'repeating myself',
      'built before',
      'what we built before',
    ],
  },
  {
    skill: 'swarm-governor',
    terms: [
      'swarm',
      'subagent',
      'subagents',
      'parallel agent',
      'parallel agents',
      'bounded parallel',
      'orchestrator',
      'delegate',
      'delegation',
      'multi-track',
      'large feature',
      'independent code paths',
      'research-heavy',
      'build-heavy',
    ],
  },
  {
    skill: 'heal-skill',
    terms: ['skill failed', 'skill missed', 'repair skill', 'heal skill'],
  },
  {
    skill: 'review',
    terms: ['review', 'code review', 'before shipping', 'find bugs'],
  },
  {
    skill: 'ledger-safety',
    terms: ['ledger', 'ledger entry', 'append-only', 'computed balance', 'financial ledger'],
  },
  {
    skill: 'billing-monetization',
    terms: ['billing', 'monetization', 'paid tier', 'free tier', 'upgrade prompt', 'feature classification'],
  },
  {
    skill: 'stripe-webhook-integrity',
    terms: ['stripe', 'webhook', 'checkout', 'payment intent', 'subscription event', 'idempotency'],
  },
  {
    skill: 'pricing-reliability',
    terms: [
      'pricing engine',
      'data engine',
      'food costing',
      'menu costing',
      'ingredient price',
      'ingredient prices',
      'price out a menu',
      'price a menu',
      'every price',
      'local grocery',
      'local grocery stores',
      'chef pricing',
      'openclaw price',
      'openclaw pricing',
      'release blocker',
      'release blockers',
      'stopping release',
      'stopping chefflow from releasing',
      'stopping chef flow from releasing',
      'what must be proven',
      'must work perfectly',
    ],
  },
  {
    skill: 'debug',
    terms: ['bug', 'broken', 'fails', 'failure', 'error', 'regression', 'root cause'],
  },
  {
    skill: 'tdd',
    terms: ['tdd', 'test first', 'failing test'],
  },
  {
    skill: 'verification-gate',
    aliases: ['verify'],
    terms: ['playwright', 'production parity', 'pressure testing', 'verify'],
  },
  {
    skill: 'compliance',
    terms: ['em dash', 'openclaw in ui', 'ts-nocheck', 'compliance scan'],
  },
  {
    skill: 'hallucination-scan',
    terms: ['fake data', 'hardcoded', 'optimistic update', 'no-op', 'empty onclick'],
  },
  {
    skill: 'evidence-integrity',
    terms: ['green claims', 'stale tests', 'build state', 'sync status', 'conflicting evidence'],
  },
  {
    skill: 'findings-triage',
    terms: ['autodocket', 'audit findings', 'triage findings', 'backlog findings'],
  },
  {
    skill: 'validation-gate',
    terms: ['validation phase', 'user validation', 'launch readiness', 'survey evidence'],
  },
  {
    skill: 'research',
    terms: ['research', 'investigate', 'write report'],
  },
  {
    skill: 'planner',
    terms: ['write spec', 'plan spec', 'planner gate'],
  },
  {
    skill: 'builder',
    terms: ['build', 'implement', 'add', 'create', 'connect', 'feature', 'script'],
  },
]

const hardStopRules = [
  {
    id: 'no_main_push_or_deploy',
    terms: ['push to main', 'merge to main', 'deploy', 'production deploy'],
  },
  {
    id: 'no_destructive_database_operations',
    terms: ['drop table', 'drop column', 'delete from', 'truncate', 'alter column type'],
  },
  {
    id: 'no_drizzle_push',
    terms: ['drizzle-kit push', 'drizzle push'],
  },
  {
    id: 'no_manual_database_types',
    terms: ['types/database.ts'],
  },
  {
    id: 'no_ts_nocheck',
    terms: ['@ts-nocheck', 'ts-nocheck'],
  },
  {
    id: 'no_em_dash',
    terms: ['em dash', '\u2014'],
  },
  {
    id: 'no_unapproved_build_or_long_running_server',
    terms: ['next build', 'npm run dev', 'long-running', 'long running'],
  },
  {
    id: 'no_kill_or_restart_running_servers',
    terms: ['kill server', 'restart server', 'stop server', 'kill process'],
  },
]

const requiredCheckRules = [
  {
    check: 'show full additive SQL before writing any migration',
    terms: ['migration', 'database/migrations', 'sql migration'],
  },
  {
    check: 'validate server action auth, tenant scope, input validation, errors, return value, and cache invalidation',
    terms: ['use server', 'server action', 'action.ts', 'actions.ts'],
  },
  {
    check: 'run targeted compliance scan for em dashes, OpenClaw public text, and ts-nocheck',
    terms: ['public ui', 'copy', 'text', 'skill', 'skills', 'compliance'],
  },
  {
    check: 'run node --check for changed devtools scripts',
    terms: ['devtools', '.mjs', 'script', 'cli'],
  },
  {
    check: 'run skill validator and trigger tests when skill behavior changes',
    terms: ['skill', 'skills', 'router', 'trigger', 'self-heal', 'self healing'],
  },
  {
    check: 'run software-fundamentals module audit for owned non-trivial code changes',
    terms: [
      'build',
      'implement',
      'add',
      'create',
      'connect',
      'feature',
      'refactor',
      'code',
      'coding',
      'matt pocock',
      'software fundamentals',
      'architecture audit',
      'deep module',
    ],
  },
  {
    check: 'stage, commit, and push only owned files before closeout',
    terms: ['ship', 'commit', 'push', 'closeout', 'done'],
  },
]

const riskRules = [
  {
    level: 'high',
    terms: [
      'production',
      'deploy',
      'main',
      'database',
      'migration',
      'ledger',
      'stripe',
      'payment',
      'auth',
      'tenant',
      'security',
      'server action',
      'cloudflare tunnel',
      'port 3300',
      'kill server',
      'restart server',
    ],
  },
  {
    level: 'medium',
    terms: [
      'ai',
      'ollama',
      'remy',
      'billing',
      'cache',
      'webhook',
      'public ui',
      'persona pipeline',
      'skill',
      'devtools',
    ],
  },
]

function hasTerm(text, term) {
  return text.includes(term.toLowerCase())
}

function scoreRule(rule) {
  const terms = rule.terms || []
  return terms.reduce((sum, term) => sum + (hasTerm(lowerPrompt, term) ? 1 : 0), 0)
}

function normalizeSkillName(rule) {
  if (skillNames.has(rule.skill)) return rule.skill
  for (const alias of rule.aliases || []) {
    if (skillNames.has(alias)) return alias
  }
  return null
}

function maturityScore(skill) {
  const state = skillMaturityState(skill, maturityManifest)
  if (state === 'proven') return 0.4
  if (state === 'active') return 0.2
  if (state === 'draft') return -0.1
  if (state === 'needs-healing') return -0.6
  if (state === 'deprecated') return -100
  return 0
}

function isExplicitlyNamed(skill) {
  return lowerPrompt.includes(skill.toLowerCase())
}

const conflictPriorityRules = [
  {
    winner: 'stripe-webhook-integrity',
    beats: ['builder', 'debug', 'review', 'ledger-safety'],
    reason: 'stripe-webhook-integrity owns external payment event intake and idempotency',
  },
  {
    winner: 'ledger-safety',
    beats: ['builder', 'review', 'hallucination-scan'],
    reason: 'ledger-safety owns cents, balances, and append-only money movement',
  },
  {
    winner: 'billing-monetization',
    beats: ['builder', 'validation-gate', 'review'],
    reason: 'billing-monetization owns tier classification and upgrade prompt timing',
  },
  {
    winner: 'pricing-reliability',
    beats: ['validation-gate', 'question-optimizer', 'market-research-router', 'evidence-broker', 'research', 'builder', 'planner'],
    reason: 'pricing-reliability owns ChefFlow release blocker questions about menu costing and price data trust',
  },
  {
    winner: 'validation-gate',
    beats: ['persona-build', 'builder', 'planner'],
    reason: 'validation-gate blocks unvalidated product surface expansion',
  },
  {
    winner: 'market-research-router',
    beats: ['builder', 'planner', 'persona-stress-test', 'research'],
    reason: 'market-research-router owns audience selection and evidence source routing for demand questions',
  },
  {
    winner: 'question-optimizer',
    beats: ['builder', 'planner', 'research'],
    reason: 'question-optimizer owns vague strategic and product questions before execution',
  },
  {
    winner: 'host-integrity',
    beats: ['health', 'debug', 'builder'],
    reason: 'host-integrity owns ports, watchdogs, tunnels, and running process truth',
  },
]

function resolvePrimary(matches) {
  const matchedSkills = new Set(matches.map((match) => match.skill))
  for (const rule of conflictPriorityRules) {
    if (!matchedSkills.has(rule.winner)) continue
    if (rule.beats.some((skill) => matchedSkills.has(skill))) {
      return {
        primary: rule.winner,
        conflict: {
          winner: rule.winner,
          beats: rule.beats.filter((skill) => matchedSkills.has(skill)),
          reason: rule.reason,
        },
      }
    }
  }
  return { primary: matches[0]?.skill || 'first-principles', conflict: null }
}

const matches = rules
  .map((rule, index) => ({
    index,
    skill: normalizeSkillName(rule),
    score: scoreRule(rule),
  }))
  .filter((match) => match.skill && match.score > 0)
  .filter((match) => {
    const state = skillMaturityState(match.skill, maturityManifest)
    return state !== 'deprecated' || isExplicitlyNamed(match.skill)
  })
  .map((match) => ({
    ...match,
    maturity_state: skillMaturityState(match.skill, maturityManifest),
    rank_score: match.score + maturityScore(match.skill),
  }))
  .sort((a, b) => b.rank_score - a.rank_score || b.score - a.score || a.index - b.index)

const primaryResolution = resolvePrimary(matches)
const primarySkill = primaryResolution.primary
const beatenSkills = new Set(primaryResolution.conflict?.beats || [])
const sidecarSkills = ['omninet']
for (const match of matches.slice(1)) {
  if (beatenSkills.has(match.skill)) continue
  if (!sidecarSkills.includes(match.skill) && match.skill !== primarySkill) {
    sidecarSkills.push(match.skill)
  }
}
if (
  (primarySkill === 'heal-skill' || lowerPrompt.includes('skill failed')) &&
  skillNames.has('skill-garden') &&
  !sidecarSkills.includes('skill-garden')
) {
  sidecarSkills.push('skill-garden')
}
if (
  (primarySkill === 'skill-garden' || sidecarSkills.includes('skill-garden')) &&
  skillNames.has('heal-skill') &&
  lowerPrompt.includes('failed') &&
  !sidecarSkills.includes('heal-skill')
) {
  sidecarSkills.push('heal-skill')
}
if (
  skillNames.has('evidence-broker') &&
  !sidecarSkills.includes('evidence-broker') &&
  ['question-optimizer', 'market-research-router', 'validation-gate'].includes(primarySkill)
) {
  sidecarSkills.push('evidence-broker')
}
if (primarySkill === 'pricing-reliability') {
  for (const skill of ['pipeline', 'evidence-integrity']) {
    if (skillNames.has(skill) && !sidecarSkills.includes(skill)) {
      sidecarSkills.push(skill)
    }
  }
}
if (
  skillNames.has('answer-provenance') &&
  !sidecarSkills.includes('answer-provenance') &&
  ['question-optimizer', 'market-research-router', 'evidence-broker', 'research-brief-generator'].includes(primarySkill)
) {
  sidecarSkills.push('answer-provenance')
}
if (
  skillNames.has('market-research-router') &&
  !sidecarSkills.includes('market-research-router') &&
  ['question-optimizer', 'evidence-broker'].includes(primarySkill) &&
  ['market research', 'customer', 'buyer', 'vendor', 'chef', 'client', 'guest', 'staff', 'demand'].some((term) =>
    hasTerm(lowerPrompt, term),
  )
) {
  sidecarSkills.push('market-research-router')
}
if (
  skillNames.has('context-continuity') &&
  primarySkill !== 'context-continuity' &&
  !sidecarSkills.includes('context-continuity') &&
  [
    'build',
    'implement',
    'add',
    'create',
    'connect',
    'feature',
    'write spec',
    'plan spec',
    'research',
    'architecture',
    'workflow',
    'ui',
    'route',
  ].some((term) => hasTerm(lowerPrompt, term))
) {
  sidecarSkills.push('context-continuity')
}
if (
  skillNames.has('software-fundamentals') &&
  primarySkill !== 'software-fundamentals' &&
  !sidecarSkills.includes('software-fundamentals') &&
  [
    'build',
    'implement',
    'add',
    'create',
    'connect',
    'feature',
    'refactor',
    'code',
    'coding',
    'test',
    'spec',
    'architecture',
    'ui',
    'route',
  ].some((term) => hasTerm(lowerPrompt, term))
) {
  sidecarSkills.push('software-fundamentals')
}

const hardStops = hardStopRules
  .filter((rule) => rule.terms.some((term) => hasTerm(lowerPrompt, term)))
  .map((rule) => rule.id)

const requiredChecks = requiredCheckRules
  .filter((rule) => rule.terms.some((term) => hasTerm(lowerPrompt, term)))
  .map((rule) => rule.check)

if (!requiredChecks.includes('stage, commit, and push only owned files before closeout')) {
  requiredChecks.push('stage, commit, and push only owned files before closeout')
}

let riskLevel = 'low'
for (const rule of riskRules) {
  if (rule.terms.some((term) => hasTerm(lowerPrompt, term))) {
    riskLevel = rule.level
    break
  }
}
if (hardStops.length > 0) riskLevel = 'high'

const result = {
  prompt,
  generated_at: new Date().toISOString(),
  primary_skill: primarySkill,
  sidecar_skills: sidecarSkills,
  skill_maturity: Object.fromEntries(
    [primarySkill, ...sidecarSkills]
      .filter(Boolean)
      .map((skill) => [skill, skillMaturityState(skill, maturityManifest)]),
  ),
  conflict_resolution: primaryResolution.conflict,
  hard_stops: hardStops,
  risk_level: riskLevel,
  required_checks: [...new Set(requiredChecks)],
}

if (args.write || args.persist || args.report) {
  const outFile = path.join(
    reportsRoot,
    'router-decisions',
    `${nowStamp()}-${slugify(prompt)}.json`,
  )
  writeJson(outFile, result)
  result.report_path = outFile.replace(/\\/g, '/')
}

console.log(JSON.stringify(result, null, 2))
