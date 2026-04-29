#!/usr/bin/env node
import path from 'node:path'
import {
  jaccard,
  loadSkills,
  projectSkillRoot,
  relative,
  tokenize,
} from './agent-skill-utils.mjs'

const bannedEmDash = '\u2014'
const triggerWords = [
  'use',
  'when',
  'asks',
  'asked',
  'request',
  'task',
  'debug',
  'build',
  'review',
  'audit',
  'persona',
  'skill',
]

function validateSkill(skill, allNames) {
  const errors = [...skill.errors]
  const warnings = [...skill.warnings]

  if (!skill.name) errors.push('missing name in frontmatter')
  if (!skill.description) errors.push('missing description in frontmatter')
  if (skill.name && skill.name !== skill.folderName) {
    errors.push(`name "${skill.name}" does not match folder "${skill.folderName}"`)
  }
  if (skill.description && skill.description.length < 50) {
    warnings.push('description is short and may not trigger reliably')
  }
  if (
    skill.description &&
    !triggerWords.some((word) => skill.description.toLowerCase().includes(word))
  ) {
    warnings.push('description lacks explicit trigger language')
  }
  if (skill.raw.includes(bannedEmDash)) {
    errors.push('contains banned em dash character')
  }
  const referencedSkills = [...skill.raw.matchAll(/(?:skill|load|run|use|invoke)\s+`([a-z0-9][a-z0-9-]{1,63})`/gi)]
    .map((match) => match[1])
    .filter((name) => name !== skill.name)
  const knownExternalSkills = new Set(['skill-creator', 'skill-installer'])
  for (const referenced of new Set(referencedSkills)) {
    if (!allNames.has(referenced) && !knownExternalSkills.has(referenced)) {
      warnings.push(`references unknown skill "${referenced}"`)
    }
  }

  return { ...skill, errors, warnings }
}

function findOverlaps(skills) {
  const overlaps = []
  for (let i = 0; i < skills.length; i += 1) {
    for (let j = i + 1; j < skills.length; j += 1) {
      const a = skills[i]
      const b = skills[j]
      const score = jaccard(
        tokenize(`${a.description}\n${a.body.slice(0, 1200)}`),
        tokenize(`${b.description}\n${b.body.slice(0, 1200)}`),
      )
      if (score >= 0.42) {
        overlaps.push({
          a: a.name || a.folderName,
          b: b.name || b.folderName,
          score: Number(score.toFixed(2)),
        })
      }
    }
  }
  return overlaps
}

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
let skills = loadSkills(projectSkillRoot)
if (requested.length) {
  const requestedSet = new Set(requested.map((item) => path.basename(item, '.md')))
  skills = skills.filter(
    (skill) =>
      requestedSet.has(skill.folderName) ||
      requestedSet.has(skill.name) ||
      requested.some((item) => relative(skill.file) === item.replace(/\\/g, '/')),
  )
}

const allNames = new Set(loadSkills(projectSkillRoot).map((skill) => skill.name).filter(Boolean))
const validated = skills.map((skill) => validateSkill(skill, allNames))
const overlaps = requested.length ? [] : findOverlaps(loadSkills(projectSkillRoot))
const errorCount = validated.reduce((sum, skill) => sum + skill.errors.length, 0)
const warningCount =
  validated.reduce((sum, skill) => sum + skill.warnings.length, 0) + overlaps.length

for (const skill of validated) {
  const label = `${skill.name || skill.folderName} (${relative(skill.file)})`
  if (!skill.errors.length && !skill.warnings.length) {
    console.log(`OK ${label}`)
    continue
  }
  console.log(`${skill.errors.length ? 'FAIL' : 'WARN'} ${label}`)
  for (const error of skill.errors) console.log(`  ERROR ${error}`)
  for (const warning of skill.warnings) console.log(`  WARN ${warning}`)
}

for (const overlap of overlaps) {
  console.log(`WARN overlap ${overlap.a} <-> ${overlap.b} score=${overlap.score}`)
}

console.log(`\nValidated ${validated.length} skill(s): ${errorCount} error(s), ${warningCount} warning(s)`)
process.exit(errorCount ? 1 : 0)
