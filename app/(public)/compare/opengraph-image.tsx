import { ImageResponse } from 'next/og'
import { CompareSocialImage } from './_components/compare-social-image'

export const runtime = 'edge'
export const alt = 'ChefFlow comparison hub'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const COMPARE_CHIPS = ['HoneyBook', 'HubSpot', 'Spreadsheets', 'Dubsado', 'Notion + Airtable']

export default function Image() {
  return new ImageResponse(
    (
      <CompareSocialImage
        accentLabel="What you get"
        chips={COMPARE_CHIPS}
        description="Migration guidance, fit framing, and walkthrough paths for private chef operators."
        eyebrow="Comparison Hub"
        title="Compare ChefFlow"
      />
    ),
    { ...size }
  )
}
