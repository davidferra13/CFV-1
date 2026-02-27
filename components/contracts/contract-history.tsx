import {
  addContractSigner,
  createContractVersion,
  type ContractSigner,
  type ContractVersion,
} from '@/lib/contracts/advanced-contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type SigningSummary = {
  requiredCount: number
  signedCount: number
  pendingCount: number
  fullySigned: boolean
}

function shortDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export function ContractHistory({
  contractId,
  versions,
  signers,
  summary,
}: {
  contractId: string
  versions: ContractVersion[]
  signers: ContractSigner[]
  summary: SigningSummary
}) {
  async function createVersionAction(formData: FormData) {
    'use server'

    const bodySnapshot = String(formData.get('body_snapshot') || '').trim()
    const changeNote = String(formData.get('change_note') || '').trim() || undefined
    await createContractVersion(contractId, {
      body_snapshot: bodySnapshot,
      change_note: changeNote,
    })
  }

  async function addSignerAction(formData: FormData) {
    'use server'

    const signerName = String(formData.get('signer_name') || '').trim()
    const signerEmail = String(formData.get('signer_email') || '').trim()
    const signerRole = String(formData.get('signer_role') || 'client')
    const signingOrder = Number(formData.get('signing_order') || 1)
    const required = formData.get('required') === 'on'

    await addContractSigner(contractId, {
      signer_name: signerName,
      signer_email: signerEmail,
      signer_role: signerRole as 'client' | 'chef' | 'witness' | 'co_host',
      signing_order: Number.isFinite(signingOrder) ? Math.max(1, signingOrder) : 1,
      required,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Signing Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Required</p>
            <p className="text-lg font-semibold text-stone-100">{summary.requiredCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Signed</p>
            <p className="text-lg font-semibold text-stone-100">{summary.signedCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Pending</p>
            <p className="text-lg font-semibold text-stone-100">{summary.pendingCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Status</p>
            <p className="text-lg font-semibold text-stone-100">
              {summary.fullySigned ? 'Fully signed' : 'In progress'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {signers.length === 0 ? (
            <p className="text-sm text-stone-400">No signers have been added yet.</p>
          ) : (
            <div className="space-y-2">
              {signers.map((signer) => (
                <div
                  key={signer.id}
                  className="flex items-center justify-between rounded-md border border-stone-700 bg-stone-900 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      {signer.signer_name} ({signer.signer_role})
                    </p>
                    <p className="text-xs text-stone-400">{signer.signer_email}</p>
                  </div>
                  <div className="text-right text-xs text-stone-400">
                    <p>Order: {signer.signing_order}</p>
                    <p>{signer.signed_at ? `Signed ${shortDate(signer.signed_at)}` : 'Pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form
            action={addSignerAction}
            className="grid gap-3 rounded-md border border-stone-700 p-3 md:grid-cols-5"
          >
            <input
              name="signer_name"
              required
              placeholder="Signer name"
              className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
            />
            <input
              name="signer_email"
              type="email"
              required
              placeholder="Signer email"
              className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
            />
            <select
              name="signer_role"
              className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
              defaultValue="client"
            >
              <option value="client">Client</option>
              <option value="chef">Chef</option>
              <option value="co_host">Co-host</option>
              <option value="witness">Witness</option>
            </select>
            <input
              name="signing_order"
              type="number"
              min={1}
              defaultValue={1}
              className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-stone-300">
                <input type="checkbox" name="required" defaultChecked />
                Required
              </label>
              <Button type="submit" size="sm">
                Add signer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {versions.length === 0 ? (
            <p className="text-sm text-stone-400">No versions have been recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <details key={version.id} className="rounded-md border border-stone-700">
                  <summary className="cursor-pointer px-3 py-2 text-sm text-stone-100">
                    Version {version.version_number} | {shortDate(version.created_at)}
                  </summary>
                  <div className="border-t border-stone-700 p-3">
                    {version.change_note && (
                      <p className="mb-2 text-xs text-stone-400">Note: {version.change_note}</p>
                    )}
                    <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-stone-900 p-3 text-xs text-stone-200">
                      {version.body_snapshot}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          )}

          <form
            action={createVersionAction}
            className="space-y-3 rounded-md border border-stone-700 p-3"
          >
            <textarea
              name="body_snapshot"
              required
              rows={10}
              defaultValue={versions[0]?.body_snapshot || ''}
              className="w-full rounded-md border border-stone-700 bg-stone-900 p-3 text-sm text-stone-100"
              placeholder="Paste the updated contract body to record a new version"
            />
            <input
              name="change_note"
              placeholder="Optional change note"
              className="h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
            />
            <div className="flex justify-end">
              <Button type="submit">Create version</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
