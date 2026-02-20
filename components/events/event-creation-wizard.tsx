'use client'

// Stub — EventCreationWizard to be implemented
// Accepts the client list and guides through multi-step event creation

interface Props {
  clients: Array<{ id: string; first_name?: string | null; last_name?: string | null; [key: string]: unknown }>
}

export function EventCreationWizard({ clients: _clients }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Create New Event</h1>
      <p className="text-stone-600">Guided event creation wizard coming soon.</p>
    </div>
  )
}
