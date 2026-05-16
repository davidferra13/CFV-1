export const RELEASE_GATE_STEP_CLASSIFICATION = Object.freeze({
  CONTRACT: 'contract',
  QUALITY: 'quality',
  SMOKE: 'smoke',
})

export const RELEASE_GATE_WARNING_SEVERITY = Object.freeze({
  BLOCK: 'block',
  TRACK: 'track',
  IGNORE: 'ignore',
})

const CONTRACT = RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT
const QUALITY = RELEASE_GATE_STEP_CLASSIFICATION.QUALITY
const SMOKE = RELEASE_GATE_STEP_CLASSIFICATION.SMOKE
const BLOCK = RELEASE_GATE_WARNING_SEVERITY.BLOCK
const TRACK = RELEASE_GATE_WARNING_SEVERITY.TRACK

const WARNING_POLICIES = Object.freeze({
  dynamic_server_usage: {
    code: 'next-build:dynamic-server-usage',
    pattern: /DYNAMIC_SERVER_USAGE/i,
    message: 'Next build emitted dynamic server usage warnings.',
    severity: TRACK,
  },
  next_server_actions_config: {
    code: 'next-config:server-actions-key',
    pattern: /serverActions is an unrecognized key/i,
    message: 'Next config still emits the legacy serverActions key warning.',
    severity: TRACK,
  },
})

const FULL_STEPS = Object.freeze([
  { name: 'verify:secrets', classification: CONTRACT, gateSeverity: BLOCK },
  {
    name: 'audit:completeness:json',
    classification: CONTRACT,
    gateSeverity: BLOCK,
    machineReadable: true,
  },
  {
    name: 'audit:db:contract:json',
    classification: CONTRACT,
    gateSeverity: BLOCK,
    machineReadable: true,
  },
  { name: 'typecheck', classification: CONTRACT, gateSeverity: BLOCK },
  { name: 'lint:strict', classification: QUALITY, gateSeverity: BLOCK },
  { name: 'test:critical', classification: CONTRACT, gateSeverity: BLOCK },
  { name: 'test:unit', classification: QUALITY, gateSeverity: BLOCK },
  {
    name: 'build',
    classification: CONTRACT,
    gateSeverity: BLOCK,
    warningPolicyIds: ['dynamic_server_usage', 'next_server_actions_config'],
  },
  { name: 'test:e2e:smoke:release', classification: SMOKE, gateSeverity: BLOCK },
])

const WEB_BETA_STEPS = Object.freeze([
  { name: 'verify:secrets', classification: CONTRACT, gateSeverity: BLOCK },
  {
    name: 'audit:completeness:json',
    classification: CONTRACT,
    gateSeverity: BLOCK,
    machineReadable: true,
  },
  {
    name: 'audit:db:contract:json',
    classification: CONTRACT,
    gateSeverity: BLOCK,
    machineReadable: true,
  },
  { name: 'typecheck:web-beta', classification: CONTRACT, gateSeverity: BLOCK },
  { name: 'lint:web-beta', classification: QUALITY, gateSeverity: BLOCK },
  { name: 'test:critical', classification: CONTRACT, gateSeverity: BLOCK },
  { name: 'test:unit:web-beta', classification: QUALITY, gateSeverity: BLOCK },
  { name: 'build:web-beta', classification: CONTRACT, gateSeverity: BLOCK },
  { name: 'test:e2e:web-beta:release', classification: SMOKE, gateSeverity: BLOCK },
])

export function getReleaseGateManifest() {
  return {
    contractVersion: 'release-gate-manifest.v1',
    profiles: {
      full: {
        buildSurface: 'app',
        label: 'Full release',
        steps: FULL_STEPS.map((step) => ({ ...step })),
      },
      'web-beta': {
        buildSurface: 'web-beta',
        label: 'Web beta release',
        steps: WEB_BETA_STEPS.map((step) => ({ ...step })),
      },
    },
  }
}

export function evaluateReleaseGateWarnings(output, policyIds = []) {
  const text = String(output ?? '')

  return policyIds
    .map((policyId) => {
      const policy = WARNING_POLICIES[policyId]
      if (!policy) return null
      const matches = text.match(new RegExp(policy.pattern.source, policy.pattern.flags || 'i'))
      if (!matches) return null

      return {
        code: policy.code,
        count: matches.length,
        message: policy.message,
        policyId,
        severity: policy.severity,
      }
    })
    .filter(Boolean)
}

export default {
  RELEASE_GATE_STEP_CLASSIFICATION,
  RELEASE_GATE_WARNING_SEVERITY,
  evaluateReleaseGateWarnings,
  getReleaseGateManifest,
}
