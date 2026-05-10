'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from '@/components/ui/icons'
import type { PipelineStageData, PipelineItem } from './pipeline-types'

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getItemHref(item: PipelineItem): string {
  switch (item.type) {
    case 'inquiry':
      return `/inquiries/${item.id}`
    case 'proposal':
      return '/proposals'
    case 'contract':
      return '/contracts'
    case 'event':
      return `/events/${item.id}`
    default:
      return '#'
  }
}

function scoreBadgeVariant(label: 'hot' | 'warm' | 'cold'): 'error' | 'warning' | 'info' {
  switch (label) {
    case 'hot':
      return 'error'
    case 'warm':
      return 'warning'
    case 'cold':
      return 'info'
  }
}

function isExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const now = new Date()
  const expiry = new Date(expiresAt)
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysUntil <= 7 && daysUntil > 0
}

interface StageAction {
  label: string
  onClick: (itemId: string) => void
  variant?: string
}

interface PipelineStageSectionProps {
  stage: PipelineStageData
  actions?: StageAction[]
}

export function PipelineStageSection({ stage, actions }: PipelineStageSectionProps) {
  const defaultExpanded = stage.items.length <= 5
  const [expanded, setExpanded] = useState(defaultExpanded)

  const visibleItems = expanded ? stage.items : stage.items.slice(0, 5)
  const hasMore = stage.items.length > 5

  return (
    <Card id={`pipeline-stage-${stage.stage}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle as="h3">{stage.label}</CardTitle>
            <Badge>{stage.count}</Badge>
          </div>
          <span className="text-sm text-stone-400 tabular-nums">
            {formatDollars(stage.valueCents)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {stage.items.length === 0 ? (
          <div className="px-6 py-8 text-center text-stone-500 text-sm">No items in this stage</div>
        ) : (
          <div className="divide-y divide-stone-800">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="px-6 py-3 flex items-center gap-4 hover:bg-stone-800/40 transition-colors"
              >
                {/* Client and occasion */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={getItemHref(item)}
                    className="text-sm font-medium text-stone-100 hover:text-brand-400 transition-colors truncate block"
                  >
                    {item.clientName || 'Unknown Client'}
                  </Link>
                  {item.occasion && (
                    <span className="text-xs text-stone-500 truncate block">{item.occasion}</span>
                  )}
                </div>

                {/* Date */}
                {item.date && (
                  <span className="text-xs text-stone-400 tabular-nums whitespace-nowrap hidden sm:block">
                    {formatDate(item.date)}
                  </span>
                )}

                {/* Value */}
                <span className="text-sm text-stone-300 tabular-nums whitespace-nowrap">
                  {formatDollars(item.valueCents)}
                </span>

                {/* Status badge */}
                <Badge variant="default" className="whitespace-nowrap">
                  {item.status}
                </Badge>

                {/* Lead-specific badges */}
                {item.type === 'inquiry' && item.scoreLabel && (
                  <Badge variant={scoreBadgeVariant(item.scoreLabel)} className="whitespace-nowrap">
                    {item.scoreLabel}
                  </Badge>
                )}
                {item.type === 'inquiry' && item.channel && (
                  <Badge variant="info" className="whitespace-nowrap hidden md:inline-flex">
                    {item.channel}
                  </Badge>
                )}

                {/* Contract expiry warning */}
                {item.type === 'contract' && isExpiringSoon(item.expiresAt) && (
                  <Badge variant="warning" className="whitespace-nowrap">
                    Expiring soon
                  </Badge>
                )}

                {/* Action buttons */}
                {actions && actions.length > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    {actions.map((action) => (
                      <Button
                        key={action.label}
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault()
                          action.onClick(item.id)
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Expand/collapse toggle */}
        {hasMore && (
          <div className="px-6 py-2 border-t border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1 text-stone-400"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Show all {stage.items.length} items <ChevronDown size={14} />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
