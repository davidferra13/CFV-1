import sharp from 'sharp'

type OptimizeResult = { data: Buffer; mimeType: string; ext: string }

const QUALITY = 80

function fallbackExt(mimeType: string): string {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Core image optimization: resize to max dimension and convert to WebP.
 * If optimization fails, returns the original buffer so uploads are never blocked.
 */
async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
  maxWidth: number,
  label: string
): Promise<OptimizeResult> {
  // SVGs scale naturally, no raster optimization
  if (mimeType === 'image/svg+xml') {
    return { data: buffer, mimeType, ext: 'svg' }
  }

  try {
    const image = sharp(buffer)
    const metadata = await image.metadata()

    let pipeline = image

    if (metadata.width && metadata.width > maxWidth) {
      pipeline = pipeline.resize(maxWidth, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    const optimized = await pipeline.webp({ quality: QUALITY, effort: 4 }).toBuffer()

    return { data: optimized, mimeType: 'image/webp', ext: 'webp' }
  } catch (err) {
    console.warn(`[${label}] optimization failed, using original:`, err)
    return { data: buffer, mimeType, ext: fallbackExt(mimeType) }
  }
}

/**
 * Optimize a logo image: resize to max 400px wide and convert to WebP.
 */
export function optimizeLogo(buffer: Buffer, mimeType: string): Promise<OptimizeResult> {
  return optimizeImage(buffer, mimeType, 400, 'optimizeLogo')
}

/**
 * Optimize a profile photo: resize to max 512px wide and convert to WebP.
 * Replaces the external resmush.it dependency with local sharp processing.
 */
export function optimizeProfilePhoto(buffer: Buffer, mimeType: string): Promise<OptimizeResult> {
  return optimizeImage(buffer, mimeType, 512, 'optimizeProfilePhoto')
}

/**
 * Optimize an event/general photo: resize to max 1024px wide and convert to WebP.
 * Replaces the external resmush.it dependency with local sharp processing.
 */
export function optimizePhoto(buffer: Buffer, mimeType: string): Promise<OptimizeResult> {
  return optimizeImage(buffer, mimeType, 1024, 'optimizePhoto')
}
