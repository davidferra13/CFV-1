import Link from 'next/link'
import {
  CannabisPageWrapper,
  CannabisPortalHeader,
} from '@/components/cannabis/cannabis-portal-header'
import {
  generateSeatBlueprint,
  type ControlPacketLayoutType,
} from '@/lib/cannabis/control-packet-engine'

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

const allowedLayouts: ControlPacketLayoutType[] = ['linear', 'grid_2x5', 'grid_3x4', 'custom']

export default function CannabisControlPacketTemplatePage({
  searchParams,
}: {
  searchParams?: { seats?: string; courses?: string; layout?: string; customSeats?: string }
}) {
  const seats = readPositiveNumber(searchParams?.seats, 12)
  const courses = readPositiveNumber(searchParams?.courses, 4)
  const layout = allowedLayouts.includes(searchParams?.layout as ControlPacketLayoutType)
    ? (searchParams?.layout as ControlPacketLayoutType)
    : 'linear'
  const customSeats =
    searchParams?.customSeats
      ?.split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean) ?? []

  const seatBlueprint = generateSeatBlueprint(layout, seats, customSeats)

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <CannabisPortalHeader
          title="Blank Control Packet Template"
          subtitle="Universal fallback packet · no event binding"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
          actions={
            <Link
              href="/cannabis/events"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg"
              style={{
                background: 'rgba(74, 124, 78, 0.2)',
                color: '#d2e8d4',
                border: '1px solid rgba(106, 170, 110, 0.35)',
              }}
            >
              Cannabis Events
            </Link>
          }
        />

        <form
          className="rounded-xl p-4 mb-5 grid md:grid-cols-4 gap-3"
          style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
        >
          <label className="text-xs text-[#6aaa6e]">
            Seats
            <input
              name="seats"
              defaultValue={String(seats)}
              className="mt-1 block w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
            />
          </label>
          <label className="text-xs text-[#6aaa6e]">
            Courses
            <input
              name="courses"
              defaultValue={String(courses)}
              className="mt-1 block w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
            />
          </label>
          <label className="text-xs text-[#6aaa6e]">
            Layout
            <select
              name="layout"
              defaultValue={layout}
              className="mt-1 block w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
            >
              <option value="linear">Linear</option>
              <option value="grid_2x5">2 x 5</option>
              <option value="grid_3x4">3 x 4</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="text-xs text-[#6aaa6e]">
            Custom Seat IDs
            <input
              name="customSeats"
              defaultValue={customSeats.join(', ')}
              placeholder="A1, A2, Patio 1"
              className="mt-1 block w-full rounded px-2 py-1 bg-[#0a130a] border border-[#27432b] text-[#d2e8d4]"
            />
          </label>
          <button
            type="submit"
            className="md:col-span-4 px-3 py-2 rounded text-sm font-semibold"
            style={{ background: '#2f6a37', color: '#e8f5e9' }}
          >
            Refresh Template
          </button>
        </form>

        <section
          className="rounded-xl p-4 overflow-x-auto"
          style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
        >
          <div className="grid md:grid-cols-2 gap-2 text-xs mb-4 text-[#8ebf92]">
            <p>Event Name: ________________________</p>
            <p>Host Name: ________________________</p>
            <p>Date: ________________________</p>
            <p>Service Operator: ________________________</p>
            <p>Extract Label Strength: ________________________</p>
            <p>Generated Timestamp: ________________________</p>
          </div>

          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-2 text-[#7cab80]">Seat</th>
                <th className="text-left px-2 py-2 text-[#7cab80]">Guest</th>
                <th className="text-left px-2 py-2 text-[#7cab80]">Participation</th>
                {Array.from({ length: courses }, (_, index) => (
                  <th key={index} className="text-left px-2 py-2 text-[#7cab80]">
                    Course {index + 1}
                  </th>
                ))}
                <th className="text-left px-2 py-2 text-[#7cab80]">Total Planned</th>
                <th className="text-left px-2 py-2 text-[#7cab80]">Total Served</th>
              </tr>
            </thead>
            <tbody>
              {seatBlueprint.map((seat) => (
                <tr key={seat.seatId} className="border-t border-[#1e3520]">
                  <td className="px-2 py-2 text-[#d2e8d4]">{seat.seatId}</td>
                  <td className="px-2 py-2 text-[#d2e8d4]">________________</td>
                  <td className="px-2 py-2 text-[#8ebf92]">participate / skip</td>
                  {Array.from({ length: courses }, (_, index) => (
                    <td key={index} className="px-2 py-2 text-[#7cab80]">
                      Dose ☐ Skip ☐ Out ☐
                    </td>
                  ))}
                  <td className="px-2 py-2 text-[#d2e8d4]">_____</td>
                  <td className="px-2 py-2 text-[#d2e8d4]">_____</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid md:grid-cols-2 gap-2 text-xs mt-4 text-[#8ebf92]">
            <p>Total Syringes Portioned: ________________________</p>
            <p>Total Doses Administered: ________________________</p>
            <p>Extract Returned to Host: Yes ☐ No ☐</p>
            <p>Irregularities Notes: ________________________</p>
            <p>Chef Signature: ________________________</p>
            <p>Host Acknowledgment (optional): ________________________</p>
          </div>
        </section>
      </div>
    </CannabisPageWrapper>
  )
}
