// reSmush.it - free image compression API, no key required
// https://resmush.it/api/
// Unlimited requests, max 5MB per image

const RESMUSH_API = 'https://api.resmush.it/ws.php'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB limit

export interface CompressResult {
  success: boolean
  originalSize: number
  compressedSize: number
  savedPercent: number
  compressedUrl: string | null
  error: string | null
}

// compressImageByUrl() was removed - it accepted arbitrary URLs without validation,
// creating an SSRF vector. Use compressImageBuffer() with raw image data instead.

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
