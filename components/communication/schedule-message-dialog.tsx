'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScheduleMessageForm } from './schedule-message-form'

interface ScheduleMessageDialogProps {
  clientId: string
  clientName: string
}

export function ScheduleMessageDialog({ clientId, clientName }: ScheduleMessageDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Clock className="h-4 w-4 mr-2" />
        Schedule Message
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <h2 className="text-sm font-semibold text-stone-100">Schedule Message</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-500 hover:text-stone-300 text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <ScheduleMessageForm
                recipientId={clientId}
                recipientName={clientName}
                contextType="client"
                contextId={clientId}
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
