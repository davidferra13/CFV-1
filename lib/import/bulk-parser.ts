export interface ImportRecord {
  [key: string]: string | number | null
}

export interface ParseResult {
  records: ImportRecord[]
  headers: string[]
  errors: string[]
}

export type FileType = 'csv' | 'excel' | 'pdf' | 'image' | 'unknown'

export function detectFileType(file: File): FileType {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel'
  if (name.endsWith('.pdf')) return 'pdf'
  if (/\.(png|jpg|jpeg|webp)$/.test(name)) return 'image'
  return 'unknown'
}

export async function parseFile(
  file: File,
  onProgress?: (msg: string, pct: number) => void,
): Promise<ParseResult> {
  onProgress?.('Reading file...', 10)
  const type = detectFileType(file)

  if (type === 'csv') {
    const text = await file.text()
    onProgress?.('Parsing CSV...', 50)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { records: [], headers: [], errors: [] }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const records = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const rec: ImportRecord = {}
      headers.forEach((h, i) => {
        rec[h] = values[i] ?? null
      })
      return rec
    })

    onProgress?.('Done', 100)
    return { records, headers, errors: [] }
  }

  onProgress?.('Done', 100)
  return {
    records: [],
    headers: [],
    errors: [`${type} parsing not yet supported — use CSV for now.`],
  }
}
