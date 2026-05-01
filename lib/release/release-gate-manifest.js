export const RELEASE_GATE_MANIFEST_VERSION = 'release-gate-manifest.v1'

export const RELEASE_GATE_WARNING_SEVERITY = Object.freeze({
  IGNORE: 'ignore',
  TRACK: 'track',
  BLOCK: 'block',
})

export const RELEASE_GATE_STEP_CLASSIFICATION = Object.freeze({
  POLICY: 'policy',
  CONTRACT: 'contract',
  HEURISTIC: 'heuristic',
  REGRESSION: 'regression',
  STALE_CONTRACT: 'stale_contract',
})

export const RELEASE_GATE_WARNING_POLICIES = Object.freeze({
  dynamic_server_usage: {
    id: 'dynamic_server_usage',
    label: 'Next.js dynamic server usage warnings',
    message:
      'Build emitted Next.js DYNAMIC_SERVER_USAGE warnings. These are tracked release advisories, not silent blockers.',
    matcher: /DYNAMIC_SERVER_USAGE/g,
    severity: RELEASE_GATE_WARNING_SEVERITY.TRACK,
  },
})

export const RELEASE_GATE_MANIFEST = Object.freeze({
  contractVersion: RELEASE_GATE_MANIFEST_VERSION,
  profiles: Object.freeze({
    full: Object.freeze({
      id: 'full',
      label: 'Full application release gate',
      buildSurface: null,
      steps: Object.freeze([
        Object.freeze({
          name: 'verify:secrets',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.POLICY,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'audit:completeness:json',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
          machineReadable: true,
        }),
        Object.freeze({
          name: 'audit:db:contract:json',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
          machineReadable: true,
        }),
        Object.freeze({
          name: 'typecheck',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'lint:strict',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.POLICY,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'test:critical',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.REGRESSION,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'test:unit',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'build',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
          warningPolicyIds: Object.freeze(['dynamic_server_usage']),
        }),
        Object.freeze({
          name: 'test:e2e:smoke:release',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.REGRESSION,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
      ]),
    }),
    'web-beta': Object.freeze({
      id: 'web-beta',
      label: 'Web beta release gate',
      buildSurface: 'web-beta',
      steps: Object.freeze([
        Object.freeze({
          name: 'verify:secrets',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.POLICY,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'audit:completeness:json',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
          machineReadable: true,
        }),
        Object.freeze({
          name: 'audit:db:contract:json',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
          machineReadable: true,
        }),
        Object.freeze({
          name: 'typecheck:web-beta',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'lint:web-beta',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.POLICY,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'test:critical',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.REGRESSION,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'test:unit:web-beta',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
        Object.freeze({
          name: 'build:web-beta',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.CONTRACT,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
          warningPolicyIds: Object.freeze(['dynamic_server_usage']),
        }),
        Object.freeze({
          name: 'test:e2e:web-beta:release',
          classification: RELEASE_GATE_STEP_CLASSIFICATION.REGRESSION,
          gateSeverity: RELEASE_GATE_WARNING_SEVERITY.BLOCK,
        }),
      ]),
    }),
  }),
})

export function getReleaseGateManifest() {
  return RELEASE_GATE_MANIFEST
}

export function getReleaseGateProfile(profileId) {
  if (!profileId) return null
  return RELEASE_GATE_MANIFEST.profiles[profileId] ?? null
}

export function getReleaseGateStepManifest(profileId, stepName) {
  const profile = getReleaseGateProfile(profileId)
  if (!profile) return null
  return profile.steps.find((step) => step.name === stepName) ?? null
}

export function getReleaseGateWarningPolicy(policyId) {
  if (!policyId) return null
  return RELEASE_GATE_WARNING_POLICIES[policyId] ?? null
}

function toGlobalMatcher(matcher) {
  if (!matcher.global) {
    return new RegExp(matcher.source, `${matcher.flags}g`)
  }

  return new RegExp(matcher.source, matcher.flags)
}

export function evaluateReleaseGateWarnings(output, policyIds = []) {
  const findings = []
  const text = typeof output === 'string' ? output : ''

  for (const policyId of policyIds) {
    const policy = getReleaseGateWarningPolicy(policyId)
    if (!policy || !text) continue

    const matches = [...text.matchAll(toGlobalMatcher(policy.matcher))]
    if (matches.length === 0) continue

    findings.push({
      code: `warning-policy:${policy.id}`,
      count: matches.length,
      message: policy.message,
      policyId: policy.id,
      severity: policy.severity,
    })
  }

  return findings
}
