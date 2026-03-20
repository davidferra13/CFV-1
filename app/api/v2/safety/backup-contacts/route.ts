// API v2: Safety Backup Contacts - List & Create
// GET  /api/v2/safety/backup-contacts
// POST /api/v2/safety/backup-contacts

import { NextRequest } from 'next/server'
import { withApiAuth, apiSuccess, apiCreated, apiError } from '@/lib/api/v2'
import { getBackupContacts, addBackupContact } from '@/lib/safety/backup-chef-actions'

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const contacts = await getBackupContacts()
      return apiSuccess(contacts)
    } catch (err) {
      console.error('[api/v2/safety/backup-contacts] GET error:', err)
      return apiError('fetch_failed', 'Failed to fetch backup contacts', 500)
    }
  },
  { scopes: ['safety:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    try {
      const contact = await addBackupContact(body as any)
      return apiCreated(contact)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add backup contact'
      console.error('[api/v2/safety/backup-contacts] POST error:', err)
      return apiError('create_failed', message, 500)
    }
  },
  { scopes: ['safety:write'] }
)
