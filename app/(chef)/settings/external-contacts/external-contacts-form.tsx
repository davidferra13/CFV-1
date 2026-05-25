'use client'

import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveExternalContacts } from './actions'

interface ExternalContactsData {
  bankUrl: string
  accountantEmail: string
  lawyerPhone: string
  lawyerEmail: string
  insurancePortalUrl: string
  websiteAdminUrl: string
  commissaryUrl: string
}

export function ExternalContactsForm({ initialData }: { initialData: ExternalContactsData }) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ExternalContactsData>(initialData)

  function update(field: keyof ExternalContactsData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await saveExternalContacts(data)
        if (result.success) {
          toast.success('External contacts saved')
        } else {
          toast.error(result.error ?? 'Failed to save')
        }
      } catch {
        toast.error('Failed to save external contacts')
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
      className="space-y-6"
    >
      {/* Financial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankUrl">Bank Portal URL</Label>
            <Input
              id="bankUrl"
              type="url"
              placeholder="https://www.yourbank.com/login"
              value={data.bankUrl}
              onChange={(e) => update('bankUrl', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountantEmail">Accountant Email</Label>
            <Input
              id="accountantEmail"
              type="email"
              placeholder="accountant@example.com"
              value={data.accountantEmail}
              onChange={(e) => update('accountantEmail', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lawyerPhone">Lawyer Phone</Label>
            <Input
              id="lawyerPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={data.lawyerPhone}
              onChange={(e) => update('lawyerPhone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lawyerEmail">Lawyer Email</Label>
            <Input
              id="lawyerEmail"
              type="email"
              placeholder="lawyer@lawfirm.com"
              value={data.lawyerEmail}
              onChange={(e) => update('lawyerEmail', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="insurancePortalUrl">Insurance Portal URL</Label>
            <Input
              id="insurancePortalUrl"
              type="url"
              placeholder="https://portal.insurance.com"
              value={data.insurancePortalUrl}
              onChange={(e) => update('insurancePortalUrl', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteAdminUrl">Website Admin URL</Label>
            <Input
              id="websiteAdminUrl"
              type="url"
              placeholder="https://admin.yoursite.com"
              value={data.websiteAdminUrl}
              onChange={(e) => update('websiteAdminUrl', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commissaryUrl">Commissary URL</Label>
            <Input
              id="commissaryUrl"
              type="url"
              placeholder="https://commissary.example.com"
              value={data.commissaryUrl}
              onChange={(e) => update('commissaryUrl', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
