// Event Financial Export Button
// Client component that binds an eventId to the export action

'use client'

import { CSVDownloadButton } from './csv-download-button'
import { exportEventCSV } from '@/lib/exports/actions'

type Props = {
  eventId: string
}

export function EventExportButton({ eventId }: Props) {
  return (
    <CSVDownloadButton
      action={() => exportEventCSV(eventId)}
      label="Export Financials"
      loadingLabel="Exporting..."
    />
  )
}
