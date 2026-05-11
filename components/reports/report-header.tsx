// Report Header - Event/client info for cost report

interface ReportHeaderProps {
  eventName: string
  eventDate: string
  clientName: string
  guestCount: number | null
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function ReportHeader({ eventName, eventDate, clientName, guestCount }: ReportHeaderProps) {
  return (
    <div className="border-b border-stone-700 pb-6 print:border-stone-300">
      <h1 className="text-2xl font-bold text-stone-100 print:text-stone-900">
        Event Cost Report
      </h1>
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-stone-400 print:text-stone-500">Event</span>
          <p className="font-medium text-stone-200 print:text-stone-800">{eventName}</p>
        </div>
        <div>
          <span className="text-stone-400 print:text-stone-500">Date</span>
          <p className="font-medium text-stone-200 print:text-stone-800">{formatDate(eventDate)}</p>
        </div>
        <div>
          <span className="text-stone-400 print:text-stone-500">Client</span>
          <p className="font-medium text-stone-200 print:text-stone-800">{clientName}</p>
        </div>
        <div>
          <span className="text-stone-400 print:text-stone-500">Guests</span>
          <p className="font-medium text-stone-200 print:text-stone-800">
            {guestCount ?? 'Not set'}
          </p>
        </div>
      </div>
    </div>
  )
}
