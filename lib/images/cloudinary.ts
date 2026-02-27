// Cloudinary — image/video CDN + transformations
// https://cloudinary.com/
// 25 credits/month free, no credit card
// Resize, crop, optimize images on the fly via URL

/**
 * Cloudinary URL-based image transformations.
 * No SDK needed — just construct URLs with transformation parameters.
 *
 * Env vars needed:
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME — your cloud name (e.g. "chefflow")
 */

function getCloudName(): string {
  const name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!name) throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set')
  return name
}

type ImageFormat = 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
type ImageFit = 'fill' | 'fit' | 'scale' | 'crop' | 'thumb'

interface TransformOptions {
  width?: number
  height?: number
  fit?: ImageFit
  format?: ImageFormat
  quality?: number | 'auto'
  blur?: number
  gravity?: 'face' | 'center' | 'auto'
}

/**
 * Build a Cloudinary delivery URL with transformations.
 * Upload images to Cloudinary, then use this to serve optimized versions.
 *
 * @param publicId - The image's public ID in Cloudinary
 * @param options - Transformation options
 */
export function getImageUrl(publicId: string, options: TransformOptions = {}): string {
  const cloudName = getCloudName()
  const transforms: string[] = []

  if (options.width) transforms.push(`w_${options.width}`)
  if (options.height) transforms.push(`h_${options.height}`)
  if (options.fit) transforms.push(`c_${options.fit}`)
  if (options.format) transforms.push(`f_${options.format}`)
  if (options.quality) transforms.push(`q_${options.quality}`)
  if (options.blur) transforms.push(`e_blur:${options.blur}`)
  if (options.gravity) transforms.push(`g_${options.gravity}`)

  const transformStr = transforms.length > 0 ? transforms.join(',') + '/' : ''

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`
}

/**
 * Get an optimized thumbnail for a menu item or recipe.
 */
export function getMenuThumbnail(publicId: string, size = 400): string {
  return getImageUrl(publicId, {
    width: size,
    height: size,
    fit: 'fill',
    format: 'auto',
    quality: 'auto',
  })
}

/**
 * Get a hero image for an event page.
 */
export function getEventHero(publicId: string): string {
  return getImageUrl(publicId, {
    width: 1200,
    height: 600,
    fit: 'fill',
    format: 'auto',
    quality: 'auto',
    gravity: 'auto',
  })
}

/**
 * Get a profile photo (circular crop optimized).
 */
export function getProfilePhoto(publicId: string, size = 200): string {
  return getImageUrl(publicId, {
    width: size,
    height: size,
    fit: 'thumb',
    format: 'auto',
    quality: 'auto',
    gravity: 'face',
  })
}

/**
 * Get a blurred placeholder for lazy loading.
 */
export function getBlurPlaceholder(publicId: string): string {
  return getImageUrl(publicId, {
    width: 30,
    height: 30,
    format: 'auto',
    quality: 10,
    blur: 1000,
  })
}

/**
 * Upload an image to Cloudinary via unsigned upload.
 * Requires an unsigned upload preset configured in Cloudinary dashboard.
 */
export async function uploadImage(
  file: File,
  uploadPreset: string,
  folder = 'chefflow'
): Promise<{ publicId: string; url: string; width: number; height: number } | null> {
  try {
    const cloudName = getCloudName()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', folder)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) return null
    const data = await res.json()

    return {
      publicId: data.public_id,
      url: data.secure_url,
      width: data.width,
      height: data.height,
    }
  } catch {
    return null
  }
}
