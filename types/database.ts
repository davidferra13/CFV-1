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
  public: {
    Tables: {
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
      chef_documents: {
        Row: {
          client_id: string | null
          content_text: string | null
          created_at: string
          created_by: string | null
          document_type: string
          event_id: string | null
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
            foreignKeyName: "chef_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_preferences: {
        Row: {
          chef_id: string
          created_at: string
          default_buffer_minutes: number
          default_grocery_address: string | null
          default_grocery_store: string | null
          default_liquor_address: string | null
          default_liquor_store: string | null
          default_packing_minutes: number
          default_prep_hours: number
          default_shopping_minutes: number
          default_specialty_stores: Json
          home_address: string | null
          home_city: string | null
          home_state: string | null
          home_zip: string | null
          id: string
          shop_day_before: boolean
          target_margin_percent: number
          tenant_id: string
          updated_at: string
          wake_time_earliest: string
          wake_time_latest: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          default_buffer_minutes?: number
          default_grocery_address?: string | null
          default_grocery_store?: string | null
          default_liquor_address?: string | null
          default_liquor_store?: string | null
          default_packing_minutes?: number
          default_prep_hours?: number
          default_shopping_minutes?: number
          default_specialty_stores?: Json
          home_address?: string | null
          home_city?: string | null
          home_state?: string | null
          home_zip?: string | null
          id?: string
          shop_day_before?: boolean
          target_margin_percent?: number
          tenant_id: string
          updated_at?: string
          wake_time_earliest?: string
          wake_time_latest?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          default_buffer_minutes?: number
          default_grocery_address?: string | null
          default_grocery_store?: string | null
          default_liquor_address?: string | null
          default_liquor_store?: string | null
          default_packing_minutes?: number
          default_prep_hours?: number
          default_shopping_minutes?: number
          default_specialty_stores?: Json
          home_address?: string | null
          home_city?: string | null
          home_state?: string | null
          home_zip?: string | null
          id?: string
          shop_day_before?: boolean
          target_margin_percent?: number
          tenant_id?: string
          updated_at?: string
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
      chefs: {
        Row: {
          auth_user_id: string
          business_name: string
          created_at: string
          email: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          business_name: string
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          business_name?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      clients: {
        Row: {
          access_instructions: string | null
          additional_addresses: Json | null
          address: string | null
          allergies: string[] | null
          auth_user_id: string | null
          average_spend_cents: number | null
          children: string[] | null
          created_at: string
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
          full_name: string
          house_rules: string | null
          id: string
          kitchen_constraints: string | null
          kitchen_size: string | null
          last_event_date: string | null
          lifetime_value_cents: number | null
          loyalty_points: number | null
          loyalty_tier: Database["public"]["Enums"]["loyalty_tier"]
          parking_instructions: string | null
          partner_name: string | null
          partner_preferred_name: string | null
          payment_behavior: string | null
          personal_milestones: Json | null
          phone: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          preferred_name: string | null
          referral_source: Database["public"]["Enums"]["referral_source"] | null
          referral_source_detail: string | null
          regular_guests: Json | null
          spice_tolerance: Database["public"]["Enums"]["spice_tolerance"] | null
          status: Database["public"]["Enums"]["client_status"]
          tenant_id: string
          tipping_pattern: string | null
          total_events_completed: number | null
          total_events_count: number | null
          total_guests_served: number | null
          total_payments_received_cents: number | null
          updated_at: string
          vibe_notes: string | null
          what_they_care_about: string | null
          wine_beverage_preferences: string | null
        }
        Insert: {
          access_instructions?: string | null
          additional_addresses?: Json | null
          address?: string | null
          allergies?: string[] | null
          auth_user_id?: string | null
          average_spend_cents?: number | null
          children?: string[] | null
          created_at?: string
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
          full_name: string
          house_rules?: string | null
          id?: string
          kitchen_constraints?: string | null
          kitchen_size?: string | null
          last_event_date?: string | null
          lifetime_value_cents?: number | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"]
          parking_instructions?: string | null
          partner_name?: string | null
          partner_preferred_name?: string | null
          payment_behavior?: string | null
          personal_milestones?: Json | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          preferred_name?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referral_source_detail?: string | null
          regular_guests?: Json | null
          spice_tolerance?:
            | Database["public"]["Enums"]["spice_tolerance"]
            | null
          status?: Database["public"]["Enums"]["client_status"]
          tenant_id: string
          tipping_pattern?: string | null
          total_events_completed?: number | null
          total_events_count?: number | null
          total_guests_served?: number | null
          total_payments_received_cents?: number | null
          updated_at?: string
          vibe_notes?: string | null
          what_they_care_about?: string | null
          wine_beverage_preferences?: string | null
        }
        Update: {
          access_instructions?: string | null
          additional_addresses?: Json | null
          address?: string | null
          allergies?: string[] | null
          auth_user_id?: string | null
          average_spend_cents?: number | null
          children?: string[] | null
          created_at?: string
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
          full_name?: string
          house_rules?: string | null
          id?: string
          kitchen_constraints?: string | null
          kitchen_size?: string | null
          last_event_date?: string | null
          lifetime_value_cents?: number | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"]
          parking_instructions?: string | null
          partner_name?: string | null
          partner_preferred_name?: string | null
          payment_behavior?: string | null
          personal_milestones?: Json | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          preferred_name?: string | null
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          referral_source_detail?: string | null
          regular_guests?: Json | null
          spice_tolerance?:
            | Database["public"]["Enums"]["spice_tolerance"]
            | null
          status?: Database["public"]["Enums"]["client_status"]
          tenant_id?: string
          tipping_pattern?: string | null
          total_events_completed?: number | null
          total_events_count?: number | null
          total_guests_served?: number | null
          total_payments_received_cents?: number | null
          updated_at?: string
          vibe_notes?: string | null
          what_they_care_about?: string | null
          wine_beverage_preferences?: string | null
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
          recipe_id: string | null
          scale_factor: number
          sort_order: number
          storage_notes: string | null
          tenant_id: string
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
          recipe_id?: string | null
          scale_factor?: number
          sort_order?: number
          storage_notes?: string | null
          tenant_id: string
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
          recipe_id?: string | null
          scale_factor?: number
          sort_order?: number
          storage_notes?: string | null
          tenant_id?: string
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
      dishes: {
        Row: {
          allergen_flags: string[]
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
          sort_order: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergen_flags?: string[]
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
          sort_order?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergen_flags?: string[]
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
      events: {
        Row: {
          aar_filed: boolean
          access_instructions: string | null
          allergies: string[]
          archived: boolean
          arrival_time: string | null
          cancellation_initiated_by:
            | Database["public"]["Enums"]["cancellation_initiator"]
            | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cannabis_preference: boolean | null
          car_packed: boolean
          car_packed_at: string | null
          card_cashback_percent: number | null
          client_id: string
          component_count_total: number | null
          created_at: string
          created_by: string | null
          departure_time: string | null
          deposit_amount_cents: number | null
          dietary_restrictions: string[]
          equipment_list_ready: boolean
          event_date: string
          execution_sheet_ready: boolean
          financially_closed: boolean
          follow_up_sent: boolean
          follow_up_sent_at: string | null
          grocery_list_ready: boolean
          guest_count: number
          guest_count_confirmed: boolean
          id: string
          inquiry_id: string | null
          kitchen_notes: string | null
          leftover_notes: string | null
          leftover_value_carried_forward_cents: number | null
          leftover_value_received_cents: number | null
          location_address: string
          location_city: string
          location_notes: string | null
          location_state: string
          location_zip: string
          loyalty_points_awarded: boolean
          menu_id: string | null
          non_negotiables_checked: boolean
          occasion: string | null
          packing_list_ready: boolean
          payment_card_used: string | null
          payment_method_primary:
            | Database["public"]["Enums"]["payment_method"]
            | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          prep_completed_at: string | null
          prep_list_ready: boolean
          prep_started_at: string | null
          pricing_model: Database["public"]["Enums"]["pricing_model"] | null
          pricing_notes: string | null
          pricing_snapshot: Json | null
          quoted_price_cents: number | null
          reset_complete: boolean
          reset_completed_at: string | null
          reset_started_at: string | null
          review_link_sent: boolean
          serve_time: string
          service_completed_at: string | null
          service_started_at: string | null
          service_style: Database["public"]["Enums"]["event_service_style"]
          shopping_completed_at: string | null
          shopping_started_at: string | null
          site_notes: string | null
          special_requests: string | null
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
          travel_started_at: string | null
          travel_time_minutes: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aar_filed?: boolean
          access_instructions?: string | null
          allergies?: string[]
          archived?: boolean
          arrival_time?: string | null
          cancellation_initiated_by?:
            | Database["public"]["Enums"]["cancellation_initiator"]
            | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cannabis_preference?: boolean | null
          car_packed?: boolean
          car_packed_at?: string | null
          card_cashback_percent?: number | null
          client_id: string
          component_count_total?: number | null
          created_at?: string
          created_by?: string | null
          departure_time?: string | null
          deposit_amount_cents?: number | null
          dietary_restrictions?: string[]
          equipment_list_ready?: boolean
          event_date: string
          execution_sheet_ready?: boolean
          financially_closed?: boolean
          follow_up_sent?: boolean
          follow_up_sent_at?: string | null
          grocery_list_ready?: boolean
          guest_count: number
          guest_count_confirmed?: boolean
          id?: string
          inquiry_id?: string | null
          kitchen_notes?: string | null
          leftover_notes?: string | null
          leftover_value_carried_forward_cents?: number | null
          leftover_value_received_cents?: number | null
          location_address: string
          location_city: string
          location_notes?: string | null
          location_state?: string
          location_zip: string
          loyalty_points_awarded?: boolean
          menu_id?: string | null
          non_negotiables_checked?: boolean
          occasion?: string | null
          packing_list_ready?: boolean
          payment_card_used?: string | null
          payment_method_primary?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          prep_completed_at?: string | null
          prep_list_ready?: boolean
          prep_started_at?: string | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          pricing_notes?: string | null
          pricing_snapshot?: Json | null
          quoted_price_cents?: number | null
          reset_complete?: boolean
          reset_completed_at?: string | null
          reset_started_at?: string | null
          review_link_sent?: boolean
          serve_time: string
          service_completed_at?: string | null
          service_started_at?: string | null
          service_style?: Database["public"]["Enums"]["event_service_style"]
          shopping_completed_at?: string | null
          shopping_started_at?: string | null
          site_notes?: string | null
          special_requests?: string | null
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
          travel_started_at?: string | null
          travel_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aar_filed?: boolean
          access_instructions?: string | null
          allergies?: string[]
          archived?: boolean
          arrival_time?: string | null
          cancellation_initiated_by?:
            | Database["public"]["Enums"]["cancellation_initiator"]
            | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cannabis_preference?: boolean | null
          car_packed?: boolean
          car_packed_at?: string | null
          card_cashback_percent?: number | null
          client_id?: string
          component_count_total?: number | null
          created_at?: string
          created_by?: string | null
          departure_time?: string | null
          deposit_amount_cents?: number | null
          dietary_restrictions?: string[]
          equipment_list_ready?: boolean
          event_date?: string
          execution_sheet_ready?: boolean
          financially_closed?: boolean
          follow_up_sent?: boolean
          follow_up_sent_at?: string | null
          grocery_list_ready?: boolean
          guest_count?: number
          guest_count_confirmed?: boolean
          id?: string
          inquiry_id?: string | null
          kitchen_notes?: string | null
          leftover_notes?: string | null
          leftover_value_carried_forward_cents?: number | null
          leftover_value_received_cents?: number | null
          location_address?: string
          location_city?: string
          location_notes?: string | null
          location_state?: string
          location_zip?: string
          loyalty_points_awarded?: boolean
          menu_id?: string | null
          non_negotiables_checked?: boolean
          occasion?: string | null
          packing_list_ready?: boolean
          payment_card_used?: string | null
          payment_method_primary?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          prep_completed_at?: string | null
          prep_list_ready?: boolean
          prep_started_at?: string | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"] | null
          pricing_notes?: string | null
          pricing_snapshot?: Json | null
          quoted_price_cents?: number | null
          reset_complete?: boolean
          reset_completed_at?: string | null
          reset_started_at?: string | null
          review_link_sent?: boolean
          serve_time?: string
          service_completed_at?: string | null
          service_started_at?: string | null
          service_style?: Database["public"]["Enums"]["event_service_style"]
          shopping_completed_at?: string | null
          shopping_started_at?: string | null
          site_notes?: string | null
          special_requests?: string | null
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
          travel_started_at?: string | null
          travel_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
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
      gmail_sync_log: {
        Row: {
          action_taken: string | null
          classification: string
          confidence: string
          error: string | null
          from_address: string | null
          gmail_message_id: string
          gmail_thread_id: string | null
          id: string
          inquiry_id: string | null
          message_id: string | null
          subject: string | null
          synced_at: string
          tenant_id: string
        }
        Insert: {
          action_taken?: string | null
          classification: string
          confidence: string
          error?: string | null
          from_address?: string | null
          gmail_message_id: string
          gmail_thread_id?: string | null
          id?: string
          inquiry_id?: string | null
          message_id?: string | null
          subject?: string | null
          synced_at?: string
          tenant_id: string
        }
        Update: {
          action_taken?: string | null
          classification?: string
          confidence?: string
          error?: string | null
          from_address?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string | null
          id?: string
          inquiry_id?: string | null
          message_id?: string | null
          subject?: string | null
          synced_at?: string
          tenant_id?: string
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
          channel: Database["public"]["Enums"]["inquiry_channel"]
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
          first_contact_at: string
          follow_up_due_at: string | null
          id: string
          last_response_at: string | null
          next_action_by: string | null
          next_action_required: string | null
          source_message: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          tenant_id: string
          unknown_fields: Json | null
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["inquiry_channel"]
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
          first_contact_at: string
          follow_up_due_at?: string | null
          id?: string
          last_response_at?: string | null
          next_action_by?: string | null
          next_action_required?: string | null
          source_message?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          tenant_id: string
          unknown_fields?: Json | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["inquiry_channel"]
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
          first_contact_at?: string
          follow_up_due_at?: string | null
          id?: string
          last_response_at?: string | null
          next_action_by?: string | null
          next_action_required?: string | null
          source_message?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          tenant_id?: string
          unknown_fields?: Json | null
          updated_at?: string
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
            foreignKeyName: "inquiries_tenant_id_fkey"
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
          id: string
          is_active: boolean
          milestone_bonuses: Json
          points_per_guest: number
          tenant_id: string
          tier_bronze_min: number
          tier_gold_min: number
          tier_platinum_min: number
          tier_silver_min: number
          updated_at: string
        }
        Insert: {
          bonus_large_party_points?: number | null
          bonus_large_party_threshold?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          milestone_bonuses?: Json
          points_per_guest?: number
          tenant_id: string
          tier_bronze_min?: number
          tier_gold_min?: number
          tier_platinum_min?: number
          tier_silver_min?: number
          updated_at?: string
        }
        Update: {
          bonus_large_party_points?: number | null
          bonus_large_party_threshold?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          milestone_bonuses?: Json
          points_per_guest?: number
          tenant_id?: string
          tier_bronze_min?: number
          tier_gold_min?: number
          tier_platinum_min?: number
          tier_silver_min?: number
          updated_at?: string
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
      menu_modifications: {
        Row: {
          actual_description: string | null
          component_id: string | null
          created_at: string
          event_id: string
          id: string
          modification_type: Database["public"]["Enums"]["modification_type"]
          original_description: string | null
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
      menus: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          cuisine_type: string | null
          description: string | null
          event_id: string | null
          id: string
          is_template: boolean
          locked_at: string | null
          name: string
          notes: string | null
          service_style:
            | Database["public"]["Enums"]["event_service_style"]
            | null
          shared_at: string | null
          status: Database["public"]["Enums"]["menu_status"]
          target_guest_count: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_template?: boolean
          locked_at?: string | null
          name: string
          notes?: string | null
          service_style?:
            | Database["public"]["Enums"]["event_service_style"]
            | null
          shared_at?: string | null
          status?: Database["public"]["Enums"]["menu_status"]
          target_guest_count?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_template?: boolean
          locked_at?: string | null
          name?: string
          notes?: string | null
          service_style?:
            | Database["public"]["Enums"]["event_service_style"]
            | null
          shared_at?: string | null
          status?: Database["public"]["Enums"]["menu_status"]
          target_guest_count?: number | null
          tenant_id?: string
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
          deposit_amount_cents: number | null
          deposit_percentage: number | null
          deposit_required: boolean
          event_id: string | null
          expired_at: string | null
          guest_count_estimated: number | null
          id: string
          inquiry_id: string | null
          internal_notes: string | null
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
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deposit_amount_cents?: number | null
          deposit_percentage?: number | null
          deposit_required?: boolean
          event_id?: string | null
          expired_at?: string | null
          guest_count_estimated?: number | null
          id?: string
          inquiry_id?: string | null
          internal_notes?: string | null
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
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deposit_amount_cents?: number | null
          deposit_percentage?: number | null
          deposit_required?: boolean
          event_id?: string | null
          expired_at?: string | null
          guest_count_estimated?: number | null
          id?: string
          inquiry_id?: string | null
          internal_notes?: string | null
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
            foreignKeyName: "quotes_tenant_id_fkey"
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
      recipes: {
        Row: {
          adaptations: string | null
          archived: boolean
          archived_at: string | null
          category: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes: number | null
          created_at: string
          created_by: string | null
          description: string | null
          dietary_tags: string[]
          id: string
          last_cooked_at: string | null
          method: string
          method_detailed: string | null
          name: string
          notes: string | null
          photo_url: string | null
          prep_time_minutes: number | null
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
          category: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dietary_tags?: string[]
          id?: string
          last_cooked_at?: string | null
          method: string
          method_detailed?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          prep_time_minutes?: number | null
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
          category?: Database["public"]["Enums"]["recipe_category"]
          cook_time_minutes?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dietary_tags?: string[]
          id?: string
          last_cooked_at?: string | null
          method?: string
          method_detailed?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          prep_time_minutes?: number | null
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
      response_templates: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
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
          name: string
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
          name?: string
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
      unused_ingredients: {
        Row: {
          created_at: string
          estimated_cost_cents: number | null
          event_id: string
          id: string
          ingredient_name: string
          notes: string | null
          reason: Database["public"]["Enums"]["unused_reason"]
          tenant_id: string
          transferred_to_event_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost_cents?: number | null
          event_id: string
          id?: string
          ingredient_name: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["unused_reason"]
          tenant_id: string
          transferred_to_event_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost_cents?: number | null
          event_id?: string
          id?: string
          ingredient_name?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["unused_reason"]
          tenant_id?: string
          transferred_to_event_id?: string | null
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
    }
    Functions: {
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
      get_menu_course_count: { Args: { p_menu_id: string }; Returns: number }
      get_menu_total_component_count: {
        Args: { p_menu_id: string }
        Returns: number
      }
      get_recipe_allergen_flags: {
        Args: { p_recipe_id: string }
        Returns: string[]
      }
    }
    Enums: {
      cancellation_initiator: "chef" | "client" | "mutual"
      client_status: "active" | "dormant" | "repeat_ready" | "vip"
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
      event_service_style:
        | "plated"
        | "family_style"
        | "buffet"
        | "cocktail"
        | "tasting_menu"
        | "other"
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
        | "other"
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
      inquiry_status:
        | "new"
        | "awaiting_client"
        | "awaiting_chef"
        | "quoted"
        | "confirmed"
        | "declined"
        | "expired"
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
      payment_method:
        | "cash"
        | "venmo"
        | "paypal"
        | "zelle"
        | "card"
        | "check"
        | "other"
      payment_status:
        | "unpaid"
        | "deposit_paid"
        | "partial"
        | "paid"
        | "refunded"
      pricing_model: "per_person" | "flat_rate" | "custom"
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
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
      referral_source:
        | "take_a_chef"
        | "instagram"
        | "referral"
        | "website"
        | "phone"
        | "email"
        | "other"
      spice_tolerance: "none" | "mild" | "medium" | "hot" | "very_hot"
      substitution_reason:
        | "unavailable"
        | "price"
        | "quality"
        | "preference"
        | "forgot"
        | "other"
      unused_reason: "leftover_reusable" | "wasted" | "returned"
      user_role: "chef" | "client"
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
  public: {
    Enums: {
      cancellation_initiator: ["chef", "client", "mutual"],
      client_status: ["active", "dormant", "repeat_ready", "vip"],
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
      event_service_style: [
        "plated",
        "family_style",
        "buffet",
        "cocktail",
        "tasting_menu",
        "other",
      ],
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
        "other",
      ],
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
      payment_method: [
        "cash",
        "venmo",
        "paypal",
        "zelle",
        "card",
        "check",
        "other",
      ],
      payment_status: ["unpaid", "deposit_paid", "partial", "paid", "refunded"],
      pricing_model: ["per_person", "flat_rate", "custom"],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
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
      referral_source: [
        "take_a_chef",
        "instagram",
        "referral",
        "website",
        "phone",
        "email",
        "other",
      ],
      spice_tolerance: ["none", "mild", "medium", "hot", "very_hot"],
      substitution_reason: [
        "unavailable",
        "price",
        "quality",
        "preference",
        "forgot",
        "other",
      ],
      unused_reason: ["leftover_reusable", "wasted", "returned"],
      user_role: ["chef", "client"],
    },
  },
} as const
