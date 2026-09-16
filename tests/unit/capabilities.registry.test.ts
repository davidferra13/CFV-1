import assert from "node:assert/strict"
import test from "node:test"

import {
  CHEFFLOW_CAPABILITY_REGISTRY,
  CHEFFLOW_OPERATION_TYPES,
  CHEFFLOW_SHELL_AREAS,
  CHEFFLOW_STRATEGIES,
  getCapabilityAuditSummary,
  isCapabilityGap,
  validateCapabilityRegistry,
  type ChefFlowCapability,
} from "@/lib/capabilities"

test("registry entries have unique IDs and required fields", () => {
  const ids = CHEFFLOW_CAPABILITY_REGISTRY.map((entry) => entry.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const entry of CHEFFLOW_CAPABILITY_REGISTRY) {
    assert.ok(entry.id.trim())
    assert.ok(entry.capability.trim())
    assert.ok(entry.jobToBeDone.trim())
    assert.ok(entry.chefPersonas.length > 0)
    assert.ok(entry.operationTypes.length > 0)
    assert.ok(entry.existingMarketLeaders.length > 0)
    assert.ok(entry.bestFeatures.length > 0)
    assert.ok(entry.painPoints.length > 0)
    assert.ok(entry.chefFlowImplementation.trim())
    assert.ok(entry.researchAsOf.match(/^\d{4}-\d{2}-\d{2}$/))
  }
})

test("registry covers every universal shell area", () => {
  const covered = new Set(CHEFFLOW_CAPABILITY_REGISTRY.map((entry) => entry.shell))
  assert.deepEqual([...CHEFFLOW_SHELL_AREAS].sort(), [...covered].sort())
})

test("registry covers every canonical operation type", () => {
  const covered = new Set(CHEFFLOW_CAPABILITY_REGISTRY.flatMap((entry) => entry.operationTypes))
  for (const operationType of CHEFFLOW_OPERATION_TYPES) assert.ok(covered.has(operationType), operationType)
})

test("strategy values and launch-only debt are valid", () => {
  const allowed = new Set(CHEFFLOW_STRATEGIES)
  for (const entry of CHEFFLOW_CAPABILITY_REGISTRY) {
    assert.ok(allowed.has(entry.strategy))
    if (entry.strategy === "LAUNCH_ONLY") {
      assert.equal(entry.productDebt, true)
      assert.ok(entry.externalInteractionRemaining.trim().length > 0)
    }
  }
})

test("north-star audit reports no structural validation errors", () => {
  assert.deepEqual(validateCapabilityRegistry(CHEFFLOW_CAPABILITY_REGISTRY), [])
  const summary = getCapabilityAuditSummary(CHEFFLOW_CAPABILITY_REGISTRY)
  assert.equal(summary.total, CHEFFLOW_CAPABILITY_REGISTRY.length)
  assert.equal(summary.byShell.size, CHEFFLOW_SHELL_AREAS.length)
  assert.ok(summary.gaps.length > 0)
})

test("isCapabilityGap follows stack-elimination semantics", () => {
  const base = CHEFFLOW_CAPABILITY_REGISTRY[0] as ChefFlowCapability
  assert.equal(isCapabilityGap({ ...base, strategy: "LAUNCH_ONLY", productDebt: true, externalInteractionRemaining: "Open external payroll system" }), true)
  assert.equal(isCapabilityGap({ ...base, strategy: "INTEGRATE", buildStatus: "PARTIAL", testStatus: "PARTIAL", externalInteractionRemaining: "" }), true)
  assert.equal(isCapabilityGap({ ...base, strategy: "OWN", buildStatus: "VERIFIED", testStatus: "VERIFIED", externalInteractionRemaining: "", productDebt: false }), false)
  assert.equal(isCapabilityGap({ ...base, strategy: "AGGREGATE", buildStatus: "VERIFIED", testStatus: "VERIFIED", externalInteractionRemaining: "", productDebt: false }), false)
})

test("every shell has enough depth to represent real jobs, not a navigation stub", () => {
  const summary = getCapabilityAuditSummary(CHEFFLOW_CAPABILITY_REGISTRY)
  for (const shell of CHEFFLOW_SHELL_AREAS) {
    assert.ok((summary.byShell.get(shell)?.length ?? 0) >= 4, `${shell} needs at least four capability jobs`)
  }
})

test("registry explicitly covers stack categories that commonly force app switching", () => {
  const requiredIds = [
    "orders-pos", "orders-delivery", "schedule-staff", "team-context-chat",
    "recipes-costing", "inventory-counts", "purchasing-vendor-ordering",
    "receiving-match", "safety-haccp", "orders-reservations",
    "clients-unified-profile", "events-catering-system", "payments-accept",
    "employees-payroll", "financials-accounting", "documents-records",
    "analytics-prime-cost", "tasks-maintenance", "clients-marketing",
    "recipes-nutrition", "employees-training",
  ]
  const ids = new Set(CHEFFLOW_CAPABILITY_REGISTRY.map((entry) => entry.id))
  for (const id of requiredIds) assert.ok(ids.has(id), `missing canonical capability: ${id}`)
})
