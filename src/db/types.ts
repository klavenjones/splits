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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      body_checkins: {
        Row: {
          body_fat_pct: number | null
          checkin_date: string
          created_at: string
          hip_cm: number | null
          id: string
          neck_cm: number | null
          source: string
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          checkin_date: string
          created_at?: string
          hip_cm?: number | null
          id?: string
          neck_cm?: number | null
          source?: string
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          checkin_date?: string
          created_at?: string
          hip_cm?: number | null
          id?: string
          neck_cm?: number | null
          source?: string
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          demo_type: Database["public"]["Enums"]["demo_type"]
          demo_url: string | null
          equipment: string | null
          id: string
          instructions: Json | null
          is_archived: boolean
          name: string
          notes: string | null
          owner_id: string | null
          primary_muscle: string | null
          secondary_muscles: string[]
          thumbnail_url: string | null
          tracking_type: Database["public"]["Enums"]["tracking_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_type?: Database["public"]["Enums"]["demo_type"]
          demo_url?: string | null
          equipment?: string | null
          id?: string
          instructions?: Json | null
          is_archived?: boolean
          name: string
          notes?: string | null
          owner_id?: string | null
          primary_muscle?: string | null
          secondary_muscles?: string[]
          thumbnail_url?: string | null
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_type?: Database["public"]["Enums"]["demo_type"]
          demo_url?: string | null
          equipment?: string | null
          id?: string
          instructions?: Json | null
          is_archived?: boolean
          name?: string
          notes?: string | null
          owner_id?: string | null
          primary_muscle?: string | null
          secondary_muscles?: string[]
          thumbnail_url?: string | null
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      food_logs: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          food_id: string | null
          id: string
          kcal: number
          log_date: string
          meal: Database["public"]["Enums"]["meal"]
          name_snapshot: string
          protein_g: number
          servings: number
          source_saved_meal_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_id?: string | null
          id?: string
          kcal: number
          log_date: string
          meal: Database["public"]["Enums"]["meal"]
          name_snapshot: string
          protein_g?: number
          servings?: number
          source_saved_meal_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_id?: string | null
          id?: string
          kcal?: number
          log_date?: string
          meal?: Database["public"]["Enums"]["meal"]
          name_snapshot?: string
          protein_g?: number
          servings?: number
          source_saved_meal_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_source_saved_meal_id_fkey"
            columns: ["source_saved_meal_id"]
            isOneToOne: false
            referencedRelation: "saved_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          brand: string | null
          carbs_g: number
          created_at: string
          external_id: string | null
          fat_g: number
          fiber_g: number | null
          id: string
          kcal: number
          name: string
          owner_id: string | null
          protein_g: number
          serving_grams: number | null
          serving_qty: number
          serving_unit: string
          source: Database["public"]["Enums"]["food_source"]
          updated_at: string
        }
        Insert: {
          brand?: string | null
          carbs_g?: number
          created_at?: string
          external_id?: string | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          kcal: number
          name: string
          owner_id?: string | null
          protein_g?: number
          serving_grams?: number | null
          serving_qty: number
          serving_unit: string
          source: Database["public"]["Enums"]["food_source"]
          updated_at?: string
        }
        Update: {
          brand?: string | null
          carbs_g?: number
          created_at?: string
          external_id?: string | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          kcal?: number
          name?: string
          owner_id?: string | null
          protein_g?: number
          serving_grams?: number | null
          serving_qty?: number
          serving_unit?: string
          source?: Database["public"]["Enums"]["food_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_profiles: {
        Row: {
          created_at: string
          experience: Database["public"]["Enums"]["experience"]
          goal: Database["public"]["Enums"]["nutrition_goal"]
          height_cm: number
          phase: Database["public"]["Enums"]["nutrition_phase"]
          rate_mode: Database["public"]["Enums"]["rate_mode"]
          sex: Database["public"]["Enums"]["sex"]
          start_body_fat_pct: number
          start_date: string
          start_weight_kg: number
          updated_at: string
          user_id: string
          weekly_rate_pct: number
        }
        Insert: {
          created_at?: string
          experience: Database["public"]["Enums"]["experience"]
          goal: Database["public"]["Enums"]["nutrition_goal"]
          height_cm: number
          phase: Database["public"]["Enums"]["nutrition_phase"]
          rate_mode?: Database["public"]["Enums"]["rate_mode"]
          sex: Database["public"]["Enums"]["sex"]
          start_body_fat_pct: number
          start_date: string
          start_weight_kg: number
          updated_at?: string
          user_id: string
          weekly_rate_pct: number
        }
        Update: {
          created_at?: string
          experience?: Database["public"]["Enums"]["experience"]
          goal?: Database["public"]["Enums"]["nutrition_goal"]
          height_cm?: number
          phase?: Database["public"]["Enums"]["nutrition_phase"]
          rate_mode?: Database["public"]["Enums"]["rate_mode"]
          sex?: Database["public"]["Enums"]["sex"]
          start_body_fat_pct?: number
          start_date?: string
          start_weight_kg?: number
          updated_at?: string
          user_id?: string
          weekly_rate_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      run_logs: {
        Row: {
          avg_hr: number | null
          avg_pace_s_per_km: number | null
          created_at: string
          distance_m: number
          duration_s: number
          elevation_gain_m: number | null
          external_id: string | null
          max_hr: number | null
          route_polyline: string | null
          session_id: string
          source: Database["public"]["Enums"]["run_source"]
          started_at: string
          updated_at: string
        }
        Insert: {
          avg_hr?: number | null
          avg_pace_s_per_km?: number | null
          created_at?: string
          distance_m: number
          duration_s: number
          elevation_gain_m?: number | null
          external_id?: string | null
          max_hr?: number | null
          route_polyline?: string | null
          session_id: string
          source: Database["public"]["Enums"]["run_source"]
          started_at: string
          updated_at?: string
        }
        Update: {
          avg_hr?: number | null
          avg_pace_s_per_km?: number | null
          created_at?: string
          distance_m?: number
          duration_s?: number
          elevation_gain_m?: number | null
          external_id?: string | null
          max_hr?: number | null
          route_polyline?: string | null
          session_id?: string
          source?: Database["public"]["Enums"]["run_source"]
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      run_splits: {
        Row: {
          avg_hr: number | null
          created_at: string
          distance_m: number
          duration_s: number
          id: string
          run_log_id: string
          split_index: number
          updated_at: string
        }
        Insert: {
          avg_hr?: number | null
          created_at?: string
          distance_m: number
          duration_s: number
          id?: string
          run_log_id: string
          split_index: number
          updated_at?: string
        }
        Update: {
          avg_hr?: number | null
          created_at?: string
          distance_m?: number
          duration_s?: number
          id?: string
          run_log_id?: string
          split_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_splits_run_log_id_fkey"
            columns: ["run_log_id"]
            isOneToOne: false
            referencedRelation: "run_logs"
            referencedColumns: ["session_id"]
          },
        ]
      }
      saved_meal_items: {
        Row: {
          created_at: string
          food_id: string
          id: string
          saved_meal_id: string
          servings: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          food_id: string
          id?: string
          saved_meal_id: string
          servings: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          food_id?: string
          id?: string
          saved_meal_id?: string
          servings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_meal_items_saved_meal_id_fkey"
            columns: ["saved_meal_id"]
            isOneToOne: false
            referencedRelation: "saved_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_meals: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          rest_sec: number | null
          session_id: string
          superset_group: number | null
          swapped_from_exercise_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          rest_sec?: number | null
          session_id: string
          superset_group?: number | null
          swapped_from_exercise_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          rest_sec?: number | null
          session_id?: string
          superset_group?: number | null
          swapped_from_exercise_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_swapped_from_exercise_id_fkey"
            columns: ["swapped_from_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          feel: string | null
          id: string
          kind: Database["public"]["Enums"]["workout_kind"]
          name: string
          notes: string | null
          scheduled_date: string
          skip_reason: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          feel?: string | null
          id?: string
          kind: Database["public"]["Enums"]["workout_kind"]
          name: string
          notes?: string | null
          scheduled_date: string
          skip_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          feel?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["workout_kind"]
          name?: string
          notes?: string | null
          scheduled_date?: string
          skip_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          distance_m: number | null
          duration_s: number | null
          id: string
          reps: number | null
          rpe: number | null
          session_exercise_id: string
          set_number: number
          set_type: Database["public"]["Enums"]["set_type"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_number: number
          set_type?: Database["public"]["Enums"]["set_type"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          reps?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_number?: number
          set_type?: Database["public"]["Enums"]["set_type"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          rep_max: number | null
          rep_min: number | null
          rest_sec: number | null
          superset_group: number | null
          target_sets: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          rep_max?: number | null
          rep_min?: number | null
          rest_sec?: number | null
          superset_group?: number | null
          target_sets: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          rep_max?: number | null
          rep_min?: number | null
          rest_sec?: number | null
          superset_group?: number | null
          target_sets?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_run_segments: {
        Row: {
          created_at: string
          distance_m: number | null
          duration_s: number | null
          id: string
          position: number
          repeat_group: number | null
          repeats: number
          segment_type: Database["public"]["Enums"]["segment_type"]
          target_effort: string | null
          target_hr_zone: number | null
          target_pace_s_per_km: number | null
          target_pace_tolerance_s: number
          target_type: Database["public"]["Enums"]["target_type"]
          template_id: string
          updated_at: string
          voice_cues: string[]
        }
        Insert: {
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          position: number
          repeat_group?: number | null
          repeats?: number
          segment_type: Database["public"]["Enums"]["segment_type"]
          target_effort?: string | null
          target_hr_zone?: number | null
          target_pace_s_per_km?: number | null
          target_pace_tolerance_s?: number
          target_type?: Database["public"]["Enums"]["target_type"]
          template_id: string
          updated_at?: string
          voice_cues?: string[]
        }
        Update: {
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          position?: number
          repeat_group?: number | null
          repeats?: number
          segment_type?: Database["public"]["Enums"]["segment_type"]
          target_effort?: string | null
          target_hr_zone?: number | null
          target_pace_s_per_km?: number | null
          target_pace_tolerance_s?: number
          target_type?: Database["public"]["Enums"]["target_type"]
          template_id?: string
          updated_at?: string
          voice_cues?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "template_run_segments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          est_distance_m: number | null
          est_duration_s: number | null
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["workout_kind"]
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          est_distance_m?: number | null
          est_duration_s?: number | null
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["workout_kind"]
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          est_distance_m?: number | null
          est_duration_s?: number | null
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["workout_kind"]
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          checkin_weekday: number
          created_at: string
          display_name: string | null
          focus: Database["public"]["Enums"]["training_focus"]
          id: string
          onboarding_completed_at: string | null
          timezone: string
          unit_system: Database["public"]["Enums"]["unit_system"]
          updated_at: string
        }
        Insert: {
          checkin_weekday?: number
          created_at?: string
          display_name?: string | null
          focus?: Database["public"]["Enums"]["training_focus"]
          id: string
          onboarding_completed_at?: string | null
          timezone?: string
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Update: {
          checkin_weekday?: number
          created_at?: string
          display_name?: string | null
          focus?: Database["public"]["Enums"]["training_focus"]
          id?: string
          onboarding_completed_at?: string | null
          timezone?: string
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Relationships: []
      }
      weekly_targets: {
        Row: {
          avg_kcal: number | null
          avg_weight_kg: number | null
          carbs_g: number
          created_at: string
          days_logged: number
          decided_at: string | null
          fat_g: number
          id: string
          kcal_high: number
          kcal_low: number
          kcal_target: number
          maintenance_kcal: number
          method: Database["public"]["Enums"]["target_method"]
          protein_g: number
          status: Database["public"]["Enums"]["target_status"]
          updated_at: string
          user_id: string
          week_start: string
          weight_change_kg: number | null
        }
        Insert: {
          avg_kcal?: number | null
          avg_weight_kg?: number | null
          carbs_g: number
          created_at?: string
          days_logged?: number
          decided_at?: string | null
          fat_g: number
          id?: string
          kcal_high: number
          kcal_low: number
          kcal_target: number
          maintenance_kcal: number
          method: Database["public"]["Enums"]["target_method"]
          protein_g: number
          status?: Database["public"]["Enums"]["target_status"]
          updated_at?: string
          user_id: string
          week_start: string
          weight_change_kg?: number | null
        }
        Update: {
          avg_kcal?: number | null
          avg_weight_kg?: number | null
          carbs_g?: number
          created_at?: string
          days_logged?: number
          decided_at?: string | null
          fat_g?: number
          id?: string
          kcal_high?: number
          kcal_low?: number
          kcal_target?: number
          maintenance_kcal?: number
          method?: Database["public"]["Enums"]["target_method"]
          protein_g?: number
          status?: Database["public"]["Enums"]["target_status"]
          updated_at?: string
          user_id?: string
          week_start?: string
          weight_change_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      save_starting_targets: {
        Args: {
          p_carbs_g: number
          p_experience: Database["public"]["Enums"]["experience"]
          p_fat_g: number
          p_focus: Database["public"]["Enums"]["training_focus"]
          p_goal: Database["public"]["Enums"]["nutrition_goal"]
          p_height_cm: number
          p_kcal_high: number
          p_kcal_low: number
          p_kcal_target: number
          p_maintenance_kcal: number
          p_phase: Database["public"]["Enums"]["nutrition_phase"]
          p_protein_g: number
          p_rate_mode: Database["public"]["Enums"]["rate_mode"]
          p_sex: Database["public"]["Enums"]["sex"]
          p_start_body_fat_pct: number
          p_start_date: string
          p_start_weight_kg: number
          p_timezone: string
          p_unit_system: Database["public"]["Enums"]["unit_system"]
          p_week_start: string
          p_weekly_rate_pct: number
        }
        Returns: undefined
      }
    }
    Enums: {
      demo_type: "animation" | "video" | "none"
      experience: "beginner" | "intermediate"
      food_source: "usda" | "open_food_facts" | "custom"
      integration_provider: "apple_health" | "strava"
      meal: "breakfast" | "lunch" | "dinner" | "snack"
      nutrition_goal: "build_muscle" | "lose_fat" | "maintain"
      nutrition_phase: "cut" | "maintain" | "lean_bulk"
      rate_mode: "auto" | "manual"
      run_source: "apple_health" | "strava" | "manual"
      segment_type: "warmup" | "interval" | "recovery" | "steady" | "cooldown"
      session_status: "planned" | "in_progress" | "completed" | "skipped"
      set_type: "warmup" | "working" | "drop" | "failure"
      sex: "male" | "female"
      target_method: "initial" | "adaptive" | "manual"
      target_status: "proposed" | "accepted" | "kept"
      target_type: "pace" | "heart_rate_zone" | "effort" | "none"
      tracking_type: "weight_reps" | "reps_only" | "duration" | "distance"
      training_focus: "run_first" | "balanced" | "lift_first"
      unit_system: "imperial" | "metric"
      workout_kind: "lift" | "run"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      demo_type: ["animation", "video", "none"],
      experience: ["beginner", "intermediate"],
      food_source: ["usda", "open_food_facts", "custom"],
      integration_provider: ["apple_health", "strava"],
      meal: ["breakfast", "lunch", "dinner", "snack"],
      nutrition_goal: ["build_muscle", "lose_fat", "maintain"],
      nutrition_phase: ["cut", "maintain", "lean_bulk"],
      rate_mode: ["auto", "manual"],
      run_source: ["apple_health", "strava", "manual"],
      segment_type: ["warmup", "interval", "recovery", "steady", "cooldown"],
      session_status: ["planned", "in_progress", "completed", "skipped"],
      set_type: ["warmup", "working", "drop", "failure"],
      sex: ["male", "female"],
      target_method: ["initial", "adaptive", "manual"],
      target_status: ["proposed", "accepted", "kept"],
      target_type: ["pace", "heart_rate_zone", "effort", "none"],
      tracking_type: ["weight_reps", "reps_only", "duration", "distance"],
      training_focus: ["run_first", "balanced", "lift_first"],
      unit_system: ["imperial", "metric"],
      workout_kind: ["lift", "run"],
    },
  },
} as const
