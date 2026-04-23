'use client'

import { useState, useTransition } from 'react'
import { saveTwilioCredentials, removeTwilioCredentials } from '@/lib/comms/twilio-byo-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  connected: boolean
  phoneNumber: string | null
  accountSid: string | null
  inboundWebhookUrl: string
  statusCallbackUrl: string
}

export function TwilioByoSetup({
  connected,
  phoneNumber,
  accountSid,
  inboundWebhookUrl,
  statusCallbackUrl,
}: Props) {
  const [open, setOpen] = useState(false)
  const [sid, setSid] = useState('')
  const [token, setToken] = useState('')
  const [phone, setPhone] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSave() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await saveTwilioCredentials({
        accountSid: sid.trim(),
        authToken: token.trim(),
        phoneNumber: phone.trim(),
      })
      if (result.success) {
        setSuccess(true)
        setOpen(false)
        setSid('')
        setToken('')
        setPhone('')
      } else {
        setError(result.error || 'Failed to save')
      }
    })
  }

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      await removeTwilioCredentials()
    })
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-100">SMS (Twilio)</h3>
            {connected ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="default">Not connected</Badge>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Connect your own Twilio account to send and receive SMS through ChefFlow.
          </p>
          {connected && phoneNumber && (
            <p className="text-xs text-stone-300 mt-1">
              Number: <span className="font-mono">{phoneNumber}</span>
              {accountSid && (
                <span className="text-stone-500 ml-2">({accountSid.slice(0, 10)}...)</span>
              )}
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {connected ? (
            <>
              <Button variant="secondary" onClick={() => setOpen(!open)}>
                Update
              </Button>
              <Button variant="danger" onClick={handleRemove} disabled={isPending}>
                Remove
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setOpen(true)}>
              Connect
            </Button>
          )}
        </div>
      </div>

      {success && <p className="text-xs text-green-400">Twilio credentials saved.</p>}

      {open && (
        <div className="space-y-3 border-t border-stone-700 pt-4">
          <div>
            <label className="text-xs text-stone-400 mb-1 block">Account SID</label>
            <input
              type="text"
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="text-xs text-stone-400 mb-1 block">Auth Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Your Twilio auth token"
              className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="text-xs text-stone-400 mb-1 block">Phone Number (E.164)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+16175550100"
              className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isPending || !sid || !token || !phone}
            >
              Save credentials
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="space-y-1 text-xs text-stone-500">
            <p>
              Set your Twilio inbound webhook URL to:{' '}
              <span className="font-mono text-stone-400">{inboundWebhookUrl}</span>
            </p>
            <p>
              ChefFlow also sends per-message status callbacks to:{' '}
              <span className="font-mono text-stone-400">{statusCallbackUrl}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
