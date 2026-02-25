'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  finalizeControlPacket,
  generateCannabisControlPacketSnapshot,
  upsertControlPacketReconciliation,
  uploadControlPacketEvidence,
} from '@/lib/chef/cannabis-control-packet-actions'

type InitialData = {
  event: {
    id: string
    date: string
    serveTime: string | null
    hostName: string
    occasion: string | null
    guestCount: number
    courseCount: number
    status: string | null
  }
  guestRows: Array<{
    guestId: string
    fullName: string
    participationStatus: string
  }>
  participationSummary: {
    total: number
    participating: number
    notConsuming: number
    undecided: number
    noResponse: number
  }
  snapshots: any[]
  activeSnapshot: any | null
  reconciliation: any | null
  evidence: any[]
  alertRsvpUpdatedAfterSnapshot: boolean
}

type CourseInput = {
  mgServed: string
  doseApplied: boolean
  skipped: boolean
  optedOutDuringService: boolean
}

type GuestInput = {
  guestId: string | null
  guestName: string
  seatId: string
  totalMgPlanned: string
  totalMgServed: string
  notes: string
  courses: CourseInput[]
}

const LAYOUT_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'grid_2x5', label: '2 x 5' },
  { value: 'grid_3x4', label: '3 x 4' },
  { value: 'custom', label: 'Custom' },
] as const

function parseNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function seatGuestRows(initialData: InitialData, courseCount: number): GuestInput[] {
  const seats = (initialData.activeSnapshot?.seating_snapshot ?? []) as any[]
  const existingRows = (initialData.reconciliation?.guest_reconciliation ?? []) as any[]
  const existingByName = new Map(
    existingRows.map((row) => [
      String(row?.guestName ?? '')
        .trim()
        .toLowerCase(),
      row,
    ])
  )

  const rows = seats
    .filter((seat) => typeof seat?.guestName === 'string' && seat.guestName.trim())
    .map((seat) => {
      const name = String(seat.guestName)
      const existing = existingByName.get(name.toLowerCase()) ?? {}
      const perCourse = Array.isArray(existing.perCourse) ? existing.perCourse : []
      const breakdown = Array.isArray(existing.breakdownPerCourseMg)
        ? existing.breakdownPerCourseMg
        : []

      return {
        guestId: typeof seat.guestId === 'string' ? seat.guestId : null,
        guestName: name,
        seatId: String(seat.seatId ?? ''),
        totalMgPlanned:
          existing.totalMgPlanned === undefined || existing.totalMgPlanned === null
            ? ''
            : String(existing.totalMgPlanned),
        totalMgServed:
          existing.totalMgServed === undefined || existing.totalMgServed === null
            ? ''
            : String(existing.totalMgServed),
        notes: String(existing.notes ?? ''),
        courses: Array.from({ length: courseCount }, (_, index) => {
          const course = perCourse.find((item: any) => Number(item?.courseNumber) === index + 1)
          return {
            mgServed:
              breakdown[index] === undefined || breakdown[index] === null
                ? String(course?.mgServed ?? '')
                : String(breakdown[index]),
            doseApplied: !!course?.doseApplied,
            skipped: !!course?.skipped,
            optedOutDuringService: !!course?.optedOutDuringService,
          }
        }),
      }
    })

  if (rows.length > 0) return rows

  return initialData.guestRows.map((guest) => ({
    guestId: guest.guestId,
    guestName: guest.fullName,
    seatId: '',
    totalMgPlanned: '',
    totalMgServed: '',
    notes: '',
    courses: Array.from({ length: courseCount }, () => ({
      mgServed: '',
      doseApplied: false,
      skipped: false,
      optedOutDuringService: false,
    })),
  }))
}

export function ControlPacketClient({
  eventId,
  initialData,
}: {
  eventId: string
  initialData: InitialData
}) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [layoutType, setLayoutType] = useState<'linear' | 'grid_2x5' | 'grid_3x4' | 'custom'>(
    'linear'
  )
  const [customSeatIds, setCustomSeatIds] = useState('')
  const [archivalPdfPath, setArchivalPdfPath] = useState(
    String(initialData.activeSnapshot?.archival_pdf_path ?? '')
  )

  const [extractLabelStrength, setExtractLabelStrength] = useState(
    String(initialData.reconciliation?.extract_label_strength ?? '')
  )
  const [serviceOperator, setServiceOperator] = useState(
    String(initialData.reconciliation?.service_operator ?? '')
  )
  const [totalSyringesPortioned, setTotalSyringesPortioned] = useState(
    String(initialData.reconciliation?.total_syringes_portioned ?? '')
  )
  const [totalDosesAdministered, setTotalDosesAdministered] = useState(
    String(initialData.reconciliation?.total_doses_administered ?? '')
  )
  const [extractReturnedToHost, setExtractReturnedToHost] = useState<string>(
    initialData.reconciliation?.extract_returned_to_host === null ||
      initialData.reconciliation?.extract_returned_to_host === undefined
      ? 'unknown'
      : initialData.reconciliation.extract_returned_to_host
        ? 'yes'
        : 'no'
  )
  const [irregularitiesNotes, setIrregularitiesNotes] = useState(
    String(initialData.reconciliation?.irregularities_notes ?? '')
  )
  const [chefSignature, setChefSignature] = useState(
    String(initialData.reconciliation?.chef_signature ?? '')
  )
  const [hostAcknowledgment, setHostAcknowledgment] = useState(
    String(initialData.reconciliation?.host_acknowledgment ?? '')
  )
  const [mismatchSummary, setMismatchSummary] = useState<any>(
    initialData.reconciliation?.mismatch_summary ?? null
  )

  const activeSnapshot = initialData.activeSnapshot
  const courseCount = Number(activeSnapshot?.course_count ?? initialData.event.courseCount ?? 1)
  const isFinalized = !!activeSnapshot?.finalization_locked

  const initialGuestRows = useMemo(
    () => seatGuestRows(initialData, courseCount),
    [initialData.activeSnapshot?.id, initialData.reconciliation?.updated_at, courseCount]
  )
  const [guestRows, setGuestRows] = useState<GuestInput[]>(initialGuestRows)

  useEffect(() => {
    setGuestRows(initialGuestRows)
    setMismatchSummary(initialData.reconciliation?.mismatch_summary ?? null)
    setExtractLabelStrength(String(initialData.reconciliation?.extract_label_strength ?? ''))
    setServiceOperator(String(initialData.reconciliation?.service_operator ?? ''))
    setTotalSyringesPortioned(String(initialData.reconciliation?.total_syringes_portioned ?? ''))
    setTotalDosesAdministered(String(initialData.reconciliation?.total_doses_administered ?? ''))
    setExtractReturnedToHost(
      initialData.reconciliation?.extract_returned_to_host === null ||
        initialData.reconciliation?.extract_returned_to_host === undefined
        ? 'unknown'
        : initialData.reconciliation.extract_returned_to_host
          ? 'yes'
          : 'no'
    )
    setIrregularitiesNotes(String(initialData.reconciliation?.irregularities_notes ?? ''))
    setChefSignature(String(initialData.reconciliation?.chef_signature ?? ''))
    setHostAcknowledgment(String(initialData.reconciliation?.host_acknowledgment ?? ''))
    setArchivalPdfPath(String(initialData.activeSnapshot?.archival_pdf_path ?? ''))
  }, [initialData.activeSnapshot?.id, initialData.reconciliation?.id, initialGuestRows])

  function setGuestValue(index: number, key: keyof Omit<GuestInput, 'courses'>, value: string) {
    setGuestRows((rows) => {
      const next = [...rows]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  function setCourseValue(
    rowIndex: number,
    courseIndex: number,
    key: keyof CourseInput,
    value: string | boolean
  ) {
    setGuestRows((rows) => {
      const next = [...rows]
      const nextCourses = [...next[rowIndex].courses]
      nextCourses[courseIndex] = { ...nextCourses[courseIndex], [key]: value }
      next[rowIndex] = { ...next[rowIndex], courses: nextCourses }
      return next
    })
  }

  function selectSnapshot(snapshotId: string) {
    const params = new URLSearchParams()
    if (snapshotId) params.set('snapshot', snapshotId)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  function generateSnapshot() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await generateCannabisControlPacketSnapshot({
          eventId,
          layoutType,
          customSeatIds:
            layoutType === 'custom'
              ? customSeatIds
                  .split(/[\n,]/)
                  .map((value) => value.trim())
                  .filter(Boolean)
              : undefined,
        })
        setMessage(`Generated snapshot v${result.versionNumber}.`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate snapshot')
      }
    })
  }

  function saveReconciliation() {
    if (!activeSnapshot) return
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const payload = guestRows.map((row) => ({
          guestId: row.guestId,
          guestName: row.guestName,
          totalMgPlanned: parseNumber(row.totalMgPlanned),
          totalMgServed: parseNumber(row.totalMgServed),
          breakdownPerCourseMg: row.courses.map((course) => parseNumber(course.mgServed) ?? 0),
          perCourse: row.courses.map((course, index) => ({
            courseNumber: index + 1,
            mgServed: parseNumber(course.mgServed),
            doseApplied: course.doseApplied,
            skipped: course.skipped,
            optedOutDuringService: course.optedOutDuringService,
          })),
          notes: row.notes.trim() || null,
        }))

        const result = await upsertControlPacketReconciliation({
          eventId,
          snapshotId: activeSnapshot.id,
          extractLabelStrength: extractLabelStrength.trim() || null,
          serviceOperator: serviceOperator.trim() || null,
          totalSyringesPortioned: parseNumber(totalSyringesPortioned),
          totalDosesAdministered: parseNumber(totalDosesAdministered),
          extractReturnedToHost:
            extractReturnedToHost === 'unknown' ? null : extractReturnedToHost === 'yes',
          irregularitiesNotes: irregularitiesNotes.trim() || null,
          chefSignature: chefSignature.trim() || null,
          hostAcknowledgment: hostAcknowledgment.trim() || null,
          guestRows: payload,
        })
        setMismatchSummary(result.mismatchSummary)
        setMessage('Reconciliation saved.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save reconciliation')
      }
    })
  }

  function uploadEvidence(files: File[]) {
    if (!activeSnapshot || files.length === 0) return
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        for (const file of files) {
          const formData = new FormData()
          formData.append('evidence', file)
          await uploadControlPacketEvidence(activeSnapshot.id, formData)
        }
        setMessage(`${files.length} evidence file(s) uploaded.`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Evidence upload failed')
      }
    })
  }

  function finalizePacket() {
    if (!activeSnapshot) return
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await finalizeControlPacket({
          eventId,
          snapshotId: activeSnapshot.id,
          archivalPdfPath: archivalPdfPath.trim() || undefined,
        })
        setMessage(`Packet finalized at ${new Date(result.finalizedAt).toLocaleString('en-US')}.`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Finalize failed')
      }
    })
  }

  return (
    <div className="space-y-6">
      {initialData.alertRsvpUpdatedAfterSnapshot && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            background: 'rgba(181, 110, 30, 0.16)',
            border: '1px solid rgba(230, 168, 98, 0.45)',
            color: '#ffd8a6',
          }}
        >
          Guest RSVP data changed after packet generation. Regenerate if seating assumptions
          changed.
        </div>
      )}

      <section className="grid md:grid-cols-4 gap-3 text-sm">
        <div
          className="rounded-xl p-3"
          style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
        >
          <p className="text-xs text-[#6aaa6e]">Host</p>
          <p className="text-[#d2e8d4] font-semibold">{initialData.event.hostName}</p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
        >
          <p className="text-xs text-[#6aaa6e]">Date</p>
          <p className="text-[#d2e8d4] font-semibold">
            {new Date(initialData.event.date).toLocaleDateString('en-US')}
          </p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
        >
          <p className="text-xs text-[#6aaa6e]">Participation</p>
          <p className="text-[#d2e8d4] font-semibold">
            {initialData.participationSummary.participating}/
            {initialData.participationSummary.total}
          </p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
        >
          <p className="text-xs text-[#6aaa6e]">Courses</p>
          <p className="text-[#d2e8d4] font-semibold">{courseCount}</p>
        </div>
      </section>

      <section
        className="rounded-xl p-4 space-y-3"
        style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs text-[#6aaa6e]">
            Layout
            <select
              value={layoutType}
              onChange={(event) => setLayoutType(event.target.value as typeof layoutType)}
              className="block mt-1 rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
              disabled={isPending}
            >
              {LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {layoutType === 'custom' && (
            <label className="text-xs text-[#6aaa6e] min-w-[260px] flex-1">
              Custom Seat IDs
              <input
                value={customSeatIds}
                onChange={(event) => setCustomSeatIds(event.target.value)}
                className="block mt-1 w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
                placeholder="A1, A2, VIP-1, VIP-2"
              />
            </label>
          )}
          <button
            type="button"
            onClick={generateSnapshot}
            disabled={isPending}
            className="px-3 py-2 rounded text-sm font-semibold"
            style={{ background: '#2f6a37', color: '#e8f5e9' }}
          >
            Generate Control Packet
          </button>
        </div>

        {initialData.snapshots.length > 0 && (
          <label className="text-xs text-[#6aaa6e]">
            Snapshot Version
            <select
              value={String(activeSnapshot?.id ?? '')}
              onChange={(event) => selectSnapshot(event.target.value)}
              className="block mt-1 rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
            >
              {initialData.snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  v{snapshot.version_number} ·{' '}
                  {new Date(snapshot.generated_at).toLocaleString('en-US')}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {activeSnapshot && (
        <>
          <section
            className="rounded-xl p-4 overflow-x-auto"
            style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
          >
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-2 py-2 text-[#7cab80]">Seat</th>
                  <th className="text-left px-2 py-2 text-[#7cab80]">Guest</th>
                  <th className="text-left px-2 py-2 text-[#7cab80]">Participation</th>
                  {Array.from({ length: courseCount }, (_, index) => (
                    <th key={index} className="text-left px-2 py-2 text-[#7cab80]">
                      C{index + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activeSnapshot.seating_snapshot ?? []).map((seat: any) => (
                  <tr key={String(seat.seatId)} className="border-t border-[#1e3520]">
                    <td className="px-2 py-2 text-[#d2e8d4]">{String(seat.seatId ?? '')}</td>
                    <td className="px-2 py-2 text-[#d2e8d4]">{String(seat.guestName ?? '—')}</td>
                    <td className="px-2 py-2 text-[#8ebf92]">
                      {String(seat.participationStatus ?? '')}
                    </td>
                    {Array.from({ length: courseCount }, (_, index) => (
                      <td key={index} className="px-2 py-2 text-[#7cab80]">
                        Dose ☐ Skip ☐ Out ☐
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
          >
            <h2 className="text-sm font-semibold text-[#d2e8d4]">Reconcile Service</h2>
            <div className="grid md:grid-cols-3 gap-2">
              <input
                value={extractLabelStrength}
                onChange={(e) => setExtractLabelStrength(e.target.value)}
                disabled={isFinalized || isPending}
                placeholder="Extract label strength"
                className="rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
              />
              <input
                value={serviceOperator}
                onChange={(e) => setServiceOperator(e.target.value)}
                disabled={isFinalized || isPending}
                placeholder="Service operator"
                className="rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
              />
              <input
                value={chefSignature}
                onChange={(e) => setChefSignature(e.target.value)}
                disabled={isFinalized || isPending}
                placeholder="Chef signature"
                className="rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
              />
              <input
                value={totalSyringesPortioned}
                onChange={(e) => setTotalSyringesPortioned(e.target.value)}
                disabled={isFinalized || isPending}
                placeholder="Total syringes"
                className="rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
              />
              <input
                value={totalDosesAdministered}
                onChange={(e) => setTotalDosesAdministered(e.target.value)}
                disabled={isFinalized || isPending}
                placeholder="Total doses"
                className="rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
              />
              <select
                value={extractReturnedToHost}
                onChange={(e) => setExtractReturnedToHost(e.target.value)}
                disabled={isFinalized || isPending}
                className="rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
              >
                <option value="unknown">Return to host?</option>
                <option value="yes">Returned</option>
                <option value="no">Not returned</option>
              </select>
            </div>
            <textarea
              value={irregularitiesNotes}
              onChange={(e) => setIrregularitiesNotes(e.target.value)}
              disabled={isFinalized || isPending}
              rows={2}
              placeholder="Irregularities notes"
              className="w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
            />
            <input
              value={hostAcknowledgment}
              onChange={(e) => setHostAcknowledgment(e.target.value)}
              disabled={isFinalized || isPending}
              placeholder="Host acknowledgment (optional)"
              className="w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
            />

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-[#7cab80]">Seat</th>
                    <th className="px-2 py-2 text-left text-[#7cab80]">Guest</th>
                    <th className="px-2 py-2 text-left text-[#7cab80]">Planned</th>
                    <th className="px-2 py-2 text-left text-[#7cab80]">Served</th>
                    {Array.from({ length: courseCount }, (_, index) => (
                      <th key={index} className="px-2 py-2 text-left text-[#7cab80]">
                        C{index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guestRows.map((row, rowIndex) => (
                    <tr
                      key={`${row.seatId}-${row.guestName}`}
                      className="border-t border-[#1e3520]"
                    >
                      <td className="px-2 py-2 text-[#8ebf92]">{row.seatId || '—'}</td>
                      <td className="px-2 py-2 text-[#d2e8d4]">{row.guestName}</td>
                      <td className="px-2 py-2">
                        <input
                          value={row.totalMgPlanned}
                          onChange={(e) =>
                            setGuestValue(rowIndex, 'totalMgPlanned', e.target.value)
                          }
                          disabled={isFinalized || isPending}
                          className="w-16 rounded px-1 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={row.totalMgServed}
                          onChange={(e) => setGuestValue(rowIndex, 'totalMgServed', e.target.value)}
                          disabled={isFinalized || isPending}
                          className="w-16 rounded px-1 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
                        />
                      </td>
                      {row.courses.map((course, courseIndex) => (
                        <td key={courseIndex} className="px-2 py-2 align-top">
                          <input
                            value={course.mgServed}
                            onChange={(e) =>
                              setCourseValue(rowIndex, courseIndex, 'mgServed', e.target.value)
                            }
                            disabled={isFinalized || isPending}
                            className="w-14 rounded px-1 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
                          />
                          <label className="flex gap-1 text-[11px] text-[#7cab80]">
                            <input
                              type="checkbox"
                              checked={course.doseApplied}
                              onChange={(e) =>
                                setCourseValue(
                                  rowIndex,
                                  courseIndex,
                                  'doseApplied',
                                  e.target.checked
                                )
                              }
                              disabled={isFinalized || isPending}
                            />
                            Dose
                          </label>
                          <label className="flex gap-1 text-[11px] text-[#7cab80]">
                            <input
                              type="checkbox"
                              checked={course.skipped}
                              onChange={(e) =>
                                setCourseValue(rowIndex, courseIndex, 'skipped', e.target.checked)
                              }
                              disabled={isFinalized || isPending}
                            />
                            Skip
                          </label>
                          <label className="flex gap-1 text-[11px] text-[#7cab80]">
                            <input
                              type="checkbox"
                              checked={course.optedOutDuringService}
                              onChange={(e) =>
                                setCourseValue(
                                  rowIndex,
                                  courseIndex,
                                  'optedOutDuringService',
                                  e.target.checked
                                )
                              }
                              disabled={isFinalized || isPending}
                            />
                            Out
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveReconciliation}
                disabled={isFinalized || isPending}
                className="px-3 py-2 rounded text-sm font-semibold"
                style={{ background: '#355f39', color: '#e8f5e9' }}
              >
                Save Reconciliation
              </button>
              <label
                className="px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                style={{ background: '#2f5e49', color: '#e8f5e9' }}
              >
                Upload Evidence
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                  className="hidden"
                  disabled={isFinalized || isPending}
                  onChange={(e) => {
                    uploadEvidence(Array.from(e.target.files ?? []))
                    e.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
          </section>

          <section
            className="rounded-xl p-4 space-y-3"
            style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
          >
            <p className="text-xs text-[#6aaa6e]">Evidence files: {initialData.evidence.length}</p>
            {initialData.evidence.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {initialData.evidence.map((item) => (
                  <a
                    key={item.id}
                    href={item.signedUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded overflow-hidden border border-[#27432b]"
                  >
                    <div className="aspect-square bg-[#0a130a]">
                      {item.signedUrl ? (
                        <img
                          src={item.signedUrl}
                          alt="Evidence"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#6aaa6e]">
                          No preview
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
            <input
              value={archivalPdfPath}
              onChange={(e) => setArchivalPdfPath(e.target.value)}
              disabled={isFinalized || isPending}
              placeholder="Optional archival PDF path"
              className="w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4] text-sm"
            />
            <button
              type="button"
              onClick={finalizePacket}
              disabled={isFinalized || isPending}
              className="px-3 py-2 rounded text-sm font-semibold"
              style={{ background: isFinalized ? '#355f39' : '#b8742a', color: '#fff6e8' }}
            >
              {isFinalized ? 'Packet Finalized' : 'Finalize Packet'}
            </button>
          </section>
        </>
      )}

      {mismatchSummary && (
        <section
          className="rounded-xl p-3 text-xs"
          style={{ background: '#181b12', border: '1px solid #7f5a2b', color: '#ffd8a6' }}
        >
          Missing entries: {(mismatchSummary.missingEntries ?? []).length} · Planned/served
          mismatch: {(mismatchSummary.plannedVsServedMismatch ?? []).length} · Course mismatch:{' '}
          {(mismatchSummary.courseMismatch ?? []).length}
        </section>
      )}

      {message && (
        <div className="rounded p-3 text-sm" style={{ background: '#1d3b22', color: '#d2e8d4' }}>
          {message}
        </div>
      )}
      {error && (
        <div className="rounded p-3 text-sm" style={{ background: '#4f1f1f', color: '#ffd8ce' }}>
          {error}
        </div>
      )}
    </div>
  )
}
