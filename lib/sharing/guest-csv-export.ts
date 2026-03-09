type GuestExportRow = {
  name: string
  email: string | null
  phone: string | null
  rsvp_status: string
  dietary_notes: string | null
  plus_ones: number
}

function escapeCSV(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  if (!/[",\n]/.test(text)) {
    return text
  }
  return `"${text.replace(/"/g, '""')}"`
}

export function formatGuestListCSV(rows: GuestExportRow[]) {
  const header = ['Name', 'Email', 'Phone', 'RSVP Status', 'Dietary Notes', 'Plus Ones']
  const body = rows.map((row) =>
    [
      row.name,
      row.email,
      row.phone,
      row.rsvp_status,
      row.dietary_notes,
      row.plus_ones,
    ]
      .map(escapeCSV)
      .join(',')
  )

  return [header.join(','), ...body].join('\n')
}
