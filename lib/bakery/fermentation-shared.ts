export type FermentationStage =
  | 'autolyse'
  | 'bulk_ferment'
  | 'fold'
  | 'shape'
  | 'cold_retard'
  | 'final_proof'
  | 'ready'

export const STAGE_LABELS: Record<FermentationStage, string> = {
  autolyse: 'Autolyse',
  bulk_ferment: 'Bulk Ferment',
  fold: 'Fold',
  shape: 'Shape',
  cold_retard: 'Cold Retard',
  final_proof: 'Final Proof',
  ready: 'Ready',
}

export const STAGE_ORDER: FermentationStage[] = [
  'autolyse',
  'bulk_ferment',
  'fold',
  'shape',
  'cold_retard',
  'final_proof',
  'ready',
]
