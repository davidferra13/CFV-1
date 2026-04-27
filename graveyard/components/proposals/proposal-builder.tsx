'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  createClientProposal,
  updateClientProposal,
  sendProposal,
} from '@/lib/proposals/client-proposal-actions'
import type { ClientProposal, ProposalAddonEntry } from '@/lib/proposals/client-proposal-actions'
import type { ProposalTemplate } from '@/lib/proposals/template-actions'
import type { ProposalAddon } from '@/lib/proposals/addon-actions'

type Menu = {
  id: string
  name: string
  description?: string | null
}

type ProposalBuilderProps = {
  proposal?: ClientProposal
  templates: ProposalTemplate[]
  menus: Menu[]
  addons: ProposalAddon[]
}

export function ProposalBuilder({ proposal, templates, menus, addons }: ProposalBuilderProps) {
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedProposal, setSavedProposal] = useState<ClientProposal | null>(proposal || null)

  // Form state
  const [title, setTitle] = useState(proposal?.title || '')
  const [personalNote, setPersonalNote] = useState(proposal?.personalNote || '')
  const [selectedTemplateId, setSelectedTemplateId] = useState(proposal?.templateId || '')
  const [selectedMenuId, setSelectedMenuId] = useState(proposal?.menuId || '')
  const [totalPriceDollars, setTotalPriceDollars] = useState(
    proposal ? (proposal.totalPriceCents / 100).toFixed(2) : ''
  )
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(
    new Set((proposal?.selectedAddons || []).map((a) => a.addonId))
  )

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const selectedMenu = menus.find((m) => m.id === selectedMenuId)

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev)
      if (next.has(addonId)) {
        next.delete(addonId)
      } else {
        next.add(addonId)
      }
      return next
    })
  }

  function buildAddonsPayload(): ProposalAddonEntry[] {
    return addons
      .filter((a) => selectedAddonIds.has(a.id))
      .map((a) => ({
        addonId: a.id,
        name: a.name,
        priceCents: a.priceCentsPerPerson,
      }))
  }

  function handleSave() {
    setError(null)
    const priceCents = Math.round(parseFloat(totalPriceDollars || '0') * 100)

    startTransition(async () => {
      try {
        if (savedProposal) {
          const updated = await updateClientProposal(savedProposal.id, {
            title,
            personalNote: personalNote || undefined,
            totalPriceCents: priceCents,
            selectedAddons: buildAddonsPayload(),
            templateId: selectedTemplateId || null,
            menuId: selectedMenuId || null,
          })
          setSavedProposal(updated)
        } else {
          const created = await createClientProposal({
            title,
            personalNote: personalNote || undefined,
            totalPriceCents: priceCents,
            selectedAddons: buildAddonsPayload(),
            templateId: selectedTemplateId || undefined,
            menuId: selectedMenuId || undefined,
          })
          setSavedProposal(created)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save proposal')
      }
    })
  }

  function handleSend() {
    if (!savedProposal) return
    setError(null)

    startTransition(async () => {
      try {
        const sent = await sendProposal(savedProposal.id)
        setSavedProposal(sent)

        // Copy share URL to clipboard
        const shareUrl = `${window.location.origin}/proposal/${sent.shareToken}`
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send proposal')
      }
    })
  }

  function handleCopyLink() {
    if (!savedProposal) return
    const shareUrl = `${window.location.origin}/proposal/${savedProposal.shareToken}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  // Calculate total including add-ons
  const basePriceCents = Math.round(parseFloat(totalPriceDollars || '0') * 100)
  const addonTotal = buildAddonsPayload().reduce((sum, a) => sum + a.priceCents, 0)
  const grandTotalCents = basePriceCents + addonTotal

  if (showPreview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-100">Preview</h2>
          <Button variant="ghost" onClick={() => setShowPreview(false)}>
            Back to Editor
          </Button>
        </div>

        <Card>
          <CardContent className="py-8 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-stone-100">{title || 'Untitled Proposal'}</h1>
              {personalNote && (
                <p className="mt-4 text-stone-300 max-w-lg mx-auto italic">
                  &quot;{personalNote}&quot;
                </p>
              )}
            </div>

            {selectedMenu && (
              <div className="pt-4 border-t border-stone-800">
                <h3 className="text-lg font-semibold text-stone-100 mb-2">Menu</h3>
                <p className="text-stone-200">{selectedMenu.name}</p>
                {selectedMenu.description && (
                  <p className="text-sm text-stone-400 mt-1">{selectedMenu.description}</p>
                )}
              </div>
            )}

            {buildAddonsPayload().length > 0 && (
              <div className="pt-4 border-t border-stone-800">
                <h3 className="text-lg font-semibold text-stone-100 mb-2">Add-ons</h3>
                <ul className="space-y-1">
                  {buildAddonsPayload().map((addon) => (
                    <li key={addon.addonId} className="flex justify-between text-stone-300">
                      <span>{addon.name}</span>
                      <span>${(addon.priceCents / 100).toFixed(2)}/person</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-stone-800 text-right">
              <p className="text-2xl font-bold text-stone-100">
                ${(grandTotalCents / 100).toFixed(2)}
              </p>
              {addonTotal > 0 && (
                <p className="text-sm text-stone-400">
                  Base: ${(basePriceCents / 100).toFixed(2)} + Add-ons: $
                  {(addonTotal / 100).toFixed(2)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-100">
          {savedProposal ? 'Edit Proposal' : 'New Proposal'}
        </h2>
        {savedProposal && (
          <Badge
            variant={
              savedProposal.status === 'approved'
                ? 'success'
                : savedProposal.status === 'declined'
                  ? 'error'
                  : savedProposal.status === 'sent' || savedProposal.status === 'viewed'
                    ? 'info'
                    : 'default'
            }
          >
            {savedProposal.status}
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Proposal Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Anniversary Dinner for the Johnsons"
            />
          </div>

          <div>
            <Label htmlFor="note">Personal Note to Client</Label>
            <Textarea
              id="note"
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="A personal touch goes a long way. Tell your client why this menu is perfect for them."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="price">Total Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={totalPriceDollars}
              onChange={(e) => setTotalPriceDollars(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value)
                const t = templates.find((tmpl) => tmpl.id === e.target.value)
                if (t) {
                  if (!title) setTitle(t.name)
                  if (!totalPriceDollars && t.basePriceCents > 0) {
                    setTotalPriceDollars((t.basePriceCents / 100).toFixed(2))
                  }
                }
              }}
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.basePriceCents > 0 ? `($${(t.basePriceCents / 100).toFixed(2)})` : ''}
                </option>
              ))}
            </select>
            {selectedTemplate?.description && (
              <p className="mt-2 text-sm text-stone-400">{selectedTemplate.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {menus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={selectedMenuId}
              onChange={(e) => setSelectedMenuId(e.target.value)}
            >
              <option value="">No menu selected</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {selectedMenu?.description && (
              <p className="mt-2 text-sm text-stone-400">{selectedMenu.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {addons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {addons.map((addon) => (
                <label
                  key={addon.id}
                  className="flex items-center justify-between rounded-lg border border-stone-700 p-3 cursor-pointer hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAddonIds.has(addon.id)}
                      onChange={() => toggleAddon(addon.id)}
                      className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-stone-100">{addon.name}</p>
                      {addon.description && (
                        <p className="text-xs text-stone-400">{addon.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-stone-300">
                    ${(addon.priceCentsPerPerson / 100).toFixed(2)}/person
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grand total */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-stone-300">Grand Total</span>
            <span className="text-2xl font-bold text-stone-100">
              ${(grandTotalCents / 100).toFixed(2)}
            </span>
          </div>
          {addonTotal > 0 && (
            <p className="text-xs text-stone-400 text-right mt-1">
              Base: ${(basePriceCents / 100).toFixed(2)} + Add-ons: ${(addonTotal / 100).toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={isPending || !title}>
          {isPending ? 'Saving...' : savedProposal ? 'Save Changes' : 'Create Proposal'}
        </Button>

        <Button variant="secondary" onClick={() => setShowPreview(true)} disabled={!title}>
          Preview
        </Button>

        {savedProposal && savedProposal.status === 'draft' && (
          <Button variant="primary" onClick={handleSend} disabled={isPending}>
            {isPending ? 'Sending...' : 'Send to Client'}
          </Button>
        )}

        {savedProposal && (
          <Button variant="ghost" onClick={handleCopyLink}>
            {copied ? 'Copied!' : 'Copy Share Link'}
          </Button>
        )}
      </div>

      {savedProposal && (
        <p className="text-xs text-stone-500">
          Share URL: {typeof window !== 'undefined' ? window.location.origin : ''}/proposal/
          {savedProposal.shareToken}
        </p>
      )}
    </div>
  )
}
