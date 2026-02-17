// Chat system types
// These supplement the auto-generated Database types with app-level interfaces

export type ChatMessageType = 'text' | 'image' | 'file' | 'link' | 'event_ref' | 'system'
export type ConversationContextType = 'standalone' | 'inquiry' | 'event'
export type ParticipantRole = 'chef' | 'client'

export interface Conversation {
  id: string
  tenant_id: string
  context_type: ConversationContextType
  inquiry_id: string | null
  event_id: string | null
  last_message_at: string | null
  last_message_preview: string | null
  last_message_sender_id: string | null
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  auth_user_id: string
  role: ParticipantRole
  last_read_at: string | null
  notifications_muted: boolean
  joined_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  message_type: ChatMessageType
  body: string | null
  attachment_storage_path: string | null
  attachment_filename: string | null
  attachment_content_type: string | null
  attachment_size_bytes: number | null
  link_url: string | null
  link_title: string | null
  link_description: string | null
  link_image_url: string | null
  referenced_event_id: string | null
  system_event_type: string | null
  system_metadata: Record<string, unknown> | null
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

// Enriched types for UI rendering

export interface ConversationWithDetails extends Conversation {
  participants: ConversationParticipant[]
  unread_count: number
  // Resolved participant names for display
  other_participant_name?: string
  other_participant_email?: string
}

export interface ChatMessageWithSender extends ChatMessage {
  sender_name?: string
  sender_role?: ParticipantRole
}

// Input types for server actions

export interface CreateConversationInput {
  client_id: string
  context_type?: ConversationContextType
  inquiry_id?: string | null
  event_id?: string | null
  initial_message?: string
}

export interface SendMessageInput {
  conversation_id: string
  message_type?: ChatMessageType
  body?: string
  link_url?: string
  referenced_event_id?: string
}

export interface GetMessagesInput {
  conversation_id: string
  cursor?: string // ISO timestamp for cursor-based pagination
  limit?: number
}
