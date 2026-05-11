import { evaluateCoaForBatch, type CoaDocument, type CoaSourceMaterialType } from './coa-intake'
import {
  calculateDoseVolumeMl,
  calculateEstimatedFinishedCannabinoidMg,
  calculateLiquidPotencyMgPerMl,
  calculatePotentialCannabinoidMg,
} from '@/lib/formulas/regulated-product'

export interface RegulatedBatchSourceMaterial {
  materialName: string
  lotNumber: string
  materialType: CoaSourceMaterialType
  materialGrams: number
}

export interface RegulatedBatchProcess {
  decarbEfficiency: number
  extractionEfficiency: number
  transferEfficiency: number
  retentionEfficiency: number
}

export interface RegulatedBatchFinalProduct {
  finalVolumeMl: number
  targetDoseMg?: number | null
  labelClaimMgPerMl?: number | null
}

export interface RegulatedBatchRecordInput {
  batchId: string
  sourceMaterial: RegulatedBatchSourceMaterial
  coa: CoaDocument
  process: RegulatedBatchProcess
  finalProduct: RegulatedBatchFinalProduct
}

export interface RegulatedBatchReleaseCheck {
  code:
    | 'coa_status_review'
    | 'coa_status_rejected'
    | 'missing_label_claim'
    | 'ready_for_lab_confirmation'
  message: string
  severity: 'info' | 'review' | 'reject'
}

export interface RegulatedBatchRecordSummary {
  batchId: string
  status: 'ready_for_confirmation' | 'review' | 'rejected'
  sourceIdentity: {
    materialName: string
    lotNumber: string
    lotMatched: boolean
  }
  potency: {
    totalThc: number | null
    potentialThcMg: number | null
    estimatedFinishedThcMg: number | null
    estimatedMgPerMl: number | null
  }
  dosing: {
    targetDoseMg: number | null
    targetDoseVolumeMl: number | null
  }
  coaRedFlags: ReturnType<typeof evaluateCoaForBatch>['redFlags']
  releaseChecks: RegulatedBatchReleaseCheck[]
}

function statusFromChecks(
  checks: RegulatedBatchReleaseCheck[]
): RegulatedBatchRecordSummary['status'] {
  if (checks.some((check) => check.severity === 'reject')) return 'rejected'
  if (checks.some((check) => check.severity === 'review')) return 'review'
  return 'ready_for_confirmation'
}

export function buildRegulatedBatchRecord({
  batchId,
  sourceMaterial,
  coa,
  process,
  finalProduct,
}: RegulatedBatchRecordInput): RegulatedBatchRecordSummary {
  const coaEvaluation = evaluateCoaForBatch({
    expectedLotNumber: sourceMaterial.lotNumber,
    sourceMaterialType: sourceMaterial.materialType,
    coa,
  })

  const totalThc = coaEvaluation.totalThc
  const totalThcDecimal =
    totalThc === null
      ? null
      : coa.cannabinoidPanel?.unit === 'percent'
        ? totalThc / 100
        : totalThc / 1000

  const potentialThcMg =
    totalThcDecimal === null
      ? null
      : calculatePotentialCannabinoidMg({
          materialGrams: sourceMaterial.materialGrams,
          totalCannabinoidDecimal: totalThcDecimal,
        })

  const estimatedFinishedThcMg =
    potentialThcMg === null
      ? null
      : calculateEstimatedFinishedCannabinoidMg({
          potentialMg: potentialThcMg,
          decarbEfficiency: process.decarbEfficiency,
          extractionEfficiency: process.extractionEfficiency,
          transferEfficiency: process.transferEfficiency,
          retentionEfficiency: process.retentionEfficiency,
        })

  const estimatedMgPerMl =
    estimatedFinishedThcMg === null
      ? null
      : calculateLiquidPotencyMgPerMl({
          finishedCannabinoidMg: estimatedFinishedThcMg,
          finalVolumeMl: finalProduct.finalVolumeMl,
        })

  const targetDoseMg = finalProduct.targetDoseMg ?? null
  const targetDoseVolumeMl =
    targetDoseMg !== null && estimatedMgPerMl !== null
      ? calculateDoseVolumeMl({ targetDoseMg, potencyMgPerMl: estimatedMgPerMl })
      : null

  const releaseChecks: RegulatedBatchReleaseCheck[] = []
  if (coaEvaluation.status === 'rejected') {
    releaseChecks.push({
      code: 'coa_status_rejected',
      message: 'COA has rejecting red flags and the batch should not be released.',
      severity: 'reject',
    })
  } else if (coaEvaluation.status === 'review') {
    releaseChecks.push({
      code: 'coa_status_review',
      message: 'COA has review red flags that need documented sign-off.',
      severity: 'review',
    })
  }

  if (finalProduct.labelClaimMgPerMl === null || finalProduct.labelClaimMgPerMl === undefined) {
    releaseChecks.push({
      code: 'missing_label_claim',
      message: 'No label claim was provided for comparison against final lab confirmation.',
      severity: 'review',
    })
  }

  releaseChecks.push({
    code: 'ready_for_lab_confirmation',
    message: 'Calculated potency is an estimate until confirmed by final product testing.',
    severity: 'info',
  })

  return {
    batchId,
    status: statusFromChecks(releaseChecks),
    sourceIdentity: {
      materialName: sourceMaterial.materialName,
      lotNumber: sourceMaterial.lotNumber,
      lotMatched: coa.lotNumber === sourceMaterial.lotNumber,
    },
    potency: {
      totalThc,
      potentialThcMg,
      estimatedFinishedThcMg,
      estimatedMgPerMl,
    },
    dosing: {
      targetDoseMg,
      targetDoseVolumeMl,
    },
    coaRedFlags: coaEvaluation.redFlags,
    releaseChecks,
  }
}
