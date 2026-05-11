'use client'

import type { DosingPacketData, DosingPacketGuest } from '@/lib/cannabis/dosing-packet-data'

function formatLongDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}

function formatServeTime(time: string | null): string {
  if (!time) return 'TBD'
  // Handle HH:MM or HH:MM:SS format
  const parts = time.split(':')
  if (parts.length < 2) return time
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${ampm}`
}

/** Printable checkbox square (renders as empty box for pen marking) */
function Checkbox({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
      <span
        style={{
          display: 'inline-block',
          width: '18px',
          height: '18px',
          border: '2px solid #000',
          borderRadius: '2px',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.5px' }}>{label}</span>
    </div>
  )
}

function isParticipating(guest: DosingPacketGuest): boolean {
  return guest.participationStatus === 'participate'
}

function isUndecided(guest: DosingPacketGuest): boolean {
  return guest.participationStatus === 'undecided'
}

function isNonParticipating(guest: DosingPacketGuest): boolean {
  return guest.participationStatus === 'not_consume' || guest.participationStatus === 'no_response'
}

export function CannabisDosingPacketPrint({ data }: { data: DosingPacketData }) {
  const { event, guests, courses, reconciliation, totals, snapshotVersion, generatedAt } = data

  // Sort guests: participating first, then undecided, then non-participating
  const participatingGuests = guests.filter(isParticipating)
  const undecidedGuests = guests.filter(isUndecided)
  const nonParticipatingGuests = guests.filter(isNonParticipating)
  const sortedGuests = [...participatingGuests, ...undecidedGuests, ...nonParticipatingGuests]

  const infusedCourses = courses.filter((c) => c.infusionEnabled)
  const shouldRotateHeaders = courses.length > 5
  const manyGuests = sortedGuests.length > 8

  return (
    <>
      {/* Print-specific styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 0.4in; size: letter landscape; }
}
@media screen {
  .page-break-before { border-top: 3px dashed #ccc; margin-top: 24px; padding-top: 24px; }
}
@media print {
  .page-break-before { page-break-before: always; }
}
          `,
        }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* SECTION 1: Screen Controls Bar                                    */}
      {/* ---------------------------------------------------------------- */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          marginBottom: '16px',
          borderBottom: '2px solid #e5e7eb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            Back
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 24px',
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#111827',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Print
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111' }}>
            Cannabis Dosing Packet
          </span>
          <span style={{ marginLeft: '12px', fontSize: '13px', color: '#6b7280' }}>
            {formatLongDate(event.date)}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* PRINT DOCUMENT                                                    */}
      {/* ---------------------------------------------------------------- */}
      <div
        style={{
          backgroundColor: 'white',
          color: '#000',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '11px',
          lineHeight: 1.4,
          maxWidth: '10.5in',
          margin: '0 auto',
          padding: '12px 20px',
        }}
      >
        {/* -------------------------------------------------------------- */}
        {/* SECTION 2: Document Header                                      */}
        {/* -------------------------------------------------------------- */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              margin: '0 0 2px 0',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            Cannabis Dosing Command Sheet
          </h1>
          <p
            style={{
              fontSize: '10px',
              margin: 0,
              color: '#555',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            CONFIDENTIAL - INTERNAL SERVICE DOCUMENT
          </p>
        </div>

        {/* Two-column event info grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 24px',
            padding: '8px 12px',
            border: '1px solid #333',
            marginBottom: '6px',
            fontSize: '11px',
          }}
        >
          {/* Left column */}
          <div>
            <strong>Event Date:</strong> {formatLongDate(event.date)}
          </div>
          <div>
            <strong>Guests:</strong> {totals.totalGuests}
          </div>
          <div>
            <strong>Host:</strong> {event.hostName}
          </div>
          <div>
            <strong>Participating:</strong> {totals.totalParticipating} of {totals.totalGuests}
          </div>
          {event.occasion && (
            <div>
              <strong>Occasion:</strong> {event.occasion}
            </div>
          )}
          <div>
            <strong>Courses:</strong> {totals.totalCourses}
          </div>
          <div>
            <strong>Serve Time:</strong> {formatServeTime(event.serveTime)}
          </div>
          <div>
            <strong>Infused Courses:</strong> {totals.totalInfusedCourses} of {totals.totalCourses}
          </div>
        </div>

        {/* Reconciliation row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 24px',
            padding: '6px 12px',
            border: '1px solid #999',
            marginBottom: '6px',
            fontSize: '11px',
          }}
        >
          <div>
            <strong>Extract Label Strength:</strong>{' '}
            {reconciliation?.extractLabelStrength || '________________________'}
          </div>
          <div>
            <strong>Service Operator:</strong>{' '}
            {reconciliation?.serviceOperator || '________________________'}
          </div>
        </div>

        {/* Version + timestamp row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '9px',
            color: '#666',
            marginBottom: '10px',
            padding: '0 12px',
          }}
        >
          <span>
            {snapshotVersion != null ? `Packet v${snapshotVersion}` : 'Draft (no snapshot)'}
          </span>
          <span>Generated: {formatDateTime(generatedAt)}</span>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SECTION 3: Course Summary Strip                                 */}
        {/* -------------------------------------------------------------- */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            border: '1px solid #333',
            marginBottom: '12px',
            fontSize: '10px',
          }}
        >
          {courses.map((course, idx) => (
            <div
              key={course.courseIndex}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRight: idx < courses.length - 1 ? '1px solid #999' : 'none',
                color: course.infusionEnabled ? '#000' : '#999',
                backgroundColor: course.infusionEnabled ? '#f0f0f0' : '#fafafa',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                C{course.courseIndex}: {course.courseName}
              </div>
              <div>
                Infused:{' '}
                <strong style={{ fontWeight: course.infusionEnabled ? 800 : 400 }}>
                  {course.infusionEnabled ? 'YES' : 'no'}
                </strong>
              </div>
              {course.infusionEnabled && (
                <>
                  <div>{course.plannedMgPerGuest ?? 0}mg/guest</div>
                  {course.batchCode && <div>Batch: {course.batchCode}</div>}
                  {course.doseVolumeMlPerGuest != null && (
                    <div>{course.doseVolumeMlPerGuest.toFixed(3)} mL</div>
                  )}
                </>
              )}
              {course.notes && (
                <div style={{ fontStyle: 'italic', fontSize: '9px', marginTop: '2px' }}>
                  {course.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SECTION 4: DOSING MATRIX (THE CORE DOCUMENT)                    */}
        {/* -------------------------------------------------------------- */}
        <div style={{ marginBottom: '12px' }}>
          <h2
            style={{
              fontSize: '13px',
              fontWeight: 800,
              margin: '0 0 4px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Dosing Matrix
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      ...thStyle,
                      width: '50px',
                      minWidth: '50px',
                    }}
                  >
                    Seat
                  </th>
                  <th
                    style={{
                      ...thStyle,
                      width: '110px',
                      minWidth: '100px',
                    }}
                  >
                    Guest Name
                  </th>
                  {courses.map((course) => (
                    <th
                      key={course.courseIndex}
                      style={{
                        ...thStyle,
                        minWidth: shouldRotateHeaders ? '60px' : '90px',
                        ...(shouldRotateHeaders
                          ? {
                              writingMode: 'vertical-rl' as const,
                              transform: 'rotate(180deg)',
                              height: '80px',
                              verticalAlign: 'bottom',
                              padding: '4px 2px',
                              fontSize: '10px',
                            }
                          : {}),
                      }}
                    >
                      C{course.courseIndex}
                      {!shouldRotateHeaders && (
                        <>
                          <br />
                          <span style={{ fontSize: '9px', fontWeight: 400, opacity: 0.85 }}>
                            {course.courseName}
                          </span>
                        </>
                      )}
                    </th>
                  ))}
                  <th style={{ ...thStyle, width: '65px', minWidth: '60px' }}>
                    Total
                    <br />
                    Planned
                  </th>
                  <th style={{ ...thStyle, width: '65px', minWidth: '60px' }}>
                    Total
                    <br />
                    Served
                  </th>
                  <th style={{ ...thStyle, width: '120px', minWidth: '100px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {/* Participating guests */}
                {participatingGuests.map((guest, idx) => (
                  <GuestRow
                    key={`p-${guest.seatId}-${guest.guestName}`}
                    guest={guest}
                    courses={courses}
                    rowBg={idx % 2 === 0 ? '#fff' : '#f5f5f5'}
                    status="participating"
                  />
                ))}

                {/* Undecided guests */}
                {undecidedGuests.length > 0 && (
                  <tr>
                    <td
                      colSpan={courses.length + 5}
                      style={{
                        padding: '3px 6px',
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        backgroundColor: '#fff8e1',
                        borderTop: '2px solid #333',
                        borderBottom: '1px solid #333',
                        color: '#8d6e00',
                      }}
                    >
                      Undecided
                    </td>
                  </tr>
                )}
                {undecidedGuests.map((guest, idx) => (
                  <GuestRow
                    key={`u-${guest.seatId}-${guest.guestName}`}
                    guest={guest}
                    courses={courses}
                    rowBg={idx % 2 === 0 ? '#fffde7' : '#fff9c4'}
                    status="undecided"
                  />
                ))}

                {/* Non-participating guests */}
                {nonParticipatingGuests.length > 0 && (
                  <tr>
                    <td
                      colSpan={courses.length + 5}
                      style={{
                        padding: '3px 6px',
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        backgroundColor: '#f0f0f0',
                        borderTop: '2px solid #333',
                        borderBottom: '1px solid #333',
                        color: '#666',
                      }}
                    >
                      Not Participating
                    </td>
                  </tr>
                )}
                {nonParticipatingGuests.map((guest, idx) => (
                  <GuestRow
                    key={`n-${guest.seatId}-${guest.guestName}`}
                    guest={guest}
                    courses={courses}
                    rowBg={idx % 2 === 0 ? '#fafafa' : '#f0f0f0'}
                    status="non-participating"
                  />
                ))}

                {/* 3 blank rows for last-minute additions */}
                {[1, 2, 3].map((n) => (
                  <tr key={`blank-${n}`}>
                    <td style={{ ...cellStyle, height: '60px' }} />
                    <td style={cellStyle} />
                    {courses.map((course) => (
                      <td key={course.courseIndex} style={{ ...cellStyle, minHeight: '60px' }}>
                        {course.infusionEnabled && (
                          <div style={{ padding: '2px' }}>
                            <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                              ___mg
                            </div>
                            <Checkbox label="PREP" />
                            <Checkbox label="APPLY" />
                            <Checkbox label="CONF" />
                          </div>
                        )}
                      </td>
                    ))}
                    <td style={cellStyle} />
                    <td style={cellStyle} />
                    <td style={cellStyle} />
                  </tr>
                ))}

                {/* Column totals row */}
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      ...cellStyle,
                      fontWeight: 800,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      backgroundColor: '#e8e8e8',
                      borderTop: '2px solid #000',
                    }}
                  >
                    Column Totals
                  </td>
                  {courses.map((course) => {
                    const courseTotal = participatingGuests.reduce((sum, g) => {
                      const gc = g.courses.find((c) => c.courseIndex === course.courseIndex)
                      return sum + (gc?.plannedMg ?? 0)
                    }, 0)
                    // Include undecided at their planned amount
                    const undecidedTotal = undecidedGuests.reduce((sum, g) => {
                      const gc = g.courses.find((c) => c.courseIndex === course.courseIndex)
                      return sum + (gc?.plannedMg ?? 0)
                    }, 0)
                    return (
                      <td
                        key={course.courseIndex}
                        style={{
                          ...cellStyle,
                          fontWeight: 700,
                          textAlign: 'center',
                          backgroundColor: '#e8e8e8',
                          borderTop: '2px solid #000',
                          fontSize: '11px',
                        }}
                      >
                        {course.infusionEnabled ? (
                          <>
                            {courseTotal}mg
                            {undecidedTotal > 0 && (
                              <span style={{ fontSize: '9px', color: '#8d6e00' }}>
                                {' '}
                                (+{undecidedTotal}?)
                              </span>
                            )}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    )
                  })}
                  <td
                    style={{
                      ...cellStyle,
                      fontWeight: 700,
                      textAlign: 'center',
                      backgroundColor: '#e8e8e8',
                      borderTop: '2px solid #000',
                      fontSize: '11px',
                    }}
                  >
                    {totals.totalPlannedMgAllGuests}mg
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      backgroundColor: '#e8e8e8',
                      borderTop: '2px solid #000',
                    }}
                  />
                  <td
                    style={{
                      ...cellStyle,
                      backgroundColor: '#e8e8e8',
                      borderTop: '2px solid #000',
                    }}
                  />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SECTION 5: DOSING TALLY                                         */}
        {/* -------------------------------------------------------------- */}
        <div
          style={{
            padding: '8px 12px',
            border: '1px solid #333',
            marginBottom: '12px',
            fontSize: '11px',
          }}
        >
          <h3
            style={{
              fontSize: '11px',
              fontWeight: 800,
              margin: '0 0 4px 0',
              textTransform: 'uppercase',
            }}
          >
            Dosing Tally
          </h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 24px',
            }}
          >
            {infusedCourses.map((course) => {
              const coursePlanned = participatingGuests.reduce((sum, g) => {
                const gc = g.courses.find((c) => c.courseIndex === course.courseIndex)
                return sum + (gc?.plannedMg ?? 0)
              }, 0)
              return (
                <span key={course.courseIndex}>
                  C{course.courseIndex}: <strong>{coursePlanned}mg</strong> planned /{' '}
                  <span>_____mg served</span>
                </span>
              )
            })}
          </div>
          <div
            style={{
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid #999',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            TOTAL PLANNED: {totals.totalPlannedMgAllGuests}mg {'  |  '} TOTAL SERVED: _____mg
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SECTION 6: TABLE LAYOUT SKETCH AREA                             */}
        {/* -------------------------------------------------------------- */}
        <div className={manyGuests ? 'page-break-before' : ''}>
          <div
            style={{
              border: '2px solid #333',
              padding: '8px',
              marginBottom: '12px',
              minHeight: '216px', // ~3 inches
            }}
          >
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 800,
                margin: '0 0 2px 0',
                textTransform: 'uppercase',
              }}
            >
              Table Layout / Seating Sketch
            </h3>
            <p style={{ fontSize: '9px', color: '#666', margin: '0 0 8px 0' }}>
              Draw table arrangement and mark guest positions
            </p>

            {/* Seat labels along the top if assigned */}
            {sortedGuests.some((g) => g.seatId) && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginBottom: '8px',
                  fontSize: '9px',
                }}
              >
                {sortedGuests
                  .filter((g) => g.seatId)
                  .map((g) => (
                    <span
                      key={`seat-label-${g.seatId}`}
                      style={{
                        padding: '1px 6px',
                        border: '1px solid #999',
                        borderRadius: '2px',
                        backgroundColor: '#f5f5f5',
                      }}
                    >
                      {g.seatId}: {g.guestName}
                    </span>
                  ))}
              </div>
            )}

            {/* Dotted grid area for sketching */}
            <div
              style={{
                width: '100%',
                minHeight: '150px',
                backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SECTION 7: LIVE ADJUSTMENT LOG                                  */}
        {/* -------------------------------------------------------------- */}
        <div
          style={{
            border: '1px solid #333',
            padding: '8px 12px',
            marginBottom: '12px',
          }}
        >
          <h3
            style={{
              fontSize: '11px',
              fontWeight: 800,
              margin: '0 0 6px 0',
              textTransform: 'uppercase',
            }}
          >
            Live Adjustments
          </h3>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={`adj-${n}`}
              style={{
                borderBottom: '1px solid #ccc',
                padding: '6px 0',
                fontSize: '10px',
                color: '#666',
              }}
            >
              Time: ________{'   '}| Guest: ____________________{'   '}| Change:
              ____________________{'   '}| New dose: _____mg
            </div>
          ))}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* SECTION 8: SERVICE COMPLETION FOOTER                            */}
        {/* -------------------------------------------------------------- */}
        <div
          style={{
            border: '2px solid #333',
            padding: '10px 12px',
            fontSize: '11px',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong>IRREGULARITIES:</strong> _______________________________________________
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 24px',
              marginBottom: '8px',
            }}
          >
            <div>
              EXTRACT RETURNED TO HOST:{'  '}
              <span
                style={{
                  display: 'inline-block',
                  width: '18px',
                  height: '18px',
                  border: '2px solid #000',
                  borderRadius: '2px',
                  verticalAlign: 'middle',
                  marginRight: '2px',
                }}
              />{' '}
              YES{'  '}
              <span
                style={{
                  display: 'inline-block',
                  width: '18px',
                  height: '18px',
                  border: '2px solid #000',
                  borderRadius: '2px',
                  verticalAlign: 'middle',
                  marginRight: '2px',
                }}
              />{' '}
              NO
            </div>
            <div>TOTAL SYRINGES PREPARED: _____{'  '}TOTAL DOSES GIVEN: _____</div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 24px',
              marginBottom: '6px',
            }}
          >
            <div>CHEF SIGNATURE: ___________________________</div>
            <div>DATE: ___________</div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            HOST ACKNOWLEDGMENT: ___________________________
          </div>
          <div
            style={{
              fontSize: '8px',
              color: '#999',
              textAlign: 'center',
              borderTop: '1px solid #ccc',
              paddingTop: '4px',
            }}
          >
            ChefFlow Cannabis Service Document | Confidential
            {snapshotVersion != null ? ` | v${snapshotVersion}` : ''}
          </div>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-component: Guest Row                                                    */
/* -------------------------------------------------------------------------- */

function GuestRow({
  guest,
  courses,
  rowBg,
  status,
}: {
  guest: DosingPacketGuest
  courses: DosingPacketData['courses']
  rowBg: string
  status: 'participating' | 'undecided' | 'non-participating'
}) {
  const participating = status === 'participating'
  const undecided = status === 'undecided'
  const nonPart = status === 'non-participating'

  return (
    <tr>
      <td
        style={{
          ...cellStyle,
          backgroundColor: rowBg,
          fontWeight: 600,
          fontSize: '10px',
        }}
      >
        {guest.seatId || '-'}
      </td>
      <td
        style={{
          ...cellStyle,
          backgroundColor: rowBg,
          fontWeight: 600,
          color: nonPart ? '#999' : '#000',
        }}
      >
        {guest.guestName}
        {guest.familiarityLevel && (
          <span style={{ fontSize: '8px', color: '#888', display: 'block' }}>
            {guest.familiarityLevel}
          </span>
        )}
      </td>

      {/* Course cells */}
      {courses.map((course) => {
        const guestCourse = guest.courses.find((c) => c.courseIndex === course.courseIndex)

        // Non-participating: always OPT OUT
        if (nonPart) {
          return (
            <td
              key={course.courseIndex}
              style={{
                ...cellStyle,
                backgroundColor: rowBg,
                textAlign: 'center',
                color: '#aaa',
                fontSize: '9px',
                fontWeight: 600,
              }}
            >
              OPT OUT
            </td>
          )
        }

        // Course not infused: show dash
        if (!course.infusionEnabled) {
          return (
            <td
              key={course.courseIndex}
              style={{
                ...cellStyle,
                backgroundColor: rowBg,
                textAlign: 'center',
                color: '#ccc',
              }}
            >
              -
            </td>
          )
        }

        // Undecided guest with infused course: show "?" + checkboxes
        if (undecided) {
          return (
            <td
              key={course.courseIndex}
              style={{
                ...cellStyle,
                backgroundColor: rowBg,
                minHeight: '60px',
                verticalAlign: 'top',
                padding: '4px 4px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#8d6e00' }}>
                ?{guestCourse && guestCourse.plannedMg > 0 ? ` ${guestCourse.plannedMg}mg` : ''}
              </div>
              <Checkbox label="PREP" />
              <Checkbox label="APPLY" />
              <Checkbox label="CONF" />
            </td>
          )
        }

        // Participating guest with infused course: full dose cell
        const plannedMg = guestCourse?.plannedMg ?? 0
        return (
          <td
            key={course.courseIndex}
            style={{
              ...cellStyle,
              backgroundColor: rowBg,
              minHeight: '60px',
              verticalAlign: 'top',
              padding: '4px 4px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>
              {plannedMg}mg
            </div>
            <Checkbox label="PREP" />
            <Checkbox label="APPLY" />
            <Checkbox label="CONF" />
          </td>
        )
      })}

      {/* Total Planned */}
      <td
        style={{
          ...cellStyle,
          backgroundColor: rowBg,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '12px',
          color: nonPart ? '#aaa' : '#000',
        }}
      >
        {nonPart ? '-' : `${guest.totalPlannedMg}mg`}
      </td>

      {/* Total Served (blank writable space) */}
      <td
        style={{
          ...cellStyle,
          backgroundColor: rowBg,
          textAlign: 'center',
          minWidth: '55px',
        }}
      >
        {nonPart ? (
          <span style={{ color: '#ccc' }}>-</span>
        ) : (
          <span style={{ color: '#ccc', fontSize: '9px' }}>___mg</span>
        )}
      </td>

      {/* Notes */}
      <td
        style={{
          ...cellStyle,
          backgroundColor: rowBg,
          fontSize: '9px',
          color: nonPart ? '#bbb' : '#333',
        }}
      >
        {guest.preferredDoseNote && (
          <span style={{ fontStyle: 'italic', display: 'block', marginBottom: '2px' }}>
            {guest.preferredDoseNote}
          </span>
        )}
        {!nonPart && <span style={{ color: '#ccc' }}>_______________</span>}
      </td>
    </tr>
  )
}

/* -------------------------------------------------------------------------- */
/* Shared inline style constants                                               */
/* -------------------------------------------------------------------------- */

const thStyle: React.CSSProperties = {
  padding: '6px 6px',
  backgroundColor: '#222',
  color: '#fff',
  fontWeight: 700,
  fontSize: '10px',
  textAlign: 'left',
  border: '1px solid #333',
  verticalAlign: 'bottom',
}

const cellStyle: React.CSSProperties = {
  padding: '4px 6px',
  border: '1px solid #333',
  verticalAlign: 'top',
  fontSize: '11px',
}
