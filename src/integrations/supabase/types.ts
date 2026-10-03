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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_credentials: {
        Row: {
          id: number
          password_hash: string
          updated_at: string
        }
        Insert: {
          id?: number
          password_hash: string
          updated_at?: string
        }
        Update: {
          id?: number
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_log: {
        Row: {
          action: string
          created_at: string
          detail: Json
          id: number
          ip: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json
          id?: number
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json
          id?: number
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          id: number
          ip: string | null
          key: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: number
          ip?: string | null
          key: string
          success: boolean
        }
        Update: {
          created_at?: string
          id?: number
          ip?: string | null
          key?: string
          success?: boolean
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          ip: string | null
          last_seen: string
          revoked: boolean
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          ip?: string | null
          last_seen?: string
          revoked?: boolean
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          ip?: string | null
          last_seen?: string
          revoked?: boolean
          token_hash?: string
        }
        Relationships: []
      }
      api_requests: {
        Row: {
          action: string
          created_at: string
          id: number
          ip: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          ip?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          deleted_at: string | null
          id: string
          name: string
          platform_id: string
          sort: number
        }
        Insert: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          name: string
          platform_id: string
          sort?: number
        }
        Update: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          name?: string
          platform_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          bdt_amount: number | null
          bdt_rate: number | null
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          idempotency_key: string
          method_id: string
          method_kind: Database["public"]["Enums"]["pm_kind"]
          method_name: string
          screenshot_path: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          txn_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bdt_amount?: number | null
          bdt_rate?: number | null
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key: string
          method_id: string
          method_kind: Database["public"]["Enums"]["pm_kind"]
          method_name: string
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          txn_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bdt_amount?: number | null
          bdt_rate?: number | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key?: string
          method_id?: string
          method_kind?: Database["public"]["Enums"]["pm_kind"]
          method_name?: string
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          txn_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          shown_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          shown_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          shown_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          action_by: string
          created_at: string
          delivered_qty: number | null
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          refund: number
        }
        Insert: {
          action_by?: string
          created_at?: string
          delivered_qty?: number | null
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          refund?: number
        }
        Update: {
          action_by?: string
          created_at?: string
          delivered_qty?: number | null
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
          refund?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          category_name: string
          charge: number
          created_at: string
          deleted_at: string | null
          delivered_qty: number | null
          id: string
          idempotency_key: string
          link: string
          order_code: string
          platform_name: string
          platform_slug: string
          quantity: number
          refunded: number
          service_id: string
          service_name: string
          source: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category_name: string
          charge: number
          created_at?: string
          deleted_at?: string | null
          delivered_qty?: number | null
          id?: string
          idempotency_key: string
          link: string
          order_code: string
          platform_name: string
          platform_slug: string
          quantity: number
          refunded?: number
          service_id: string
          service_name: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category_name?: string
          charge?: number
          created_at?: string
          deleted_at?: string | null
          delivered_qty?: number | null
          id?: string
          idempotency_key?: string
          link?: string
          order_code?: string
          platform_name?: string
          platform_slug?: string
          quantity?: number
          refunded?: number
          service_id?: string
          service_name?: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account: string
          account_type: string | null
          active: boolean
          deleted_at: string | null
          id: string
          instructions: string | null
          kind: Database["public"]["Enums"]["pm_kind"]
          logo_url: string | null
          max_amount: number
          min_amount: number
          name: string
          network: string | null
          sort: number
        }
        Insert: {
          account: string
          account_type?: string | null
          active?: boolean
          deleted_at?: string | null
          id?: string
          instructions?: string | null
          kind: Database["public"]["Enums"]["pm_kind"]
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name: string
          network?: string | null
          sort?: number
        }
        Update: {
          account?: string
          account_type?: string | null
          active?: boolean
          deleted_at?: string | null
          id?: string
          instructions?: string | null
          kind?: Database["public"]["Enums"]["pm_kind"]
          logo_url?: string | null
          max_amount?: number
          min_amount?: number
          name?: string
          network?: string | null
          sort?: number
        }
        Relationships: []
      }
      platforms: {
        Row: {
          active: boolean
          deleted_at: string | null
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          active?: boolean
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          api_enabled: boolean
          api_key: string | null
          api_key_created_at: string | null
          api_key_hash: string | null
          avatar_url: string | null
          balance: number
          ban_reason: string | null
          banned: boolean
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          language: string
          last_seen_at: string | null
          last_sign_in_at: string | null
          password_changed_at: string | null
          phone: string | null
          public_id: string
          sessions_revoked_at: string | null
          sign_in_method: string | null
          username: string
        }
        Insert: {
          accepted_terms_at?: string | null
          api_enabled?: boolean
          api_key?: string | null
          api_key_created_at?: string | null
          api_key_hash?: string | null
          avatar_url?: string | null
          balance?: number
          ban_reason?: string | null
          banned?: boolean
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id: string
          language?: string
          last_seen_at?: string | null
          last_sign_in_at?: string | null
          password_changed_at?: string | null
          phone?: string | null
          public_id: string
          sessions_revoked_at?: string | null
          sign_in_method?: string | null
          username: string
        }
        Update: {
          accepted_terms_at?: string | null
          api_enabled?: boolean
          api_key?: string | null
          api_key_created_at?: string | null
          api_key_hash?: string | null
          avatar_url?: string | null
          balance?: number
          ban_reason?: string | null
          banned?: boolean
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          language?: string
          last_seen_at?: string | null
          last_sign_in_at?: string | null
          password_changed_at?: string | null
          phone?: string | null
          public_id?: string
          sessions_revoked_at?: string | null
          sign_in_method?: string | null
          username?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          avg_time: string
          category_id: string
          deleted_at: string | null
          description: string | null
          id: string
          is_seed: boolean
          max_qty: number
          min_qty: number
          name: string
          rate: number
          rate_per: number
          refill_info: string | null
          sort: number
        }
        Insert: {
          active?: boolean
          avg_time?: string
          category_id: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_seed?: boolean
          max_qty?: number
          min_qty?: number
          name: string
          rate: number
          rate_per?: number
          refill_info?: string | null
          sort?: number
        }
        Update: {
          active?: boolean
          avg_time?: string
          category_id?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_seed?: boolean
          max_qty?: number
          min_qty?: number
          name?: string
          rate?: number
          rate_per?: number
          refill_info?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sign_ins: {
        Row: {
          created_at: string
          device: string | null
          id: number
          ip: string | null
          method: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: number
          ip?: string | null
          method?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: number
          ip?: string | null
          method?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          allow_orders: boolean
          announcement_on: boolean
          announcement_text: string | null
          api_policy: string
          api_rate_per_min: number
          bdt_rate: number
          email: string | null
          hero_text: string
          hero_title: string
          id: number
          music_enabled: boolean
          require_verified_email: boolean
          site_name: string
          telegram: string | null
          whatsapp: string | null
        }
        Insert: {
          allow_orders?: boolean
          announcement_on?: boolean
          announcement_text?: string | null
          api_policy?: string
          api_rate_per_min?: number
          bdt_rate?: number
          email?: string | null
          hero_text?: string
          hero_title?: string
          id?: number
          music_enabled?: boolean
          require_verified_email?: boolean
          site_name?: string
          telegram?: string | null
          whatsapp?: string | null
        }
        Update: {
          allow_orders?: boolean
          announcement_on?: boolean
          announcement_text?: string | null
          api_policy?: string
          api_rate_per_min?: number
          bdt_rate?: number
          email?: string | null
          hero_text?: string
          hero_title?: string
          id?: number
          music_enabled?: boolean
          require_verified_email?: boolean
          site_name?: string
          telegram?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          created_at: string
          day: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          day?: string
          visitor_id?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          active: boolean
          artist: string
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          file_path: string
          id: string
          is_welcome: boolean
          sort: number
          title: string
        }
        Insert: {
          active?: boolean
          artist?: string
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path: string
          id?: string
          is_welcome?: boolean
          sort?: number
          title: string
        }
        Update: {
          active?: boolean
          artist?: string
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path?: string
          id?: string
          is_welcome?: boolean
          sort?: number
          title?: string
        }
        Relationships: []
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
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: number
          kind: string
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: never
          kind: string
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: never
          kind?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { _amount: number; _note: string; _user: string }
        Returns: number
      }
      admin_update_order_status: {
        Args: {
          _delivered: number
          _note: string
          _order_id: string
          _status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      api_place_order: {
        Args: {
          _link: string
          _quantity: number
          _service_id: string
          _uid: string
        }
        Returns: Json
      }
      cancel_my_order: { Args: { _order_id: string }; Returns: undefined }
      create_deposit: {
        Args: {
          _amount: number
          _idem: string
          _method_id: string
          _screenshot: string
          _txn: string
        }
        Returns: Json
      }
      ensure_my_api_key: { Args: { _regenerate?: boolean }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_my_notifications: {
        Args: { _ids: string[]; _shown: boolean }
        Returns: undefined
      }
      place_order: {
        Args: {
          _idem: string
          _link: string
          _quantity: number
          _service_id: string
        }
        Returns: Json
      }
      set_my_avatar: { Args: { _path: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      deposit_status: "pending" | "approved" | "rejected" | "cancelled"
      order_status:
        | "pending"
        | "processing"
        | "completed"
        | "partial"
        | "rejected"
        | "canceled"
      pm_kind: "binance" | "usdt" | "p2p"
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
      app_role: ["admin", "moderator", "user"],
      deposit_status: ["pending", "approved", "rejected", "cancelled"],
      order_status: [
        "pending",
        "processing",
        "completed",
        "partial",
        "rejected",
        "canceled",
      ],
      pm_kind: ["binance", "usdt", "p2p"],
    },
  },
} as const
