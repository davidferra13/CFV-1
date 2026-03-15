'use client'

import { PrintLayout } from './print-layout'

interface EventBriefPrintViewProps {
  event: {
    eventDate: string
    serveTime: string
    arrivalTime: string | null
    departureTime: string | null
    guestCount: number
    occasion: string | null
    serviceStyle: string
    locationAddress: string
    locationCity: string
    locationState: string
    locationZip: string
    locationNotes: string | null
    accessInstructions: string | null
    kitchenNotes: string | null
    siteNotes: string | null
    specialRequests: string | null
    dietaryRestrictions: string[]
    allergies: string[]
    status: string
  }
  client: {
    fullName: string
    phone: string | null
    email: string
    allergies: string[] | null
    dietaryRestrictions: string[] | null
    equipmentAvailable: string[] | null
    kitchenConstraints: string | null
    parkingInstructions: string | null
    houseRules: string | null
  } | null
  menuDishes: {
    name: string | null
    courseName: string
    dietaryTags: string[]
    allergenFlags: string[]
  }[]
}

export function EventBriefPrintView({ event, client, menuDishes }: EventBriefPrintViewProps) {
  const formattedDate = new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Combine event + client allergies/restrictions (deduplicated)
  const allAllergies = Array.from(new Set([
    ...event.allergies,
    ...(client?.allergies || []),
  ]))
  const allDietary = Array.from(new Set([
    ...event.dietaryRestrictions,
    ...(client?.dietaryRestrictions || []),
  ]))

  // Group dishes by course
  const courseMap = new Map<string, typeof menuDishes>()
  for (const dish of menuDishes) {
    if (!courseMap.has(dish.courseName)) {
      courseMap.set(dish.courseName, [])
    }
    courseMap.get(dish.courseName)!.push(dish)
  }

  const sectionStyle = {
    marginBottom: '20px',
  }

  const sectionTitleStyle = {
    fontSize: '14px',
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    color: '#6b7280',
    marginBottom: '8px',
    paddingBottom: '4px',
    borderBottom: '1px solid #e5e7eb',
  }

  const fieldStyle = {
    fontSize: '15px',
    marginBottom: '4px',
  }

  return (
    <PrintLayout title="Event Brief">
      {/* ALLERGIES AND DIETARY - TOP AND PROMINENT */}
      {(allAllergies.length > 0 || allDietary.length > 0) && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            border: '3px solid #991b1b',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
          }}
        >
          {allAllergies.length > 0 && (
            <div style={{ marginBottom: allDietary.length > 0 ? '12px' : 0 }}>
              <p style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#991b1b',
                margin: '0 0 6px',
                textTransform: 'uppercase',
              }}>
                ALLERGIES
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {allAllergies.map(a => (
                  <span
                    key={a}
                    style={{
                      padding: '4px 12px',
                      fontSize: '16px',
                      fontWeight: 700,
                      backgroundColor: '#fecaca',
                      color: '#991b1b',
                      borderRadius: '4px',
                      border: '1px solid #f87171',
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {allDietary.length > 0 && (
            <div>
              <p style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#92400e',
                margin: '0 0 6px',
                textTransform: 'uppercase',
              }}>
                DIETARY RESTRICTIONS
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {allDietary.map(d => (
                  <span
                    key={d}
                    style={{
                      padding: '4px 12px',
                      fontSize: '15px',
                      fontWeight: 600,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '4px',
                      border: '1px solid #fde68a',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two-column grid: client/event info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left: Client info */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Client</h2>
          <p style={fieldStyle}>
            <strong>{client?.fullName || 'Unknown'}</strong>
          </p>
          {client?.phone && <p style={fieldStyle}>{client.phone}</p>}
          {client?.email && <p style={fieldStyle}>{client.email}</p>}
        </div>

        {/* Right: Date & Time */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Date & Time</h2>
          <p style={fieldStyle}><strong>{formattedDate}</strong></p>
          <p style={fieldStyle}>Serve time: {event.serveTime}</p>
          {event.arrivalTime && <p style={fieldStyle}>Arrival: {event.arrivalTime}</p>}
          {event.departureTime && <p style={fieldStyle}>Departure: {event.departureTime}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Location */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Location</h2>
          <p style={fieldStyle}>{event.locationAddress}</p>
          <p style={fieldStyle}>{event.locationCity}, {event.locationState} {event.locationZip}</p>
          {event.locationNotes && <p style={{ ...fieldStyle, color: '#6b7280' }}>{event.locationNotes}</p>}
          {event.accessInstructions && (
            <p style={{ ...fieldStyle, marginTop: '8px' }}>
              <strong>Access:</strong> {event.accessInstructions}
            </p>
          )}
          {client?.parkingInstructions && (
            <p style={{ ...fieldStyle }}>
              <strong>Parking:</strong> {client.parkingInstructions}
            </p>
          )}
        </div>

        {/* Event Details */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Event Details</h2>
          <p style={fieldStyle}><strong>Guests:</strong> {event.guestCount}</p>
          {event.occasion && <p style={fieldStyle}><strong>Occasion:</strong> {event.occasion}</p>}
          <p style={fieldStyle}><strong>Service:</strong> {event.serviceStyle}</p>
        </div>
      </div>

      {/* Menu overview */}
      {menuDishes.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Menu</h2>
          {Array.from(courseMap.entries()).map(([courseName, dishes]) => (
            <div key={courseName} style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px' }}>
                {courseName}
              </p>
              {dishes.map((dish, idx) => (
                <p key={idx} style={{ fontSize: '15px', margin: '0 0 2px', paddingLeft: '12px' }}>
                  {dish.name || 'Untitled'}
                  {dish.dietaryTags.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '6px' }}>
                      ({dish.dietaryTags.join(', ')})
                    </span>
                  )}
                  {dish.allergenFlags.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600, marginLeft: '6px' }}>
                      Contains: {dish.allergenFlags.join(', ')}
                    </span>
                  )}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Kitchen & Site Notes */}
      {(event.kitchenNotes || event.siteNotes || client?.kitchenConstraints || client?.houseRules) && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Kitchen & Site Notes</h2>
          {event.kitchenNotes && (
            <p style={fieldStyle}><strong>Kitchen:</strong> {event.kitchenNotes}</p>
          )}
          {client?.kitchenConstraints && (
            <p style={fieldStyle}><strong>Kitchen constraints:</strong> {client.kitchenConstraints}</p>
          )}
          {event.siteNotes && (
            <p style={fieldStyle}><strong>Site:</strong> {event.siteNotes}</p>
          )}
          {client?.houseRules && (
            <p style={fieldStyle}><strong>House rules:</strong> {client.houseRules}</p>
          )}
          {client?.equipmentAvailable && client.equipmentAvailable.length > 0 && (
            <p style={fieldStyle}><strong>Equipment on site:</strong> {client.equipmentAvailable.join(', ')}</p>
          )}
        </div>
      )}

      {/* Special requests */}
      {event.specialRequests && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
          }}
        >
          <h2 style={{ ...sectionTitleStyle, borderBottom: 'none', color: '#92400e' }}>Special Requests</h2>
          <p style={{ fontSize: '15px', margin: 0, whiteSpace: 'pre-wrap' }}>{event.specialRequests}</p>
        </div>
      )}
    </PrintLayout>
  )
}
