#!/usr/bin/env node
import path from 'node:path'
import {
  loadSkills,
  nowStamp,
  parseArgs,
  projectSkillRoot,
  relative,
  reportsRoot,
  writeJson,
} from './agent-skill-utils.mjs'

const knownExternalSkills = new Set([
  'imagegen',
  'openai-docs',
  'plugin-creator',
  'skill-creator',
  'skill-installer',
])

function collectBacktickRefs(raw) {
  return [...raw.matchAll(/`([a-z0-9][a-z0-9-]{1,63})`/g)].map((match) => ({
    ref: match[1],
    evidence: match[0],
    kind: 'backtick',
  }))
}

function collectPathRefs(raw) {
  return [...raw.matchAll(/\.claude\/skills\/([a-z0-9][a-z0-9-]{1,63})\//g)].map(
    (match) => ({
      ref: match[1],
      evidence: match[0],
      kind: 'path',
    }),
  )
}

function collectVerbRefs(raw) {
  return [
    ...raw.matchAll(
      /\b(?:skill|skills|load|run|use|invoke|primary|sidecar|route|handoff|hand off to)\s+`([a-z0-9][a-z0-9-]{1,63})`/gi,
    ),
  ].map((match) => ({
    ref: match[1],
    evidence: match[0],
    kind: 'verb',
  }))
}

function collectRefs(skill, allNames) {
  const seen = new Map()
  const explicitVerbRefs = new Set(collectVerbRefs(skill.raw).map((item) => item.ref))
  const isKnownRef = (ref) => allNames.has(ref) || knownExternalSkills.has(ref)
  for (const item of [
    ...collectBacktickRefs(skill.raw),
    ...collectPathRefs(skill.raw),
  ]) {
    if (item.ref === skill.name) continue
    if (!isKnownRef(item.ref) && item.kind !== 'path' && !explicitVerbRefs.has(item.ref)) {
      continue
    }
    if (!seen.has(item.ref)) {
      seen.set(item.ref, {
        ref: item.ref,
        kinds: explicitVerbRefs.has(item.ref) ? [item.kind, 'verb'] : [item.kind],
        evidence: item.evidence,
      })
      continue
    }
    const existing = seen.get(item.ref)
    if (!existing.kinds.includes(item.kind)) existing.kinds.push(item.kind)
    if (explicitVerbRefs.has(item.ref) && !existing.kinds.includes('verb')) {
      existing.kinds.push('verb')
    }
  }
  return [...seen.values()].sort((a, b) => a.ref.localeCompare(b.ref))
}

function buildGraph(skills) {
  const allNames = new Set(skills.map((skill) => skill.name).filter(Boolean))
  const edges = []
  const externalRefs = []
  const unknownRefs = []

  for (const skill of skills) {
    for (const item of collectRefs(skill, allNames)) {
      if (allNames.has(item.ref)) {
        edges.push({
          from: skill.name,
          to: item.ref,
          kinds: item.kinds,
          evidence: item.evidence,
        })
        continue
      }
      if (knownExternalSkills.has(item.ref)) {
        externalRefs.push({
          from: skill.name,
          to: item.ref,
          kinds: item.kinds,
          evidence: item.evidence,
        })
        continue
      }
      unknownRefs.push({
        from: skill.name,
        ref: item.ref,
        kinds: item.kinds,
        evidence: item.evidence,
        file: relative(skill.file),
      })
    }
  }

  const incoming = new Map(skills.map((skill) => [skill.name, 0]))
  const outgoing = new Map(skills.map((skill) => [skill.name, 0]))
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1)
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1)
  }

  const orphanSkills = skills
    .filter((skill) => !incoming.get(skill.name) && !outgoing.get(skill.name))
    .map((skill) => ({
      name: skill.name,
      file: relative(skill.file),
    }))

  const noIncoming = skills
    .filter((skill) => !incoming.get(skill.name))
    .map((skill) => skill.name)
    .sort()

  const noOutgoing = skills
    .filter((skill) => !outgoing.get(skill.name))
    .map((skill) => skill.name)
    .sort()

  return {
    generated_at: new Date().toISOString(),
    skill_count: skills.length,
    edge_count: edges.length,
    external_ref_count: externalRefs.length,
    unknown_ref_count: unknownRefs.length,
    orphan_count: orphanSkills.length,
    edges: edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    external_refs: externalRefs.sort(
      (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
    ),
    unknown_refs: unknownRefs.sort(
      (a, b) => a.from.localeCompare(b.from) || a.ref.localeCompare(b.ref),
    ),
    orphan_skills: orphanSkills.sort((a, b) => a.name.localeCompare(b.name)),
    no_incoming: noIncoming,
    no_outgoing: noOutgoing,
  }
}

function printSummary(report) {
  console.log(`Skill dependency edges: ${report.edge_count}`)
  for (const edge of report.edges) {
    console.log(`${edge.from} -> ${edge.to}`)
  }
  console.log(`External refs: ${report.external_ref_count}`)
  for (const ref of report.external_refs) {
    console.log(`${ref.from} -> ${ref.to} external`)
  }
  console.log(`Unknown refs: ${report.unknown_ref_count}`)
  for (const ref of report.unknown_refs) {
    console.log(`${ref.from} -> ${ref.ref} unknown in ${ref.file}`)
  }
  console.log(`Orphan skills: ${report.orphan_count}`)
  for (const skill of report.orphan_skills) {
    console.log(`${skill.name} orphan`)
  }
}

const args = parseArgs()
const report = buildGraph(loadSkills(projectSkillRoot))

if (args.stdout) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const outFile = path.join(
    reportsRoot,
    'skill-dependencies',
    `${nowStamp()}-skill-dependencies.json`,
  )
  writeJson(outFile, report)
  printSummary(report)
  console.log(`Wrote report: ${outFile.replace(/\\/g, '/')}`)
}
