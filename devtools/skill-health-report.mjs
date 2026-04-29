#!/usr/bin/env node
import path from 'node:path'
import {
  jaccard,
  loadSkills,
  nowStamp,
  projectSkillRoot,
  readJson,
  relative,
  reportsRoot,
  tokenize,
  writeJson,
} from './agent-skill-utils.mjs'

const learningDir = path.join(process.cwd(), 'system', 'agent-learning-inbox')
const generatedReportDirs = [
  'skill-closeouts',
  'skill-coverage',
  'skill-dependencies',
  'skill-health',
  'router-decisions',
  'flight-records',
  'skill-maturity',
  'skill-dashboard',
  'skill-outcomes',
  'skill-repair-queue',
  'replay-runs',
  'codex-build-bridge',
  'session-digests',
].map((name) => path.join(reportsRoot, name))

function skillAgeDays(skill) {
  const fs = globalThis.__fs
  const stat = fs.statSync(skill.file)
  return Math.round((Date.now() - stat.mtimeMs) / 86400000)
}

function referenceWarnings(skill, allNames) {
  const warnings = []
  const refs = [...skill.raw.matchAll(/`([^`\r\n]+)`/g)].map((match) => match[1])
  const skillRefs = [...skill.raw.matchAll(/(?:skill|load|run|use|invoke)\s+`([a-z0-9][a-z0-9-]{1,63})`/gi)].map(
    (match) => match[1],
  )
  const knownExternalSkills = new Set(['skill-creator', 'skill-installer'])
  for (const ref of refs) {
    const normalized = ref.replace(/\\/g, '/')
    const knownRepoPrefix = /^(app|components|lib|scripts|docs|system|database|tests|types|public|devtools|memory|\.claude)\//
    const hasFileExtension = /\.[a-z0-9]{1,8}$/i.test(normalized)
    const looksLikePath =
      (normalized.includes('/') || ref.includes('\\')) &&
      !ref.includes('*') &&
      !ref.includes('[') &&
      !ref.includes(']') &&
      !normalized.startsWith('/') &&
      !/^[A-Za-z]:\//.test(normalized) &&
      !/\s/.test(ref) &&
      (knownRepoPrefix.test(normalized) || hasFileExtension)
    if (looksLikePath) {
      const target = path.join(process.cwd(), ref)
      if (!globalThis.__fs.existsSync(target)) warnings.push(`missing referenced path ${ref}`)
    }
  }
  for (const ref of new Set(skillRefs)) {
    if (!allNames.has(ref) && !knownExternalSkills.has(ref)) {
      warnings.push(`unknown referenced skill ${ref}`)
    }
  }
  return warnings
}

const fsModule = await import('node:fs')
globalThis.__fs = fsModule.default

const skills = loadSkills(projectSkillRoot)
const allNames = new Set(skills.map((skill) => skill.name).filter(Boolean))
const skillRows = skills.map((skill) => ({
  name: skill.name,
  file: relative(skill.file),
  description: skill.description,
  age_days: skillAgeDays(skill),
  line_count: skill.raw.split(/\r?\n/).length,
  has_em_dash: skill.raw.includes('\u2014'),
  missing_frontmatter: skill.errors.length > 0,
  reference_warnings: referenceWarnings(skill, allNames),
}))

const overlaps = []
for (let i = 0; i < skills.length; i += 1) {
  for (let j = i + 1; j < skills.length; j += 1) {
    const score = jaccard(
      tokenize(`${skills[i].description}\n${skills[i].body.slice(0, 1200)}`),
      tokenize(`${skills[j].description}\n${skills[j].body.slice(0, 1200)}`),
    )
    if (score >= 0.38) {
      overlaps.push({
        a: skills[i].name,
        b: skills[j].name,
        score: Number(score.toFixed(2)),
      })
    }
  }
}

let openLearningItems = []
if (globalThis.__fs.existsSync(learningDir)) {
  openLearningItems = globalThis.__fs
    .readdirSync(learningDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(learningDir, name), null))
    .filter((item) => item && item.status !== 'resolved')
    .map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      target_skill: item.target_skill,
    }))
}

const staleGeneratedReports = generatedReportDirs.flatMap((dir) => {
  if (!globalThis.__fs.existsSync(dir)) return []
  const reports = globalThis.__fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
  return reports.slice(0, Math.max(0, reports.length - 1)).map((name) => ({
    directory: relative(dir),
    file: relative(path.join(dir, name)),
  }))
})

const report = {
  generated_at: new Date().toISOString(),
  skill_count: skills.length,
  unhealthy_count: skillRows.filter(
    (skill) => skill.has_em_dash || skill.missing_frontmatter || skill.reference_warnings.length,
  ).length,
  overlaps,
  open_learning_items: openLearningItems,
  stale_generated_reports: staleGeneratedReports,
  skills: skillRows,
}

const outFile = path.join(reportsRoot, 'skill-health', `${nowStamp()}-skill-health.json`)
writeJson(outFile, report)

console.log(`Skill count: ${report.skill_count}`)
console.log(`Unhealthy skills: ${report.unhealthy_count}`)
console.log(`Potential overlaps: ${report.overlaps.length}`)
console.log(`Open learning items: ${report.open_learning_items.length}`)
console.log(`Stale generated reports: ${report.stale_generated_reports.length}`)
console.log(`Wrote report: ${outFile.replace(/\\/g, '/')}`)
