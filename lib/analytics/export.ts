// Analytics CSV Export - client-side utility
// Converts structured analytics data to downloadable CSV

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escape = (val: string | number): string => {
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Pre-built export helpers for common analytics data shapes

export function exportRevenueByType(
  data: Array<{ eventType: string; revenueCents: number; count: number }>
): void {
  downloadCsv(
    'revenue-by-event-type',
    ['Event Type', 'Revenue ($)', 'Event Count'],
    data.map((d) => [d.eventType, (d.revenueCents / 100).toFixed(2), d.count])
  )
}

export function exportRevenueByDay(
  data: Array<{ day: string; revenueCents: number; count: number }>
): void {
  downloadCsv(
    'revenue-by-day-of-week',
    ['Day', 'Revenue ($)', 'Event Count'],
    data.map((d) => [d.day, (d.revenueCents / 100).toFixed(2), d.count])
  )
}

export function exportClientList(
  data: Array<{ name: string; revenueCents: number; eventCount: number }>
): void {
  downloadCsv(
    'client-revenue',
    ['Client', 'Revenue ($)', 'Events'],
    data.map((d) => [d.name, (d.revenueCents / 100).toFixed(2), d.eventCount])
  )
}

export function exportFunnel(data: {
  totalInquiries: number
  quotedCount: number
  confirmedCount: number
  completedCount: number
}): void {
  downloadCsv(
    'inquiry-funnel',
    ['Stage', 'Count'],
    [
      ['Inquiries', data.totalInquiries],
      ['Quoted', data.quotedCount],
      ['Confirmed', data.confirmedCount],
      ['Completed', data.completedCount],
    ]
  )
}
