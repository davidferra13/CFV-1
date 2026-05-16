import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/db/server'
import {
  buildPolicyAcceptance,
  getRequiredPoliciesForRole,
  type LegalPolicyAcceptance,
} from '@/lib/legal/readiness'

type LegalDbRow = Record<string, any>

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  return createHash('sha256').update(ip).digest('hex')
}

async function requestMetadata() {
  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip')?.trim() || null

  return {
    ipHash: hashIp(ip),
    userAgent: hdrs.get('user-agent')?.slice(0, 512) ?? null,
  }
}

function legalSubjectTypeForRole(role: string): LegalPolicyAcceptance['subjectType'] {
  if (role === 'staff' || role === 'vendor' || role === 'partner' || role === 'guest') {
    return role
  }

  return 'user'
}

export async function recordPolicyAcceptancesForSubject(input: {
  role: string
  userId: string
  tenantId?: string | null
  subjectId?: string | null
  source: string
}) {
  const db: any = createServerClient({ admin: true })
  const meta = await requestMetadata()
  const requiredPolicies = getRequiredPoliciesForRole(input.role)

  const { data: policyRows, error: policyError } = await db
    .from('legal_policy_versions')
    .select('*')
    .in('policy_type', requiredPolicies)
    .order('created_at', { ascending: false })

  if (policyError) {
    return {
      success: false,
      acceptedCount: 0,
      warning: `Policy acceptance was not recorded: ${policyError.message}`,
    }
  }

  const newestPolicyByType = new Map<string, LegalDbRow>()
  for (const row of policyRows ?? []) {
    if (!newestPolicyByType.has(row.policy_type)) {
      newestPolicyByType.set(row.policy_type, row)
    }
  }

  const rows = []
  for (const policyType of requiredPolicies) {
    const policy = newestPolicyByType.get(policyType)
    if (!policy) continue

    const acceptance = buildPolicyAcceptance({
      policy: {
        id: policy.id,
        policyType: policy.policy_type,
        version: policy.version,
        status: policy.status,
        publicPath: policy.public_path,
        effectiveAt: policy.effective_at,
        materialChange: policy.material_change,
        requiresReacceptance: policy.requires_reacceptance,
        requiresProfessionalReview: policy.requires_professional_review,
      },
      role: input.role,
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      subjectType: legalSubjectTypeForRole(input.role),
      subjectId: input.subjectId ?? input.userId,
      acceptedAt: new Date().toISOString(),
      source: input.source,
      ...meta,
    })

    rows.push({
      policy_version_id: acceptance.policyVersionId,
      policy_type: acceptance.policyType,
      version: acceptance.version,
      user_id: acceptance.userId,
      tenant_id: acceptance.tenantId,
      subject_type: acceptance.subjectType,
      subject_id: acceptance.subjectId,
      role: acceptance.role,
      accepted_at: acceptance.acceptedAt,
      source: acceptance.source,
      reacceptance_required: acceptance.reacceptanceRequired,
      ip_hash: acceptance.ipHash,
      user_agent: acceptance.userAgent,
    })
  }

  if (rows.length === 0) {
    return {
      success: false,
      acceptedCount: 0,
      warning: 'Policy acceptance was not recorded: no matching policy versions were found',
    }
  }

  const { error } = await db.from('legal_policy_acceptances').insert(rows)
  if (error) {
    return {
      success: false,
      acceptedCount: 0,
      warning: `Policy acceptance was not recorded: ${error.message}`,
    }
  }

  return { success: true, acceptedCount: rows.length, warning: null }
}
