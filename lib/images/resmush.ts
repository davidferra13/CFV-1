// reSmush.it — free image compression API, no key required
// https://resmush.it/api/
// Unlimited requests, max 5MB per image

const RESMUSH_API = 'http://api.resmush.it/ws.php'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB limit

export interface CompressResult {
  success: boolean
  originalSize: number
  compressedSize: number
  savedPercent: number
  compressedUrl: string | null
  error: string | null
}

/**
 * Compress an image by URL.
 * reSmush.it fetches the image, compresses it, and returns a URL to download.
 * Best for: menu photos, event photos, profile images before storing.
 *
 * @param imageUrl - Public URL of the image to compress
 * @param quality - Compression quality 0-100 (default 92, good balance)
 */
export async function compressImageByUrl(imageUrl: string, quality = 92): Promise<CompressResult> {
  try {
    const params = new URLSearchParams({
      img: imageUrl,
      qlty: String(quality),
    })

    const res = await fetch(`${RESMUSH_API}?${params}`)
    if (!res.ok) {
      return {
        success: false,
        originalSize: 0,
        compressedSize: 0,
        savedPercent: 0,
        compressedUrl: null,
        error: `API returned ${res.status}`,
      }
    }

    const data = await res.json()

    if (data.error) {
      return {
        success: false,
        originalSize: 0,
        compressedSize: 0,
        savedPercent: 0,
        compressedUrl: null,
        error: String(data.error),
      }
    }

    const originalSize = data.src_size ?? 0
    const compressedSize = data.dest_size ?? 0
    const savedPercent =
      originalSize > 0 ? Math.round(((originalSize - compressedSize) / originalSize) * 100) : 0

    return {
      success: true,
      originalSize,
      compressedSize,
      savedPercent,
      compressedUrl: data.dest ?? null,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      originalSize: 0,
      compressedSize: 0,
      savedPercent: 0,
      compressedUrl: null,
      error: err instanceof Error ? err.message : 'Compression failed',
    }
  }
}

/**
 * Compress an image from a File/Buffer (POST method).
 * Use this when you have the raw image data, not a URL.
 */
export async function compressImageBuffer(
  buffer: Buffer,
  filename: string,
  quality = 92
): Promise<CompressResult> {
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return {
      success: false,
      originalSize: buffer.byteLength,
      compressedSize: 0,
      savedPercent: 0,
      compressedUrl: null,
      error: `Image too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max 5MB.`,
    }
  }

  try {
    const formData = new FormData()
    const blob = new Blob([buffer as any])
    formData.append('files', blob, filename)

    const params = new URLSearchParams({ qlty: String(quality) })
    const res = await fetch(`${RESMUSH_API}?${params}`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      return {
        success: false,
        originalSize: buffer.byteLength,
        compressedSize: 0,
        savedPercent: 0,
        compressedUrl: null,
        error: `API returned ${res.status}`,
      }
    }

    const data = await res.json()

    if (data.error) {
      return {
        success: false,
        originalSize: buffer.byteLength,
        compressedSize: 0,
        savedPercent: 0,
        compressedUrl: null,
        error: String(data.error),
      }
    }

    const compressedSize = data.dest_size ?? 0
    const savedPercent =
      buffer.byteLength > 0
        ? Math.round(((buffer.byteLength - compressedSize) / buffer.byteLength) * 100)
        : 0

    return {
      success: true,
      originalSize: buffer.byteLength,
      compressedSize,
      savedPercent,
      compressedUrl: data.dest ?? null,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      originalSize: buffer.byteLength,
      compressedSize: 0,
      savedPercent: 0,
      compressedUrl: null,
      error: err instanceof Error ? err.message : 'Compression failed',
    }
  }
}
