import type { LoadedContinuitySource, WorkContinuityItem } from './types'
import { findLineNumber, slugifyWorkContinuityId } from './sources'

type BuiltSpecBlock = {
  title: string
  line: number
  specPath?: string
  specLine?: number
  priority?: string
}

export function parseBuiltSpecQueue(
  source: LoadedContinuitySource | undefined
): WorkContinuityItem[] {
  if (!source) {
    return []
  }

  const summaryLine = findLineNumber(source, /specs remain in active "built"/i)
  const items: WorkContinuityItem[] = []

  if (summaryLine) {
    items.push({
      id: 'built-but-unverified-specs',
      title: 'Built-but-unverified specs',
      category: 'built_unverified',
      lane: 'website-owned',
      status: 'built_unverified',
      sourcePaths: [
        {
          path: source.path,
          line: summaryLine,
          label: 'built specs verification queue summary',
        },
      ],
      nextAction: 'Verify built specs in queue order.',
      lastSeen: '2026-04-02',
    })
  }

  for (const block of extractBuiltSpecBlocks(source)) {
    items.push({
      id: `built-unverified-${slugifyWorkContinuityId(block.title)}`,
      title: block.title,
      category: 'built_unverified',
      lane: 'website-owned',
      status: 'built_unverified',
      sourcePaths: [
        {
          path: source.path,
          line: block.line,
          label: block.priority
            ? `${block.priority} built spec queue entry`
            : 'built spec queue entry',
        },
        ...(block.specPath
          ? [
              {
                path: source.path,
                line: block.specLine,
                label: block.specPath,
              },
            ]
          : []),
      ],
      nextAction: block.specPath
        ? `Run the verification steps for ${block.specPath}.`
        : 'Run the verification steps from the built-spec queue.',
      lastSeen: '2026-04-02',
    })
  }

  return items
}

function extractBuiltSpecBlocks(source: LoadedContinuitySource): BuiltSpecBlock[] {
  const blocks: BuiltSpecBlock[] = []
  const headingPattern = /^###\s+\d+\.\s+(.+?)\s*$/

  for (let index = 0; index < source.lines.length; index += 1) {
    const heading = source.lines[index].match(headingPattern)
    if (!heading) {
      continue
    }

    const blockLines = source.lines.slice(index + 1, index + 20)
    const specOffset = blockLines.findIndex((line) => line.includes('**Spec:**'))
    const priorityLine = blockLines.find((line) => line.includes('**Priority:**'))
    const specLine = specOffset >= 0 ? source.lines[index + specOffset + 1] : undefined
    const specPath = specLine?.match(/`([^`]+)`/)?.[1]

    blocks.push({
      title: heading[1].trim(),
      line: index + 1,
      specPath,
      specLine: specOffset >= 0 ? index + specOffset + 2 : undefined,
      priority: priorityLine?.match(/\*\*Priority:\*\*\s*(.+)$/)?.[1]?.trim(),
    })
  }

  return blocks
}
