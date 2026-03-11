export const MENU_UPLOAD_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'heic',
  'heif',
  'webp',
  'docx',
  'txt',
  'rtf',
] as const

export const MENU_UPLOAD_EXTENSION_SET = new Set<string>(MENU_UPLOAD_EXTENSIONS)

export const MENU_UPLOAD_ACCEPT_ATTRIBUTE = MENU_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`)

export const MENU_UPLOAD_EXTENSION_LIST = MENU_UPLOAD_EXTENSIONS.join(', ')

export const MENU_UPLOAD_FORMATS_LABEL =
  'PDF, JPG/JPEG, PNG, HEIC/HEIF, WEBP, DOCX, TXT, or RTF'
