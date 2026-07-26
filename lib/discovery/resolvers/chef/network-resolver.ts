import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

/**
 * Surfaces chef network activity and referral opportunities.
 * Tables: client_referrals, chef_connections, chef_network_posts
 */
export async function resolveNetworkActivity(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')
  const items: GodModeResolvedItem[] = []

  // Part 1: Pending referrals (someone referred a client to this chef)
  try {
    const result = await pgClient`
      SELECT
        cr.id,
        cr.referrer_client_id as "referrerClientId",
        -- The referred party is a client row, not free text on the referral.
        rfc.full_name as "referredName",
        rfc.email as "referredEmail",
        cr.status,
        cr.created_at as "createdAt",
        rc.full_name as "referrerName"
      FROM client_referrals cr
      LEFT JOIN clients rc ON rc.id = cr.referrer_client_id
      LEFT JOIN clients rfc ON rfc.id = cr.referred_client_id
      WHERE cr.tenant_id = ${ctx.tenantId}
        AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
      LIMIT 5
    `
    const referrals = result as unknown as {
      id: string
      referredName: string | null
      referredEmail: string | null
      referrerName: string | null
      createdAt: string
    }[]

    for (const ref of referrals) {
      items.push({
        definitionId: `chef.referral_pending.${ref.id}`,
        tier: 'p3',
        label: `Referral: ${ref.referredName ?? ref.referredEmail ?? 'New lead'}`,
        context: ref.referrerName ? `From ${ref.referrerName}` : 'New referral received',
        destination: '/chef/clients/referrals',
        icon: 'user-plus',
        loopState: 'active',
        sourceKind: 'inquiry',
        evidenceLabel: 'confirmed',
        confidence: 1,
        nextAction: 'Review and reach out',
        data: {
          referralId: ref.id,
          referredName: ref.referredName,
        },
      })
    }
  } catch (err) {
    console.error('[network-resolver] Referrals query failed:', err)
  }

  // Part 2: Recent network posts from connected chefs (last 3 days)
  try {
    const result = await pgClient`
      SELECT
        csp.id,
        csp.chef_id as "chefId",
        csp.content,
        csp.created_at as "createdAt",
        ch.display_name as "chefName",
        ch.business_name as "businessName"
      FROM chef_social_posts csp
      -- chef_connections stores the pair as requester/addressee, not from/to.
      JOIN chef_connections cc ON (
        (cc.requester_id = ${ctx.tenantId} AND cc.addressee_id = csp.chef_id)
        OR (cc.addressee_id = ${ctx.tenantId} AND cc.requester_id = csp.chef_id)
      )
      JOIN chefs ch ON ch.id = csp.chef_id
      WHERE cc.status = 'accepted'
        AND csp.chef_id != ${ctx.tenantId}
        AND csp.created_at > (NOW() - INTERVAL '3 days')
      ORDER BY csp.created_at DESC
      LIMIT 5
    `
    const posts = result as unknown as {
      id: string
      chefId: string
      content: string
      createdAt: string
      chefName: string | null
      businessName: string
    }[]

    if (posts.length > 0) {
      const names = [...new Set(posts.map((p) => p.chefName ?? p.businessName))]
      const nameLabel = names.length <= 2 ? names.join(', ') : `${names[0]} +${names.length - 1}`

      items.push({
        definitionId: 'chef.network_activity',
        tier: 'p4',
        label: `Network: ${posts.length} new post${posts.length > 1 ? 's' : ''}`,
        context: `From ${nameLabel}`,
        destination: '/chef/network',
        icon: 'users',
        loopState: 'active',
        sourceKind: 'system',
        evidenceLabel: 'computed',
        confidence: 0.7,
        nextAction: 'Check chef network',
        data: {
          postCount: posts.length,
          chefNames: names,
        },
      })
    }
  } catch (err) {
    console.error('[network-resolver] Posts query failed:', err)
  }

  return items
}
