import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const launchReadinessSource = readFileSync('app/(admin)/admin/launch-readiness/page.tsx', 'utf8')
const exportSource = readFileSync('app/(admin)/admin/launch-readiness/export/page.tsx', 'utf8')

test('launch readiness summary links to the export packet route', () => {
  assert.match(launchReadinessSource, /href="\/admin\/launch-readiness\/export"/)
  assert.match(launchReadinessSource, /Export packet/)
})

test('launch readiness export packet is admin gated and backed by readiness data', () => {
  assert.match(exportSource, /await requireAdmin\(\)/)
  assert.match(exportSource, /await getLaunchReadinessReport\(\)/)
  assert.match(exportSource, /Launch Readiness Export/)
  assert.match(exportSource, /Decision summary/)
  assert.match(exportSource, /Checklist Evidence/)
  assert.match(exportSource, /Pilot Candidates/)
  assert.match(exportSource, /Evidence Log/)
})

test('launch readiness export packet gives admins a closed workflow path', () => {
  assert.match(exportSource, /href="\/admin\/launch-readiness"/)
  assert.match(exportSource, /Back to readiness/)
  assert.match(exportSource, /Open primary action/)
  assert.match(exportSource, /Open evidence/)
})
