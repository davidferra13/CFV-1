import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import test from "node:test"

const ROOT = process.cwd()

test("regression firewall includes the capability registry check by default", async () => {
  const firewall = await readFile(join(ROOT, "scripts", "regression-firewall.mjs"), "utf8")

  assert.match(firewall, /audit:capabilities:check/)
  assert.match(firewall, /skipCapabilities/)
  assert.match(firewall, /if \(!args\.skipCapabilities\)/)
})

test("package exposes a non-writing capability check command", async () => {
  const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"))

  assert.equal(
    packageJson.scripts["audit:capabilities:check"],
    "tsx scripts/audit-capability-registry.ts --check",
  )
})

test("capability check mode guards all generated audit writes", async () => {
  const script = await readFile(join(ROOT, "scripts", "audit-capability-registry.ts"), "utf8")

  const guardIndex = script.indexOf("if (!isCheckMode)")
  const reportWriteIndex = script.indexOf('writeFileSync(join(root, "reports"')
  const markdownWriteIndex = script.indexOf(
    'writeFileSync(join(root, "docs", "audit"',
  )

  assert.ok(guardIndex >= 0, "check-mode write guard must exist")
  assert.ok(reportWriteIndex > guardIndex, "report write must be guarded")
  assert.ok(markdownWriteIndex > guardIndex, "markdown write must be guarded")
  assert.match(script, /const isCheckMode = process\.argv\.includes\("--check"\)/)
})
