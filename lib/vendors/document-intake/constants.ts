export const VENDOR_DOCUMENTS_BUCKET = 'vendor-documents'
export const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB
export const SIGNED_URL_EXPIRY_SECONDS = 3600

export const ALLOWED_EXTENSIONS = new Set([
  'csv',
  'xlsx',
  'xls',
  'pdf',
  'txt',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
])

export const TABULAR_EXTENSIONS = new Set(['csv', 'xlsx', 'xls'])
export const TEXT_EXTRACTABLE_EXTENSIONS = new Set([
  'pdf',
  'txt',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'docx',
])
export const SUPPORTED_EXPENSE_CATEGORIES = new Set([
  'groceries',
  'alcohol',
  'specialty_items',
  'gas_mileage',
  'vehicle',
  'equipment',
  'supplies',
  'venue_rental',
  'labor',
  'uniforms',
  'subscriptions',
  'marketing',
  'insurance_licenses',
  'professional_services',
  'education',
  'utilities',
  'other',
])
