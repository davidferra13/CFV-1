// Client-side image quality pre-check
// Validates file size, dimensions, and basic readability before upload.
// Runs entirely in the browser (no server cost, no AI).

const MIN_WIDTH = 200
const MIN_HEIGHT = 200
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const WARN_FILE_SIZE = 512 * 1024 // 512KB - small files often mean low quality
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']

export type ImageQualityResult = {
  valid: boolean
  warnings: string[]
  error?: string
  width?: number
  height?: number
  fileSizeMB?: number
}

/**
 * Run client-side quality checks on a receipt image file.
 * Returns validation result with optional warnings (not blockers).
 */
export function checkImageQuality(file: File): Promise<ImageQualityResult> {
  return new Promise((resolve) => {
    const fileSizeMB = file.size / (1024 * 1024)

    // Type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      resolve({
        valid: false,
        error: 'Invalid file type. Use JPEG, PNG, HEIC, or WebP.',
        warnings: [],
      })
      return
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      resolve({
        valid: false,
        error: `File too large (${fileSizeMB.toFixed(1)} MB). Maximum is 10 MB.`,
        warnings: [],
      })
      return
    }

    // HEIC/HEIF can't be read as Image in browser - skip dimension check
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      const warnings: string[] = []
      if (file.size < WARN_FILE_SIZE) {
        warnings.push('Small file size may indicate low image quality')
      }
      resolve({ valid: true, warnings, fileSizeMB })
      return
    }

    // Load image to check dimensions
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const warnings: string[] = []

      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        resolve({
          valid: false,
          error: `Image too small (${img.width}x${img.height}). Minimum ${MIN_WIDTH}x${MIN_HEIGHT} for readable OCR.`,
          warnings: [],
        })
        return
      }

      if (file.size < WARN_FILE_SIZE) {
        warnings.push('Small file size may indicate low image quality')
      }

      if (img.width < 400 || img.height < 400) {
        warnings.push('Low resolution may reduce OCR accuracy')
      }

      resolve({
        valid: true,
        warnings,
        width: img.width,
        height: img.height,
        fileSizeMB,
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      // Can't read image dimensions but file type is valid - allow upload with warning
      resolve({
        valid: true,
        warnings: ['Could not read image dimensions. OCR may have reduced accuracy.'],
        fileSizeMB,
      })
    }

    img.src = url
  })
}
