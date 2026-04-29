export type BuildCapabilityPriority = 'high' | 'medium' | 'low'

export interface BuildCapabilityDefinition {
  id: string
  title: string
  category: string
  priority: BuildCapabilityPriority
  source: string
  confidence: string
  queuePath: string
  affectedFiles: readonly string[]
  searchHints: readonly string[]
  firstPassScope: string
}

export interface BuildCapabilityCoverageSummary {
  total: number
  categories: readonly string[]
  priorityCounts: Record<BuildCapabilityPriority, number>
  withAffectedFiles: number
  missingAffectedFiles: number
  sources: readonly string[]
}

const FIRST_PASS_SCOPE =
  'First-pass build registry entry. This records the requested capability, source, queue path, search hints, and affected-file scope without changing runtime business logic.'

export const BUILD_CAPABILITY_REGISTRY: readonly BuildCapabilityDefinition[] = [
  {
    id: '001-high-asset-inventory-tracking',
    title: 'Asset/Inventory Tracking:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Amelia Knox',
    confidence: 'medium',
    queuePath: 'system/build-queue/001-high-asset-inventory-tracking.md',
    affectedFiles: [
      'lib/aar/feedback-actions.ts',
      'lib/activity/breadcrumb-types.ts',
      'lib/activity/chef-types.ts',
    ],
    searchHints: [
      'assetinventory.tracking',
      'assetinventory',
      'tracking',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '002-high-build-daily-operational-checklist',
    title: 'Build "Daily Operational Checklist":',
    category: 'uncategorized',
    priority: 'high',
    source: 'Aaron Sanchez',
    confidence: 'medium',
    queuePath: 'system/build-queue/002-high-build-daily-operational-checklist.md',
    affectedFiles: [
      'lib/ai/remy-actions.ts',
      'lib/daily-ops/actions.ts',
      'lib/daily-ops/plan-engine.ts',
    ],
    searchHints: [
      'build.daily',
      'daily.operational',
      'operational.checklist',
      'build',
      'daily',
      'operational',
      'checklist',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '003-high-centralized-operations-view',
    title: 'Centralized Operations View:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Noah Kessler',
    confidence: 'medium',
    queuePath: 'system/build-queue/003-high-centralized-operations-view.md',
    affectedFiles: [
      'lib/auth/password-policy.ts',
      'lib/auth/route-policy.ts',
      'lib/billing/feature-classification.ts',
    ],
    searchHints: [
      'centralized.operations',
      'operations.view',
      'centralized',
      'operations',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '004-high-curator-expert-layer',
    title: 'Curator/Expert Layer:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Phil Rosenthal',
    confidence: 'medium',
    queuePath: 'system/build-queue/004-high-curator-expert-layer.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'curatorexpert',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '005-high-deep-relationship-mapping',
    title: 'Deep Relationship Mapping:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Marcus Vellaro',
    confidence: 'medium',
    queuePath: 'system/build-queue/005-high-deep-relationship-mapping.md',
    affectedFiles: [
      'lib/action-graph/bookings.ts',
      'lib/activity/chef-types.ts',
      'lib/activity/resume.ts',
    ],
    searchHints: [
      'deep.relationship',
      'relationship.mapping',
      'relationship',
      'mapping',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '006-high-develop-stalled-task-alert',
    title: 'Develop "Stalled Task Alert":',
    category: 'uncategorized',
    priority: 'high',
    source: 'Evan Morales',
    confidence: 'high',
    queuePath: 'system/build-queue/006-high-develop-stalled-task-alert.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'develop.stalled',
      'stalled.task',
      'task.alert',
      'develop',
      'stalled',
      'alert',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '007-high-develop-a-tasting-profile-matrix',
    title: 'Develop a "Tasting Profile Matrix":',
    category: 'uncategorized',
    priority: 'high',
    source: 'Julien Marchand',
    confidence: 'high',
    queuePath: 'system/build-queue/007-high-develop-a-tasting-profile-matrix.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'develop.tasting',
      'tasting.profile',
      'profile.matrix',
      'develop',
      'tasting',
      'profile',
      'matrix',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '008-high-hyper-flexibility',
    title: 'Hyper-Flexibility:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Dan Barber',
    confidence: 'medium',
    queuePath: 'system/build-queue/008-high-hyper-flexibility.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'hyper-flexibility',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '009-high-hyper-flexible-inventory',
    title: 'Hyper-Flexible Inventory:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Elias Vance',
    confidence: 'medium',
    queuePath: 'system/build-queue/009-high-hyper-flexible-inventory.md',
    affectedFiles: [
      'lib/ai/carry-forward-match.ts',
      'lib/ai/command-intent-parser.ts',
      'lib/ai/command-orchestrator.ts',
    ],
    searchHints: [
      'hyper-flexible.inventory',
      'hyper-flexible',
      'inventory',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '010-high-hyper-granular-task-management',
    title: 'Hyper-Granular Task Management:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Amelia Knox',
    confidence: 'high',
    queuePath: 'system/build-queue/010-high-hyper-granular-task-management.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'hyper-granular.task',
      'task.management',
      'hyper-granular',
      'management',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '011-high-hyper-personalization',
    title: 'Hyper-Personalization:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Charli Damelio',
    confidence: 'medium',
    queuePath: 'system/build-queue/011-high-hyper-personalization.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'hyper-personalization',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '012-high-implement-safety-protocol-mode',
    title: 'Implement "Safety Protocol Mode":',
    category: 'uncategorized',
    priority: 'high',
    source: 'Aiden Clarke',
    confidence: 'medium',
    queuePath: 'system/build-queue/012-high-implement-safety-protocol-mode.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.safety',
      'safety.protocol',
      'implement',
      'safety',
      'protocol',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '013-high-introduce-contrast-scoring',
    title: 'Introduce "Contrast Scoring":',
    category: 'uncategorized',
    priority: 'high',
    source: 'Julien Marchand',
    confidence: 'medium',
    queuePath: 'system/build-queue/013-high-introduce-contrast-scoring.md',
    affectedFiles: [
      'lib/ai/remy-survey-prompt.ts',
      'lib/auth/invitations.ts',
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'introduce.contrast',
      'contrast.scoring',
      'introduce',
      'contrast',
      'scoring',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '014-high-lack-of-context',
    title: 'Lack of Context:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Rafael Ionescu 2',
    confidence: 'medium',
    queuePath: 'system/build-queue/014-high-lack-of-context.md',
    affectedFiles: [
      'lib/aar/actions.ts',
      'lib/aar/feedback-actions.ts',
      'lib/activity/actions.ts',
    ],
    searchHints: [
      'context',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '015-high-lack-of-depth',
    title: 'Lack of Depth:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Eleanor Vance',
    confidence: 'medium',
    queuePath: 'system/build-queue/015-high-lack-of-depth.md',
    affectedFiles: [
      'lib/ai/ace-ollama.ts',
      'lib/ai/agent-brain.ts',
      'lib/ai/correspondence.ts',
    ],
    searchHints: [
      'depth',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '016-high-lack-of-ownership',
    title: 'Lack of Ownership:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Emma Chamberlain',
    confidence: 'medium',
    queuePath: 'system/build-queue/016-high-lack-of-ownership.md',
    affectedFiles: [
      'lib/ai/agent-actions/intake-actions.ts',
      'lib/ai/parse-brain-dump.ts',
      'lib/ai/remy-artifact-actions.ts',
    ],
    searchHints: [
      'ownership',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '017-high-over-automation',
    title: 'Over-Automation:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Jacques Pepin',
    confidence: 'medium',
    queuePath: 'system/build-queue/017-high-over-automation.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'over-automation',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '018-high-simplicity-for-daily-use',
    title: 'Simplicity for Daily Use:',
    category: 'uncategorized',
    priority: 'high',
    source: 'Luca Moretti',
    confidence: 'medium',
    queuePath: 'system/build-queue/018-high-simplicity-for-daily-use.md',
    affectedFiles: [
      'lib/chef-decision-engine/engine.ts',
      'lib/chef-decision-engine/types.ts',
      'lib/clients/client-profile-service.ts',
    ],
    searchHints: [
      'simplicity.daily',
      'daily.use',
      'simplicity',
      'daily',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '019-medium-beta-test-with-the-integrator',
    title: 'Beta Test with "The Integrator":',
    category: 'uncategorized',
    priority: 'medium',
    source: 'Rafael Ionescu',
    confidence: 'medium',
    queuePath: 'system/build-queue/019-medium-beta-test-with-the-integrator.md',
    affectedFiles: [
      'lib/beta/onboarding-actions.ts',
      'lib/db/migrations/schema.ts',
      'lib/db/schema/schema.ts',
    ],
    searchHints: [
      'beta.test',
      'test.integrator',
      'integrator',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '020-medium-efficiency-over-integration',
    title: 'Efficiency over Integration:',
    category: 'uncategorized',
    priority: 'medium',
    source: 'Adrian Solis',
    confidence: 'medium',
    queuePath: 'system/build-queue/020-medium-efficiency-over-integration.md',
    affectedFiles: [
      'lib/ai/remy-actions.ts',
      'lib/analytics/insights-actions.ts',
      'lib/intelligence/geographic-hotspots.ts',
    ],
    searchHints: [
      'efficiency.over',
      'over.integration',
      'efficiency',
      'integration',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '021-medium-introduce-knowledge-gap-flagging',
    title: 'Introduce "Knowledge Gap Flagging":',
    category: 'uncategorized',
    priority: 'medium',
    source: 'Noah Bennett 2',
    confidence: 'high',
    queuePath: 'system/build-queue/021-medium-introduce-knowledge-gap-flagging.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'introduce.knowledge',
      'knowledge.gap',
      'gap.flagging',
      'introduce',
      'knowledge',
      'flagging',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '022-low-need-to-know-basis',
    title: '"Need-to-Know" Basis:',
    category: 'uncategorized',
    priority: 'low',
    source: 'Caleb Arman',
    confidence: 'medium',
    queuePath: 'system/build-queue/022-low-need-to-know-basis.md',
    affectedFiles: [
      'lib/commerce/tax-policy.ts',
      'lib/db/migrations/schema.ts',
      'lib/db/schema/schema.ts',
    ],
    searchHints: [
      'need-to-know.basis',
      'need-to-know',
      'basis',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '023-low-bureaucracy-slowness',
    title: 'Bureaucracy/Slowness:',
    category: 'uncategorized',
    priority: 'low',
    source: 'Evan Carter',
    confidence: 'high',
    queuePath: 'system/build-queue/023-low-bureaucracy-slowness.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'bureaucracyslowness',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '024-low-implement-relationship-scoring',
    title: 'Implement "Relationship Scoring":',
    category: 'uncategorized',
    priority: 'low',
    source: 'Marcus Vellaro',
    confidence: 'medium',
    queuePath: 'system/build-queue/024-low-implement-relationship-scoring.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.relationship',
      'relationship.scoring',
      'implement',
      'relationship',
      'scoring',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '025-low-implement-source-citation',
    title: 'Implement "Source Citation":',
    category: 'uncategorized',
    priority: 'low',
    source: 'Adrian Kline',
    confidence: 'medium',
    queuePath: 'system/build-queue/025-low-implement-source-citation.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.source',
      'source.citation',
      'implement',
      'source',
      'citation',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '026-low-instant-vetted-pool',
    title: 'Instant Vetted Pool:',
    category: 'uncategorized',
    priority: 'low',
    source: 'Aaron Deluca',
    confidence: 'medium',
    queuePath: 'system/build-queue/026-low-instant-vetted-pool.md',
    affectedFiles: [
      'lib/admin/activity-feed.ts',
      'lib/ai/business-insights.ts',
      'lib/ai/command-intent-parser.ts',
    ],
    searchHints: [
      'instant.vetted',
      'vetted.pool',
      'instant',
      'vetted',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '027-low-over-complication',
    title: 'Over-Complication:',
    category: 'uncategorized',
    priority: 'low',
    source: 'Mateo Kova',
    confidence: 'high',
    queuePath: 'system/build-queue/027-low-over-complication.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'over-complication',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '028-low-over-integration',
    title: 'Over-Integration:',
    category: 'uncategorized',
    priority: 'low',
    source: 'Adrian Solis',
    confidence: 'high',
    queuePath: 'system/build-queue/028-low-over-integration.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'over-integration',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '029-low-synthesis-summarization',
    title: 'Synthesis/Summarization',
    category: 'uncategorized',
    priority: 'low',
    source: 'Evan Morales',
    confidence: 'high',
    queuePath: 'system/build-queue/029-low-synthesis-summarization.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'synthesissummarization',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '030-medium-expert-network-integration',
    title: '"Expert Network Integration":',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Andrew Zimmern',
    confidence: 'medium',
    queuePath: 'system/build-queue/030-medium-expert-network-integration.md',
    affectedFiles: [
      'lib/ai/allergen-risk.ts',
      'lib/ai/chef-bio.ts',
      'lib/ai/recipe-scaling.ts',
    ],
    searchHints: [
      'expert.network',
      'network.integration',
      'expert',
      'network',
      'integration',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '031-medium-billing-tracking',
    title: 'Billing/Tracking:',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Aaron Vale',
    confidence: 'high',
    queuePath: 'system/build-queue/031-medium-billing-tracking.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'billingtracking',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '032-medium-cross-functional-visibility',
    title: 'Cross-Functional Visibility:',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Alice',
    confidence: 'medium',
    queuePath: 'system/build-queue/032-medium-cross-functional-visibility.md',
    affectedFiles: [
      'lib/actions/admin-abuse-summary.ts',
      'lib/admin/owner-moderation-actions.ts',
      'lib/admin/owner-observability.ts',
    ],
    searchHints: [
      'cross-functional.visibility',
      'cross-functional',
      'visibility',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '033-medium-financial-billing',
    title: 'Financial/Billing',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Shawn Carter',
    confidence: 'medium',
    queuePath: 'system/build-queue/033-medium-financial-billing.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'financialbilling',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '034-medium-implement-bilingual-draft-mode',
    title: 'Implement "Bilingual Draft Mode":',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Jisoo Han',
    confidence: 'medium',
    queuePath: 'system/build-queue/034-medium-implement-bilingual-draft-mode.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.bilingual',
      'bilingual.draft',
      'implement',
      'bilingual',
      'draft',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '035-medium-implement-constraint-layering',
    title: 'Implement "Constraint Layering":',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Anika Rao',
    confidence: 'medium',
    queuePath: 'system/build-queue/035-medium-implement-constraint-layering.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.constraint',
      'constraint.layering',
      'implement',
      'constraint',
      'layering',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '036-medium-lack-of-visibility',
    title: 'Lack of Visibility:',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Lidia Bastianich',
    confidence: 'medium',
    queuePath: 'system/build-queue/036-medium-lack-of-visibility.md',
    affectedFiles: [
      'lib/actions/admin-abuse-summary.ts',
      'lib/admin/owner-moderation-actions.ts',
      'lib/admin/owner-observability.ts',
    ],
    searchHints: [
      'visibility',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '037-medium-proof-documentation',
    title: 'Proof/Documentation:',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Amelia Knox',
    confidence: 'high',
    queuePath: 'system/build-queue/037-medium-proof-documentation.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'proofdocumentation',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '038-medium-real-time-visibility',
    title: 'Real-Time Visibility:',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Elias Vantrell',
    confidence: 'medium',
    queuePath: 'system/build-queue/038-medium-real-time-visibility.md',
    affectedFiles: [
      'lib/actions/admin-abuse-summary.ts',
      'lib/admin/owner-moderation-actions.ts',
      'lib/admin/owner-observability.ts',
    ],
    searchHints: [
      'visibility',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '039-medium-storytelling-reporting',
    title: 'Storytelling/Reporting:',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Drew Nieporent',
    confidence: 'medium',
    queuePath: 'system/build-queue/039-medium-storytelling-reporting.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'storytellingreporting',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '040-medium-third-party-integration-risk',
    title: 'Third-Party Integration Risk:',
    category: 'payment-financial',
    priority: 'medium',
    source: 'Caleb Arman',
    confidence: 'medium',
    queuePath: 'system/build-queue/040-medium-third-party-integration-risk.md',
    affectedFiles: [
      'lib/ai/privacy-narrative.ts',
      'lib/analytics/source-provenance.ts',
      'lib/cannabis/host-agreement.ts',
    ],
    searchHints: [
      'third-party.integration',
      'integration.risk',
      'third-party',
      'integration',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '041-low-implement-cost-centers',
    title: 'Implement Cost Centers:',
    category: 'payment-financial',
    priority: 'low',
    source: 'Luca Moretti',
    confidence: 'medium',
    queuePath: 'system/build-queue/041-low-implement-cost-centers.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.cost',
      'cost.centers',
      'implement',
      'centers',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '042-medium-expert-network-integration',
    title: '"Expert Network Integration":',
    category: 'communication',
    priority: 'medium',
    source: 'Andrew Zimmern',
    confidence: 'medium',
    queuePath: 'system/build-queue/042-medium-expert-network-integration.md',
    affectedFiles: [
      'lib/ai/allergen-risk.ts',
      'lib/ai/chef-bio.ts',
      'lib/ai/recipe-scaling.ts',
    ],
    searchHints: [
      'expert.network',
      'network.integration',
      'expert',
      'network',
      'integration',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '043-medium-cross-functional-visibility',
    title: 'Cross-Functional Visibility:',
    category: 'communication',
    priority: 'medium',
    source: 'Alice',
    confidence: 'medium',
    queuePath: 'system/build-queue/043-medium-cross-functional-visibility.md',
    affectedFiles: [
      'lib/actions/admin-abuse-summary.ts',
      'lib/admin/owner-moderation-actions.ts',
      'lib/admin/owner-observability.ts',
    ],
    searchHints: [
      'cross-functional.visibility',
      'cross-functional',
      'visibility',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '044-medium-implement-bilingual-draft-mode',
    title: 'Implement "Bilingual Draft Mode":',
    category: 'communication',
    priority: 'medium',
    source: 'Jisoo Han',
    confidence: 'medium',
    queuePath: 'system/build-queue/044-medium-implement-bilingual-draft-mode.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.bilingual',
      'bilingual.draft',
      'implement',
      'bilingual',
      'draft',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '045-medium-implement-constraint-layering',
    title: 'Implement "Constraint Layering":',
    category: 'communication',
    priority: 'medium',
    source: 'Anika Rao',
    confidence: 'medium',
    queuePath: 'system/build-queue/045-medium-implement-constraint-layering.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.constraint',
      'constraint.layering',
      'implement',
      'constraint',
      'layering',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '046-medium-lack-of-visibility',
    title: 'Lack of Visibility:',
    category: 'communication',
    priority: 'medium',
    source: 'Lidia Bastianich',
    confidence: 'medium',
    queuePath: 'system/build-queue/046-medium-lack-of-visibility.md',
    affectedFiles: [
      'lib/actions/admin-abuse-summary.ts',
      'lib/admin/owner-moderation-actions.ts',
      'lib/admin/owner-observability.ts',
    ],
    searchHints: [
      'visibility',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '047-medium-proof-documentation',
    title: 'Proof/Documentation:',
    category: 'communication',
    priority: 'medium',
    source: 'Amelia Knox',
    confidence: 'high',
    queuePath: 'system/build-queue/047-medium-proof-documentation.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'proofdocumentation',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '048-medium-storytelling-reporting',
    title: 'Storytelling/Reporting:',
    category: 'communication',
    priority: 'medium',
    source: 'Drew Nieporent',
    confidence: 'medium',
    queuePath: 'system/build-queue/048-medium-storytelling-reporting.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'storytellingreporting',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '049-medium-third-party-integration-risk',
    title: 'Third-Party Integration Risk:',
    category: 'communication',
    priority: 'medium',
    source: 'Caleb Arman',
    confidence: 'medium',
    queuePath: 'system/build-queue/049-medium-third-party-integration-risk.md',
    affectedFiles: [
      'lib/ai/privacy-narrative.ts',
      'lib/analytics/source-provenance.ts',
      'lib/cannabis/host-agreement.ts',
    ],
    searchHints: [
      'third-party.integration',
      'integration.risk',
      'third-party',
      'integration',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '050-low-stop-managing-emails-start-managing-masterpieces',
    title: '"Stop managing emails, start managing masterpieces."',
    category: 'communication',
    priority: 'low',
    source: 'Rafael Dorne',
    confidence: 'high',
    queuePath: 'system/build-queue/050-low-stop-managing-emails-start-managing-masterpieces.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'stop.managing',
      'managing.emails',
      'emails.start',
      'start.managing',
      'managing.masterpieces',
      'managing',
      'emails',
      'start',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '051-medium-vendor-supplier-integration',
    title: 'Vendor/Supplier Integration:',
    category: 'sourcing-supply',
    priority: 'medium',
    source: 'Landon Pierce',
    confidence: 'medium',
    queuePath: 'system/build-queue/051-medium-vendor-supplier-integration.md',
    affectedFiles: [
      'lib/admin/hub-admin-actions.ts',
      'lib/ai/import-take-a-chef-action.ts',
      'lib/ai/remy-actions.ts',
    ],
    searchHints: [
      'vendorsupplier.integration',
      'vendorsupplier',
      'integration',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '052-medium-advanced-ingredient-linking',
    title: 'Advanced Ingredient Linking:',
    category: 'recipe-menu',
    priority: 'medium',
    source: 'Julien Marchand',
    confidence: 'medium',
    queuePath: 'system/build-queue/052-medium-advanced-ingredient-linking.md',
    affectedFiles: [
      'lib/activity/entity-timeline.ts',
      'lib/analytics/custom-report-enhanced-actions.ts',
      'lib/billing/feature-classification.ts',
    ],
    searchHints: [
      'advanced.ingredient',
      'ingredient.linking',
      'advanced',
      'ingredient',
      'linking',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '053-high-booking-inventory',
    title: 'Booking/Inventory:',
    category: 'scheduling-calendar',
    priority: 'high',
    source: 'Charlotte Vance',
    confidence: 'medium',
    queuePath: 'system/build-queue/053-high-booking-inventory.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'bookinginventory',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '054-high-real-time-communication',
    title: 'Real-Time Communication:',
    category: 'scheduling-calendar',
    priority: 'high',
    source: 'Hailey Bieber',
    confidence: 'medium',
    queuePath: 'system/build-queue/054-high-real-time-communication.md',
    affectedFiles: [
      'lib/activity/chef-types.ts',
      'lib/ai/agent-actions/inquiry-response-actions.ts',
      'lib/ai/agent-actions/restricted-actions.ts',
    ],
    searchHints: [
      'communication',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '055-high-real-time-coordination',
    title: 'Real-Time Coordination:',
    category: 'scheduling-calendar',
    priority: 'high',
    source: 'Padma Lakshmi',
    confidence: 'medium',
    queuePath: 'system/build-queue/055-high-real-time-coordination.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
      'lib/calling/twilio-actions.ts',
      'lib/calling/voice-helpers.ts',
    ],
    searchHints: [
      'coordination',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '056-medium-real-time-visibility',
    title: 'Real-Time Visibility:',
    category: 'scheduling-calendar',
    priority: 'medium',
    source: 'Alec',
    confidence: 'medium',
    queuePath: 'system/build-queue/056-medium-real-time-visibility.md',
    affectedFiles: [
      'lib/actions/admin-abuse-summary.ts',
      'lib/admin/owner-moderation-actions.ts',
      'lib/admin/owner-observability.ts',
    ],
    searchHints: [
      'visibility',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '057-low-gantt-timeline-view',
    title: 'Gantt/Timeline View:',
    category: 'scheduling-calendar',
    priority: 'low',
    source: 'Landon Pierce 2',
    confidence: 'high',
    queuePath: 'system/build-queue/057-low-gantt-timeline-view.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'gantttimeline.view',
      'gantttimeline',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '058-low-universal-inbox-timeline',
    title: 'Universal Inbox/Timeline:',
    category: 'scheduling-calendar',
    priority: 'low',
    source: 'Rafael Ionescu 2',
    confidence: 'medium',
    queuePath: 'system/build-queue/058-low-universal-inbox-timeline.md',
    affectedFiles: [
      'lib/archetypes/presets.ts',
      'lib/billing/feature-classification.ts',
      'lib/billing/require-pro.ts',
    ],
    searchHints: [
      'universal.inboxtimeline',
      'universal',
      'inboxtimeline',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '059-medium-data-ownership-exit-strategy',
    title: 'Data Ownership & Exit Strategy:',
    category: 'reporting-analytics',
    priority: 'medium',
    source: 'Caleb Arman',
    confidence: 'high',
    queuePath: 'system/build-queue/059-medium-data-ownership-exit-strategy.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'data.ownership',
      'ownership.exit',
      'exit.strategy',
      'ownership',
      'strategy',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '060-medium-storytelling-reporting',
    title: 'Storytelling/Reporting:',
    category: 'reporting-analytics',
    priority: 'medium',
    source: 'Drew Nieporent',
    confidence: 'medium',
    queuePath: 'system/build-queue/060-medium-storytelling-reporting.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'storytellingreporting',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '061-high-deep-integration-audit',
    title: 'Deep Integration Audit:',
    category: 'compliance-legal',
    priority: 'high',
    source: 'Rafael Ionescu',
    confidence: 'medium',
    queuePath: 'system/build-queue/061-high-deep-integration-audit.md',
    affectedFiles: [
      'lib/admin/hub-admin-actions.ts',
      'lib/ai/import-take-a-chef-action.ts',
      'lib/ai/remy-actions.ts',
    ],
    searchHints: [
      'deep.integration',
      'integration.audit',
      'integration',
      'audit',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '062-medium-proof-documentation',
    title: 'Proof/Documentation:',
    category: 'compliance-legal',
    priority: 'medium',
    source: 'Amelia Knox',
    confidence: 'high',
    queuePath: 'system/build-queue/062-medium-proof-documentation.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'proofdocumentation',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '063-low-enhance-audit-logging',
    title: 'Enhance Audit Logging:',
    category: 'compliance-legal',
    priority: 'low',
    source: 'Anika Rao',
    confidence: 'medium',
    queuePath: 'system/build-queue/063-low-enhance-audit-logging.md',
    affectedFiles: [
      'lib/ai/allergen-risk.ts',
      'lib/ai/carry-forward-match.ts',
      'lib/ai/contract-generator.ts',
    ],
    searchHints: [
      'enhance.audit',
      'audit.logging',
      'enhance',
      'audit',
      'logging',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '064-medium-proof-documentation',
    title: 'Proof/Documentation:',
    category: 'documentation-records',
    priority: 'medium',
    source: 'Amelia Knox',
    confidence: 'high',
    queuePath: 'system/build-queue/064-medium-proof-documentation.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'proofdocumentation',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '065-low-enhance-audit-logging',
    title: 'Enhance Audit Logging:',
    category: 'documentation-records',
    priority: 'low',
    source: 'Anika Rao',
    confidence: 'medium',
    queuePath: 'system/build-queue/065-low-enhance-audit-logging.md',
    affectedFiles: [
      'lib/ai/allergen-risk.ts',
      'lib/ai/carry-forward-match.ts',
      'lib/ai/contract-generator.ts',
    ],
    searchHints: [
      'enhance.audit',
      'audit.logging',
      'enhance',
      'audit',
      'logging',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '066-low-glossary-terminology-bank',
    title: 'Glossary/Terminology Bank:',
    category: 'documentation-records',
    priority: 'low',
    source: 'Jisoo Han',
    confidence: 'high',
    queuePath: 'system/build-queue/066-low-glossary-terminology-bank.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'glossaryterminology.bank',
      'glossaryterminology',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '067-medium-implement-constraint-layering',
    title: 'Implement "Constraint Layering":',
    category: 'dietary-medical',
    priority: 'medium',
    source: 'Anika Rao',
    confidence: 'medium',
    queuePath: 'system/build-queue/067-medium-implement-constraint-layering.md',
    affectedFiles: [
      'lib/ai/browser/chrome-ai-adapter.ts',
      'lib/ai/browser/ollama-adapter.ts',
      'lib/ai/browser/webllm-adapter.ts',
    ],
    searchHints: [
      'implement.constraint',
      'constraint.layering',
      'implement',
      'constraint',
      'layering',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '068-high-develop-mobile-site-profile',
    title: 'Develop "Mobile Site Profile":',
    category: 'location-venue',
    priority: 'high',
    source: 'Aaron Sanchez',
    confidence: 'high',
    queuePath: 'system/build-queue/068-high-develop-mobile-site-profile.md',
    affectedFiles: [
      'Unknown until codebase validation runs',
    ],
    searchHints: [
      'develop.mobile',
      'mobile.site',
      'site.profile',
      'develop',
      'mobile',
      'profile',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  },
  {
    id: '069-high-curation-vetting',
    title: 'Curation/Vetting:',
    category: 'audience-community',
    priority: 'high',
    source: 'Sarah Chen',
    confidence: 'medium',
    queuePath: 'system/build-queue/069-high-curation-vetting.md',
    affectedFiles: [
      'lib/build-queue/capability-registry.ts',
    ],
    searchHints: [
      'curationvetting',
    ],
    firstPassScope: FIRST_PASS_SCOPE,
  }
]

export function listBuildCapabilities(): readonly BuildCapabilityDefinition[] {
  return BUILD_CAPABILITY_REGISTRY
}

export function getBuildCapability(id: string): BuildCapabilityDefinition | null {
  return BUILD_CAPABILITY_REGISTRY.find((item) => item.id === id) ?? null
}

export function findBuildCapabilitiesByCategory(
  category: string
): readonly BuildCapabilityDefinition[] {
  return BUILD_CAPABILITY_REGISTRY.filter((item) => item.category === category)
}

export function findBuildCapabilitiesByQuery(
  query: string,
  limit = 12
): readonly BuildCapabilityDefinition[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)

  if (!tokens.length) return []

  return BUILD_CAPABILITY_REGISTRY.map((item) => {
    const haystack = [
      item.id,
      item.title,
      item.category,
      item.source,
      item.confidence,
      item.affectedFiles.join(' '),
      item.searchHints.join(' '),
    ]
      .join(' ')
      .toLowerCase()
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0)
    return { item, score }
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((entry) => entry.item)
}

export function getBuildCapabilityCoverageSummary(
  definitions: readonly BuildCapabilityDefinition[] = BUILD_CAPABILITY_REGISTRY
): BuildCapabilityCoverageSummary {
  const priorityCounts: Record<BuildCapabilityPriority, number> = { high: 0, medium: 0, low: 0 }
  const categories = new Set<string>()
  const sources = new Set<string>()
  let withAffectedFiles = 0

  for (const item of definitions) {
    priorityCounts[item.priority] += 1
    categories.add(item.category)
    sources.add(item.source)
    if (item.affectedFiles.length > 0) withAffectedFiles += 1
  }

  return {
    total: definitions.length,
    categories: Array.from(categories).sort(),
    priorityCounts,
    withAffectedFiles,
    missingAffectedFiles: definitions.length - withAffectedFiles,
    sources: Array.from(sources).sort(),
  }
}
