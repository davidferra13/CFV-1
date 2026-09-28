import fs from 'node:fs'

import { scoreDiscoveryRailItems } from '@/lib/discovery/discovery-rail-scoring'

type Payload = {
  items: Array<{ type: string; label: string; href: string }>
  signals: Parameters<typeof scoreDiscoveryRailItems>[1]
  context: Parameters<typeof scoreDiscoveryRailItems>[2]
}

const input = JSON.parse(fs.readFileSync(0, 'utf8')) as Payload
const scored = scoreDiscoveryRailItems(input.items, input.signals, input.context)

process.stdout.write(
  JSON.stringify({
    returned: scored.map(({ item, debug }) => ({ ...item, debug })),
  })
)
