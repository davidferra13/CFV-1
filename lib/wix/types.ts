// Wix Integration Type Definitions

// ─── Wix Connection ──────────────────────────────────────────────────────

export type WixConnection = {
  id: string
  chef_id: string
  tenant_id: string
  webhook_secret: string
  form_field_mapping: Record<string, string>
  auto_create_inquiry: boolean
  last_submission_at: string | null
  total_submissions: number
  error_count: number
  created_at: string
  updated_at: string
}

export type WixConnectionStatus = {
  connected: boolean
  webhookUrl: string | null
  webhookSecret: string | null
  lastSubmission: string | null
  totalSubmissions: number
  errorCount: number
}

// ─── Wix Submission ──────────────────────────────────────────────────────

export type WixSubmissionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate'

export type WixSubmission = {
  id: string
  tenant_id: string
  wix_submission_id: string
  wix_form_id: string | null
  raw_payload: Record<string, unknown>
  submitter_name: string | null
  submitter_email: string | null
  submitter_phone: string | null
  status: WixSubmissionStatus
  inquiry_id: string | null
  client_id: string | null
  gmail_duplicate_of: string | null
  error: string | null
  processing_attempts: number
  created_at: string
  processed_at: string | null
}

// ─── Webhook Payload ─────────────────────────────────────────────────────
// Wix form submissions come as JSON with form fields

export type WixFormField = {
  fieldName: string
  fieldValue: string
}

export type WixWebhookPayload = {
  // Wix submission metadata
  submissionId?: string
  formId?: string
  // Form fields (varies by form)
  [key: string]: unknown
}

// ─── Processing Result ───────────────────────────────────────────────────

export type ProcessResult = {
  submissionId: string
  status: 'completed' | 'failed' | 'duplicate'
  inquiryId?: string
  clientId?: string
  error?: string
}
