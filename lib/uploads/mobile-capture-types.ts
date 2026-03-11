export const MOBILE_CAPTURE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const

export const MOBILE_CAPTURE_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.heif',
  '.webp',
] as const

export const MOBILE_CAPTURE_IMAGE_ACCEPT = MOBILE_CAPTURE_IMAGE_MIME_TYPES.join(',')

export const MOBILE_CAPTURE_FILE_ACCEPT = [
  ...MOBILE_CAPTURE_IMAGE_MIME_TYPES,
  'application/pdf',
].join(',')

export const MOBILE_CAPTURE_FILE_EXTENSION_ACCEPT = [
  ...MOBILE_CAPTURE_IMAGE_EXTENSIONS,
  '.pdf',
].join(',')

export function isMobileCaptureImageMimeType(value: string | null | undefined): boolean {
  if (!value) return false
  return (MOBILE_CAPTURE_IMAGE_MIME_TYPES as readonly string[]).includes(value.toLowerCase())
}
