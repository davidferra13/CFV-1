import {
  calculateTotalCannabinoid,
  CBDA_TO_CBD_FACTOR,
  THCA_TO_THC_FACTOR,
} from '@/lib/formulas/regulated-product'

export type CoaPanelStatus = 'pass' | 'fail' | 'not_tested' | 'not_applicable'
export type CoaSourceMaterialType =
  | 'flower'
  | 'solvent_extract'
  | 'solventless_extract'
  | 'distillate'
  | 'finished_liquid'
  | 'other'

export interface CoaCannabinoidPanel {
  unit: 'percent' | 'mg_g' | 'mg_ml'
  analytes: Record<string, number | null | undefined>
}

export interface CoaContaminantPanels {
  pesticides?: CoaPanelStatus
  heavyMetals?: CoaPanelStatus
  microbial?: CoaPanelStatus
  mycotoxins?: CoaPanelStatus
  residualSolvents?: CoaPanelStatus
  foreignMaterial?: CoaPanelStatus
  moistureContent?: CoaPanelStatus
  waterActivity?: CoaPanelStatus
}

export interface CoaDocument {
  lotNumber?: string | null
  batchNumber?: string | null
  labName?: string | null
  labAccreditation?: string | null
  sampleCollectedAt?: string | null
  reportIssuedAt?: string | null
  cannabinoidPanel?: CoaCannabinoidPanel | null
  contaminantPanels?: CoaContaminantPanels | null
}

export interface CoaBatchEvaluationInput {
  expectedLotNumber?: string | null
  sourceMaterialType: CoaSourceMaterialType
  coa: CoaDocument
}

export type CoaRedFlagCode =
  | 'missing_lot'
  | 'lot_mismatch'
  | 'missing_lab'
  | 'missing_accreditation'
  | 'missing_dates'
  | 'missing_cannabinoids'
  | 'missing_panel'
  | 'missing_residual_solvents'
  | 'failed_panel'
  | 'analyte_out_of_range'

export interface CoaRedFlag {
  code: CoaRedFlagCode
  message: string
  severity: 'review' | 'reject'
}

export interface CoaBatchEvaluation {
  status: 'accepted' | 'review' | 'rejected'
  redFlags: CoaRedFlag[]
  totalThc: number | null
  totalCbd: number | null
}

const REQUIRED_SAFETY_PANELS: Array<keyof CoaContaminantPanels> = [
  'pesticides',
  'heavyMetals',
  'microbial',
  'mycotoxins',
  'foreignMaterial',
]

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function statusFor(redFlags: CoaRedFlag[]): CoaBatchEvaluation['status'] {
  if (redFlags.some((flag) => flag.severity === 'reject')) return 'rejected'
  if (redFlags.length > 0) return 'review'
  return 'accepted'
}

function addFlag(redFlags: CoaRedFlag[], flag: CoaRedFlag): void {
  redFlags.push(flag)
}

function readAnalyte(panel: CoaCannabinoidPanel | null | undefined, name: string): number {
  const value = panel?.analytes[name]
  if (!Number.isFinite(value)) return 0
  return Number(value)
}

export function evaluateCoaForBatch({
  expectedLotNumber,
  sourceMaterialType,
  coa,
}: CoaBatchEvaluationInput): CoaBatchEvaluation {
  const redFlags: CoaRedFlag[] = []
  const lotNumber = normalized(coa.lotNumber)
  const expectedLot = normalized(expectedLotNumber)

  if (!lotNumber) {
    addFlag(redFlags, {
      code: 'missing_lot',
      message: 'COA is missing a source lot number.',
      severity: 'reject',
    })
  }

  if (expectedLot && lotNumber && lotNumber !== expectedLot) {
    addFlag(redFlags, {
      code: 'lot_mismatch',
      message: 'COA lot number does not match the expected source lot.',
      severity: 'reject',
    })
  }

  if (!normalized(coa.labName)) {
    addFlag(redFlags, {
      code: 'missing_lab',
      message: 'COA is missing the testing lab identity.',
      severity: 'reject',
    })
  }

  if (!normalized(coa.labAccreditation)) {
    addFlag(redFlags, {
      code: 'missing_accreditation',
      message: 'COA is missing lab accreditation information.',
      severity: 'review',
    })
  }

  if (!normalized(coa.sampleCollectedAt) || !normalized(coa.reportIssuedAt)) {
    addFlag(redFlags, {
      code: 'missing_dates',
      message: 'COA is missing sample collection or report issue dates.',
      severity: 'review',
    })
  }

  if (!coa.cannabinoidPanel || Object.keys(coa.cannabinoidPanel.analytes).length === 0) {
    addFlag(redFlags, {
      code: 'missing_cannabinoids',
      message: 'COA is missing cannabinoid potency results.',
      severity: 'reject',
    })
  }

  if (coa.cannabinoidPanel) {
    const unit = coa.cannabinoidPanel.unit
    const maxValue = unit === 'mg_ml' ? 5000 : unit === 'mg_g' ? 1000 : 100
    const unitLabel = unit === 'mg_ml' ? 'mg/mL' : unit === 'mg_g' ? 'mg/g' : '%'
    for (const [name, value] of Object.entries(coa.cannabinoidPanel.analytes)) {
      if (value == null || !Number.isFinite(value)) continue
      if (value < 0) {
        addFlag(redFlags, {
          code: 'analyte_out_of_range',
          message: `${name} value ${value}${unitLabel} is negative. Values must be >= 0.`,
          severity: 'reject',
        })
      } else if (value > maxValue) {
        addFlag(redFlags, {
          code: 'analyte_out_of_range',
          message: `${name} value ${value}${unitLabel} exceeds maximum plausible range (0-${maxValue}${unitLabel}).`,
          severity: 'reject',
        })
      }
    }
  }

  const panels = coa.contaminantPanels ?? {}
  for (const panelName of REQUIRED_SAFETY_PANELS) {
    const status = panels[panelName]
    if (!status || status === 'not_tested') {
      addFlag(redFlags, {
        code: 'missing_panel',
        message: `COA is missing ${panelName} testing.`,
        severity: 'reject',
      })
    }
    if (status === 'fail') {
      addFlag(redFlags, {
        code: 'failed_panel',
        message: `COA failed ${panelName} testing.`,
        severity: 'reject',
      })
    }
  }

  if (sourceMaterialType === 'solvent_extract') {
    const residualStatus = panels.residualSolvents
    if (!residualStatus || residualStatus === 'not_tested') {
      addFlag(redFlags, {
        code: 'missing_residual_solvents',
        message: 'Solvent extracts require residual solvent testing.',
        severity: 'reject',
      })
    }
    if (residualStatus === 'fail') {
      addFlag(redFlags, {
        code: 'failed_panel',
        message: 'COA failed residual solvent testing.',
        severity: 'reject',
      })
    }
  }

  const totalThc = coa.cannabinoidPanel
    ? calculateTotalCannabinoid({
        neutralAmount: readAnalyte(coa.cannabinoidPanel, 'THC'),
        acidicAmount: readAnalyte(coa.cannabinoidPanel, 'THCA'),
        acidToNeutralFactor: THCA_TO_THC_FACTOR,
      })
    : null

  const totalCbd = coa.cannabinoidPanel
    ? calculateTotalCannabinoid({
        neutralAmount: readAnalyte(coa.cannabinoidPanel, 'CBD'),
        acidicAmount: readAnalyte(coa.cannabinoidPanel, 'CBDA'),
        acidToNeutralFactor: CBDA_TO_CBD_FACTOR,
      })
    : null

  return {
    status: statusFor(redFlags),
    redFlags,
    totalThc,
    totalCbd,
  }
}
