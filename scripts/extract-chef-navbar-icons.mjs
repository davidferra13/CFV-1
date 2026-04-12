import fs from 'fs'
import path from 'path'

const cwd = process.cwd()
const nav = JSON.parse(fs.readFileSync(path.join(cwd, 'tmp_nav_icons.json'), 'utf8'))

let total = 0
let defined = 0
let none = 0

function renderItem(item, indent = '') {
  total += 1
  const icon = item.icon || 'none'
  if (icon === 'none') none += 1
  else defined += 1

  const lines = [
    `${indent}- label: ${item.label}`,
    `${indent}  route: ${item.href ?? 'UNVERIFIED'}`,
    `${indent}  icon: ${icon}`,
    `${indent}  icon_status: ${icon === 'none' ? 'no icon declared in code' : 'explicitly declared in code'}`,
  ]

  if (item.children?.length) {
    for (const child of item.children) lines.push(renderItem(child, indent + '  '))
  }

  return lines.join('\n')
}

let out = '# Chef Navbar Icon Inventory\n\n'
out += 'Scope: chef navbar surfaces only.\n'
out += '- standaloneTop\n'
out += '- navGroups\n'
out += '- standaloneBottom\n'
out += '- communitySectionItems\n'
out += '- QUICK_CREATE_ITEMS\n\n'

out += '## standaloneTop\n'
for (const item of nav.standaloneTop) out += renderItem(item) + '\n'
out += '\n'

for (const group of nav.navGroups) {
  out += `## navGroup: ${group.label} (${group.id})\n`
  for (const item of group.items) out += renderItem(item) + '\n'
  out += '\n'
}

out += '## standaloneBottom\n'
for (const item of nav.standaloneBottom) out += renderItem(item) + '\n'
out += '\n'

out += '## communitySectionItems\n'
for (const item of nav.communitySectionItems) out += renderItem(item) + '\n'
out += '\n'

out += '## QUICK_CREATE_ITEMS\n'
for (const item of nav.QUICK_CREATE_ITEMS) out += renderItem(item) + '\n'
out += '\n'

out += '## Counts\n'
out += `- total chef navbar nodes: ${total}\n`
out += `- icons explicitly declared: ${defined}\n`
out += `- nodes with no icon declared: ${none}\n`

fs.writeFileSync(path.join(cwd, 'chef-navbar-icon-inventory.md'), out, 'utf8')
console.log('wrote chef-navbar-icon-inventory.md')
