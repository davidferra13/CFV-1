#!/usr/bin/env node
import {
  claimRootFromArgs,
  createClaim,
  detectClaimConflicts,
  finishClaim,
  readClaim,
  verifyClaimBranch,
} from './agent-claim-utils.mjs'
import { parseArgs, readStdin } from './agent-skill-utils.mjs'

function usage() {
  console.log(`Usage:
  node devtools/agent-claim.mjs start --prompt "..." [--owned a,b] [--claims-dir dir]
  node devtools/agent-claim.mjs check --claim file --owned a,b [--claims-dir dir]
  node devtools/agent-claim.mjs finish --claim file [--owned a,b] [--commit sha] [--pushed]

Creates and verifies per-agent file claims for multi-agent ChefFlow work.`)
}

try {
  const args = parseArgs()
  const command = args._.shift()
  if (args.help || !command) {
    usage()
    process.exit(command ? 0 : 1)
  }

  const claimsRoot = claimRootFromArgs(args)
  if (command === 'start') {
    const prompt = String(args.prompt || args._.join(' ') || readStdin()).trim()
    if (!prompt) throw new Error('Missing --prompt.')
    const result = createClaim({ prompt, owned: args.owned, claimsRoot })
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  }

  if (command === 'check') {
    const claim = args.claim && args.claim !== true ? readClaim(String(args.claim)) : null
    const branch = verifyClaimBranch(claim)
    const conflicts = detectClaimConflicts({
      claimFile: args.claim && args.claim !== true ? String(args.claim) : null,
      claimsRoot,
      owned: args.owned,
    })
    const result = {
      ok: branch.ok && conflicts.length === 0,
      branch,
      conflicts,
    }
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.ok ? 0 : 1)
  }

  if (command === 'finish') {
    if (!args.claim || args.claim === true) throw new Error('Missing --claim.')
    const result = finishClaim({
      claimFile: String(args.claim),
      claimsRoot,
      owned: args.owned,
      commit: args.commit && args.commit !== true ? String(args.commit) : null,
      pushed: args.pushed ? true : null,
    })
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  }

  throw new Error(`Unknown command: ${command}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
