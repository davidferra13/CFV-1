export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          campaign_id: string
          chef_id: string
          created_at: string
          id: string
          resolved_at: string | null
          test_percent: number
          updated_at: string
          variant_a_subject: string
          variant_b_subject: string
          winner: string | null
        }
        Insert: {
          campaign_id: string
          chef_id: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          test_percent?: number
          updated_at?: string
          variant_a_subject: string
          variant_b_subject: string
          winner?: string | null
        }
        Update: {
          campaign_id?: string
          chef_id?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          test_percent?: number
          updated_at?: string
          variant_a_subject?: string
          variant_b_subject?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_audit: {
        Row: {
          action: string
          auth_user_id: string
          business_name: string
          chef_id: string
          email: string
          id: string
          metadata: Json
          performed_at: string
          performed_by: string
        }
        Insert: {
          action: string
          auth_user_id: string
          business_name: string
          chef_id: string
          email: string
          id?: string
          metadata?: Json
          performed_at?: string
          performed_by?: string
        }
        Update: {
          action?: string
          auth_user_id?: string
          business_name?: string
          chef_id?: string
          email?: string
          id?: string
          metadata?: Json
          performed_at?: string
          performed_by?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "activity_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events_archive: {
        Row: {
          actor_id: string | null
          actor_type: string
          archived_at: string
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          archived_at?: string
          client_id?: string | null
          created_at: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          archived_at?: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action_type: string
          actor_email: string | null
          actor_user_id: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          ts: string
        }
        Insert: {
          action_type: string
          actor_email?: string | null
          actor_user_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          ts?: string
        }
        Update: {
          action_type?: string
          actor_email?: string | null
          actor_user_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          ts?: string
        }
        Relationships: []
      }
      admin_time_logs: {
        Row: {
          category: string
          chef_id: string
          created_at: string
          event_id: string | null
          id: string
          log_date: string
          minutes: number
          notes: string | null
        }
        Insert: {
          category?: string
          chef_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          log_date?: string
          minutes: number
          notes?: string | null
        }
        Update: {
          category?: string
          chef_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          log_date?: string
          minutes?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_time_logs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_time_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "admin_time_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "admin_time_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "admin_time_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      after_action_reviews: {
        Row: {
          calm_rating: number
          client_behavior_notes: string | null
          could_have_done_earlier: string | null
          created_at: string
          created_by: string | null
          event_id: string
          execution_rating: number | null
          forgotten_items: string[]
          general_notes: string | null
          id: string
          menu_performance_notes: string | null
          preparation_rating: number
          site_notes: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          what_went_well: string | null
          what_went_wrong: string | null
          would_do_differently: string | null
        }
        Insert: {
          calm_rating: number
          client_behavior_notes?: string | null
          could_have_done_earlier?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          execution_rating?: number | null
          forgotten_items?: string[]
          general_notes?: string | null
          id?: string
          menu_performance_notes?: string | null
          preparation_rating: number
          site_notes?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          what_went_well?: string | null
          what_went_wrong?: string | null
          would_do_differently?: string | null
        }
        Update: {
          calm_rating?: number
          client_behavior_notes?: string | null
          could_have_done_earlier?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          execution_rating?: number | null
          forgotten_items?: string[]
          general_notes?: string | null
          id?: string
          menu_performance_notes?: string | null
          preparation_rating?: number
          site_notes?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          what_went_well?: string | null
          what_went_wrong?: string | null
          would_do_differently?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "after_action_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "after_action_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "after_action_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "after_action_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "after_action_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_preferences: {
        Row: {
          allow_document_drafts: boolean
          allow_memory: boolean
          allow_suggestions: boolean
          created_at: string
          data_retention_days: number | null
          id: string
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          remy_archetype: string | null
          remy_enabled: boolean
          survey_state: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_document_drafts?: boolean
          allow_memory?: boolean
          allow_suggestions?: boolean
          created_at?: string
          data_retention_days?: number | null
          id?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          remy_archetype?: string | null
          remy_enabled?: boolean
          survey_state?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_document_drafts?: boolean
          allow_memory?: boolean
          allow_suggestions?: boolean
          created_at?: string
          data_retention_days?: number | null
          id?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          remy_archetype?: string | null
          remy_enabled?: boolean
          survey_state?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_task_queue: {
        Row: {
          actual_endpoint: string | null
          approval_tier: string
          approved_at: string | null
          approved_by: string | null
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          model_tier: string
          next_retry_at: string | null
          payload: Json
          priority: number
          recurrence: string | null
          rejection_reason: string | null
          related_client_id: string | null
          related_event_id: string | null
          related_inquiry_id: string | null
          result: Json | null
          scheduled_for: string
          started_at: string | null
          status: string
          target_endpoint: string
          task_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_endpoint?: string | null
          approval_tier?: string
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          model_tier?: string
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          recurrence?: string | null
          rejection_reason?: string | null
          related_client_id?: string | null
          related_event_id?: string | null
          related_inquiry_id?: string | null
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
          target_endpoint?: string
          task_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_endpoint?: string | null
          approval_tier?: string
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          model_tier?: string
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          recurrence?: string | null
          rejection_reason?: string | null
          related_client_id?: string | null
          related_event_id?: string | null
          related_inquiry_id?: string | null
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
          target_endpoint?: string
          task_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_task_queue_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ai_task_queue_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_queue_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ai_task_queue_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ai_task_queue_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ai_task_queue_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_queue_related_inquiry_id_fkey"
            columns: ["related_inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          after_values: Json | null
          before_values: Json | null
          change_summary: string | null
          changed_at: string
          changed_by: string | null
          id: string
          record_id: string
          table_name: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          after_values?: Json | null
          before_values?: Json | null
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          record_id: string
          table_name: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          after_values?: Json | null
          before_values?: Json | null
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          record_id?: string
          table_name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_sequences: {
        Row: {
          chef_id: string
          created_at: string
          days_before_trigger: number | null
          id: string
          is_active: boolean
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          days_before_trigger?: number | null
          id?: string
          is_active?: boolean
          name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          days_before_trigger?: number | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_sequences_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_execution_log: {
        Row: {
          attempt_number: number
          automation_id: string | null
          completed_at: string | null
          created_at: string
          dlq_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          started_at: string
          status: string
          tenant_id: string
          trigger_type: string
        }
        Insert: {
          attempt_number?: number
          automation_id?: string | null
          completed_at?: string | null
          created_at?: string
          dlq_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          started_at?: string
          status?: string
          tenant_id: string
          trigger_type: string
        }
        Update: {
          attempt_number?: number
          automation_id?: string | null
          completed_at?: string | null
          created_at?: string
          dlq_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          started_at?: string
          status?: string
          tenant_id?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          action_result: Json | null
          action_type: string
          attempt_number: number | null
          dlq_id: string | null
          error: string | null
          executed_at: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          rule_id: string
          status: string
          tenant_id: string
          trigger_entity_id: string | null
          trigger_entity_type: string | null
          trigger_event: string
        }
        Insert: {
          action_result?: Json | null
          action_type: string
          attempt_number?: number | null
          dlq_id?: string | null
          error?: string | null
          executed_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          rule_id: string
          status?: string
          tenant_id: string
          trigger_entity_id?: string | null
          trigger_entity_type?: string | null
          trigger_event: string
        }
        Update: {
          action_result?: Json | null
          action_type?: string
          attempt_number?: number | null
          dlq_id?: string | null
          error?: string | null
          executed_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          rule_id?: string
          status?: string
          tenant_id?: string
          trigger_entity_id?: string | null
          trigger_entity_type?: string | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_fired_at: string | null
          name: string
          priority: number
          tenant_id: string
          total_fires: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          name: string
          priority?: number
          tenant_id: string
          total_fires?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_fired_at?: string | null
          name?: string
          priority?: number
          tenant_id?: string
          total_fires?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_signal_notification_log: {
        Row: {
          calendar_entry_id: string
          chef_id: string
          client_id: string
          id: string
          notified_at: string
        }
        Insert: {
          calendar_entry_id: string
          chef_id: string
          client_id: string
          id?: string
          notified_at?: string
        }
        Update: {
          calendar_entry_id?: string
          chef_id?: string
          client_id?: string
          id?: string
          notified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_signal_notification_log_calendar_entry_id_fkey"
            columns: ["calendar_entry_id"]
            isOneToOne: false
            referencedRelation: "chef_calendar_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_signal_notification_log_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_signal_notification_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "availability_signal_notification_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          account_name: string | null
          account_type: string
          chef_id: string
          connected_at: string
          created_at: string
          id: string
          institution_name: string
          is_active: boolean
          provider: string
          provider_account_id: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_type?: string
          chef_id: string
          connected_at?: string
          created_at?: string
          id?: string
          institution_name: string
          is_active?: boolean
          provider: string
          provider_account_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_type?: string
          chef_id?: string
          connected_at?: string
          created_at?: string
          id?: string
          institution_name?: string
          is_active?: boolean
          provider?: string
          provider_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount_cents: number
          bank_connection_id: string
          chef_id: string
          confirmed_category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          matched_expense_id: string | null
          provider_transaction_id: string | null
          status: string
          suggested_category: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount_cents: number
          bank_connection_id: string
          chef_id: string
          confirmed_category?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          matched_expense_id?: string | null
          provider_transaction_id?: string | null
          status?: string
          suggested_category?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount_cents?: number
          bank_connection_id?: string
          chef_id?: string
          confirmed_category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          matched_expense_id?: string | null
          provider_transaction_id?: string | null
          status?: string
          suggested_category?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_expense_id_fkey"
            columns: ["matched_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_snapshots: {
        Row: {
          avg_event_value_cents: number | null
          avg_food_cost_pct: number | null
          booking_conversion_rate: number | null
          chef_id: string
          client_return_rate: number | null
          created_at: string
          id: string
          revenue_per_hour_cents: number | null
          snapshot_date: string
        }
        Insert: {
          avg_event_value_cents?: number | null
          avg_food_cost_pct?: number | null
          booking_conversion_rate?: number | null
          chef_id: string
          client_return_rate?: number | null
          created_at?: string
          id?: string
          revenue_per_hour_cents?: number | null
          snapshot_date: string
        }
        Update: {
          avg_event_value_cents?: number | null
          avg_food_cost_pct?: number | null
          booking_conversion_rate?: number | null
          chef_id?: string
          client_return_rate?: number | null
          created_at?: string
          id?: string
          revenue_per_hour_cents?: number | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_snapshots_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_signups: {
        Row: {
          business_name: string | null
          created_at: string
          cuisine_type: string | null
          email: string
          id: string
          invited_at: string | null
          name: string
          notes: string | null
          onboarded_at: string | null
          phone: string | null
          referral_source: string | null
          status: string
          years_in_business: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          cuisine_type?: string | null
          email: string
          id?: string
          invited_at?: string | null
          name: string
          notes?: string | null
          onboarded_at?: string | null
          phone?: string | null
          referral_source?: string | null
          status?: string
          years_in_business?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          cuisine_type?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          name?: string
          notes?: string | null
          onboarded_at?: string | null
          phone?: string | null
          referral_source?: string | null
          status?: string
          years_in_business?: string | null
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          chef_approved: boolean
          chef_approved_at: string | null
          chef_id: string
          chef_notes: string | null
          clicked_at: string | null
          client_id: string | null
          converted_to_inquiry_id: string | null
          created_at: string
          draft_body: string | null
          draft_subject: string | null
          email: string
          error_message: string | null
          id: string
          link_clicks: Json | null
          opened_at: string | null
          pixel_loaded_at: string | null
          resend_message_id: string | null
          responded_at: string | null
          sent_at: string | null
          spam_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          chef_approved?: boolean
          chef_approved_at?: string | null
          chef_id: string
          chef_notes?: string | null
          clicked_at?: string | null
          client_id?: string | null
          converted_to_inquiry_id?: string | null
          created_at?: string
          draft_body?: string | null
          draft_subject?: string | null
          email: string
          error_message?: string | null
          id?: string
          link_clicks?: Json | null
          opened_at?: string | null
          pixel_loaded_at?: string | null
          resend_message_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          spam_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          chef_approved?: boolean
          chef_approved_at?: string | null
          chef_id?: string
          chef_notes?: string | null
          clicked_at?: string | null
          client_id?: string | null
          converted_to_inquiry_id?: string | null
          created_at?: string
          draft_body?: string | null
          draft_subject?: string | null
          email?: string
          error_message?: string | null
          id?: string
          link_clicks?: Json | null
          opened_at?: string | null
          pixel_loaded_at?: string | null
          resend_message_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          spam_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "campaign_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_converted_to_inquiry_id_fkey"
            columns: ["converted_to_inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          body_html: string
          campaign_type: string
          chef_id: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          campaign_type?: string
          chef_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          campaign_type?: string
          chef_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      cannabis_control_packet_evidence: {
        Row: {
          content_type: string
          created_at: string
          event_id: string
          id: string
          reconciliation_id: string | null
          size_bytes: number
          snapshot_id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          event_id: string
          id?: string
          reconciliation_id?: string | null
          size_bytes: number
          snapshot_id: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          event_id?: string
          id?: string
          reconciliation_id?: string | null
          size_bytes?: number
          snapshot_id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cannabis_control_packet_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_evidence_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "cannabis_control_packet_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_evidence_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "cannabis_control_packet_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      cannabis_control_packet_reconciliations: {
        Row: {
          chef_signature: string | null
          created_at: string
          event_id: string
          extract_label_strength: string | null
          extract_returned_to_host: boolean | null
          finalized_at: string | null
          finalized_by: string | null
          guest_reconciliation: Json
          host_acknowledgment: string | null
          id: string
          irregularities_notes: string | null
          mismatch_summary: Json
          reconciled_at: string
          reconciled_by: string | null
          service_operator: string | null
          snapshot_id: string
          snapshot_version: number
          tenant_id: string
          total_doses_administered: number | null
          total_syringes_portioned: number | null
          updated_at: string
        }
        Insert: {
          chef_signature?: string | null
          created_at?: string
          event_id: string
          extract_label_strength?: string | null
          extract_returned_to_host?: boolean | null
          finalized_at?: string | null
          finalized_by?: string | null
          guest_reconciliation?: Json
          host_acknowledgment?: string | null
          id?: string
          irregularities_notes?: string | null
          mismatch_summary?: Json
          reconciled_at?: string
          reconciled_by?: string | null
          service_operator?: string | null
          snapshot_id: string
          snapshot_version: number
          tenant_id: string
          total_doses_administered?: number | null
          total_syringes_portioned?: number | null
          updated_at?: string
        }
        Update: {
          chef_signature?: string | null
          created_at?: string
          event_id?: string
          extract_label_strength?: string | null
          extract_returned_to_host?: boolean | null
          finalized_at?: string | null
          finalized_by?: string | null
          guest_reconciliation?: Json
          host_acknowledgment?: string | null
          id?: string
          irregularities_notes?: string | null
          mismatch_summary?: Json
          reconciled_at?: string
          reconciled_by?: string | null
          service_operator?: string | null
          snapshot_id?: string
          snapshot_version?: number
          tenant_id?: string
          total_doses_administered?: number | null
          total_syringes_portioned?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cannabis_control_packet_reconciliations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_reconciliations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_reconciliations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_reconciliations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_reconciliations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: true
            referencedRelation: "cannabis_control_packet_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_reconciliations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      cannabis_control_packet_snapshots: {
        Row: {
          archival_pdf_path: string | null
          course_count: number
          created_at: string
          event_id: string
          finalization_locked: boolean
          finalized_at: string | null
          finalized_by: string | null
          generated_at: string
          generated_by: string | null
          guest_snapshot: Json
          id: string
          layout_meta: Json
          layout_type: string
          participation_snapshot: Json
          seating_snapshot: Json
          snapshot_json: Json
          source_guest_updated_at: string | null
          tenant_id: string
          updated_at: string
          version_number: number
        }
        Insert: {
          archival_pdf_path?: string | null
          course_count: number
          created_at?: string
          event_id: string
          finalization_locked?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          generated_at?: string
          generated_by?: string | null
          guest_snapshot?: Json
          id?: string
          layout_meta?: Json
          layout_type: string
          participation_snapshot?: Json
          seating_snapshot?: Json
          snapshot_json?: Json
          source_guest_updated_at?: string | null
          tenant_id: string
          updated_at?: string
          version_number: number
        }
        Update: {
          archival_pdf_path?: string | null
          course_count?: number
          created_at?: string
          event_id?: string
          finalization_locked?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          generated_at?: string
          generated_by?: string | null
          guest_snapshot?: Json
          id?: string
          layout_meta?: Json
          layout_type?: string
          participation_snapshot?: Json
          seating_snapshot?: Json
          snapshot_json?: Json
          source_guest_updated_at?: string | null
          tenant_id?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cannabis_control_packet_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cannabis_control_packet_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      cannabis_event_details: {
        Row: {
          cannabis_category: Database["public"]["Enums"]["event_cannabis_category"]
          compliance_notes: string | null
          compliance_placeholder_acknowledged: boolean | null
          created_at: string
          event_id: string
          guest_consent_confirmed: boolean
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cannabis_category?: Database["public"]["Enums"]["event_cannabis_category"]
          compliance_notes?: string | null
          compliance_placeholder_acknowledged?: boolean | null
          created_at?: string
          event_id: string
          guest_consent_confirmed?: boolean
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cannabis_category?: Database["public"]["Enums"]["event_cannabis_category"]
          compliance_notes?: string | null
          compliance_placeholder_acknowledged?: boolean | null
          created_at?: string
          event_id?: string
          guest_consent_confirmed?: boolean
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cannabis_event_details_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_event_details_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_event_details_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "cannabis_event_details_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cannabis_event_details_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      cannabis_host_agreements: {
        Row: {
          agreement_text_snapshot: string
          agreement_version: string
          created_at: string
          host_user_id: string
          id: string
          immutable_hash: string
          ip_address: string | null
          signature_name: string
          signed_at: string
        }
        Insert: {
          agreement_text_snapshot: string
          agreement_version: string
          created_at?: string
          host_user_id: string
          id?: string
          immutable_hash: string
          ip_address?: string | null
          signature_name: string
          signed_at: string
        }
        Update: {
          agreement_text_snapshot?: string
          agreement_version?: string
          created_at?: string
          host_user_id?: string
          id?: string
          immutable_hash?: string
          ip_address?: string | null
          signature_name?: string
          signed_at?: string
        }
        Relationships: []
      }
      cannabis_tier_invitations: {
        Row: {
          admin_approval_status: string
          approved_at: string | null
          approved_by_admin_email: string | null
          claimed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          invited_by_auth_user_id: string
          invited_by_user_type: string
          invitee_email: string
          invitee_name: string | null
          personal_note: string | null
          rejection_reason: string | null
          sent_at: string | null
          token: string | null
        }
        Insert: {
          admin_approval_status?: string
          approved_at?: string | null
          approved_by_admin_email?: string | null
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by_auth_user_id: string
          invited_by_user_type: string
          invitee_email: string
          invitee_name?: string | null
          personal_note?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          token?: string | null
        }
        Update: {
          admin_approval_status?: string
          approved_at?: string | null
          approved_by_admin_email?: string | null
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by_auth_user_id?: string
          invited_by_user_type?: string
          invitee_email?: string
          invitee_name?: string | null
          personal_note?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          token?: string | null
        }
        Relationships: []
      }
      cannabis_tier_users: {
        Row: {
          auth_user_id: string
          entity_id: string
          granted_at: string
          granted_by_admin_email: string
          id: string
          notes: string | null
          status: string
          tenant_id: string | null
          user_type: string
        }
        Insert: {
          auth_user_id: string
          entity_id: string
          granted_at?: string
          granted_by_admin_email: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string | null
          user_type: string
        }
        Update: {
          auth_user_id?: string
          entity_id?: string
          granted_at?: string
          granted_by_admin_email?: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cannabis_tier_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_drawer_movements: {
        Row: {
          amount_cents: number
          commerce_payment_id: string | null
          commerce_refund_id: string | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          movement_type: Database["public"]["Enums"]["cash_drawer_movement_type"]
          notes: string | null
          register_session_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          commerce_payment_id?: string | null
          commerce_refund_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          movement_type: Database["public"]["Enums"]["cash_drawer_movement_type"]
          notes?: string | null
          register_session_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          commerce_payment_id?: string | null
          commerce_refund_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          movement_type?: Database["public"]["Enums"]["cash_drawer_movement_type"]
          notes?: string | null
          register_session_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_drawer_movements_commerce_payment_id_fkey"
            columns: ["commerce_payment_id"]
            isOneToOne: true
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawer_movements_commerce_refund_id_fkey"
            columns: ["commerce_refund_id"]
            isOneToOne: true
            referencedRelation: "commerce_refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawer_movements_register_session_id_fkey"
            columns: ["register_session_id"]
            isOneToOne: false
            referencedRelation: "register_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawer_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      charity_hours: {
        Row: {
          chef_id: string
          created_at: string
          ein: string | null
          google_place_id: string | null
          hours: number
          id: string
          is_verified_501c: boolean
          notes: string | null
          organization_address: string | null
          organization_name: string
          service_date: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          ein?: string | null
          google_place_id?: string | null
          hours: number
          id?: string
          is_verified_501c?: boolean
          notes?: string | null
          organization_address?: string | null
          organization_name: string
          service_date?: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          ein?: string | null
          google_place_id?: string | null
          hours?: number
          id?: string
          is_verified_501c?: boolean
          notes?: string | null
          organization_address?: string | null
          organization_name?: string
          service_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charity_hours_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_content_type: string | null
          attachment_filename: string | null
          attachment_size_bytes: number | null
          attachment_storage_path: string | null
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          link_description: string | null
          link_image_url: string | null
          link_title: string | null
          link_url: string | null
          message_type: Database["public"]["Enums"]["chat_message_type"]
          referenced_event_id: string | null
          sender_id: string
          system_event_type: string | null
          system_metadata: Json | null
        }
        Insert: {
          attachment_content_type?: string | null
          attachment_filename?: string | null
          attachment_size_bytes?: number | null
          attachment_storage_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          link_description?: string | null
          link_image_url?: string | null
          link_title?: string | null
          link_url?: string | null
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          referenced_event_id?: string | null
          sender_id: string
          system_event_type?: string | null
          system_metadata?: Json | null
        }
        Update: {
          attachment_content_type?: string | null
          attachment_filename?: string | null
          attachment_size_bytes?: number | null
          attachment_storage_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          link_description?: string | null
          link_image_url?: string | null
          link_title?: string | null
          link_url?: string | null
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          referenced_event_id?: string | null
          sender_id?: string
          system_event_type?: string | null
          system_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_referenced_event_id_fkey"
            columns: ["referenced_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chat_messages_referenced_event_id_fkey"
            columns: ["referenced_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chat_messages_referenced_event_id_fkey"
            columns: ["referenced_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chat_messages_referenced_event_id_fkey"
            columns: ["referenced_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_activity_log: {
        Row: {
          action: string
          actor_id: string
          client_id: string | null
          context: Json
          created_at: string
          domain: string
          entity_id: string | null
          entity_type: string
          id: string
          summary: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          client_id?: string | null
          context?: Json
          created_at?: string
          domain: string
          entity_id?: string | null
          entity_type: string
          id?: string
          summary: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          client_id?: string | null
          context?: Json
          created_at?: string
          domain?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          summary?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "chef_activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[] | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: string[] | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_automation_settings: {
        Row: {
          auto_response_template_enabled: boolean
          client_event_reminders_enabled: boolean
          closure_deadline_alerts_enabled: boolean
          closure_deadline_days: number
          created_at: string
          default_deposit_amount_cents: number
          default_deposit_enabled: boolean
          default_deposit_percentage: number
          default_deposit_type: string
          event_approaching_alerts_enabled: boolean
          event_approaching_hours: number
          event_reminder_14d_enabled: boolean
          event_reminder_1d_enabled: boolean
          event_reminder_2d_enabled: boolean
          event_reminder_30d_enabled: boolean
          event_reminder_7d_enabled: boolean
          follow_up_reminder_interval_hours: number
          follow_up_reminders_enabled: boolean
          id: string
          inquiry_auto_expiry_enabled: boolean
          inquiry_auto_response_template: string | null
          inquiry_expiry_days: number
          no_response_alerts_enabled: boolean
          no_response_threshold_days: number
          payment_overdue_alert_days_after: number
          payment_overdue_alert_enabled: boolean
          payment_reminder_days_before: number
          payment_reminder_enabled: boolean
          quote_auto_expiry_enabled: boolean
          receipt_upload_reminders_enabled: boolean
          tenant_id: string
          time_tracking_reminders_enabled: boolean
          updated_at: string
          weekly_summary_enabled: boolean
        }
        Insert: {
          auto_response_template_enabled?: boolean
          client_event_reminders_enabled?: boolean
          closure_deadline_alerts_enabled?: boolean
          closure_deadline_days?: number
          created_at?: string
          default_deposit_amount_cents?: number
          default_deposit_enabled?: boolean
          default_deposit_percentage?: number
          default_deposit_type?: string
          event_approaching_alerts_enabled?: boolean
          event_approaching_hours?: number
          event_reminder_14d_enabled?: boolean
          event_reminder_1d_enabled?: boolean
          event_reminder_2d_enabled?: boolean
          event_reminder_30d_enabled?: boolean
          event_reminder_7d_enabled?: boolean
          follow_up_reminder_interval_hours?: number
          follow_up_reminders_enabled?: boolean
          id?: string
          inquiry_auto_expiry_enabled?: boolean
          inquiry_auto_response_template?: string | null
          inquiry_expiry_days?: number
          no_response_alerts_enabled?: boolean
          no_response_threshold_days?: number
          payment_overdue_alert_days_after?: number
          payment_overdue_alert_enabled?: boolean
          payment_reminder_days_before?: number
          payment_reminder_enabled?: boolean
          quote_auto_expiry_enabled?: boolean
          receipt_upload_reminders_enabled?: boolean
          tenant_id: string
          time_tracking_reminders_enabled?: boolean
          updated_at?: string
          weekly_summary_enabled?: boolean
        }
        Update: {
          auto_response_template_enabled?: boolean
          client_event_reminders_enabled?: boolean
          closure_deadline_alerts_enabled?: boolean
          closure_deadline_days?: number
          created_at?: string
          default_deposit_amount_cents?: number
          default_deposit_enabled?: boolean
          default_deposit_percentage?: number
          default_deposit_type?: string
          event_approaching_alerts_enabled?: boolean
          event_approaching_hours?: number
          event_reminder_14d_enabled?: boolean
          event_reminder_1d_enabled?: boolean
          event_reminder_2d_enabled?: boolean
          event_reminder_30d_enabled?: boolean
          event_reminder_7d_enabled?: boolean
          follow_up_reminder_interval_hours?: number
          follow_up_reminders_enabled?: boolean
          id?: string
          inquiry_auto_expiry_enabled?: boolean
          inquiry_auto_response_template?: string | null
          inquiry_expiry_days?: number
          no_response_alerts_enabled?: boolean
          no_response_threshold_days?: number
          payment_overdue_alert_days_after?: number
          payment_overdue_alert_enabled?: boolean
          payment_reminder_days_before?: number
          payment_reminder_enabled?: boolean
          quote_auto_expiry_enabled?: boolean
          receipt_upload_reminders_enabled?: boolean
          tenant_id?: string
          time_tracking_reminders_enabled?: boolean
          updated_at?: string
          weekly_summary_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chef_automation_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_availability_blocks: {
        Row: {
          block_date: string
          block_type: string
          chef_id: string
          created_at: string
          end_time: string | null
          event_id: string | null
          id: string
          is_event_auto: boolean
          reason: string | null
          start_time: string | null
        }
        Insert: {
          block_date: string
          block_type?: string
          chef_id: string
          created_at?: string
          end_time?: string | null
          event_id?: string | null
          id?: string
          is_event_auto?: boolean
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          block_date?: string
          block_type?: string
          chef_id?: string
          created_at?: string
          end_time?: string | null
          event_id?: string | null
          id?: string
          is_event_auto?: boolean
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_availability_blocks_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_availability_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_availability_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_availability_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_availability_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_availability_share_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          tenant_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id: string
          token?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_availability_share_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_backup_contacts: {
        Row: {
          availability_notes: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          max_guest_count: number | null
          name: string
          phone: string | null
          relationship: string | null
          specialties: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          availability_notes?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_guest_count?: number | null
          name: string
          phone?: string | null
          relationship?: string | null
          specialties?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          availability_notes?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_guest_count?: number | null
          name?: string
          phone?: string | null
          relationship?: string | null
          specialties?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_backup_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_brand_mentions: {
        Row: {
          created_at: string | null
          excerpt: string | null
          found_at: string | null
          id: string
          is_reviewed: boolean | null
          sentiment: string | null
          source: string | null
          source_url: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          excerpt?: string | null
          found_at?: string | null
          id?: string
          is_reviewed?: boolean | null
          sentiment?: string | null
          source?: string | null
          source_url?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          excerpt?: string | null
          found_at?: string | null
          id?: string
          is_reviewed?: boolean | null
          sentiment?: string | null
          source?: string | null
          source_url?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_brand_mentions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_breadcrumbs: {
        Row: {
          actor_id: string
          breadcrumb_type: string
          created_at: string
          id: string
          label: string | null
          metadata: Json | null
          path: string
          referrer_path: string | null
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          actor_id: string
          breadcrumb_type?: string
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          path: string
          referrer_path?: string | null
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          actor_id?: string
          breadcrumb_type?: string
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          path?: string
          referrer_path?: string | null
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_breadcrumbs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_business_health_items: {
        Row: {
          completed_at: string | null
          document_url: string | null
          id: string
          item_key: string
          notes: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          document_url?: string | null
          id?: string
          item_key: string
          notes?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          document_url?: string | null
          id?: string
          item_key?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_business_health_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_calendar_entries: {
        Row: {
          actual_revenue_cents: number | null
          all_day: boolean
          blocks_bookings: boolean
          chef_id: string
          color_override: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string
          end_time: string | null
          entry_type: Database["public"]["Enums"]["chef_calendar_entry_type"]
          expected_revenue_cents: number | null
          id: string
          is_completed: boolean
          is_private: boolean
          is_public: boolean
          is_recurring: boolean
          is_revenue_generating: boolean
          public_note: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          revenue_notes: string | null
          revenue_type: string | null
          start_date: string
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_revenue_cents?: number | null
          all_day?: boolean
          blocks_bookings?: boolean
          chef_id: string
          color_override?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          end_time?: string | null
          entry_type: Database["public"]["Enums"]["chef_calendar_entry_type"]
          expected_revenue_cents?: number | null
          id?: string
          is_completed?: boolean
          is_private?: boolean
          is_public?: boolean
          is_recurring?: boolean
          is_revenue_generating?: boolean
          public_note?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          revenue_notes?: string | null
          revenue_type?: string | null
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_revenue_cents?: number | null
          all_day?: boolean
          blocks_bookings?: boolean
          chef_id?: string
          color_override?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          end_time?: string | null
          entry_type?: Database["public"]["Enums"]["chef_calendar_entry_type"]
          expected_revenue_cents?: number | null
          id?: string
          is_completed?: boolean
          is_private?: boolean
          is_public?: boolean
          is_recurring?: boolean
          is_revenue_generating?: boolean
          public_note?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          revenue_notes?: string | null
          revenue_type?: string | null
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_calendar_entries_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_capability_inventory: {
        Row: {
          capability_key: string
          capability_label: string
          capability_type: string
          confidence: string
          created_at: string | null
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          capability_key: string
          capability_label: string
          capability_type: string
          confidence: string
          created_at?: string | null
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          capability_key?: string
          capability_label?: string
          capability_type?: string
          confidence?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_capability_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_certifications: {
        Row: {
          cert_name: string | null
          cert_number: string | null
          cert_type: string
          chef_id: string
          created_at: string
          document_url: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          issue_date: string | null
          issued_date: string | null
          issuing_body: string | null
          name: string
          notes: string | null
          reminder_days_before: number
          renewal_url: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cert_name?: string | null
          cert_number?: string | null
          cert_type?: string
          chef_id: string
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          issued_date?: string | null
          issuing_body?: string | null
          name: string
          notes?: string | null
          reminder_days_before?: number
          renewal_url?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cert_name?: string | null
          cert_number?: string | null
          cert_type?: string
          chef_id?: string
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          issued_date?: string | null
          issuing_body?: string | null
          name?: string
          notes?: string | null
          reminder_days_before?: number
          renewal_url?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_certifications_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_channel_memberships: {
        Row: {
          channel_id: string
          chef_id: string
          id: string
          joined_at: string
          notifications_enabled: boolean
          role: string
        }
        Insert: {
          channel_id: string
          chef_id: string
          id?: string
          joined_at?: string
          notifications_enabled?: boolean
          role?: string
        }
        Update: {
          channel_id?: string
          chef_id?: string
          id?: string
          joined_at?: string
          notifications_enabled?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_channel_memberships_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chef_social_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_channel_memberships_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_comment_reactions: {
        Row: {
          chef_id: string
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
        }
        Insert: {
          chef_id: string
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
        }
        Update: {
          chef_id?: string
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_comment_reactions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "chef_post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_connections: {
        Row: {
          accepted_at: string | null
          addressee_id: string
          created_at: string
          declined_at: string | null
          id: string
          request_message: string | null
          requester_id: string
          status: Database["public"]["Enums"]["chef_connection_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          addressee_id: string
          created_at?: string
          declined_at?: string | null
          id?: string
          request_message?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["chef_connection_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          addressee_id?: string
          created_at?: string
          declined_at?: string | null
          id?: string
          request_message?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["chef_connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_creative_projects: {
        Row: {
          created_at: string | null
          cuisine: string | null
          dish_name: string
          entry_date: string | null
          id: string
          notes: string | null
          photos: string[] | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cuisine?: string | null
          dish_name: string
          entry_date?: string | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cuisine?: string | null
          dish_name?: string
          entry_date?: string | null
          id?: string
          notes?: string | null
          photos?: string[] | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_creative_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_crisis_plans: {
        Row: {
          activated_at: string | null
          checklist_progress: Json | null
          created_at: string | null
          id: string
          notes: string | null
          resolved_at: string | null
          scenario: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          checklist_progress?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          scenario: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          checklist_progress?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          scenario?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_crisis_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_culinary_profiles: {
        Row: {
          answer: string
          chef_id: string
          created_at: string
          id: string
          question_key: string
          updated_at: string
        }
        Insert: {
          answer?: string
          chef_id: string
          created_at?: string
          id?: string
          question_key: string
          updated_at?: string
        }
        Update: {
          answer?: string
          chef_id?: string
          created_at?: string
          id?: string
          question_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_culinary_profiles_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_culinary_words: {
        Row: {
          category: string
          chef_id: string
          created_at: string
          id: string
          tier: number
          word: string
        }
        Insert: {
          category?: string
          chef_id: string
          created_at?: string
          id?: string
          tier?: number
          word: string
        }
        Update: {
          category?: string
          chef_id?: string
          created_at?: string
          id?: string
          tier?: number
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_culinary_words_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_daily_briefings: {
        Row: {
          briefing_date: string
          chef_id: string
          content: Json
          created_at: string
          id: string
          sent_at: string | null
        }
        Insert: {
          briefing_date: string
          chef_id: string
          content?: Json
          created_at?: string
          id?: string
          sent_at?: string | null
        }
        Update: {
          briefing_date?: string
          chef_id?: string
          content?: Json
          created_at?: string
          id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_daily_briefings_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_documents: {
        Row: {
          client_id: string | null
          content_text: string | null
          created_at: string
          created_by: string | null
          document_type: string
          event_id: string | null
          folder_id: string | null
          id: string
          is_template: boolean
          key_terms: Json | null
          source_filename: string | null
          source_type: string
          summary: string | null
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          event_id?: string | null
          folder_id?: string | null
          id?: string
          is_template?: boolean
          key_terms?: Json | null
          source_filename?: string | null
          source_type?: string
          summary?: string | null
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          event_id?: string | null
          folder_id?: string | null
          id?: string
          is_template?: boolean
          key_terms?: Json | null
          source_filename?: string | null
          source_type?: string
          summary?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "chef_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "chef_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_education_log: {
        Row: {
          created_at: string | null
          description: string | null
          entry_date: string
          entry_type: string
          how_changed_cooking: string | null
          id: string
          learned: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entry_date?: string
          entry_type: string
          how_changed_cooking?: string | null
          id?: string
          learned?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entry_date?: string
          entry_type?: string
          how_changed_cooking?: string | null
          id?: string
          learned?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_education_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_emergency_contacts: {
        Row: {
          chef_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          relationship: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          relationship: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_emergency_contacts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_event_type_labels: {
        Row: {
          created_at: string
          custom_label: string
          default_label: string
          id: string
          label_type: Database["public"]["Enums"]["chef_event_label_type"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          custom_label: string
          default_label: string
          id?: string
          label_type: Database["public"]["Enums"]["chef_event_label_type"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          custom_label?: string
          default_label?: string
          id?: string
          label_type?: Database["public"]["Enums"]["chef_event_label_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_event_type_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_feature_flags: {
        Row: {
          chef_id: string
          enabled: boolean
          flag_name: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          enabled?: boolean
          flag_name: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          enabled?: boolean
          flag_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_feature_flags_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_feedback: {
        Row: {
          client_id: string | null
          created_at: string
          event_id: string | null
          feedback_date: string
          feedback_text: string
          id: string
          logged_by: string
          public_display: boolean
          rating: number | null
          reviewer_name: string | null
          source: string
          source_url: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          event_id?: string | null
          feedback_date?: string
          feedback_text: string
          id?: string
          logged_by: string
          public_display?: boolean
          rating?: number | null
          reviewer_name?: string | null
          source: string
          source_url?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          event_id?: string | null
          feedback_date?: string
          feedback_text?: string
          id?: string
          logged_by?: string
          public_display?: boolean
          rating?: number | null
          reviewer_name?: string | null
          source?: string
          source_url?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "chef_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_folder_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "chef_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_follows: {
        Row: {
          created_at: string
          follower_chef_id: string
          following_chef_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_chef_id: string
          following_chef_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_chef_id?: string
          following_chef_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_follows_follower_chef_id_fkey"
            columns: ["follower_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_follows_following_chef_id_fkey"
            columns: ["following_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_goals: {
        Row: {
          created_at: string
          goal_type: Database["public"]["Enums"]["chef_goal_type"]
          id: string
          label: string
          notes: string | null
          nudge_enabled: boolean
          nudge_level: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["chef_goal_status"]
          target_value: number
          tenant_id: string
          tracking_method: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_type: Database["public"]["Enums"]["chef_goal_type"]
          id?: string
          label: string
          notes?: string | null
          nudge_enabled?: boolean
          nudge_level?: string
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["chef_goal_status"]
          target_value: number
          tenant_id: string
          tracking_method?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_type?: Database["public"]["Enums"]["chef_goal_type"]
          id?: string
          label?: string
          notes?: string | null
          nudge_enabled?: boolean
          nudge_level?: string
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["chef_goal_status"]
          target_value?: number
          tenant_id?: string
          tracking_method?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_growth_checkins: {
        Row: {
          checkin_date: string
          created_at: string | null
          draining_this_quarter: string | null
          goal_next_quarter: string | null
          id: string
          learned_this_quarter: string | null
          satisfaction_score: number | null
          tenant_id: string
          track_request: string | null
        }
        Insert: {
          checkin_date?: string
          created_at?: string | null
          draining_this_quarter?: string | null
          goal_next_quarter?: string | null
          id?: string
          learned_this_quarter?: string | null
          satisfaction_score?: number | null
          tenant_id: string
          track_request?: string | null
        }
        Update: {
          checkin_date?: string
          created_at?: string | null
          draining_this_quarter?: string | null
          goal_next_quarter?: string | null
          id?: string
          learned_this_quarter?: string | null
          satisfaction_score?: number | null
          tenant_id?: string
          track_request?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_growth_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_incidents: {
        Row: {
          created_at: string | null
          description: string
          document_urls: string[] | null
          event_id: string | null
          follow_up_steps: Json | null
          id: string
          immediate_action: string | null
          incident_date: string
          incident_type: string
          parties_involved: string | null
          resolution_status: string | null
          resolved_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          document_urls?: string[] | null
          event_id?: string | null
          follow_up_steps?: Json | null
          id?: string
          immediate_action?: string | null
          incident_date: string
          incident_type: string
          parties_involved?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          document_urls?: string[] | null
          event_id?: string | null
          follow_up_steps?: Json | null
          id?: string
          immediate_action?: string | null
          incident_date?: string
          incident_type?: string
          parties_involved?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_insurance_policies: {
        Row: {
          carrier: string | null
          coverage_limit_cents: number | null
          created_at: string | null
          document_url: string | null
          effective_date: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          policy_number: string | null
          policy_type: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          coverage_limit_cents?: number | null
          created_at?: string | null
          document_url?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          policy_number?: string | null
          policy_type: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          coverage_limit_cents?: number | null
          created_at?: string | null
          document_url?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          policy_number?: string | null
          policy_type?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_insurance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_journal_media: {
        Row: {
          caption: string
          created_at: string
          created_by: string
          entry_id: string | null
          id: string
          is_cover: boolean
          journey_id: string
          latitude: number | null
          location_label: string
          longitude: number | null
          media_type: Database["public"]["Enums"]["chef_journal_media_type"]
          media_url: string
          taken_on: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          caption?: string
          created_at?: string
          created_by: string
          entry_id?: string | null
          id?: string
          is_cover?: boolean
          journey_id: string
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          media_type?: Database["public"]["Enums"]["chef_journal_media_type"]
          media_url: string
          taken_on?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          created_by?: string
          entry_id?: string | null
          id?: string
          is_cover?: boolean
          journey_id?: string
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          media_type?: Database["public"]["Enums"]["chef_journal_media_type"]
          media_url?: string
          taken_on?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_journal_media_entry_fk"
            columns: ["entry_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "chef_journey_entries"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "chef_journal_media_journey_fk"
            columns: ["journey_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "chef_journeys"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "chef_journal_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_journal_recipe_links: {
        Row: {
          adaptation_notes: string
          created_at: string
          created_by: string
          entry_id: string | null
          first_tested_on: string | null
          id: string
          journey_id: string
          outcome_notes: string
          outcome_rating: number | null
          recipe_id: string
          tenant_id: string
          updated_at: string
          would_repeat: boolean
        }
        Insert: {
          adaptation_notes?: string
          created_at?: string
          created_by: string
          entry_id?: string | null
          first_tested_on?: string | null
          id?: string
          journey_id: string
          outcome_notes?: string
          outcome_rating?: number | null
          recipe_id: string
          tenant_id: string
          updated_at?: string
          would_repeat?: boolean
        }
        Update: {
          adaptation_notes?: string
          created_at?: string
          created_by?: string
          entry_id?: string | null
          first_tested_on?: string | null
          id?: string
          journey_id?: string
          outcome_notes?: string
          outcome_rating?: number | null
          recipe_id?: string
          tenant_id?: string
          updated_at?: string
          would_repeat?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chef_journal_recipe_links_entry_fk"
            columns: ["entry_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "chef_journey_entries"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "chef_journal_recipe_links_journey_fk"
            columns: ["journey_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "chef_journeys"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "chef_journal_recipe_links_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "chef_journal_recipe_links_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_journal_recipe_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_journey_entries: {
        Row: {
          created_at: string
          created_by: string
          dishes_to_explore: string[]
          entry_date: string
          entry_type: Database["public"]["Enums"]["chef_journey_entry_type"]
          favorite_experience: string
          favorite_meal: string
          formatted_address: string
          id: string
          inspiration_taken: string[]
          is_highlight: boolean
          journey_id: string
          latitude: number | null
          location_label: string
          longitude: number | null
          mistakes_made: string[]
          narrative: string
          proud_moments: string[]
          source_links: string[]
          tenant_id: string
          title: string
          updated_at: string
          what_i_learned: string[]
          what_to_change_next_time: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          dishes_to_explore?: string[]
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["chef_journey_entry_type"]
          favorite_experience?: string
          favorite_meal?: string
          formatted_address?: string
          id?: string
          inspiration_taken?: string[]
          is_highlight?: boolean
          journey_id: string
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          mistakes_made?: string[]
          narrative?: string
          proud_moments?: string[]
          source_links?: string[]
          tenant_id: string
          title: string
          updated_at?: string
          what_i_learned?: string[]
          what_to_change_next_time?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          dishes_to_explore?: string[]
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["chef_journey_entry_type"]
          favorite_experience?: string
          favorite_meal?: string
          formatted_address?: string
          id?: string
          inspiration_taken?: string[]
          is_highlight?: boolean
          journey_id?: string
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          mistakes_made?: string[]
          narrative?: string
          proud_moments?: string[]
          source_links?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
          what_i_learned?: string[]
          what_to_change_next_time?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "chef_journey_entries_journey_fk"
            columns: ["journey_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "chef_journeys"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "chef_journey_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_journey_ideas: {
        Row: {
          adopted_on: string | null
          adopted_recipe_id: string | null
          application_area: Database["public"]["Enums"]["chef_journey_idea_area"]
          concept_notes: string
          created_at: string
          created_by: string
          expected_impact: string
          first_test_date: string | null
          id: string
          journey_id: string
          priority: number
          source_entry_id: string | null
          status: Database["public"]["Enums"]["chef_journey_idea_status"]
          tenant_id: string
          test_plan: string
          title: string
          updated_at: string
        }
        Insert: {
          adopted_on?: string | null
          adopted_recipe_id?: string | null
          application_area?: Database["public"]["Enums"]["chef_journey_idea_area"]
          concept_notes?: string
          created_at?: string
          created_by: string
          expected_impact?: string
          first_test_date?: string | null
          id?: string
          journey_id: string
          priority?: number
          source_entry_id?: string | null
          status?: Database["public"]["Enums"]["chef_journey_idea_status"]
          tenant_id: string
          test_plan?: string
          title: string
          updated_at?: string
        }
        Update: {
          adopted_on?: string | null
          adopted_recipe_id?: string | null
          application_area?: Database["public"]["Enums"]["chef_journey_idea_area"]
          concept_notes?: string
          created_at?: string
          created_by?: string
          expected_impact?: string
          first_test_date?: string | null
          id?: string
          journey_id?: string
          priority?: number
          source_entry_id?: string | null
          status?: Database["public"]["Enums"]["chef_journey_idea_status"]
          tenant_id?: string
          test_plan?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_journey_ideas_adopted_recipe_id_fkey"
            columns: ["adopted_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "chef_journey_ideas_adopted_recipe_id_fkey"
            columns: ["adopted_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_journey_ideas_journey_fk"
            columns: ["journey_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "chef_journeys"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "chef_journey_ideas_source_entry_fk"
            columns: ["source_entry_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "chef_journey_entries"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "chef_journey_ideas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_journeys: {
        Row: {
          collaborators: string[]
          cover_image_url: string | null
          created_at: string
          created_by: string
          culinary_focus_tags: string[]
          destination_city: string | null
          destination_country: string | null
          destination_region: string | null
          ended_on: string | null
          favorite_experience: string
          favorite_meal: string
          id: string
          inspiration_ideas: string[]
          key_learnings: string[]
          started_on: string | null
          status: Database["public"]["Enums"]["chef_journey_status"]
          tenant_id: string
          title: string
          trip_summary: string
          updated_at: string
        }
        Insert: {
          collaborators?: string[]
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          culinary_focus_tags?: string[]
          destination_city?: string | null
          destination_country?: string | null
          destination_region?: string | null
          ended_on?: string | null
          favorite_experience?: string
          favorite_meal?: string
          id?: string
          inspiration_ideas?: string[]
          key_learnings?: string[]
          started_on?: string | null
          status?: Database["public"]["Enums"]["chef_journey_status"]
          tenant_id: string
          title: string
          trip_summary?: string
          updated_at?: string
        }
        Update: {
          collaborators?: string[]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          culinary_focus_tags?: string[]
          destination_city?: string | null
          destination_country?: string | null
          destination_region?: string | null
          ended_on?: string | null
          favorite_experience?: string
          favorite_meal?: string
          id?: string
          inspiration_ideas?: string[]
          key_learnings?: string[]
          started_on?: string | null
          status?: Database["public"]["Enums"]["chef_journey_status"]
          tenant_id?: string
          title?: string
          trip_summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_momentum_snapshots: {
        Row: {
          avg_satisfaction_90d: number | null
          computed_at: string | null
          creative_projects_90d: number | null
          education_entries_12m: number | null
          id: string
          lost_quotes_90d: number | null
          momentum_direction: string | null
          new_clients_90d: number | null
          new_cuisines_90d: number | null
          new_dishes_90d: number | null
          snapshot_date: string
          tenant_id: string
        }
        Insert: {
          avg_satisfaction_90d?: number | null
          computed_at?: string | null
          creative_projects_90d?: number | null
          education_entries_12m?: number | null
          id?: string
          lost_quotes_90d?: number | null
          momentum_direction?: string | null
          new_clients_90d?: number | null
          new_cuisines_90d?: number | null
          new_dishes_90d?: number | null
          snapshot_date?: string
          tenant_id: string
        }
        Update: {
          avg_satisfaction_90d?: number | null
          computed_at?: string | null
          creative_projects_90d?: number | null
          education_entries_12m?: number | null
          id?: string
          lost_quotes_90d?: number | null
          momentum_direction?: string | null
          new_clients_90d?: number | null
          new_cuisines_90d?: number | null
          new_dishes_90d?: number | null
          snapshot_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_momentum_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_network_contact_shares: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          details: string
          event_date: string | null
          id: string
          location: string | null
          recipient_chef_id: string
          responded_at: string | null
          response_note: string | null
          sender_chef_id: string
          status: Database["public"]["Enums"]["chef_network_contact_share_status"]
        }
        Insert: {
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          details: string
          event_date?: string | null
          id?: string
          location?: string | null
          recipient_chef_id: string
          responded_at?: string | null
          response_note?: string | null
          sender_chef_id: string
          status?: Database["public"]["Enums"]["chef_network_contact_share_status"]
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          details?: string
          event_date?: string | null
          id?: string
          location?: string | null
          recipient_chef_id?: string
          responded_at?: string | null
          response_note?: string | null
          sender_chef_id?: string
          status?: Database["public"]["Enums"]["chef_network_contact_share_status"]
        }
        Relationships: [
          {
            foreignKeyName: "chef_network_contact_shares_recipient_chef_id_fkey"
            columns: ["recipient_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_network_contact_shares_sender_chef_id_fkey"
            columns: ["sender_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_network_feature_preferences: {
        Row: {
          chef_id: string
          created_at: string
          enabled: boolean
          event_collaboration: boolean
          feature_key: Database["public"]["Enums"]["chef_network_feature_key"]
          id: string
          recipe_sharing: boolean
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          enabled?: boolean
          event_collaboration?: boolean
          feature_key: Database["public"]["Enums"]["chef_network_feature_key"]
          id?: string
          recipe_sharing?: boolean
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          enabled?: boolean
          event_collaboration?: boolean
          feature_key?: Database["public"]["Enums"]["chef_network_feature_key"]
          id?: string
          recipe_sharing?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_network_feature_preferences_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_network_posts: {
        Row: {
          author_chef_id: string
          content: string
          created_at: string
          feature_key: Database["public"]["Enums"]["chef_network_feature_key"]
          id: string
        }
        Insert: {
          author_chef_id: string
          content: string
          created_at?: string
          feature_key?: Database["public"]["Enums"]["chef_network_feature_key"]
          id?: string
        }
        Update: {
          author_chef_id?: string
          content?: string
          created_at?: string
          feature_key?: Database["public"]["Enums"]["chef_network_feature_key"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_network_posts_author_chef_id_fkey"
            columns: ["author_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_portfolio_removal_requests: {
        Row: {
          client_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          id: string
          reason: string | null
          request_date: string | null
          status: string | null
          tasks: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          request_date?: string | null
          status?: string | null
          tasks?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          request_date?: string | null
          status?: string | null
          tasks?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_portfolio_removal_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "chef_portfolio_removal_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_portfolio_removal_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_post_comments: {
        Row: {
          chef_id: string
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          parent_comment_id: string | null
          post_id: string
          reactions_count: number
          replies_count: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          parent_comment_id?: string | null
          post_id: string
          reactions_count?: number
          replies_count?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          parent_comment_id?: string | null
          post_id?: string
          reactions_count?: number
          replies_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_post_comments_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "chef_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "chef_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_post_hashtags: {
        Row: {
          hashtag_id: string
          post_id: string
        }
        Insert: {
          hashtag_id: string
          post_id: string
        }
        Update: {
          hashtag_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "chef_social_hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "chef_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_post_mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          mentioned_chef_id: string
          post_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_chef_id: string
          post_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_chef_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_post_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "chef_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_post_mentions_mentioned_chef_id_fkey"
            columns: ["mentioned_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_post_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "chef_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_post_reactions: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          post_id: string
          reaction_type: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_post_reactions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "chef_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_post_saves: {
        Row: {
          chef_id: string
          collection_name: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          chef_id: string
          collection_name?: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          chef_id?: string
          collection_name?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_post_saves_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "chef_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_preferences: {
        Row: {
          activity_log_enabled: boolean
          archetype: string | null
          business_address: string | null
          business_legal_name: string | null
          category_nudge_levels: Json
          chef_id: string
          created_at: string
          dashboard_widgets: Json
          default_buffer_minutes: number
          default_grocery_address: string | null
          default_grocery_store: string | null
          default_liquor_address: string | null
          default_liquor_store: string | null
          default_packing_minutes: number
          default_prep_hours: number
          default_shopping_minutes: number
          default_specialty_stores: Json
          enabled_goal_categories: string[]
          enabled_modules: string[] | null
          focus_mode: boolean | null
          home_address: string | null
          home_city: string | null
          home_state: string | null
          home_zip: string | null
          id: string
          is_business: boolean
          max_events_per_month: number | null
          network_discoverable: boolean
          notification_digest_enabled: boolean
          notification_digest_interval_minutes: number
          notification_quiet_hours_enabled: boolean
          notification_quiet_hours_end: string | null
          notification_quiet_hours_start: string | null
          owner_hourly_rate_cents: number | null
          primary_nav_hrefs: Json
          print_preferences: Json
          revenue_goal_custom: Json
          revenue_goal_nudge_level: string
          revenue_goal_program_enabled: boolean
          saved_custom_nav_hrefs: Json | null
          shop_day_before: boolean
          sms_notify_phone: string | null
          sms_opt_in: boolean
          sms_opt_in_at: string | null
          target_annual_revenue_cents: number | null
          target_margin_percent: number
          target_monthly_revenue_cents: number
          tenant_id: string
          updated_at: string
          visitor_alerts_enabled: boolean
          wake_time_earliest: string
          wake_time_latest: string
        }
        Insert: {
          activity_log_enabled?: boolean
          archetype?: string | null
          business_address?: string | null
          business_legal_name?: string | null
          category_nudge_levels?: Json
          chef_id: string
          created_at?: string
          dashboard_widgets?: Json
          default_buffer_minutes?: number
          default_grocery_address?: string | null
          default_grocery_store?: string | null
          default_liquor_address?: string | null
          default_liquor_store?: string | null
          default_packing_minutes?: number
          default_prep_hours?: number
          default_shopping_minutes?: number
          default_specialty_stores?: Json
          enabled_goal_categories?: string[]
          enabled_modules?: string[] | null
          focus_mode?: boolean | null
          home_address?: string | null
          home_city?: string | null
          home_state?: string | null
          home_zip?: string | null
          id?: string
          is_business?: boolean
          max_events_per_month?: number | null
          network_discoverable?: boolean
          notification_digest_enabled?: boolean
          notification_digest_interval_minutes?: number
          notification_quiet_hours_enabled?: boolean
          notification_quiet_hours_end?: string | null
          notification_quiet_hours_start?: string | null
          owner_hourly_rate_cents?: number | null
          primary_nav_hrefs?: Json
          print_preferences?: Json
          revenue_goal_custom?: Json
          revenue_goal_nudge_level?: string
          revenue_goal_program_enabled?: boolean
          saved_custom_nav_hrefs?: Json | null
          shop_day_before?: boolean
          sms_notify_phone?: string | null
          sms_opt_in?: boolean
          sms_opt_in_at?: string | null
          target_annual_revenue_cents?: number | null
          target_margin_percent?: number
          target_monthly_revenue_cents?: number
          tenant_id: string
          updated_at?: string
          visitor_alerts_enabled?: boolean
          wake_time_earliest?: string
          wake_time_latest?: string
        }
        Update: {
          activity_log_enabled?: boolean
          archetype?: string | null
          business_address?: string | null
          business_legal_name?: string | null
          category_nudge_levels?: Json
          chef_id?: string
          created_at?: string
          dashboard_widgets?: Json
          default_buffer_minutes?: number
          default_grocery_address?: string | null
          default_grocery_store?: string | null
          default_liquor_address?: string | null
          default_liquor_store?: string | null
          default_packing_minutes?: number
          default_prep_hours?: number
          default_shopping_minutes?: number
          default_specialty_stores?: Json
          enabled_goal_categories?: string[]
          enabled_modules?: string[] | null
          focus_mode?: boolean | null
          home_address?: string | null
          home_city?: string | null
          home_state?: string | null
          home_zip?: string | null
          id?: string
          is_business?: boolean
          max_events_per_month?: number | null
          network_discoverable?: boolean
          notification_digest_enabled?: boolean
          notification_digest_interval_minutes?: number
          notification_quiet_hours_enabled?: boolean
          notification_quiet_hours_end?: string | null
          notification_quiet_hours_start?: string | null
          owner_hourly_rate_cents?: number | null
          primary_nav_hrefs?: Json
          print_preferences?: Json
          revenue_goal_custom?: Json
          revenue_goal_nudge_level?: string
          revenue_goal_program_enabled?: boolean
          saved_custom_nav_hrefs?: Json | null
          shop_day_before?: boolean
          sms_notify_phone?: string | null
          sms_opt_in?: boolean
          sms_opt_in_at?: string | null
          target_annual_revenue_cents?: number | null
          target_margin_percent?: number
          target_monthly_revenue_cents?: number
          tenant_id?: string
          updated_at?: string
          visitor_alerts_enabled?: boolean
          wake_time_earliest?: string
          wake_time_latest?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_preferences_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_profiles: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          notification_email_enabled: boolean
          notification_preferences: Json
          notification_push_enabled: boolean
          notification_sms_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          notification_email_enabled?: boolean
          notification_preferences?: Json
          notification_push_enabled?: boolean
          notification_sms_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          notification_email_enabled?: boolean
          notification_preferences?: Json
          notification_push_enabled?: boolean
          notification_sms_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_profiles_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          dismissed_at: string | null
          due_at: string | null
          id: string
          message: string | null
          related_client_id: string | null
          related_event_id: string | null
          related_inquiry_id: string | null
          reminder_type: string
          source: string
          tenant_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          due_at?: string | null
          id?: string
          message?: string | null
          related_client_id?: string | null
          related_event_id?: string | null
          related_inquiry_id?: string | null
          reminder_type?: string
          source?: string
          tenant_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          due_at?: string | null
          id?: string
          message?: string | null
          related_client_id?: string | null
          related_event_id?: string | null
          related_inquiry_id?: string | null
          reminder_type?: string
          source?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_reminders_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "chef_reminders_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_reminders_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_reminders_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_reminders_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "chef_reminders_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_reminders_related_inquiry_id_fkey"
            columns: ["related_inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_scheduling_rules: {
        Row: {
          blocked_days_of_week: number[]
          created_at: string
          id: string
          max_events_per_month: number | null
          max_events_per_week: number | null
          min_buffer_days: number
          min_lead_days: number
          preferred_days_of_week: number[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          blocked_days_of_week?: number[]
          created_at?: string
          id?: string
          max_events_per_month?: number | null
          max_events_per_week?: number | null
          min_buffer_days?: number
          min_lead_days?: number
          preferred_days_of_week?: number[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          blocked_days_of_week?: number[]
          created_at?: string
          id?: string
          max_events_per_month?: number | null
          max_events_per_week?: number | null
          min_buffer_days?: number
          min_lead_days?: number
          preferred_days_of_week?: number[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_scheduling_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_service_types: {
        Row: {
          base_price_cents: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_guests: number | null
          min_guests: number | null
          name: string
          per_person_cents: number
          pricing_model: string
          sort_order: number
          tenant_id: string
          typical_guest_count: number
          updated_at: string
        }
        Insert: {
          base_price_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_guests?: number | null
          min_guests?: number | null
          name: string
          per_person_cents?: number
          pricing_model?: string
          sort_order?: number
          tenant_id: string
          typical_guest_count?: number
          updated_at?: string
        }
        Update: {
          base_price_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_guests?: number | null
          min_guests?: number | null
          name?: string
          per_person_cents?: number
          pricing_model?: string
          sort_order?: number
          tenant_id?: string
          typical_guest_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_service_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_social_channels: {
        Row: {
          category: string
          color: string | null
          created_at: string
          created_by_chef_id: string | null
          description: string | null
          icon: string | null
          id: string
          is_official: boolean
          member_count: number
          name: string
          post_count: number
          slug: string
          visibility: string
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          created_by_chef_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_official?: boolean
          member_count?: number
          name: string
          post_count?: number
          slug: string
          visibility?: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          created_by_chef_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_official?: boolean
          member_count?: number
          name?: string
          post_count?: number
          slug?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_social_channels_created_by_chef_id_fkey"
            columns: ["created_by_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_social_hashtags: {
        Row: {
          id: string
          last_used_at: string
          post_count: number
          tag: string
        }
        Insert: {
          id?: string
          last_used_at?: string
          post_count?: number
          tag: string
        }
        Update: {
          id?: string
          last_used_at?: string
          post_count?: number
          tag?: string
        }
        Relationships: []
      }
      chef_social_notifications: {
        Row: {
          actor_chef_id: string | null
          agg_count: number
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_read: boolean
          notification_type: string
          read_at: string | null
          recipient_chef_id: string
        }
        Insert: {
          actor_chef_id?: string | null
          agg_count?: number
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_read?: boolean
          notification_type: string
          read_at?: string | null
          recipient_chef_id: string
        }
        Update: {
          actor_chef_id?: string | null
          agg_count?: number
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          read_at?: string | null
          recipient_chef_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_social_notifications_actor_chef_id_fkey"
            columns: ["actor_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_social_notifications_recipient_chef_id_fkey"
            columns: ["recipient_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_social_posts: {
        Row: {
          channel_id: string | null
          chef_id: string
          comments_count: number
          content: string
          created_at: string
          edited_at: string | null
          hashtags: string[]
          id: string
          is_edited: boolean
          location_tag: string | null
          media_types: string[]
          media_urls: string[]
          original_post_id: string | null
          poll_closes_at: string | null
          poll_options: Json | null
          poll_question: string | null
          post_type: string
          reactions_count: number
          saves_count: number
          share_comment: string | null
          shares_count: number
          updated_at: string
          visibility: string
        }
        Insert: {
          channel_id?: string | null
          chef_id: string
          comments_count?: number
          content: string
          created_at?: string
          edited_at?: string | null
          hashtags?: string[]
          id?: string
          is_edited?: boolean
          location_tag?: string | null
          media_types?: string[]
          media_urls?: string[]
          original_post_id?: string | null
          poll_closes_at?: string | null
          poll_options?: Json | null
          poll_question?: string | null
          post_type?: string
          reactions_count?: number
          saves_count?: number
          share_comment?: string | null
          shares_count?: number
          updated_at?: string
          visibility?: string
        }
        Update: {
          channel_id?: string | null
          chef_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          edited_at?: string | null
          hashtags?: string[]
          id?: string
          is_edited?: boolean
          location_tag?: string | null
          media_types?: string[]
          media_urls?: string[]
          original_post_id?: string | null
          poll_closes_at?: string | null
          poll_options?: Json | null
          poll_question?: string | null
          post_type?: string
          reactions_count?: number
          saves_count?: number
          share_comment?: string | null
          shares_count?: number
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_social_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chef_social_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_social_posts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_social_posts_original_post_id_fkey"
            columns: ["original_post_id"]
            isOneToOne: false
            referencedRelation: "chef_social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_stories: {
        Row: {
          caption: string | null
          chef_id: string
          created_at: string
          duration_seconds: number
          expires_at: string
          id: string
          media_type: string
          media_url: string
          reactions_count: number
          views_count: number
        }
        Insert: {
          caption?: string | null
          chef_id: string
          created_at?: string
          duration_seconds?: number
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          reactions_count?: number
          views_count?: number
        }
        Update: {
          caption?: string | null
          chef_id?: string
          created_at?: string
          duration_seconds?: number
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          reactions_count?: number
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chef_stories_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_story_reactions: {
        Row: {
          chef_id: string
          created_at: string
          emoji: string
          id: string
          story_id: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          emoji: string
          id?: string
          story_id: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          emoji?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_story_reactions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "chef_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_chef_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_chef_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_chef_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "chef_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_story_views_viewer_chef_id_fkey"
            columns: ["viewer_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_team_members: {
        Row: {
          accepted_at: string | null
          chef_id: string
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          member_chef_id: string | null
          member_email: string
          member_name: string
          removed_at: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          chef_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          member_chef_id?: string | null
          member_email: string
          member_name: string
          removed_at?: string | null
          role?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          chef_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          member_chef_id?: string | null
          member_email?: string
          member_name?: string
          removed_at?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_team_members_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_team_members_member_chef_id_fkey"
            columns: ["member_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_todos: {
        Row: {
          chef_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          chef_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          chef_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_todos_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chefs: {
        Row: {
          account_status: string
          apple_pay_enabled: boolean | null
          auth_user_id: string
          bio: string | null
          booking_base_price_cents: number | null
          booking_bio_short: string | null
          booking_deposit_fixed_cents: number | null
          booking_deposit_percent: number
          booking_deposit_type: string | null
          booking_enabled: boolean
          booking_headline: string | null
          booking_min_notice_days: number
          booking_model: string | null
          booking_pricing_type: string | null
          booking_slug: string | null
          business_continuity_plan: Json | null
          business_name: string
          cancellation_cutoff_days: number
          created_at: string
          current_closure_streak: number
          deletion_reactivation_token: string | null
          deletion_reason: string | null
          deletion_requested_at: string | null
          deletion_scheduled_for: string | null
          deposit_refundable: boolean
          directory_approved: boolean
          dismissed_recall_ids: string[] | null
          display_name: string | null
          email: string
          google_pay_enabled: boolean | null
          google_review_url: string | null
          gratuity_display_label: string | null
          gratuity_mode: string
          gratuity_service_fee_pct: number | null
          ical_feed_enabled: boolean | null
          ical_feed_token: string | null
          id: string
          is_deleted: boolean
          last_closure_date: string | null
          logo_url: string | null
          longest_closure_streak: number
          max_consecutive_working_days: number | null
          max_events_per_month: number | null
          max_events_per_week: number | null
          max_hours_per_week: number | null
          min_rest_days_per_week: number | null
          off_days: string[] | null
          off_hours_end: string | null
          off_hours_start: string | null
          onboarding_completed_at: string | null
          phone: string | null
          platform_fee_fixed_cents: number
          platform_fee_percent: number
          portal_background_color: string | null
          portal_background_image_url: string | null
          portal_primary_color: string | null
          portfolio_enabled: boolean | null
          portfolio_layout: string | null
          preferred_inquiry_destination: string
          profile_image_url: string | null
          remy_blocked_until: string | null
          show_availability_signals: boolean
          show_website_on_public_profile: boolean
          slug: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_onboarding_complete: boolean
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status: string | null
          tagline: string | null
          timezone: string
          trial_ends_at: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          account_status?: string
          apple_pay_enabled?: boolean | null
          auth_user_id: string
          bio?: string | null
          booking_base_price_cents?: number | null
          booking_bio_short?: string | null
          booking_deposit_fixed_cents?: number | null
          booking_deposit_percent?: number
          booking_deposit_type?: string | null
          booking_enabled?: boolean
          booking_headline?: string | null
          booking_min_notice_days?: number
          booking_model?: string | null
          booking_pricing_type?: string | null
          booking_slug?: string | null
          business_continuity_plan?: Json | null
          business_name: string
          cancellation_cutoff_days?: number
          created_at?: string
          current_closure_streak?: number
          deletion_reactivation_token?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          deposit_refundable?: boolean
          directory_approved?: boolean
          dismissed_recall_ids?: string[] | null
          display_name?: string | null
          email: string
          google_pay_enabled?: boolean | null
          google_review_url?: string | null
          gratuity_display_label?: string | null
          gratuity_mode?: string
          gratuity_service_fee_pct?: number | null
          ical_feed_enabled?: boolean | null
          ical_feed_token?: string | null
          id?: string
          is_deleted?: boolean
          last_closure_date?: string | null
          logo_url?: string | null
          longest_closure_streak?: number
          max_consecutive_working_days?: number | null
          max_events_per_month?: number | null
          max_events_per_week?: number | null
          max_hours_per_week?: number | null
          min_rest_days_per_week?: number | null
          off_days?: string[] | null
          off_hours_end?: string | null
          off_hours_start?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          platform_fee_fixed_cents?: number
          platform_fee_percent?: number
          portal_background_color?: string | null
          portal_background_image_url?: string | null
          portal_primary_color?: string | null
          portfolio_enabled?: boolean | null
          portfolio_layout?: string | null
          preferred_inquiry_destination?: string
          profile_image_url?: string | null
          remy_blocked_until?: string | null
          show_availability_signals?: boolean
          show_website_on_public_profile?: boolean
          slug?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          tagline?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          account_status?: string
          apple_pay_enabled?: boolean | null
          auth_user_id?: string
          bio?: string | null
          booking_base_price_cents?: number | null
          booking_bio_short?: string | null
          booking_deposit_fixed_cents?: number | null
          booking_deposit_percent?: number
          booking_deposit_type?: string | null
          booking_enabled?: boolean
          booking_headline?: string | null
          booking_min_notice_days?: number
          booking_model?: string | null
          booking_pricing_type?: string | null
          booking_slug?: string | null
          business_continuity_plan?: Json | null
          business_name?: string
          cancellation_cutoff_days?: number
          created_at?: string
          current_closure_streak?: number
          deletion_reactivation_token?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          deposit_refundable?: boolean
          directory_approved?: boolean
          dismissed_recall_ids?: string[] | null
          display_name?: string | null
          email?: string
          google_pay_enabled?: boolean | null
          google_review_url?: string | null
          gratuity_display_label?: string | null
          gratuity_mode?: string
          gratuity_service_fee_pct?: number | null
          ical_feed_enabled?: boolean | null
          ical_feed_token?: string | null
          id?: string
          is_deleted?: boolean
          last_closure_date?: string | null
          logo_url?: string | null
          longest_closure_streak?: number
          max_consecutive_working_days?: number | null
          max_events_per_month?: number | null
          max_events_per_week?: number | null
          max_hours_per_week?: number | null
          min_rest_days_per_week?: number | null
          off_days?: string[] | null
          off_hours_end?: string | null
          off_hours_start?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          platform_fee_fixed_cents?: number
          platform_fee_percent?: number
          portal_background_color?: string | null
          portal_background_image_url?: string | null
          portal_primary_color?: string | null
          portfolio_enabled?: boolean | null
          portfolio_layout?: string | null
          preferred_inquiry_destination?: string
          profile_image_url?: string | null
          remy_blocked_until?: string | null
          show_availability_signals?: boolean
          show_website_on_public_profile?: boolean
          slug?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          tagline?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      client_allergy_records: {
        Row: {
          allergen: string
          client_id: string
          confirmed_at: string | null
          confirmed_by_chef: boolean
          created_at: string
          detected_in_message_id: string | null
          id: string
          notes: string | null
          severity: string
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allergen: string
          client_id: string
          confirmed_at?: string | null
          confirmed_by_chef?: boolean
          created_at?: string
          detected_in_message_id?: string | null
          id?: string
          notes?: string | null
          severity?: string
          source?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allergen?: string
          client_id?: string
          confirmed_at?: string | null
          confirmed_by_chef?: boolean
          created_at?: string
          detected_in_message_id?: string | null
          id?: string
          notes?: string | null
          severity?: string
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_allergy_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_allergy_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_allergy_records_detected_in_message_id_fkey"
            columns: ["detected_in_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_allergy_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_connections: {
        Row: {
          client_a_id: string
          client_b_id: string
          created_at: string
          id: string
          notes: string | null
          relationship_type: string
          tenant_id: string
        }
        Insert: {
          client_a_id: string
          client_b_id: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type: string
          tenant_id: string
        }
        Update: {
          client_a_id?: string
          client_b_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_connections_client_a_id_fkey"
            columns: ["client_a_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_connections_client_a_id_fkey"
            columns: ["client_a_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_connections_client_b_id_fkey"
            columns: ["client_b_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_connections_client_b_id_fkey"
            columns: ["client_b_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_incentives: {
        Row: {
          amount_cents: number | null
          code: string
          created_at: string
          created_by_client_id: string | null
          created_by_role: Database["public"]["Enums"]["user_role"]
          created_by_user_id: string | null
          currency_code: string
          discount_percent: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number
          note: string | null
          purchase_status: string
          purchase_stripe_payment_intent_id: string | null
          purchased_by_email: string | null
          purchased_by_user_id: string | null
          redemptions_used: number
          remaining_balance_cents: number | null
          target_client_id: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["incentive_type"]
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          code: string
          created_at?: string
          created_by_client_id?: string | null
          created_by_role: Database["public"]["Enums"]["user_role"]
          created_by_user_id?: string | null
          currency_code?: string
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number
          note?: string | null
          purchase_status?: string
          purchase_stripe_payment_intent_id?: string | null
          purchased_by_email?: string | null
          purchased_by_user_id?: string | null
          redemptions_used?: number
          remaining_balance_cents?: number | null
          target_client_id?: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["incentive_type"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          code?: string
          created_at?: string
          created_by_client_id?: string | null
          created_by_role?: Database["public"]["Enums"]["user_role"]
          created_by_user_id?: string | null
          currency_code?: string
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number
          note?: string | null
          purchase_status?: string
          purchase_stripe_payment_intent_id?: string | null
          purchased_by_email?: string | null
          purchased_by_user_id?: string | null
          redemptions_used?: number
          remaining_balance_cents?: number | null
          target_client_id?: string | null
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["incentive_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_incentives_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_incentives_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_incentives_target_client_id_fkey"
            columns: ["target_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_incentives_target_client_id_fkey"
            columns: ["target_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_incentives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invitations: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          tenant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          tenant_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          category: Database["public"]["Enums"]["note_category"]
          client_id: string
          created_at: string
          event_id: string | null
          id: string
          note_text: string
          pinned: boolean
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["note_category"]
          client_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          note_text: string
          pinned?: boolean
          source?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["note_category"]
          client_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          note_text?: string
          pinned?: boolean
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_photos: {
        Row: {
          caption: string | null
          category: string
          client_id: string
          content_type: string
          created_at: string
          deleted_at: string | null
          display_order: number
          filename_original: string
          id: string
          size_bytes: number
          storage_path: string
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          category?: string
          client_id: string
          content_type: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          filename_original?: string
          id?: string
          size_bytes?: number
          storage_path: string
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          category?: string
          client_id?: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          filename_original?: string
          id?: string
          size_bytes?: number
          storage_path?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_preference_patterns: {
        Row: {
          chef_id: string
          client_id: string
          confidence: number
          created_at: string
          id: string
          last_seen_at: string
          occurrences: number
          pattern_type: string
          pattern_value: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          client_id: string
          confidence?: number
          created_at?: string
          id?: string
          last_seen_at?: string
          occurrences?: number
          pattern_type: string
          pattern_value: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          client_id?: string
          confidence?: number
          created_at?: string
          id?: string
          last_seen_at?: string
          occurrences?: number
          pattern_type?: string
          pattern_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_preference_patterns_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_preference_patterns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_preference_patterns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reviews: {
        Row: {
          client_id: string
          created_at: string
          display_consent: boolean
          event_id: string
          feedback_text: string | null
          google_review_clicked: boolean
          id: string
          rating: number
          tenant_id: string
          updated_at: string
          what_could_improve: string | null
          what_they_loved: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          display_consent?: boolean
          event_id: string
          feedback_text?: string | null
          google_review_clicked?: boolean
          id?: string
          rating: number
          tenant_id: string
          updated_at?: string
          what_could_improve?: string | null
          what_they_loved?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          display_consent?: boolean
          event_id?: string
          feedback_text?: string | null
          google_review_clicked?: boolean
          id?: string
          rating?: number
          tenant_id?: string
          updated_at?: string
          what_could_improve?: string | null
          what_they_loved?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_satisfaction_surveys: {
        Row: {
          chef_id: string
          client_id: string | null
          consent_to_display: boolean
          created_at: string
          event_id: string
          food_quality_rating: number | null
          highlight_text: string | null
          id: string
          improvement_text: string | null
          nps_score: number | null
          overall_rating: number | null
          presentation_rating: number | null
          reminder_sent_at: string | null
          responded_at: string | null
          sent_at: string | null
          service_rating: number | null
          testimonial_text: string | null
          token: string
          updated_at: string
          value_rating: number | null
          would_rebook: boolean | null
        }
        Insert: {
          chef_id: string
          client_id?: string | null
          consent_to_display?: boolean
          created_at?: string
          event_id: string
          food_quality_rating?: number | null
          highlight_text?: string | null
          id?: string
          improvement_text?: string | null
          nps_score?: number | null
          overall_rating?: number | null
          presentation_rating?: number | null
          reminder_sent_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          service_rating?: number | null
          testimonial_text?: string | null
          token?: string
          updated_at?: string
          value_rating?: number | null
          would_rebook?: boolean | null
        }
        Update: {
          chef_id?: string
          client_id?: string | null
          consent_to_display?: boolean
          created_at?: string
          event_id?: string
          food_quality_rating?: number | null
          highlight_text?: string | null
          id?: string
          improvement_text?: string | null
          nps_score?: number | null
          overall_rating?: number | null
          presentation_rating?: number | null
          reminder_sent_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          service_rating?: number | null
          testimonial_text?: string | null
          token?: string
          updated_at?: string
          value_rating?: number | null
          would_rebook?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_satisfaction_surveys_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_satisfaction_surveys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_satisfaction_surveys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_satisfaction_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_satisfaction_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_satisfaction_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "client_satisfaction_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      client_segments: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          filters: Json
          id: string
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          client_id: string
          created_at: string
          id: string
          tag: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          tag: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          tag?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          access_instructions: string | null
          acquisition_cost_cents: number | null
          additional_addresses: Json | null
          address: string | null
          allergies: string[] | null
          anniversary: string | null
          auth_user_id: string | null
          automated_emails_enabled: boolean
          availability_signal_notifications: boolean
          available_place_settings: number | null
          average_spend_cents: number | null
          birthday: string | null
          budget_range_max_cents: number | null
          budget_range_min_cents: number | null
          children: string[] | null
          cleanup_expectations: string | null
          communication_style_notes: string | null
          company_name: string | null
          complaint_handling_notes: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          dietary_protocols: string[] | null
          dietary_restrictions: string[] | null
          dislikes: string[] | null
          email: string
          equipment_available: string[] | null
          equipment_must_bring: string[] | null
          family_notes: string | null
          farewell_style: string | null
          favorite_cuisines: string[] | null
          favorite_dishes: string[] | null
          first_event_date: string | null
          formality_level: string | null
          full_name: string
          fun_qa_answers: Json | null
          gate_code: string | null
          has_dishwasher: boolean | null
          has_received_welcome_points: boolean
          house_rules: string | null
          id: string
          instagram_handle: string | null
          is_demo: boolean
          kitchen_burner_notes: string | null
          kitchen_constraints: string | null
          kitchen_counter_notes: string | null
          kitchen_oven_notes: string | null
          kitchen_plating_notes: string | null
          kitchen_profile_updated_at: string | null
          kitchen_refrigeration_notes: string | null
          kitchen_sink_notes: string | null
          kitchen_size: string | null
          last_event_date: string | null
          leftovers_preference: string | null
          lifetime_value_cents: number | null
          loyalty_points: number | null
          loyalty_tier: Database["public"]["Enums"]["loyalty_tier"]
          marketing_unsubscribed: boolean
          marketing_unsubscribed_at: string | null
          nda_active: boolean | null
          nda_coverage: string | null
          nda_document_url: string | null
          nda_effective_date: string | null
          nda_expiry_date: string | null
          nearest_grocery_store: string | null
          occupation: string | null
          outdoor_cooking_notes: string | null
          parking_instructions: string | null
          partner_name: string | null
          partner_preferred_name: string | null
          payment_behavior: string | null
          personal_milestones: Json | null
          pets: Json | null
          phone: string | null
          photo_permission: string | null
          portal_access_token: string | null
          portal_token_created_at: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          preferred_event_days: string[] | null
          preferred_name: string | null
          preferred_service_style: string | null
          red_flags: string | null
          referral_potential: string | null
          referral_source: Database["public"]["Enums"]["referral_source"] | null
          referral_source_detail: string | null
          regular_guests: Json | null
          security_notes: string | null
          social_media_links: Json | null
          spice_tolerance: Database["public"]["Enums"]["spice_tolerance"] | null
          status: Database["public"]["Enums"]["client_status"]
          stripe_customer_id: string | null
          tenant_id: string | null
          tipping_pattern: string | null
          total_events_completed: number | null
          total_events_count: number | null
          total_guests_served: number | null
          total_payments_received_cents: number | null
          typical_guest_count: string | null
          updated_at: string
          vibe_notes: string | null
          water_quality_notes: string | null
          what_they_care_about: string | null
          wifi_password: string | null
          wine_beverage_preferences: string | null
          wow_factors: string | null
        }
        Insert: {
          access_instructions?: string | null
          acquisition_cost_cents?: number | null
          additional_addresses?: Json | null
          address?: string | null
          allergies?: string[] | null
          anniversary?: string | null
          auth_user_id?: string | null
          automated_emails_enabled?: boolean
          availability_signal_notifications?: boolean
          available_place_settings?: number | null
          average_spend_cents?: number | null
          birthday?: string | null
          budget_range_max_cents?: number | null
          budget_range_min_cents?: number | null
          children?: string[] | null
          cleanup_expectations?: string | null
          communication_style_notes?: string | null
          company_name?: string | null
          complaint_handling_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          dietary_protocols?: string[] | null
          dietary_restrictions?: string[] | null
          dislikes?: string[] | null
          email: string
          equipment_available?: string[] | null
          equipment_must_bring?: string[] | null
          family_notes?: string | null
          farewell_style?: string | null
          favorite_cuisines?: string[] | null
          favorite_dishes?: string[] | null
          first_event_date?: string | null
          formality_level?: string | null
          full_name: string
          fun_qa_answers?: Json | null
          gate_code?: string | null
          has_dishwasher?: boolean | null
          has_received_welcome_points?: boolean
          house_rules?: string | null
          id?: string
          instagram_handle?: string | null
          is_demo?: boolean
          kitchen_burner_notes?: string | null
          kitchen_constraints?: string | null
          kitchen_counter_notes?: string | null
          kitchen_oven_notes?: string | null
          kitchen_plating_notes?: string | null
          kitchen_profile_updated_at?: string | null
          kitchen_refrigeration_notes?: string | null
          kitchen_sink_notes?: string | null
          kitchen_size?: string | null
          last_event_date?: string | null
          leftovers_preference?: string | null
          lifetime_value_cents?: number | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"]
          marketing_unsubscribed?: boolean
          marketing_unsubscribed_at?: string | null
          nda_active?: boolean | null
          nda_coverage?: string | null
          nda_document_url?: string | null
          nda_effective_date?: string | null
          nda_expiry_date?: string | null
          nearest_grocery_store?: string | null
          occupation?: string | null
          outdoor_cooking_notes?: string | null
          parking_instructions?: string | null
          partner_name?: string | null
          partner_preferred_name?: string | null
          payment_behavior?: string | null
          personal_milestones?: Json | null
          pets?: Json | null
          phone?: string | null
          photo_permission?: string | null
          portal_access_token?: string | null
          portal_token_created_at?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          preferred_event_days?: string[] | null
          preferred_name?: string | null
          preferred_service_style?: string | null
          red_flags?: string | null
          referral_potential?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referral_source_detail?: string | null
          regular_guests?: Json | null
          security_notes?: string | null
          social_media_links?: Json | null
          spice_tolerance?:
            | Database["public"]["Enums"]["spice_tolerance"]
            | null
          status?: Database["public"]["Enums"]["client_status"]
          stripe_customer_id?: string | null
          tenant_id?: string | null
          tipping_pattern?: string | null
          total_events_completed?: number | null
          total_events_count?: number | null
          total_guests_served?: number | null
          total_payments_received_cents?: number | null
          typical_guest_count?: string | null
          updated_at?: string
          vibe_notes?: string | null
          water_quality_notes?: string | null
          what_they_care_about?: string | null
          wifi_password?: string | null
          wine_beverage_preferences?: string | null
          wow_factors?: string | null
        }
        Update: {
          access_instructions?: string | null
          acquisition_cost_cents?: number | null
          additional_addresses?: Json | null
          address?: string | null
          allergies?: string[] | null
          anniversary?: string | null
          auth_user_id?: string | null
          automated_emails_enabled?: boolean
          availability_signal_notifications?: boolean
          available_place_settings?: number | null
          average_spend_cents?: number | null
          birthday?: string | null
          budget_range_max_cents?: number | null
          budget_range_min_cents?: number | null
          children?: string[] | null
          cleanup_expectations?: string | null
          communication_style_notes?: string | null
          company_name?: string | null
          complaint_handling_notes?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          dietary_protocols?: string[] | null
          dietary_restrictions?: string[] | null
          dislikes?: string[] | null
          email?: string
          equipment_available?: string[] | null
          equipment_must_bring?: string[] | null
          family_notes?: string | null
          farewell_style?: string | null
          favorite_cuisines?: string[] | null
          favorite_dishes?: string[] | null
          first_event_date?: string | null
          formality_level?: string | null
          full_name?: string
          fun_qa_answers?: Json | null
          gate_code?: string | null
          has_dishwasher?: boolean | null
          has_received_welcome_points?: boolean
          house_rules?: string | null
          id?: string
          instagram_handle?: string | null
          is_demo?: boolean
          kitchen_burner_notes?: string | null
          kitchen_constraints?: string | null
          kitchen_counter_notes?: string | null
          kitchen_oven_notes?: string | null
          kitchen_plating_notes?: string | null
          kitchen_profile_updated_at?: string | null
          kitchen_refrigeration_notes?: string | null
          kitchen_sink_notes?: string | null
          kitchen_size?: string | null
          last_event_date?: string | null
          leftovers_preference?: string | null
          lifetime_value_cents?: number | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"]
          marketing_unsubscribed?: boolean
          marketing_unsubscribed_at?: string | null
          nda_active?: boolean | null
          nda_coverage?: string | null
          nda_document_url?: string | null
          nda_effective_date?: string | null
          nda_expiry_date?: string | null
          nearest_grocery_store?: string | null
          occupation?: string | null
          outdoor_cooking_notes?: string | null
          parking_instructions?: string | null
          partner_name?: string | null
          partner_preferred_name?: string | null
          payment_behavior?: string | null
          personal_milestones?: Json | null
          pets?: Json | null
          phone?: string | null
          photo_permission?: string | null
          portal_access_token?: string | null
          portal_token_created_at?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          preferred_event_days?: string[] | null
          preferred_name?: string | null
          preferred_service_style?: string | null
          red_flags?: string | null
          referral_potential?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referral_source_detail?: string | null
          regular_guests?: Json | null
          security_notes?: string | null
          social_media_links?: Json | null
          spice_tolerance?:
            | Database["public"]["Enums"]["spice_tolerance"]
            | null
          status?: Database["public"]["Enums"]["client_status"]
          stripe_customer_id?: string | null
          tenant_id?: string | null
          tipping_pattern?: string | null
          total_events_completed?: number | null
          total_events_count?: number | null
          total_guests_served?: number | null
          total_payments_received_cents?: number | null
          typical_guest_count?: string | null
          updated_at?: string
          vibe_notes?: string | null
          water_quality_notes?: string | null
          what_they_care_about?: string | null
          wifi_password?: string | null
          wine_beverage_preferences?: string | null
          wow_factors?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      clipboard_entries: {
        Row: {
          chef_id: string
          component_id: string
          eighty_sixed_at: string | null
          entry_date: string
          id: string
          is_86d: boolean
          location: string | null
          made: number | null
          made_at: string | null
          need_to_make: number | null
          need_to_order: number | null
          notes: string | null
          on_hand: number | null
          station_id: string
          updated_at: string
          updated_by: string | null
          waste_qty: number | null
          waste_reason_code: Database["public"]["Enums"]["waste_reason"] | null
        }
        Insert: {
          chef_id: string
          component_id: string
          eighty_sixed_at?: string | null
          entry_date: string
          id?: string
          is_86d?: boolean
          location?: string | null
          made?: number | null
          made_at?: string | null
          need_to_make?: number | null
          need_to_order?: number | null
          notes?: string | null
          on_hand?: number | null
          station_id: string
          updated_at?: string
          updated_by?: string | null
          waste_qty?: number | null
          waste_reason_code?: Database["public"]["Enums"]["waste_reason"] | null
        }
        Update: {
          chef_id?: string
          component_id?: string
          eighty_sixed_at?: string | null
          entry_date?: string
          id?: string
          is_86d?: boolean
          location?: string | null
          made?: number | null
          made_at?: string | null
          need_to_make?: number | null
          need_to_order?: number | null
          notes?: string | null
          on_hand?: number | null
          station_id?: string
          updated_at?: string
          updated_by?: string | null
          waste_qty?: number | null
          waste_reason_code?: Database["public"]["Enums"]["waste_reason"] | null
        }
        Relationships: [
          {
            foreignKeyName: "clipboard_entries_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clipboard_entries_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "station_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clipboard_entries_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clipboard_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payment_schedules: {
        Row: {
          amount_cents: number
          created_at: string
          due_date: string
          event_id: string | null
          id: string
          installment_number: number
          payment_id: string | null
          sale_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          due_date: string
          event_id?: string | null
          id?: string
          installment_number: number
          payment_id?: string | null
          sale_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          due_date?: string
          event_id?: string | null
          id?: string
          installment_number?: number
          payment_id?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payment_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "commerce_payment_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "commerce_payment_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "commerce_payment_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_schedules_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_schedules_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_financial_summary"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "commerce_payment_schedules_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payment_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_payments: {
        Row: {
          amount_cents: number
          captured_at: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          idempotency_key: string
          ledger_entry_id: string | null
          metadata: Json | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payout_batch_id: string | null
          processor_reference_id: string | null
          processor_type: string | null
          sale_id: string | null
          settled_at: string | null
          settlement_date: string | null
          status: Database["public"]["Enums"]["commerce_payment_status"]
          stripe_charge_id: string | null
          stripe_event_id: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
          tip_cents: number
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          captured_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          idempotency_key: string
          ledger_entry_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payout_batch_id?: string | null
          processor_reference_id?: string | null
          processor_type?: string | null
          sale_id?: string | null
          settled_at?: string | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["commerce_payment_status"]
          stripe_charge_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
          tip_cents?: number
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          captured_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          idempotency_key?: string
          ledger_entry_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payout_batch_id?: string | null
          processor_reference_id?: string | null
          processor_type?: string | null
          sale_id?: string | null
          settled_at?: string | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["commerce_payment_status"]
          stripe_charge_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          tip_cents?: number
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "commerce_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "commerce_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "commerce_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "commerce_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payments_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_financial_summary"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "commerce_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_refunds: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string
          ledger_entry_id: string | null
          payment_id: string
          processed_at: string | null
          reason: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["refund_status"]
          stripe_refund_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key: string
          ledger_entry_id?: string | null
          payment_id: string
          processed_at?: string | null
          reason?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          stripe_refund_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string
          ledger_entry_id?: string | null
          payment_id?: string
          processed_at?: string | null
          reason?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          stripe_refund_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_refunds_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commerce_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_refunds_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_financial_summary"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "commerce_refunds_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_refunds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_action_log: {
        Row: {
          action: string
          actor_id: string | null
          communication_event_id: string | null
          created_at: string
          id: string
          new_state: Json
          previous_state: Json
          source: Database["public"]["Enums"]["communication_action_source"]
          tenant_id: string
          thread_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          communication_event_id?: string | null
          created_at?: string
          id?: string
          new_state?: Json
          previous_state?: Json
          source: Database["public"]["Enums"]["communication_action_source"]
          tenant_id: string
          thread_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          communication_event_id?: string | null
          created_at?: string
          id?: string
          new_state?: Json
          previous_state?: Json
          source?: Database["public"]["Enums"]["communication_action_source"]
          tenant_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_action_log_communication_event_id_fkey"
            columns: ["communication_event_id"]
            isOneToOne: false
            referencedRelation: "communication_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_action_log_communication_event_id_fkey"
            columns: ["communication_event_id"]
            isOneToOne: false
            referencedRelation: "communication_inbox_items"
            referencedColumns: ["communication_event_id"]
          },
          {
            foreignKeyName: "communication_action_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_action_log_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_inbox_items"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "communication_action_log_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_classification_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          match_field: string
          match_value: string
          name: string
          operator: string
          priority: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          match_field: string
          match_value: string
          name: string
          operator: string
          priority?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          match_field?: string
          match_value?: string
          name?: string
          operator?: string
          priority?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_classification_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_events: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["communication_direction"]
          external_id: string | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          normalized_content: string
          raw_content: string
          resolved_client_id: string | null
          sender_identity: string
          source: Database["public"]["Enums"]["communication_source"]
          status: Database["public"]["Enums"]["communication_event_status"]
          tenant_id: string
          thread_id: string
          timestamp: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["communication_direction"]
          external_id?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          normalized_content: string
          raw_content: string
          resolved_client_id?: string | null
          sender_identity: string
          source: Database["public"]["Enums"]["communication_source"]
          status?: Database["public"]["Enums"]["communication_event_status"]
          tenant_id: string
          thread_id: string
          timestamp: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["communication_direction"]
          external_id?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          normalized_content?: string
          raw_content?: string
          resolved_client_id?: string | null
          sender_identity?: string
          source?: Database["public"]["Enums"]["communication_source"]
          status?: Database["public"]["Enums"]["communication_event_status"]
          tenant_id?: string
          thread_id?: string
          timestamp?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_events_resolved_client_id_fkey"
            columns: ["resolved_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "communication_events_resolved_client_id_fkey"
            columns: ["resolved_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_inbox_items"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "communication_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      community_templates: {
        Row: {
          author_tenant_id: string
          avg_rating: number | null
          content: Json
          created_at: string | null
          cuisine_type: string | null
          description: string | null
          dietary_tags: string[] | null
          download_count: number | null
          id: string
          is_published: boolean | null
          occasion_type: string | null
          tags: string[] | null
          template_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_tenant_id: string
          avg_rating?: number | null
          content: Json
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          download_count?: number | null
          id?: string
          is_published?: boolean | null
          occasion_type?: string | null
          tags?: string[] | null
          template_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_tenant_id?: string
          avg_rating?: number | null
          content?: Json
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          download_count?: number | null
          id?: string
          is_published?: boolean | null
          occasion_type?: string | null
          tags?: string[] | null
          template_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_templates_author_tenant_id_fkey"
            columns: ["author_tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_benchmarks: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          local_avg_price_per_person_cents: number | null
          local_avg_rating: number | null
          notes: string | null
          own_price_per_person_cents: number | null
          recorded_date: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          local_avg_price_per_person_cents?: number | null
          local_avg_rating?: number | null
          notes?: string | null
          own_price_per_person_cents?: number | null
          recorded_date?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          local_avg_price_per_person_cents?: number | null
          local_avg_rating?: number | null
          notes?: string | null
          own_price_per_person_cents?: number | null
          recorded_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_benchmarks_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          category: Database["public"]["Enums"]["component_category"]
          created_at: string
          created_by: string | null
          description: string | null
          dish_id: string
          execution_notes: string | null
          id: string
          is_make_ahead: boolean
          make_ahead_window_hours: number | null
          name: string
          portion_quantity: number | null
          portion_unit: string | null
          prep_day_offset: number | null
          prep_station: string | null
          prep_time_of_day: string | null
          recipe_id: string | null
          scale_factor: number
          sort_order: number
          storage_notes: string | null
          tenant_id: string
          transport_category: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["component_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          dish_id: string
          execution_notes?: string | null
          id?: string
          is_make_ahead?: boolean
          make_ahead_window_hours?: number | null
          name: string
          portion_quantity?: number | null
          portion_unit?: string | null
          prep_day_offset?: number | null
          prep_station?: string | null
          prep_time_of_day?: string | null
          recipe_id?: string | null
          scale_factor?: number
          sort_order?: number
          storage_notes?: string | null
          tenant_id: string
          transport_category?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["component_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          dish_id?: string
          execution_notes?: string | null
          id?: string
          is_make_ahead?: boolean
          make_ahead_window_hours?: number | null
          name?: string
          portion_quantity?: number | null
          portion_unit?: string | null
          prep_day_offset?: number | null
          prep_station?: string | null
          prep_time_of_day?: string | null
          recipe_id?: string | null
          scale_factor?: number
          sort_order?: number
          storage_notes?: string | null
          tenant_id?: string
          transport_category?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "components_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_component_summary"
            referencedColumns: ["dish_id"]
          },
          {
            foreignKeyName: "components_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "components_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          claimed_at: string | null
          claimed_by_chef_id: string | null
          created_at: string
          email: string
          id: string
          inquiry_id: string | null
          message: string
          name: string
          read: boolean
          subject: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_chef_id?: string | null
          created_at?: string
          email: string
          id?: string
          inquiry_id?: string | null
          message: string
          name: string
          read?: boolean
          subject?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by_chef_id?: string | null
          created_at?: string
          email?: string
          id?: string
          inquiry_id?: string | null
          message?: string
          name?: string
          read?: boolean
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_claimed_by_chef_id_fkey"
            columns: ["claimed_by_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submissions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_performance: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          impressions: number
          inquiry_attributed: boolean
          platform: string
          post_id: string | null
          reach: number
          recorded_at: string
          saves: number
          shares: number
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          impressions?: number
          inquiry_attributed?: boolean
          platform: string
          post_id?: string | null
          reach?: number
          recorded_at?: string
          saves?: number
          shares?: number
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          impressions?: number
          inquiry_attributed?: boolean
          platform?: string
          post_id?: string | null
          reach?: number
          recorded_at?: string
          saves?: number
          shares?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_performance_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_markdown: string
          chef_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          body_markdown: string
          chef_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          body_markdown?: string
          chef_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_payments: {
        Row: {
          amount_cents: number
          chef_id: string
          created_at: string
          description: string | null
          id: string
          payment_date: string
          payment_method: string
          staff_member_id: string
          tax_year: number
        }
        Insert: {
          amount_cents: number
          chef_id: string
          created_at?: string
          description?: string | null
          id?: string
          payment_date: string
          payment_method?: string
          staff_member_id: string
          tax_year: number
        }
        Update: {
          amount_cents?: number
          chef_id?: string
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string
          payment_method?: string
          staff_member_id?: string
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contractor_payments_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_payments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_service_agreements: {
        Row: {
          created_at: string | null
          document_url: string | null
          effective_date: string
          expires_at: string | null
          has_confidentiality_clause: boolean | null
          has_ip_clause: boolean | null
          id: string
          notes: string | null
          payment_terms: string | null
          rate_cents: number | null
          scope_of_work: string | null
          staff_member_id: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_url?: string | null
          effective_date: string
          expires_at?: string | null
          has_confidentiality_clause?: boolean | null
          has_ip_clause?: boolean | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          rate_cents?: number | null
          scope_of_work?: string | null
          staff_member_id: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string | null
          effective_date?: string
          expires_at?: string | null
          has_confidentiality_clause?: boolean | null
          has_ip_clause?: boolean | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          rate_cents?: number | null
          scope_of_work?: string | null
          staff_member_id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_service_agreements_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_service_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          auth_user_id: string
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          notifications_muted: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          auth_user_id: string
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_muted?: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          auth_user_id?: string
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_muted?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_thread_reads: {
        Row: {
          last_read_at: string
          tenant_id: string
          thread_id: string
        }
        Insert: {
          last_read_at?: string
          tenant_id: string
          thread_id: string
        }
        Update: {
          last_read_at?: string
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_thread_reads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_inbox_items"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "conversation_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          client_id: string | null
          created_at: string
          external_thread_key: string | null
          id: string
          is_starred: boolean
          last_activity_at: string
          snoozed_until: string | null
          state: Database["public"]["Enums"]["conversation_thread_state"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          external_thread_key?: string | null
          id?: string
          is_starred?: boolean
          last_activity_at?: string
          snoozed_until?: string | null
          state?: Database["public"]["Enums"]["conversation_thread_state"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          external_thread_key?: string | null
          id?: string
          is_starred?: boolean
          last_activity_at?: string
          snoozed_until?: string | null
          state?: Database["public"]["Enums"]["conversation_thread_state"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "conversation_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_type: Database["public"]["Enums"]["conversation_context_type"]
          created_at: string
          event_id: string | null
          id: string
          inquiry_id: string | null
          last_message_at: string | null
          last_message_preview: string | null
          last_message_sender_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          context_type?: Database["public"]["Enums"]["conversation_context_type"]
          created_at?: string
          event_id?: string | null
          id?: string
          inquiry_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          context_type?: Database["public"]["Enums"]["conversation_context_type"]
          created_at?: string
          event_id?: string | null
          id?: string
          inquiry_id?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_actions: {
        Row: {
          action_key: string
          action_mode: string
          actor_auth_user_id: string | null
          error: string | null
          executed_at: string
          id: string
          idempotency_key: string | null
          recommendation_id: string | null
          request_payload: Json
          result_payload: Json
          run_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          action_key: string
          action_mode: string
          actor_auth_user_id?: string | null
          error?: string | null
          executed_at?: string
          id?: string
          idempotency_key?: string | null
          recommendation_id?: string | null
          request_payload?: Json
          result_payload?: Json
          run_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          action_key?: string
          action_mode?: string
          actor_auth_user_id?: string | null
          error?: string | null
          executed_at?: string
          id?: string
          idempotency_key?: string | null
          recommendation_id?: string | null
          request_payload?: Json
          result_payload?: Json
          run_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_actions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "copilot_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "copilot_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_recommendations: {
        Row: {
          body: string | null
          confidence: number | null
          created_at: string
          id: string
          payload: Json
          recommendation_type: string
          resolved_at: string | null
          run_id: string
          severity: string
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          body?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          payload?: Json
          recommendation_type: string
          resolved_at?: string | null
          run_id: string
          severity?: string
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          body?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          payload?: Json
          recommendation_type?: string
          resolved_at?: string | null
          run_id?: string
          severity?: string
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "copilot_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_run_errors: {
        Row: {
          created_at: string
          error_message: string
          error_payload: Json
          error_scope: string
          id: string
          run_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error_message: string
          error_payload?: Json
          error_scope: string
          id?: string
          run_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error_message?: string
          error_payload?: Json
          error_scope?: string
          id?: string
          run_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_run_errors_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "copilot_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_run_errors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_runs: {
        Row: {
          autonomy_level: number
          completed_at: string | null
          duration_ms: number | null
          id: string
          plan_payload: Json
          run_source: string
          started_at: string
          status: string
          summary: Json
          tenant_id: string
        }
        Insert: {
          autonomy_level?: number
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          plan_payload?: Json
          run_source?: string
          started_at?: string
          status?: string
          summary?: Json
          tenant_id: string
        }
        Update: {
          autonomy_level?: number
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          plan_payload?: Json
          run_source?: string
          started_at?: string
          status?: string
          summary?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_executions: {
        Row: {
          cron_name: string
          duration_ms: number | null
          error_text: string | null
          executed_at: string
          id: string
          result: Json | null
          status: string
        }
        Insert: {
          cron_name: string
          duration_ms?: number | null
          error_text?: string | null
          executed_at?: string
          id?: string
          result?: Json | null
          status?: string
        }
        Update: {
          cron_name?: string
          duration_ms?: number | null
          error_text?: string | null
          executed_at?: string
          id?: string
          result?: Json | null
          status?: string
        }
        Relationships: []
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          display_order: number
          entity_type: Database["public"]["Enums"]["custom_field_entity_type"]
          field_name: string
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id: string
          is_required: boolean
          options: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          entity_type: Database["public"]["Enums"]["custom_field_entity_type"]
          field_name: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_required?: boolean
          options?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          entity_type?: Database["public"]["Enums"]["custom_field_entity_type"]
          field_name?: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_required?: boolean
          options?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          entity_id: string
          field_definition_id: string
          id: string
          tenant_id: string
          updated_at: string
          value_boolean: boolean | null
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          field_definition_id: string
          id?: string
          tenant_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          field_definition_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_plan_dismissals: {
        Row: {
          chef_id: string
          created_at: string
          dismissed_date: string
          id: string
          item_key: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          dismissed_date?: string
          id?: string
          item_key: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          dismissed_date?: string
          id?: string
          item_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_plan_dismissals_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_plan_drafts: {
        Row: {
          approved_at: string | null
          body: string
          chef_id: string
          created_at: string
          draft_type: string
          id: string
          plan_date: string
          recipient_client_id: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          status: string
          subject: string | null
        }
        Insert: {
          approved_at?: string | null
          body: string
          chef_id: string
          created_at?: string
          draft_type: string
          id?: string
          plan_date?: string
          recipient_client_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          approved_at?: string | null
          body?: string
          chef_id?: string
          created_at?: string
          draft_type?: string
          id?: string
          plan_date?: string
          recipient_client_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_plan_drafts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_plan_drafts_recipient_client_id_fkey"
            columns: ["recipient_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "daily_plan_drafts_recipient_client_id_fkey"
            columns: ["recipient_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reconciliation_reports: {
        Row: {
          card_total_cents: number
          cash_total_cents: number
          cash_variance_cents: number | null
          closing_cash_cents: number | null
          created_at: string
          expected_cash_cents: number | null
          flags: Json
          id: string
          ledger_total_cents: number | null
          net_revenue_cents: number
          notes: string | null
          opening_cash_cents: number | null
          other_total_cents: number
          payment_ledger_diff_cents: number | null
          report_date: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          tenant_id: string
          total_refunds_cents: number
          total_revenue_cents: number
          total_sales_count: number
          total_tax_cents: number
          total_tips_cents: number
          updated_at: string
        }
        Insert: {
          card_total_cents?: number
          cash_total_cents?: number
          cash_variance_cents?: number | null
          closing_cash_cents?: number | null
          created_at?: string
          expected_cash_cents?: number | null
          flags?: Json
          id?: string
          ledger_total_cents?: number | null
          net_revenue_cents?: number
          notes?: string | null
          opening_cash_cents?: number | null
          other_total_cents?: number
          payment_ledger_diff_cents?: number | null
          report_date: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id: string
          total_refunds_cents?: number
          total_revenue_cents?: number
          total_sales_count?: number
          total_tax_cents?: number
          total_tips_cents?: number
          updated_at?: string
        }
        Update: {
          card_total_cents?: number
          cash_total_cents?: number
          cash_variance_cents?: number | null
          closing_cash_cents?: number | null
          created_at?: string
          expected_cash_cents?: number | null
          flags?: Json
          id?: string
          ledger_total_cents?: number | null
          net_revenue_cents?: number
          notes?: string | null
          opening_cash_cents?: number | null
          other_total_cents?: number
          payment_ledger_diff_cents?: number | null
          report_date?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id?: string
          total_refunds_cents?: number
          total_revenue_cents?: number
          total_sales_count?: number
          total_tax_cents?: number
          total_tips_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reconciliation_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          content: Json
          created_at: string
          email_sent_at: string | null
          id: string
          report_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          email_sent_at?: string | null
          id?: string
          report_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          email_sent_at?: string | null
          id?: string
          report_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_revenue: {
        Row: {
          chef_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          source: string
          total_revenue_cents: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          source?: string
          total_revenue_cents?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          source?: string
          total_revenue_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_revenue_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tax_summary: {
        Row: {
          city: string | null
          city_tax_cents: number
          county: string | null
          county_tax_cents: number
          created_at: string
          id: string
          report_date: string
          state: string | null
          state_tax_cents: number
          tax_class: string
          tax_collected_cents: number
          tax_jurisdiction: string
          tax_rate: number
          taxable_amount_cents: number
          tenant_id: string
          transaction_count: number
        }
        Insert: {
          city?: string | null
          city_tax_cents?: number
          county?: string | null
          county_tax_cents?: number
          created_at?: string
          id?: string
          report_date: string
          state?: string | null
          state_tax_cents?: number
          tax_class?: string
          tax_collected_cents?: number
          tax_jurisdiction: string
          tax_rate?: number
          taxable_amount_cents?: number
          tenant_id: string
          transaction_count?: number
        }
        Update: {
          city?: string | null
          city_tax_cents?: number
          county?: string | null
          county_tax_cents?: number
          created_at?: string
          id?: string
          report_date?: string
          state?: string | null
          state_tax_cents?: number
          tax_class?: string
          tax_collected_cents?: number
          tax_jurisdiction?: string
          tax_rate?: number
          taxable_amount_cents?: number
          tenant_id?: string
          transaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_tax_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dead_letter_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          first_failed_at: string
          id: string
          job_id: string | null
          job_type: string
          last_failed_at: string
          payload: Json
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          first_failed_at?: string
          id?: string
          job_id?: string | null
          job_type: string
          last_failed_at?: string
          payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          first_failed_at?: string
          id?: string
          job_id?: string | null
          job_type?: string
          last_failed_at?: string
          payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dead_letter_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          actual_inquiry_count: number
          chef_id: string
          confidence: number
          created_at: string
          id: string
          month: number
          predicted_inquiry_count: number
          updated_at: string
          year: number
        }
        Insert: {
          actual_inquiry_count?: number
          chef_id: string
          confidence?: number
          created_at?: string
          id?: string
          month: number
          predicted_inquiry_count?: number
          updated_at?: string
          year: number
        }
        Update: {
          actual_inquiry_count?: number
          chef_id?: string
          confidence?: number
          created_at?: string
          id?: string
          month?: number
          predicted_inquiry_count?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "demand_forecasts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      device_events: {
        Row: {
          created_at: string
          device_id: string
          id: string
          payload: Json
          staff_member_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          payload?: Json
          staff_member_id?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          payload?: Json
          staff_member_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_events_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          device_id: string
          ended_at: string | null
          id: string
          ip: string | null
          last_seen_at: string | null
          staff_member_id: string | null
          started_at: string
          status: string
          user_agent: string | null
        }
        Insert: {
          device_id: string
          ended_at?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string | null
          staff_member_id?: string | null
          started_at?: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          device_id?: string
          ended_at?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string | null
          staff_member_id?: string | null
          started_at?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_sessions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          app_version: string | null
          claimed_at: string | null
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          idle_timeout_seconds: number
          kiosk_flow: Database["public"]["Enums"]["kiosk_flow"]
          last_ip: string | null
          last_seen_at: string | null
          location_name: string | null
          mode: Database["public"]["Enums"]["device_mode"]
          name: string
          pairing_code_hash: string | null
          pairing_expires_at: string | null
          require_staff_pin: boolean
          status: Database["public"]["Enums"]["device_status"]
          tenant_id: string
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          claimed_at?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          idle_timeout_seconds?: number
          kiosk_flow?: Database["public"]["Enums"]["kiosk_flow"]
          last_ip?: string | null
          last_seen_at?: string | null
          location_name?: string | null
          mode?: Database["public"]["Enums"]["device_mode"]
          name: string
          pairing_code_hash?: string | null
          pairing_expires_at?: string | null
          require_staff_pin?: boolean
          status?: Database["public"]["Enums"]["device_status"]
          tenant_id: string
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          claimed_at?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          idle_timeout_seconds?: number
          kiosk_flow?: Database["public"]["Enums"]["kiosk_flow"]
          last_ip?: string | null
          last_seen_at?: string | null
          location_name?: string | null
          mode?: Database["public"]["Enums"]["device_mode"]
          name?: string
          pairing_code_hash?: string | null
          pairing_expires_at?: string | null
          require_staff_pin?: boolean
          status?: Database["public"]["Enums"]["device_status"]
          tenant_id?: string
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dietary_conflict_alerts: {
        Row: {
          acknowledged: boolean
          allergy: string
          chef_id: string
          conflicting_dish: string
          created_at: string
          event_id: string
          guest_name: string
          id: string
          severity: string
        }
        Insert: {
          acknowledged?: boolean
          allergy: string
          chef_id: string
          conflicting_dish: string
          created_at?: string
          event_id: string
          guest_name: string
          id?: string
          severity?: string
        }
        Update: {
          acknowledged?: boolean
          allergy?: string
          chef_id?: string
          conflicting_dish?: string
          created_at?: string
          event_id?: string
          guest_name?: string
          id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "dietary_conflict_alerts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_conflict_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dietary_conflict_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dietary_conflict_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dietary_conflict_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_outreach_log: {
        Row: {
          body: string
          channel: string
          chef_id: string
          client_id: string
          delivered: boolean | null
          error_msg: string | null
          id: string
          sent_at: string
          subject: string | null
        }
        Insert: {
          body: string
          channel: string
          chef_id: string
          client_id: string
          delivered?: boolean | null
          error_msg?: string | null
          id?: string
          sent_at?: string
          subject?: string | null
        }
        Update: {
          body?: string
          channel?: string
          chef_id?: string
          client_id?: string
          delivered?: boolean | null
          error_msg?: string | null
          id?: string
          sent_at?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_outreach_log_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_outreach_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "direct_outreach_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_appearances: {
        Row: {
          client_name: string | null
          created_at: string
          dish_id: string
          event_date: string | null
          event_id: string | null
          event_type: string | null
          id: string
          menu_id: string | null
          menu_upload_job_id: string | null
          tenant_id: string
          variation_notes: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          dish_id: string
          event_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          menu_id?: string | null
          menu_upload_job_id?: string | null
          tenant_id: string
          variation_notes?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string
          dish_id?: string
          event_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          menu_id?: string | null
          menu_upload_job_id?: string | null
          tenant_id?: string
          variation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_appearances_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_appearances_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_appearances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dish_appearances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dish_appearances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dish_appearances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_appearances_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "dish_appearances_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_appearances_menu_upload_job_id_fkey"
            columns: ["menu_upload_job_id"]
            isOneToOne: false
            referencedRelation: "menu_upload_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_appearances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_feedback: {
        Row: {
          client_reaction: string | null
          created_at: string
          dish_id: string
          event_id: string | null
          execution_notes: string | null
          id: string
          rating: number | null
          tenant_id: string
          would_serve_again: boolean | null
        }
        Insert: {
          client_reaction?: string | null
          created_at?: string
          dish_id: string
          event_id?: string | null
          execution_notes?: string | null
          id?: string
          rating?: number | null
          tenant_id: string
          would_serve_again?: boolean | null
        }
        Update: {
          client_reaction?: string | null
          created_at?: string
          dish_id?: string
          event_id?: string | null
          execution_notes?: string | null
          id?: string
          rating?: number | null
          tenant_id?: string
          would_serve_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_feedback_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_feedback_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dish_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dish_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dish_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_index: {
        Row: {
          allergen_flags: string[] | null
          archived: boolean
          can_prep_ahead: boolean | null
          canonical_name: string
          course: string
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          dna: Json | null
          first_served: string | null
          id: string
          is_signature: boolean
          last_served: string | null
          linked_recipe_id: string | null
          name: string
          notes: string | null
          photo_storage_path: string | null
          plating_difficulty:
            | Database["public"]["Enums"]["dish_plating_difficulty"]
            | null
          prep_complexity:
            | Database["public"]["Enums"]["dish_prep_complexity"]
            | null
          retired_at: string | null
          retirement_reason: string | null
          rotation_status: Database["public"]["Enums"]["dish_rotation_status"]
          season_affinity: string[] | null
          special_equipment: string[] | null
          tags: string[] | null
          tenant_id: string
          times_served: number
          updated_at: string
        }
        Insert: {
          allergen_flags?: string[] | null
          archived?: boolean
          can_prep_ahead?: boolean | null
          canonical_name: string
          course: string
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          dna?: Json | null
          first_served?: string | null
          id?: string
          is_signature?: boolean
          last_served?: string | null
          linked_recipe_id?: string | null
          name: string
          notes?: string | null
          photo_storage_path?: string | null
          plating_difficulty?:
            | Database["public"]["Enums"]["dish_plating_difficulty"]
            | null
          prep_complexity?:
            | Database["public"]["Enums"]["dish_prep_complexity"]
            | null
          retired_at?: string | null
          retirement_reason?: string | null
          rotation_status?: Database["public"]["Enums"]["dish_rotation_status"]
          season_affinity?: string[] | null
          special_equipment?: string[] | null
          tags?: string[] | null
          tenant_id: string
          times_served?: number
          updated_at?: string
        }
        Update: {
          allergen_flags?: string[] | null
          archived?: boolean
          can_prep_ahead?: boolean | null
          canonical_name?: string
          course?: string
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          dna?: Json | null
          first_served?: string | null
          id?: string
          is_signature?: boolean
          last_served?: string | null
          linked_recipe_id?: string | null
          name?: string
          notes?: string | null
          photo_storage_path?: string | null
          plating_difficulty?:
            | Database["public"]["Enums"]["dish_plating_difficulty"]
            | null
          prep_complexity?:
            | Database["public"]["Enums"]["dish_prep_complexity"]
            | null
          retired_at?: string | null
          retirement_reason?: string | null
          rotation_status?: Database["public"]["Enums"]["dish_rotation_status"]
          season_affinity?: string[] | null
          special_equipment?: string[] | null
          tags?: string[] | null
          tenant_id?: string
          times_served?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_index_linked_recipe_id_fkey"
            columns: ["linked_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "dish_index_linked_recipe_id_fkey"
            columns: ["linked_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_index_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_variations: {
        Row: {
          created_at: string
          id: string
          parent_dish_id: string
          relationship: string
          tenant_id: string
          variant_dish_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_dish_id: string
          relationship?: string
          tenant_id: string
          variant_dish_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_dish_id?: string
          relationship?: string
          tenant_id?: string
          variant_dish_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_variations_parent_dish_id_fkey"
            columns: ["parent_dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_variations_parent_dish_id_fkey"
            columns: ["parent_dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_variations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_variations_variant_dish_id_fkey"
            columns: ["variant_dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_variations_variant_dish_id_fkey"
            columns: ["variant_dish_id"]
            isOneToOne: false
            referencedRelation: "dish_index_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          allergen_flags: string[]
          beverage_pairing: string | null
          beverage_pairing_notes: string | null
          chef_notes: string | null
          client_notes: string | null
          course_name: string
          course_number: number
          created_at: string
          created_by: string | null
          description: string | null
          dietary_tags: string[]
          id: string
          menu_id: string
          name: string | null
          photo_url: string | null
          plating_instructions: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergen_flags?: string[]
          beverage_pairing?: string | null
          beverage_pairing_notes?: string | null
          chef_notes?: string | null
          client_notes?: string | null
          course_name: string
          course_number: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          dietary_tags?: string[]
          id?: string
          menu_id: string
          name?: string | null
          photo_url?: string | null
          plating_instructions?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergen_flags?: string[]
          beverage_pairing?: string | null
          beverage_pairing_notes?: string | null
          chef_notes?: string | null
          client_notes?: string | null
          course_name?: string
          course_number?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          dietary_tags?: string[]
          id?: string
          menu_id?: string
          name?: string | null
          photo_url?: string | null
          plating_instructions?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "dishes_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          author_name: string
          chef_id: string
          comment_text: string
          created_at: string
          document_type: string
          entity_id: string
          id: string
          resolved: boolean
        }
        Insert: {
          author_name: string
          chef_id: string
          comment_text: string
          created_at?: string
          document_type: string
          entity_id: string
          id?: string
          resolved?: boolean
        }
        Update: {
          author_name?: string
          chef_id?: string
          comment_text?: string
          created_at?: string
          document_type?: string
          entity_id?: string
          id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          snapshot: Json
          tenant_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          snapshot: Json
          tenant_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          snapshot?: Json
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dop_task_completions: {
        Row: {
          completed_at: string
          event_id: string
          id: string
          notes: string | null
          task_key: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string
          event_id: string
          id?: string
          notes?: string | null
          task_key: string
          tenant_id: string
        }
        Update: {
          completed_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          task_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dop_task_completions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dop_task_completions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dop_task_completions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "dop_task_completions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dop_task_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          additional_withholding_cents: number
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          allowances: number
          annual_salary_cents: number | null
          chef_id: string
          created_at: string
          email: string | null
          filing_status: string
          hire_date: string
          hourly_rate_cents: number | null
          id: string
          name: string
          pay_type: string
          phone: string | null
          ssn_last4: string | null
          staff_member_id: string | null
          status: string
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          additional_withholding_cents?: number
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          allowances?: number
          annual_salary_cents?: number | null
          chef_id: string
          created_at?: string
          email?: string | null
          filing_status?: string
          hire_date: string
          hourly_rate_cents?: number | null
          id?: string
          name: string
          pay_type?: string
          phone?: string | null
          ssn_last4?: string | null
          staff_member_id?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          additional_withholding_cents?: number
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          allowances?: number
          annual_salary_cents?: number | null
          chef_id?: string
          created_at?: string
          email?: string | null
          filing_status?: string
          hire_date?: string
          hourly_rate_cents?: number | null
          id?: string
          name?: string
          pay_type?: string
          phone?: string | null
          ssn_last4?: string | null
          staff_member_id?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_depreciation_schedules: {
        Row: {
          annual_depreciation_cents: number
          chef_id: string
          claimed: boolean
          claimed_at: string | null
          created_at: string
          cumulative_depreciation_cents: number
          depreciable_basis_cents: number
          depreciation_method: string
          equipment_item_id: string
          id: string
          notes: string | null
          tax_year: number
          updated_at: string
        }
        Insert: {
          annual_depreciation_cents: number
          chef_id: string
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          cumulative_depreciation_cents?: number
          depreciable_basis_cents: number
          depreciation_method: string
          equipment_item_id: string
          id?: string
          notes?: string | null
          tax_year: number
          updated_at?: string
        }
        Update: {
          annual_depreciation_cents?: number
          chef_id?: string
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          cumulative_depreciation_cents?: number
          depreciable_basis_cents?: number
          depreciation_method?: string
          equipment_item_id?: string
          id?: string
          notes?: string | null
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_depreciation_schedules_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_depreciation_schedules_equipment_item_id_fkey"
            columns: ["equipment_item_id"]
            isOneToOne: false
            referencedRelation: "equipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_items: {
        Row: {
          category: Database["public"]["Enums"]["equipment_category"]
          chef_id: string
          created_at: string
          current_value_cents: number | null
          depreciation_method: string | null
          id: string
          last_maintained_at: string | null
          maintenance_interval_days: number | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price_cents: number | null
          salvage_value_cents: number | null
          serial_number: string | null
          status: string
          tax_year_placed_in_service: number | null
          updated_at: string
          useful_life_years: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["equipment_category"]
          chef_id: string
          created_at?: string
          current_value_cents?: number | null
          depreciation_method?: string | null
          id?: string
          last_maintained_at?: string | null
          maintenance_interval_days?: number | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_cents?: number | null
          salvage_value_cents?: number | null
          serial_number?: string | null
          status?: string
          tax_year_placed_in_service?: number | null
          updated_at?: string
          useful_life_years?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["equipment_category"]
          chef_id?: string
          created_at?: string
          current_value_cents?: number | null
          depreciation_method?: string | null
          id?: string
          last_maintained_at?: string | null
          maintenance_interval_days?: number | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_cents?: number | null
          salvage_value_cents?: number | null
          serial_number?: string | null
          status?: string
          tax_year_placed_in_service?: number | null
          updated_at?: string
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_items_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rentals: {
        Row: {
          chef_id: string
          cost_cents: number
          created_at: string
          equipment_name: string
          event_id: string | null
          id: string
          notes: string | null
          rental_date: string
          return_date: string | null
          vendor_name: string | null
        }
        Insert: {
          chef_id: string
          cost_cents?: number
          created_at?: string
          equipment_name: string
          event_id?: string | null
          id?: string
          notes?: string | null
          rental_date: string
          return_date?: string | null
          vendor_name?: string | null
        }
        Update: {
          chef_id?: string
          cost_cents?: number
          created_at?: string
          equipment_name?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          rental_date?: string
          return_date?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rentals_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "equipment_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "equipment_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "equipment_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_alcohol_logs: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          last_call_at: string | null
          log_entries: Json | null
          notes: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          last_call_at?: string | null
          log_entries?: Json | null
          notes?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          last_call_at?: string | null
          log_entries?: Json | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_alcohol_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_alcohol_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_alcohol_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_alcohol_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_alcohol_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cannabis_course_config: {
        Row: {
          archived_at: string | null
          course_index: number
          created_at: string
          event_id: string
          id: string
          infusion_enabled: boolean
          is_active: boolean
          notes: string | null
          planned_mg_per_guest: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          course_index: number
          created_at?: string
          event_id: string
          id?: string
          infusion_enabled?: boolean
          is_active?: boolean
          notes?: string | null
          planned_mg_per_guest?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          course_index?: number
          created_at?: string
          event_id?: string
          id?: string
          infusion_enabled?: boolean
          is_active?: boolean
          notes?: string | null
          planned_mg_per_guest?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cannabis_course_config_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_cannabis_course_config_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_cannabis_course_config_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_cannabis_course_config_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cannabis_course_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cannabis_settings: {
        Row: {
          cannabis_enabled: boolean
          created_at: string
          enabled_at: string | null
          event_id: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cannabis_enabled?: boolean
          created_at?: string
          enabled_at?: string | null
          event_id: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cannabis_enabled?: boolean
          created_at?: string
          enabled_at?: string | null
          event_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cannabis_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_cannabis_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_cannabis_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_cannabis_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cannabis_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborators: {
        Row: {
          chef_id: string
          created_at: string
          event_id: string
          id: string
          invited_by_chef_id: string
          note: string | null
          permissions: Json
          responded_at: string | null
          role: string
          status: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          event_id: string
          id?: string
          invited_by_chef_id: string
          note?: string | null
          permissions?: Json
          responded_at?: string | null
          role?: string
          status?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          event_id?: string
          id?: string
          invited_by_chef_id?: string
          note?: string | null
          permissions?: Json
          responded_at?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborators_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_collaborators_invited_by_chef_id_fkey"
            columns: ["invited_by_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contingency_notes: {
        Row: {
          backup_contact_id: string | null
          chef_id: string
          event_id: string
          id: string
          mitigation_notes: string
          scenario_type: string
          updated_at: string
        }
        Insert: {
          backup_contact_id?: string | null
          chef_id: string
          event_id: string
          id?: string
          mitigation_notes: string
          scenario_type?: string
          updated_at?: string
        }
        Update: {
          backup_contact_id?: string | null
          chef_id?: string
          event_id?: string
          id?: string
          mitigation_notes?: string
          scenario_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_contingency_notes_backup_contact_id_fkey"
            columns: ["backup_contact_id"]
            isOneToOne: false
            referencedRelation: "chef_emergency_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contingency_notes_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contingency_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_contingency_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_contingency_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_contingency_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contract_signers: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          required: boolean
          signature_data_url: string | null
          signed_at: string | null
          signed_by_auth_user_id: string | null
          signer_email: string
          signer_ip_address: string | null
          signer_name: string
          signer_role: string
          signer_user_agent: string | null
          signing_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          required?: boolean
          signature_data_url?: string | null
          signed_at?: string | null
          signed_by_auth_user_id?: string | null
          signer_email: string
          signer_ip_address?: string | null
          signer_name: string
          signer_role?: string
          signer_user_agent?: string | null
          signing_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          required?: boolean
          signature_data_url?: string | null
          signed_at?: string | null
          signed_by_auth_user_id?: string | null
          signer_email?: string
          signer_ip_address?: string | null
          signer_name?: string
          signer_role?: string
          signer_user_agent?: string | null
          signing_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_contract_signers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "event_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contract_signers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contract_versions: {
        Row: {
          body_snapshot: string
          change_note: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          tenant_id: string | null
          version_number: number
        }
        Insert: {
          body_snapshot: string
          change_note?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          tenant_id?: string | null
          version_number: number
        }
        Update: {
          body_snapshot?: string
          change_note?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tenant_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "event_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contract_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contracts: {
        Row: {
          body_snapshot: string
          chef_id: string
          client_id: string
          created_at: string
          event_id: string
          id: string
          sent_at: string | null
          signature_data_url: string | null
          signed_at: string | null
          signer_ip_address: string | null
          signer_user_agent: string | null
          status: Database["public"]["Enums"]["contract_status"]
          template_id: string | null
          updated_at: string
          viewed_at: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          body_snapshot: string
          chef_id: string
          client_id: string
          created_at?: string
          event_id: string
          id?: string
          sent_at?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signer_ip_address?: string | null
          signer_user_agent?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          updated_at?: string
          viewed_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          body_snapshot?: string
          chef_id?: string
          client_id?: string
          created_at?: string
          event_id?: string
          id?: string
          sent_at?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signer_ip_address?: string | null
          signer_user_agent?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          updated_at?: string
          viewed_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_contracts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "event_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_guest_dietary_items: {
        Row: {
          created_at: string
          event_id: string
          guest_id: string
          id: string
          item_type: string
          label: string
          notes: string | null
          severity: string
          subject: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_id: string
          id?: string
          item_type: string
          label: string
          notes?: string | null
          severity: string
          subject: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_id?: string
          id?: string
          item_type?: string
          label?: string
          notes?: string | null
          severity?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_guest_dietary_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guest_dietary_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guest_dietary_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guest_dietary_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guest_dietary_items_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guest_dietary_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_guest_rsvp_audit: {
        Row: {
          action: string
          after_values: Json | null
          before_values: Json | null
          changed_by: string
          created_at: string
          event_id: string
          guest_id: string
          guest_token: string
          id: string
          is_critical: boolean
          reason: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          after_values?: Json | null
          before_values?: Json | null
          changed_by?: string
          created_at?: string
          event_id: string
          guest_id: string
          guest_token: string
          id?: string
          is_critical?: boolean
          reason?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          after_values?: Json | null
          before_values?: Json | null
          changed_by?: string
          created_at?: string
          event_id?: string
          guest_id?: string
          guest_token?: string
          id?: string
          is_critical?: boolean
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_guest_rsvp_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guest_rsvp_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guest_rsvp_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guest_rsvp_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guest_rsvp_audit_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guest_rsvp_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_guests: {
        Row: {
          allergies: string[] | null
          attendance_queue_status: string
          auth_user_id: string | null
          created_at: string
          data_processing_consent: boolean
          data_processing_consent_at: string | null
          dietary_restrictions: string[] | null
          email: string | null
          event_id: string
          event_share_id: string
          full_name: string
          guest_token: string
          id: string
          marketing_opt_in: boolean
          notes: string | null
          photo_consent: boolean | null
          plus_one: boolean
          plus_one_allergies: string[] | null
          plus_one_dietary: string[] | null
          plus_one_name: string | null
          promoted_at: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          tenant_id: string
          updated_at: string
          waitlisted_at: string | null
        }
        Insert: {
          allergies?: string[] | null
          attendance_queue_status?: string
          auth_user_id?: string | null
          created_at?: string
          data_processing_consent?: boolean
          data_processing_consent_at?: string | null
          dietary_restrictions?: string[] | null
          email?: string | null
          event_id: string
          event_share_id: string
          full_name: string
          guest_token: string
          id?: string
          marketing_opt_in?: boolean
          notes?: string | null
          photo_consent?: boolean | null
          plus_one?: boolean
          plus_one_allergies?: string[] | null
          plus_one_dietary?: string[] | null
          plus_one_name?: string | null
          promoted_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          tenant_id: string
          updated_at?: string
          waitlisted_at?: string | null
        }
        Update: {
          allergies?: string[] | null
          attendance_queue_status?: string
          auth_user_id?: string | null
          created_at?: string
          data_processing_consent?: boolean
          data_processing_consent_at?: string | null
          dietary_restrictions?: string[] | null
          email?: string | null
          event_id?: string
          event_share_id?: string
          full_name?: string
          guest_token?: string
          id?: string
          marketing_opt_in?: boolean
          notes?: string | null
          photo_consent?: boolean | null
          plus_one?: boolean
          plus_one_allergies?: string[] | null
          plus_one_dietary?: string[] | null
          plus_one_name?: string | null
          promoted_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          tenant_id?: string
          updated_at?: string
          waitlisted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_event_share_id_fkey"
            columns: ["event_share_id"]
            isOneToOne: false
            referencedRelation: "event_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_join_requests: {
        Row: {
          created_at: string
          event_id: string
          event_share_id: string
          guest_id: string | null
          id: string
          invite_id: string | null
          note: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by_client_id: string | null
          status: Database["public"]["Enums"]["event_join_request_status"]
          tenant_id: string
          updated_at: string
          viewer_email: string
          viewer_name: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_share_id: string
          guest_id?: string | null
          id?: string
          invite_id?: string | null
          note?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_client_id?: string | null
          status?: Database["public"]["Enums"]["event_join_request_status"]
          tenant_id: string
          updated_at?: string
          viewer_email: string
          viewer_name: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_share_id?: string
          guest_id?: string | null
          id?: string
          invite_id?: string | null
          note?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_client_id?: string | null
          status?: Database["public"]["Enums"]["event_join_request_status"]
          tenant_id?: string
          updated_at?: string
          viewer_email?: string
          viewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_join_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_join_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_join_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_join_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_join_requests_event_share_id_fkey"
            columns: ["event_share_id"]
            isOneToOne: false
            referencedRelation: "event_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_join_requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_join_requests_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "event_share_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_join_requests_resolved_by_client_id_fkey"
            columns: ["resolved_by_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "event_join_requests_resolved_by_client_id_fkey"
            columns: ["resolved_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_join_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          caption: string | null
          client_id: string | null
          content_type: string
          created_at: string
          deleted_at: string | null
          display_order: number
          event_id: string
          filename_original: string
          id: string
          permission_override: string | null
          size_bytes: number
          storage_path: string
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          client_id?: string | null
          content_type: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          event_id: string
          filename_original?: string
          id?: string
          permission_override?: string | null
          size_bytes?: number
          storage_path: string
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          client_id?: string | null
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          event_id?: string
          filename_original?: string
          id?: string
          permission_override?: string | null
          size_bytes?: number
          storage_path?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "event_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_safety_checklists: {
        Row: {
          completed_at: string | null
          created_at: string | null
          event_id: string
          id: string
          items: Json
          override_reason: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          items?: Json
          override_reason?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          items?: Json
          override_reason?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_safety_checklists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_safety_checklists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_safety_checklists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_safety_checklists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_safety_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sales_tax: {
        Row: {
          chef_id: string
          created_at: string
          event_id: string
          exemption_reason: string | null
          id: string
          is_exempt: boolean
          remittance_period: string | null
          remitted: boolean
          remitted_at: string | null
          tax_collected_cents: number
          tax_rate_bps: number
          taxable_amount_cents: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          event_id: string
          exemption_reason?: string | null
          id?: string
          is_exempt?: boolean
          remittance_period?: string | null
          remitted?: boolean
          remitted_at?: string | null
          tax_collected_cents?: number
          tax_rate_bps?: number
          taxable_amount_cents?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          event_id?: string
          exemption_reason?: string | null
          id?: string
          is_exempt?: boolean
          remittance_period?: string | null
          remitted?: boolean
          remitted_at?: string | null
          tax_collected_cents?: number
          tax_rate_bps?: number
          taxable_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sales_tax_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sales_tax_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_sales_tax_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_sales_tax_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_sales_tax_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_share_invite_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          invite_id: string | null
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          invite_id?: string | null
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          invite_id?: string | null
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_share_invite_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_share_invite_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_share_invite_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_share_invite_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_share_invite_events_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "event_share_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_share_invite_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_share_invites: {
        Row: {
          allow_book_own: boolean
          allow_join_request: boolean
          audience_role: Database["public"]["Enums"]["share_audience_role"]
          consumed_at: string | null
          consumed_by_guest_id: string | null
          created_at: string
          created_by_client_id: string | null
          created_by_guest_token: string | null
          event_id: string
          event_share_id: string
          expires_at: string | null
          id: string
          invited_email: string | null
          invited_name: string | null
          last_viewed_at: string | null
          note: string | null
          revoked_reason: string | null
          single_use: boolean
          status: Database["public"]["Enums"]["event_share_invite_status"]
          tenant_id: string
          token: string
          updated_at: string
          view_count: number
        }
        Insert: {
          allow_book_own?: boolean
          allow_join_request?: boolean
          audience_role: Database["public"]["Enums"]["share_audience_role"]
          consumed_at?: string | null
          consumed_by_guest_id?: string | null
          created_at?: string
          created_by_client_id?: string | null
          created_by_guest_token?: string | null
          event_id: string
          event_share_id: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          invited_name?: string | null
          last_viewed_at?: string | null
          note?: string | null
          revoked_reason?: string | null
          single_use?: boolean
          status?: Database["public"]["Enums"]["event_share_invite_status"]
          tenant_id: string
          token: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          allow_book_own?: boolean
          allow_join_request?: boolean
          audience_role?: Database["public"]["Enums"]["share_audience_role"]
          consumed_at?: string | null
          consumed_by_guest_id?: string | null
          created_at?: string
          created_by_client_id?: string | null
          created_by_guest_token?: string | null
          event_id?: string
          event_share_id?: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          invited_name?: string | null
          last_viewed_at?: string | null
          note?: string | null
          revoked_reason?: string | null
          single_use?: boolean
          status?: Database["public"]["Enums"]["event_share_invite_status"]
          tenant_id?: string
          token?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_share_invites_consumed_by_guest_id_fkey"
            columns: ["consumed_by_guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_share_invites_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "event_share_invites_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_share_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_share_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_share_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_share_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_share_invites_event_share_id_fkey"
            columns: ["event_share_id"]
            isOneToOne: false
            referencedRelation: "event_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_share_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_shares: {
        Row: {
          created_at: string
          created_by_client_id: string
          enforce_capacity: boolean
          event_id: string
          expires_at: string | null
          hub_group_id: string | null
          id: string
          is_active: boolean
          max_capacity: number | null
          reminder_schedule: string[]
          reminders_enabled: boolean
          require_join_approval: boolean
          rsvp_deadline_at: string | null
          tenant_id: string
          theme_id: string | null
          token: string
          updated_at: string
          visibility_settings: Json
          waitlist_enabled: boolean
        }
        Insert: {
          created_at?: string
          created_by_client_id: string
          enforce_capacity?: boolean
          event_id: string
          expires_at?: string | null
          hub_group_id?: string | null
          id?: string
          is_active?: boolean
          max_capacity?: number | null
          reminder_schedule?: string[]
          reminders_enabled?: boolean
          require_join_approval?: boolean
          rsvp_deadline_at?: string | null
          tenant_id: string
          theme_id?: string | null
          token: string
          updated_at?: string
          visibility_settings?: Json
          waitlist_enabled?: boolean
        }
        Update: {
          created_at?: string
          created_by_client_id?: string
          enforce_capacity?: boolean
          event_id?: string
          expires_at?: string | null
          hub_group_id?: string | null
          id?: string
          is_active?: boolean
          max_capacity?: number | null
          reminder_schedule?: string[]
          reminders_enabled?: boolean
          require_join_approval?: boolean
          rsvp_deadline_at?: string | null
          tenant_id?: string
          theme_id?: string | null
          token?: string
          updated_at?: string
          visibility_settings?: Json
          waitlist_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_shares_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "event_shares_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_shares_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_shares_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_shares_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_shares_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_shares_hub_group_id_fkey"
            columns: ["hub_group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_shares_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "event_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          actual_hours: number | null
          chef_id: string
          coc_acknowledged: boolean | null
          coc_acknowledged_at: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          pay_amount_cents: number | null
          rate_override_cents: number | null
          role_override: Database["public"]["Enums"]["staff_role"] | null
          scheduled_hours: number | null
          staff_member_id: string
          status: Database["public"]["Enums"]["staff_assignment_status"]
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          chef_id: string
          coc_acknowledged?: boolean | null
          coc_acknowledged_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          pay_amount_cents?: number | null
          rate_override_cents?: number | null
          role_override?: Database["public"]["Enums"]["staff_role"] | null
          scheduled_hours?: number | null
          staff_member_id: string
          status?: Database["public"]["Enums"]["staff_assignment_status"]
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          chef_id?: string
          coc_acknowledged?: boolean | null
          coc_acknowledged_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          pay_amount_cents?: number | null
          rate_override_cents?: number | null
          role_override?: Database["public"]["Enums"]["staff_role"] | null
          scheduled_hours?: number | null
          staff_member_id?: string
          status?: Database["public"]["Enums"]["staff_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_state_transitions: {
        Row: {
          event_id: string
          from_status: Database["public"]["Enums"]["event_status"] | null
          id: string
          metadata: Json | null
          reason: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["event_status"]
          transitioned_at: string
          transitioned_by: string | null
        }
        Insert: {
          event_id: string
          from_status?: Database["public"]["Enums"]["event_status"] | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["event_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Update: {
          event_id?: string
          from_status?: Database["public"]["Enums"]["event_status"] | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["event_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_state_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_stubs: {
        Row: {
          adopted_at: string | null
          adopted_event_id: string | null
          adopted_tenant_id: string | null
          allergies: string[] | null
          created_at: string
          created_by_profile_id: string
          dietary_restrictions: string[] | null
          event_date: string | null
          guest_count: number | null
          hub_group_id: string | null
          id: string
          location_text: string | null
          notes: string | null
          occasion: string | null
          serve_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          adopted_at?: string | null
          adopted_event_id?: string | null
          adopted_tenant_id?: string | null
          allergies?: string[] | null
          created_at?: string
          created_by_profile_id: string
          dietary_restrictions?: string[] | null
          event_date?: string | null
          guest_count?: number | null
          hub_group_id?: string | null
          id?: string
          location_text?: string | null
          notes?: string | null
          occasion?: string | null
          serve_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          adopted_at?: string | null
          adopted_event_id?: string | null
          adopted_tenant_id?: string | null
          allergies?: string[] | null
          created_at?: string
          created_by_profile_id?: string
          dietary_restrictions?: string[] | null
          event_date?: string | null
          guest_count?: number | null
          hub_group_id?: string | null
          id?: string
          location_text?: string | null
          notes?: string | null
          occasion?: string | null
          serve_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_stubs_adopted_event_id_fkey"
            columns: ["adopted_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_stubs_adopted_event_id_fkey"
            columns: ["adopted_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_stubs_adopted_event_id_fkey"
            columns: ["adopted_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_stubs_adopted_event_id_fkey"
            columns: ["adopted_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_stubs_adopted_tenant_id_fkey"
            columns: ["adopted_tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_stubs_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_stubs_hub_group_id_fkey"
            columns: ["hub_group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      event_surveys: {
        Row: {
          chef_id: string
          communication_rating: number | null
          created_at: string
          event_id: string
          food_quality_rating: number | null
          highlight_text: string | null
          id: string
          overall_rating: number | null
          submitted_at: string | null
          suggestions_text: string | null
          tenant_id: string
          testimonial_consent: boolean
          token: string
          value_rating: number | null
          would_book_again: string | null
        }
        Insert: {
          chef_id: string
          communication_rating?: number | null
          created_at?: string
          event_id: string
          food_quality_rating?: number | null
          highlight_text?: string | null
          id?: string
          overall_rating?: number | null
          submitted_at?: string | null
          suggestions_text?: string | null
          tenant_id: string
          testimonial_consent?: boolean
          token?: string
          value_rating?: number | null
          would_book_again?: string | null
        }
        Update: {
          chef_id?: string
          communication_rating?: number | null
          created_at?: string
          event_id?: string
          food_quality_rating?: number | null
          highlight_text?: string | null
          id?: string
          overall_rating?: number | null
          submitted_at?: string | null
          suggestions_text?: string | null
          tenant_id?: string
          testimonial_consent?: boolean
          token?: string
          value_rating?: number | null
          would_book_again?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_surveys_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_surveys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_temp_logs: {
        Row: {
          chef_id: string
          event_id: string
          id: string
          is_safe: boolean | null
          item_description: string
          logged_at: string
          notes: string | null
          phase: string
          temp_fahrenheit: number
        }
        Insert: {
          chef_id: string
          event_id: string
          id?: string
          is_safe?: boolean | null
          item_description: string
          logged_at?: string
          notes?: string | null
          phase?: string
          temp_fahrenheit: number
        }
        Update: {
          chef_id?: string
          event_id?: string
          id?: string
          is_safe?: boolean | null
          item_description?: string
          logged_at?: string
          notes?: string | null
          phase?: string
          temp_fahrenheit?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_temp_logs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_temp_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_temp_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_temp_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_temp_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_themes: {
        Row: {
          accent_color: string
          background_gradient: string | null
          category: string
          created_at: string
          description: string | null
          emoji: string | null
          font_display: string | null
          id: string
          is_active: boolean
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          sort_order: number
        }
        Insert: {
          accent_color: string
          background_gradient?: string | null
          category: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          font_display?: string | null
          id?: string
          is_active?: boolean
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          sort_order?: number
        }
        Update: {
          accent_color?: string
          background_gradient?: string | null
          category?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          font_display?: string | null
          id?: string
          is_active?: boolean
          name?: string
          primary_color?: string
          secondary_color?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      event_tips: {
        Row: {
          amount_cents: number
          created_at: string
          event_id: string
          id: string
          method: string
          notes: string | null
          received_at: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          event_id: string
          id?: string
          method?: string
          notes?: string | null
          received_at?: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          event_id?: string
          id?: string
          method?: string
          notes?: string | null
          received_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tips_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_tips_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_tips_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_tips_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_travel_legs: {
        Row: {
          chef_id: string
          completed_at: string | null
          created_at: string
          departure_time: string | null
          destination_address: string | null
          destination_label: string | null
          destination_type: string | null
          estimated_return_time: string | null
          id: string
          leg_date: string
          leg_type: string
          linked_event_ids: string[] | null
          origin_address: string | null
          origin_label: string | null
          origin_type: string | null
          primary_event_id: string | null
          purpose_notes: string | null
          status: string
          stops: Json
          tenant_id: string
          total_drive_minutes: number | null
          total_estimated_minutes: number | null
          total_stop_minutes: number | null
          updated_at: string
        }
        Insert: {
          chef_id: string
          completed_at?: string | null
          created_at?: string
          departure_time?: string | null
          destination_address?: string | null
          destination_label?: string | null
          destination_type?: string | null
          estimated_return_time?: string | null
          id?: string
          leg_date: string
          leg_type: string
          linked_event_ids?: string[] | null
          origin_address?: string | null
          origin_label?: string | null
          origin_type?: string | null
          primary_event_id?: string | null
          purpose_notes?: string | null
          status?: string
          stops?: Json
          tenant_id: string
          total_drive_minutes?: number | null
          total_estimated_minutes?: number | null
          total_stop_minutes?: number | null
          updated_at?: string
        }
        Update: {
          chef_id?: string
          completed_at?: string | null
          created_at?: string
          departure_time?: string | null
          destination_address?: string | null
          destination_label?: string | null
          destination_type?: string | null
          estimated_return_time?: string | null
          id?: string
          leg_date?: string
          leg_type?: string
          linked_event_ids?: string[] | null
          origin_address?: string | null
          origin_label?: string | null
          origin_type?: string | null
          primary_event_id?: string | null
          purpose_notes?: string | null
          status?: string
          stops?: Json
          tenant_id?: string
          total_drive_minutes?: number | null
          total_estimated_minutes?: number | null
          total_stop_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_travel_legs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_travel_legs_primary_event_id_fkey"
            columns: ["primary_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_travel_legs_primary_event_id_fkey"
            columns: ["primary_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_travel_legs_primary_event_id_fkey"
            columns: ["primary_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_travel_legs_primary_event_id_fkey"
            columns: ["primary_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          aar_filed: boolean
          access_instructions: string | null
          actual_menu_deviations: string | null
          alcohol_being_served: boolean | null
          allergies: string[]
          archived: boolean
          arrival_time: string | null
          backup_contact_id: string | null
          backup_plan_notes: string | null
          booking_source: string | null
          cancellation_initiated_by:
            | Database["public"]["Enums"]["cancellation_initiator"]
            | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cannabis_preference: boolean | null
          car_packed: boolean
          car_packed_at: string | null
          card_cashback_percent: number | null
          chef_outcome_notes: string | null
          chef_outcome_rating: number | null
          client_id: string
          client_journey_note: string | null
          client_reminder_14d_sent_at: string | null
          client_reminder_1d_sent_at: string | null
          client_reminder_2d_sent_at: string | null
          client_reminder_30d_sent_at: string | null
          client_reminder_7d_sent_at: string | null
          component_count_total: number | null
          converting_quote_id: string | null
          countdown_enabled: boolean | null
          course_count: number
          created_at: string
          created_by: string | null
          debrief_completed_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          departure_time: string | null
          deposit_amount_cents: number | null
          dietary_restrictions: string[]
          equipment_list_ready: boolean
          estimated_food_cost_cents: number | null
          event_date: string
          event_timezone: string | null
          execution_sheet_ready: boolean
          financial_closed: boolean
          financial_closed_at: string | null
          financially_closed: boolean
          follow_up_sent: boolean
          follow_up_sent_at: string | null
          food_cost_budget_cents: number | null
          google_calendar_event_id: string | null
          google_calendar_synced_at: string | null
          grocery_list_ready: boolean
          guest_code: string | null
          guest_count: number
          guest_count_confirmed: boolean
          household_id: string | null
          id: string
          inquiry_id: string | null
          inquiry_received_at: string | null
          invoice_issued_at: string | null
          invoice_number: string | null
          is_demo: boolean
          kitchen_notes: string | null
          leftover_notes: string | null
          leftover_value_carried_forward_cents: number | null
          leftover_value_received_cents: number | null
          location_address: string
          location_city: string
          location_lat: number | null
          location_lng: number | null
          location_notes: string | null
          location_state: string
          location_zip: string
          loyalty_points_awarded: boolean
          menu_approval_status: Database["public"]["Enums"]["menu_approval_status"]
          menu_approved_at: string | null
          menu_id: string | null
          menu_revision_notes: string | null
          menu_sent_at: string | null
          mileage_miles: number | null
          non_negotiables_checked: boolean
          occasion: string | null
          packing_list_ready: boolean
          parking_tolls_cents: number | null
          partner_location_id: string | null
          payment_card_used: string | null
          payment_method_primary:
            | Database["public"]["Enums"]["payment_method"]
            | null
          payment_reminder_1d_sent_at: string | null
          payment_reminder_3d_sent_at: string | null
          payment_reminder_7d_sent_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pre_event_checklist_confirmed_at: string | null
          pre_event_checklist_confirmed_by: string | null
          prep_completed_at: string | null
          prep_list_ready: boolean
          prep_started_at: string | null
          pricing_model: Database["public"]["Enums"]["pricing_model"] | null
          pricing_notes: string | null
          pricing_snapshot: Json | null
          quoted_price_cents: number | null
          referral_partner_id: string | null
          reset_complete: boolean
          reset_completed_at: string | null
          reset_started_at: string | null
          retainer_id: string | null
          retainer_period_id: string | null
          review_link_sent: boolean
          review_request_sent_at: string | null
          safety_checklist_complete: boolean | null
          scope_drift_acknowledged: boolean | null
          scope_drift_acknowledged_at: string | null
          serve_time: string
          service_completed_at: string | null
          service_started_at: string | null
          service_style: Database["public"]["Enums"]["event_service_style"]
          shopping_completed_at: string | null
          shopping_started_at: string | null
          site_notes: string | null
          special_requests: string | null
          split_billing: Json | null
          status: Database["public"]["Enums"]["event_status"]
          tenant_id: string
          time_prep_minutes: number | null
          time_reset_minutes: number | null
          time_service_minutes: number | null
          time_shopping_minutes: number | null
          time_travel_minutes: number | null
          timeline_ready: boolean
          tip_amount_cents: number
          travel_completed_at: string | null
          travel_route_ready: boolean
          travel_started_at: string | null
          travel_time_minutes: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aar_filed?: boolean
          access_instructions?: string | null
          actual_menu_deviations?: string | null
          alcohol_being_served?: boolean | null
          allergies?: string[]
          archived?: boolean
          arrival_time?: string | null
          backup_contact_id?: string | null
          backup_plan_notes?: string | null
          booking_source?: string | null
          cancellation_initiated_by?:
            | Database["public"]["Enums"]["cancellation_initiator"]
            | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cannabis_preference?: boolean | null
          car_packed?: boolean
          car_packed_at?: string | null
          card_cashback_percent?: number | null
          chef_outcome_notes?: string | null
          chef_outcome_rating?: number | null
          client_id: string
          client_journey_note?: string | null
          client_reminder_14d_sent_at?: string | null
          client_reminder_1d_sent_at?: string | null
          client_reminder_2d_sent_at?: string | null
          client_reminder_30d_sent_at?: string | null
          client_reminder_7d_sent_at?: string | null
          component_count_total?: number | null
          converting_quote_id?: string | null
          countdown_enabled?: boolean | null
          course_count?: number
          created_at?: string
          created_by?: string | null
          debrief_completed_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          departure_time?: string | null
          deposit_amount_cents?: number | null
          dietary_restrictions?: string[]
          equipment_list_ready?: boolean
          estimated_food_cost_cents?: number | null
          event_date: string
          event_timezone?: string | null
          execution_sheet_ready?: boolean
          financial_closed?: boolean
          financial_closed_at?: string | null
          financially_closed?: boolean
          follow_up_sent?: boolean
          follow_up_sent_at?: string | null
          food_cost_budget_cents?: number | null
          google_calendar_event_id?: string | null
          google_calendar_synced_at?: string | null
          grocery_list_ready?: boolean
          guest_code?: string | null
          guest_count: number
          guest_count_confirmed?: boolean
          household_id?: string | null
          id?: string
          inquiry_id?: string | null
          inquiry_received_at?: string | null
          invoice_issued_at?: string | null
          invoice_number?: string | null
          is_demo?: boolean
          kitchen_notes?: string | null
          leftover_notes?: string | null
          leftover_value_carried_forward_cents?: number | null
          leftover_value_received_cents?: number | null
          location_address: string
          location_city: string
          location_lat?: number | null
          location_lng?: number | null
          location_notes?: string | null
          location_state?: string
          location_zip: string
          loyalty_points_awarded?: boolean
          menu_approval_status?: Database["public"]["Enums"]["menu_approval_status"]
          menu_approved_at?: string | null
          menu_id?: string | null
          menu_revision_notes?: string | null
          menu_sent_at?: string | null
          mileage_miles?: number | null
          non_negotiables_checked?: boolean
          occasion?: string | null
          packing_list_ready?: boolean
          parking_tolls_cents?: number | null
          partner_location_id?: string | null
          payment_card_used?: string | null
          payment_method_primary?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          payment_reminder_1d_sent_at?: string | null
          payment_reminder_3d_sent_at?: string | null
          payment_reminder_7d_sent_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pre_event_checklist_confirmed_at?: string | null
          pre_event_checklist_confirmed_by?: string | null
          prep_completed_at?: string | null
          prep_list_ready?: boolean
          prep_started_at?: string | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          pricing_notes?: string | null
          pricing_snapshot?: Json | null
          quoted_price_cents?: number | null
          referral_partner_id?: string | null
          reset_complete?: boolean
          reset_completed_at?: string | null
          reset_started_at?: string | null
          retainer_id?: string | null
          retainer_period_id?: string | null
          review_link_sent?: boolean
          review_request_sent_at?: string | null
          safety_checklist_complete?: boolean | null
          scope_drift_acknowledged?: boolean | null
          scope_drift_acknowledged_at?: string | null
          serve_time: string
          service_completed_at?: string | null
          service_started_at?: string | null
          service_style?: Database["public"]["Enums"]["event_service_style"]
          shopping_completed_at?: string | null
          shopping_started_at?: string | null
          site_notes?: string | null
          special_requests?: string | null
          split_billing?: Json | null
          status?: Database["public"]["Enums"]["event_status"]
          tenant_id: string
          time_prep_minutes?: number | null
          time_reset_minutes?: number | null
          time_service_minutes?: number | null
          time_shopping_minutes?: number | null
          time_travel_minutes?: number | null
          timeline_ready?: boolean
          tip_amount_cents?: number
          travel_completed_at?: string | null
          travel_route_ready?: boolean
          travel_started_at?: string | null
          travel_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aar_filed?: boolean
          access_instructions?: string | null
          actual_menu_deviations?: string | null
          alcohol_being_served?: boolean | null
          allergies?: string[]
          archived?: boolean
          arrival_time?: string | null
          backup_contact_id?: string | null
          backup_plan_notes?: string | null
          booking_source?: string | null
          cancellation_initiated_by?:
            | Database["public"]["Enums"]["cancellation_initiator"]
            | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cannabis_preference?: boolean | null
          car_packed?: boolean
          car_packed_at?: string | null
          card_cashback_percent?: number | null
          chef_outcome_notes?: string | null
          chef_outcome_rating?: number | null
          client_id?: string
          client_journey_note?: string | null
          client_reminder_14d_sent_at?: string | null
          client_reminder_1d_sent_at?: string | null
          client_reminder_2d_sent_at?: string | null
          client_reminder_30d_sent_at?: string | null
          client_reminder_7d_sent_at?: string | null
          component_count_total?: number | null
          converting_quote_id?: string | null
          countdown_enabled?: boolean | null
          course_count?: number
          created_at?: string
          created_by?: string | null
          debrief_completed_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          departure_time?: string | null
          deposit_amount_cents?: number | null
          dietary_restrictions?: string[]
          equipment_list_ready?: boolean
          estimated_food_cost_cents?: number | null
          event_date?: string
          event_timezone?: string | null
          execution_sheet_ready?: boolean
          financial_closed?: boolean
          financial_closed_at?: string | null
          financially_closed?: boolean
          follow_up_sent?: boolean
          follow_up_sent_at?: string | null
          food_cost_budget_cents?: number | null
          google_calendar_event_id?: string | null
          google_calendar_synced_at?: string | null
          grocery_list_ready?: boolean
          guest_code?: string | null
          guest_count?: number
          guest_count_confirmed?: boolean
          household_id?: string | null
          id?: string
          inquiry_id?: string | null
          inquiry_received_at?: string | null
          invoice_issued_at?: string | null
          invoice_number?: string | null
          is_demo?: boolean
          kitchen_notes?: string | null
          leftover_notes?: string | null
          leftover_value_carried_forward_cents?: number | null
          leftover_value_received_cents?: number | null
          location_address?: string
          location_city?: string
          location_lat?: number | null
          location_lng?: number | null
          location_notes?: string | null
          location_state?: string
          location_zip?: string
          loyalty_points_awarded?: boolean
          menu_approval_status?: Database["public"]["Enums"]["menu_approval_status"]
          menu_approved_at?: string | null
          menu_id?: string | null
          menu_revision_notes?: string | null
          menu_sent_at?: string | null
          mileage_miles?: number | null
          non_negotiables_checked?: boolean
          occasion?: string | null
          packing_list_ready?: boolean
          parking_tolls_cents?: number | null
          partner_location_id?: string | null
          payment_card_used?: string | null
          payment_method_primary?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          payment_reminder_1d_sent_at?: string | null
          payment_reminder_3d_sent_at?: string | null
          payment_reminder_7d_sent_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pre_event_checklist_confirmed_at?: string | null
          pre_event_checklist_confirmed_by?: string | null
          prep_completed_at?: string | null
          prep_list_ready?: boolean
          prep_started_at?: string | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          pricing_notes?: string | null
          pricing_snapshot?: Json | null
          quoted_price_cents?: number | null
          referral_partner_id?: string | null
          reset_complete?: boolean
          reset_completed_at?: string | null
          reset_started_at?: string | null
          retainer_id?: string | null
          retainer_period_id?: string | null
          review_link_sent?: boolean
          review_request_sent_at?: string | null
          safety_checklist_complete?: boolean | null
          scope_drift_acknowledged?: boolean | null
          scope_drift_acknowledged_at?: string | null
          serve_time?: string
          service_completed_at?: string | null
          service_started_at?: string | null
          service_style?: Database["public"]["Enums"]["event_service_style"]
          shopping_completed_at?: string | null
          shopping_started_at?: string | null
          site_notes?: string | null
          special_requests?: string | null
          split_billing?: Json | null
          status?: Database["public"]["Enums"]["event_status"]
          tenant_id?: string
          time_prep_minutes?: number | null
          time_reset_minutes?: number | null
          time_service_minutes?: number | null
          time_shopping_minutes?: number | null
          time_travel_minutes?: number | null
          timeline_ready?: boolean
          tip_amount_cents?: number
          travel_completed_at?: string | null
          travel_route_ready?: boolean
          travel_started_at?: string | null
          travel_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_backup_contact_id_fkey"
            columns: ["backup_contact_id"]
            isOneToOne: false
            referencedRelation: "chef_backup_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_converting_quote_id_fkey"
            columns: ["converting_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "events_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_partner_location_id_fkey"
            columns: ["partner_location_id"]
            isOneToOne: false
            referencedRelation: "partner_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "retainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_retainer_period_id_fkey"
            columns: ["retainer_period_id"]
            isOneToOne: false
            referencedRelation: "retainer_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          card_cashback_percent: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string
          event_id: string | null
          expense_date: string
          id: string
          is_business: boolean
          is_reimbursable: boolean
          mileage_miles: number | null
          mileage_rate_per_mile_cents: number | null
          notes: string | null
          payment_card_used: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          qb_entity_id: string | null
          qb_synced_at: string | null
          receipt_photo_url: string | null
          receipt_uploaded: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
          vendor_name: string | null
        }
        Insert: {
          amount_cents: number
          card_cashback_percent?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description: string
          event_id?: string | null
          expense_date: string
          id?: string
          is_business?: boolean
          is_reimbursable?: boolean
          mileage_miles?: number | null
          mileage_rate_per_mile_cents?: number | null
          notes?: string | null
          payment_card_used?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          qb_entity_id?: string | null
          qb_synced_at?: string | null
          receipt_photo_url?: string | null
          receipt_uploaded?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount_cents?: number
          card_cashback_percent?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string | null
          expense_date?: string
          id?: string
          is_business?: boolean
          is_reimbursable?: boolean
          mileage_miles?: number | null
          mileage_rate_per_mile_cents?: number | null
          notes?: string | null
          payment_card_used?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          qb_entity_id?: string | null
          qb_synced_at?: string | null
          receipt_photo_url?: string | null
          receipt_uploaded?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      external_review_sources: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          created_by: string
          id: string
          label: string
          last_cursor: string | null
          last_error: string | null
          last_synced_at: string | null
          provider: string
          sync_interval_minutes: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          created_by: string
          id?: string
          label: string
          last_cursor?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          provider: string
          sync_interval_minutes?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          last_cursor?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          sync_interval_minutes?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_review_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      external_reviews: {
        Row: {
          author_name: string | null
          created_at: string
          first_seen_at: string
          id: string
          last_seen_at: string
          provider: string
          rating: number | null
          raw_payload: Json
          review_date: string | null
          review_text: string
          source_id: string
          source_review_id: string
          source_url: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          provider: string
          rating?: number | null
          raw_payload?: Json
          review_date?: string | null
          review_text: string
          source_id: string
          source_review_id: string
          source_url?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          provider?: string
          rating?: number | null
          raw_payload?: Json
          review_date?: string | null
          review_text?: string
          source_id?: string
          source_review_id?: string
          source_url?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_reviews_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_review_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_chefs: {
        Row: {
          chef_id: string
          chef_name: string
          created_at: string
          id: string
          image_url: string | null
          reason: string | null
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          chef_id: string
          chef_name: string
          created_at?: string
          id?: string
          image_url?: string | null
          reason?: string | null
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          chef_id?: string
          chef_name?: string
          created_at?: string
          id?: string
          image_url?: string | null
          reason?: string | null
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_chefs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      fine_tuning_examples: {
        Row: {
          created_at: string
          id: string
          input_text: string
          module: string
          output_json: Json
          quality_score: number
          source: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_text: string
          module: string
          output_json: Json
          quality_score: number
          source: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_text?: string
          module?: string
          output_json?: Json
          quality_score?: number
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fine_tuning_examples_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_timers: {
        Row: {
          completed_at: string | null
          created_at: string
          dismissed_at: string | null
          due_at: string
          id: string
          reason: string
          status: Database["public"]["Enums"]["follow_up_timer_status"]
          tenant_id: string
          thread_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          due_at: string
          id?: string
          reason: string
          status?: Database["public"]["Enums"]["follow_up_timer_status"]
          tenant_id: string
          thread_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          due_at?: string
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["follow_up_timer_status"]
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_timers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_timers_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_inbox_items"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "follow_up_timers_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_rules: {
        Row: {
          chef_id: string
          created_at: string
          delay_days: number
          id: string
          is_active: boolean
          template_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          delay_days?: number
          id?: string
          is_active?: boolean
          template_id?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          delay_days?: number
          id?: string
          is_active?: boolean
          template_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_rules_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      front_of_house_menus: {
        Row: {
          context: Json
          created_at: string
          event_id: string | null
          event_type: string
          generated_at: string
          generated_by: string | null
          id: string
          menu_id: string
          rendered_html: string
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          event_id?: string | null
          event_type?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          menu_id: string
          rendered_html: string
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          event_id?: string | null
          event_type?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          menu_id?: string
          rendered_html?: string
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "front_of_house_menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "front_of_house_menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "front_of_house_menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "front_of_house_menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_of_house_menus_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "front_of_house_menus_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_of_house_menus_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "menu_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_of_house_menus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_purchase_intents: {
        Row: {
          amount_cents: number
          buyer_email: string
          buyer_user_id: string | null
          created_at: string
          created_incentive_id: string | null
          currency_code: string
          expires_at: string
          id: string
          personal_message: string | null
          recipient_email: string
          recipient_name: string | null
          status: string
          stripe_checkout_session_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          buyer_email: string
          buyer_user_id?: string | null
          created_at?: string
          created_incentive_id?: string | null
          currency_code?: string
          expires_at?: string
          id?: string
          personal_message?: string | null
          recipient_email: string
          recipient_name?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string
          buyer_user_id?: string | null
          created_at?: string
          created_incentive_id?: string | null
          currency_code?: string
          expires_at?: string
          id?: string
          personal_message?: string | null
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_purchase_intents_created_incentive_id_fkey"
            columns: ["created_incentive_id"]
            isOneToOne: false
            referencedRelation: "client_incentives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_purchase_intents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_historical_findings: {
        Row: {
          ai_reasoning: string | null
          body_preview: string | null
          chef_id: string
          classification: string
          confidence: string
          created_at: string
          from_address: string
          gmail_message_id: string
          gmail_thread_id: string | null
          id: string
          imported_inquiry_id: string | null
          received_at: string | null
          reviewed_at: string | null
          status: string
          subject: string | null
          tenant_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          body_preview?: string | null
          chef_id: string
          classification: string
          confidence: string
          created_at?: string
          from_address: string
          gmail_message_id: string
          gmail_thread_id?: string | null
          id?: string
          imported_inquiry_id?: string | null
          received_at?: string | null
          reviewed_at?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
        }
        Update: {
          ai_reasoning?: string | null
          body_preview?: string | null
          chef_id?: string
          classification?: string
          confidence?: string
          created_at?: string
          from_address?: string
          gmail_message_id?: string
          gmail_thread_id?: string | null
          id?: string
          imported_inquiry_id?: string | null
          received_at?: string | null
          reviewed_at?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_historical_findings_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_historical_findings_imported_inquiry_id_fkey"
            columns: ["imported_inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_historical_findings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_sync_log: {
        Row: {
          action_taken: string | null
          body_preview: string | null
          classification: string
          confidence: string
          error: string | null
          from_address: string | null
          gmail_message_id: string
          gmail_thread_id: string | null
          id: string
          inquiry_id: string | null
          message_id: string | null
          platform_email_type: string | null
          received_at: string | null
          snippet: string | null
          subject: string | null
          synced_at: string
          tenant_id: string
          to_address: string | null
        }
        Insert: {
          action_taken?: string | null
          body_preview?: string | null
          classification: string
          confidence: string
          error?: string | null
          from_address?: string | null
          gmail_message_id: string
          gmail_thread_id?: string | null
          id?: string
          inquiry_id?: string | null
          message_id?: string | null
          platform_email_type?: string | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          synced_at?: string
          tenant_id: string
          to_address?: string | null
        }
        Update: {
          action_taken?: string | null
          body_preview?: string | null
          classification?: string
          confidence?: string
          error?: string | null
          from_address?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string | null
          id?: string
          inquiry_id?: string | null
          message_id?: string | null
          platform_email_type?: string | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          synced_at?: string
          tenant_id?: string
          to_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmail_sync_log_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_sync_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_sync_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_check_ins: {
        Row: {
          goal_id: string
          id: string
          logged_at: string
          logged_value: number
          notes: string | null
          tenant_id: string
        }
        Insert: {
          goal_id: string
          id?: string
          logged_at?: string
          logged_value: number
          notes?: string | null
          tenant_id: string
        }
        Update: {
          goal_id?: string
          id?: string
          logged_at?: string
          logged_value?: number
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_check_ins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "chef_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_check_ins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_client_suggestions: {
        Row: {
          avg_spend_cents: number | null
          booked_event_id: string | null
          client_id: string
          contacted_at: string | null
          created_at: string
          days_dormant: number | null
          goal_id: string
          id: string
          lifetime_value_cents: number | null
          rank: number
          reason: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avg_spend_cents?: number | null
          booked_event_id?: string | null
          client_id: string
          contacted_at?: string | null
          created_at?: string
          days_dormant?: number | null
          goal_id: string
          id?: string
          lifetime_value_cents?: number | null
          rank?: number
          reason: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avg_spend_cents?: number | null
          booked_event_id?: string | null
          client_id?: string
          contacted_at?: string | null
          created_at?: string
          days_dormant?: number | null
          goal_id?: string
          id?: string
          lifetime_value_cents?: number | null
          rank?: number
          reason?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_client_suggestions_booked_event_id_fkey"
            columns: ["booked_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "goal_client_suggestions_booked_event_id_fkey"
            columns: ["booked_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "goal_client_suggestions_booked_event_id_fkey"
            columns: ["booked_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "goal_client_suggestions_booked_event_id_fkey"
            columns: ["booked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_client_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "goal_client_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_client_suggestions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "chef_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_client_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_snapshots: {
        Row: {
          avg_booking_value_cents: number | null
          client_suggestions_json: Json
          computed_at: string
          current_value: number
          events_needed: number | null
          gap_value: number
          goal_id: string
          id: string
          pricing_scenarios: Json
          progress_percent: number
          projected_cents: number | null
          realized_cents: number | null
          snapshot_date: string
          snapshot_month: string
          target_value: number
          tenant_id: string
        }
        Insert: {
          avg_booking_value_cents?: number | null
          client_suggestions_json?: Json
          computed_at?: string
          current_value?: number
          events_needed?: number | null
          gap_value?: number
          goal_id: string
          id?: string
          pricing_scenarios?: Json
          progress_percent?: number
          projected_cents?: number | null
          realized_cents?: number | null
          snapshot_date: string
          snapshot_month: string
          target_value: number
          tenant_id: string
        }
        Update: {
          avg_booking_value_cents?: number | null
          client_suggestions_json?: Json
          computed_at?: string
          current_value?: number
          events_needed?: number | null
          gap_value?: number
          goal_id?: string
          id?: string
          pricing_scenarios?: Json
          progress_percent?: number
          projected_cents?: number | null
          realized_cents?: number | null
          snapshot_date?: string
          snapshot_month?: string
          target_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_snapshots_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "chef_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      google_connections: {
        Row: {
          access_token: string | null
          calendar_connected: boolean
          chef_id: string
          connected_email: string | null
          created_at: string
          gmail_connected: boolean
          gmail_history_id: string | null
          gmail_last_sync_at: string | null
          gmail_sync_errors: number
          historical_scan_completed_at: string | null
          historical_scan_enabled: boolean
          historical_scan_last_run_at: string | null
          historical_scan_lookback_days: number
          historical_scan_page_token: string | null
          historical_scan_started_at: string | null
          historical_scan_status: string
          historical_scan_total_processed: number
          id: string
          refresh_token: string | null
          scopes: string[]
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_connected?: boolean
          chef_id: string
          connected_email?: string | null
          created_at?: string
          gmail_connected?: boolean
          gmail_history_id?: string | null
          gmail_last_sync_at?: string | null
          gmail_sync_errors?: number
          historical_scan_completed_at?: string | null
          historical_scan_enabled?: boolean
          historical_scan_last_run_at?: string | null
          historical_scan_lookback_days?: number
          historical_scan_page_token?: string | null
          historical_scan_started_at?: string | null
          historical_scan_status?: string
          historical_scan_total_processed?: number
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_connected?: boolean
          chef_id?: string
          connected_email?: string | null
          created_at?: string
          gmail_connected?: boolean
          gmail_history_id?: string | null
          gmail_last_sync_at?: string | null
          gmail_sync_errors?: number
          historical_scan_completed_at?: string | null
          historical_scan_enabled?: boolean
          historical_scan_last_run_at?: string | null
          historical_scan_lookback_days?: number
          historical_scan_page_token?: string | null
          historical_scan_started_at?: string | null
          historical_scan_status?: string
          historical_scan_total_processed?: number
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_connections_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_price_quote_items: {
        Row: {
          average_price_cents: number | null
          id: string
          ingredient_id: string | null
          ingredient_name: string
          is_manual_override: boolean
          kroger_price_cents: number | null
          manual_price_cents: number | null
          mealme_price_cents: number | null
          quantity: number | null
          quote_id: string
          source_label: string | null
          spoonacular_price_cents: number | null
          unit: string | null
        }
        Insert: {
          average_price_cents?: number | null
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          is_manual_override?: boolean
          kroger_price_cents?: number | null
          manual_price_cents?: number | null
          mealme_price_cents?: number | null
          quantity?: number | null
          quote_id: string
          source_label?: string | null
          spoonacular_price_cents?: number | null
          unit?: string | null
        }
        Update: {
          average_price_cents?: number | null
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          is_manual_override?: boolean
          kroger_price_cents?: number | null
          manual_price_cents?: number | null
          mealme_price_cents?: number | null
          quantity?: number | null
          quote_id?: string
          source_label?: string | null
          spoonacular_price_cents?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_price_quote_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "grocery_price_quote_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "grocery_price_quote_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_price_quote_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "grocery_price_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "grocery_price_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_price_quotes: {
        Row: {
          accuracy_delta_pct: number | null
          actual_cost_logged_at: string | null
          actual_grocery_cost_cents: number | null
          average_total_cents: number | null
          created_at: string
          event_id: string
          id: string
          ingredient_count: number | null
          instacart_link: string | null
          kroger_total_cents: number | null
          mealme_total_cents: number | null
          spoonacular_total_cents: number | null
          status: string
          tenant_id: string
        }
        Insert: {
          accuracy_delta_pct?: number | null
          actual_cost_logged_at?: string | null
          actual_grocery_cost_cents?: number | null
          average_total_cents?: number | null
          created_at?: string
          event_id: string
          id?: string
          ingredient_count?: number | null
          instacart_link?: string | null
          kroger_total_cents?: number | null
          mealme_total_cents?: number | null
          spoonacular_total_cents?: number | null
          status?: string
          tenant_id: string
        }
        Update: {
          accuracy_delta_pct?: number | null
          actual_cost_logged_at?: string | null
          actual_grocery_cost_cents?: number | null
          average_total_cents?: number | null
          created_at?: string
          event_id?: string
          id?: string
          ingredient_count?: number | null
          instacart_link?: string | null
          kroger_total_cents?: number | null
          mealme_total_cents?: number | null
          spoonacular_total_cents?: number | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_price_quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "grocery_price_quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "grocery_price_quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "grocery_price_quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_price_quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_communication_logs: {
        Row: {
          body: string
          created_at: string
          created_by_auth_user: string | null
          event_id: string
          id: string
          recipient_count: number
          segment: string
          subject: string
          tenant_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by_auth_user?: string | null
          event_id: string
          id?: string
          recipient_count?: number
          segment: string
          subject: string
          tenant_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by_auth_user?: string | null
          event_id?: string
          id?: string
          recipient_count?: number
          segment?: string
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_communication_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_communication_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_communication_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_communication_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_communication_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_comps: {
        Row: {
          chef_id: string
          created_at: string
          created_by: string | null
          description: string
          guest_id: string
          id: string
          redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          created_by?: string | null
          description: string
          guest_id: string
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          guest_id?: string
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_comps_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_comps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_comps_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_comps_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_event_profile: {
        Row: {
          accessibility_notes: string | null
          additional_note: string | null
          age_confirmed: boolean
          alcohol_acknowledgment: boolean
          attending_status: Database["public"]["Enums"]["guest_attending_status"]
          cannabis_participation: Database["public"]["Enums"]["guest_cannabis_participation"]
          comfort_notes: string | null
          consumption_style:
            | Database["public"]["Enums"]["guest_consumption_style"][]
            | null
          created_at: string
          dietary_notes: string | null
          discuss_in_person_flag: boolean
          edible_familiarity:
            | Database["public"]["Enums"]["guest_edible_familiarity"]
            | null
          event_id: string
          familiarity_level:
            | Database["public"]["Enums"]["guest_familiarity_level"]
            | null
          final_confirmation: boolean
          guest_token: string
          id: string
          menu_preference_note: string | null
          preferred_dose_note: string | null
          transportation_acknowledgment: boolean
          updated_at: string
          voluntary_acknowledgment: boolean
        }
        Insert: {
          accessibility_notes?: string | null
          additional_note?: string | null
          age_confirmed?: boolean
          alcohol_acknowledgment?: boolean
          attending_status?: Database["public"]["Enums"]["guest_attending_status"]
          cannabis_participation?: Database["public"]["Enums"]["guest_cannabis_participation"]
          comfort_notes?: string | null
          consumption_style?:
            | Database["public"]["Enums"]["guest_consumption_style"][]
            | null
          created_at?: string
          dietary_notes?: string | null
          discuss_in_person_flag?: boolean
          edible_familiarity?:
            | Database["public"]["Enums"]["guest_edible_familiarity"]
            | null
          event_id: string
          familiarity_level?:
            | Database["public"]["Enums"]["guest_familiarity_level"]
            | null
          final_confirmation?: boolean
          guest_token: string
          id?: string
          menu_preference_note?: string | null
          preferred_dose_note?: string | null
          transportation_acknowledgment?: boolean
          updated_at?: string
          voluntary_acknowledgment?: boolean
        }
        Update: {
          accessibility_notes?: string | null
          additional_note?: string | null
          age_confirmed?: boolean
          alcohol_acknowledgment?: boolean
          attending_status?: Database["public"]["Enums"]["guest_attending_status"]
          cannabis_participation?: Database["public"]["Enums"]["guest_cannabis_participation"]
          comfort_notes?: string | null
          consumption_style?:
            | Database["public"]["Enums"]["guest_consumption_style"][]
            | null
          created_at?: string
          dietary_notes?: string | null
          discuss_in_person_flag?: boolean
          edible_familiarity?:
            | Database["public"]["Enums"]["guest_edible_familiarity"]
            | null
          event_id?: string
          familiarity_level?:
            | Database["public"]["Enums"]["guest_familiarity_level"]
            | null
          final_confirmation?: boolean
          guest_token?: string
          id?: string
          menu_preference_note?: string | null
          preferred_dose_note?: string | null
          transportation_acknowledgment?: boolean
          updated_at?: string
          voluntary_acknowledgment?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guest_event_profile_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_event_profile_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_event_profile_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_event_profile_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_leads: {
        Row: {
          converted_client_id: string | null
          created_at: string
          email: string
          event_id: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          source: string | null
          source_event_share_id: string | null
          source_invite_token: string | null
          source_join_request_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          converted_client_id?: string | null
          created_at?: string
          email: string
          event_id?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          source?: string | null
          source_event_share_id?: string | null
          source_invite_token?: string | null
          source_join_request_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          converted_client_id?: string | null
          created_at?: string
          email?: string
          event_id?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string | null
          source_event_share_id?: string | null
          source_invite_token?: string | null
          source_join_request_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "guest_leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_leads_source_event_share_id_fkey"
            columns: ["source_event_share_id"]
            isOneToOne: false
            referencedRelation: "event_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_leads_source_join_request_id_fkey"
            columns: ["source_join_request_id"]
            isOneToOne: false
            referencedRelation: "event_join_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_messages: {
        Row: {
          created_at: string
          emoji: string | null
          event_id: string
          guest_id: string | null
          guest_name: string
          id: string
          is_pinned: boolean
          is_visible: boolean
          message: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          event_id: string
          guest_id?: string | null
          guest_name: string
          id?: string
          is_pinned?: boolean
          is_visible?: boolean
          message: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          event_id?: string
          guest_id?: string | null
          guest_name?: string
          id?: string
          is_pinned?: boolean
          is_visible?: boolean
          message?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_messages_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_photos: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          guest_id: string | null
          guest_name: string
          id: string
          is_visible: boolean
          storage_path: string
          tenant_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          guest_id?: string | null
          guest_name: string
          id?: string
          is_visible?: boolean
          storage_path: string
          tenant_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          guest_id?: string | null
          guest_name?: string
          id?: string
          is_visible?: boolean
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_photos_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_reservations: {
        Row: {
          chef_id: string
          created_at: string
          guest_id: string
          id: string
          notes: string | null
          party_size: number | null
          reservation_date: string
          reservation_time: string | null
          status: Database["public"]["Enums"]["guest_reservation_status"]
          table_number: string | null
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          guest_id: string
          id?: string
          notes?: string | null
          party_size?: number | null
          reservation_date: string
          reservation_time?: string | null
          status?: Database["public"]["Enums"]["guest_reservation_status"]
          table_number?: string | null
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          guest_id?: string
          id?: string
          notes?: string | null
          party_size?: number | null
          reservation_date?: string
          reservation_time?: string | null
          status?: Database["public"]["Enums"]["guest_reservation_status"]
          table_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_reservations_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_tags: {
        Row: {
          chef_id: string
          color: string | null
          created_at: string
          guest_id: string
          id: string
          tag: string
        }
        Insert: {
          chef_id: string
          color?: string | null
          created_at?: string
          guest_id: string
          id?: string
          tag: string
        }
        Update: {
          chef_id?: string
          color?: string | null
          created_at?: string
          guest_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_tags_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_tags_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_testimonials: {
        Row: {
          chef_rating: number | null
          created_at: string
          event_id: string
          food_highlight: string | null
          food_rating: number | null
          guest_id: string | null
          guest_name: string
          id: string
          is_approved: boolean
          is_featured: boolean
          rating: number | null
          tenant_id: string
          testimonial: string
          would_recommend: boolean | null
        }
        Insert: {
          chef_rating?: number | null
          created_at?: string
          event_id: string
          food_highlight?: string | null
          food_rating?: number | null
          guest_id?: string | null
          guest_name: string
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          rating?: number | null
          tenant_id: string
          testimonial: string
          would_recommend?: boolean | null
        }
        Update: {
          chef_rating?: number | null
          created_at?: string
          event_id?: string
          food_highlight?: string | null
          food_rating?: number | null
          guest_id?: string | null
          guest_name?: string
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          rating?: number | null
          tenant_id?: string
          testimonial?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_testimonials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_testimonials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_testimonials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guest_testimonials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_testimonials_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_testimonials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_visits: {
        Row: {
          chef_id: string
          created_at: string
          guest_id: string
          id: string
          notes: string | null
          party_size: number | null
          server_id: string | null
          spend_cents: number | null
          visit_date: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          guest_id: string
          id?: string
          notes?: string | null
          party_size?: number | null
          server_id?: string | null
          spend_cents?: number | null
          visit_date: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          guest_id?: string
          id?: string
          notes?: string | null
          party_size?: number | null
          server_id?: string | null
          spend_cents?: number | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_visits_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_visits_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_visits_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          chef_id: string
          created_at: string
          email: string | null
          first_visit_date: string | null
          id: string
          last_visit_date: string | null
          name: string
          notes: string | null
          phone: string | null
          total_spend_cents: number
          total_visits: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          email?: string | null
          first_visit_date?: string | null
          id?: string
          last_visit_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          total_spend_cents?: number
          total_visits?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          email?: string | null
          first_visit_date?: string | null
          id?: string
          last_visit_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          total_spend_cents?: number
          total_visits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_plans: {
        Row: {
          archetype: string
          chef_id: string
          created_at: string
          id: string
          last_reviewed_at: string | null
          plan_data: Json
          updated_at: string
        }
        Insert: {
          archetype: string
          chef_id: string
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          plan_data?: Json
          updated_at?: string
        }
        Update: {
          archetype?: string
          chef_id?: string
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          plan_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haccp_plans_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      health_insurance_premiums: {
        Row: {
          annual_premium_cents: number
          chef_id: string
          created_at: string
          id: string
          notes: string | null
          premium_type: string
          tax_year: number
          updated_at: string
        }
        Insert: {
          annual_premium_cents: number
          chef_id: string
          created_at?: string
          id?: string
          notes?: string | null
          premium_type?: string
          tax_year: number
          updated_at?: string
        }
        Update: {
          annual_premium_cents?: number
          chef_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          premium_type?: string
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_insurance_premiums_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          client_id: string
          household_id: string
          id: string
          joined_at: string
          relationship: Database["public"]["Enums"]["household_relationship"]
        }
        Insert: {
          client_id: string
          household_id: string
          id?: string
          joined_at?: string
          relationship: Database["public"]["Enums"]["household_relationship"]
        }
        Update: {
          client_id?: string
          household_id?: string
          id?: string
          joined_at?: string
          relationship?: Database["public"]["Enums"]["household_relationship"]
        }
        Relationships: [
          {
            foreignKeyName: "household_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "household_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          primary_client_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          primary_client_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          primary_client_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "households_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_availability: {
        Row: {
          created_at: string
          created_by_profile_id: string
          date_range_end: string
          date_range_start: string
          description: string | null
          group_id: string
          id: string
          is_closed: boolean
          title: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id: string
          date_range_end: string
          date_range_start: string
          description?: string | null
          group_id: string
          id?: string
          is_closed?: boolean
          title?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string
          date_range_end?: string
          date_range_start?: string
          description?: string | null
          group_id?: string
          id?: string
          is_closed?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_availability_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_availability_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_availability_responses: {
        Row: {
          availability_id: string
          created_at: string
          id: string
          profile_id: string
          response_date: string
          status: string
        }
        Insert: {
          availability_id: string
          created_at?: string
          id?: string
          profile_id: string
          response_date: string
          status?: string
        }
        Update: {
          availability_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          response_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_availability_responses_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "hub_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_availability_responses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_chef_recommendations: {
        Row: {
          chef_business_name: string
          chef_id: string
          chef_slug: string | null
          created_at: string
          from_profile_id: string
          id: string
          message: string | null
          to_profile_id: string
        }
        Insert: {
          chef_business_name: string
          chef_id: string
          chef_slug?: string | null
          created_at?: string
          from_profile_id: string
          id?: string
          message?: string | null
          to_profile_id: string
        }
        Update: {
          chef_business_name?: string
          chef_id?: string
          chef_slug?: string | null
          created_at?: string
          from_profile_id?: string
          id?: string
          message?: string | null
          to_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_chef_recommendations_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_chef_recommendations_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_chef_recommendations_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_group_events: {
        Row: {
          added_at: string
          event_id: string
          group_id: string
          id: string
        }
        Insert: {
          added_at?: string
          event_id: string
          group_id: string
          id?: string
        }
        Update: {
          added_at?: string
          event_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_group_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_group_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_group_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_group_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_group_members: {
        Row: {
          can_invite: boolean
          can_pin: boolean
          can_post: boolean
          group_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          notifications_muted: boolean
          profile_id: string
          role: string
        }
        Insert: {
          can_invite?: boolean
          can_pin?: boolean
          can_post?: boolean
          group_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_muted?: boolean
          profile_id: string
          role?: string
        }
        Update: {
          can_invite?: boolean
          can_pin?: boolean
          can_post?: boolean
          group_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_muted?: boolean
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_groups: {
        Row: {
          allow_anonymous_posts: boolean
          allow_member_invites: boolean
          cover_image_url: string | null
          created_at: string
          created_by_profile_id: string
          description: string | null
          emoji: string | null
          event_id: string | null
          event_stub_id: string | null
          group_token: string
          id: string
          is_active: boolean
          last_message_at: string | null
          last_message_preview: string | null
          message_count: number
          name: string
          tenant_id: string | null
          theme_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          allow_anonymous_posts?: boolean
          allow_member_invites?: boolean
          cover_image_url?: string | null
          created_at?: string
          created_by_profile_id: string
          description?: string | null
          emoji?: string | null
          event_id?: string | null
          event_stub_id?: string | null
          group_token?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number
          name: string
          tenant_id?: string | null
          theme_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          allow_anonymous_posts?: boolean
          allow_member_invites?: boolean
          cover_image_url?: string | null
          created_at?: string
          created_by_profile_id?: string
          description?: string | null
          emoji?: string | null
          event_id?: string | null
          event_stub_id?: string | null
          group_token?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number
          name?: string
          tenant_id?: string | null
          theme_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_groups_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_groups_event_stub_id_fkey"
            columns: ["event_stub_id"]
            isOneToOne: false
            referencedRelation: "event_stubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_groups_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "event_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_guest_event_history: {
        Row: {
          chef_name: string | null
          courses_served: Json | null
          created_at: string
          event_date: string | null
          event_guest_id: string | null
          event_id: string
          id: string
          occasion: string | null
          profile_id: string
          rsvp_status: string | null
          tenant_id: string
        }
        Insert: {
          chef_name?: string | null
          courses_served?: Json | null
          created_at?: string
          event_date?: string | null
          event_guest_id?: string | null
          event_id: string
          id?: string
          occasion?: string | null
          profile_id: string
          rsvp_status?: string | null
          tenant_id: string
        }
        Update: {
          chef_name?: string | null
          courses_served?: Json | null
          created_at?: string
          event_date?: string | null
          event_guest_id?: string | null
          event_id?: string
          id?: string
          occasion?: string | null
          profile_id?: string
          rsvp_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_guest_event_history_event_guest_id_fkey"
            columns: ["event_guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_guest_event_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_guest_event_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_guest_event_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_guest_event_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_guest_event_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_guest_event_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_guest_friends: {
        Row: {
          accepted_at: string | null
          addressee_id: string
          created_at: string
          declined_at: string | null
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          addressee_id: string
          created_at?: string
          declined_at?: string | null
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          addressee_id?: string
          created_at?: string
          declined_at?: string | null
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_guest_friends_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_guest_friends_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_guest_profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          bio: string | null
          client_id: string | null
          created_at: string
          display_name: string
          email: string | null
          email_normalized: string | null
          id: string
          known_allergies: string[] | null
          known_dietary: string[] | null
          notifications_enabled: boolean
          profile_token: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          client_id?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          known_allergies?: string[] | null
          known_dietary?: string[] | null
          notifications_enabled?: boolean
          profile_token?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          client_id?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          known_allergies?: string[] | null
          known_dietary?: string[] | null
          notifications_enabled?: boolean
          profile_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_guest_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "hub_guest_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_media: {
        Row: {
          caption: string | null
          content_type: string | null
          created_at: string
          event_id: string | null
          filename: string | null
          group_id: string
          id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by_profile_id: string
        }
        Insert: {
          caption?: string | null
          content_type?: string | null
          created_at?: string
          event_id?: string | null
          filename?: string | null
          group_id: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by_profile_id: string
        }
        Update: {
          caption?: string | null
          content_type?: string | null
          created_at?: string
          event_id?: string | null
          filename?: string | null
          group_id?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "hub_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_media_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_media_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "hub_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_messages: {
        Row: {
          author_profile_id: string
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          group_id: string
          id: string
          is_anonymous: boolean
          is_pinned: boolean
          media_captions: string[] | null
          media_urls: string[] | null
          message_type: string
          pinned_at: string | null
          pinned_by_profile_id: string | null
          reaction_counts: Json | null
          reply_to_message_id: string | null
          system_event_type: string | null
          system_metadata: Json | null
        }
        Insert: {
          author_profile_id: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          group_id: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          media_captions?: string[] | null
          media_urls?: string[] | null
          message_type?: string
          pinned_at?: string | null
          pinned_by_profile_id?: string | null
          reaction_counts?: Json | null
          reply_to_message_id?: string | null
          system_event_type?: string | null
          system_metadata?: Json | null
        }
        Update: {
          author_profile_id?: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          group_id?: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          media_captions?: string[] | null
          media_urls?: string[] | null
          message_type?: string
          pinned_at?: string | null
          pinned_by_profile_id?: string | null
          reaction_counts?: Json | null
          reply_to_message_id?: string | null
          system_event_type?: string | null
          system_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_messages_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_messages_pinned_by_profile_id_fkey"
            columns: ["pinned_by_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "hub_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_pinned_notes: {
        Row: {
          author_profile_id: string
          body: string
          color: string
          created_at: string
          group_id: string
          id: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          author_profile_id: string
          body: string
          color?: string
          created_at?: string
          group_id: string
          id?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_profile_id?: string
          body?: string
          color?: string
          created_at?: string
          group_id?: string
          id?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_pinned_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_pinned_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_poll_options: {
        Row: {
          id: string
          label: string
          metadata: Json | null
          poll_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          label: string
          metadata?: Json | null
          poll_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          metadata?: Json | null
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "hub_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "hub_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "hub_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "hub_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_poll_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_polls: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by_profile_id: string
          group_id: string
          id: string
          is_closed: boolean
          message_id: string | null
          poll_type: string
          question: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by_profile_id: string
          group_id: string
          id?: string
          is_closed?: boolean
          message_id?: string | null
          poll_type?: string
          question: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by_profile_id?: string
          group_id?: string
          id?: string
          is_closed?: boolean
          message_id?: string | null
          poll_type?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_polls_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "hub_guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hub_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "hub_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_deliveries: {
        Row: {
          delivery_channel: Database["public"]["Enums"]["incentive_delivery_channel"]
          id: string
          incentive_id: string
          message: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string
          sent_by_user_id: string
          tenant_id: string
        }
        Insert: {
          delivery_channel?: Database["public"]["Enums"]["incentive_delivery_channel"]
          id?: string
          incentive_id: string
          message?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string
          sent_by_user_id: string
          tenant_id: string
        }
        Update: {
          delivery_channel?: Database["public"]["Enums"]["incentive_delivery_channel"]
          id?: string
          incentive_id?: string
          message?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string
          sent_by_user_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_deliveries_incentive_id_fkey"
            columns: ["incentive_id"]
            isOneToOne: false
            referencedRelation: "client_incentives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_redemptions: {
        Row: {
          applied_amount_cents: number
          applied_discount_percent: number | null
          balance_after_cents: number | null
          balance_before_cents: number | null
          client_id: string
          code: string
          created_at: string
          event_id: string
          id: string
          incentive_id: string
          ledger_entry_id: string | null
          redeemed_at: string
          redeemed_by_user_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          applied_amount_cents: number
          applied_discount_percent?: number | null
          balance_after_cents?: number | null
          balance_before_cents?: number | null
          client_id: string
          code: string
          created_at?: string
          event_id: string
          id?: string
          incentive_id: string
          ledger_entry_id?: string | null
          redeemed_at?: string
          redeemed_by_user_id?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          applied_amount_cents?: number
          applied_discount_percent?: number | null
          balance_after_cents?: number | null
          balance_before_cents?: number | null
          client_id?: string
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          incentive_id?: string
          ledger_entry_id?: string | null
          redeemed_at?: string
          redeemed_by_user_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "incentive_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "incentive_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "incentive_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "incentive_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_redemptions_incentive_id_fkey"
            columns: ["incentive_id"]
            isOneToOne: false
            referencedRelation: "client_incentives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_redemptions_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_price_history: {
        Row: {
          created_at: string
          expense_id: string | null
          id: string
          ingredient_id: string
          price_cents: number
          price_per_unit_cents: number | null
          purchase_date: string
          quantity: number
          store_name: string | null
          tenant_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          expense_id?: string | null
          id?: string
          ingredient_id: string
          price_cents: number
          price_per_unit_cents?: number | null
          purchase_date?: string
          quantity?: number
          store_name?: string | null
          tenant_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          expense_id?: string | null
          id?: string
          ingredient_id?: string
          price_cents?: number
          price_per_unit_cents?: number | null
          purchase_date?: string
          quantity?: number
          store_name?: string | null
          tenant_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_price_history_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "ingredient_price_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          allergen_flags: string[]
          archived: boolean
          archived_at: string | null
          average_price_cents: number | null
          category: Database["public"]["Enums"]["ingredient_category"]
          created_at: string
          created_by: string | null
          default_unit: string
          description: string | null
          dietary_tags: string[]
          id: string
          is_staple: boolean
          last_price_cents: number | null
          last_price_date: string | null
          last_purchased_at: string | null
          name: string
          nutrition_calories_per_100g: number | null
          nutrition_carbs_per_100g: number | null
          nutrition_fat_per_100g: number | null
          nutrition_fiber_per_100g: number | null
          nutrition_protein_per_100g: number | null
          nutrition_sodium_mg_per_100g: number | null
          nutrition_source: string | null
          nutrition_updated_at: string | null
          preferred_vendor: string | null
          price_unit: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          vendor_notes: string | null
        }
        Insert: {
          allergen_flags?: string[]
          archived?: boolean
          archived_at?: string | null
          average_price_cents?: number | null
          category: Database["public"]["Enums"]["ingredient_category"]
          created_at?: string
          created_by?: string | null
          default_unit: string
          description?: string | null
          dietary_tags?: string[]
          id?: string
          is_staple?: boolean
          last_price_cents?: number | null
          last_price_date?: string | null
          last_purchased_at?: string | null
          name: string
          nutrition_calories_per_100g?: number | null
          nutrition_carbs_per_100g?: number | null
          nutrition_fat_per_100g?: number | null
          nutrition_fiber_per_100g?: number | null
          nutrition_protein_per_100g?: number | null
          nutrition_sodium_mg_per_100g?: number | null
          nutrition_source?: string | null
          nutrition_updated_at?: string | null
          preferred_vendor?: string | null
          price_unit?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          vendor_notes?: string | null
        }
        Update: {
          allergen_flags?: string[]
          archived?: boolean
          archived_at?: string | null
          average_price_cents?: number | null
          category?: Database["public"]["Enums"]["ingredient_category"]
          created_at?: string
          created_by?: string | null
          default_unit?: string
          description?: string | null
          dietary_tags?: string[]
          id?: string
          is_staple?: boolean
          last_price_cents?: number | null
          last_price_date?: string | null
          last_purchased_at?: string | null
          name?: string
          nutrition_calories_per_100g?: number | null
          nutrition_carbs_per_100g?: number | null
          nutrition_fat_per_100g?: number | null
          nutrition_fiber_per_100g?: number | null
          nutrition_protein_per_100g?: number | null
          nutrition_sodium_mg_per_100g?: number | null
          nutrition_source?: string | null
          nutrition_updated_at?: string | null
          preferred_vendor?: string | null
          price_unit?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          vendor_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          budget_range: string | null
          channel: Database["public"]["Enums"]["inquiry_channel"]
          chef_likelihood: string | null
          client_id: string | null
          confirmed_budget_cents: number | null
          confirmed_cannabis_preference: string | null
          confirmed_date: string | null
          confirmed_dietary_restrictions: string[] | null
          confirmed_guest_count: number | null
          confirmed_location: string | null
          confirmed_occasion: string | null
          confirmed_service_expectations: string | null
          converted_to_event_id: string | null
          created_at: string
          decline_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          external_inquiry_id: string | null
          external_link: string | null
          external_platform: string | null
          first_contact_at: string
          follow_up_due_at: string | null
          ghost_at: string | null
          id: string
          is_demo: boolean
          last_response_at: string | null
          next_action_by: string | null
          next_action_required: string | null
          partner_location_id: string | null
          referral_partner_id: string | null
          referral_source: string | null
          service_style_pref: string | null
          source_message: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          tenant_id: string
          unknown_fields: Json | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          budget_range?: string | null
          channel: Database["public"]["Enums"]["inquiry_channel"]
          chef_likelihood?: string | null
          client_id?: string | null
          confirmed_budget_cents?: number | null
          confirmed_cannabis_preference?: string | null
          confirmed_date?: string | null
          confirmed_dietary_restrictions?: string[] | null
          confirmed_guest_count?: number | null
          confirmed_location?: string | null
          confirmed_occasion?: string | null
          confirmed_service_expectations?: string | null
          converted_to_event_id?: string | null
          created_at?: string
          decline_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_inquiry_id?: string | null
          external_link?: string | null
          external_platform?: string | null
          first_contact_at: string
          follow_up_due_at?: string | null
          ghost_at?: string | null
          id?: string
          is_demo?: boolean
          last_response_at?: string | null
          next_action_by?: string | null
          next_action_required?: string | null
          partner_location_id?: string | null
          referral_partner_id?: string | null
          referral_source?: string | null
          service_style_pref?: string | null
          source_message?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          tenant_id: string
          unknown_fields?: Json | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          budget_range?: string | null
          channel?: Database["public"]["Enums"]["inquiry_channel"]
          chef_likelihood?: string | null
          client_id?: string | null
          confirmed_budget_cents?: number | null
          confirmed_cannabis_preference?: string | null
          confirmed_date?: string | null
          confirmed_dietary_restrictions?: string[] | null
          confirmed_guest_count?: number | null
          confirmed_location?: string | null
          confirmed_occasion?: string | null
          confirmed_service_expectations?: string | null
          converted_to_event_id?: string | null
          created_at?: string
          decline_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_inquiry_id?: string | null
          external_link?: string | null
          external_platform?: string | null
          first_contact_at?: string
          follow_up_due_at?: string | null
          ghost_at?: string | null
          id?: string
          is_demo?: boolean
          last_response_at?: string | null
          next_action_by?: string | null
          next_action_required?: string | null
          partner_location_id?: string | null
          referral_partner_id?: string | null
          referral_source?: string | null
          service_style_pref?: string | null
          source_message?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          tenant_id?: string
          unknown_fields?: Json | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inquiries_converted_to_event"
            columns: ["converted_to_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_inquiries_converted_to_event"
            columns: ["converted_to_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_inquiries_converted_to_event"
            columns: ["converted_to_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_inquiries_converted_to_event"
            columns: ["converted_to_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "inquiries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_partner_location_id_fkey"
            columns: ["partner_location_id"]
            isOneToOne: false
            referencedRelation: "partner_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_notes: {
        Row: {
          attachment_filename: string | null
          attachment_url: string | null
          category: Database["public"]["Enums"]["inquiry_note_category"]
          created_at: string
          id: string
          inquiry_id: string
          note_text: string
          pinned: boolean
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachment_filename?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["inquiry_note_category"]
          created_at?: string
          id?: string
          inquiry_id: string
          note_text: string
          pinned?: boolean
          source?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachment_filename?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["inquiry_note_category"]
          created_at?: string
          id?: string
          inquiry_id?: string
          note_text?: string
          pinned?: boolean
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_notes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_recipe_links: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string
          note: string | null
          recipe_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id: string
          note?: string | null
          recipe_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string
          note?: string | null
          recipe_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_recipe_links_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_recipe_links_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "inquiry_recipe_links_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_recipe_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_state_transitions: {
        Row: {
          from_status: Database["public"]["Enums"]["inquiry_status"] | null
          id: string
          inquiry_id: string
          metadata: Json | null
          reason: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["inquiry_status"]
          transitioned_at: string
          transitioned_by: string | null
        }
        Insert: {
          from_status?: Database["public"]["Enums"]["inquiry_status"] | null
          id?: string
          inquiry_id: string
          metadata?: Json | null
          reason?: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["inquiry_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Update: {
          from_status?: Database["public"]["Enums"]["inquiry_status"] | null
          id?: string
          inquiry_id?: string
          metadata?: Json | null
          reason?: string | null
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["inquiry_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_state_transitions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_state_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          access_token: string | null
          api_key: string | null
          auth_type: Database["public"]["Enums"]["integration_auth_type"]
          chef_id: string
          config: Json
          connected_at: string
          created_at: string
          error_count: number
          external_account_id: string | null
          external_account_name: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token: string | null
          scopes: string[]
          status: Database["public"]["Enums"]["integration_status"]
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          auth_type?: Database["public"]["Enums"]["integration_auth_type"]
          chef_id: string
          config?: Json
          connected_at?: string
          created_at?: string
          error_count?: number
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["integration_status"]
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          auth_type?: Database["public"]["Enums"]["integration_auth_type"]
          chef_id?: string
          config?: Json
          connected_at?: string
          created_at?: string
          error_count?: number
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["integration_status"]
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_entity_links: {
        Row: {
          created_at: string
          external_entity_id: string
          external_entity_type: string
          id: string
          local_entity_id: string
          local_entity_type: string
          provider: Database["public"]["Enums"]["integration_provider"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_entity_id: string
          external_entity_type: string
          id?: string
          local_entity_id: string
          local_entity_type: string
          provider: Database["public"]["Enums"]["integration_provider"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_entity_id?: string
          external_entity_type?: string
          id?: string
          local_entity_id?: string
          local_entity_type?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_entity_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          canonical_event_type: string | null
          connection_id: string | null
          error: string | null
          external_entity_id: string | null
          external_entity_type: string | null
          id: string
          normalized_payload: Json | null
          occurred_at: string | null
          processed_at: string | null
          processing_attempts: number
          provider: Database["public"]["Enums"]["integration_provider"]
          raw_payload: Json
          received_at: string
          source_event_id: string
          source_event_type: string
          status: Database["public"]["Enums"]["integration_sync_status"]
          tenant_id: string
        }
        Insert: {
          canonical_event_type?: string | null
          connection_id?: string | null
          error?: string | null
          external_entity_id?: string | null
          external_entity_type?: string | null
          id?: string
          normalized_payload?: Json | null
          occurred_at?: string | null
          processed_at?: string | null
          processing_attempts?: number
          provider: Database["public"]["Enums"]["integration_provider"]
          raw_payload: Json
          received_at?: string
          source_event_id: string
          source_event_type: string
          status?: Database["public"]["Enums"]["integration_sync_status"]
          tenant_id: string
        }
        Update: {
          canonical_event_type?: string | null
          connection_id?: string | null
          error?: string | null
          external_entity_id?: string | null
          external_entity_type?: string | null
          id?: string
          normalized_payload?: Json | null
          occurred_at?: string | null
          processed_at?: string | null
          processing_attempts?: number
          provider?: Database["public"]["Enums"]["integration_provider"]
          raw_payload?: Json
          received_at?: string
          source_event_id?: string
          source_event_type?: string
          status?: Database["public"]["Enums"]["integration_sync_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_field_mappings: {
        Row: {
          active: boolean
          connection_id: string | null
          created_at: string
          external_path: string
          id: string
          local_field: string
          mapping_name: string
          provider: Database["public"]["Enums"]["integration_provider"]
          tenant_id: string
          transform_rule: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          connection_id?: string | null
          created_at?: string
          external_path: string
          id?: string
          local_field: string
          mapping_name: string
          provider: Database["public"]["Enums"]["integration_provider"]
          tenant_id: string
          transform_rule?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          connection_id?: string | null
          created_at?: string
          external_path?: string
          id?: string
          local_field?: string
          mapping_name?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          tenant_id?: string
          transform_rule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_field_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_field_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_jobs: {
        Row: {
          connection_id: string | null
          created_at: string
          cursor_after: string | null
          cursor_before: string | null
          error: string | null
          finished_at: string | null
          id: string
          job_type: string
          provider: Database["public"]["Enums"]["integration_provider"]
          started_at: string | null
          status: Database["public"]["Enums"]["integration_sync_status"]
          tenant_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          cursor_after?: string | null
          cursor_before?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          provider: Database["public"]["Enums"]["integration_provider"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["integration_sync_status"]
          tenant_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          cursor_after?: string | null
          cursor_before?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["integration_sync_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_items: {
        Row: {
          actual_qty: number | null
          audit_id: string
          counted_at: string | null
          created_at: string
          expected_qty: number | null
          id: string
          ingredient_id: string | null
          ingredient_name: string
          location_id: string | null
          notes: string | null
          photo_url: string | null
          unit: string
          unit_cost_cents: number | null
          variance_cost_cents: number | null
          variance_qty: number | null
        }
        Insert: {
          actual_qty?: number | null
          audit_id: string
          counted_at?: string | null
          created_at?: string
          expected_qty?: number | null
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          location_id?: string | null
          notes?: string | null
          photo_url?: string | null
          unit: string
          unit_cost_cents?: number | null
          variance_cost_cents?: number | null
          variance_qty?: number | null
        }
        Update: {
          actual_qty?: number | null
          audit_id?: string
          counted_at?: string | null
          created_at?: string
          expected_qty?: number | null
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          location_id?: string | null
          notes?: string | null
          photo_url?: string | null
          unit?: string
          unit_cost_cents?: number | null
          variance_cost_cents?: number | null
          variance_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "inventory_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_audit_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_audit_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_audit_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audits: {
        Row: {
          audit_date: string
          audit_type: Database["public"]["Enums"]["inventory_audit_type"]
          chef_id: string
          created_at: string
          created_by: string | null
          event_id: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          items_with_variance: number | null
          location_id: string | null
          notes: string | null
          photo_url: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["inventory_audit_status"]
          total_items_counted: number | null
          total_variance_cents: number | null
          updated_at: string
        }
        Insert: {
          audit_date?: string
          audit_type?: Database["public"]["Enums"]["inventory_audit_type"]
          chef_id: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          items_with_variance?: number | null
          location_id?: string | null
          notes?: string | null
          photo_url?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inventory_audit_status"]
          total_items_counted?: number | null
          total_variance_cents?: number | null
          updated_at?: string
        }
        Update: {
          audit_date?: string
          audit_type?: Database["public"]["Enums"]["inventory_audit_type"]
          chef_id?: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          items_with_variance?: number | null
          location_id?: string | null
          notes?: string | null
          photo_url?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inventory_audit_status"]
          total_items_counted?: number | null
          total_variance_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audits_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "inventory_audits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "inventory_audits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "inventory_audits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          chef_id: string
          created_at: string
          expiry_date: string | null
          id: string
          ingredient_id: string | null
          ingredient_name: string
          initial_qty: number
          is_depleted: boolean
          is_expired: boolean
          location_id: string | null
          lot_number: string | null
          notes: string | null
          photo_url: string | null
          purchase_order_id: string | null
          received_date: string
          remaining_qty: number
          unit: string
          unit_cost_cents: number | null
          updated_at: string
          vendor_id: string | null
          vendor_invoice_id: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          initial_qty: number
          is_depleted?: boolean
          is_expired?: boolean
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_order_id?: string | null
          received_date?: string
          remaining_qty: number
          unit: string
          unit_cost_cents?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_invoice_id?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          initial_qty?: number
          is_depleted?: boolean
          is_expired?: boolean
          location_id?: string | null
          lot_number?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_order_id?: string | null
          received_date?: string
          remaining_qty?: number
          unit?: string
          unit_cost_cents?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          chef_id: string
          created_at: string
          current_qty: number
          id: string
          ingredient_id: string | null
          ingredient_name: string
          last_counted_at: string
          par_level: number | null
          unit: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          current_qty?: number
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          last_counted_at?: string
          par_level?: number | null
          unit: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          current_qty?: number
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          last_counted_at?: string
          par_level?: number | null
          unit?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_counts_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_counts_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_counts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          audit_id: string | null
          batch_id: string | null
          chef_id: string
          cost_cents: number | null
          created_at: string
          created_by: string | null
          event_id: string | null
          expiry_date: string | null
          id: string
          ingredient_id: string | null
          ingredient_name: string
          location_id: string | null
          notes: string | null
          photo_url: string | null
          purchase_order_id: string | null
          quantity: number
          sale_id: string | null
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          transfer_pair_id: string | null
          unit: string
          vendor_invoice_id: string | null
          waste_log_id: string | null
        }
        Insert: {
          audit_id?: string | null
          batch_id?: string | null
          chef_id: string
          cost_cents?: number | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          expiry_date?: string | null
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          location_id?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_order_id?: string | null
          quantity: number
          sale_id?: string | null
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          transfer_pair_id?: string | null
          unit: string
          vendor_invoice_id?: string | null
          waste_log_id?: string | null
        }
        Update: {
          audit_id?: string | null
          batch_id?: string | null
          chef_id?: string
          cost_cents?: number | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          expiry_date?: string | null
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          location_id?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_order_id?: string | null
          quantity?: number
          sale_id?: string | null
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"]
          transfer_pair_id?: string | null
          unit?: string
          vendor_invoice_id?: string | null
          waste_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "inventory_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "inventory_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "inventory_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_financial_summary"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "inventory_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_waste_log_id_fkey"
            columns: ["waste_log_id"]
            isOneToOne: false
            referencedRelation: "waste_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_retry_log: {
        Row: {
          attempt_number: number
          created_at: string
          id: string
          job_id: string
          job_type: string
          last_error: string | null
          next_retry_at: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          id?: string
          job_id: string
          job_type: string
          last_error?: string | null
          next_retry_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          id?: string
          job_id?: string
          job_type?: string
          last_error?: string | null
          next_retry_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_retry_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_rentals: {
        Row: {
          address: string | null
          booking_confirmation: string | null
          chef_id: string
          cost_cents: number
          created_at: string
          end_time: string | null
          event_id: string | null
          facility_name: string
          hours_booked: number | null
          id: string
          notes: string | null
          purpose: string | null
          rental_date: string
          start_time: string | null
        }
        Insert: {
          address?: string | null
          booking_confirmation?: string | null
          chef_id: string
          cost_cents?: number
          created_at?: string
          end_time?: string | null
          event_id?: string | null
          facility_name: string
          hours_booked?: number | null
          id?: string
          notes?: string | null
          purpose?: string | null
          rental_date: string
          start_time?: string | null
        }
        Update: {
          address?: string | null
          booking_confirmation?: string | null
          chef_id?: string
          cost_cents?: number
          created_at?: string
          end_time?: string | null
          event_id?: string | null
          facility_name?: string
          hours_booked?: number | null
          id?: string
          notes?: string | null
          purpose?: string | null
          rental_date?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_rentals_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "kitchen_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "kitchen_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "kitchen_rentals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_goals: {
        Row: {
          category: string
          chef_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          chef_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          chef_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_goals_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          created_by: string | null
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          event_id: string | null
          id: string
          internal_notes: string | null
          is_refund: boolean
          ledger_sequence: number
          payment_card_used: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          qb_entity_id: string | null
          qb_synced_at: string | null
          received_at: string | null
          refund_reason: string | null
          refunded_entry_id: string | null
          tenant_id: string
          transaction_reference: string | null
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          created_by?: string | null
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          event_id?: string | null
          id?: string
          internal_notes?: string | null
          is_refund?: boolean
          ledger_sequence?: number
          payment_card_used?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          qb_entity_id?: string | null
          qb_synced_at?: string | null
          received_at?: string | null
          refund_reason?: string | null
          refunded_entry_id?: string | null
          tenant_id: string
          transaction_reference?: string | null
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          event_id?: string | null
          id?: string
          internal_notes?: string | null
          is_refund?: boolean
          ledger_sequence?: number
          payment_card_used?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          qb_entity_id?: string | null
          qb_synced_at?: string | null
          received_at?: string | null
          refund_reason?: string | null
          refunded_entry_id?: string | null
          tenant_id?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ledger_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ledger_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_refunded_entry_id_fkey"
            columns: ["refunded_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_config: {
        Row: {
          bonus_large_party_points: number | null
          bonus_large_party_threshold: number | null
          created_at: string
          earn_mode: string
          id: string
          is_active: boolean
          milestone_bonuses: Json
          points_per_dollar: number
          points_per_event: number
          points_per_guest: number
          program_mode: string
          referral_points: number
          tenant_id: string
          tier_bronze_min: number
          tier_gold_min: number
          tier_platinum_min: number
          tier_silver_min: number
          updated_at: string
          welcome_points: number
        }
        Insert: {
          bonus_large_party_points?: number | null
          bonus_large_party_threshold?: number | null
          created_at?: string
          earn_mode?: string
          id?: string
          is_active?: boolean
          milestone_bonuses?: Json
          points_per_dollar?: number
          points_per_event?: number
          points_per_guest?: number
          program_mode?: string
          referral_points?: number
          tenant_id: string
          tier_bronze_min?: number
          tier_gold_min?: number
          tier_platinum_min?: number
          tier_silver_min?: number
          updated_at?: string
          welcome_points?: number
        }
        Update: {
          bonus_large_party_points?: number | null
          bonus_large_party_threshold?: number | null
          created_at?: string
          earn_mode?: string
          id?: string
          is_active?: boolean
          milestone_bonuses?: Json
          points_per_dollar?: number
          points_per_event?: number
          points_per_guest?: number
          program_mode?: string
          referral_points?: number
          tenant_id?: string
          tier_bronze_min?: number
          tier_gold_min?: number
          tier_platinum_min?: number
          tier_silver_min?: number
          updated_at?: string
          welcome_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_reward_redemptions: {
        Row: {
          client_id: string
          created_at: string
          delivered_at: string | null
          delivery_note: string | null
          delivery_status: string
          event_id: string | null
          id: string
          loyalty_transaction_id: string
          points_spent: number
          redeemed_by: string
          reward_id: string
          reward_name: string
          reward_percent: number | null
          reward_type: string
          reward_value_cents: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          delivered_at?: string | null
          delivery_note?: string | null
          delivery_status?: string
          event_id?: string | null
          id?: string
          loyalty_transaction_id: string
          points_spent: number
          redeemed_by?: string
          reward_id: string
          reward_name: string
          reward_percent?: number | null
          reward_type: string
          reward_value_cents?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          delivered_at?: string | null
          delivery_note?: string | null
          delivery_status?: string
          event_id?: string | null
          id?: string
          loyalty_transaction_id?: string
          points_spent?: number
          redeemed_by?: string
          reward_id?: string
          reward_name?: string
          reward_percent?: number | null
          reward_type?: string
          reward_value_cents?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_reward_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_loyalty_transaction_id_fkey"
            columns: ["loyalty_transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_reward_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          points_required: number
          reward_percent: number | null
          reward_type: Database["public"]["Enums"]["loyalty_reward_type"]
          reward_value_cents: number | null
          sort_order: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_required: number
          reward_percent?: number | null
          reward_type: Database["public"]["Enums"]["loyalty_reward_type"]
          reward_value_cents?: number | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number
          reward_percent?: number | null
          reward_type?: Database["public"]["Enums"]["loyalty_reward_type"]
          reward_value_cents?: number | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string
          event_id: string | null
          id: string
          points: number
          tenant_id: string
          type: Database["public"]["Enums"]["loyalty_transaction_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description: string
          event_id?: string | null
          id?: string
          points: number
          tenant_id: string
          type: Database["public"]["Enums"]["loyalty_transaction_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string | null
          id?: string
          points?: number
          tenant_id?: string
          type?: Database["public"]["Enums"]["loyalty_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          body_html: string
          campaign_type: string
          chef_id: string
          concept_description: string | null
          created_at: string
          delivery_modes: string[]
          guest_count_max: number | null
          guest_count_min: number | null
          id: string
          menu_id: string | null
          name: string
          occasion: string | null
          price_per_person_cents: number | null
          proposed_date: string | null
          proposed_time: string | null
          public_booking_token: string | null
          recipient_count: number | null
          scheduled_at: string | null
          seats_available: number | null
          seats_booked: number
          sent_at: string | null
          status: string
          subject: string
          target_segment: Json
          updated_at: string
        }
        Insert: {
          body_html: string
          campaign_type?: string
          chef_id: string
          concept_description?: string | null
          created_at?: string
          delivery_modes?: string[]
          guest_count_max?: number | null
          guest_count_min?: number | null
          id?: string
          menu_id?: string | null
          name: string
          occasion?: string | null
          price_per_person_cents?: number | null
          proposed_date?: string | null
          proposed_time?: string | null
          public_booking_token?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          seats_available?: number | null
          seats_booked?: number
          sent_at?: string | null
          status?: string
          subject: string
          target_segment?: Json
          updated_at?: string
        }
        Update: {
          body_html?: string
          campaign_type?: string
          chef_id?: string
          concept_description?: string | null
          created_at?: string
          delivery_modes?: string[]
          guest_count_max?: number | null
          guest_count_min?: number | null
          id?: string
          menu_id?: string | null
          name?: string
          occasion?: string | null
          price_per_person_cents?: number | null
          proposed_date?: string | null
          proposed_time?: string | null
          public_booking_token?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          seats_available?: number | null
          seats_booked?: number
          sent_at?: string | null
          status?: string
          subject?: string
          target_segment?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_spend_log: {
        Row: {
          amount_cents: number
          campaign_name: string | null
          channel: string
          chef_id: string
          created_at: string
          id: string
          notes: string | null
          spend_date: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          campaign_name?: string | null
          channel: string
          chef_id: string
          created_at?: string
          id?: string
          notes?: string | null
          spend_date: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          campaign_name?: string | null
          channel?: string
          chef_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          spend_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_spend_log_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_approval_requests: {
        Row: {
          chef_id: string
          client_id: string
          created_at: string
          event_id: string
          id: string
          menu_snapshot: Json
          responded_at: string | null
          revision_notes: string | null
          sent_at: string
          status: Database["public"]["Enums"]["menu_approval_status"]
        }
        Insert: {
          chef_id: string
          client_id: string
          created_at?: string
          event_id: string
          id?: string
          menu_snapshot?: Json
          responded_at?: string | null
          revision_notes?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["menu_approval_status"]
        }
        Update: {
          chef_id?: string
          client_id?: string
          created_at?: string
          event_id?: string
          id?: string
          menu_snapshot?: Json
          responded_at?: string | null
          revision_notes?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["menu_approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "menu_approval_requests_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_approval_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "menu_approval_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_approval_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_approval_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_approval_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_approval_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_modifications: {
        Row: {
          actual_description: string | null
          component_id: string | null
          created_at: string
          event_id: string
          id: string
          modification_type: Database["public"]["Enums"]["modification_type"]
          original_description: string | null
          photo_url: string | null
          reason: string | null
          tenant_id: string
        }
        Insert: {
          actual_description?: string | null
          component_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          modification_type: Database["public"]["Enums"]["modification_type"]
          original_description?: string | null
          photo_url?: string | null
          reason?: string | null
          tenant_id: string
        }
        Update: {
          actual_description?: string | null
          component_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          modification_type?: Database["public"]["Enums"]["modification_type"]
          original_description?: string | null
          photo_url?: string | null
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_modifications_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_modifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_modifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_modifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_modifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_modifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_preferences: {
        Row: {
          adventurousness: string
          chef_viewed_at: string | null
          client_id: string
          created_at: string
          cuisine_preferences: string[] | null
          customization_notes: string | null
          event_id: string
          foods_avoid: string | null
          foods_love: string | null
          id: string
          selected_menu_id: string | null
          selection_mode: string
          service_style_pref: string | null
          special_requests: string | null
          submitted_at: string
          tenant_id: string
        }
        Insert: {
          adventurousness?: string
          chef_viewed_at?: string | null
          client_id: string
          created_at?: string
          cuisine_preferences?: string[] | null
          customization_notes?: string | null
          event_id: string
          foods_avoid?: string | null
          foods_love?: string | null
          id?: string
          selected_menu_id?: string | null
          selection_mode?: string
          service_style_pref?: string | null
          special_requests?: string | null
          submitted_at?: string
          tenant_id: string
        }
        Update: {
          adventurousness?: string
          chef_viewed_at?: string | null
          client_id?: string
          created_at?: string
          cuisine_preferences?: string[] | null
          customization_notes?: string | null
          event_id?: string
          foods_avoid?: string | null
          foods_love?: string | null
          id?: string
          selected_menu_id?: string | null
          selection_mode?: string
          service_style_pref?: string | null
          special_requests?: string | null
          submitted_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menu_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_preferences_selected_menu_id_fkey"
            columns: ["selected_menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "menu_preferences_selected_menu_id_fkey"
            columns: ["selected_menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_state_transitions: {
        Row: {
          from_status: Database["public"]["Enums"]["menu_status"] | null
          id: string
          menu_id: string
          metadata: Json | null
          reason: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["menu_status"]
          transitioned_at: string
          transitioned_by: string | null
        }
        Insert: {
          from_status?: Database["public"]["Enums"]["menu_status"] | null
          id?: string
          menu_id: string
          metadata?: Json | null
          reason?: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["menu_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Update: {
          from_status?: Database["public"]["Enums"]["menu_status"] | null
          id?: string
          menu_id?: string
          metadata?: Json | null
          reason?: string | null
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["menu_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_state_transitions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "menu_state_transitions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_state_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_fields: Json
          description: string | null
          event_type: string | null
          id: string
          is_system: boolean
          layout: Json
          name: string
          placeholders: string[]
          slug: string
          styles: Json
          tenant_id: string | null
          theme: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_fields?: Json
          description?: string | null
          event_type?: string | null
          id?: string
          is_system?: boolean
          layout?: Json
          name: string
          placeholders?: string[]
          slug: string
          styles?: Json
          tenant_id?: string | null
          theme?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_fields?: Json
          description?: string | null
          event_type?: string | null
          id?: string
          is_system?: boolean
          layout?: Json
          name?: string
          placeholders?: string[]
          slug?: string
          styles?: Json
          tenant_id?: string | null
          theme?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_upload_jobs: {
        Row: {
          client_name: string | null
          created_at: string
          dishes_approved: number | null
          dishes_found: number | null
          error_message: string | null
          event_date: string | null
          event_type: string | null
          extracted_text: string | null
          file_hash: string | null
          file_name: string
          file_storage_path: string | null
          file_type: string
          id: string
          notes: string | null
          parsed_dishes: Json | null
          status: Database["public"]["Enums"]["upload_job_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          dishes_approved?: number | null
          dishes_found?: number | null
          error_message?: string | null
          event_date?: string | null
          event_type?: string | null
          extracted_text?: string | null
          file_hash?: string | null
          file_name: string
          file_storage_path?: string | null
          file_type: string
          id?: string
          notes?: string | null
          parsed_dishes?: Json | null
          status?: Database["public"]["Enums"]["upload_job_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          dishes_approved?: number | null
          dishes_found?: number | null
          error_message?: string | null
          event_date?: string | null
          event_type?: string | null
          extracted_text?: string | null
          file_hash?: string | null
          file_name?: string
          file_storage_path?: string | null
          file_type?: string
          id?: string
          notes?: string | null
          parsed_dishes?: Json | null
          status?: Database["public"]["Enums"]["upload_job_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_upload_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          cuisine_type: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          event_id: string | null
          id: string
          is_showcase: boolean
          is_template: boolean
          locked_at: string | null
          name: string
          notes: string | null
          price_per_person_cents: number | null
          service_style:
            | Database["public"]["Enums"]["event_service_style"]
            | null
          shared_at: string | null
          simple_mode: boolean
          simple_mode_content: string | null
          status: Database["public"]["Enums"]["menu_status"]
          target_guest_count: number | null
          tenant_id: string
          times_used: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_showcase?: boolean
          is_template?: boolean
          locked_at?: string | null
          name: string
          notes?: string | null
          price_per_person_cents?: number | null
          service_style?:
            | Database["public"]["Enums"]["event_service_style"]
            | null
          shared_at?: string | null
          simple_mode?: boolean
          simple_mode_content?: string | null
          status?: Database["public"]["Enums"]["menu_status"]
          target_guest_count?: number | null
          tenant_id: string
          times_used?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_showcase?: boolean
          is_template?: boolean
          locked_at?: string | null
          name?: string
          notes?: string | null
          price_per_person_cents?: number | null
          service_style?:
            | Database["public"]["Enums"]["event_service_style"]
            | null
          shared_at?: string | null
          simple_mode?: boolean
          simple_mode_content?: string | null
          status?: Database["public"]["Enums"]["menu_status"]
          target_guest_count?: number | null
          tenant_id?: string
          times_used?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          client_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          event_id: string | null
          from_user_id: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          inquiry_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          subject: string | null
          tenant_id: string
          to_user_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          client_id?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          event_id?: string | null
          from_user_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          inquiry_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          tenant_id: string
          to_user_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          client_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          event_id?: string | null
          from_user_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          inquiry_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          tenant_id?: string
          to_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_messages_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_messages_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_messages_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_logs: {
        Row: {
          chef_id: string
          created_at: string
          deduction_cents: number | null
          description: string | null
          event_id: string | null
          from_address: string
          id: string
          irs_rate_cents_per_mile: number
          log_date: string
          miles: number
          notes: string | null
          purpose: string
          tenant_id: string | null
          to_address: string
          trip_date: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          deduction_cents?: number | null
          description?: string | null
          event_id?: string | null
          from_address: string
          id?: string
          irs_rate_cents_per_mile?: number
          log_date: string
          miles: number
          notes?: string | null
          purpose?: string
          tenant_id?: string | null
          to_address: string
          trip_date?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          deduction_cents?: number | null
          description?: string | null
          event_id?: string | null
          from_address?: string
          id?: string
          irs_rate_cents_per_mile?: number
          log_date?: string
          miles?: number
          notes?: string | null
          purpose?: string
          tenant_id?: string | null
          to_address?: string
          trip_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mileage_logs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mileage_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mileage_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "mileage_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      mutation_idempotency: {
        Row: {
          action_name: string
          actor_id: string | null
          completed_at: string
          created_at: string
          id: string
          idempotency_key: string
          response_data: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_name: string
          actor_id?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          idempotency_key: string
          response_data?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action_name?: string
          actor_id?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          response_data?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutation_idempotency_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notification_delivery_log: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          notification_id: string
          sent_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          channel: string
          error_message?: string | null
          id?: string
          notification_id: string
          sent_at?: string
          status: string
          tenant_id: string
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          notification_id?: string
          sent_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          auth_user_id: string
          category: string
          created_at: string
          email_enabled: boolean | null
          id: string
          push_enabled: boolean | null
          sms_enabled: boolean | null
          tenant_id: string
          tier: string | null
          toast_enabled: boolean
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          category: string
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          tenant_id: string
          tier?: string | null
          toast_enabled?: boolean
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          category?: string
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          tenant_id?: string
          tier?: string | null
          toast_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action: string
          action_url: string | null
          archived_at: string | null
          body: string | null
          category: string
          client_id: string | null
          created_at: string
          event_id: string | null
          id: string
          inquiry_id: string | null
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          recipient_role: string
          tenant_id: string
          title: string
        }
        Insert: {
          action: string
          action_url?: string | null
          archived_at?: string | null
          body?: string | null
          category: string
          client_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          inquiry_id?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          recipient_role?: string
          tenant_id: string
          title: string
        }
        Update: {
          action?: string
          action_url?: string | null
          archived_at?: string | null
          body?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          inquiry_id?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          recipient_role?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_log: {
        Row: {
          action_type: Database["public"]["Enums"]["ops_log_action"]
          chef_id: string
          created_at: string
          details: Json
          id: string
          staff_member_id: string | null
          station_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["ops_log_action"]
          chef_id: string
          created_at?: string
          details?: Json
          id?: string
          staff_member_id?: string | null
          station_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["ops_log_action"]
          chef_id?: string
          created_at?: string
          details?: Json
          id?: string
          staff_member_id?: string | null
          station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_log_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_log_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_log_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_queue: {
        Row: {
          actual_wait_minutes: number | null
          assigned_to: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_name: string | null
          estimated_ready_at: string | null
          id: string
          notes: string | null
          order_number: string | null
          picked_up_at: string | null
          preparing_at: string | null
          ready_at: string | null
          received_at: string
          sale_id: string
          status: Database["public"]["Enums"]["order_queue_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_wait_minutes?: number | null
          assigned_to?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name?: string | null
          estimated_ready_at?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          picked_up_at?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          received_at?: string
          sale_id: string
          status?: Database["public"]["Enums"]["order_queue_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_wait_minutes?: number | null
          assigned_to?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name?: string | null
          estimated_ready_at?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          picked_up_at?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          received_at?: string
          sale_id?: string
          status?: Database["public"]["Enums"]["order_queue_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_queue_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_financial_summary"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "order_queue_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_requests: {
        Row: {
          chef_id: string
          component_id: string
          fulfilled_at: string | null
          id: string
          notes: string | null
          quantity: number
          requested_at: string
          requested_by: string | null
          station_id: string
          status: Database["public"]["Enums"]["order_request_status"]
          unit: string
        }
        Insert: {
          chef_id: string
          component_id: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          quantity: number
          requested_at?: string
          requested_by?: string | null
          station_id: string
          status?: Database["public"]["Enums"]["order_request_status"]
          unit?: string
        }
        Update: {
          chef_id?: string
          component_id?: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          requested_at?: string
          requested_by?: string | null
          station_id?: string
          status?: Database["public"]["Enums"]["order_request_status"]
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_requests_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_requests_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "station_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_requests_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_confirmations: {
        Row: {
          confirmed_at: string
          event_id: string
          id: string
          item_key: string
          tenant_id: string
        }
        Insert: {
          confirmed_at?: string
          event_id: string
          id?: string
          item_key: string
          tenant_id: string
        }
        Update: {
          confirmed_at?: string
          event_id?: string
          id?: string
          item_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_confirmations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "packing_confirmations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "packing_confirmations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "packing_confirmations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_images: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          location_id: string | null
          partner_id: string
          season: string | null
          tenant_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          location_id?: string | null
          partner_id: string
          season?: string | null
          tenant_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          location_id?: string | null
          partner_id?: string
          season?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_images_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "partner_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_images_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_locations: {
        Row: {
          address: string | null
          booking_url: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_guest_count: number | null
          name: string
          notes: string | null
          partner_id: string
          state: string | null
          tenant_id: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          booking_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_guest_count?: number | null
          name: string
          notes?: string | null
          partner_id: string
          state?: string | null
          tenant_id: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          booking_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_guest_count?: number | null
          name?: string
          notes?: string | null
          partner_id?: string
          state?: string | null
          tenant_id?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_locations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_disputes: {
        Row: {
          amount_cents: number
          chef_id: string
          created_at: string
          event_id: string | null
          evidence_notes: string | null
          evidence_urls: Json
          id: string
          opened_at: string
          reason: string | null
          resolved_at: string | null
          status: string
          stripe_dispute_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          chef_id: string
          created_at?: string
          event_id?: string | null
          evidence_notes?: string | null
          evidence_urls?: Json
          id?: string
          opened_at?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          stripe_dispute_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          chef_id?: string
          created_at?: string
          event_id?: string | null
          evidence_notes?: string | null
          evidence_urls?: Json
          id?: string
          opened_at?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          stripe_dispute_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payment_disputes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payment_disputes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payment_disputes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_installments: {
        Row: {
          amount_cents: number
          created_at: string
          due_date: string
          event_id: string
          id: string
          installment_num: number
          label: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          due_date: string
          event_id: string
          id?: string
          installment_num: number
          label: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          due_date?: string
          event_id?: string
          id?: string
          installment_num?: number
          label?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_installments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payment_plan_installments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payment_plan_installments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payment_plan_installments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_installments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_941_summaries: {
        Row: {
          chef_id: string
          confirmation_number: string | null
          created_at: string
          employee_medicare_tax_cents: number
          employee_ss_tax_cents: number
          employer_medicare_tax_cents: number
          employer_ss_tax_cents: number
          federal_income_tax_withheld_cents: number
          filed: boolean
          filed_at: string | null
          id: string
          notes: string | null
          quarter: number
          tax_year: number
          total_taxes_cents: number
          total_wages_cents: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          confirmation_number?: string | null
          created_at?: string
          employee_medicare_tax_cents?: number
          employee_ss_tax_cents?: number
          employer_medicare_tax_cents?: number
          employer_ss_tax_cents?: number
          federal_income_tax_withheld_cents?: number
          filed?: boolean
          filed_at?: string | null
          id?: string
          notes?: string | null
          quarter: number
          tax_year: number
          total_taxes_cents?: number
          total_wages_cents?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          confirmation_number?: string | null
          created_at?: string
          employee_medicare_tax_cents?: number
          employee_ss_tax_cents?: number
          employer_medicare_tax_cents?: number
          employer_ss_tax_cents?: number
          federal_income_tax_withheld_cents?: number
          filed?: boolean
          filed_at?: string | null
          id?: string
          notes?: string | null
          quarter?: number
          tax_year?: number
          total_taxes_cents?: number
          total_wages_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_941_summaries_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          chef_id: string
          created_at: string
          employee_id: string
          employee_medicare_tax_cents: number
          employee_ss_tax_cents: number
          employer_futa_cents: number
          employer_medicare_tax_cents: number
          employer_ss_tax_cents: number
          federal_income_tax_cents: number
          gross_pay_cents: number
          id: string
          net_pay_cents: number
          notes: string | null
          overtime_hours: number
          overtime_pay_cents: number
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          regular_hours: number
          regular_pay_cents: number
          state_income_tax_cents: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          employee_id: string
          employee_medicare_tax_cents?: number
          employee_ss_tax_cents?: number
          employer_futa_cents?: number
          employer_medicare_tax_cents?: number
          employer_ss_tax_cents?: number
          federal_income_tax_cents?: number
          gross_pay_cents?: number
          id?: string
          net_pay_cents?: number
          notes?: string | null
          overtime_hours?: number
          overtime_pay_cents?: number
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          regular_hours?: number
          regular_pay_cents?: number
          state_income_tax_cents?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          employee_id?: string
          employee_medicare_tax_cents?: number
          employee_ss_tax_cents?: number
          employer_futa_cents?: number
          employer_medicare_tax_cents?: number
          employer_ss_tax_cents?: number
          federal_income_tax_cents?: number
          gross_pay_cents?: number
          id?: string
          net_pay_cents?: number
          notes?: string | null
          overtime_hours?: number
          overtime_pay_cents?: number
          pay_date?: string
          pay_period_end?: string
          pay_period_start?: string
          regular_hours?: number
          regular_pay_cents?: number
          state_income_tax_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_w2_summaries: {
        Row: {
          box1_wages_cents: number
          box17_state_tax_cents: number
          box2_federal_withheld_cents: number
          box3_ss_wages_cents: number
          box4_ss_withheld_cents: number
          box5_medicare_wages_cents: number
          box6_medicare_withheld_cents: number
          chef_id: string
          created_at: string
          employee_id: string
          generated_at: string
          id: string
          tax_year: number
        }
        Insert: {
          box1_wages_cents?: number
          box17_state_tax_cents?: number
          box2_federal_withheld_cents?: number
          box3_ss_wages_cents?: number
          box4_ss_withheld_cents?: number
          box5_medicare_wages_cents?: number
          box6_medicare_withheld_cents?: number
          chef_id: string
          created_at?: string
          employee_id: string
          generated_at?: string
          id?: string
          tax_year: number
        }
        Update: {
          box1_wages_cents?: number
          box17_state_tax_cents?: number
          box2_federal_withheld_cents?: number
          box3_ss_wages_cents?: number
          box4_ss_withheld_cents?: number
          box5_medicare_wages_cents?: number
          box6_medicare_withheld_cents?: number
          chef_id?: string
          created_at?: string
          employee_id?: string
          generated_at?: string
          id?: string
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_w2_summaries_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_w2_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_ledger: {
        Row: {
          amount_cents: number
          created_at: string
          description: string
          entry_type: string
          event_id: string | null
          id: string
          internal_notes: string | null
          stripe_application_fee_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          tenant_id: string
          transaction_reference: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description: string
          entry_type?: string
          event_id?: string | null
          id?: string
          internal_notes?: string | null
          stripe_application_fee_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          tenant_id: string
          transaction_reference?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string
          entry_type?: string
          event_id?: string | null
          id?: string
          internal_notes?: string | null
          stripe_application_fee_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          tenant_id?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          caption: string | null
          chef_id: string
          created_at: string
          dish_name: string | null
          display_order: number
          event_type: string | null
          id: string
          is_featured: boolean
          photo_url: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          chef_id: string
          created_at?: string
          dish_name?: string | null
          display_order?: number
          event_type?: string | null
          id?: string
          is_featured?: boolean
          photo_url: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          chef_id?: string
          created_at?: string
          dish_name?: string | null
          display_order?: number
          event_type?: string | null
          id?: string
          is_featured?: boolean
          photo_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_projections: {
        Row: {
          allergen_flags: string[] | null
          available_qty: number | null
          barcode: string | null
          category: string | null
          cost_cents: number | null
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number | null
          menu_id: string | null
          modifiers: Json | null
          name: string
          price_cents: number
          recipe_id: string | null
          sku: string | null
          snapshot_at: string
          sort_order: number
          source_version: number | null
          tags: string[] | null
          tax_class: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          allergen_flags?: string[] | null
          available_qty?: number | null
          barcode?: string | null
          category?: string | null
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          menu_id?: string | null
          modifiers?: Json | null
          name: string
          price_cents: number
          recipe_id?: string | null
          sku?: string | null
          snapshot_at?: string
          sort_order?: number
          source_version?: number | null
          tags?: string[] | null
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          allergen_flags?: string[] | null
          available_qty?: number | null
          barcode?: string | null
          category?: string | null
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          menu_id?: string | null
          modifiers?: Json | null
          name?: string
          price_cents?: number
          recipe_id?: string | null
          sku?: string | null
          snapshot_at?: string
          sort_order?: number
          source_version?: number | null
          tags?: string[] | null
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id?: string
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_projections_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "product_projections_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_projections_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "product_projections_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_projections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_achievements: {
        Row: {
          achieve_date: string | null
          achieve_type: string
          chef_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_public: boolean
          organization: string | null
          outcome: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          achieve_date?: string | null
          achieve_type?: string
          chef_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          organization?: string | null
          outcome?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          achieve_date?: string | null
          achieve_type?: string
          chef_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          organization?: string | null
          outcome?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_achievements_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_highlights: {
        Row: {
          category: string
          chef_id: string
          created_at: string
          display_order: number
          id: string
          items: Json
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          chef_id: string
          created_at?: string
          display_order?: number
          id?: string
          items?: Json
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          chef_id?: string
          created_at?: string
          display_order?: number
          id?: string
          items?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_highlights_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_addons: {
        Row: {
          chef_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          price_cents_per_person: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          price_cents_per_person?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          price_cents_per_person?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_addons_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          base_price_cents: number
          chef_id: string
          cover_photo_url: string | null
          created_at: string
          default_menu_id: string | null
          description: string | null
          id: string
          included_services: Json
          name: string
          updated_at: string
        }
        Insert: {
          base_price_cents?: number
          chef_id: string
          cover_photo_url?: string | null
          created_at?: string
          default_menu_id?: string | null
          description?: string | null
          id?: string
          included_services?: Json
          name: string
          updated_at?: string
        }
        Update: {
          base_price_cents?: number
          chef_id?: string
          cover_photo_url?: string | null
          created_at?: string
          default_menu_id?: string | null
          description?: string | null
          id?: string
          included_services?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_templates_default_menu_id_fkey"
            columns: ["default_menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "proposal_templates_default_menu_id_fkey"
            columns: ["default_menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_views: {
        Row: {
          id: string
          quote_id: string
          sections_viewed: Json
          time_on_page_seconds: number
          viewed_at: string
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          quote_id: string
          sections_viewed?: Json
          time_on_page_seconds?: number
          viewed_at?: string
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          quote_id?: string
          sections_viewed?: Json
          time_on_page_seconds?: number
          viewed_at?: string
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_call_scripts: {
        Row: {
          category: string | null
          chef_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          script_body: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          chef_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          script_body: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          chef_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          script_body?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_call_scripts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_notes: {
        Row: {
          chef_id: string
          content: string
          created_at: string
          id: string
          note_type: string
          prospect_id: string
        }
        Insert: {
          chef_id: string
          content: string
          created_at?: string
          id?: string
          note_type?: string
          prospect_id: string
        }
        Update: {
          chef_id?: string
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_notes_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_notes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_outreach_log: {
        Row: {
          body: string | null
          chef_id: string
          created_at: string
          id: string
          notes: string | null
          outcome: string | null
          outreach_type: string
          prospect_id: string
          sequence_number: number | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          chef_id: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          outreach_type: string
          prospect_id: string
          sequence_number?: number | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          chef_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          outreach_type?: string
          prospect_id?: string
          sequence_number?: number | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_outreach_log_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_outreach_log_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_scrub_sessions: {
        Row: {
          chef_id: string
          created_at: string
          enriched_count: number
          error_message: string | null
          id: string
          progress_message: string | null
          prospect_count: number
          query: string
          status: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          enriched_count?: number
          error_message?: string | null
          id?: string
          progress_message?: string | null
          prospect_count?: number
          query: string
          status?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          enriched_count?: number
          error_message?: string | null
          id?: string
          progress_message?: string | null
          prospect_count?: number
          query?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_scrub_sessions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_stage_history: {
        Row: {
          changed_at: string
          chef_id: string
          from_stage: string | null
          id: string
          notes: string | null
          prospect_id: string
          to_stage: string
        }
        Insert: {
          changed_at?: string
          chef_id: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          prospect_id: string
          to_stage: string
        }
        Update: {
          changed_at?: string
          chef_id?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          prospect_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_stage_history_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_stage_history_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          address: string | null
          ai_call_script: string | null
          annual_events_estimate: string | null
          approach_strategy: string | null
          avg_event_budget: string | null
          best_time_to_call: string | null
          call_count: number
          category: string
          chef_id: string
          city: string | null
          competitors_present: string | null
          contact_direct_email: string | null
          contact_direct_phone: string | null
          contact_person: string | null
          contact_title: string | null
          converted_at: string | null
          converted_to_inquiry_id: string | null
          created_at: string
          description: string | null
          draft_email: string | null
          email: string | null
          enrichment_sources: string[] | null
          event_signals: string | null
          event_types_hosted: string[] | null
          follow_up_sequence: Json | null
          gatekeeper_name: string | null
          gatekeeper_notes: string | null
          id: string
          last_called_at: string | null
          last_enriched_at: string | null
          last_outcome: string | null
          latitude: number | null
          lead_score: number | null
          longitude: number | null
          lookalike_source_id: string | null
          luxury_indicators: string[] | null
          membership_size: string | null
          name: string
          news_intel: string | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          pipeline_stage: string
          previous_lead_score: number | null
          priority: string
          prospect_type: string
          region: string | null
          scrub_session_id: string | null
          scrub_type: string
          seasonal_notes: string | null
          social_profiles: Json
          source: string
          state: string | null
          status: string
          tags: string[]
          talking_points: string | null
          updated_at: string
          verified: boolean
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_call_script?: string | null
          annual_events_estimate?: string | null
          approach_strategy?: string | null
          avg_event_budget?: string | null
          best_time_to_call?: string | null
          call_count?: number
          category?: string
          chef_id: string
          city?: string | null
          competitors_present?: string | null
          contact_direct_email?: string | null
          contact_direct_phone?: string | null
          contact_person?: string | null
          contact_title?: string | null
          converted_at?: string | null
          converted_to_inquiry_id?: string | null
          created_at?: string
          description?: string | null
          draft_email?: string | null
          email?: string | null
          enrichment_sources?: string[] | null
          event_signals?: string | null
          event_types_hosted?: string[] | null
          follow_up_sequence?: Json | null
          gatekeeper_name?: string | null
          gatekeeper_notes?: string | null
          id?: string
          last_called_at?: string | null
          last_enriched_at?: string | null
          last_outcome?: string | null
          latitude?: number | null
          lead_score?: number | null
          longitude?: number | null
          lookalike_source_id?: string | null
          luxury_indicators?: string[] | null
          membership_size?: string | null
          name: string
          news_intel?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string
          previous_lead_score?: number | null
          priority?: string
          prospect_type?: string
          region?: string | null
          scrub_session_id?: string | null
          scrub_type?: string
          seasonal_notes?: string | null
          social_profiles?: Json
          source?: string
          state?: string | null
          status?: string
          tags?: string[]
          talking_points?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_call_script?: string | null
          annual_events_estimate?: string | null
          approach_strategy?: string | null
          avg_event_budget?: string | null
          best_time_to_call?: string | null
          call_count?: number
          category?: string
          chef_id?: string
          city?: string | null
          competitors_present?: string | null
          contact_direct_email?: string | null
          contact_direct_phone?: string | null
          contact_person?: string | null
          contact_title?: string | null
          converted_at?: string | null
          converted_to_inquiry_id?: string | null
          created_at?: string
          description?: string | null
          draft_email?: string | null
          email?: string | null
          enrichment_sources?: string[] | null
          event_signals?: string | null
          event_types_hosted?: string[] | null
          follow_up_sequence?: Json | null
          gatekeeper_name?: string | null
          gatekeeper_notes?: string | null
          id?: string
          last_called_at?: string | null
          last_enriched_at?: string | null
          last_outcome?: string | null
          latitude?: number | null
          lead_score?: number | null
          longitude?: number | null
          lookalike_source_id?: string | null
          luxury_indicators?: string[] | null
          membership_size?: string | null
          name?: string
          news_intel?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string
          previous_lead_score?: number | null
          priority?: string
          prospect_type?: string
          region?: string | null
          scrub_session_id?: string | null
          scrub_type?: string
          seasonal_notes?: string | null
          social_profiles?: Json
          source?: string
          state?: string | null
          status?: string
          tags?: string[]
          talking_points?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_converted_to_inquiry_id_fkey"
            columns: ["converted_to_inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_lookalike_source_id_fkey"
            columns: ["lookalike_source_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_scrub_session_id_fkey"
            columns: ["scrub_session_id"]
            isOneToOne: false
            referencedRelation: "prospect_scrub_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          actual_total_cents: number | null
          actual_unit_price_cents: number | null
          created_at: string
          damage_notes: string | null
          damage_photo_url: string | null
          estimated_total_cents: number | null
          estimated_unit_price_cents: number | null
          expiry_date: string | null
          id: string
          ingredient_id: string | null
          ingredient_name: string
          is_damaged: boolean
          is_received: boolean
          is_shorted: boolean
          lot_number: string | null
          notes: string | null
          ordered_qty: number
          purchase_order_id: string
          received_at: string | null
          received_qty: number | null
          unit: string
        }
        Insert: {
          actual_total_cents?: number | null
          actual_unit_price_cents?: number | null
          created_at?: string
          damage_notes?: string | null
          damage_photo_url?: string | null
          estimated_total_cents?: number | null
          estimated_unit_price_cents?: number | null
          expiry_date?: string | null
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          is_damaged?: boolean
          is_received?: boolean
          is_shorted?: boolean
          lot_number?: string | null
          notes?: string | null
          ordered_qty: number
          purchase_order_id: string
          received_at?: string | null
          received_qty?: number | null
          unit: string
        }
        Update: {
          actual_total_cents?: number | null
          actual_unit_price_cents?: number | null
          created_at?: string
          damage_notes?: string | null
          damage_photo_url?: string | null
          estimated_total_cents?: number | null
          estimated_unit_price_cents?: number | null
          expiry_date?: string | null
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          is_damaged?: boolean
          is_received?: boolean
          is_shorted?: boolean
          lot_number?: string | null
          notes?: string | null
          ordered_qty?: number
          purchase_order_id?: string
          received_at?: string | null
          received_qty?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_total_cents: number | null
          chef_id: string
          created_at: string
          created_by: string | null
          delivery_location_id: string | null
          estimated_total_cents: number
          event_id: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string | null
          photo_url: string | null
          po_number: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          submitted_at: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          actual_total_cents?: number | null
          chef_id: string
          created_at?: string
          created_by?: string | null
          delivery_location_id?: string | null
          estimated_total_cents?: number
          event_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          photo_url?: string | null
          po_number?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          submitted_at?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          actual_total_cents?: number | null
          chef_id?: string
          created_at?: string
          created_by?: string | null
          delivery_location_id?: string | null
          estimated_total_cents?: number
          event_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          photo_url?: string | null
          po_number?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          submitted_at?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "purchase_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "purchase_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "purchase_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          auth_user_id: string
          created_at: string
          device_label: string | null
          endpoint: string
          failed_count: number
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_key: string
          auth_user_id: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          failed_count?: number
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_key?: string
          auth_user_id?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          failed_count?: number
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      qol_metric_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          metric_key: string
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          metric_key: string
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          metric_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qol_metric_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_selected_addons: {
        Row: {
          addon_id: string
          created_at: string
          price_cents_snapshot: number
          quote_id: string
          tenant_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          price_cents_snapshot?: number
          quote_id: string
          tenant_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          price_cents_snapshot?: number
          quote_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_selected_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "proposal_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_selected_addons_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_selected_addons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_state_transitions: {
        Row: {
          from_status: Database["public"]["Enums"]["quote_status"] | null
          id: string
          metadata: Json | null
          quote_id: string
          reason: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["quote_status"]
          transitioned_at: string
          transitioned_by: string | null
        }
        Insert: {
          from_status?: Database["public"]["Enums"]["quote_status"] | null
          id?: string
          metadata?: Json | null
          quote_id: string
          reason?: string | null
          tenant_id: string
          to_status: Database["public"]["Enums"]["quote_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Update: {
          from_status?: Database["public"]["Enums"]["quote_status"] | null
          id?: string
          metadata?: Json | null
          quote_id?: string
          reason?: string | null
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["quote_status"]
          transitioned_at?: string
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_state_transitions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_state_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deposit_amount_cents: number | null
          deposit_percentage: number | null
          deposit_required: boolean
          event_id: string | null
          expired_at: string | null
          expiry_warning_sent_at: string | null
          guest_count_estimated: number | null
          id: string
          inquiry_id: string | null
          internal_notes: string | null
          is_superseded: boolean
          lost_notes: string | null
          lost_reason: string | null
          lost_recorded_at: string | null
          negotiation_occurred: boolean
          original_quoted_cents: number | null
          previous_version_id: string | null
          price_per_person_cents: number | null
          pricing_model: Database["public"]["Enums"]["pricing_model"]
          pricing_notes: string | null
          pricing_snapshot: Json | null
          quote_name: string | null
          rejected_at: string | null
          rejected_reason: string | null
          sent_at: string | null
          snapshot_frozen: boolean
          status: Database["public"]["Enums"]["quote_status"]
          tenant_id: string
          total_quoted_cents: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          version: number
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_amount_cents?: number | null
          deposit_percentage?: number | null
          deposit_required?: boolean
          event_id?: string | null
          expired_at?: string | null
          expiry_warning_sent_at?: string | null
          guest_count_estimated?: number | null
          id?: string
          inquiry_id?: string | null
          internal_notes?: string | null
          is_superseded?: boolean
          lost_notes?: string | null
          lost_reason?: string | null
          lost_recorded_at?: string | null
          negotiation_occurred?: boolean
          original_quoted_cents?: number | null
          previous_version_id?: string | null
          price_per_person_cents?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          pricing_notes?: string | null
          pricing_snapshot?: Json | null
          quote_name?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          snapshot_frozen?: boolean
          status?: Database["public"]["Enums"]["quote_status"]
          tenant_id: string
          total_quoted_cents: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_amount_cents?: number | null
          deposit_percentage?: number | null
          deposit_required?: boolean
          event_id?: string | null
          expired_at?: string | null
          expiry_warning_sent_at?: string | null
          guest_count_estimated?: number | null
          id?: string
          inquiry_id?: string | null
          internal_notes?: string | null
          is_superseded?: boolean
          lost_notes?: string | null
          lost_reason?: string | null
          lost_recorded_at?: string | null
          negotiation_occurred?: boolean
          original_quoted_cents?: number | null
          previous_version_id?: string | null
          price_per_person_cents?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          pricing_notes?: string | null
          pricing_snapshot?: Json | null
          quote_name?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          snapshot_frozen?: boolean
          status?: Database["public"]["Enums"]["quote_status"]
          tenant_id?: string
          total_quoted_cents?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_entries: {
        Row: {
          alias_emoji: string
          client_id: string
          created_at: string
          entry_date: string
          game_score: number
          id: string
          round_id: string
          source: Database["public"]["Enums"]["raffle_entry_source"]
          tenant_id: string
        }
        Insert: {
          alias_emoji: string
          client_id: string
          created_at?: string
          entry_date?: string
          game_score?: number
          id?: string
          round_id: string
          source?: Database["public"]["Enums"]["raffle_entry_source"]
          tenant_id: string
        }
        Update: {
          alias_emoji?: string
          client_id?: string
          created_at?: string
          entry_date?: string
          game_score?: number
          id?: string
          round_id?: string
          source?: Database["public"]["Enums"]["raffle_entry_source"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "raffle_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "raffle_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_rounds: {
        Row: {
          created_at: string
          created_by: string | null
          draw_seed: string | null
          drawn_at: string | null
          id: string
          month_end: string
          month_label: string
          month_start: string
          most_dedicated_alias: string | null
          most_dedicated_client_id: string | null
          most_dedicated_entry_count: number | null
          prize_delivered: boolean
          prize_delivered_at: string | null
          prize_description: string
          prize_most_dedicated: string | null
          prize_most_dedicated_delivered: boolean
          prize_most_dedicated_delivered_at: string | null
          prize_random_delivered: boolean
          prize_random_delivered_at: string | null
          prize_random_draw: string | null
          prize_top_scorer: string | null
          prize_top_scorer_delivered: boolean
          prize_top_scorer_delivered_at: string | null
          status: Database["public"]["Enums"]["raffle_round_status"]
          tenant_id: string
          top_scorer_alias: string | null
          top_scorer_client_id: string | null
          top_scorer_entry_id: string | null
          top_scorer_score: number | null
          total_entries_at_draw: number | null
          total_participants_at_draw: number | null
          updated_at: string
          winner_alias: string | null
          winner_client_id: string | null
          winner_entry_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          draw_seed?: string | null
          drawn_at?: string | null
          id?: string
          month_end: string
          month_label: string
          month_start: string
          most_dedicated_alias?: string | null
          most_dedicated_client_id?: string | null
          most_dedicated_entry_count?: number | null
          prize_delivered?: boolean
          prize_delivered_at?: string | null
          prize_description: string
          prize_most_dedicated?: string | null
          prize_most_dedicated_delivered?: boolean
          prize_most_dedicated_delivered_at?: string | null
          prize_random_delivered?: boolean
          prize_random_delivered_at?: string | null
          prize_random_draw?: string | null
          prize_top_scorer?: string | null
          prize_top_scorer_delivered?: boolean
          prize_top_scorer_delivered_at?: string | null
          status?: Database["public"]["Enums"]["raffle_round_status"]
          tenant_id: string
          top_scorer_alias?: string | null
          top_scorer_client_id?: string | null
          top_scorer_entry_id?: string | null
          top_scorer_score?: number | null
          total_entries_at_draw?: number | null
          total_participants_at_draw?: number | null
          updated_at?: string
          winner_alias?: string | null
          winner_client_id?: string | null
          winner_entry_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          draw_seed?: string | null
          drawn_at?: string | null
          id?: string
          month_end?: string
          month_label?: string
          month_start?: string
          most_dedicated_alias?: string | null
          most_dedicated_client_id?: string | null
          most_dedicated_entry_count?: number | null
          prize_delivered?: boolean
          prize_delivered_at?: string | null
          prize_description?: string
          prize_most_dedicated?: string | null
          prize_most_dedicated_delivered?: boolean
          prize_most_dedicated_delivered_at?: string | null
          prize_random_delivered?: boolean
          prize_random_delivered_at?: string | null
          prize_random_draw?: string | null
          prize_top_scorer?: string | null
          prize_top_scorer_delivered?: boolean
          prize_top_scorer_delivered_at?: string | null
          status?: Database["public"]["Enums"]["raffle_round_status"]
          tenant_id?: string
          top_scorer_alias?: string | null
          top_scorer_client_id?: string | null
          top_scorer_entry_id?: string | null
          top_scorer_score?: number | null
          total_entries_at_draw?: number | null
          total_participants_at_draw?: number | null
          updated_at?: string
          winner_alias?: string | null
          winner_client_id?: string | null
          winner_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffle_rounds_most_dedicated_client_id_fkey"
            columns: ["most_dedicated_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "raffle_rounds_most_dedicated_client_id_fkey"
            columns: ["most_dedicated_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_rounds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_rounds_top_scorer_client_id_fkey"
            columns: ["top_scorer_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "raffle_rounds_top_scorer_client_id_fkey"
            columns: ["top_scorer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_rounds_top_scorer_entry_id_fkey"
            columns: ["top_scorer_entry_id"]
            isOneToOne: false
            referencedRelation: "raffle_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_rounds_winner_client_id_fkey"
            columns: ["winner_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "raffle_rounds_winner_client_id_fkey"
            columns: ["winner_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_rounds_winner_entry_id_fkey"
            columns: ["winner_entry_id"]
            isOneToOne: false
            referencedRelation: "raffle_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_extractions: {
        Row: {
          created_at: string
          extraction_confidence: number | null
          id: string
          payment_method: string | null
          purchase_date: string | null
          receipt_photo_id: string
          store_location: string | null
          store_name: string | null
          subtotal_cents: number | null
          tax_cents: number | null
          tenant_id: string
          total_cents: number | null
        }
        Insert: {
          created_at?: string
          extraction_confidence?: number | null
          id?: string
          payment_method?: string | null
          purchase_date?: string | null
          receipt_photo_id: string
          store_location?: string | null
          store_name?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          tenant_id: string
          total_cents?: number | null
        }
        Update: {
          created_at?: string
          extraction_confidence?: number | null
          id?: string
          payment_method?: string | null
          purchase_date?: string | null
          receipt_photo_id?: string
          store_location?: string | null
          store_name?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          tenant_id?: string
          total_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_extractions_receipt_photo_id_fkey"
            columns: ["receipt_photo_id"]
            isOneToOne: false
            referencedRelation: "receipt_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_extractions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_line_items: {
        Row: {
          created_at: string
          description: string
          event_id: string | null
          expense_tag: string
          id: string
          ingredient_category: string | null
          price_cents: number | null
          receipt_extraction_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description: string
          event_id?: string | null
          expense_tag?: string
          id?: string
          ingredient_category?: string | null
          price_cents?: number | null
          receipt_extraction_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string
          event_id?: string | null
          expense_tag?: string
          id?: string
          ingredient_category?: string | null
          price_cents?: number | null
          receipt_extraction_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_line_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "receipt_line_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "receipt_line_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "receipt_line_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_receipt_extraction_id_fkey"
            columns: ["receipt_extraction_id"]
            isOneToOne: false
            referencedRelation: "receipt_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_photos: {
        Row: {
          approved_at: string | null
          client_id: string | null
          created_at: string
          event_id: string | null
          id: string
          notes: string | null
          ocr_raw: string | null
          photo_url: string
          storage_path: string | null
          tenant_id: string
          upload_status: string
        }
        Insert: {
          approved_at?: string | null
          client_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          ocr_raw?: string | null
          photo_url: string
          storage_path?: string | null
          tenant_id: string
          upload_status?: string
        }
        Update: {
          approved_at?: string | null
          client_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          ocr_raw?: string | null
          photo_url?: string
          storage_path?: string | null
          tenant_id?: string
          upload_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "receipt_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "receipt_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "receipt_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "receipt_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          is_optional: boolean
          preparation_notes: string | null
          quantity: number
          recipe_id: string
          sort_order: number
          substitution_notes: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          is_optional?: boolean
          preparation_notes?: string | null
          quantity: number
          recipe_id: string
          sort_order?: number
          substitution_notes?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          is_optional?: boolean
          preparation_notes?: string | null
          quantity?: number
          recipe_id?: string
          sort_order?: number
          substitution_notes?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_production_log: {
        Row: {
          batch_notes: string | null
          best_before: string | null
          created_at: string
          discard_at: string | null
          event_id: string | null
          id: string
          produced_at: string
          produced_by: string | null
          quantity: number
          recipe_id: string
          tenant_id: string
          unit: string
        }
        Insert: {
          batch_notes?: string | null
          best_before?: string | null
          created_at?: string
          discard_at?: string | null
          event_id?: string | null
          id?: string
          produced_at?: string
          produced_by?: string | null
          quantity: number
          recipe_id: string
          tenant_id: string
          unit?: string
        }
        Update: {
          batch_notes?: string | null
          best_before?: string | null
          created_at?: string
          discard_at?: string | null
          event_id?: string | null
          id?: string
          produced_at?: string
          produced_by?: string | null
          quantity?: number
          recipe_id?: string
          tenant_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_production_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "recipe_production_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "recipe_production_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "recipe_production_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_production_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_production_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_production_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_shares: {
        Row: {
          created_at: string
          created_recipe_id: string | null
          from_chef_id: string
          id: string
          note: string | null
          original_recipe_id: string
          responded_at: string | null
          status: string
          to_chef_id: string
        }
        Insert: {
          created_at?: string
          created_recipe_id?: string | null
          from_chef_id: string
          id?: string
          note?: string | null
          original_recipe_id: string
          responded_at?: string | null
          status?: string
          to_chef_id: string
        }
        Update: {
          created_at?: string
          created_recipe_id?: string | null
          from_chef_id?: string
          id?: string
          note?: string | null
          original_recipe_id?: string
          responded_at?: string | null
          status?: string
          to_chef_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_shares_created_recipe_id_fkey"
            columns: ["created_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_shares_created_recipe_id_fkey"
            columns: ["created_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_shares_from_chef_id_fkey"
            columns: ["from_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_shares_original_recipe_id_fkey"
            columns: ["original_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_shares_original_recipe_id_fkey"
            columns: ["original_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_shares_to_chef_id_fkey"
            columns: ["to_chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_sub_recipes: {
        Row: {
          child_recipe_id: string
          created_at: string
          id: string
          notes: string | null
          parent_recipe_id: string
          quantity: number
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          child_recipe_id: string
          created_at?: string
          id?: string
          notes?: string | null
          parent_recipe_id: string
          quantity?: number
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          child_recipe_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          parent_recipe_id?: string
          quantity?: number
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_sub_recipes_child_recipe_id_fkey"
            columns: ["child_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_sub_recipes_child_recipe_id_fkey"
            columns: ["child_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_sub_recipes_parent_recipe_id_fkey"
            columns: ["parent_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_sub_recipes_parent_recipe_id_fkey"
            columns: ["parent_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          adaptations: string | null
          archived: boolean
          archived_at: string | null
          calories_per_serving: number | null
          calories_total: number | null
          carbs_per_serving_g: number | null
          carbs_total_g: number | null
          category: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes: number | null
          created_at: string
          created_by: string | null
          cuisine: Database["public"]["Enums"]["recipe_cuisine"] | null
          description: string | null
          dietary_tags: string[]
          difficulty: number | null
          equipment: string[]
          fat_per_serving_g: number | null
          fat_total_g: number | null
          fiber_per_serving_g: number | null
          fiber_total_g: number | null
          id: string
          last_cooked_at: string | null
          meal_type: Database["public"]["Enums"]["recipe_meal_type"] | null
          method: string
          method_detailed: string | null
          name: string
          notes: string | null
          nutrition_calculated_at: string | null
          nutrition_snapshot_json: Json | null
          occasion_tags: string[] | null
          photo_url: string | null
          prep_time_minutes: number | null
          protein_per_serving_g: number | null
          protein_total_g: number | null
          season: string[] | null
          servings: number | null
          sodium_per_serving_mg: number | null
          sodium_total_mg: number | null
          tenant_id: string
          times_cooked: number
          total_time_minutes: number | null
          updated_at: string
          updated_by: string | null
          yield_description: string | null
          yield_quantity: number | null
          yield_unit: string | null
        }
        Insert: {
          adaptations?: string | null
          archived?: boolean
          archived_at?: string | null
          calories_per_serving?: number | null
          calories_total?: number | null
          carbs_per_serving_g?: number | null
          carbs_total_g?: number | null
          category: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          cuisine?: Database["public"]["Enums"]["recipe_cuisine"] | null
          description?: string | null
          dietary_tags?: string[]
          difficulty?: number | null
          equipment?: string[]
          fat_per_serving_g?: number | null
          fat_total_g?: number | null
          fiber_per_serving_g?: number | null
          fiber_total_g?: number | null
          id?: string
          last_cooked_at?: string | null
          meal_type?: Database["public"]["Enums"]["recipe_meal_type"] | null
          method: string
          method_detailed?: string | null
          name: string
          notes?: string | null
          nutrition_calculated_at?: string | null
          nutrition_snapshot_json?: Json | null
          occasion_tags?: string[] | null
          photo_url?: string | null
          prep_time_minutes?: number | null
          protein_per_serving_g?: number | null
          protein_total_g?: number | null
          season?: string[] | null
          servings?: number | null
          sodium_per_serving_mg?: number | null
          sodium_total_mg?: number | null
          tenant_id: string
          times_cooked?: number
          total_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
          yield_description?: string | null
          yield_quantity?: number | null
          yield_unit?: string | null
        }
        Update: {
          adaptations?: string | null
          archived?: boolean
          archived_at?: string | null
          calories_per_serving?: number | null
          calories_total?: number | null
          carbs_per_serving_g?: number | null
          carbs_total_g?: number | null
          category?: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          cuisine?: Database["public"]["Enums"]["recipe_cuisine"] | null
          description?: string | null
          dietary_tags?: string[]
          difficulty?: number | null
          equipment?: string[]
          fat_per_serving_g?: number | null
          fat_total_g?: number | null
          fiber_per_serving_g?: number | null
          fiber_total_g?: number | null
          id?: string
          last_cooked_at?: string | null
          meal_type?: Database["public"]["Enums"]["recipe_meal_type"] | null
          method?: string
          method_detailed?: string | null
          name?: string
          notes?: string | null
          nutrition_calculated_at?: string | null
          nutrition_snapshot_json?: Json | null
          occasion_tags?: string[] | null
          photo_url?: string | null
          prep_time_minutes?: number | null
          protein_per_serving_g?: number | null
          protein_total_g?: number | null
          season?: string[] | null
          servings?: number | null
          sodium_per_serving_mg?: number | null
          sodium_total_mg?: number | null
          tenant_id?: string
          times_cooked?: number
          total_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
          yield_description?: string | null
          yield_quantity?: number | null
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          amount_cents: number
          chef_id: string
          client_id: string
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          late_fee_cents: number
          late_fee_days: number
          next_send_date: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          chef_id: string
          client_id: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          late_fee_cents?: number
          late_fee_days?: number
          next_send_date?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          chef_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          late_fee_cents?: number
          late_fee_days?: number
          next_send_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "recurring_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_services: {
        Row: {
          chef_id: string
          client_id: string
          created_at: string
          day_of_week: Json | null
          end_date: string | null
          frequency: string
          id: string
          notes: string | null
          rate_cents: number
          service_type: string
          start_date: string
          status: string
          typical_guest_count: number | null
          updated_at: string
        }
        Insert: {
          chef_id: string
          client_id: string
          created_at?: string
          day_of_week?: Json | null
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          rate_cents: number
          service_type?: string
          start_date: string
          status?: string
          typical_guest_count?: number | null
          updated_at?: string
        }
        Update: {
          chef_id?: string
          client_id?: string
          created_at?: string
          day_of_week?: Json | null
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          rate_cents?: number
          service_type?: string
          start_date?: string
          status?: string
          typical_guest_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_services_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "recurring_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_partners: {
        Row: {
          acquisition_source: string | null
          auth_user_id: string | null
          booking_url: string | null
          claimed_at: string | null
          commission_notes: string | null
          contact_name: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          invite_sent_at: string | null
          invite_token: string | null
          is_showcase_visible: boolean
          name: string
          notes: string | null
          origin_client_id: string | null
          origin_event_id: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          phone: string | null
          share_token: string | null
          showcase_order: number | null
          status: Database["public"]["Enums"]["partner_status"]
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          acquisition_source?: string | null
          auth_user_id?: string | null
          booking_url?: string | null
          claimed_at?: string | null
          commission_notes?: string | null
          contact_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          invite_sent_at?: string | null
          invite_token?: string | null
          is_showcase_visible?: boolean
          name: string
          notes?: string | null
          origin_client_id?: string | null
          origin_event_id?: string | null
          partner_type?: Database["public"]["Enums"]["partner_type"]
          phone?: string | null
          share_token?: string | null
          showcase_order?: number | null
          status?: Database["public"]["Enums"]["partner_status"]
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          acquisition_source?: string | null
          auth_user_id?: string | null
          booking_url?: string | null
          claimed_at?: string | null
          commission_notes?: string | null
          contact_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          invite_sent_at?: string | null
          invite_token?: string | null
          is_showcase_visible?: boolean
          name?: string
          notes?: string | null
          origin_client_id?: string | null
          origin_event_id?: string | null
          partner_type?: Database["public"]["Enums"]["partner_type"]
          phone?: string | null
          share_token?: string | null
          showcase_order?: number | null
          status?: Database["public"]["Enums"]["partner_status"]
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_partners_origin_client_id_fkey"
            columns: ["origin_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "referral_partners_origin_client_id_fkey"
            columns: ["origin_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_partners_origin_event_id_fkey"
            columns: ["origin_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "referral_partners_origin_event_id_fkey"
            columns: ["origin_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "referral_partners_origin_event_id_fkey"
            columns: ["origin_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "referral_partners_origin_event_id_fkey"
            columns: ["origin_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      register_sessions: {
        Row: {
          cash_variance_cents: number | null
          close_notes: string | null
          closed_at: string | null
          closed_by: string | null
          closing_cash_cents: number | null
          created_at: string
          expected_cash_cents: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_cash_cents: number
          session_name: string | null
          status: Database["public"]["Enums"]["register_session_status"]
          suspended_at: string | null
          tenant_id: string
          total_revenue_cents: number
          total_sales_count: number
          total_tips_cents: number
          updated_at: string
        }
        Insert: {
          cash_variance_cents?: number | null
          close_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_cents?: number | null
          created_at?: string
          expected_cash_cents?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_cash_cents?: number
          session_name?: string | null
          status?: Database["public"]["Enums"]["register_session_status"]
          suspended_at?: string | null
          tenant_id: string
          total_revenue_cents?: number
          total_sales_count?: number
          total_tips_cents?: number
          updated_at?: string
        }
        Update: {
          cash_variance_cents?: number | null
          close_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_cents?: number | null
          created_at?: string
          expected_cash_cents?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_cash_cents?: number
          session_name?: string | null
          status?: Database["public"]["Enums"]["register_session_status"]
          suspended_at?: string | null
          tenant_id?: string
          total_revenue_cents?: number
          total_sales_count?: number
          total_tips_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "register_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_abuse_log: {
        Row: {
          auth_user_id: string
          blocked_message: string
          category: string
          created_at: string
          guardrail_matched: string | null
          id: string
          reviewed_by_admin: boolean
          severity: string
          tenant_id: string
          user_blocked: boolean
        }
        Insert: {
          auth_user_id: string
          blocked_message: string
          category: string
          created_at?: string
          guardrail_matched?: string | null
          id?: string
          reviewed_by_admin?: boolean
          severity: string
          tenant_id: string
          user_blocked?: boolean
        }
        Update: {
          auth_user_id?: string
          blocked_message?: string
          category?: string
          created_at?: string
          guardrail_matched?: string | null
          id?: string
          reviewed_by_admin?: boolean
          severity?: string
          tenant_id?: string
          user_blocked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "remy_abuse_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_artifacts: {
        Row: {
          artifact_type: string
          content: string | null
          created_at: string
          data: Json | null
          id: string
          pinned: boolean
          related_client_id: string | null
          related_event_id: string | null
          source_message: string | null
          source_task_type: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          artifact_type?: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          pinned?: boolean
          related_client_id?: string | null
          related_event_id?: string | null
          source_message?: string | null
          source_task_type?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          artifact_type?: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          pinned?: boolean
          related_client_id?: string | null
          related_event_id?: string | null
          source_message?: string | null
          source_task_type?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remy_artifacts_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "remy_artifacts_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remy_artifacts_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "remy_artifacts_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "remy_artifacts_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "remy_artifacts_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remy_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_conversations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remy_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_feedback: {
        Row: {
          archetype_id: string | null
          chef_id: string
          created_at: string
          feedback_type: string | null
          id: string
          notes: string | null
          rating: string
          remy_response: string
          response_time_ms: number | null
          tenant_id: string
          user_message: string
        }
        Insert: {
          archetype_id?: string | null
          chef_id: string
          created_at?: string
          feedback_type?: string | null
          id?: string
          notes?: string | null
          rating: string
          remy_response: string
          response_time_ms?: number | null
          tenant_id: string
          user_message: string
        }
        Update: {
          archetype_id?: string | null
          chef_id?: string
          created_at?: string
          feedback_type?: string | null
          id?: string
          notes?: string | null
          rating?: string
          remy_response?: string
          response_time_ms?: number | null
          tenant_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "remy_feedback_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remy_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_memories: {
        Row: {
          access_count: number
          category: string
          content: string
          content_hash: string
          created_at: string
          id: string
          importance: number
          is_active: boolean
          last_accessed_at: string
          related_client_id: string | null
          related_event_id: string | null
          source_artifact_id: string | null
          source_message: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_count?: number
          category: string
          content: string
          content_hash: string
          created_at?: string
          id?: string
          importance?: number
          is_active?: boolean
          last_accessed_at?: string
          related_client_id?: string | null
          related_event_id?: string | null
          source_artifact_id?: string | null
          source_message?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_count?: number
          category?: string
          content?: string
          content_hash?: string
          created_at?: string
          id?: string
          importance?: number
          is_active?: boolean
          last_accessed_at?: string
          related_client_id?: string | null
          related_event_id?: string | null
          source_artifact_id?: string | null
          source_message?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remy_memories_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "remy_memories_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remy_memories_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "remy_memories_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "remy_memories_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "remy_memories_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remy_memories_source_artifact_id_fkey"
            columns: ["source_artifact_id"]
            isOneToOne: false
            referencedRelation: "remy_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remy_memories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          nav_suggestions: Json | null
          role: string
          tasks: Json | null
          tenant_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          nav_suggestions?: Json | null
          role: string
          tasks?: Json | null
          tenant_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          nav_suggestions?: Json | null
          role?: string
          tasks?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remy_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "remy_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remy_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_support_shares: {
        Row: {
          conversation_json: Json
          created_at: string
          id: string
          resolved_at: string | null
          status: string
          support_note: string | null
          tenant_id: string
        }
        Insert: {
          conversation_json: Json
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          support_note?: string | null
          tenant_id: string
        }
        Update: {
          conversation_json?: Json
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          support_note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remy_support_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      remy_usage_metrics: {
        Row: {
          avg_response_time_ms: number | null
          conversation_count: number
          created_at: string
          error_count: number
          feature_category: string | null
          id: string
          message_count: number
          metric_date: string
          model_version: string | null
          tenant_id: string
        }
        Insert: {
          avg_response_time_ms?: number | null
          conversation_count?: number
          created_at?: string
          error_count?: number
          feature_category?: string | null
          id?: string
          message_count?: number
          metric_date?: string
          model_version?: string | null
          tenant_id: string
        }
        Update: {
          avg_response_time_ms?: number | null
          conversation_count?: number
          created_at?: string
          error_count?: number
          feature_category?: string | null
          id?: string
          message_count?: number
          metric_date?: string
          model_version?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remy_usage_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      response_templates: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          merge_tags: string[]
          name: string
          subject: string
          template_text: string
          tenant_id: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          merge_tags?: string[]
          name: string
          subject?: string
          template_text: string
          tenant_id: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          merge_tags?: string[]
          name?: string
          subject?: string
          template_text?: string
          tenant_id?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "response_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      retainer_periods: {
        Row: {
          amount_cents: number
          created_at: string
          events_used: number
          hours_used: number
          id: string
          ledger_entry_id: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          retainer_id: string
          status: string
          stripe_invoice_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          events_used?: number
          hours_used?: number
          id?: string
          ledger_entry_id?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          retainer_id: string
          status?: string
          stripe_invoice_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          events_used?: number
          hours_used?: number
          id?: string
          ledger_entry_id?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          retainer_id?: string
          status?: string
          stripe_invoice_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retainer_periods_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "retainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      retainers: {
        Row: {
          amount_cents: number
          billing_cycle: string
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          includes_events_count: number | null
          includes_hours: number | null
          name: string
          next_billing_date: string | null
          notes: string | null
          start_date: string
          status: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          terms_summary: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          billing_cycle?: string
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          includes_events_count?: number | null
          includes_hours?: number | null
          name: string
          next_billing_date?: string | null
          notes?: string | null
          start_date: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          terms_summary?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billing_cycle?: string
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          includes_events_count?: number | null
          includes_hours?: number | null
          name?: string
          next_billing_date?: string | null
          notes?: string | null
          start_date?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          terms_summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retainers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "retainers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      retirement_contributions: {
        Row: {
          account_type: string
          chef_id: string
          contributed_at: string | null
          contribution_cents: number
          created_at: string
          id: string
          notes: string | null
          tax_year: number
          updated_at: string
        }
        Insert: {
          account_type: string
          chef_id: string
          contributed_at?: string | null
          contribution_cents: number
          created_at?: string
          id?: string
          notes?: string | null
          tax_year: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          chef_id?: string
          contributed_at?: string | null
          contribution_cents?: number
          created_at?: string
          id?: string
          notes?: string | null
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retirement_contributions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_reminder_log: {
        Row: {
          created_at: string
          delivery_channel: string
          event_id: string
          guest_id: string
          id: string
          recipient_email: string | null
          reminder_key: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          delivery_channel?: string
          event_id: string
          guest_id: string
          id?: string
          recipient_email?: string | null
          reminder_key: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          delivery_channel?: string
          event_id?: string
          guest_id?: string
          id?: string
          recipient_email?: string | null
          reminder_key?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_reminder_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rsvp_reminder_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rsvp_reminder_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rsvp_reminder_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_reminder_log_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_reminder_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          discount_cents: number
          id: string
          inventory_deducted: boolean
          line_total_cents: number
          modifiers_applied: Json | null
          name: string
          product_projection_id: string | null
          quantity: number
          sale_id: string
          sku: string | null
          sort_order: number
          tax_cents: number
          tax_class: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          unit_cost_cents: number | null
          unit_price_cents: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount_cents?: number
          id?: string
          inventory_deducted?: boolean
          line_total_cents: number
          modifiers_applied?: Json | null
          name: string
          product_projection_id?: string | null
          quantity?: number
          sale_id: string
          sku?: string | null
          sort_order?: number
          tax_cents?: number
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id: string
          unit_cost_cents?: number | null
          unit_price_cents: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount_cents?: number
          id?: string
          inventory_deducted?: boolean
          line_total_cents?: number
          modifiers_applied?: Json | null
          name?: string
          product_projection_id?: string | null
          quantity?: number
          sale_id?: string
          sku?: string | null
          sort_order?: number
          tax_cents?: number
          tax_class?: Database["public"]["Enums"]["tax_class"]
          tenant_id?: string
          unit_cost_cents?: number | null
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_projection_id_fkey"
            columns: ["product_projection_id"]
            isOneToOne: false
            referencedRelation: "product_projections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_financial_summary"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          channel: Database["public"]["Enums"]["sale_channel"]
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_cents: number
          event_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          register_session_id: string | null
          sale_number: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal_cents: number
          tax_cents: number
          tax_rate: number | null
          tax_zip_code: string | null
          tenant_id: string
          tip_cents: number
          total_cents: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_cents?: number
          event_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          register_session_id?: string | null
          sale_number?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal_cents?: number
          tax_cents?: number
          tax_rate?: number | null
          tax_zip_code?: string | null
          tenant_id: string
          tip_cents?: number
          total_cents?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_cents?: number
          event_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          register_session_id?: string | null
          sale_number?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal_cents?: number
          tax_cents?: number
          tax_rate?: number | null
          tax_zip_code?: string | null
          tenant_id?: string
          tip_cents?: number
          total_cents?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_tax_remittances: {
        Row: {
          amount_remitted_cents: number
          chef_id: string
          confirmation_number: string | null
          created_at: string
          id: string
          notes: string | null
          period: string
          period_end: string
          period_start: string
          remitted_at: string
        }
        Insert: {
          amount_remitted_cents: number
          chef_id: string
          confirmation_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period: string
          period_end: string
          period_start: string
          remitted_at: string
        }
        Update: {
          amount_remitted_cents?: number
          chef_id?: string
          confirmation_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period?: string
          period_end?: string
          period_start?: string
          remitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_tax_remittances_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_tax_settings: {
        Row: {
          chef_id: string
          created_at: string
          enabled: boolean
          filing_frequency: string
          id: string
          local_rate_bps: number
          notes: string | null
          registration_number: string | null
          state: string | null
          state_rate_bps: number
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          enabled?: boolean
          filing_frequency?: string
          id?: string
          local_rate_bps?: number
          notes?: string | null
          registration_number?: string | null
          state?: string | null
          state_rate_bps?: number
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          enabled?: boolean
          filing_frequency?: string
          id?: string
          local_rate_bps?: number
          notes?: string | null
          registration_number?: string | null
          state?: string | null
          state_rate_bps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_tax_settings_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_calls: {
        Row: {
          actual_duration_minutes: number | null
          agenda_items: Json
          call_notes: string | null
          call_type: string
          cancelled_at: string | null
          client_id: string | null
          client_notified_at: string | null
          completed_at: string | null
          contact_company: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          duration_minutes: number
          event_id: string | null
          id: string
          inquiry_id: string | null
          next_action: string | null
          next_action_due_at: string | null
          notify_client: boolean
          outcome_summary: string | null
          prep_notes: string | null
          prospect_id: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          scheduled_at: string
          status: string
          tenant_id: string
          timezone: string
          title: string | null
          updated_at: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          agenda_items?: Json
          call_notes?: string | null
          call_type: string
          cancelled_at?: string | null
          client_id?: string | null
          client_notified_at?: string | null
          completed_at?: string | null
          contact_company?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number
          event_id?: string | null
          id?: string
          inquiry_id?: string | null
          next_action?: string | null
          next_action_due_at?: string | null
          notify_client?: boolean
          outcome_summary?: string | null
          prep_notes?: string | null
          prospect_id?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          scheduled_at: string
          status?: string
          tenant_id: string
          timezone?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          actual_duration_minutes?: number | null
          agenda_items?: Json
          call_notes?: string | null
          call_type?: string
          cancelled_at?: string | null
          client_id?: string | null
          client_notified_at?: string | null
          completed_at?: string | null
          contact_company?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number
          event_id?: string | null
          id?: string
          inquiry_id?: string | null
          next_action?: string | null
          next_action_due_at?: string | null
          notify_client?: boolean
          outcome_summary?: string | null
          prep_notes?: string | null
          prospect_id?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          scheduled_at?: string
          status?: string
          tenant_id?: string
          timezone?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "scheduled_calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_calls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_calls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_calls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_palettes: {
        Row: {
          chef_energy_reality: string | null
          context_profiles: Json
          created_at: string
          created_by: string | null
          end_month_day: string
          id: string
          is_active: boolean
          micro_windows: Json
          pantry_and_preserve: string | null
          proven_wins: Json
          season_name: string
          sensory_anchor: string | null
          sort_order: number
          start_month_day: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chef_energy_reality?: string | null
          context_profiles?: Json
          created_at?: string
          created_by?: string | null
          end_month_day: string
          id?: string
          is_active?: boolean
          micro_windows?: Json
          pantry_and_preserve?: string | null
          proven_wins?: Json
          season_name: string
          sensory_anchor?: string | null
          sort_order?: number
          start_month_day: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chef_energy_reality?: string | null
          context_profiles?: Json
          created_at?: string
          created_by?: string | null
          end_month_day?: string
          id?: string
          is_active?: boolean
          micro_windows?: Json
          pantry_and_preserve?: string | null
          proven_wins?: Json
          season_name?: string
          sensory_anchor?: string | null
          sort_order?: number
          start_month_day?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_palettes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_enrollments: {
        Row: {
          cancelled_at: string | null
          chef_id: string
          client_id: string
          completed_at: string | null
          current_step: number
          enrolled_at: string
          id: string
          next_send_at: string
          sequence_id: string
        }
        Insert: {
          cancelled_at?: string | null
          chef_id: string
          client_id: string
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          next_send_at: string
          sequence_id: string
        }
        Update: {
          cancelled_at?: string | null
          chef_id?: string
          client_id?: string
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          next_send_at?: string
          sequence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sequence_enrollments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "automated_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          body_html: string
          created_at: string
          delay_days: number
          id: string
          sequence_id: string
          step_number: number
          subject: string
        }
        Insert: {
          body_html: string
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id: string
          step_number: number
          subject: string
        }
        Update: {
          body_html?: string
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id?: string
          step_number?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "automated_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      served_dish_history: {
        Row: {
          chef_id: string
          client_id: string
          client_reaction: string | null
          created_at: string
          dish_name: string
          event_id: string | null
          id: string
          notes: string | null
          recipe_id: string | null
          served_date: string
        }
        Insert: {
          chef_id: string
          client_id: string
          client_reaction?: string | null
          created_at?: string
          dish_name: string
          event_id?: string | null
          id?: string
          notes?: string | null
          recipe_id?: string | null
          served_date: string
        }
        Update: {
          chef_id?: string
          client_id?: string
          client_reaction?: string | null
          created_at?: string
          dish_name?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          recipe_id?: string | null
          served_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "served_dish_history_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "served_dish_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "served_dish_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "served_dish_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "served_dish_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "served_dish_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "served_dish_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "served_dish_history_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "served_dish_history_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_courses: {
        Row: {
          chef_id: string
          course_name: string
          course_number: number
          created_at: string
          event_id: string
          fired_at: string | null
          id: string
          served_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          course_name: string
          course_number: number
          created_at?: string
          event_id: string
          fired_at?: string | null
          id?: string
          served_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          course_name?: string
          course_number?: number
          created_at?: string
          event_id?: string
          fired_at?: string | null
          id?: string
          served_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_courses_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_courses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "service_courses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "service_courses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "service_courses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_records: {
        Row: {
          created_at: string
          fee_amount_cents: number
          gross_amount_cents: number
          id: string
          net_amount_cents: number
          notes: string | null
          payment_count: number
          payment_ids: Json
          payout_amount_cents: number
          payout_arrival_date: string | null
          payout_currency: string
          payout_status: string
          period_end: string | null
          period_start: string | null
          refund_amount_cents: number
          stripe_payout_id: string
          stripe_transfer_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          fee_amount_cents?: number
          gross_amount_cents?: number
          id?: string
          net_amount_cents?: number
          notes?: string | null
          payment_count?: number
          payment_ids?: Json
          payout_amount_cents: number
          payout_arrival_date?: string | null
          payout_currency?: string
          payout_status?: string
          period_end?: string | null
          period_start?: string | null
          refund_amount_cents?: number
          stripe_payout_id: string
          stripe_transfer_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          fee_amount_cents?: number
          gross_amount_cents?: number
          id?: string
          net_amount_cents?: number
          notes?: string | null
          payment_count?: number
          payment_ids?: Json
          payout_amount_cents?: number
          payout_arrival_date?: string | null
          payout_currency?: string
          payout_status?: string
          period_end?: string | null
          period_start?: string | null
          refund_amount_cents?: number
          stripe_payout_id?: string
          stripe_transfer_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_logs: {
        Row: {
          check_in_at: string
          check_out_at: string | null
          chef_id: string
          created_at: string
          id: string
          notes: string | null
          shift: Database["public"]["Enums"]["shift_type"]
          snapshot: Json | null
          staff_member_id: string | null
          station_id: string
        }
        Insert: {
          check_in_at?: string
          check_out_at?: string | null
          chef_id: string
          created_at?: string
          id?: string
          notes?: string | null
          shift?: Database["public"]["Enums"]["shift_type"]
          snapshot?: Json | null
          staff_member_id?: string | null
          station_id: string
        }
        Update: {
          check_in_at?: string
          check_out_at?: string | null
          chef_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          shift?: Database["public"]["Enums"]["shift_type"]
          snapshot?: Json | null
          staff_member_id?: string | null
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_logs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_logs_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_logs_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_substitutions: {
        Row: {
          actual_ingredient: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          planned_ingredient: string
          reason: Database["public"]["Enums"]["substitution_reason"]
          store_name: string | null
          tenant_id: string
        }
        Insert: {
          actual_ingredient: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          planned_ingredient: string
          reason?: Database["public"]["Enums"]["substitution_reason"]
          store_name?: string | null
          tenant_id: string
        }
        Update: {
          actual_ingredient?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          planned_ingredient?: string
          reason?: Database["public"]["Enums"]["substitution_reason"]
          store_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_substitutions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "shopping_substitutions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "shopping_substitutions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "shopping_substitutions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_substitutions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_results: {
        Row: {
          created_at: string
          duration_ms: number | null
          failures: Json
          id: string
          module: string
          passed: boolean
          raw_output: Json | null
          run_id: string
          scenario_payload: string
          score: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          failures?: Json
          id?: string
          module: string
          passed?: boolean
          raw_output?: Json | null
          run_id: string
          scenario_payload: string
          score?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          failures?: Json
          id?: string
          module?: string
          passed?: boolean
          raw_output?: Json | null
          run_id?: string
          scenario_payload?: string
          score?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "simulation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_runs: {
        Row: {
          completed_at: string | null
          config: Json
          id: string
          module_breakdown: Json
          pass_rate: number | null
          passed_count: number
          scenario_count: number
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          id?: string
          module_breakdown?: Json
          pass_rate?: number | null
          passed_count?: number
          scenario_count?: number
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          id?: string
          module_breakdown?: Json
          pass_rate?: number | null
          passed_count?: number
          scenario_count?: number
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_field_values: {
        Row: {
          chef_id: string
          created_at: string
          field_key: string
          field_value: string
          id: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          field_key: string
          field_value: string
          id?: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          field_key?: string
          field_value?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_field_values_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_send_log: {
        Row: {
          action: string
          id: string
          sent_at: string
          tenant_id: string
        }
        Insert: {
          action: string
          id?: string
          sent_at?: string
          tenant_id: string
        }
        Update: {
          action?: string
          id?: string
          sent_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_send_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connected_accounts: {
        Row: {
          access_token: string
          connected_at: string
          error_count: number
          granted_scopes: string[]
          id: string
          is_active: boolean
          last_error: string | null
          last_refreshed_at: string | null
          last_used_at: string | null
          meta_ig_account_id: string | null
          meta_page_id: string | null
          meta_page_name: string | null
          platform: string
          platform_account_avatar: string | null
          platform_account_handle: string | null
          platform_account_id: string
          platform_account_name: string | null
          platform_account_type: string | null
          refresh_token: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          error_count?: number
          granted_scopes?: string[]
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_refreshed_at?: string | null
          last_used_at?: string | null
          meta_ig_account_id?: string | null
          meta_page_id?: string | null
          meta_page_name?: string | null
          platform: string
          platform_account_avatar?: string | null
          platform_account_handle?: string | null
          platform_account_id: string
          platform_account_name?: string | null
          platform_account_type?: string | null
          refresh_token?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          error_count?: number
          granted_scopes?: string[]
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_refreshed_at?: string | null
          last_used_at?: string | null
          meta_ig_account_id?: string | null
          meta_page_id?: string | null
          meta_page_name?: string | null
          platform?: string
          platform_account_avatar?: string | null
          platform_account_handle?: string | null
          platform_account_id?: string
          platform_account_name?: string | null
          platform_account_type?: string | null
          refresh_token?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connected_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_hashtag_sets: {
        Row: {
          created_at: string
          created_by: string
          hashtags: string[]
          id: string
          pillar: Database["public"]["Enums"]["social_pillar"] | null
          set_name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          hashtags?: string[]
          id?: string
          pillar?: Database["public"]["Enums"]["social_pillar"] | null
          set_name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          hashtags?: string[]
          id?: string
          pillar?: Database["public"]["Enums"]["social_pillar"] | null
          set_name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_hashtag_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_assets: {
        Row: {
          asset_kind: Database["public"]["Enums"]["social_asset_kind"]
          asset_name: string
          asset_tags: string[]
          created_at: string
          created_by: string
          duration_seconds: number | null
          file_size_bytes: number
          height_px: number | null
          id: string
          is_archived: boolean
          is_client_approved: boolean
          mime_type: string
          original_filename: string
          public_url: string
          storage_path: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          usage_context: string
          width_px: number | null
        }
        Insert: {
          asset_kind: Database["public"]["Enums"]["social_asset_kind"]
          asset_name?: string
          asset_tags?: string[]
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          file_size_bytes?: number
          height_px?: number | null
          id?: string
          is_archived?: boolean
          is_client_approved?: boolean
          mime_type: string
          original_filename: string
          public_url: string
          storage_path: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          usage_context?: string
          width_px?: number | null
        }
        Update: {
          asset_kind?: Database["public"]["Enums"]["social_asset_kind"]
          asset_name?: string
          asset_tags?: string[]
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          file_size_bytes?: number
          height_px?: number | null
          id?: string
          is_archived?: boolean
          is_client_approved?: boolean
          mime_type?: string
          original_filename?: string
          public_url?: string
          storage_path?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          usage_context?: string
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_oauth_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          expires_at: string
          id: string
          platform: string
          redirect_to: string | null
          state: string
          tenant_id: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          platform: string
          redirect_to?: string | null
          state: string
          tenant_id: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          platform?: string
          redirect_to?: string | null
          state?: string
          tenant_id?: string
        }
        Relationships: []
      }
      social_platform_credentials: {
        Row: {
          access_token: string
          additional_data: Json
          connected_at: string
          created_at: string
          disconnected_at: string | null
          external_account_avatar_url: string | null
          external_account_id: string
          external_account_name: string | null
          external_account_username: string | null
          failed_attempts: number
          id: string
          is_active: boolean
          last_error: string | null
          last_used_at: string | null
          platform: string
          refresh_token: string | null
          scopes: string[]
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          additional_data?: Json
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          external_account_avatar_url?: string | null
          external_account_id: string
          external_account_name?: string | null
          external_account_username?: string | null
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_used_at?: string | null
          platform: string
          refresh_token?: string | null
          scopes?: string[]
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          additional_data?: Json
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          external_account_avatar_url?: string | null
          external_account_id?: string
          external_account_name?: string | null
          external_account_username?: string | null
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_used_at?: string | null
          platform?: string
          refresh_token?: string | null
          scopes?: string[]
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_platform_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_assets: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string
          display_order: number
          id: string
          is_primary: boolean
          post_id: string
          tenant_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by: string
          display_order?: number
          id?: string
          is_primary?: boolean
          post_id: string
          tenant_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          post_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "social_media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          alt_text: string
          campaign: string
          caption_facebook: string
          caption_instagram: string
          caption_linkedin: string
          caption_master: string
          caption_pinterest: string
          caption_tiktok: string
          caption_x: string
          caption_youtube_shorts: string
          collaborator_tags: string[]
          created_at: string
          created_by: string
          cta: string
          editable_until: string | null
          hashtags: string[]
          hot_swap_ready: boolean
          id: string
          last_publish_at: string | null
          last_publish_error: string | null
          location_tag: string
          media_type: Database["public"]["Enums"]["social_media_type"]
          media_url: string | null
          mention_handles: string[]
          notes: string
          offer_link: string | null
          pillar: Database["public"]["Enums"]["social_pillar"]
          platforms: Database["public"]["Enums"]["social_platform"][]
          post_code: string
          preflight_missing_items: string[]
          preflight_ready: boolean
          publish_attempts: number
          publish_checklist_notes: string
          publish_errors: Json
          published_external_ids: Json
          published_to_platforms: Database["public"]["Enums"]["social_platform"][]
          queued_to_platforms: Database["public"]["Enums"]["social_platform"][]
          schedule_at: string
          seasonal_flag: boolean
          slot_number: number
          status: Database["public"]["Enums"]["social_post_status"]
          target_year: number
          tenant_id: string
          thumbnail_time_seconds: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          updated_by: string | null
          week_number: number
        }
        Insert: {
          alt_text?: string
          campaign?: string
          caption_facebook?: string
          caption_instagram?: string
          caption_linkedin?: string
          caption_master?: string
          caption_pinterest?: string
          caption_tiktok?: string
          caption_x?: string
          caption_youtube_shorts?: string
          collaborator_tags?: string[]
          created_at?: string
          created_by: string
          cta?: string
          editable_until?: string | null
          hashtags?: string[]
          hot_swap_ready?: boolean
          id?: string
          last_publish_at?: string | null
          last_publish_error?: string | null
          location_tag?: string
          media_type?: Database["public"]["Enums"]["social_media_type"]
          media_url?: string | null
          mention_handles?: string[]
          notes?: string
          offer_link?: string | null
          pillar: Database["public"]["Enums"]["social_pillar"]
          platforms?: Database["public"]["Enums"]["social_platform"][]
          post_code: string
          preflight_missing_items?: string[]
          preflight_ready?: boolean
          publish_attempts?: number
          publish_checklist_notes?: string
          publish_errors?: Json
          published_external_ids?: Json
          published_to_platforms?: Database["public"]["Enums"]["social_platform"][]
          queued_to_platforms?: Database["public"]["Enums"]["social_platform"][]
          schedule_at: string
          seasonal_flag?: boolean
          slot_number: number
          status?: Database["public"]["Enums"]["social_post_status"]
          target_year: number
          tenant_id: string
          thumbnail_time_seconds?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          week_number: number
        }
        Update: {
          alt_text?: string
          campaign?: string
          caption_facebook?: string
          caption_instagram?: string
          caption_linkedin?: string
          caption_master?: string
          caption_pinterest?: string
          caption_tiktok?: string
          caption_x?: string
          caption_youtube_shorts?: string
          collaborator_tags?: string[]
          created_at?: string
          created_by?: string
          cta?: string
          editable_until?: string | null
          hashtags?: string[]
          hot_swap_ready?: boolean
          id?: string
          last_publish_at?: string | null
          last_publish_error?: string | null
          location_tag?: string
          media_type?: Database["public"]["Enums"]["social_media_type"]
          media_url?: string | null
          mention_handles?: string[]
          notes?: string
          offer_link?: string | null
          pillar?: Database["public"]["Enums"]["social_pillar"]
          platforms?: Database["public"]["Enums"]["social_platform"][]
          post_code?: string
          preflight_missing_items?: string[]
          preflight_ready?: boolean
          publish_attempts?: number
          publish_checklist_notes?: string
          publish_errors?: Json
          published_external_ids?: Json
          published_to_platforms?: Database["public"]["Enums"]["social_platform"][]
          queued_to_platforms?: Database["public"]["Enums"]["social_platform"][]
          schedule_at?: string
          seasonal_flag?: boolean
          slot_number?: number
          status?: Database["public"]["Enums"]["social_post_status"]
          target_year?: number
          tenant_id?: string
          thumbnail_time_seconds?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_queue_settings: {
        Row: {
          created_at: string
          created_by: string
          holdout_slots_per_month: number
          posts_per_week: number
          queue_days: number[]
          queue_times: string[]
          target_year: number
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          holdout_slots_per_month?: number
          posts_per_week?: number
          queue_days?: number[]
          queue_times?: string[]
          target_year?: number
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          holdout_slots_per_month?: number
          posts_per_week?: number
          queue_days?: number[]
          queue_times?: string[]
          target_year?: number
          tenant_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_queue_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_stats_snapshots: {
        Row: {
          avg_engagement_rate: number | null
          chef_id: string
          followers: number | null
          following: number | null
          id: string
          impressions_7d: number | null
          platform: string
          posts_count: number | null
          profile_views_7d: number | null
          raw_payload: Json
          reach_7d: number | null
          snapshot_date: string
          synced_at: string
          top_post_comments: number | null
          top_post_likes: number | null
          top_post_url: string | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          chef_id: string
          followers?: number | null
          following?: number | null
          id?: string
          impressions_7d?: number | null
          platform: string
          posts_count?: number | null
          profile_views_7d?: number | null
          raw_payload?: Json
          reach_7d?: number | null
          snapshot_date: string
          synced_at?: string
          top_post_comments?: number | null
          top_post_likes?: number | null
          top_post_url?: string | null
        }
        Update: {
          avg_engagement_rate?: number | null
          chef_id?: string
          followers?: number | null
          following?: number | null
          id?: string
          impressions_7d?: number | null
          platform?: string
          posts_count?: number | null
          profile_views_7d?: number | null
          raw_payload?: Json
          reach_7d?: number | null
          snapshot_date?: string
          synced_at?: string
          top_post_comments?: number | null
          top_post_likes?: number | null
          top_post_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_stats_snapshots_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          chef_id: string
          created_at: string
          date: string
          id: string
          is_available: boolean
          notes: string | null
          recurring_rule: string | null
          staff_member_id: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          date: string
          id?: string
          is_available?: boolean
          notes?: string | null
          recurring_rule?: string | null
          staff_member_id: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          date?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          recurring_rule?: string | null
          staff_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_availability_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_clock_entries: {
        Row: {
          chef_id: string
          clock_in_at: string
          clock_out_at: string | null
          created_at: string
          event_id: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          staff_member_id: string
          status: string
          total_minutes: number | null
          updated_at: string
        }
        Insert: {
          chef_id: string
          clock_in_at: string
          clock_out_at?: string | null
          created_at?: string
          event_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          staff_member_id: string
          status?: string
          total_minutes?: number | null
          updated_at?: string
        }
        Update: {
          chef_id?: string
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          event_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          staff_member_id?: string
          status?: string
          total_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_clock_entries_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_clock_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_clock_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_clock_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_clock_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_clock_entries_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_meal_items: {
        Row: {
          cost_cents: number | null
          created_at: string
          id: string
          ingredient_id: string | null
          ingredient_name: string
          quantity: number
          staff_meal_id: string
          unit: string
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string
          id?: string
          ingredient_id?: string | null
          ingredient_name: string
          quantity: number
          staff_meal_id: string
          unit: string
        }
        Update: {
          cost_cents?: number | null
          created_at?: string
          id?: string
          ingredient_id?: string | null
          ingredient_name?: string
          quantity?: number
          staff_meal_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_meal_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "staff_meal_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "staff_meal_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_meal_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "staff_meal_items_staff_meal_id_fkey"
            columns: ["staff_meal_id"]
            isOneToOne: false
            referencedRelation: "staff_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_meals: {
        Row: {
          chef_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          meal_date: string
          notes: string | null
          photo_url: string | null
          recipe_id: string | null
          staff_count: number
          total_cost_cents: number | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          meal_date?: string
          notes?: string | null
          photo_url?: string | null
          recipe_id?: string | null
          staff_count?: number
          total_cost_cents?: number | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          meal_date?: string
          notes?: string | null
          photo_url?: string | null
          recipe_id?: string | null
          staff_count?: number
          total_cost_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_meals_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_meals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_meals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_meals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "staff_meals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "staff_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          business_name: string | null
          chef_id: string
          contractor_type: string | null
          created_at: string
          email: string | null
          hourly_rate_cents: number
          id: string
          kiosk_pin: string | null
          name: string
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          status: string
          tin: string | null
          tin_type: string | null
          updated_at: string
          w9_collected: boolean
          w9_document_url: string | null
          w9_signed_date: string | null
          ytd_payments_cents: number | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          business_name?: string | null
          chef_id: string
          contractor_type?: string | null
          created_at?: string
          email?: string | null
          hourly_rate_cents?: number
          id?: string
          kiosk_pin?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: string
          tin?: string | null
          tin_type?: string | null
          updated_at?: string
          w9_collected?: boolean
          w9_document_url?: string | null
          w9_signed_date?: string | null
          ytd_payments_cents?: number | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          business_name?: string | null
          chef_id?: string
          contractor_type?: string | null
          created_at?: string
          email?: string | null
          hourly_rate_cents?: number
          id?: string
          kiosk_pin?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: string
          tin?: string | null
          tin_type?: string | null
          updated_at?: string
          w9_collected?: boolean
          w9_document_url?: string | null
          w9_signed_date?: string | null
          ytd_payments_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_onboarding_items: {
        Row: {
          completed_at: string | null
          document_url: string | null
          id: string
          item_key: string
          notes: string | null
          staff_member_id: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          document_url?: string | null
          id?: string
          item_key: string
          notes?: string | null
          staff_member_id: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          document_url?: string | null
          id?: string
          item_key?: string
          notes?: string | null
          staff_member_id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_onboarding_items_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_scores: {
        Row: {
          avg_rating: number | null
          cancellation_count: number
          chef_id: string
          created_at: string
          id: string
          last_computed_at: string
          on_time_rate: number | null
          staff_member_id: string
          total_events: number
          updated_at: string
        }
        Insert: {
          avg_rating?: number | null
          cancellation_count?: number
          chef_id: string
          created_at?: string
          id?: string
          last_computed_at?: string
          on_time_rate?: number | null
          staff_member_id: string
          total_events?: number
          updated_at?: string
        }
        Update: {
          avg_rating?: number | null
          cancellation_count?: number
          chef_id?: string
          created_at?: string
          id?: string
          last_computed_at?: string
          on_time_rate?: number | null
          staff_member_id?: string
          total_events?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_scores_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_scores_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      station_components: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          ingredient_id: string | null
          name: string
          notes: string | null
          par_level: number
          par_unit: string
          shelf_life_days: number | null
          station_menu_item_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          name: string
          notes?: string | null
          par_level?: number
          par_unit?: string
          shelf_life_days?: number | null
          station_menu_item_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          name?: string
          notes?: string | null
          par_level?: number
          par_unit?: string
          shelf_life_days?: number | null
          station_menu_item_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_components_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_components_station_menu_item_id_fkey"
            columns: ["station_menu_item_id"]
            isOneToOne: false
            referencedRelation: "station_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      station_menu_items: {
        Row: {
          chef_id: string
          created_at: string
          description: string | null
          id: string
          menu_item_id: string | null
          name: string
          station_id: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          description?: string | null
          id?: string
          menu_item_id?: string | null
          name: string
          station_id: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          description?: string | null
          id?: string
          menu_item_id?: string | null
          name?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_menu_items_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_menu_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          chef_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          address: string | null
          chef_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          location_type: Database["public"]["Enums"]["storage_location_type"]
          name: string
          notes: string | null
          sort_order: number
          temperature_zone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          chef_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_type?: Database["public"]["Enums"]["storage_location_type"]
          name: string
          notes?: string | null
          sort_order?: number
          temperature_zone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          chef_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_type?: Database["public"]["Enums"]["storage_location_type"]
          name?: string
          notes?: string | null
          sort_order?: number
          temperature_zone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_transfers: {
        Row: {
          created_at: string
          currency: string
          deferred_resolved_at: string | null
          event_id: string | null
          gross_amount_cents: number
          id: string
          is_deferred: boolean
          metadata: Json | null
          net_transfer_cents: number
          platform_fee_cents: number
          status: string
          stripe_charge_id: string | null
          stripe_destination_account: string
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deferred_resolved_at?: string | null
          event_id?: string | null
          gross_amount_cents: number
          id?: string
          is_deferred?: boolean
          metadata?: Json | null
          net_transfer_cents: number
          platform_fee_cents?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_destination_account: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deferred_resolved_at?: string | null
          event_id?: string | null
          gross_amount_cents?: number
          id?: string
          is_deferred?: boolean
          metadata?: Json | null
          net_transfer_cents?: number
          platform_fee_cents?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_destination_account?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_transfers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "stripe_transfers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "stripe_transfers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "stripe_transfers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_links: {
        Row: {
          communication_event_id: string
          confidence_score: number
          created_at: string
          id: string
          status: Database["public"]["Enums"]["suggested_link_status"]
          suggested_entity_id: string
          suggested_entity_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          communication_event_id: string
          confidence_score: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["suggested_link_status"]
          suggested_entity_id: string
          suggested_entity_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          communication_event_id?: string
          confidence_score?: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["suggested_link_status"]
          suggested_entity_id?: string
          suggested_entity_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggested_links_communication_event_id_fkey"
            columns: ["communication_event_id"]
            isOneToOne: false
            referencedRelation: "communication_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_links_communication_event_id_fkey"
            columns: ["communication_event_id"]
            isOneToOne: false
            referencedRelation: "communication_inbox_items"
            referencedColumns: ["communication_event_id"]
          },
          {
            foreignKeyName: "suggested_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completion_log: {
        Row: {
          chef_id: string
          completed_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          staff_member_id: string | null
          task_id: string
        }
        Insert: {
          chef_id: string
          completed_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          staff_member_id?: string | null
          task_id: string
        }
        Update: {
          chef_id?: string
          completed_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          staff_member_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completion_log_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_log_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: Database["public"]["Enums"]["task_template_category"]
          chef_id: string
          created_at: string
          description: string | null
          id: string
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["task_template_category"]
          chef_id: string
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["task_template_category"]
          chef_id?: string
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          chef_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          recurring_rule: Json | null
          station_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          chef_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurring_rule?: Json | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          chef_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurring_rule?: Json | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_station"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_quarterly_estimates: {
        Row: {
          amount_paid_cents: number
          chef_id: string
          created_at: string
          due_date: string | null
          estimated_federal_cents: number
          estimated_income_cents: number
          estimated_se_tax_cents: number
          estimated_state_cents: number
          id: string
          paid_at: string | null
          quarter: number
          tax_year: number
          updated_at: string
        }
        Insert: {
          amount_paid_cents?: number
          chef_id: string
          created_at?: string
          due_date?: string | null
          estimated_federal_cents?: number
          estimated_income_cents?: number
          estimated_se_tax_cents?: number
          estimated_state_cents?: number
          id?: string
          paid_at?: string | null
          quarter: number
          tax_year: number
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number
          chef_id?: string
          created_at?: string
          due_date?: string | null
          estimated_federal_cents?: number
          estimated_income_cents?: number
          estimated_se_tax_cents?: number
          estimated_state_cents?: number
          id?: string
          paid_at?: string | null
          quarter?: number
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_quarterly_estimates_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          annual_insurance_home_cents: number | null
          annual_rent_mortgage_cents: number | null
          annual_repairs_cents: number | null
          annual_utilities_cents: number | null
          chef_id: string
          created_at: string
          filing_status: string
          home_deduction_method: string
          home_office_notes: string | null
          home_office_sqft: number | null
          home_total_sqft: number | null
          id: string
          quarterly_payments: Json
          tax_year: number
          updated_at: string
        }
        Insert: {
          annual_insurance_home_cents?: number | null
          annual_rent_mortgage_cents?: number | null
          annual_repairs_cents?: number | null
          annual_utilities_cents?: number | null
          chef_id: string
          created_at?: string
          filing_status?: string
          home_deduction_method?: string
          home_office_notes?: string | null
          home_office_sqft?: number | null
          home_total_sqft?: number | null
          id?: string
          quarterly_payments?: Json
          tax_year: number
          updated_at?: string
        }
        Update: {
          annual_insurance_home_cents?: number | null
          annual_rent_mortgage_cents?: number | null
          annual_repairs_cents?: number | null
          annual_utilities_cents?: number | null
          chef_id?: string
          created_at?: string
          filing_status?: string
          home_deduction_method?: string
          home_office_notes?: string | null
          home_office_sqft?: number | null
          home_total_sqft?: number | null
          id?: string
          quarterly_payments?: Json
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          id: string
          integration_connection_settings: Json
          integration_updated_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_connection_settings?: Json
          integration_updated_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_connection_settings?: Json
          integration_updated_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          block_type: string
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          notes: string | null
          start_at: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          notes?: string | null
          start_at: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          notes?: string | null
          start_at?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_leg_ingredients: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          ingredient_id: string
          leg_id: string
          notes: string | null
          quantity: number | null
          sourced_at: string | null
          status: string
          store_name: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          ingredient_id: string
          leg_id: string
          notes?: string | null
          quantity?: number | null
          sourced_at?: string | null
          status?: string
          store_name?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          ingredient_id?: string
          leg_id?: string
          notes?: string | null
          quantity?: number | null
          sourced_at?: string | null
          status?: string
          store_name?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_leg_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "travel_leg_ingredients_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "event_travel_legs"
            referencedColumns: ["id"]
          },
        ]
      }
      unused_ingredients: {
        Row: {
          created_at: string
          estimated_cost_cents: number | null
          event_id: string
          expired: boolean
          id: string
          ingredient_name: string
          notes: string | null
          reason: Database["public"]["Enums"]["unused_reason"]
          storage_location: string | null
          tenant_id: string
          transferred_to_event_id: string | null
          use_by_date: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost_cents?: number | null
          event_id: string
          expired?: boolean
          id?: string
          ingredient_name: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["unused_reason"]
          storage_location?: string | null
          tenant_id: string
          transferred_to_event_id?: string | null
          use_by_date?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost_cents?: number | null
          event_id?: string
          expired?: boolean
          id?: string
          ingredient_name?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["unused_reason"]
          storage_location?: string | null
          tenant_id?: string
          transferred_to_event_id?: string | null
          use_by_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unused_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "unused_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "unused_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "unused_ingredients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unused_ingredients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unused_ingredients_transferred_to_event_id_fkey"
            columns: ["transferred_to_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "unused_ingredients_transferred_to_event_id_fkey"
            columns: ["transferred_to_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "unused_ingredients_transferred_to_event_id_fkey"
            columns: ["transferred_to_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "unused_ingredients_transferred_to_event_id_fkey"
            columns: ["transferred_to_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          anonymous: boolean
          created_at: string
          id: string
          message: string
          metadata: Json
          page_context: string | null
          sentiment: string
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          anonymous?: boolean
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          page_context?: string | null
          sentiment: string
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          anonymous?: boolean
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          page_context?: string | null
          sentiment?: string
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          auth_user_id: string
          created_at: string
          entity_id: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          entity_id: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          entity_id?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      vendor_invoice_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          matched_ingredient_id: string | null
          price_changed: boolean
          quantity: number | null
          total_cents: number
          unit_price_cents: number
          vendor_invoice_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          matched_ingredient_id?: string | null
          price_changed?: boolean
          quantity?: number | null
          total_cents: number
          unit_price_cents: number
          vendor_invoice_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          matched_ingredient_id?: string | null
          price_changed?: boolean
          quantity?: number | null
          total_cents?: number
          unit_price_cents?: number
          vendor_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoice_items_matched_ingredient_id_fkey"
            columns: ["matched_ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "vendor_invoice_items_matched_ingredient_id_fkey"
            columns: ["matched_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "vendor_invoice_items_matched_ingredient_id_fkey"
            columns: ["matched_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoice_items_matched_ingredient_id_fkey"
            columns: ["matched_ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "vendor_invoice_items_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_invoice_line_items: {
        Row: {
          chef_id: string
          description: string
          id: string
          ingredient_id: string | null
          invoice_id: string
          quantity: number
          total_cents: number
          unit_price_cents: number
          vendor_item_id: string | null
        }
        Insert: {
          chef_id: string
          description: string
          id?: string
          ingredient_id?: string | null
          invoice_id: string
          quantity?: number
          total_cents?: number
          unit_price_cents?: number
          vendor_item_id?: string | null
        }
        Update: {
          chef_id?: string
          description?: string
          id?: string
          ingredient_id?: string | null
          invoice_id?: string
          quantity?: number
          total_cents?: number
          unit_price_cents?: number
          vendor_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoice_line_items_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoice_line_items_vendor_item_id_fkey"
            columns: ["vendor_item_id"]
            isOneToOne: false
            referencedRelation: "vendor_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_invoices: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string | null
          photo_url: string | null
          status: string
          total_cents: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          invoice_date: string
          invoice_number?: string | null
          photo_url?: string | null
          status?: string
          total_cents: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          photo_url?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_items: {
        Row: {
          chef_id: string
          id: string
          ingredient_id: string | null
          last_updated: string
          notes: string | null
          unit_measure: string | null
          unit_price_cents: number
          unit_size: number | null
          vendor_id: string
          vendor_item_name: string
          vendor_sku: string | null
        }
        Insert: {
          chef_id: string
          id?: string
          ingredient_id?: string | null
          last_updated?: string
          notes?: string | null
          unit_measure?: string | null
          unit_price_cents?: number
          unit_size?: number | null
          vendor_id: string
          vendor_item_name: string
          vendor_sku?: string | null
        }
        Update: {
          chef_id?: string
          id?: string
          ingredient_id?: string | null
          last_updated?: string
          notes?: string | null
          unit_measure?: string | null
          unit_price_cents?: number
          unit_size?: number | null
          vendor_id?: string
          vendor_item_name?: string
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_items_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_price_points: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          ingredient_id: string | null
          item_name: string
          notes: string | null
          price_cents: number
          recorded_at: string
          unit: string
          vendor_id: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          item_name: string
          notes?: string | null
          price_cents: number
          recorded_at?: string
          unit: string
          vendor_id: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          item_name?: string
          notes?: string | null
          price_cents?: number
          recorded_at?: string
          unit?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_price_points_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_price_points_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "vendor_price_points_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "vendor_price_points_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_price_points_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "vendor_price_points_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          chef_id: string
          created_at: string
          email: string | null
          id: string
          is_preferred: boolean
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          vendor_type: string
          website: string | null
        }
        Insert: {
          address?: string | null
          chef_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_preferred?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          vendor_type?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          chef_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_preferred?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          vendor_type?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          chef_id: string
          client_id: string | null
          contacted_at: string | null
          converted_event_id: string | null
          created_at: string
          expires_at: string | null
          guest_count_estimate: number | null
          id: string
          notes: string | null
          occasion: string | null
          requested_date: string
          requested_date_end: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          client_id?: string | null
          contacted_at?: string | null
          converted_event_id?: string | null
          created_at?: string
          expires_at?: string | null
          guest_count_estimate?: number | null
          id?: string
          notes?: string | null
          occasion?: string | null
          requested_date: string
          requested_date_end?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          client_id?: string | null
          contacted_at?: string | null
          converted_event_id?: string | null
          created_at?: string
          expires_at?: string | null
          guest_count_estimate?: number | null
          id?: string
          notes?: string | null
          occasion?: string | null
          requested_date?: string
          requested_date_end?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "waitlist_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_converted_event_id_fkey"
            columns: ["converted_event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlist_entries_converted_event_id_fkey"
            columns: ["converted_event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlist_entries_converted_event_id_fkey"
            columns: ["converted_event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlist_entries_converted_event_id_fkey"
            columns: ["converted_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_log: {
        Row: {
          chef_id: string
          component_id: string
          created_at: string
          estimated_value_cents: number | null
          id: string
          notes: string | null
          quantity: number
          reason: Database["public"]["Enums"]["waste_reason"]
          staff_member_id: string | null
          station_id: string
          unit: string
        }
        Insert: {
          chef_id: string
          component_id: string
          created_at?: string
          estimated_value_cents?: number | null
          id?: string
          notes?: string | null
          quantity: number
          reason?: Database["public"]["Enums"]["waste_reason"]
          staff_member_id?: string | null
          station_id: string
          unit?: string
        }
        Update: {
          chef_id?: string
          component_id?: string
          created_at?: string
          estimated_value_cents?: number | null
          id?: string
          notes?: string | null
          quantity?: number
          reason?: Database["public"]["Enums"]["waste_reason"]
          staff_member_id?: string | null
          station_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_log_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_log_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "station_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_log_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_log_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_logs: {
        Row: {
          chef_id: string
          created_at: string
          estimated_cost_cents: number
          event_id: string | null
          id: string
          ingredient_name: string
          notes: string | null
          quantity: number
          reason: string
          unit: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          estimated_cost_cents?: number
          event_id?: string | null
          id?: string
          ingredient_name: string
          notes?: string | null
          quantity: number
          reason: string
          unit: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          estimated_cost_cents?: number
          event_id?: string | null
          id?: string
          ingredient_name?: string
          notes?: string | null
          quantity?: number
          reason?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waste_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waste_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waste_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          delivered_at: string | null
          endpoint_id: string
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          endpoint_id: string
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          endpoint_id?: string
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          description: string | null
          events: string[]
          id: string
          is_active: boolean | null
          secret: string
          tenant_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret: string
          tenant_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret?: string
          tenant_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error_text: string | null
          event_type: string
          id: string
          payload_size_bytes: number | null
          provider: string
          provider_event_id: string | null
          received_at: string
          result: Json | null
          status: string
        }
        Insert: {
          error_text?: string | null
          event_type: string
          id?: string
          payload_size_bytes?: number | null
          provider: string
          provider_event_id?: string | null
          received_at?: string
          result?: Json | null
          status?: string
        }
        Update: {
          error_text?: string | null
          event_type?: string
          id?: string
          payload_size_bytes?: number | null
          provider?: string
          provider_event_id?: string | null
          received_at?: string
          result?: Json | null
          status?: string
        }
        Relationships: []
      }
      website_stats_snapshots: {
        Row: {
          avg_session_seconds: number | null
          bounce_rate_percent: number | null
          chef_id: string
          created_at: string
          id: string
          inquiry_conversion_rate_percent: number | null
          notes: string | null
          pageviews: number | null
          snapshot_month: string
          top_source: string | null
          unique_visitors: number | null
        }
        Insert: {
          avg_session_seconds?: number | null
          bounce_rate_percent?: number | null
          chef_id: string
          created_at?: string
          id?: string
          inquiry_conversion_rate_percent?: number | null
          notes?: string | null
          pageviews?: number | null
          snapshot_month: string
          top_source?: string | null
          unique_visitors?: number | null
        }
        Update: {
          avg_session_seconds?: number | null
          bounce_rate_percent?: number | null
          chef_id?: string
          created_at?: string
          id?: string
          inquiry_conversion_rate_percent?: number | null
          notes?: string | null
          pageviews?: number | null
          snapshot_month?: string
          top_source?: string | null
          unique_visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "website_stats_snapshots_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      wix_connections: {
        Row: {
          auto_create_inquiry: boolean
          chef_id: string
          created_at: string
          error_count: number
          form_field_mapping: Json
          id: string
          last_submission_at: string | null
          tenant_id: string
          total_submissions: number
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          auto_create_inquiry?: boolean
          chef_id: string
          created_at?: string
          error_count?: number
          form_field_mapping?: Json
          id?: string
          last_submission_at?: string | null
          tenant_id: string
          total_submissions?: number
          updated_at?: string
          webhook_secret: string
        }
        Update: {
          auto_create_inquiry?: boolean
          chef_id?: string
          created_at?: string
          error_count?: number
          form_field_mapping?: Json
          id?: string
          last_submission_at?: string | null
          tenant_id?: string
          total_submissions?: number
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "wix_connections_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: true
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wix_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      wix_submissions: {
        Row: {
          client_id: string | null
          created_at: string
          error: string | null
          gmail_duplicate_of: string | null
          id: string
          inquiry_id: string | null
          processed_at: string | null
          processing_attempts: number
          raw_payload: Json
          status: string
          submitter_email: string | null
          submitter_name: string | null
          submitter_phone: string | null
          tenant_id: string
          wix_form_id: string | null
          wix_submission_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          error?: string | null
          gmail_duplicate_of?: string | null
          id?: string
          inquiry_id?: string | null
          processed_at?: string | null
          processing_attempts?: number
          raw_payload: Json
          status?: string
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_phone?: string | null
          tenant_id: string
          wix_form_id?: string | null
          wix_submission_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          error?: string | null
          gmail_duplicate_of?: string | null
          id?: string
          inquiry_id?: string | null
          processed_at?: string | null
          processing_attempts?: number
          raw_payload?: Json
          status?: string
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_phone?: string | null
          tenant_id?: string
          wix_form_id?: string | null
          wix_submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wix_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "wix_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wix_submissions_gmail_duplicate_of_fkey"
            columns: ["gmail_duplicate_of"]
            isOneToOne: false
            referencedRelation: "gmail_sync_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wix_submissions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wix_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      zapier_webhook_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          subscription_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapier_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "zapier_webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      zapier_webhook_subscriptions: {
        Row: {
          created_at: string
          event_types: string[]
          id: string
          is_active: boolean
          secret: string
          target_url: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          secret?: string
          target_url: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          secret?: string
          target_url?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapier_webhook_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_financial_summary: {
        Row: {
          average_spend_per_event: number | null
          average_tip_percentage: number | null
          client_id: string | null
          days_since_last_event: number | null
          first_event_date: string | null
          is_dormant: boolean | null
          last_event_date: string | null
          lifetime_value_cents: number | null
          outstanding_balance_cents: number | null
          tenant_id: string | null
          total_events_cancelled: number | null
          total_events_completed: number | null
          total_events_count: number | null
          total_tips_given_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_inbox_items: {
        Row: {
          client_id: string | null
          communication_event_id: string | null
          communication_status:
            | Database["public"]["Enums"]["communication_event_status"]
            | null
          direction:
            | Database["public"]["Enums"]["communication_direction"]
            | null
          event_timestamp: string | null
          has_overdue_follow_up: boolean | null
          is_starred: boolean | null
          last_activity_at: string | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          needs_attention: boolean | null
          next_follow_up_due_at: string | null
          normalized_content: string | null
          pending_link_count: number | null
          raw_content: string | null
          resolved_client_id: string | null
          sender_identity: string | null
          snoozed_until: string | null
          source: Database["public"]["Enums"]["communication_source"] | null
          tab: string | null
          tenant_id: string | null
          thread_id: string | null
          thread_state:
            | Database["public"]["Enums"]["conversation_thread_state"]
            | null
          top_pending_confidence: number | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_events_resolved_client_id_fkey"
            columns: ["resolved_client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "communication_events_resolved_client_id_fkey"
            columns: ["resolved_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "conversation_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_component_summary: {
        Row: {
          component_count: number | null
          components_with_recipes: number | null
          components_without_recipes: number | null
          course_name: string | null
          course_number: number | null
          dish_id: string | null
          make_ahead_count: number | null
          menu_id: string | null
          tenant_id: string | null
        }
        Insert: {
          component_count?: never
          components_with_recipes?: never
          components_without_recipes?: never
          course_name?: string | null
          course_number?: number | null
          dish_id?: string | null
          make_ahead_count?: never
          menu_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          component_count?: never
          components_with_recipes?: never
          components_without_recipes?: never
          course_name?: string | null
          course_number?: number | null
          dish_id?: string | null
          make_ahead_count?: never
          menu_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_cost_summary"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "dishes_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_index_summary: {
        Row: {
          allergen_flags: string[] | null
          archived: boolean | null
          avg_rating: number | null
          course: string | null
          description: string | null
          dietary_tags: string[] | null
          feedback_count: number | null
          first_served: string | null
          id: string | null
          is_signature: boolean | null
          last_served: string | null
          linked_recipe_id: string | null
          name: string | null
          per_portion_cost_cents: number | null
          plating_difficulty:
            | Database["public"]["Enums"]["dish_plating_difficulty"]
            | null
          prep_complexity:
            | Database["public"]["Enums"]["dish_prep_complexity"]
            | null
          recipe_cost_cents: number | null
          recipe_name: string | null
          rotation_status:
            | Database["public"]["Enums"]["dish_rotation_status"]
            | null
          season_affinity: string[] | null
          tags: string[] | null
          tenant_id: string | null
          times_served: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_index_linked_recipe_id_fkey"
            columns: ["linked_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_cost_summary"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "dish_index_linked_recipe_id_fkey"
            columns: ["linked_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_index_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_financial_summary: {
        Row: {
          event_id: string | null
          food_cost_percentage: number | null
          net_revenue_cents: number | null
          outstanding_balance_cents: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          profit_cents: number | null
          profit_margin: number | null
          quoted_price_cents: number | null
          tenant_id: string | null
          tip_amount_cents: number | null
          total_expenses_cents: number | null
          total_paid_cents: number | null
          total_refunded_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_inventory_variance: {
        Row: {
          actual_qty: number | null
          chef_id: string | null
          event_id: string | null
          expected_qty: number | null
          ingredient_id: string | null
          ingredient_name: string | null
          last_price_cents: number | null
          unit: string | null
          variance_cost_cents: number | null
          variance_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvp_summary: {
        Row: {
          all_allergies: string[] | null
          all_dietary_restrictions: string[] | null
          attending_count: number | null
          declined_count: number | null
          event_id: string | null
          maybe_count: number | null
          pending_count: number | null
          plus_one_count: number | null
          tenant_id: string | null
          total_guests: number | null
          waitlisted_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_time_summary: {
        Row: {
          event_id: string | null
          prep_duration_minutes: number | null
          reset_duration_minutes: number | null
          service_duration_minutes: number | null
          shopping_duration_minutes: number | null
          tenant_id: string | null
          total_time_hours: number | null
          total_time_minutes: number | null
          travel_duration_minutes: number | null
        }
        Insert: {
          event_id?: string | null
          prep_duration_minutes?: never
          reset_duration_minutes?: never
          service_duration_minutes?: never
          shopping_duration_minutes?: never
          tenant_id?: string | null
          total_time_hours?: never
          total_time_minutes?: never
          travel_duration_minutes?: never
        }
        Update: {
          event_id?: string | null
          prep_duration_minutes?: never
          reset_duration_minutes?: never
          service_duration_minutes?: never
          shopping_duration_minutes?: never
          tenant_id?: string | null
          total_time_hours?: never
          total_time_minutes?: never
          travel_duration_minutes?: never
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_usage_summary: {
        Row: {
          category: Database["public"]["Enums"]["ingredient_category"] | null
          ingredient_id: string | null
          ingredient_name: string | null
          last_used_in_recipe_at: string | null
          recipes_using: string[] | null
          tenant_id: string | null
          times_used: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["ingredient_category"] | null
          ingredient_id?: string | null
          ingredient_name?: string | null
          last_used_in_recipe_at?: never
          recipes_using?: never
          tenant_id?: string | null
          times_used?: never
        }
        Update: {
          category?: Database["public"]["Enums"]["ingredient_category"] | null
          ingredient_id?: string | null
          ingredient_name?: string | null
          last_used_in_recipe_at?: never
          recipes_using?: never
          tenant_id?: string | null
          times_used?: never
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_by_location: {
        Row: {
          chef_id: string | null
          current_qty: number | null
          ingredient_id: string | null
          ingredient_name: string | null
          location_id: string | null
          location_name: string | null
          location_type:
            | Database["public"]["Enums"]["storage_location_type"]
            | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_current_stock: {
        Row: {
          chef_id: string | null
          current_qty: number | null
          ingredient_id: string | null
          ingredient_name: string | null
          last_movement_at: string | null
          par_level: number | null
          transaction_count: number | null
          unit: string | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
        ]
      }
      inventory_expiry_alerts: {
        Row: {
          at_risk_cost_cents: number | null
          batch_id: string | null
          chef_id: string | null
          expiry_date: string | null
          ingredient_id: string | null
          ingredient_name: string | null
          location_name: string | null
          remaining_qty: number | null
          unit: string | null
          unit_cost_cents: number | null
          urgency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient_usage_summary"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "upcoming_ingredient_demand"
            referencedColumns: ["ingredient_id"]
          },
        ]
      }
      menu_cost_summary: {
        Row: {
          cost_per_guest_cents: number | null
          event_id: string | null
          food_cost_percentage: number | null
          has_all_recipe_costs: boolean | null
          menu_id: string | null
          menu_name: string | null
          tenant_id: string | null
          total_component_count: number | null
          total_recipe_cost_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_cost_summary: {
        Row: {
          category: Database["public"]["Enums"]["recipe_category"] | null
          cost_per_portion_cents: number | null
          has_all_prices: boolean | null
          ingredient_count: number | null
          last_price_updated_at: string | null
          recipe_id: string | null
          recipe_name: string | null
          tenant_id: string | null
          total_ingredient_cost_cents: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          cost_per_portion_cents?: never
          has_all_prices?: never
          ingredient_count?: never
          last_price_updated_at?: never
          recipe_id?: string | null
          recipe_name?: string | null
          tenant_id?: string | null
          total_ingredient_cost_cents?: never
        }
        Update: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          cost_per_portion_cents?: never
          has_all_prices?: never
          ingredient_count?: never
          last_price_updated_at?: never
          recipe_id?: string | null
          recipe_name?: string | null
          tenant_id?: string | null
          total_ingredient_cost_cents?: never
        }
        Relationships: [
          {
            foreignKeyName: "recipes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_financial_summary: {
        Row: {
          balance_due_cents: number | null
          channel: Database["public"]["Enums"]["sale_channel"] | null
          client_id: string | null
          created_at: string | null
          discount_cents: number | null
          event_id: string | null
          gross_profit_cents: number | null
          sale_id: string | null
          sale_number: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          subtotal_cents: number | null
          tax_cents: number | null
          tenant_id: string | null
          tip_cents: number | null
          total_cents: number | null
          total_cost_cents: number | null
          total_paid_cents: number | null
          total_refunded_cents: number | null
          total_tips_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financial_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_inventory_variance"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_time_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_inbox: {
        Row: {
          activity_at: string | null
          actor_id: string | null
          client_id: string | null
          content_type: string | null
          conversation_id: string | null
          event_id: string | null
          id: string | null
          inquiry_id: string | null
          is_read: boolean | null
          preview: string | null
          source: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      upcoming_ingredient_demand: {
        Row: {
          chef_id: string | null
          event_count: number | null
          events: string[] | null
          first_event_date: string | null
          ingredient_id: string | null
          ingredient_name: string | null
          last_price_cents: number | null
          total_needed_qty: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anonymize_financial_records: {
        Args: { p_chef_id: string }
        Returns: undefined
      }
      are_chefs_connected: {
        Args: { chef_a: string; chef_b: string }
        Returns: boolean
      }
      cleanup_expired_social_oauth_states: { Args: never; Returns: undefined }
      compute_client_lifetime_value: {
        Args: { p_client_id: string }
        Returns: number
      }
      compute_event_payment_status: {
        Args: { p_event_id: string }
        Returns: Database["public"]["Enums"]["payment_status"]
      }
      compute_event_profit_margin: {
        Args: { p_event_id: string }
        Returns: number
      }
      compute_menu_cost_cents: { Args: { p_menu_id: string }; Returns: number }
      compute_projected_food_cost_cents: {
        Args: { p_event_id: string }
        Returns: number
      }
      compute_recipe_cost_cents: {
        Args: { p_recipe_id: string }
        Returns: number
      }
      get_current_client_id: { Args: never; Returns: string }
      get_current_tenant_id: { Args: never; Returns: string }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_dish_allergen_flags: {
        Args: { p_dish_id: string }
        Returns: string[]
      }
      get_dish_component_count: { Args: { p_dish_id: string }; Returns: number }
      get_ingredient_stock: {
        Args: { p_chef_id: string; p_ingredient_id: string }
        Returns: number
      }
      get_menu_course_count: { Args: { p_menu_id: string }; Returns: number }
      get_menu_total_component_count: {
        Args: { p_menu_id: string }
        Returns: number
      }
      get_recipe_allergen_flags: {
        Args: { p_recipe_id: string }
        Returns: string[]
      }
      get_total_unread_count: { Args: { p_user_id: string }; Returns: number }
      get_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      is_conversation_participant: {
        Args: { conv_id: string }
        Returns: boolean
      }
      is_event_owner: { Args: { p_event_id: string }; Returns: boolean }
      redeem_incentive: {
        Args: {
          p_applied_cents: number
          p_balance_before_cents: number
          p_client_id: string
          p_code: string
          p_event_id: string
          p_incentive_id: string
          p_incentive_type: string
          p_redeemed_by: string
          p_tenant_id: string
        }
        Returns: string
      }
      transition_event_atomic: {
        Args: {
          p_event_id: string
          p_from_status: string
          p_metadata?: Json
          p_tenant_id: string
          p_to_status: string
          p_transitioned_by: string
        }
        Returns: Json
      }
    }
    Enums: {
      cancellation_initiator: "chef" | "client" | "mutual"
      cash_drawer_movement_type:
        | "sale_payment"
        | "refund"
        | "paid_in"
        | "paid_out"
        | "adjustment"
      chat_message_type:
        | "text"
        | "image"
        | "link"
        | "event_ref"
        | "system"
        | "file"
      chef_calendar_entry_type:
        | "vacation"
        | "time_off"
        | "personal"
        | "market"
        | "festival"
        | "class"
        | "photo_shoot"
        | "media"
        | "meeting"
        | "admin_block"
        | "other"
        | "target_booking"
        | "soft_preference"
      chef_connection_status: "pending" | "accepted" | "declined"
      chef_event_label_type: "occasion_type" | "status_label"
      chef_goal_status: "active" | "paused" | "completed" | "archived"
      chef_goal_type:
        | "revenue_monthly"
        | "revenue_annual"
        | "revenue_custom"
        | "booking_count"
        | "new_clients"
        | "recipe_library"
        | "profit_margin"
        | "expense_ratio"
        | "repeat_booking_rate"
        | "referrals_received"
        | "dishes_created"
        | "cuisines_explored"
        | "workshops_attended"
        | "review_average"
        | "total_reviews"
        | "staff_training_hours"
        | "vendor_relationships"
        | "books_read"
        | "courses_completed"
        | "weekly_workouts"
        | "rest_days_taken"
        | "family_dinners"
        | "vacation_days"
        | "charity_events"
        | "meals_donated"
      chef_journal_media_type: "photo" | "video" | "document"
      chef_journey_entry_type:
        | "destination"
        | "meal"
        | "lesson"
        | "experience"
        | "idea"
        | "reflection"
        | "technique"
        | "ingredient"
      chef_journey_idea_area:
        | "menu"
        | "technique"
        | "service"
        | "sourcing"
        | "team"
        | "operations"
      chef_journey_idea_status: "backlog" | "testing" | "adopted" | "parked"
      chef_journey_status: "planning" | "in_progress" | "completed" | "archived"
      chef_network_contact_share_status: "open" | "accepted" | "passed"
      chef_network_feature_key:
        | "availability"
        | "referral_asks"
        | "referral_offers"
        | "collab_requests"
        | "menu_spotlights"
        | "sourcing_intel"
        | "operational_tips"
        | "equipment_feedback"
        | "event_recap_learnings"
        | "urgent_needs"
        | "professional_proof"
        | "questions_to_network"
      client_status: "active" | "dormant" | "repeat_ready" | "vip"
      commerce_payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "settled"
        | "failed"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
        | "disputed"
      communication_action_source:
        | "manual"
        | "webhook"
        | "automation"
        | "import"
      communication_direction: "inbound" | "outbound"
      communication_event_status: "unlinked" | "linked" | "resolved"
      communication_source:
        | "email"
        | "website_form"
        | "sms"
        | "instagram"
        | "takeachef"
        | "manual_log"
        | "yhangry"
        | "phone"
        | "whatsapp"
        | "facebook"
        | "theknot"
        | "thumbtack"
        | "bark"
        | "cozymeal"
        | "google_business"
        | "gigsalad"
      component_category:
        | "sauce"
        | "protein"
        | "starch"
        | "vegetable"
        | "fruit"
        | "dessert"
        | "garnish"
        | "bread"
        | "cheese"
        | "condiment"
        | "beverage"
        | "other"
      contact_method: "phone" | "email" | "text" | "instagram"
      contract_status: "draft" | "sent" | "viewed" | "signed" | "voided"
      conversation_context_type: "standalone" | "inquiry" | "event"
      conversation_thread_state: "active" | "snoozed" | "closed"
      custom_field_entity_type: "event" | "client" | "recipe"
      custom_field_type:
        | "text"
        | "number"
        | "date"
        | "select"
        | "multi_select"
        | "toggle"
      device_mode: "kiosk"
      device_status: "pending_pair" | "active" | "disabled" | "revoked"
      device_type: "ipad" | "android" | "browser"
      dish_plating_difficulty: "simple" | "moderate" | "architectural"
      dish_prep_complexity: "quick" | "moderate" | "intensive"
      dish_rotation_status: "active" | "resting" | "retired" | "testing"
      equipment_category:
        | "cookware"
        | "knives"
        | "smallwares"
        | "appliances"
        | "serving"
        | "transport"
        | "linen"
        | "other"
      event_cannabis_category:
        | "cannabis_friendly"
        | "infused_menu"
        | "cbd_only"
        | "micro_dose"
      event_join_request_status: "pending" | "approved" | "denied"
      event_service_style:
        | "plated"
        | "family_style"
        | "buffet"
        | "cocktail"
        | "tasting_menu"
        | "other"
      event_share_invite_status: "active" | "consumed" | "revoked" | "expired"
      event_status:
        | "draft"
        | "proposed"
        | "accepted"
        | "paid"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      expense_category:
        | "groceries"
        | "alcohol"
        | "specialty_items"
        | "gas_mileage"
        | "equipment"
        | "supplies"
        | "other"
        | "vehicle"
        | "venue_rental"
        | "subscriptions"
        | "marketing"
        | "labor"
        | "insurance_licenses"
        | "professional_services"
        | "education"
        | "uniforms"
        | "utilities"
      follow_up_timer_status: "active" | "completed" | "dismissed"
      guest_attending_status: "yes" | "no"
      guest_cannabis_participation: "participate" | "not_consume" | "undecided"
      guest_consumption_style:
        | "edibles"
        | "infused_course"
        | "paired_noninfused"
        | "skip_infusion"
        | "unsure"
        | "smoking"
        | "tincture"
        | "other"
      guest_edible_familiarity:
        | "none"
        | "low"
        | "moderate"
        | "high"
        | "yes"
        | "no"
        | "unsure"
      guest_familiarity_level:
        | "new"
        | "light"
        | "moderate"
        | "experienced"
        | "first_time"
        | "occasional"
        | "regular"
      guest_reservation_status:
        | "confirmed"
        | "seated"
        | "completed"
        | "no_show"
        | "cancelled"
      household_relationship:
        | "partner"
        | "child"
        | "family_member"
        | "regular_guest"
      incentive_delivery_channel: "email" | "manual"
      incentive_type: "voucher" | "gift_card"
      ingredient_category:
        | "protein"
        | "produce"
        | "dairy"
        | "pantry"
        | "spice"
        | "oil"
        | "alcohol"
        | "baking"
        | "frozen"
        | "canned"
        | "fresh_herb"
        | "dry_herb"
        | "condiment"
        | "beverage"
        | "specialty"
        | "other"
      inquiry_channel:
        | "text"
        | "email"
        | "instagram"
        | "take_a_chef"
        | "phone"
        | "website"
        | "other"
        | "referral"
        | "walk_in"
        | "wix"
        | "campaign_response"
        | "outbound_prospecting"
        | "yhangry"
        | "kiosk"
        | "thumbtack"
        | "theknot"
        | "bark"
        | "cozymeal"
        | "google_business"
        | "gigsalad"
      inquiry_note_category:
        | "general"
        | "inspiration"
        | "menu_planning"
        | "sourcing"
        | "logistics"
        | "staffing"
        | "post_event"
      inquiry_status:
        | "new"
        | "awaiting_client"
        | "awaiting_chef"
        | "quoted"
        | "confirmed"
        | "declined"
        | "expired"
      integration_auth_type: "oauth2" | "api_key" | "pat" | "none"
      integration_provider:
        | "square"
        | "shopify_pos"
        | "clover"
        | "toast"
        | "lightspeed"
        | "calendly"
        | "google_calendar"
        | "hubspot"
        | "salesforce"
        | "wix"
        | "gmail"
        | "custom_webhook"
        | "csv_import"
        | "quickbooks"
        | "docusign"
        | "zapier"
        | "yelp"
      integration_status:
        | "connected"
        | "disconnected"
        | "error"
        | "reauth_required"
      integration_sync_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "duplicate"
      inventory_audit_status:
        | "draft"
        | "in_progress"
        | "pending_review"
        | "finalized"
      inventory_audit_type:
        | "full"
        | "cycle"
        | "spot"
        | "pre_event"
        | "post_event"
      inventory_transaction_type:
        | "receive"
        | "event_deduction"
        | "waste"
        | "staff_meal"
        | "transfer_out"
        | "transfer_in"
        | "audit_adjustment"
        | "return_from_event"
        | "return_to_vendor"
        | "manual_adjustment"
        | "opening_balance"
        | "sale_deduction"
        | "return_from_sale"
      kiosk_flow: "inquiry" | "checkin" | "menu_browse" | "order"
      ledger_entry_type:
        | "payment"
        | "deposit"
        | "installment"
        | "final_payment"
        | "tip"
        | "refund"
        | "adjustment"
        | "add_on"
        | "credit"
        | "retainer"
      loyalty_reward_type:
        | "discount_fixed"
        | "discount_percent"
        | "free_course"
        | "free_dinner"
        | "upgrade"
      loyalty_tier: "bronze" | "silver" | "gold" | "platinum"
      loyalty_transaction_type:
        | "earned"
        | "redeemed"
        | "bonus"
        | "adjustment"
        | "expired"
      menu_approval_status:
        | "not_sent"
        | "sent"
        | "approved"
        | "revision_requested"
      menu_status: "draft" | "shared" | "locked" | "archived"
      message_channel:
        | "text"
        | "email"
        | "instagram"
        | "take_a_chef"
        | "phone"
        | "internal_note"
      message_direction: "inbound" | "outbound"
      message_status: "draft" | "approved" | "sent" | "logged"
      modification_type:
        | "substitution"
        | "addition"
        | "removal"
        | "method_change"
      note_category:
        | "general"
        | "dietary"
        | "preference"
        | "logistics"
        | "relationship"
      ops_log_action:
        | "check_in"
        | "check_out"
        | "prep_complete"
        | "stock_update"
        | "order_request"
        | "delivery_received"
        | "waste"
        | "eighty_six"
      order_queue_status:
        | "received"
        | "preparing"
        | "ready"
        | "picked_up"
        | "cancelled"
      order_request_status: "pending" | "ordered" | "received"
      partner_status: "active" | "inactive"
      partner_type:
        | "airbnb_host"
        | "business"
        | "platform"
        | "individual"
        | "venue"
        | "other"
      payment_method:
        | "cash"
        | "venmo"
        | "paypal"
        | "zelle"
        | "card"
        | "check"
        | "other"
        | "gift_card"
      payment_status:
        | "unpaid"
        | "deposit_paid"
        | "partial"
        | "paid"
        | "refunded"
      pricing_model: "per_person" | "flat_rate" | "custom"
      purchase_order_status:
        | "draft"
        | "submitted"
        | "partially_received"
        | "received"
        | "cancelled"
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      raffle_entry_source: "scratch_card" | "pan_catch" | "bonus"
      raffle_round_status: "active" | "drawing" | "completed" | "cancelled"
      recipe_category:
        | "sauce"
        | "protein"
        | "starch"
        | "vegetable"
        | "fruit"
        | "dessert"
        | "bread"
        | "pasta"
        | "soup"
        | "salad"
        | "appetizer"
        | "condiment"
        | "beverage"
        | "other"
      recipe_cuisine:
        | "italian"
        | "french"
        | "mexican"
        | "japanese"
        | "chinese"
        | "indian"
        | "mediterranean"
        | "thai"
        | "korean"
        | "american"
        | "southern"
        | "middle_eastern"
        | "fusion"
        | "other"
      recipe_meal_type:
        | "breakfast"
        | "brunch"
        | "lunch"
        | "dinner"
        | "snack_passed"
        | "any"
      reconciliation_flag_status: "open" | "resolved" | "ignored"
      referral_source:
        | "take_a_chef"
        | "instagram"
        | "referral"
        | "website"
        | "phone"
        | "email"
        | "other"
      refund_status: "pending" | "processed" | "failed"
      register_session_status: "open" | "suspended" | "closed"
      rsvp_status: "pending" | "attending" | "declined" | "maybe"
      sale_channel: "counter" | "order_ahead" | "invoice" | "online" | "phone"
      sale_status:
        | "draft"
        | "pending_payment"
        | "authorized"
        | "captured"
        | "settled"
        | "partially_refunded"
        | "fully_refunded"
        | "voided"
      share_audience_role: "viewer" | "guest"
      shift_type: "open" | "close" | "mid"
      social_asset_kind: "image" | "video"
      social_media_type: "image" | "video" | "carousel" | "text"
      social_pillar:
        | "recipe"
        | "behind_scenes"
        | "education"
        | "social_proof"
        | "offers"
        | "seasonal"
      social_platform:
        | "instagram"
        | "facebook"
        | "tiktok"
        | "linkedin"
        | "x"
        | "pinterest"
        | "youtube_shorts"
      social_post_status:
        | "idea"
        | "draft"
        | "approved"
        | "queued"
        | "published"
        | "archived"
      spice_tolerance: "none" | "mild" | "medium" | "hot" | "very_hot"
      staff_assignment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "no_show"
      staff_role:
        | "sous_chef"
        | "kitchen_assistant"
        | "service_staff"
        | "server"
        | "bartender"
        | "dishwasher"
        | "other"
      storage_location_type:
        | "home_fridge"
        | "home_freezer"
        | "home_pantry"
        | "home_dry_storage"
        | "walk_in_cooler"
        | "walk_in_freezer"
        | "commercial_kitchen"
        | "vehicle"
        | "event_site"
        | "other"
      substitution_reason:
        | "unavailable"
        | "price"
        | "quality"
        | "preference"
        | "forgot"
        | "other"
      suggested_link_status: "pending" | "accepted" | "rejected"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "done"
      task_template_category:
        | "opening"
        | "closing"
        | "prep"
        | "cleaning"
        | "custom"
      tax_class:
        | "standard"
        | "reduced"
        | "exempt"
        | "alcohol"
        | "cannabis"
        | "prepared_food"
        | "zero"
      unused_reason: "leftover_reusable" | "wasted" | "returned"
      upload_job_status:
        | "uploaded"
        | "extracting"
        | "parsing"
        | "review"
        | "completed"
        | "failed"
      user_role: "chef" | "client" | "system" | "partner" | "staff"
      waste_reason: "expired" | "damaged" | "overproduced" | "dropped" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cancellation_initiator: ["chef", "client", "mutual"],
      cash_drawer_movement_type: [
        "sale_payment",
        "refund",
        "paid_in",
        "paid_out",
        "adjustment",
      ],
      chat_message_type: [
        "text",
        "image",
        "link",
        "event_ref",
        "system",
        "file",
      ],
      chef_calendar_entry_type: [
        "vacation",
        "time_off",
        "personal",
        "market",
        "festival",
        "class",
        "photo_shoot",
        "media",
        "meeting",
        "admin_block",
        "other",
        "target_booking",
        "soft_preference",
      ],
      chef_connection_status: ["pending", "accepted", "declined"],
      chef_event_label_type: ["occasion_type", "status_label"],
      chef_goal_status: ["active", "paused", "completed", "archived"],
      chef_goal_type: [
        "revenue_monthly",
        "revenue_annual",
        "revenue_custom",
        "booking_count",
        "new_clients",
        "recipe_library",
        "profit_margin",
        "expense_ratio",
        "repeat_booking_rate",
        "referrals_received",
        "dishes_created",
        "cuisines_explored",
        "workshops_attended",
        "review_average",
        "total_reviews",
        "staff_training_hours",
        "vendor_relationships",
        "books_read",
        "courses_completed",
        "weekly_workouts",
        "rest_days_taken",
        "family_dinners",
        "vacation_days",
        "charity_events",
        "meals_donated",
      ],
      chef_journal_media_type: ["photo", "video", "document"],
      chef_journey_entry_type: [
        "destination",
        "meal",
        "lesson",
        "experience",
        "idea",
        "reflection",
        "technique",
        "ingredient",
      ],
      chef_journey_idea_area: [
        "menu",
        "technique",
        "service",
        "sourcing",
        "team",
        "operations",
      ],
      chef_journey_idea_status: ["backlog", "testing", "adopted", "parked"],
      chef_journey_status: ["planning", "in_progress", "completed", "archived"],
      chef_network_contact_share_status: ["open", "accepted", "passed"],
      chef_network_feature_key: [
        "availability",
        "referral_asks",
        "referral_offers",
        "collab_requests",
        "menu_spotlights",
        "sourcing_intel",
        "operational_tips",
        "equipment_feedback",
        "event_recap_learnings",
        "urgent_needs",
        "professional_proof",
        "questions_to_network",
      ],
      client_status: ["active", "dormant", "repeat_ready", "vip"],
      commerce_payment_status: [
        "pending",
        "authorized",
        "captured",
        "settled",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
        "disputed",
      ],
      communication_action_source: [
        "manual",
        "webhook",
        "automation",
        "import",
      ],
      communication_direction: ["inbound", "outbound"],
      communication_event_status: ["unlinked", "linked", "resolved"],
      communication_source: [
        "email",
        "website_form",
        "sms",
        "instagram",
        "takeachef",
        "manual_log",
        "yhangry",
        "phone",
        "whatsapp",
        "facebook",
        "theknot",
        "thumbtack",
        "bark",
        "cozymeal",
        "google_business",
        "gigsalad",
      ],
      component_category: [
        "sauce",
        "protein",
        "starch",
        "vegetable",
        "fruit",
        "dessert",
        "garnish",
        "bread",
        "cheese",
        "condiment",
        "beverage",
        "other",
      ],
      contact_method: ["phone", "email", "text", "instagram"],
      contract_status: ["draft", "sent", "viewed", "signed", "voided"],
      conversation_context_type: ["standalone", "inquiry", "event"],
      conversation_thread_state: ["active", "snoozed", "closed"],
      custom_field_entity_type: ["event", "client", "recipe"],
      custom_field_type: [
        "text",
        "number",
        "date",
        "select",
        "multi_select",
        "toggle",
      ],
      device_mode: ["kiosk"],
      device_status: ["pending_pair", "active", "disabled", "revoked"],
      device_type: ["ipad", "android", "browser"],
      dish_plating_difficulty: ["simple", "moderate", "architectural"],
      dish_prep_complexity: ["quick", "moderate", "intensive"],
      dish_rotation_status: ["active", "resting", "retired", "testing"],
      equipment_category: [
        "cookware",
        "knives",
        "smallwares",
        "appliances",
        "serving",
        "transport",
        "linen",
        "other",
      ],
      event_cannabis_category: [
        "cannabis_friendly",
        "infused_menu",
        "cbd_only",
        "micro_dose",
      ],
      event_join_request_status: ["pending", "approved", "denied"],
      event_service_style: [
        "plated",
        "family_style",
        "buffet",
        "cocktail",
        "tasting_menu",
        "other",
      ],
      event_share_invite_status: ["active", "consumed", "revoked", "expired"],
      event_status: [
        "draft",
        "proposed",
        "accepted",
        "paid",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      expense_category: [
        "groceries",
        "alcohol",
        "specialty_items",
        "gas_mileage",
        "equipment",
        "supplies",
        "other",
        "vehicle",
        "venue_rental",
        "subscriptions",
        "marketing",
        "labor",
        "insurance_licenses",
        "professional_services",
        "education",
        "uniforms",
        "utilities",
      ],
      follow_up_timer_status: ["active", "completed", "dismissed"],
      guest_attending_status: ["yes", "no"],
      guest_cannabis_participation: ["participate", "not_consume", "undecided"],
      guest_consumption_style: [
        "edibles",
        "infused_course",
        "paired_noninfused",
        "skip_infusion",
        "unsure",
        "smoking",
        "tincture",
        "other",
      ],
      guest_edible_familiarity: [
        "none",
        "low",
        "moderate",
        "high",
        "yes",
        "no",
        "unsure",
      ],
      guest_familiarity_level: [
        "new",
        "light",
        "moderate",
        "experienced",
        "first_time",
        "occasional",
        "regular",
      ],
      guest_reservation_status: [
        "confirmed",
        "seated",
        "completed",
        "no_show",
        "cancelled",
      ],
      household_relationship: [
        "partner",
        "child",
        "family_member",
        "regular_guest",
      ],
      incentive_delivery_channel: ["email", "manual"],
      incentive_type: ["voucher", "gift_card"],
      ingredient_category: [
        "protein",
        "produce",
        "dairy",
        "pantry",
        "spice",
        "oil",
        "alcohol",
        "baking",
        "frozen",
        "canned",
        "fresh_herb",
        "dry_herb",
        "condiment",
        "beverage",
        "specialty",
        "other",
      ],
      inquiry_channel: [
        "text",
        "email",
        "instagram",
        "take_a_chef",
        "phone",
        "website",
        "other",
        "referral",
        "walk_in",
        "wix",
        "campaign_response",
        "outbound_prospecting",
        "yhangry",
        "kiosk",
        "thumbtack",
        "theknot",
        "bark",
        "cozymeal",
        "google_business",
        "gigsalad",
      ],
      inquiry_note_category: [
        "general",
        "inspiration",
        "menu_planning",
        "sourcing",
        "logistics",
        "staffing",
        "post_event",
      ],
      inquiry_status: [
        "new",
        "awaiting_client",
        "awaiting_chef",
        "quoted",
        "confirmed",
        "declined",
        "expired",
      ],
      integration_auth_type: ["oauth2", "api_key", "pat", "none"],
      integration_provider: [
        "square",
        "shopify_pos",
        "clover",
        "toast",
        "lightspeed",
        "calendly",
        "google_calendar",
        "hubspot",
        "salesforce",
        "wix",
        "gmail",
        "custom_webhook",
        "csv_import",
        "quickbooks",
        "docusign",
        "zapier",
        "yelp",
      ],
      integration_status: [
        "connected",
        "disconnected",
        "error",
        "reauth_required",
      ],
      integration_sync_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "duplicate",
      ],
      inventory_audit_status: [
        "draft",
        "in_progress",
        "pending_review",
        "finalized",
      ],
      inventory_audit_type: [
        "full",
        "cycle",
        "spot",
        "pre_event",
        "post_event",
      ],
      inventory_transaction_type: [
        "receive",
        "event_deduction",
        "waste",
        "staff_meal",
        "transfer_out",
        "transfer_in",
        "audit_adjustment",
        "return_from_event",
        "return_to_vendor",
        "manual_adjustment",
        "opening_balance",
        "sale_deduction",
        "return_from_sale",
      ],
      kiosk_flow: ["inquiry", "checkin", "menu_browse", "order"],
      ledger_entry_type: [
        "payment",
        "deposit",
        "installment",
        "final_payment",
        "tip",
        "refund",
        "adjustment",
        "add_on",
        "credit",
        "retainer",
      ],
      loyalty_reward_type: [
        "discount_fixed",
        "discount_percent",
        "free_course",
        "free_dinner",
        "upgrade",
      ],
      loyalty_tier: ["bronze", "silver", "gold", "platinum"],
      loyalty_transaction_type: [
        "earned",
        "redeemed",
        "bonus",
        "adjustment",
        "expired",
      ],
      menu_approval_status: [
        "not_sent",
        "sent",
        "approved",
        "revision_requested",
      ],
      menu_status: ["draft", "shared", "locked", "archived"],
      message_channel: [
        "text",
        "email",
        "instagram",
        "take_a_chef",
        "phone",
        "internal_note",
      ],
      message_direction: ["inbound", "outbound"],
      message_status: ["draft", "approved", "sent", "logged"],
      modification_type: [
        "substitution",
        "addition",
        "removal",
        "method_change",
      ],
      note_category: [
        "general",
        "dietary",
        "preference",
        "logistics",
        "relationship",
      ],
      ops_log_action: [
        "check_in",
        "check_out",
        "prep_complete",
        "stock_update",
        "order_request",
        "delivery_received",
        "waste",
        "eighty_six",
      ],
      order_queue_status: [
        "received",
        "preparing",
        "ready",
        "picked_up",
        "cancelled",
      ],
      order_request_status: ["pending", "ordered", "received"],
      partner_status: ["active", "inactive"],
      partner_type: [
        "airbnb_host",
        "business",
        "platform",
        "individual",
        "venue",
        "other",
      ],
      payment_method: [
        "cash",
        "venmo",
        "paypal",
        "zelle",
        "card",
        "check",
        "other",
        "gift_card",
      ],
      payment_status: ["unpaid", "deposit_paid", "partial", "paid", "refunded"],
      pricing_model: ["per_person", "flat_rate", "custom"],
      purchase_order_status: [
        "draft",
        "submitted",
        "partially_received",
        "received",
        "cancelled",
      ],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
      raffle_entry_source: ["scratch_card", "pan_catch", "bonus"],
      raffle_round_status: ["active", "drawing", "completed", "cancelled"],
      recipe_category: [
        "sauce",
        "protein",
        "starch",
        "vegetable",
        "fruit",
        "dessert",
        "bread",
        "pasta",
        "soup",
        "salad",
        "appetizer",
        "condiment",
        "beverage",
        "other",
      ],
      recipe_cuisine: [
        "italian",
        "french",
        "mexican",
        "japanese",
        "chinese",
        "indian",
        "mediterranean",
        "thai",
        "korean",
        "american",
        "southern",
        "middle_eastern",
        "fusion",
        "other",
      ],
      recipe_meal_type: [
        "breakfast",
        "brunch",
        "lunch",
        "dinner",
        "snack_passed",
        "any",
      ],
      reconciliation_flag_status: ["open", "resolved", "ignored"],
      referral_source: [
        "take_a_chef",
        "instagram",
        "referral",
        "website",
        "phone",
        "email",
        "other",
      ],
      refund_status: ["pending", "processed", "failed"],
      register_session_status: ["open", "suspended", "closed"],
      rsvp_status: ["pending", "attending", "declined", "maybe"],
      sale_channel: ["counter", "order_ahead", "invoice", "online", "phone"],
      sale_status: [
        "draft",
        "pending_payment",
        "authorized",
        "captured",
        "settled",
        "partially_refunded",
        "fully_refunded",
        "voided",
      ],
      share_audience_role: ["viewer", "guest"],
      shift_type: ["open", "close", "mid"],
      social_asset_kind: ["image", "video"],
      social_media_type: ["image", "video", "carousel", "text"],
      social_pillar: [
        "recipe",
        "behind_scenes",
        "education",
        "social_proof",
        "offers",
        "seasonal",
      ],
      social_platform: [
        "instagram",
        "facebook",
        "tiktok",
        "linkedin",
        "x",
        "pinterest",
        "youtube_shorts",
      ],
      social_post_status: [
        "idea",
        "draft",
        "approved",
        "queued",
        "published",
        "archived",
      ],
      spice_tolerance: ["none", "mild", "medium", "hot", "very_hot"],
      staff_assignment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "no_show",
      ],
      staff_role: [
        "sous_chef",
        "kitchen_assistant",
        "service_staff",
        "server",
        "bartender",
        "dishwasher",
        "other",
      ],
      storage_location_type: [
        "home_fridge",
        "home_freezer",
        "home_pantry",
        "home_dry_storage",
        "walk_in_cooler",
        "walk_in_freezer",
        "commercial_kitchen",
        "vehicle",
        "event_site",
        "other",
      ],
      substitution_reason: [
        "unavailable",
        "price",
        "quality",
        "preference",
        "forgot",
        "other",
      ],
      suggested_link_status: ["pending", "accepted", "rejected"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "done"],
      task_template_category: [
        "opening",
        "closing",
        "prep",
        "cleaning",
        "custom",
      ],
      tax_class: [
        "standard",
        "reduced",
        "exempt",
        "alcohol",
        "cannabis",
        "prepared_food",
        "zero",
      ],
      unused_reason: ["leftover_reusable", "wasted", "returned"],
      upload_job_status: [
        "uploaded",
        "extracting",
        "parsing",
        "review",
        "completed",
        "failed",
      ],
      user_role: ["chef", "client", "system", "partner", "staff"],
      waste_reason: ["expired", "damaged", "overproduced", "dropped", "other"],
    },
  },
} as const
