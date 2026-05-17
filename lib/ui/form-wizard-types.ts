// Form Wizard & Client Intake types (UI SYSTEM #5)

export type WizardStep = {
  id: string
  label: string
  description?: string
  fields: string[]
  validationRules?: Record<string, string>
  optional?: boolean
}

export type WizardConfig = {
  id: string
  tenantId: string
  wizardId: string
  name: string
  steps: WizardStep[]
  currentStep?: number
  completedSteps?: string[]
  createdAt: string
  updatedAt: string
}

export type FormFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'file'

export type FormFieldConfig = {
  key: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  options?: string[]
  defaultValue?: unknown
  helpText?: string
}

export type IntakeFormConfig = {
  id: string
  tenantId: string
  name: string
  fields: FormFieldConfig[]
  successMessage?: string
  redirectUrl?: string
  active: boolean
  createdAt: string
}

export type FormSubmission = {
  id: string
  tenantId: string
  formId: string
  data: Record<string, unknown>
  submittedBy?: string
  submittedAt: string
  status: string
}

export type FormWizardSummary = {
  totalWizards: number
  totalForms: number
  totalSubmissions: number
  completionRate: number
  avgStepsCompleted: number
}
