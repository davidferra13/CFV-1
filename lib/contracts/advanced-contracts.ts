import { requireAuth, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const AddSignerSchema = z.object({
  signer_role: z.enum(['client', 'chef', 'witness', 'co_host']).default('client'),
  signer_name: z.string().min(1),
  signer_email: z.string().email(),
  required: z.boolean().default(true),
  signing_order: z.number().int().min(1).default(1),
})

const CreateVersionSchema = z.object({
  body_snapshot: z.string().min(1),
  change_note: z.string().max(500).optional(),
})

const SignPartySchema = z.object({
  contract_id: z.string().uuid(),
  signer_id: z.string().uuid(),
  signature_data_url: z.string().min(1),
  signer_ip_address: z.string().optional(),
  signer_user_agent: z.string().optional(),
})

export type ContractVersion = {
  id: string
  contract_id: string
  version_number: number
  body_snapshot: string
  change_note: string | null
  created_by: string | null
  created_at: string
}

export type ContractSigner = {
  id: string
  contract_id: string
  signer_role: 'client' | 'chef' | 'witness' | 'co_host'
  signer_name: string
  signer_email: string
  required: boolean
  signing_order: number
  signed_at: string | null
}

type SigningSummary = {
  requiredCount: number
  signedCount: number
  pendingCount: number
  fullySigned: boolean
}

function isMissingRelation(error: any): boolean {
  return error?.code === '42P01'
}

export async function getContractVersions(contractId: string): Promise<ContractVersion[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract, error: contractError } = await db
    .from('event_contracts')
    .select('id')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (contractError || !contract) {
    throw new Error('Contract not found')
  }

  const { data, error } = await db
    .from('event_contract_versions')
    .select('id, contract_id, version_number, body_snapshot, change_note, created_by, created_at')
    .eq('contract_id', contractId)
    .order('version_number', { ascending: false })

  if (error) {
    if (isMissingRelation(error)) return []
    throw new Error(`Failed to load contract versions: ${error.message}`)
  }

  return (data || []) as ContractVersion[]
}

export async function createContractVersion(
  contractId: string,
  input: z.infer<typeof CreateVersionSchema>
): Promise<ContractVersion> {
  const user = await requireChef()
  const validated = CreateVersionSchema.parse(input)
  const db: any = createServerClient()

  const { data: contract, error: contractError } = await db
    .from('event_contracts')
    .select('id, event_id')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (contractError || !contract) {
    throw new Error('Contract not found')
  }

  const { data: latest } = await db
    .from('event_contract_versions')
    .select('version_number')
    .eq('contract_id', contractId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = Number(latest?.version_number || 0) + 1

  const { data, error } = await db
    .from('event_contract_versions')
    .insert({
      contract_id: contractId,
      version_number: nextVersion,
      body_snapshot: validated.body_snapshot,
      change_note: validated.change_note || null,
      created_by: user.id,
    })
    .select('id, contract_id, version_number, body_snapshot, change_note, created_by, created_at')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create contract version: ${error?.message || 'Unknown error'}`)
  }

  await db
    .from('event_contracts')
    .update({
      body_snapshot: validated.body_snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)

  revalidatePath(`/contracts/${contractId}/history`)
  revalidatePath(`/events/${contract.event_id}`)

  return data as ContractVersion
}

export async function getContractSigners(contractId: string): Promise<ContractSigner[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract, error: contractError } = await db
    .from('event_contracts')
    .select('id')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (contractError || !contract) {
    throw new Error('Contract not found')
  }

  const { data, error } = await db
    .from('event_contract_signers')
    .select(
      'id, contract_id, signer_role, signer_name, signer_email, required, signing_order, signed_at'
    )
    .eq('contract_id', contractId)
    .order('signing_order', { ascending: true })

  if (error) {
    if (isMissingRelation(error)) return []
    throw new Error(`Failed to load signers: ${error.message}`)
  }

  return (data || []) as ContractSigner[]
}

export async function addContractSigner(
  contractId: string,
  input: z.infer<typeof AddSignerSchema>
): Promise<ContractSigner> {
  const user = await requireChef()
  const validated = AddSignerSchema.parse(input)
  const db: any = createServerClient()

  const { data: contract, error: contractError } = await db
    .from('event_contracts')
    .select('id')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (contractError || !contract) {
    throw new Error('Contract not found')
  }

  const { data, error } = await db
    .from('event_contract_signers')
    .insert({
      contract_id: contractId,
      tenant_id: user.tenantId!,
      signer_role: validated.signer_role,
      signer_name: validated.signer_name,
      signer_email: validated.signer_email.toLowerCase(),
      required: validated.required,
      signing_order: validated.signing_order,
      created_by: user.id,
    })
    .select(
      'id, contract_id, signer_role, signer_name, signer_email, required, signing_order, signed_at'
    )
    .single()

  if (error || !data) {
    throw new Error(`Failed to add signer: ${error?.message || 'Unknown error'}`)
  }

  revalidatePath(`/contracts/${contractId}/history`)
  return data as ContractSigner
}

export async function getContractSigningSummary(contractId: string): Promise<SigningSummary> {
  const signers = await getContractSigners(contractId)
  const required = signers.filter((signer) => signer.required)
  const signed = required.filter((signer) => Boolean(signer.signed_at))
  return {
    requiredCount: required.length,
    signedCount: signed.length,
    pendingCount: Math.max(required.length - signed.length, 0),
    fullySigned: required.length > 0 && signed.length === required.length,
  }
}

export async function signContractAsParty(input: z.infer<typeof SignPartySchema>) {
  const user = await requireAuth()
  const validated = SignPartySchema.parse(input)
  const db: any = createServerClient()

  const { data: signer, error: signerError } = await db
    .from('event_contract_signers')
    .select(
      'id, contract_id, signer_email, required, signed_at, event_contracts(id, chef_id, client_id, event_id, status)'
    )
    .eq('id', validated.signer_id)
    .eq('contract_id', validated.contract_id)
    .single()

  if (signerError || !signer) {
    throw new Error('Signer record not found')
  }
  if (signer.signed_at) {
    throw new Error('This signer has already signed')
  }

  const contract = signer.event_contracts
  if (!contract) {
    throw new Error('Contract not found')
  }

  const isChefSigner = user.role === 'chef' && user.entityId === contract.chef_id
  const isClientSigner = user.role === 'client' && user.entityId === contract.client_id
  const signerEmail = String(signer.signer_email || '').toLowerCase()
  const matchesEmail = signerEmail && user.email.toLowerCase() === signerEmail

  if (!isChefSigner && !isClientSigner && !matchesEmail) {
    throw new Error('Unauthorized signer')
  }

  const { error: updateSignerError } = await db
    .from('event_contract_signers')
    .update({
      signed_at: new Date().toISOString(),
      signature_data_url: validated.signature_data_url,
      signer_ip_address: validated.signer_ip_address || null,
      signer_user_agent: validated.signer_user_agent || null,
      signed_by_auth_user_id: user.id,
    })
    .eq('id', validated.signer_id)
    .eq('contract_id', validated.contract_id)
    .is('signed_at', null)

  if (updateSignerError) {
    throw new Error(`Failed to record signature: ${updateSignerError.message}`)
  }

  const summary = await getContractSigningSummary(validated.contract_id)

  if (summary.fullySigned) {
    await db
      .from('event_contracts')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
      })
      .eq('id', validated.contract_id)
  }

  revalidatePath(`/contracts/${validated.contract_id}/history`)
  revalidatePath(`/events/${contract.event_id}`)

  return { success: true, summary }
}
