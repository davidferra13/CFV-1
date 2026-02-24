'use client'

import { useState, useTransition } from 'react'
import { deactivateBackupContact } from '@/lib/safety/backup-chef-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BackupChefForm } from './backup-chef-form'

type Contact = {
  id: string
  name: string
  phone: string | null
  email: string | null
  specialties: string[] | null
  max_guest_count: number | null
  relationship: string | null
  is_active: boolean
}

export function BackupChefList({ contacts }: { contacts: Contact[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-500">
          {contacts.length === 0
            ? 'No backup contacts on file. Every chef needs a contingency plan.'
            : `${contacts.length} backup contact${contacts.length === 1 ? '' : 's'} on file`}
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          Add Backup Chef
        </Button>
      </div>

      {showForm && <BackupChefForm onClose={() => setShowForm(false)} />}

      {contacts.map((contact) => (
        <Card key={contact.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-100">{contact.name}</p>
                {contact.relationship && (
                  <p className="text-xs text-stone-500">{contact.relationship}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2 text-sm text-stone-400">
                  {contact.phone && <span>{contact.phone}</span>}
                  {contact.email && <span>{contact.email}</span>}
                </div>
                {contact.specialties && contact.specialties.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {contact.specialties.map((s) => (
                      <Badge key={s} variant="default">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
                {contact.max_guest_count && (
                  <p className="text-xs text-stone-400 mt-1">
                    Up to {contact.max_guest_count} guests
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => deactivateBackupContact(contact.id))}
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
