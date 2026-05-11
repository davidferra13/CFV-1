import Link from 'next/link'
import { FileText, FlaskConical, PackageCheck, ShieldAlert } from 'lucide-react'
import {
  CannabisPageWrapper,
  CannabisPortalHeader,
} from '@/components/cannabis/cannabis-portal-header'
import {
  createRegulatedBatchRecordFromForm,
  createRegulatedCoa,
  getCannabisBatchRecordWorkspace,
} from '@/lib/chef/cannabis-batch-record-actions'

const PANEL_OPTIONS = [
  ['pass', 'Pass'],
  ['fail', 'Fail'],
  ['not_tested', 'Not tested'],
  ['not_applicable', 'N/A'],
] as const

function statusColor(status: string) {
  if (['accepted', 'ready_for_confirmation', 'released', 'finalized'].includes(status)) {
    return { background: '#1d3b22', color: '#d2e8d4', border: '1px solid #355f39' }
  }
  if (status === 'rejected') {
    return { background: '#4f1f1f', color: '#ffd8ce', border: '1px solid #7f3838' }
  }
  return { background: '#3b2b1d', color: '#ffd8a6', border: '1px solid #7f5a2b' }
}

function numberLabel(value: unknown, suffix = '') {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '-'
  return `${parsed.toFixed(3)}${suffix}`
}

export default async function CannabisBatchesPage() {
  const { events, coas, batches } = await getCannabisBatchRecordWorkspace()
  const acceptedCoas = coas.filter((coa: any) => coa.evaluation_status === 'accepted')

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <CannabisPortalHeader
          title="Batch Records & COA Intake"
          subtitle="Source lot provenance, lab panels, potency math, and release blockers"
          backHref="/cannabis/compliance"
          backLabel="Compliance"
          actions={
            <Link
              href="/cannabis/events"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
              style={{
                background: 'rgba(45, 122, 90, 0.25)',
                color: '#d2e8d4',
                border: '1px solid rgba(106, 170, 110, 0.35)',
              }}
            >
              Events
            </Link>
          }
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              .field {
                width: 100%;
                border-radius: 0.375rem;
                border: 1px solid #27432b;
                background: #0a130a;
                color: #d2e8d4;
                padding: 0.375rem 0.5rem;
              }
              .record-row {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 0.75rem;
                border-radius: 0.5rem;
                border: 1px solid #27432b;
                background: #0a130a;
                padding: 0.75rem;
              }
              .status-chip {
                flex-shrink: 0;
                border-radius: 0.375rem;
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: capitalize;
              }
            `,
          }}
        />

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
          <section
            className="rounded-xl p-4 space-y-4"
            style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#8ebf92]" />
              <h2 className="text-sm font-semibold text-[#d2e8d4]">COA Intake</h2>
            </div>
            <form
              action={async (fd: FormData) => {
                await createRegulatedCoa(fd)
              }}
              className="grid md:grid-cols-2 gap-3 text-xs"
            >
              <Field label="Event">
                <select name="eventId" className="field">
                  <option value="">Unassigned</option>
                  {events.map((event: any) => (
                    <option key={event.id} value={event.id}>
                      {(event.clients as any)?.full_name ?? 'Host'} -{' '}
                      {event.occasion ?? event.event_date}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Source type">
                <select name="sourceMaterialType" className="field" defaultValue="flower">
                  <option value="flower">Flower</option>
                  <option value="solvent_extract">Solvent extract</option>
                  <option value="solventless_extract">Solventless extract</option>
                  <option value="distillate">Distillate</option>
                  <option value="finished_liquid">Finished liquid</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Expected source lot">
                <input name="sourceLotNumber" required className="field" placeholder="LOT-42" />
              </Field>
              <Field label="COA lot">
                <input name="lotNumber" className="field" placeholder="Must match source lot" />
              </Field>
              <Field label="Lab">
                <input name="labName" required className="field" placeholder="ISO lab" />
              </Field>
              <Field label="Accreditation">
                <input name="labAccreditation" className="field" placeholder="ISO/IEC 17025" />
              </Field>
              <Field label="Sample date">
                <input name="sampleCollectedAt" type="date" className="field" />
              </Field>
              <Field label="Report date">
                <input name="reportIssuedAt" required type="date" className="field" />
              </Field>
              <Field label="Potency unit">
                <select name="potencyUnit" className="field" defaultValue="percent">
                  <option value="percent">Percent</option>
                  <option value="mg_g">mg/g</option>
                  <option value="mg_ml">mg/mL</option>
                </select>
              </Field>
              <Field label="COA file">
                <input
                  name="coaFile"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="field file:text-[#d2e8d4]"
                />
              </Field>
              {['thc', 'thca', 'cbd', 'cbda'].map((name) => (
                <Field key={name} label={name.toUpperCase()}>
                  <input name={name} type="number" step="0.001" min="0" className="field" />
                </Field>
              ))}
              {[
                ['pesticides', 'Pesticides'],
                ['heavyMetals', 'Heavy metals'],
                ['microbial', 'Microbial'],
                ['mycotoxins', 'Mycotoxins'],
                ['residualSolvents', 'Residual solvents'],
                ['foreignMaterial', 'Foreign material'],
              ].map(([name, label]) => (
                <Field key={name} label={label}>
                  <select name={name} className="field" defaultValue="not_tested">
                    {PANEL_OPTIONS.map(([value, optionLabel]) => (
                      <option key={value} value={value}>
                        {optionLabel}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
              <label className="md:col-span-2 text-[#6aaa6e]">
                Notes
                <textarea name="notes" rows={2} className="field mt-1" />
              </label>
              <button
                type="submit"
                className="md:col-span-2 rounded px-3 py-2 text-sm font-semibold"
                style={{ background: '#355f39', color: '#e8f5e9' }}
              >
                Save COA Intake
              </button>
            </form>
          </section>

          <section
            className="rounded-xl p-4 space-y-4"
            style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-[#8ebf92]" />
              <h2 className="text-sm font-semibold text-[#d2e8d4]">Create Batch Record</h2>
            </div>
            <form
              action={async (fd: FormData) => {
                await createRegulatedBatchRecordFromForm(fd)
              }}
              className="grid md:grid-cols-3 gap-3 text-xs"
            >
              <Field label="Event">
                <select name="eventId" className="field">
                  <option value="">Unassigned</option>
                  {events.map((event: any) => (
                    <option key={event.id} value={event.id}>
                      {(event.clients as any)?.full_name ?? 'Host'} -{' '}
                      {event.occasion ?? event.event_date}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Accepted COA">
                <select name="coaId" required className="field">
                  <option value="">Select COA</option>
                  {acceptedCoas.map((coa: any) => (
                    <option key={coa.id} value={coa.id}>
                      {coa.source_lot_number} - {coa.lab_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Batch code">
                <input name="batchCode" required className="field" placeholder="TINCTURE-001" />
              </Field>
              <Field label="Product name">
                <input
                  name="productName"
                  required
                  className="field"
                  placeholder="Dinner tincture"
                />
              </Field>
              <Field label="Product type">
                <select name="productType" className="field" defaultValue="infused_liquid">
                  <option value="infused_liquid">Infused liquid</option>
                  <option value="infused_oil">Infused oil</option>
                  <option value="infused_butter">Infused butter</option>
                  <option value="extract">Extract</option>
                  <option value="finished_food">Finished food</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Material name">
                <input name="sourceMaterialName" required className="field" />
              </Field>
              <Field label="Source type">
                <select name="sourceType" className="field" defaultValue="flower">
                  <option value="flower">Flower</option>
                  <option value="solvent_extract">Solvent extract</option>
                  <option value="solventless_extract">Solventless extract</option>
                  <option value="distillate">Distillate</option>
                  <option value="finished_liquid">Finished liquid</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Source lot">
                <input name="sourceLotNumber" required className="field" />
              </Field>
              <Field label="Provider">
                <select name="sourceProviderType" className="field" defaultValue="host_provided">
                  <option value="host_provided">Host provided</option>
                  <option value="supplier">Supplier</option>
                  <option value="chef_inventory">Chef inventory</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Supplier / host">
                <input name="sourceSupplierName" className="field" />
              </Field>
              <Field label="Received date">
                <input name="sourceReceivedDate" type="date" className="field" />
              </Field>
              <Field label="Initial mass (g)">
                <input
                  name="sourceInitialMassG"
                  required
                  type="number"
                  step="0.001"
                  className="field"
                />
              </Field>
              {[
                ['decarbEfficiency', 'Decarb', '0.9'],
                ['extractionEfficiency', 'Extraction', '0.8'],
                ['transferEfficiency', 'Transfer', '0.95'],
                ['retentionEfficiency', 'Retention', '1'],
              ].map(([name, label, value]) => (
                <Field key={name} label={`${label} efficiency`}>
                  <input
                    name={name}
                    required
                    type="number"
                    min="0"
                    max="1"
                    step="0.001"
                    defaultValue={value}
                    className="field"
                  />
                </Field>
              ))}
              <Field label="Final volume (mL)">
                <input name="finalVolumeMl" required type="number" step="0.001" className="field" />
              </Field>
              <Field label="Target dose (mg)">
                <input name="targetDoseMg" type="number" step="0.001" className="field" />
              </Field>
              <Field label="Label claim (mg/mL)">
                <input name="labelClaimMgPerMl" type="number" step="0.001" className="field" />
              </Field>
              <label className="md:col-span-3 text-[#6aaa6e]">
                Storage notes
                <textarea name="sourceStorageNotes" rows={2} className="field mt-1" />
              </label>
              <label className="md:col-span-3 text-[#6aaa6e]">
                Chain-of-custody note
                <textarea name="chainOfCustodyNote" rows={2} className="field mt-1" />
              </label>
              <button
                type="submit"
                className="md:col-span-3 rounded px-3 py-2 text-sm font-semibold"
                style={{ background: '#355f39', color: '#e8f5e9' }}
              >
                Create Batch Record
              </button>
            </form>
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <RecordList title="COA Queue" icon={<ShieldAlert className="h-4 w-4" />}>
            {coas.length === 0 ? (
              <EmptyState>No COAs have been captured.</EmptyState>
            ) : (
              coas.map((coa: any) => (
                <div key={coa.id} className="record-row">
                  <div>
                    <p className="text-sm font-semibold text-[#d2e8d4]">{coa.source_lot_number}</p>
                    <p className="text-xs text-[#8ebf92]">
                      {coa.lab_name} - {coa.report_issued_at}
                    </p>
                  </div>
                  <span className="status-chip" style={statusColor(coa.evaluation_status)}>
                    {coa.evaluation_status}
                  </span>
                </div>
              ))
            )}
          </RecordList>

          <RecordList title="Batch Records" icon={<PackageCheck className="h-4 w-4" />}>
            {batches.length === 0 ? (
              <EmptyState>No Batch Records have been created.</EmptyState>
            ) : (
              batches.map((batch: any) => (
                <div key={batch.id} className="record-row">
                  <div>
                    <p className="text-sm font-semibold text-[#d2e8d4]">{batch.batch_code}</p>
                    <p className="text-xs text-[#8ebf92]">
                      {batch.product_name} - {batch.source_lot_number} -{' '}
                      {numberLabel(batch.estimated_mg_per_ml, ' mg/mL')}
                    </p>
                    <p className="text-xs text-[#6aaa6e]">
                      Target volume: {numberLabel(batch.target_dose_volume_ml, ' mL')}
                    </p>
                  </div>
                  <span className="status-chip" style={statusColor(batch.status)}>
                    {batch.status.replaceAll('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </RecordList>
        </div>
      </div>
    </CannabisPageWrapper>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-[#6aaa6e]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

function RecordList({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-xl p-4"
      style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
    >
      <div className="flex items-center gap-2 mb-3 text-[#8ebf92]">
        {icon}
        <h2 className="text-sm font-semibold text-[#d2e8d4]">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4 text-sm text-[#8ebf92] border border-[#27432b]">{children}</div>
  )
}
