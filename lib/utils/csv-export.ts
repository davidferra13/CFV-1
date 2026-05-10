// CSV export utilities for client-side data downloads

function escapeCsvValue(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Trigger a CSV file download in the browser */
export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Convert headers + rows into a CSV string */
export function tableToCsv(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(',')
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(','))
  return [headerLine, ...dataLines].join('\n')
}

/** Convert an array of key-value stat objects into a CSV string */
export function statsToCsv(stats: Record<string, string | number>[]): string {
  if (stats.length === 0) return ''
  const keys = Object.keys(stats[0])
  const headerLine = keys.map(escapeCsvValue).join(',')
  const dataLines = stats.map((row) => keys.map((k) => escapeCsvValue(row[k] ?? '')).join(','))
  return [headerLine, ...dataLines].join('\n')
}
