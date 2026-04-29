#!/usr/bin/env node
import path from 'node:path'
import {
  ensureDir,
  learningInboxRoot,
  loadSkills,
  nowStamp,
  parseArgs,
  projectSkillRoot,
  readJson,
  readStdin,
  repoRoot,
  shortHash,
  slugify,
  updateSkillMaturity,
  writeJson,
} from './agent-skill-utils.mjs'

const goldenPromptFile = path.join(repoRoot, 'system', 'agent-golden-prompts', 'default.json')

function usage() {
  console.log(`Usage:
  node devtools/report-skill-failure.mjs --skill skill-name --what "..." --prompt "..." [--details "..."] [--add-golden] [--no-mark-needs-healing]

Options:
  --skill       Skill that failed or missed the prompt
  --what        Short description of the failure
  --prompt      Prompt that should reproduce or route the behavior
  --details     Optional context. Reads stdin when omitted and available
  --add-golden  Append a golden prompt regression case when the prompt is new
  --no-mark-needs-healing  Do not mark the skill as needs-healing in the maturity manifest`)
}

function requireString(args, key) {
  const value = args[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing --${key}`)
  }
  return value.trim()
}

function buildLearningItem({ skill, what, prompt, details }) {
  const title = `Skill failure: ${skill} - ${what}`
  const body = [
    `Skill: ${skill}`,
    `Failure: ${what}`,
    `Prompt: ${prompt}`,
    details ? `Details:\n${details}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  const id = `${nowStamp()}-${slugify(title)}-${shortHash(`${prompt}\n${body}`)}`

  return {
    id,
    status: 'open',
    category: 'failure',
    title,
    source: 'report-skill-failure',
    target_skill: skill,
    created_at: new Date().toISOString(),
    details: body,
    decision: null,
    resolved_at: null,
    notes: null,
  }
}

function writeLearningItem(item) {
  ensureDir(learningInboxRoot)
  const file = path.join(learningInboxRoot, `${item.id}.json`)
  writeJson(file, item)
  return file
}

function evidenceTermsForSkill(skillName) {
  const skill = loadSkills(projectSkillRoot).find((item) => item.name === skillName)
  if (!skill) return []
  const stop = new Set(['when', 'with', 'this', 'that', 'skill', 'codex', 'chefflow', 'agent'])
  return [...new Set(String(skill.description || '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => word.length > 3 && !stop.has(word)))]
    .slice(0, 2)
}

function buildGoldenCase({ skill, what, prompt }) {
  return {
    name: `skill failure: ${skill} - ${slugify(what)}`,
    prompt,
    expect: [skill],
    evidence: {
      [skill]: evidenceTermsForSkill(skill),
    },
  }
}

function appendGoldenCaseWhenMissing(testCase) {
  const cases = readJson(goldenPromptFile, [])
  if (!Array.isArray(cases)) {
    throw new Error(`Golden prompt file must contain a JSON array: ${goldenPromptFile}`)
  }

  const exists = cases.some((item) => item && item.prompt === testCase.prompt)
  if (exists) {
    return { added: false, file: goldenPromptFile }
  }

  cases.push(testCase)
  writeJson(goldenPromptFile, cases)
  return { added: true, file: goldenPromptFile }
}

function main() {
  const args = parseArgs()
  if (args.help) {
    usage()
    return
  }

  const skill = requireString(args, 'skill')
  const what = requireString(args, 'what')
  const prompt = requireString(args, 'prompt')
  const details = String(args.details || readStdin() || '').trim()

  const learningItem = buildLearningItem({ skill, what, prompt, details })
  const learningFile = writeLearningItem(learningItem)

  const result = {
    learning_item: learningItem,
    learning_file: path.relative(repoRoot, learningFile).replace(/\\/g, '/'),
    golden_prompt: null,
  }

  if (args['add-golden']) {
    const goldenCase = buildGoldenCase({ skill, what, prompt })
    const goldenResult = appendGoldenCaseWhenMissing(goldenCase)
    result.golden_prompt = {
      added: goldenResult.added,
      file: path.relative(repoRoot, goldenResult.file).replace(/\\/g, '/'),
      case: goldenCase,
    }
  }

  if (!args['no-mark-needs-healing']) {
    result.maturity = updateSkillMaturity(skill, {
      state: 'needs-healing',
      reason: `Failure reported: ${what}`,
      source: result.learning_file,
    })
  }

  console.log(JSON.stringify(result, null, 2))
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
