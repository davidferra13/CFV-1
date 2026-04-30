#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { parseArgs, readStdin } from './agent-skill-utils.mjs'

function runNode(args) {
  return execFileSync('node', args, { encoding: 'utf8' })
}

function usage() {
  console.log(`Usage:
  node devtools/agent-start.mjs --prompt "..." [--owned path,other-path]

Routes the prompt, writes a flight record, creates an agent claim, and prints the required harness state.
Use --owned to claim the files this agent expects to touch.`)
}

try {
  const args = parseArgs()
  if (args.help) {
    usage()
    process.exit(0)
  }
  const prompt = String(args.prompt || args._.join(' ') || readStdin()).trim()
  if (!prompt) throw new Error('Missing --prompt.')
  const router = JSON.parse(runNode(['devtools/skill-router.mjs', '--prompt', prompt, '--write']))
  let continuity = null
  const selectedSkills = [router.primary_skill, ...(router.sidecar_skills || [])].filter(Boolean)
  if (!args['skip-continuity'] && selectedSkills.includes('context-continuity')) {
    try {
      continuity = JSON.parse(
        runNode(['devtools/context-continuity-scan.mjs', '--prompt', prompt, '--write', '--json'])
      )
    } catch (error) {
      continuity = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
  const flight = JSON.parse(
    runNode([
      'devtools/agent-flight-recorder.mjs',
      'start',
      '--prompt',
      prompt,
      '--primary',
      router.primary_skill,
      '--sidecars',
      (router.sidecar_skills || []).join(','),
      '--create-claim',
      ...(args.owned && args.owned !== true ? ['--owned', String(args.owned)] : []),
    ])
  )
  const result = {
    prompt,
    primary_skill: router.primary_skill,
    sidecar_skills: router.sidecar_skills || [],
    skill_maturity: router.skill_maturity || {},
    conflict_resolution: router.conflict_resolution || null,
    hard_stops: router.hard_stops || [],
    required_checks: router.required_checks || [],
    risk_level: router.risk_level,
    continuity:
      continuity && continuity.ok === false
        ? continuity
        : continuity
          ? {
              decision: continuity.continuity?.decision || null,
              stop_required: continuity.continuity?.stop_required || false,
              reason: continuity.continuity?.reason || null,
              report_path: continuity.report_path || null,
              canonical_surfaces: (continuity.canonical_surfaces || []).map((item) => item.id),
            }
          : null,
    router_report: router.report_path || null,
    flight_record: flight.record_file,
    claim_file: flight.record.claim_file || null,
  }
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
