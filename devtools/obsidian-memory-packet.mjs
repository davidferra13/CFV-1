#!/usr/bin/env node
import { parseArgs, splitCsv } from './agent-skill-utils.mjs'
import { writeMemoryPacket } from './context-continuity-lib.mjs'

const args = parseArgs()
const title = args.title || args._.join(' ') || 'Context Continuity Packet'

const result = writeMemoryPacket({
  title,
  userIntent: args.intent || '',
  canonicalHome: args.home || args['canonical-home'] || '',
  duplicateRisk: args.risk || '',
  existingRelatedSurfaces: splitCsv(args.surfaces),
  followUpQuestion: args.question || '',
  links: splitCsv(args.links),
  vault: args.vault && args.vault !== true ? String(args.vault) : null,
})

console.log(JSON.stringify(result, null, 2))
