'use client'

import Link from 'next/link'
import { Users, Crown, ArrowRight } from 'lucide-react'
import type { HouseholdWithMembers } from '@/lib/households/actions'

const RELATIONSHIP_LABELS: Record<string, string> = {
  partner: 'Partner',
  child: 'Child',
  family_member: 'Family',
  regular_guest: 'Regular Guest',
}

interface HouseholdCardProps {
  household: HouseholdWithMembers
}

export function HouseholdCard({ household }: HouseholdCardProps) {
  return (
    <Link
      href={`/households/${household.id}`}
      className="block p-4 rounded-xl border border-stone-200 bg-white hover:border-brand-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-4.5 h-4.5 text-brand-600" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">{household.name}</h3>
            <p className="text-xs text-stone-500">
              {household.members.length} member{household.members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-stone-300 mt-1" />
      </div>

      {household.members.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {household.members.map((member) => (
            <span
              key={member.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-700"
            >
              {member.client_id === household.primary_client_id && (
                <Crown className="w-3 h-3 text-amber-500" />
              )}
              {member.client_name || 'Unknown'}
              <span className="text-stone-400">
                ({RELATIONSHIP_LABELS[member.relationship] || member.relationship})
              </span>
            </span>
          ))}
        </div>
      )}

      {household.notes && (
        <p className="mt-2 text-xs text-stone-500 line-clamp-2">{household.notes}</p>
      )}
    </Link>
  )
}
