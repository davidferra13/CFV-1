// Supabase Database Types
// Generated from schema - this is a placeholder
// Run: npx supabase gen types typescript --local > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chefs: {
        Row: {
          id: string
          auth_user_id: string
          business_name: string
          email: string
          phone: string | null
          stripe_account_id: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          business_name: string
          email: string
          phone?: string | null
          stripe_account_id?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          business_name?: string
          email?: string
          phone?: string | null
          stripe_account_id?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          auth_user_id: string
          tenant_id: string
          full_name: string
          email: string
          phone: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          tenant_id: string
          full_name: string
          email: string
          phone?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          tenant_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          auth_user_id: string
          role: 'chef' | 'client'
          entity_id: string
          created_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          role: 'chef' | 'client'
          entity_id: string
          created_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          role?: 'chef' | 'client'
          entity_id?: string
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          title: string
          event_date: string
          guest_count: number
          location: string
          notes: string | null
          total_amount_cents: number
          deposit_amount_cents: number
          deposit_required: boolean
          status: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          status_changed_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          title: string
          event_date: string
          guest_count: number
          location: string
          notes?: string | null
          total_amount_cents: number
          deposit_amount_cents: number
          deposit_required?: boolean
          status?: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          status_changed_at?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          title?: string
          event_date?: string
          guest_count?: number
          location?: string
          notes?: string | null
          total_amount_cents?: number
          deposit_amount_cents?: number
          deposit_required?: boolean
          status?: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          status_changed_at?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      event_transitions: {
        Row: {
          id: string
          tenant_id: string
          event_id: string
          from_status: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | null
          to_status: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          transitioned_by: string | null
          transitioned_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          tenant_id: string
          event_id: string
          from_status?: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | null
          to_status: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          transitioned_by?: string | null
          transitioned_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          tenant_id?: string
          event_id?: string
          from_status?: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | null
          to_status?: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          transitioned_by?: string | null
          transitioned_at?: string
          metadata?: Json | null
        }
      }
      ledger_entries: {
        Row: {
          id: string
          tenant_id: string
          entry_type: 'charge_created' | 'charge_succeeded' | 'charge_failed' | 'refund_created' | 'refund_succeeded' | 'payout_created' | 'payout_paid' | 'adjustment'
          amount_cents: number
          currency: string
          event_id: string | null
          client_id: string | null
          stripe_event_id: string | null
          stripe_object_id: string | null
          stripe_event_type: string | null
          description: string
          metadata: Json | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          entry_type: 'charge_created' | 'charge_succeeded' | 'charge_failed' | 'refund_created' | 'refund_succeeded' | 'payout_created' | 'payout_paid' | 'adjustment'
          amount_cents: number
          currency?: string
          event_id?: string | null
          client_id?: string | null
          stripe_event_id?: string | null
          stripe_object_id?: string | null
          stripe_event_type?: string | null
          description: string
          metadata?: Json | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          entry_type?: 'charge_created' | 'charge_succeeded' | 'charge_failed' | 'refund_created' | 'refund_succeeded' | 'payout_created' | 'payout_paid' | 'adjustment'
          amount_cents?: number
          currency?: string
          event_id?: string | null
          client_id?: string | null
          stripe_event_id?: string | null
          stripe_object_id?: string | null
          stripe_event_type?: string | null
          description?: string
          metadata?: Json | null
          created_at?: string
          created_by?: string | null
        }
      }
      menus: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          price_per_person_cents: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          price_per_person_cents?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          price_per_person_cents?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      client_invitations: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string | null
          token: string
          expires_at: string
          used_at: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          full_name?: string | null
          token: string
          expires_at: string
          used_at?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          token?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string
          created_by?: string
        }
      }
    }
    Views: {
      event_financial_summary: {
        Row: {
          event_id: string
          tenant_id: string
          expected_total_cents: number
          expected_deposit_cents: number
          collected_cents: number
          is_fully_paid: boolean
          is_deposit_paid: boolean
        }
      }
    }
    Functions: {
      get_current_user_role: {
        Args: Record<string, never>
        Returns: 'chef' | 'client'
      }
      get_current_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_current_client_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'chef' | 'client'
      event_status: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
      ledger_entry_type: 'charge_created' | 'charge_succeeded' | 'charge_failed' | 'refund_created' | 'refund_succeeded' | 'payout_created' | 'payout_paid' | 'adjustment'
    }
  }
}
