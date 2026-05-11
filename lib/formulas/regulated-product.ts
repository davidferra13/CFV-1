export const THCA_TO_THC_FACTOR = 0.877
export const CBDA_TO_CBD_FACTOR = 0.877
export const CBGA_TO_CBG_FACTOR = 0.878

export interface TotalCannabinoidInput {
  neutralAmount?: number | null
  acidicAmount?: number | null
  acidToNeutralFactor?: number
}

export interface DryWeightPotencyInput {
  asReceivedPotency: number
  moistureFraction: number
}

export interface PotentialCannabinoidInput {
  materialGrams: number
  totalCannabinoidDecimal: number
}

export interface FinishedCannabinoidInput {
  potentialMg: number
  decarbEfficiency: number
  extractionEfficiency: number
  transferEfficiency: number
  retentionEfficiency: number
}

export interface LiquidPotencyInput {
  finishedCannabinoidMg: number
  finalVolumeMl: number
}

export interface DoseVolumeInput {
  targetDoseMg: number
  potencyMgPerMl: number
}

export interface DensityConversionInput {
  mgPerGram: number
  densityGPerMl: number
}

export interface TransferEfficiencyInput {
  intendedMassGrams: number
  deliveredMassGrams: number
}

export interface LabelVarianceInput {
  labelClaim: number
  labResult: number
}

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`)
  }
}

function assertNonNegative(value: number, name: string): void {
  assertFiniteNumber(value, name)
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative`)
  }
}

function assertPositive(value: number, name: string): void {
  assertFiniteNumber(value, name)
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero`)
  }
}

function assertFraction(value: number, name: string): void {
  assertFiniteNumber(value, name)
  if (value < 0 || value > 1) {
    throw new RangeError(`${name} must be between 0 and 1`)
  }
}

export function roundTo(value: number, decimals = 6): number {
  assertFiniteNumber(value, 'value')
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function calculateTotalCannabinoid({
  neutralAmount = 0,
  acidicAmount = 0,
  acidToNeutralFactor = THCA_TO_THC_FACTOR,
}: TotalCannabinoidInput): number {
  const neutral = neutralAmount ?? 0
  const acidic = acidicAmount ?? 0
  assertNonNegative(neutral, 'neutralAmount')
  assertNonNegative(acidic, 'acidicAmount')
  assertPositive(acidToNeutralFactor, 'acidToNeutralFactor')

  return roundTo(neutral + acidic * acidToNeutralFactor)
}

export function calculateDryWeightPotency({
  asReceivedPotency,
  moistureFraction,
}: DryWeightPotencyInput): number {
  assertNonNegative(asReceivedPotency, 'asReceivedPotency')
  assertFraction(moistureFraction, 'moistureFraction')
  if (moistureFraction === 1) {
    throw new RangeError('moistureFraction must be less than 1')
  }

  return roundTo(asReceivedPotency / (1 - moistureFraction))
}

export function calculatePotentialCannabinoidMg({
  materialGrams,
  totalCannabinoidDecimal,
}: PotentialCannabinoidInput): number {
  assertNonNegative(materialGrams, 'materialGrams')
  assertFraction(totalCannabinoidDecimal, 'totalCannabinoidDecimal')

  return roundTo(materialGrams * 1000 * totalCannabinoidDecimal)
}

export function calculateEstimatedFinishedCannabinoidMg({
  potentialMg,
  decarbEfficiency,
  extractionEfficiency,
  transferEfficiency,
  retentionEfficiency,
}: FinishedCannabinoidInput): number {
  assertNonNegative(potentialMg, 'potentialMg')
  assertFraction(decarbEfficiency, 'decarbEfficiency')
  assertFraction(extractionEfficiency, 'extractionEfficiency')
  assertFraction(transferEfficiency, 'transferEfficiency')
  assertFraction(retentionEfficiency, 'retentionEfficiency')

  return roundTo(
    potentialMg * decarbEfficiency * extractionEfficiency * transferEfficiency * retentionEfficiency
  )
}

export function calculateLiquidPotencyMgPerMl({
  finishedCannabinoidMg,
  finalVolumeMl,
}: LiquidPotencyInput): number {
  assertNonNegative(finishedCannabinoidMg, 'finishedCannabinoidMg')
  assertPositive(finalVolumeMl, 'finalVolumeMl')

  return roundTo(finishedCannabinoidMg / finalVolumeMl)
}

export function calculateDoseVolumeMl({ targetDoseMg, potencyMgPerMl }: DoseVolumeInput): number {
  assertNonNegative(targetDoseMg, 'targetDoseMg')
  assertPositive(potencyMgPerMl, 'potencyMgPerMl')

  return roundTo(targetDoseMg / potencyMgPerMl)
}

export function calculateMgPerMlFromMgPerGram({
  mgPerGram,
  densityGPerMl,
}: DensityConversionInput): number {
  assertNonNegative(mgPerGram, 'mgPerGram')
  assertPositive(densityGPerMl, 'densityGPerMl')

  return roundTo(mgPerGram * densityGPerMl)
}

export function calculateTransferEfficiency({
  intendedMassGrams,
  deliveredMassGrams,
}: TransferEfficiencyInput): number {
  assertPositive(intendedMassGrams, 'intendedMassGrams')
  assertNonNegative(deliveredMassGrams, 'deliveredMassGrams')

  return roundTo(deliveredMassGrams / intendedMassGrams)
}

export function calculateLabelVariancePercent({
  labelClaim,
  labResult,
}: LabelVarianceInput): number {
  assertPositive(labelClaim, 'labelClaim')
  assertNonNegative(labResult, 'labResult')

  return roundTo((Math.abs(labResult - labelClaim) / labelClaim) * 100)
}
