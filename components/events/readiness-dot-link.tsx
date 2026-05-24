import Link from 'next/link'

type ReadinessDotLinkProps = {
  label: 'Menu' | 'Contract' | 'Deposit'
  done: boolean
  eventId: string
}

const gapUrls: Record<ReadinessDotLinkProps['label'], (id: string) => string> = {
  Menu: (id) => `/events/${id}`,
  Contract: (id) => `/events/${id}/documents`,
  Deposit: (id) => `/events/${id}/billing`,
}

export function ReadinessDotLink({ label, done, eventId }: ReadinessDotLinkProps) {
  if (done) {
    return <span title={label} className="h-2 w-2 rounded-full bg-emerald-500 cursor-default" />
  }

  return (
    <Link
      href={gapUrls[label](eventId)}
      title={`Add ${label}`}
      aria-label={`Add ${label.toLowerCase()} for event`}
      className="h-2 w-2 rounded-full bg-stone-700 hover:bg-amber-500/60 transition-colors"
    />
  )
}
