'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { HACCPSectionCard } from './haccp-section-card'
import { markHACCPReviewed, resetHACCPPlan } from '@/lib/haccp/actions'
import type {
  HACCPPlanData,
  CriticalControlPoint,
  ProcessStep,
  PrerequisiteProgram,
} from '@/lib/haccp/types'

type Props = {
  planData: HACCPPlanData
  lastReviewedAt: string | null
}

function SeverityBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const variant = level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'default'
  return <Badge variant={variant}>{level}</Badge>
}

function HazardTypeBadge({ type }: { type: 'biological' | 'chemical' | 'physical' }) {
  const labels = { biological: 'BIO', chemical: 'CHEM', physical: 'PHYS' }
  const variant = type === 'biological' ? 'error' : type === 'chemical' ? 'warning' : 'info'
  return <Badge variant={variant}>{labels[type]}</Badge>
}

function ProcessStepSection({ step, override }: { step: ProcessStep; override?: any }) {
  return (
    <HACCPSectionCard sectionId={step.id} title={step.name} override={override}>
      <p className="text-stone-400 mb-2">{step.description}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 text-left">
              <th className="py-1.5 pr-2 text-stone-400 font-medium">Type</th>
              <th className="py-1.5 pr-2 text-stone-400 font-medium">Hazard</th>
              <th className="py-1.5 pr-2 text-stone-400 font-medium">Severity</th>
              <th className="py-1.5 pr-2 text-stone-400 font-medium">Likelihood</th>
              <th className="py-1.5 pr-2 text-stone-400 font-medium">CCP?</th>
              <th className="py-1.5 text-stone-400 font-medium">Preventive Measure</th>
            </tr>
          </thead>
          <tbody>
            {step.hazards.map((h) => (
              <tr key={h.id} className="border-b border-stone-800">
                <td className="py-2 pr-2">
                  <HazardTypeBadge type={h.type} />
                </td>
                <td className="py-2 pr-2 text-stone-300">{h.description}</td>
                <td className="py-2 pr-2">
                  <SeverityBadge level={h.severity} />
                </td>
                <td className="py-2 pr-2">
                  <SeverityBadge level={h.likelihood} />
                </td>
                <td className="py-2 pr-2">
                  {h.isCCP ? (
                    <Badge variant="error">YES</Badge>
                  ) : (
                    <span className="text-stone-600">No</span>
                  )}
                </td>
                <td className="py-2 text-stone-400">{h.preventiveMeasure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HACCPSectionCard>
  )
}

function CCPSection({ ccp, override }: { ccp: CriticalControlPoint; override?: any }) {
  return (
    <HACCPSectionCard
      sectionId={ccp.id}
      title={`CCP-${ccp.ccpNumber}: ${ccp.processStep}`}
      sectionNumber={`CCP-${ccp.ccpNumber}`}
      override={override}
    >
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Hazard</p>
          <p>{ccp.hazard}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Critical Limits
          </p>
          <p className="font-medium text-amber-400">{ccp.criticalLimits}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
            Monitoring
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-stone-500">What:</span> {ccp.monitoring.what}
            </div>
            <div>
              <span className="text-stone-500">How:</span> {ccp.monitoring.how}
            </div>
            <div>
              <span className="text-stone-500">Frequency:</span> {ccp.monitoring.frequency}
            </div>
            <div>
              <span className="text-stone-500">Who:</span> {ccp.monitoring.who}
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
            Corrective Actions
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {ccp.correctiveActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
            Verification
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {ccp.verificationProcedures.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
            Records to Keep
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {ccp.recordKeeping.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </HACCPSectionCard>
  )
}

function PrereqSection({ prereq, override }: { prereq: PrerequisiteProgram; override?: any }) {
  return (
    <HACCPSectionCard sectionId={prereq.id} title={prereq.name} override={override}>
      <p className="text-stone-400 mb-2">{prereq.description}</p>
      <ul className="list-disc pl-4 space-y-1">
        {prereq.procedures.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </HACCPSectionCard>
  )
}

export function HACCPPlanView({ planData, lastReviewedAt }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  function handleMarkReviewed() {
    startTransition(async () => {
      await markHACCPReviewed()
    })
  }

  function handleReset() {
    setShowResetConfirm(false)
    startTransition(async () => {
      await resetHACCPPlan()
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="print:mb-8">
        <h1 className="text-3xl font-bold text-stone-100">{planData.planTitle}</h1>
        <p className="text-stone-400 mt-1">{planData.businessDescription}</p>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-stone-500">
          <span>Generated: {new Date(planData.generatedAt).toLocaleDateString()}</span>
          {lastReviewedAt && (
            <span>Last reviewed: {new Date(lastReviewedAt).toLocaleDateString()}</span>
          )}
          <Badge variant="success">FDA Food Code 2022</Badge>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="primary" onClick={() => window.print()}>
          Print Plan
        </Button>
        <Button variant="secondary" onClick={handleMarkReviewed} disabled={isPending}>
          {isPending ? 'Saving...' : 'Mark as Reviewed'}
        </Button>
        <Button variant="ghost" onClick={() => setShowResetConfirm(true)} disabled={isPending}>
          Reset to Default
        </Button>
      </div>

      {/* Table of Contents */}
      <Card className="print:hidden">
        <CardContent className="pt-4 pb-4">
          <h2 className="font-semibold text-stone-100 mb-2">Table of Contents</h2>
          <nav className="space-y-1 text-sm">
            <a href="#prereqs" className="block text-stone-400 hover:text-stone-200">
              1. Prerequisite Programs
            </a>
            <a href="#hazard-analysis" className="block text-stone-400 hover:text-stone-200">
              2. Hazard Analysis (Process Steps)
            </a>
            <a href="#ccps" className="block text-stone-400 hover:text-stone-200">
              3. Critical Control Points
            </a>
            <a href="#records" className="block text-stone-400 hover:text-stone-200">
              4. Record-Keeping Requirements
            </a>
            <a href="#review" className="block text-stone-400 hover:text-stone-200">
              5. Review Schedule
            </a>
          </nav>
        </CardContent>
      </Card>

      {/* Section 1: Prerequisite Programs */}
      <section id="prereqs">
        <h2 className="text-xl font-bold text-stone-100 mb-4 border-b border-stone-700 pb-2">
          1. Prerequisite Programs
        </h2>
        <p className="text-sm text-stone-400 mb-4">
          Foundational food safety programs that must be in place before HACCP monitoring begins.
          These are the baseline — your CCPs build on top of these.
        </p>
        <div className="space-y-3">
          {planData.prerequisitePrograms.map((prereq) => (
            <PrereqSection
              key={prereq.id}
              prereq={prereq}
              override={planData.overrides[prereq.id]}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Hazard Analysis */}
      <section id="hazard-analysis">
        <h2 className="text-xl font-bold text-stone-100 mb-4 border-b border-stone-700 pb-2">
          2. Hazard Analysis
        </h2>
        <p className="text-sm text-stone-400 mb-4">
          Every step in your process, the hazards at each step, and how they&apos;re controlled.
          Steps marked as CCPs have dedicated monitoring in Section 3.
        </p>
        <div className="space-y-3">
          {planData.processSteps.map((step) => (
            <ProcessStepSection key={step.id} step={step} override={planData.overrides[step.id]} />
          ))}
        </div>
      </section>

      {/* Section 3: Critical Control Points */}
      <section id="ccps">
        <h2 className="text-xl font-bold text-stone-100 mb-4 border-b border-stone-700 pb-2">
          3. Critical Control Points
        </h2>
        <p className="text-sm text-stone-400 mb-4">
          The core of your HACCP plan. Each CCP has specific limits, monitoring procedures,
          corrective actions, and records to maintain. These are the points where control is
          essential to prevent or eliminate a food safety hazard.
        </p>
        <div className="space-y-4">
          {planData.criticalControlPoints.map((ccp) => (
            <CCPSection key={ccp.id} ccp={ccp} override={planData.overrides[ccp.id]} />
          ))}
        </div>
      </section>

      {/* Section 4: Record-Keeping */}
      <section id="records">
        <h2 className="text-xl font-bold text-stone-100 mb-4 border-b border-stone-700 pb-2">
          4. Record-Keeping Requirements
        </h2>
        <Card>
          <CardContent className="pt-4 pb-4">
            <ul className="space-y-1.5 text-sm text-stone-300">
              {planData.recordKeepingSummary.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-stone-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Section 5: Review Schedule */}
      <section id="review">
        <h2 className="text-xl font-bold text-stone-100 mb-4 border-b border-stone-700 pb-2">
          5. Review Schedule
        </h2>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-stone-300">{planData.reviewSchedule}</p>
          </CardContent>
        </Card>
      </section>

      {/* Footer (print) */}
      <div className="hidden print:block text-center text-xs text-stone-500 mt-8 pt-4 border-t border-stone-300">
        <p>Generated by ChefFlow — {new Date().toLocaleDateString()}</p>
        <p>This plan should be reviewed and updated at least annually.</p>
      </div>

      <ConfirmModal
        open={showResetConfirm}
        title="Reset HACCP plan?"
        description="This will clear all your customizations and restore the default template."
        confirmLabel="Reset"
        variant="danger"
        loading={isPending}
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  )
}
