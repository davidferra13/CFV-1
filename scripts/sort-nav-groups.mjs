// Sort navGroups alphabetically in nav-config.tsx
// Strategy: find each group by its `id:` line, extract as a block, sort, reassemble
import { readFileSync, writeFileSync } from 'fs'

const FILE = 'components/navigation/nav-config.tsx'
const content = readFileSync(FILE, 'utf8')
const lines = content.split('\n')

// Find navGroups array start
const arrayStart = lines.findIndex(l => /^export const navGroups:\s*NavGroup\[\]\s*=\s*\[/.test(l))
console.log(`navGroups starts at line ${arrayStart + 1}`)

// Find the closing ] by tracking bracket depth from the opening [
let depth = 0
let arrayEnd = -1
for (let i = arrayStart; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '[') depth++
    if (ch === ']') depth--
  }
  if (depth === 0 && i > arrayStart) {
    arrayEnd = i
    break
  }
}
console.log(`navGroups ends at line ${arrayEnd + 1}`)

// Extract the content between [ and ]
// Each top-level group object starts with `  {` at indent level 2
// and ends with `  },` at the same indent level
const groupBlocks = []
let currentBlock = []
let braceDepth = 0
let inGroup = false

for (let i = arrayStart + 1; i < arrayEnd; i++) {
  const line = lines[i]

  // Count braces
  for (const ch of line) {
    if (ch === '{') braceDepth++
    if (ch === '}') braceDepth--
  }

  if (braceDepth > 0 || line.trim().startsWith('}')) {
    currentBlock.push(line)
    inGroup = true
  }

  if (braceDepth === 0 && inGroup) {
    groupBlocks.push(currentBlock.join('\n'))
    currentBlock = []
    inGroup = false
  }
}

console.log(`Found ${groupBlocks.length} group blocks`)

// Extract label from a block
function getLabel(block) {
  const m = block.match(/label:\s*'([^']+)'/)
  return m ? m[1] : ''
}

// Sort items within a group block
function sortItems(block) {
  // Find the items: [ ... ] section
  const itemsMatch = block.match(/(items:\s*\[)([\s\S]*?)(\n\s{4}\],?)/)
  if (!itemsMatch) return block

  const prefix = itemsMatch[1]
  const itemsContent = itemsMatch[2]
  const suffix = itemsMatch[3]

  // Split items content into individual item objects
  const itemBlocks = []
  let currentItem = []
  let itemDepth = 0
  let itemStarted = false

  for (const line of itemsContent.split('\n')) {
    for (const ch of line) {
      if (ch === '{') { itemDepth++; itemStarted = true }
      if (ch === '}') itemDepth--
    }
    if (itemStarted || line.trim()) {
      currentItem.push(line)
    }
    if (itemDepth === 0 && itemStarted) {
      itemBlocks.push(currentItem.join('\n'))
      currentItem = []
      itemStarted = false
    }
  }

  // Sort items by label
  itemBlocks.sort((a, b) => {
    const labelA = getLabel(a).toLowerCase()
    const labelB = getLabel(b).toLowerCase()
    return labelA.localeCompare(labelB)
  })

  // Sort children within each item
  const sortedItems = itemBlocks.map(sortChildren)

  // Reassemble
  return block.replace(
    /(items:\s*\[)([\s\S]*?)(\n\s{4}\],?)/,
    prefix + '\n' + sortedItems.join('\n') + suffix
  )
}

// Sort children within an item
function sortChildren(itemBlock) {
  const childMatch = itemBlock.match(/(children:\s*\[)([\s\S]*?)(\n\s{8}\],?)/)
  if (!childMatch) return itemBlock

  const prefix = childMatch[1]
  const childContent = childMatch[2]
  const suffix = childMatch[3]

  const childBlocks = []
  let currentChild = []
  let childDepth = 0
  let childStarted = false

  for (const line of childContent.split('\n')) {
    for (const ch of line) {
      if (ch === '{') { childDepth++; childStarted = true }
      if (ch === '}') childDepth--
    }
    if (childStarted || line.trim()) {
      currentChild.push(line)
    }
    if (childDepth === 0 && childStarted) {
      childBlocks.push(currentChild.join('\n'))
      currentChild = []
      childStarted = false
    }
  }

  childBlocks.sort((a, b) => {
    const labelA = getLabel(a).toLowerCase()
    const labelB = getLabel(b).toLowerCase()
    return labelA.localeCompare(labelB)
  })

  return itemBlock.replace(
    /(children:\s*\[)([\s\S]*?)(\n\s{8}\],?)/,
    prefix + '\n' + childBlocks.join('\n') + suffix
  )
}

// Sort items within each group, then sort groups
const sortedBlocks = groupBlocks.map(sortItems)

sortedBlocks.sort((a, b) => {
  const labelA = getLabel(a).toLowerCase()
  const labelB = getLabel(b).toLowerCase()
  return labelA.localeCompare(labelB)
})

console.log('\nNew group order:')
sortedBlocks.forEach((b, i) => console.log(`  ${i + 1}. ${getLabel(b)}`))

// Reassemble file
const before = lines.slice(0, arrayStart + 1).join('\n')
const after = lines.slice(arrayEnd).join('\n')
const newContent = before + '\n' + sortedBlocks.join('\n') + '\n' + after

writeFileSync(FILE, newContent)
console.log('\nFile written!')

// Quick sanity: count opening and closing braces
const origBraces = content.split('{').length - content.split('}').length
const newBraces = newContent.split('{').length - newContent.split('}').length
console.log(`Brace balance check: original=${origBraces}, new=${newBraces}`)
