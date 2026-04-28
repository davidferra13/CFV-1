import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

test('voicemail transcript creates a chef quick note with supported columns only', async () => {
  const routePath = require.resolve('../../app/api/calling/voicemail/route.ts')
  const dbPath = require.resolve('../../lib/db/admin.ts')
  const broadcastPath = require.resolve('../../lib/realtime/broadcast.ts')
  const webhookAuthPath = require.resolve('../../lib/calling/twilio-webhook-auth.ts')
  const voiceAffectPath = require.resolve('../../lib/affective/voice-affect.ts')

  const originalRoute = require.cache[routePath]
  const originalDb = require.cache[dbPath]
  const originalBroadcast = require.cache[broadcastPath]
  const originalWebhookAuth = require.cache[webhookAuthPath]
  const originalVoiceAffect = require.cache[voiceAffectPath]

  const quickNoteInserts: Array<Record<string, unknown>> = []
  const aiCallUpdates: Array<Record<string, unknown>> = []

  require.cache[dbPath] = {
    exports: {
      createAdminClient: () => ({
        from(table: string) {
          if (table === 'ai_calls') {
            return {
              update(payload: Record<string, unknown>) {
                aiCallUpdates.push(payload)
                return this
              },
              eq(field: string, value: string) {
                assert.equal(field, 'id')
                assert.equal(value, 'call-1')
                return this
              },
              select(selection: string) {
                assert.equal(selection, 'chef_id, contact_phone, contact_name')
                return this
              },
              single() {
                return Promise.resolve({
                  data: {
                    chef_id: 'chef-1',
                    contact_phone: '+15551234567',
                    contact_name: 'Avery Client',
                  },
                })
              },
            }
          }

          if (table === 'chef_quick_notes') {
            return {
              insert(payload: Record<string, unknown>) {
                quickNoteInserts.push(payload)
                return Promise.resolve({ data: null, error: null })
              },
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
      }),
    },
  } as NodeJS.Module

  require.cache[broadcastPath] = {
    exports: {
      broadcast: async () => undefined,
    },
  } as NodeJS.Module

  require.cache[webhookAuthPath] = {
    exports: {
      validateTwilioWebhook: async () => true,
    },
  } as NodeJS.Module

  require.cache[voiceAffectPath] = {
    exports: {
      analyzeVoiceAffect: () => ({ urgency: 'normal' }),
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/calling/voicemail?aiCallId=call-1', {
        method: 'POST',
        body: new URLSearchParams({
          TranscriptionText: 'Need to confirm Friday dinner.',
          RecordingUrl: 'https://api.twilio.com/recording/RE123',
          TranscriptionStatus: 'completed',
        }).toString(),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': 'sig',
        },
      })
    )

    assert.equal(response.status, 200)
    assert.equal(aiCallUpdates.length, 1)
    assert.equal(aiCallUpdates[0].full_transcript, 'Need to confirm Friday dinner.')
    assert.equal(quickNoteInserts.length, 1)
    assert.deepEqual(quickNoteInserts[0], {
      chef_id: 'chef-1',
      text: 'Voicemail from Avery Client: "Need to confirm Friday dinner."',
      status: 'raw',
    })
    assert.equal('source' in quickNoteInserts[0], false)
  } finally {
    restoreModule(routePath, originalRoute)
    restoreModule(dbPath, originalDb)
    restoreModule(broadcastPath, originalBroadcast)
    restoreModule(webhookAuthPath, originalWebhookAuth)
    restoreModule(voiceAffectPath, originalVoiceAffect)
  }
})
