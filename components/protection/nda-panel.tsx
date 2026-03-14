'use client'

import { useState, useTransition } from 'react'
import { updateNDA } from '@/lib/clients/nda-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { toast } from 'sonner'

type NDAData = {
  nda_active: boolean
  nda_coverage: string | null
  nda_effective_date: string | null
  nda_expiry_date: string | null
  nda_document_url: string | null
  photo_permission: string
}

const PHOTO_OPTIONS = [
  { value: 'none', label: 'No permission' },
  { value: 'portfolio_only', label: 'Portfolio only' },
  { value: 'public_with_approval', label: 'Public with approval' },
  { value: 'public_freely', label: 'Public use freely' },
]

export function NDAPanel({ clientId, initial }: { clientId: string; initial: NDAData }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [ndaActive, setNdaActive] = useState(initial.nda_active)
  const [coverage, setCoverage] = useState(initial.nda_coverage ?? '')
  const [effectiveDate, setEffectiveDate] = useState(initial.nda_effective_date ?? '')
  const [expiryDate, setExpiryDate] = useState(initial.nda_expiry_date ?? '')
  const [documentUrl, setDocumentUrl] = useState(initial.nda_document_url ?? '')
  const [photoPermission, setPhotoPermission] = useState(initial.photo_permission ?? 'none')

  function handleSave() {
    startTransition(async () => {
      try {
        await updateNDA(clientId, {
          nda_active: ndaActive,
          nda_coverage: coverage || undefined,
          nda_effective_date: effectiveDate || undefined,
          nda_expiry_date: expiryDate || undefined,
          nda_document_url: documentUrl || undefined,
          photo_permission:
            (photoPermission as
              | 'none'
              | 'portfolio_only'
              | 'public_with_approval'
              | 'public_freely') || undefined,
        })
        setEditing(false)
      } catch (err) {
        toast.error('Failed to save NDA settings')
      }
    })
  }

  function handleCancel() {
    setNdaActive(initial.nda_active)
    setCoverage(initial.nda_coverage ?? '')
    setEffectiveDate(initial.nda_effective_date ?? '')
    setExpiryDate(initial.nda_expiry_date ?? '')
    setDocumentUrl(initial.nda_document_url ?? '')
    setPhotoPermission(initial.photo_permission ?? 'none')
    setEditing(false)
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-stone-500" />
            <CardTitle className="text-base">NDA & Photo Permissions</CardTitle>
            {initial.nda_active && <Badge variant="info">NDA Active</Badge>}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          {!editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-stone-500">NDA Status</p>
                  <p className="font-medium text-stone-100">
                    {initial.nda_active ? 'Active' : 'Not on file'}
                  </p>
                </div>
                <div>
                  <p className="text-stone-500">Photo Permission</p>
                  <p className="font-medium text-stone-100">
                    {PHOTO_OPTIONS.find((o) => o.value === initial.photo_permission)?.label ??
                      'None'}
                  </p>
                </div>
                {initial.nda_coverage && (
                  <div className="col-span-2">
                    <p className="text-stone-500">Coverage</p>
                    <p className="font-medium text-stone-100">{initial.nda_coverage}</p>
                  </div>
                )}
                {initial.nda_effective_date && (
                  <div>
                    <p className="text-stone-500">Effective</p>
                    <p className="font-medium text-stone-100">{initial.nda_effective_date}</p>
                  </div>
                )}
                {initial.nda_expiry_date && (
                  <div>
                    <p className="text-stone-500">Expires</p>
                    <p className="font-medium text-stone-100">{initial.nda_expiry_date}</p>
                  </div>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ndaActive}
                    onChange={(e) => setNdaActive(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-600"
                  />
                  <span className="text-sm font-medium text-stone-300">NDA Active</span>
                </label>
              </div>

              {ndaActive && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Coverage
                    </label>
                    <input
                      type="text"
                      value={coverage}
                      onChange={(e) => setCoverage(e.target.value)}
                      placeholder="What the NDA covers"
                      className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="nda-effective-date"
                        className="block text-sm font-medium text-stone-300 mb-1"
                      >
                        Effective Date
                      </label>
                      <input
                        id="nda-effective-date"
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        title="NDA effective date"
                        className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="nda-expiry-date"
                        className="block text-sm font-medium text-stone-300 mb-1"
                      >
                        Expiry Date
                      </label>
                      <input
                        id="nda-expiry-date"
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        title="NDA expiry date"
                        className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Document URL
                    </label>
                    <input
                      type="url"
                      value={documentUrl}
                      onChange={(e) => setDocumentUrl(e.target.value)}
                      placeholder="Link to NDA document"
                      className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="nda-photo-permission"
                  className="block text-sm font-medium text-stone-300 mb-1"
                >
                  Photo Permission
                </label>
                <select
                  id="nda-photo-permission"
                  value={photoPermission}
                  onChange={(e) => setPhotoPermission(e.target.value)}
                  title="Photo permission level"
                  className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                >
                  {PHOTO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
