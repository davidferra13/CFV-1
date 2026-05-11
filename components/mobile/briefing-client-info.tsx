'use client'

import { Users, Phone } from '@/components/ui/icons'

export function BriefingClientInfo({
  clientName,
  phone,
}: {
  clientName: string
  phone: string | null
}) {
  const isPhone = phone && /[\d()+\-\s]/.test(phone) && !phone.includes('@')

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-stone-400" />
        <span className="text-lg font-semibold text-stone-100">{clientName}</span>
      </div>

      {phone && (
        <a
          href={isPhone ? `tel:${phone}` : `mailto:${phone}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-200 hover:bg-stone-700 active:scale-95 transition-all"
        >
          <Phone className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isPhone ? 'Call' : 'Email'}
          </span>
        </a>
      )}
    </div>
  )
}
