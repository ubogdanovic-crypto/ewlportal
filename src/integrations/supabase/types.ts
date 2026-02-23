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
      companies: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          maticni_broj: string | null
          name: string
          pib: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          maticni_broj?: string | null
          name: string
          pib?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          maticni_broj?: string | null
          name?: string
          pib?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          is_read: boolean
          notification_type: string
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          is_read?: boolean
          notification_type: string
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          is_read?: boolean
          notification_type?: string
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          accommodation_address: string | null
          accommodation_provided: boolean | null
          accommodation_type: string | null
          additional_skills: string | null
          company_id: string
          confirmed_at: string | null
          contract_duration_months: number | null
          created_at: string
          created_by: string
          education_level: string | null
          experience_years: number | null
          id: string
          job_description: string | null
          meals_provided: boolean | null
          monthly_salary_eur: number | null
          notes: string | null
          number_of_workers: number
          other_benefits: string | null
          position_title: string
          reference_number: string
          requirements: string | null
          serbian_language_required: boolean | null
          source_country: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          transportation_provided: boolean | null
          updated_at: string
          work_schedule: string | null
        }
        Insert: {
          accommodation_address?: string | null
          accommodation_provided?: boolean | null
          accommodation_type?: string | null
          additional_skills?: string | null
          company_id: string
          confirmed_at?: string | null
          contract_duration_months?: number | null
          created_at?: string
          created_by: string
          education_level?: string | null
          experience_years?: number | null
          id?: string
          job_description?: string | null
          meals_provided?: boolean | null
          monthly_salary_eur?: number | null
          notes?: string | null
          number_of_workers?: number
          other_benefits?: string | null
          position_title?: string
          reference_number: string
          requirements?: string | null
          serbian_language_required?: boolean | null
          source_country?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          transportation_provided?: boolean | null
          updated_at?: string
          work_schedule?: string | null
        }
        Update: {
          accommodation_address?: string | null
          accommodation_provided?: boolean | null
          accommodation_type?: string | null
          additional_skills?: string | null
          company_id?: string
          confirmed_at?: string | null
          contract_duration_months?: number | null
          created_at?: string
          created_by?: string
          education_level?: string | null
          experience_years?: number | null
          id?: string
          job_description?: string | null
          meals_provided?: boolean | null
          monthly_salary_eur?: number | null
          notes?: string | null
          number_of_workers?: number
          other_benefits?: string | null
          position_title?: string
          reference_number?: string
          requirements?: string | null
          serbian_language_required?: boolean | null
          source_country?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          transportation_provided?: boolean | null
          updated_at?: string
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_history: {
        Row: {
          changed_by: string
          created_at: string
          from_stage: Database["public"]["Enums"]["pipeline_stage"] | null
          id: string
          notes: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
          worker_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          notes?: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
          worker_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          notes?: string | null
          to_stage?: Database["public"]["Enums"]["pipeline_stage"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_history_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          notification_preferences: Json
          phone: string | null
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          is_active?: boolean
          notification_preferences?: Json
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          notification_preferences?: Json
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      protek_communication_log: {
        Row: {
          channel: string
          contact_person: string | null
          content: string
          created_at: string
          created_by: string
          direction: string
          id: string
          order_id: string
          subject: string | null
        }
        Insert: {
          channel: string
          contact_person?: string | null
          content?: string
          created_at?: string
          created_by: string
          direction: string
          id?: string
          order_id: string
          subject?: string | null
        }
        Update: {
          channel?: string
          contact_person?: string | null
          content?: string
          created_at?: string
          created_by?: string
          direction?: string
          id?: string
          order_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protek_communication_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_required: boolean
          label: string
          notes: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          uploaded_at: string | null
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean
          label: string
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean
          label?: string
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          current_stage: Database["public"]["Enums"]["pipeline_stage"]
          cv_url: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          flag_custom: string | null
          flag_euprava: boolean | null
          flag_visa_delay: boolean | null
          id: string
          interview_date: string | null
          last_name: string
          nationality: string | null
          order_id: string
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          photo_url: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["worker_status"]
          updated_at: string
          visa_delay_estimate: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          cv_url?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          flag_custom?: string | null
          flag_euprava?: boolean | null
          flag_visa_delay?: boolean | null
          id?: string
          interview_date?: string | null
          last_name?: string
          nationality?: string | null
          order_id: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          photo_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["worker_status"]
          updated_at?: string
          visa_delay_estimate?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          cv_url?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          flag_custom?: string | null
          flag_euprava?: boolean | null
          flag_visa_delay?: boolean | null
          id?: string
          interview_date?: string | null
          last_name?: string
          nationality?: string | null
          order_id?: string
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          photo_url?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["worker_status"]
          updated_at?: string
          visa_delay_estimate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "ops" | "management"
      order_status:
        | "draft"
        | "submitted"
        | "confirmed"
        | "sourcing"
        | "in_progress"
        | "fulfilled"
        | "cancelled"
      pipeline_stage:
        | "sourcing"
        | "cv_screening"
        | "cv_sent_to_client"
        | "client_review"
        | "interview_scheduled"
        | "interview_completed"
        | "approved_by_client"
        | "documents_collection"
        | "document_generation"
        | "documents_signed"
        | "visa_application"
        | "police_interview"
        | "visa_approved"
        | "arrived"
      worker_status: "active" | "rejected" | "withdrawn" | "completed"
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
      app_role: ["client", "ops", "management"],
      order_status: [
        "draft",
        "submitted",
        "confirmed",
        "sourcing",
        "in_progress",
        "fulfilled",
        "cancelled",
      ],
      pipeline_stage: [
        "sourcing",
        "cv_screening",
        "cv_sent_to_client",
        "client_review",
        "interview_scheduled",
        "interview_completed",
        "approved_by_client",
        "documents_collection",
        "document_generation",
        "documents_signed",
        "visa_application",
        "police_interview",
        "visa_approved",
        "arrived",
      ],
      worker_status: ["active", "rejected", "withdrawn", "completed"],
    },
  },
} as const
