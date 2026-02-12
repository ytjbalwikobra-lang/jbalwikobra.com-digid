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
    PostgrestVersion: "13.0.4"
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
      admin_notifications: {
        Row: {
          amount: number | null
          created_at: string | null
          customer_name: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          order_id: string | null
          product_name: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          order_id?: string | null
          product_name?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          order_id?: string | null
          product_name?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_super_admin: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_super_admin?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_super_admin?: boolean | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string | null
          cta_text: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cta_text?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_type: string
          conversation_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          message_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type: string
          conversation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          message_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string
          conversation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          message_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_activity_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_activity_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_admin_participants: {
        Row: {
          admin_id: string
          conversation_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          left_at: string | null
          role: string | null
        }
        Insert: {
          admin_id: string
          conversation_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
        }
        Update: {
          admin_id?: string
          conversation_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_admin_participants_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_admin_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_canned_responses: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          message: string
          shortcut: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          message: string
          shortcut?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          message?: string
          shortcut?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_canned_responses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          assigned_admin_id: string | null
          closed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          game_title: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          order_id: string | null
          resolved_at: string | null
          status: string | null
          subject: string | null
          topic: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          game_title?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          order_id?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          game_title?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          order_id?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ratings: {
        Row: {
          conversation_id: string
          created_at: string | null
          feedback: string | null
          id: string
          rated_admin_id: string | null
          rating: number
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          rated_admin_id?: string | null
          rating: number
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          rated_admin_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_ratings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_ratings_rated_admin_id_fkey"
            columns: ["rated_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          business_hours_enabled: boolean
          business_hours_end: string
          business_hours_start: string
          business_hours_timezone: string
          id: string
          offline_label: string
          offline_message: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_hours_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          business_hours_timezone?: string
          id?: string
          offline_label?: string
          offline_message?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_hours_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          business_hours_timezone?: string
          id?: string
          offline_label?: string
          offline_message?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "customer_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_message_logs: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          error_message: string | null
          html_content: string
          id: string
          message_id: string | null
          provider_id: string | null
          response_time_ms: number | null
          subject: string
          success: boolean
          text_content: string | null
          to_email: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string
          id?: string
          message_id?: string | null
          provider_id?: string | null
          response_time_ms?: number | null
          subject?: string
          success?: boolean
          text_content?: string | null
          to_email: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string
          id?: string
          message_id?: string | null
          provider_id?: string | null
          response_time_ms?: number | null
          subject?: string
          success?: boolean
          text_content?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_message_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_providers: {
        Row: {
          api_base_url: string
          api_key: string
          created_at: string
          display_name: string
          from_email: string
          from_name: string
          id: string
          is_active: boolean
          name: string
          reply_to_email: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          api_base_url?: string
          api_key: string
          created_at?: string
          display_name?: string
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          name: string
          reply_to_email?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          api_base_url?: string
          api_key?: string
          created_at?: string
          display_name?: string
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          name?: string
          reply_to_email?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          post_id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_deleted: boolean
          is_pinned: boolean
          likes_count: number
          product_id: string | null
          rating: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_pinned?: boolean
          likes_count?: number
          product_id?: string | null
          rating?: number | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_pinned?: boolean
          likes_count?: number
          product_id?: string | null
          rating?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_virtual_accounts: {
        Row: {
          account_number: string
          bank_code: string
          created_at: string | null
          currency: string | null
          expected_amount: number | null
          expiration_date: string | null
          external_id: string
          id: number
          is_closed: boolean | null
          merchant_code: string | null
          name: string
          status: string | null
          updated_at: string | null
          xendit_va_id: string
        }
        Insert: {
          account_number: string
          bank_code: string
          created_at?: string | null
          currency?: string | null
          expected_amount?: number | null
          expiration_date?: string | null
          external_id: string
          id?: number
          is_closed?: boolean | null
          merchant_code?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
          xendit_va_id: string
        }
        Update: {
          account_number?: string
          bank_code?: string
          created_at?: string | null
          currency?: string | null
          expected_amount?: number | null
          expiration_date?: string | null
          external_id?: string
          id?: number
          is_closed?: boolean | null
          merchant_code?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
          xendit_va_id?: string
        }
        Relationships: []
      }
      flash_sales: {
        Row: {
          created_at: string | null
          discount_percentage: number | null
          end_time: string
          id: string
          is_active: boolean | null
          original_price: number
          product_id: string | null
          sale_price: number
          start_time: string
          stock: number | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number | null
          end_time: string
          id?: string
          is_active?: boolean | null
          original_price: number
          product_id?: string | null
          sale_price: number
          start_time: string
          stock?: number | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          original_price?: number
          product_id?: string | null
          sale_price?: number
          start_time?: string
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      game_titles: {
        Row: {
          category: string | null
          color: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          logo_path: string | null
          logo_url: string | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          logo_path?: string | null
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          logo_path?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string | null
          description: string | null
          gradient: string | null
          href: string
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gradient?: string | null
          href: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gradient?: string | null
          href?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          client_external_id: string | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_whatsapp: string | null
          expires_at: string | null
          id: string
          order_type: string
          paid_at: string | null
          payer_email: string | null
          payer_phone: string | null
          payment_channel: string | null
          payment_method: string
          product_id: string | null
          product_name: string | null
          rental_duration: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          xendit_invoice_id: string | null
          xendit_invoice_url: string | null
        }
        Insert: {
          amount: number
          client_external_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_whatsapp?: string | null
          expires_at?: string | null
          id?: string
          order_type: string
          paid_at?: string | null
          payer_email?: string | null
          payer_phone?: string | null
          payment_channel?: string | null
          payment_method: string
          product_id?: string | null
          product_name?: string | null
          rental_duration?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          xendit_invoice_id?: string | null
          xendit_invoice_url?: string | null
        }
        Update: {
          amount?: number
          client_external_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_whatsapp?: string | null
          expires_at?: string | null
          id?: string
          order_type?: string
          paid_at?: string | null
          payer_email?: string | null
          payer_phone?: string | null
          payment_channel?: string | null
          payment_method?: string
          product_id?: string | null
          product_name?: string | null
          rental_duration?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          xendit_invoice_id?: string | null
          xendit_invoice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_promos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          link_url: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          link_url: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          link_url?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          link_url: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          link_url: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          link_url?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          expiry_date: string | null
          external_id: string
          id: number
          paid_at: string | null
          payment_data: Json | null
          payment_method: string
          status: string
          updated_at: string | null
          xendit_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expiry_date?: string | null
          external_id: string
          id?: number
          paid_at?: string | null
          payment_data?: Json | null
          payment_method: string
          status: string
          updated_at?: string | null
          xendit_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expiry_date?: string | null
          external_id?: string
          id?: number
          paid_at?: string | null
          payment_data?: Json | null
          payment_method?: string
          status?: string
          updated_at?: string | null
          xendit_id?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempt_count: number | null
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_used: boolean | null
          phone: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          verification_code: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_used?: boolean | null
          phone: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_code: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_used?: boolean | null
          phone?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_code?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_likes: {
        Row: {
          created_at: string | null
          id: number
          ip_address: string
          product_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          ip_address: string
          product_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          ip_address?: string
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          flash_sale_end_time: string | null
          game_title_id: string | null
          has_rental: boolean | null
          id: string
          image: string
          images: string[] | null
          is_active: boolean
          is_flash_sale: boolean | null
          name: string
          original_price: number | null
          price: number
          sold_channel: string | null
          stock: number | null
          tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          flash_sale_end_time?: string | null
          game_title_id?: string | null
          has_rental?: boolean | null
          id?: string
          image: string
          images?: string[] | null
          is_active?: boolean
          is_flash_sale?: boolean | null
          name: string
          original_price?: number | null
          price: number
          sold_channel?: string | null
          stock?: number | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          flash_sale_end_time?: string | null
          game_title_id?: string | null
          has_rental?: boolean | null
          id?: string
          image?: string
          images?: string[] | null
          is_active?: boolean
          is_flash_sale?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          sold_channel?: string | null
          stock?: number | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_game_title"
            columns: ["game_title_id"]
            isOneToOne: false
            referencedRelation: "game_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_tier"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_options: {
        Row: {
          created_at: string | null
          description: string | null
          duration: string
          id: string
          price: number
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration: string
          id?: string
          price: number
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: string
          id?: string
          price?: number
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified: boolean | null
          product_id: string | null
          rating: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          product_id?: string | null
          rating: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          product_id?: string | null
          rating?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      tiers: {
        Row: {
          background_gradient: string
          border_color: string
          color: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          price_range_max: number
          price_range_min: number
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          background_gradient: string
          border_color: string
          color: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          price_range_max: number
          price_range_min: number
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          background_gradient?: string
          border_color?: string
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price_range_max?: number
          price_range_min?: number
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          invalidated_at: string | null
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          last_activity_at: string | null
          last_seen_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          invalidated_at?: string | null
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          last_login_at: string | null
          locked_until: string | null
          login_attempts: number | null
          name: string | null
          notification_preferences: Json | null
          password_hash: string | null
          phone: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          profile_completed: boolean | null
          profile_completed_at: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          name?: string | null
          notification_preferences?: Json | null
          password_hash?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          name?: string | null
          notification_preferences?: Json | null
          password_hash?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          address: string | null
          business_hours: string | null
          company_description: string | null
          contact_email: string | null
          contact_phone: string | null
          facebook_url: string | null
          favicon_url: string | null
          footer_copyright_text: string | null
          hero_button_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram_url: string | null
          jual_akun_whatsapp_url: string | null
          logo_url: string | null
          newsletter_enabled: boolean | null
          site_name: string | null
          social_media_enabled: boolean | null
          support_email: string | null
          tiktok_url: string | null
          topup_game_url: string | null
          twitter_url: string | null
          updated_at: string | null
          whatsapp_channel_url: string | null
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          company_description?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          footer_copyright_text?: string | null
          hero_button_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          jual_akun_whatsapp_url?: string | null
          logo_url?: string | null
          newsletter_enabled?: boolean | null
          site_name?: string | null
          social_media_enabled?: boolean | null
          support_email?: string | null
          tiktok_url?: string | null
          topup_game_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          whatsapp_channel_url?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          company_description?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          footer_copyright_text?: string | null
          hero_button_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          jual_akun_whatsapp_url?: string | null
          logo_url?: string | null
          newsletter_enabled?: boolean | null
          site_name?: string | null
          social_media_enabled?: boolean | null
          support_email?: string | null
          tiktok_url?: string | null
          topup_game_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          whatsapp_channel_url?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      whatsapp_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          key_name: string
          last_reset_date: string | null
          last_reset_hour: string | null
          last_used_at: string | null
          provider_id: string | null
          requests_this_hour: number | null
          requests_today: number | null
          settings: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          key_name: string
          last_reset_date?: string | null
          last_reset_hour?: string | null
          last_used_at?: string | null
          provider_id?: string | null
          requests_this_hour?: number | null
          requests_today?: number | null
          settings?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          key_name?: string
          last_reset_date?: string | null
          last_reset_hour?: string | null
          last_used_at?: string | null
          provider_id?: string | null
          requests_this_hour?: number | null
          requests_today?: number | null
          settings?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_api_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_links: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_group: boolean | null
          name: string
          sort_order: number | null
          status: string | null
          updated_at: string | null
          whatsapp_url: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          whatsapp_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name?: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          whatsapp_url?: string
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          api_key_id: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          media_url: string | null
          message_content: string | null
          message_id: string | null
          message_type: string | null
          phone_number: string
          provider_id: string | null
          read_at: string | null
          request_body: Json | null
          response_body: Json | null
          response_status: number | null
          response_time_ms: number | null
          retry_count: number | null
          sent_at: string | null
          success: boolean | null
        }
        Insert: {
          api_key_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_id?: string | null
          message_type?: string | null
          phone_number: string
          provider_id?: string | null
          read_at?: string | null
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          retry_count?: number | null
          sent_at?: string | null
          success?: boolean | null
        }
        Update: {
          api_key_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_id?: string | null
          message_type?: string | null
          phone_number?: string
          provider_id?: string | null
          read_at?: string | null
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          retry_count?: number | null
          sent_at?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_providers: {
        Row: {
          async_send_message_endpoint: string | null
          base_url: string
          check_number_endpoint: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          key_field_name: string | null
          message_field_name: string | null
          message_id_field: string | null
          name: string
          phone_field_name: string | null
          rate_limit_per_hour: number | null
          rate_limit_per_minute: number | null
          send_file_endpoint: string | null
          send_image_endpoint: string | null
          send_message_endpoint: string | null
          settings: Json | null
          success_status_field: string | null
          success_status_value: string | null
          updated_at: string | null
        }
        Insert: {
          async_send_message_endpoint?: string | null
          base_url: string
          check_number_endpoint?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          key_field_name?: string | null
          message_field_name?: string | null
          message_id_field?: string | null
          name: string
          phone_field_name?: string | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          send_file_endpoint?: string | null
          send_image_endpoint?: string | null
          send_message_endpoint?: string | null
          settings?: Json | null
          success_status_field?: string | null
          success_status_value?: string | null
          updated_at?: string | null
        }
        Update: {
          async_send_message_endpoint?: string | null
          base_url?: string
          check_number_endpoint?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          key_field_name?: string | null
          message_field_name?: string | null
          message_id_field?: string | null
          name?: string
          phone_field_name?: string | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          send_file_endpoint?: string | null
          send_image_endpoint?: string | null
          send_message_endpoint?: string | null
          settings?: Json | null
          success_status_field?: string | null
          success_status_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_analytics: {
        Row: {
          avg_order_value: number | null
          cancelled_orders: number | null
          last_updated: string | null
          orders_30d: number | null
          orders_7d: number | null
          paid_orders: number | null
          pending_orders: number | null
          revenue_30d: number | null
          revenue_7d: number | null
          total_orders: number | null
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string | null
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "customer_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          is_read: boolean | null
          link_url: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_read?: boolean | null
          link_url?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_read?: boolean | null
          link_url?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews_with_details: {
        Row: {
          comment: string | null
          created_at: string | null
          helpful_count: number | null
          id: string | null
          is_verified: boolean | null
          product_id: string | null
          product_image: string | null
          product_name: string | null
          rating: number | null
          updated_at: string | null
          user_avatar: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_payment_sync_issues: {
        Args: never
        Returns: {
          external_id: string
          invoice_id: string
          issue_type: string
          order_id: string
          order_status: string
          payment_status: string
        }[]
      }
      cleanup_expired_phone_verifications: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      extract_hour_key: { Args: { created_at: string }; Returns: string }
      get_active_api_key: {
        Args: { provider_name: string }
        Returns: {
          api_key: string
          key_id: string
          provider_config: Json
        }[]
      }
      get_active_flash_sales: {
        Args: never
        Returns: {
          discount_percentage: number
          end_time: string
          image: string
          original_price: number
          product_id: string
          product_name: string
          sale_price: number
          stock: number
        }[]
      }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_products: number
          monthly_revenue: number
          new_users_this_month: number
          pending_orders: number
          total_orders: number
          total_products: number
          total_revenue: number
          total_users: number
        }[]
      }
      get_daily_revenue: { Args: { days_back?: number }; Returns: Json }
      get_dashboard_analytics_admin: {
        Args: never
        Returns: {
          avg_order_value: number | null
          cancelled_orders: number | null
          last_updated: string | null
          orders_30d: number | null
          orders_7d: number | null
          paid_orders: number | null
          pending_orders: number | null
          revenue_30d: number | null
          revenue_7d: number | null
          total_orders: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "dashboard_analytics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_dashboard_data: { Args: never; Returns: Json }
      get_eligible_products: {
        Args: { input_user_id: string }
        Returns: {
          already_reviewed: boolean
          product_id: string
          product_name: string
        }[]
      }
      get_feed_with_context: {
        Args: {
          feed_type?: string
          input_user_id?: string
          page_limit?: number
          page_offset?: number
        }
        Returns: {
          author_avatar: string
          author_id: string
          author_is_admin: boolean
          author_name: string
          comments_count: number
          content: string
          created_at: string
          image_url: string
          is_pinned: boolean
          liked_by_user: boolean
          likes_count: number
          post_id: string
          post_type: string
          product_id: string
          product_image: string
          product_name: string
          rating: number
          title: string
          total_count: number
        }[]
      }
      get_order_stats_optimized: { Args: never; Returns: Json }
      get_products_catalog: {
        Args: {
          filter_category?: string
          filter_game?: string
          page_limit?: number
          page_offset?: number
        }
        Returns: {
          account_level: string
          category: string
          created_at: string
          description: string
          flash_sale_end_time: string
          game_title: string
          has_rental: boolean
          image: string
          is_active: boolean
          is_flash_sale: boolean
          original_price: number
          price: number
          product_id: string
          product_name: string
          stock: number
          total_count: number
        }[]
      }
      get_unread_notification_count: { Args: { u_id: string }; Returns: number }
      get_user_activity_summary: {
        Args: never
        Returns: {
          active_users_30d: number
          new_users_7d: number
          top_user_id: string
          top_user_name: string
          top_user_orders: number
          total_users: number
        }[]
      }
      insert_global_notification: {
        Args: {
          n_body: string
          n_link: string
          n_title: string
          n_type: string
        }
        Returns: undefined
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      log_whatsapp_message: {
        Args: {
          p_api_key_id: string
          p_context_id?: string
          p_context_type?: string
          p_message_content: string
          p_message_id?: string
          p_message_type: string
          p_phone_number: string
          p_request_body: Json
          p_response_body: Json
          p_response_status: number
          p_response_time_ms?: number
          p_success: boolean
        }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: { u_id: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { n_id: string; u_id: string }
        Returns: undefined
      }
      refresh_dashboard_analytics: { Args: never; Returns: undefined }
      reset_rate_limits: { Args: never; Returns: undefined }
      update_order_and_payment_status: {
        Args: {
          p_currency?: string
          p_expires_at?: string
          p_external_id?: string
          p_invoice_id?: string
          p_invoice_url?: string
          p_paid_at?: string
          p_payer_email?: string
          p_payment_channel?: string
          p_status?: string
        }
        Returns: Json
      }
      validate_session: {
        Args: { p_session_token: string }
        Returns: {
          expires_at: string
          is_admin: boolean
          user_created_at: string
          user_email: string
          user_id: string
          user_name: string
          user_role: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
