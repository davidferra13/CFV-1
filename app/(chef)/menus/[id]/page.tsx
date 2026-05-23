// Menu Detail - Protected by layout

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMenuById, getMenuCostSummaries, getMenuEvent } from '@/lib/menus/actions'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/db/server'
import { MenuDetailClient } from './menu-detail-client'
import { getMenuRecommendations } from '@/lib/analytics/menu-recommendations'
import { MenuRecommendationHints } from '@/components/analytics/menu-recommendation-hints'
import { getMenuInquiryLink } from '@/lib/menus/menu-intelligence-actions'
import { evaluateCompletion } from '@/lib/completion/engine'
import { getEditorClientList, getCirclePickerList } from '@/lib/menus/editor-actions'
import { MenuContextDock } from '@/components/menus/menu-context-dock'
import { AuditSummaryBadge } from '@/components/audit-trail/audit-summary-badge'
import { AuditTimeline } from '@/components/audit-trail/audit-timeline'
import { fetchEntityHistory } from '@/lib/audit-trail/surface-actions'
import { SaveAsTemplateButton } from '@/components/menus/save-as-template-button'
import { CloneMenuButton } from '@/components/menus/clone-menu-button'
import { MenuHealthScore } from '@/components/menus/menu-health-score'
import { MenuPdfButton } from '@/components/menus/menu-pdf-button'
import MenuHistoryTimeline from '@/components/menus/menu-history-timeline'
import { HandoffBar } from '@/components/rail/handoff-bar'
import { Suspense } from 'react'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

function AuditBadgeSkeleton() {
  return <div className="h-6 w-36 animate-pulse rounded-full bg-stone-800" />
}

export async function generateMetadata() {
  return { title: 'Menu Details | ChefFlow' }
}

export default async function MenuDetailPage({ params }: Props) {
  const user = await requireChef()
  const { id } = await params

  // Critical fetch: menu itself (notFound if missing)
  const menu = await getMenuById(id)
  if (!menu) {
    notFound()
  }

  // Non-critical fetches: degrade gracefully on failure
  const [event, costSummaries] = await Promise.all([
    getMenuEvent(id).catch((err) => {
      console.error('[menu-detail] Event fetch failed (non-blocking):', err.message)
      return null
    }),
    getMenuCostSummaries().catch((err) => {
      console.error('[menu-detail] Cost summaries fetch failed (non-blocking):', err.message)
      return [] as Awaited<ReturnType<typeof getMenuCostSummaries>>
    }),
  ])

  // Collect recipe_ids from components to fetch recipe names
  const recipeIds = new Set<string>()
  for (const dish of menu.dishes) {
    for (const comp of dish.components) {
      if (comp.recipe_id) {
        recipeIds.add(comp.recipe_id)
      }
    }
  }

  const [
    recipeMapResult,
    recommendations,
    inquiryLink,
    completionData,
    clientList,
    circleList,
    auditHistory,
  ] = await Promise.all([
    recipeIds.size > 0
      ? createServerClient()
          .from('recipes' as any)
          .select(
            'id, name, category, status, calories_per_serving, protein_per_serving_g, fat_per_serving_g, carbs_per_serving_g'
          )
          .in('id', Array.from(recipeIds))
          .eq('tenant_id', user.tenantId!)
          .then((res: any) => res)
          .catch((err: any) => {
            console.error('[menu-detail] Recipe map fetch failed (non-blocking):', err.message)
            return { data: null }
          })
      : Promise.resolve({ data: null }),
    getMenuRecommendations({
      dietaryRestrictions: (event as any)?.dietary_restrictions ?? [],
      allergies: (event as any)?.allergies ?? [],
    }).catch(() => null),
    getMenuInquiryLink(id).catch(() => null),
    evaluateCompletion('menu', id, user.tenantId!).catch(() => null),
    getEditorClientList().catch(() => []),
    getCirclePickerList().catch(() => []),
    fetchEntityHistory('menu', id).catch(() => []),
  ])

  let recipeMap: Record<
    string,
    {
      id: string
      name: string
      category: string
      status: 'stub' | 'draft' | 'active' | 'archived' | null
      calories_per_serving: number | null
      protein_per_serving_g: number | null
      fat_per_serving_g: number | null
      carbs_per_serving_g: number | null
    }
  > = {}
  if (recipeMapResult.data) {
    recipeMap = Object.fromEntries((recipeMapResult.data as any[]).map((r: any) => [r.id, r]))
  }

  // Resolve context dock data from menu record
  const menuClientId = (menu as any).client_id ?? null
  const menuCircleId = (menu as any).dinner_circle_group_id ?? null
  const menuVisibleToCircle = (menu as any).visible_to_dinner_circle ?? false
  const resolvedClient = menuClientId ? clientList.find((c) => c.id === menuClientId) : null
  const resolvedCircle = menuCircleId ? circleList.find((c) => c.id === menuCircleId) : null

  return (
    <div className="space-y-6">
      <HandoffBar entityType="menu" entityId={id} />
      {inquiryLink && (
        <div className="flex items-center gap-2 px-1">
          <Link
            href={`/inquiries/${inquiryLink.inquiryId}`}
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            ← Back to Inquiry
          </Link>
          {inquiryLink.inquiryStatus && (
            <span className="text-xs text-stone-500">
              ({inquiryLink.inquiryStatus.replace(/_/g, ' ')})
            </span>
          )}
        </div>
      )}
      <MenuContextDock
        menuId={menu.id}
        locked={menu.status === 'locked'}
        clientId={menuClientId}
        clientName={resolvedClient?.full_name ?? null}
        circleId={menuCircleId}
        circleName={resolvedCircle?.name ?? null}
        circleEmoji={resolvedCircle?.emoji ?? null}
        visibleToCircle={menuVisibleToCircle}
        event={event}
        clients={clientList}
        circles={circleList}
      />
      <MenuHealthScore menuId={id} className="px-1" />
      <div className="flex items-center gap-2 flex-wrap px-1">
        <SaveAsTemplateButton menuId={id} menuName={menu.name} />
        <CloneMenuButton menuId={id} />
        <MenuPdfButton menuId={id} menuName={menu.name} />
      </div>
      <div className="px-1">
        <Suspense fallback={<AuditBadgeSkeleton />}>
          <AuditSummaryBadge entityType="menu" entityId={id} />
        </Suspense>
      </div>
      <MenuDetailClient
        menu={menu}
        event={event}
        recipeMap={recipeMap}
        costSummary={costSummaries.find((summary) => summary.menu_id === menu.id) || null}
        initialCompletion={completionData}
      />
      {recommendations && <MenuRecommendationHints result={recommendations} />}
      {auditHistory && auditHistory.length > 0 && (
        <AuditTimeline entries={auditHistory} title="Menu Change History" />
      )}
      {menuClientId && <MenuHistoryTimeline clientId={menuClientId} />}
    </div>
  )
}
