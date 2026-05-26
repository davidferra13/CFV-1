'use client'

import { useState, useTransition } from 'react'
import type {
  CompensationModel,
  CompensationDetails,
  TemplateType,
  AgreementItem,
  ItemAssignment,
  ItemCategory,
} from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS } from '@/lib/hub/agreement-types'
import { AGREEMENT_TEMPLATES } from '@/lib/hub/agreement-templates'
import { AgreementCompensationCard } from './agreement-compensation-card'
import { AgreementChecklistSection } from './agreement-checklist-section'
import { AgreementSignatureBlock } from './agreement-signature-block'
import {
  createAgreement,
  updateAgreementItem,
  updateCompensation,
} from '@/lib/hub/agreement-actions'

interface AgreementSetupWizardProps {
  groupId: string
  eventId?: string
  hosts: { profileId: string; label: string }[]
  currentProfileId: string
  onComplete: () => void
}

type WizardStep = 'template' | 'compensation' | 'checklist' | 'sign'
const STEPS: WizardStep[] = ['template', 'compensation', 'checklist', 'sign']
const STEP_LABELS: Record<WizardStep, string> = {
  template: 'Type',
  compensation: 'Compensation',
  checklist: 'Responsibilities',
  sign: 'Review & Sign',
}

export function AgreementSetupWizard({
  groupId,
  eventId,
  hosts,
  currentProfileId,
  onComplete,
}: AgreementSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('chef_farm')
  const [agreementId, setAgreementId] = useState<string | null>(null)
  const [compensationModel, setCompensationModel] = useState<CompensationModel>('both_sell')
  const [compensationDetails, setCompensationDetails] = useState<CompensationDetails | null>(null)
  const [items, setItems] = useState<AgreementItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const stepIndex = STEPS.indexOf(step)

  const handleNext = () => {
    if (step === 'template') {
      startTransition(async () => {
        const result = await createAgreement({
          groupId,
          eventId,
          templateType: selectedTemplate,
        })
        if (result.success && result.agreementId) {
          setAgreementId(result.agreementId)
          setStep('compensation')
        } else {
          setError(result.error || 'Failed to create agreement')
        }
      })
    } else if (step === 'compensation') {
      if (agreementId && compensationDetails) {
        startTransition(async () => {
          await updateCompensation({
            agreementId: agreementId!,
            compensationModel,
            compensationDetails: compensationDetails as unknown as Record<string, unknown>,
          })
          setStep('checklist')
        })
      }
    } else if (step === 'checklist') {
      setStep('sign')
    }
  }

  const handleBack = () => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) setStep(STEPS[prevIndex])
  }

  const handleAssignmentChange = (itemId: string, assignment: ItemAssignment) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, assignment } : i)))
    startTransition(async () => {
      await updateAgreementItem({ itemId, assignment })
    })
  }

  const handleNotesChange = (itemId: string, notes: string) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, notes } : i)))
  }

  const categories = [...new Set(items.map((i) => i.category))] as ItemCategory[]
  const allAssigned = items.every((i) => i.assignment !== 'unassigned')

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-full py-1 text-center text-xs font-medium ${
              i <= stepIndex ? 'bg-amber-600/20 text-amber-300' : 'bg-stone-800 text-stone-500'
            }`}
          >
            {STEP_LABELS[s]}
          </div>
        ))}
      </div>

      {/* Step 1: Template */}
      {step === 'template' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Collaboration Type</h2>
          <p className="text-sm text-stone-400">
            Choose the type that best describes this collaboration.
          </p>
          {Object.values(AGREEMENT_TEMPLATES).map((tmpl) => (
            <button
              key={tmpl.type}
              onClick={() => setSelectedTemplate(tmpl.type)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedTemplate === tmpl.type
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
              }`}
            >
              <p className="text-sm font-medium text-stone-200">{tmpl.label}</p>
              <p className="mt-0.5 text-xs text-stone-400">{tmpl.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Compensation */}
      {step === 'compensation' && compensationDetails && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-stone-100">Compensation</h2>
          <p className="text-sm text-stone-400">
            Configure how revenue will be split between all co-hosts.
          </p>
          <AgreementCompensationCard
            model={compensationModel}
            details={compensationDetails}
            hosts={hosts}
            onChange={(m, d) => {
              setCompensationModel(m)
              setCompensationDetails(d)
            }}
          />
        </div>
      )}

      {/* Step 3: Checklist */}
      {step === 'checklist' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-stone-100">Responsibilities</h2>
          <p className="text-sm text-stone-400">
            Assign each item to Chef, Venue, Shared, or N/A. All items must be assigned before
            signing.
          </p>
          {categories.map((cat) => (
            <AgreementChecklistSection
              key={cat}
              category={cat}
              items={items.filter((i) => i.category === cat)}
              onAssignmentChange={handleAssignmentChange}
              onNotesChange={handleNotesChange}
            />
          ))}
        </div>
      )}

      {/* Step 4: Review & Sign */}
      {step === 'sign' && agreementId && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-stone-100">Review & Sign</h2>
          <p className="text-sm text-stone-400">
            Review the agreement below. Both parties must sign before tickets can go live.
          </p>

          {/* Compensation summary */}
          <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-3">
            <h4 className="text-xs font-medium text-stone-400">Compensation Summary</h4>
            {compensationDetails &&
              compensationDetails.splits.map((s) => (
                <p key={s.hostProfileId} className="text-sm text-stone-200">
                  {s.label}: {s.percentage}%
                </p>
              ))}
          </div>

          {/* Checklist summary */}
          <div className="space-y-2">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat)
              return (
                <div
                  key={cat}
                  className="rounded-lg border border-stone-700/50 bg-stone-800/20 p-2"
                >
                  <p className="text-xs font-medium text-stone-300">{CATEGORY_LABELS[cat]}</p>
                  <p className="text-xs text-stone-500">{catItems.length} items assigned</p>
                </div>
              )
            })}
          </div>

          {/* Signature block */}
          <AgreementSignatureBlock
            agreementId={agreementId}
            hosts={hosts.map((h) => ({
              ...h,
              displayName: h.label,
              organization: null,
              hasSigned: false,
              signedAt: null,
            }))}
            currentProfileId={currentProfileId}
            allItemsAssigned={allAssigned}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        {stepIndex > 0 ? (
          <button
            onClick={handleBack}
            className="rounded-lg border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {step !== 'sign' && (
          <button
            onClick={handleNext}
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Continue'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
