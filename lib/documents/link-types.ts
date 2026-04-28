export type LinkDocumentInput = {
  documentId: string
  eventId?: string | null
  clientId?: string | null
  inquiryId?: string | null
}

export type LinkedDocument = {
  id: string
  title: string
  documentType: string
  summary: string | null
  createdAt: string
  folderName: string | null
}
