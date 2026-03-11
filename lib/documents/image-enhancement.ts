import sharp from 'sharp'

const ENHANCEABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

const TARGET_LONG_EDGE_PX = 2600
const MAX_UPSCALE_FACTOR = 2

export type DeterministicDocumentEnhancementResult = {
  buffer: Buffer
  contentType: 'image/png'
  width: number
  height: number
  scaleFactor: number
}

export function canDeterministicallyEnhanceDocumentImage(
  mimeType: string | null | undefined
): boolean {
  if (!mimeType) return false
  return ENHANCEABLE_MIME_TYPES.has(mimeType.toLowerCase())
}

export async function buildDeterministicEnhancedDocumentImage(
  buffer: Buffer
): Promise<DeterministicDocumentEnhancementResult> {
  const baseImage = sharp(buffer, {
    sequentialRead: true,
    failOn: 'none',
    limitInputPixels: false,
  }).rotate()

  const metadata = await baseImage.metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  if (width <= 0 || height <= 0) {
    throw new Error('Unable to read document image dimensions.')
  }

  const longEdge = Math.max(width, height)
  const targetLongEdge =
    longEdge >= TARGET_LONG_EDGE_PX
      ? longEdge
      : Math.min(TARGET_LONG_EDGE_PX, Math.round(longEdge * MAX_UPSCALE_FACTOR))
  const scaleFactor = Number((targetLongEdge / longEdge).toFixed(2))

  const resizedImage =
    targetLongEdge > longEdge
      ? baseImage.resize({
          width: width >= height ? targetLongEdge : undefined,
          height: height > width ? targetLongEdge : undefined,
          fit: 'inside',
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: false,
        })
      : baseImage

  const { data, info } = await resizedImage
    .normalise()
    .sharpen({
      sigma: 1.1,
      m1: 0.4,
      m2: 1.8,
      x1: 1.5,
      y2: 8,
      y3: 16,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    contentType: 'image/png',
    width: info.width,
    height: info.height,
    scaleFactor,
  }
}
