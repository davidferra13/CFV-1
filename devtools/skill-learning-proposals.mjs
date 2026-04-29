#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  jaccard,
  learningInboxRoot,
  loadSkills,
  parseArgs,
  readJson,
  relative,
  tokenize,
} from './agent-skill-utils.mjs'

const actionLabels = {
  patch: 'patch existing skill',
  create: 'create new skill',
  agents: 'update AGENTS.md',
  persona: 'route persona-dump',
  findings: 'findings-triage',
  reject: 'reject one-off',
}

const hardStopTerms = [
  'hard stop',
  'must not',
  'approval',
  'main',
  'deploy',
  'destructive',
  'drop table',
  'delete',
  'drizzle-kit push',
  'types/database.ts',
  '@ts-nocheck',
  'em dash',
]

const hardStopSubjects = [
  'main',
  'deploy',
  'production',
  'database',
  'migration',
  'drizzle',
  'types/database.ts',
  '@ts-nocheck',
  'em dash',
  'server',
]

const personaTerms = [
  'persona',
  'third-party chatgpt',
  'huge blurb',
  'bulk paste',
  'persona dump',
  'chef flow personas',
]

const findingsTerms = [
  'finding',
  'findings',
  'autodocket',
  'regression report',
  'build queue',
  'audit finding',
  'gap',
  'backlog',
]

const durableTerms = [
  'always',
  'never',
  'codex should',
  'from now on',
  'make codex smarter',
  'self-heal',
  'self healing',
  'developer behavior',
  'use this behavior going forward',
  'knows when to',
]

function usage() {
  console.log(`Usage:
  node devtools/skill-learning-proposals.mjs
  node devtools/skill-learning-proposals.mjs --json

Reads open JSON items from system/agent-learning-inbox and prints deterministic proposed actions.`)
}

function includesAny(text, terms) {
  const lower = text.toLowerCase()
  return terms.some((term) => lower.includes(term))
}

function isHardStop(text) {
  const lower = text.toLowerCase()
  if (includesAny(lower, hardStopTerms)) return true
  return lower.includes('never') && includesAny(lower, hardStopSubjects)
}

function listOpenItems() {
  if (!fs.existsSync(learningInboxRoot)) return []
  return fs
    .readdirSync(learningInboxRoot)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const file = path.join(learningInboxRoot, name)
      return { file, item: readJson(file, null) }
    })
    .filter(({ item }) => item && item.status !== 'resolved')
}

function bestSkillMatch(text, skills) {
  const textTokens = tokenize(text)
  let best = null
  for (const skill of skills) {
    const skillTokens = tokenize(`${skill.name}\n${skill.description}\n${skill.body.slice(0, 1600)}`)
    const score = jaccard(textTokens, skillTokens)
    if (!best || score > best.score || (score === best.score && skill.name < best.skill.name)) {
      best = { skill, score }
    }
  }
  return best
}

function proposalFor(entry, skillsByName, skills) {
  const { item, file } = entry
  const text = [item.category, item.title, item.details, item.notes, item.target_skill]
    .filter(Boolean)
    .join('\n')
  const targetSkill = item.target_skill && skillsByName.get(item.target_skill)

  if (includesAny(text, personaTerms)) {
    return makeProposal(item, file, 'persona', 'persona-dump', 'Persona intake belongs in the persona pipeline.')
  }

  if (includesAny(text, findingsTerms) && !includesAny(text, durableTerms)) {
    return makeProposal(item, file, 'findings', 'findings-triage', 'Mixed product gaps should be normalized before build work.')
  }

  if (isHardStop(text)) {
    return makeProposal(item, file, 'agents', 'AGENTS.md', 'Project hard stops belong in the central agent contract.')
  }

  if (targetSkill) {
    return makeProposal(item, file, 'patch', targetSkill.name, 'The item names an existing target skill.')
  }

  const match = bestSkillMatch(text, skills)
  if (match && match.score >= 0.08) {
    return makeProposal(
      item,
      file,
      'patch',
      match.skill.name,
      `Best existing skill match by token overlap, score ${match.score.toFixed(2)}.`,
    )
  }

  if (includesAny(text, durableTerms) || item.category === 'workflow' || item.category === 'failure') {
    return makeProposal(item, file, 'create', null, 'Durable behavior has no clear existing skill owner.')
  }

  return makeProposal(item, file, 'reject', null, 'No durable route or reusable workflow signal was detected.')
}

function makeProposal(item, file, actionKey, target, reason) {
  const proposal = {
    id: item.id || path.basename(file, '.json'),
    file: relative(file),
    title: item.title || '(untitled)',
    category: item.category || 'unknown',
    proposed_action: actionLabels[actionKey],
    target,
    reason,
  }
  proposal.patch_proposal = buildPatchProposal(item, actionKey, target)
  return proposal
}

function buildPatchProposal(item, actionKey, target) {
  const sourceText = [item.title, item.details, item.notes].filter(Boolean).join(' ')
  const normalized = sourceText.replace(/\s+/g, ' ').trim()
  const behavior = normalized.slice(0, 500) || 'No details supplied.'

  if (actionKey === 'patch' && target) {
    return {
      type: 'skill-patch-draft',
      target_file: `.claude/skills/${target}/SKILL.md`,
      intent: 'Add the minimum trigger or guardrail needed to preserve the observed behavior.',
      suggested_text: `Add a concise rule covering this observed behavior: ${behavior}`,
    }
  }

  if (actionKey === 'create') {
    const slug = item.title
      ? item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
      : 'new-agent-behavior'
    return {
      type: 'new-skill-draft',
      target_file: `.claude/skills/${slug || 'new-agent-behavior'}/SKILL.md`,
      intent: 'Create only if no existing skill owns this durable workflow.',
      suggested_frontmatter: {
        name: slug || 'new-agent-behavior',
        description: `Use when ${behavior}`,
      },
    }
  }

  if (actionKey === 'agents') {
    return {
      type: 'agents-rule-draft',
      target_file: 'AGENTS.md',
      intent: 'Add only if this is a durable project-wide rule or hard stop.',
      suggested_text: behavior,
    }
  }

  if (actionKey === 'persona') {
    return {
      type: 'route-draft',
      target_skill: 'persona-dump',
      suggested_text: 'Route this item through persona-dump intake instead of creating a new skill.',
    }
  }

  if (actionKey === 'findings') {
    return {
      type: 'route-draft',
      target_skill: 'findings-triage',
      suggested_text: 'Normalize this finding before planning or building product changes.',
    }
  }

  return {
    type: 'rejection-draft',
    suggested_text: 'Reject as one-off unless the behavior repeats or becomes project policy.',
  }
}

const args = parseArgs()
if (args.help) {
  usage()
  process.exit(0)
}

const skills = loadSkills()
const skillsByName = new Map(skills.map((skill) => [skill.name, skill]))
const entries = listOpenItems()
const proposals = entries.map((entry) => proposalFor(entry, skillsByName, skills))

if (args.json) {
  console.log(JSON.stringify({ proposal_count: proposals.length, proposals }, null, 2))
  process.exit(0)
}

if (!proposals.length) {
  console.log('No open learning inbox items.')
  process.exit(0)
}

for (const proposal of proposals) {
  const target = proposal.target ? ` -> ${proposal.target}` : ''
  console.log(`${proposal.id}: ${proposal.proposed_action}${target}`)
  console.log(`  ${proposal.reason}`)
}
