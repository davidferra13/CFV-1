'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildRegulatedBatchRecord } from '@/lib/compliance/batch-record'
import {
  evaluateCoaForBatch,
  type CoaContaminantPanels,
  type CoaDocument,
  type CoaPanelStatus,
  type CoaSourceMaterialType,
} from '@/lib/compliance/coa-intake'

const COA_BUCKET = 'regulated-coa-documents'
const MAX_COA_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_COA_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const SOURCE_MATERIAL_TYPES = [
  'flower',
  'solvent_extract',
  'solventless_extract',
  'distillate',
  'finished_liquid',
  'other',
] as const

const PANEL_KEYS = [
  'pesticides',
  'heavyMetals',
  'microbial',
  'mycotoxins',
  'residualSolvents',
  'foreignMaterial',
  'moistureContent',
  'waterActivity',
] as const

const PANEL_STATUSES = ['pass', 'fail', 'not_tested', 'not_applicable'] as const

const BatchRecordSchema = z.object({
  eventId: z.string().uuid().nullable().optional(),
  coaId: z.string().uuid(),
  batchCode: z.string().min(1).max(120),
  productName: z.string().min(1).max(200),
  productType: z
    .enum(['infused_liquid', 'infused_oil', 'infused_butter', 'extract', 'finished_food', 'other'])
    .default('infused_liquid'),
  sourceMaterialName: z.string().min(1).max(200),
  sourceType: z.enum(SOURCE_MATERIAL_TYPES),
  sourceLotNumber: z.string().min(1).max(120),
  sourceProviderType: z
    .enum(['host_provided', 'supplier', 'chef_inventory', 'other'])
    .default('host_provided'),
  sourceSupplierName: z.string().max(200).nullable().optional(),
  sourceReceivedDate: z.string().nullable().optional(),
  sourceInitialMassG: z.number().positive(),
  sourceStorageNotes: z.string().max(2000).nullable().optional(),
  chainOfCustodyNote: z.string().max(2000).nullable().optional(),
  decarbEfficiency: z.number().min(0).max(1).default(0.9),
  extractionEfficiency: z.number().min(0).max(1).default(0.8),
  transferEfficiency: z.number().min(0).max(1).default(0.95),
  retentionEfficiency: z.number().min(0).max(1).default(1),
  finalVolumeMl: z.number().positive(),
  targetDoseMg: z.number().min(0).nullable().optional(),
  labelClaimMgPerMl: z.number().min(0).nullable().optional(),
})

function textFromForm(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableTextFromForm(formData: FormData, key: string): string | null {
  const value = textFromForm(formData, key)
  return value.length ? value : null
}

function numberFromForm(formData: FormData, key: string): number | null {
  const value = textFromForm(formData, key)
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function panelStatusFromForm(formData: FormData, key: string): CoaPanelStatus | undefined {
  const value = textFromForm(formData, key)
  return PANEL_STATUSES.includes(value as CoaPanelStatus) ? (value as CoaPanelStatus) : undefined
}

function parseMaterialType(value: string): CoaSourceMaterialType {
  return SOURCE_MATERIAL_TYPES.includes(value as CoaSourceMaterialType)
    ? (value as CoaSourceMaterialType)
    : 'flower'
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed.length ? trimmed : null
}

function coaDocumentFromRow(row: any): CoaDocument {
  return {
    lotNumber: row.lot_number ?? null,
    batchNumber: row.batch_number ?? null,
    labName: row.lab_name ?? null,
    labAccreditation: row.lab_accreditation ?? null,
    sampleCollectedAt: row.sample_collected_at ?? null,
    reportIssuedAt: row.report_issued_at ?? null,
    cannabinoidPanel: row.cannabinoid_panel ?? null,
    contaminantPanels: row.contaminant_panels ?? null,
  }
}

export async function getCannabisBatchRecordWorkspace() {
  const user = await requireChef()
  const db: any = createServerClient()

  const [{ data: events }, { data: coas }, { data: batches }] = await Promise.all([
    db
      .from('events' as any)
      .select('id, event_date, occasion, status, cannabis_preference, clients!inner(full_name)')
      .eq('tenant_id', user.tenantId!)
      .eq('cannabis_preference', true)
      .order('event_date', { ascending: false })
      .limit(100) as any,
    db
      .from('regulated_batch_coas' as any)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(100) as any,
    db
      .from('regulated_batch_records' as any)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(100) as any,
  ])

  const coaById = new Map((coas ?? []).map((coa: any) => [coa.id, coa]))

  return {
    events: events ?? [],
    coas: coas ?? [],
    batches: (batches ?? []).map((batch: any) => ({
      ...batch,
      coa: coaById.get(batch.coa_id) ?? null,
    })),
  }
}

export async function getVerifiedRegulatedBatchOptions(eventId?: string | null) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('regulated_batch_records' as any)
    .select(
      'id, event_id, batch_code, product_name, source_lot_number, status, estimated_mg_per_ml, target_dose_mg, target_dose_volume_ml'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['ready_for_confirmation', 'released', 'finalized'])
    .order('created_at', { ascending: false })
    .limit(100) as any

  if (eventId) {
    query = query.or(`event_id.eq.${eventId},event_id.is.null`)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to load verified Batch Records')

  return data ?? []
}

export async function createRegulatedCoa(formData: FormData) {
  const user = await requireChef()
  const db: any = createServerClient()

  const eventId = nullableTextFromForm(formData, 'eventId')
  const sourceLotNumber = textFromForm(formData, 'sourceLotNumber')
  const lotNumber = nullableTextFromForm(formData, 'lotNumber')
  const sourceMaterialType = parseMaterialType(textFromForm(formData, 'sourceMaterialType'))
  const labName = textFromForm(formData, 'labName')
  const reportIssuedAt = textFromForm(formData, 'reportIssuedAt')

  if (!sourceLotNumber) throw new Error('Source lot is required')
  if (!labName) throw new Error('Lab is required')
  if (!reportIssuedAt) throw new Error('Report date is required')

  const potencyUnit = (textFromForm(formData, 'potencyUnit') || 'percent') as
    | 'percent'
    | 'mg_g'
    | 'mg_ml'
  const analyteMaxValue = potencyUnit === 'mg_ml' ? 5000 : potencyUnit === 'mg_g' ? 1000 : 100
  const unitLabel = potencyUnit === 'mg_ml' ? 'mg/mL' : potencyUnit === 'mg_g' ? 'mg/g' : '%'

  function validateAnalyte(name: string, value: number | null): number | null {
    if (value === null) return null
    if (value < 0) throw new Error(`${name} must be >= 0`)
    if (value > analyteMaxValue)
      throw new Error(
        `${name} value ${value}${unitLabel} exceeds maximum plausible range (0-${analyteMaxValue}${unitLabel})`
      )
    return value
  }

  const cannabinoidPanel = {
    unit: potencyUnit,
    analytes: {
      THC: validateAnalyte('THC', numberFromForm(formData, 'thc')),
      THCA: validateAnalyte('THCA', numberFromForm(formData, 'thca')),
      CBD: validateAnalyte('CBD', numberFromForm(formData, 'cbd')),
      CBDA: validateAnalyte('CBDA', numberFromForm(formData, 'cbda')),
    },
  }

  const contaminantPanels: CoaContaminantPanels = {}
  for (const key of PANEL_KEYS) {
    const status = panelStatusFromForm(formData, key)
    if (status) contaminantPanels[key] = status
  }

  const coa: CoaDocument = {
    lotNumber,
    batchNumber: nullableTextFromForm(formData, 'batchNumber'),
    labName,
    labAccreditation: nullableTextFromForm(formData, 'labAccreditation'),
    sampleCollectedAt: nullableTextFromForm(formData, 'sampleCollectedAt'),
    reportIssuedAt,
    cannabinoidPanel,
    contaminantPanels,
  }

  const evaluation = evaluateCoaForBatch({
    expectedLotNumber: sourceLotNumber,
    sourceMaterialType,
    coa,
  })

  let storagePath: string | null = null
  let fileName: string | null = null
  let contentType: string | null = null
  let sizeBytes: number | null = null
  const file = formData.get('coaFile') as File | null

  if (file && file.size > 0) {
    if (!ALLOWED_COA_MIME_TYPES.includes(file.type)) {
      throw new Error('COA upload must be a PDF, JPG, PNG, or WebP file')
    }
    if (file.size > MAX_COA_FILE_SIZE) throw new Error('COA upload exceeds 10MB')

    const extension = MIME_TO_EXTENSION[file.type]
    const documentId = crypto.randomUUID()
    storagePath = `${user.tenantId}/${documentId}.${extension}`
    fileName = file.name
    contentType = file.type
    sizeBytes = file.size

    const { error: uploadError } = await db.storage.from(COA_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) throw new Error(`COA upload failed: ${uploadError.message}`)
  }

  const { data: inserted, error } = await (db
    .from('regulated_batch_coas' as any)
    .insert({
      tenant_id: user.tenantId!,
      event_id: eventId,
      source_lot_number: sourceLotNumber,
      lot_number: lotNumber,
      batch_number: coa.batchNumber,
      source_material_type: sourceMaterialType,
      lab_name: labName,
      lab_accreditation: coa.labAccreditation,
      sample_collected_at: coa.sampleCollectedAt,
      report_issued_at: reportIssuedAt,
      cannabinoid_panel: cannabinoidPanel,
      contaminant_panels: contaminantPanels,
      evaluation_status: evaluation.status,
      red_flags: evaluation.redFlags,
      total_thc: evaluation.totalThc,
      total_cbd: evaluation.totalCbd,
      document_storage_path: storagePath,
      document_file_name: fileName,
      document_content_type: contentType,
      document_size_bytes: sizeBytes,
      notes: nullableTextFromForm(formData, 'notes'),
      reviewed_at: evaluation.status === 'accepted' ? new Date().toISOString() : null,
      reviewed_by: evaluation.status === 'accepted' ? user.id : null,
      created_by: user.id,
    })
    .select('*')
    .single() as any)

  if (error || !inserted) {
    if (storagePath) {
      try {
        await db.storage.from(COA_BUCKET).remove([storagePath])
      } catch {}
    }
    throw new Error(`Failed to save COA: ${error?.message ?? 'Unknown error'}`)
  }

  revalidatePath('/cannabis/compliance')
  revalidatePath('/cannabis/batches')
  if (eventId) revalidatePath(`/cannabis/events/${eventId}/control-packet`)

  return { success: true, coaId: inserted.id as string, status: evaluation.status }
}

export async function createRegulatedBatchRecord(input: z.infer<typeof BatchRecordSchema>) {
  const validated = BatchRecordSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: coaRow, error: coaError } = await (db
    .from('regulated_batch_coas' as any)
    .select('*')
    .eq('id', validated.coaId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (coaError || !coaRow) throw new Error('Selected COA was not found')

  const summary = buildRegulatedBatchRecord({
    batchId: validated.batchCode,
    sourceMaterial: {
      materialName: validated.sourceMaterialName,
      lotNumber: validated.sourceLotNumber,
      materialType: validated.sourceType,
      materialGrams: validated.sourceInitialMassG,
    },
    coa: coaDocumentFromRow(coaRow),
    process: {
      decarbEfficiency: validated.decarbEfficiency,
      extractionEfficiency: validated.extractionEfficiency,
      transferEfficiency: validated.transferEfficiency,
      retentionEfficiency: validated.retentionEfficiency,
    },
    finalProduct: {
      finalVolumeMl: validated.finalVolumeMl,
      targetDoseMg: validated.targetDoseMg ?? null,
      labelClaimMgPerMl: validated.labelClaimMgPerMl ?? null,
    },
  })

  const { data: inserted, error } = await (db
    .from('regulated_batch_records' as any)
    .insert({
      tenant_id: user.tenantId!,
      event_id: validated.eventId ?? coaRow.event_id ?? null,
      coa_id: validated.coaId,
      batch_code: validated.batchCode,
      product_name: validated.productName,
      product_type: validated.productType,
      status: summary.status,
      source_material_name: validated.sourceMaterialName,
      source_type: validated.sourceType,
      source_lot_number: validated.sourceLotNumber,
      source_provider_type: validated.sourceProviderType,
      source_supplier_name: normalizeNullable(validated.sourceSupplierName),
      source_received_date: normalizeNullable(validated.sourceReceivedDate),
      source_initial_mass_g: validated.sourceInitialMassG,
      source_storage_notes: normalizeNullable(validated.sourceStorageNotes),
      chain_of_custody_note: normalizeNullable(validated.chainOfCustodyNote),
      decarb_efficiency: validated.decarbEfficiency,
      extraction_efficiency: validated.extractionEfficiency,
      transfer_efficiency: validated.transferEfficiency,
      retention_efficiency: validated.retentionEfficiency,
      final_volume_ml: validated.finalVolumeMl,
      target_dose_mg: validated.targetDoseMg ?? null,
      label_claim_mg_per_ml: validated.labelClaimMgPerMl ?? null,
      total_thc: summary.potency.totalThc,
      potential_thc_mg: summary.potency.potentialThcMg,
      estimated_finished_thc_mg: summary.potency.estimatedFinishedThcMg,
      estimated_mg_per_ml: summary.potency.estimatedMgPerMl,
      target_dose_volume_ml: summary.dosing.targetDoseVolumeMl,
      release_checks: summary.releaseChecks,
      coa_red_flags: summary.coaRedFlags,
      created_by: user.id,
    })
    .select('*')
    .single() as any)

  if (error || !inserted) {
    throw new Error(`Failed to save Batch Record: ${error?.message ?? 'Unknown error'}`)
  }

  revalidatePath('/cannabis/compliance')
  revalidatePath('/cannabis/batches')
  if (inserted.event_id) revalidatePath(`/cannabis/events/${inserted.event_id}/control-packet`)

  return { success: true, batchRecordId: inserted.id as string, status: summary.status }
}

export async function createRegulatedBatchRecordFromForm(formData: FormData) {
  const nullableNumber = (key: string) => numberFromForm(formData, key)
  const requiredNumber = (key: string) => {
    const value = nullableNumber(key)
    if (value === null) throw new Error(`${key} is required`)
    return value
  }

  return createRegulatedBatchRecord({
    eventId: nullableTextFromForm(formData, 'eventId'),
    coaId: textFromForm(formData, 'coaId'),
    batchCode: textFromForm(formData, 'batchCode'),
    productName: textFromForm(formData, 'productName'),
    productType: (textFromForm(formData, 'productType') || 'infused_liquid') as any,
    sourceMaterialName: textFromForm(formData, 'sourceMaterialName'),
    sourceType: parseMaterialType(textFromForm(formData, 'sourceType')),
    sourceLotNumber: textFromForm(formData, 'sourceLotNumber'),
    sourceProviderType: (textFromForm(formData, 'sourceProviderType') || 'host_provided') as any,
    sourceSupplierName: nullableTextFromForm(formData, 'sourceSupplierName'),
    sourceReceivedDate: nullableTextFromForm(formData, 'sourceReceivedDate'),
    sourceInitialMassG: requiredNumber('sourceInitialMassG'),
    sourceStorageNotes: nullableTextFromForm(formData, 'sourceStorageNotes'),
    chainOfCustodyNote: nullableTextFromForm(formData, 'chainOfCustodyNote'),
    decarbEfficiency: requiredNumber('decarbEfficiency'),
    extractionEfficiency: requiredNumber('extractionEfficiency'),
    transferEfficiency: requiredNumber('transferEfficiency'),
    retentionEfficiency: requiredNumber('retentionEfficiency'),
    finalVolumeMl: requiredNumber('finalVolumeMl'),
    targetDoseMg: nullableNumber('targetDoseMg'),
    labelClaimMgPerMl: nullableNumber('labelClaimMgPerMl'),
  })
}
