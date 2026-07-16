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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          group_avatar_url: string | null
          group_name: string | null
          id: string
          is_group: boolean
          participant_one: string | null
          participant_two: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          participant_one?: string | null
          participant_two?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          participant_one?: string | null
          participant_two?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_follows: {
        Row: {
          created_at: string
          creator_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      event_comments: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminder_preferences: {
        Row: {
          created_at: string
          event_id: string
          id: string
          remind_at: string
          remind_minutes_before: number
          sent: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          remind_at: string
          remind_minutes_before: number
          sent?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          remind_at?: string
          remind_minutes_before?: number
          sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminder_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      group_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
        ]
      }
      group_events: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          group_id: string | null
          id: string
          location: string | null
          page_id: string | null
          parent_event_id: string | null
          recurrence_end_date: string | null
          recurrence_type: string
          reminder_sent: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          group_id?: string | null
          id?: string
          location?: string | null
          page_id?: string | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string
          reminder_sent?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          group_id?: string | null
          id?: string
          location?: string | null
          page_id?: string | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string
          reminder_sent?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          group_id: string
          id: string
          is_active: boolean
          max_uses: number | null
          use_count: number
        }
        Insert: {
          code?: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_notification_preferences: {
        Row: {
          created_at: string
          group_id: string
          id: string
          muted: boolean
          notify_comments: boolean
          notify_events: boolean
          notify_posts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          muted?: boolean
          notify_comments?: boolean
          notify_events?: boolean
          notify_posts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          muted?: boolean
          notify_comments?: boolean
          notify_events?: boolean
          notify_posts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_notification_preferences_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_comments: {
        Row: {
          content: string
          created_at: string
          group_post_id: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_post_id: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_post_id?: string
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_comments_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "group_post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_likes: {
        Row: {
          created_at: string
          group_post_id: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_post_id: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_post_id?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_likes_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          image_url: string | null
          image_urls: string[] | null
          pinned: boolean
          pinned_at: string | null
          pinned_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          category: string
          conversation_id: string | null
          cover_photo_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          privacy: string
          rules: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string
          conversation_id?: string | null
          cover_photo_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          privacy?: string
          rules?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string
          conversation_id?: string | null
          cover_photo_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          privacy?: string
          rules?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          post_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          post_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_fraud_signals: {
        Row: {
          created_at: string
          description: string
          id: string
          listing_id: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          severity: string
          signal_type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          listing_id: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          signal_type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          listing_id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_fraud_signals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_offers: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_price_history: {
        Row: {
          changed_at: string
          id: string
          listing_id: string
          price: number
        }
        Insert: {
          changed_at?: string
          id?: string
          listing_id: string
          price: number
        }
        Update: {
          changed_at?: string
          id?: string
          listing_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_templates: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          title: string | null
          user_id: string
        }
        Insert: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          title?: string | null
          user_id: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      listing_views: {
        Row: {
          id: string
          listing_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          listing_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          listing_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          location: string | null
          price: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          location?: string | null
          price: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          location?: string | null
          price?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          pinned: boolean
          pinned_at: string | null
          pinned_by: string | null
          read: boolean
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          read?: boolean
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          moderator_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          moderator_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          moderator_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_admins: {
        Row: {
          created_at: string
          id: string
          page_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_admins_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_followers: {
        Row: {
          created_at: string
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_followers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          page_post_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          page_post_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          page_post_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_post_comments_page_post_id_fkey"
            columns: ["page_post_id"]
            isOneToOne: false
            referencedRelation: "page_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "page_post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      page_post_likes: {
        Row: {
          created_at: string
          id: string
          page_post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_post_likes_page_post_id_fkey"
            columns: ["page_post_id"]
            isOneToOne: false
            referencedRelation: "page_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      page_posts: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          image_urls: string[] | null
          page_id: string
          scheduled_at: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          page_id: string
          scheduled_at?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          page_id?: string
          scheduled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_posts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          about: string | null
          avatar_url: string | null
          category: string
          cover_photo_url: string | null
          created_at: string
          created_by: string
          description: string | null
          email: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          category?: string
          cover_photo_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          category?: string
          cover_photo_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      post_edit_history: {
        Row: {
          background_style: string | null
          content: string
          edited_at: string
          feeling: string | null
          id: string
          location: string | null
          post_id: string
          privacy: string | null
          user_id: string
        }
        Insert: {
          background_style?: string | null
          content: string
          edited_at?: string
          feeling?: string | null
          id?: string
          location?: string | null
          post_id: string
          privacy?: string | null
          user_id: string
        }
        Update: {
          background_style?: string | null
          content?: string
          edited_at?: string
          feeling?: string | null
          id?: string
          location?: string | null
          post_id?: string
          privacy?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_edit_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_interests: {
        Row: {
          created_at: string
          id: string
          interested: boolean
          post_id: string
          post_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interested: boolean
          post_id: string
          post_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interested?: boolean
          post_id?: string
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_notification_subscriptions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_notification_subscriptions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          archived: boolean
          background_style: string | null
          comments_disabled: boolean
          content: string
          created_at: string
          feeling: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          location: string | null
          pinned: boolean
          pinned_at: string | null
          privacy: string
          shared_group_post_id: string | null
          shared_page_post_id: string | null
          shared_post_id: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          archived?: boolean
          background_style?: string | null
          comments_disabled?: boolean
          content: string
          created_at?: string
          feeling?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          location?: string | null
          pinned?: boolean
          pinned_at?: string | null
          privacy?: string
          shared_group_post_id?: string | null
          shared_page_post_id?: string | null
          shared_post_id?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          archived?: boolean
          background_style?: string | null
          comments_disabled?: boolean
          content?: string
          created_at?: string
          feeling?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          location?: string | null
          pinned?: boolean
          pinned_at?: string | null
          privacy?: string
          shared_group_post_id?: string | null
          shared_page_post_id?: string | null
          shared_post_id?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_shared_group_post_id_fkey"
            columns: ["shared_group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_shared_page_post_id_fkey"
            columns: ["shared_page_post_id"]
            isOneToOne: false
            referencedRelation: "page_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_photo_offset_y: number | null
          cover_photo_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          education: string | null
          gender: string | null
          id: string
          interests: string[] | null
          last_seen_at: string | null
          location: string | null
          phone: string | null
          relationship_status: string | null
          updated_at: string
          user_id: string
          website: string | null
          workplace: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_photo_offset_y?: number | null
          cover_photo_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          education?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          phone?: string | null
          relationship_status?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          workplace?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_photo_offset_y?: number | null
          cover_photo_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          education?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          phone?: string | null
          relationship_status?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          workplace?: string | null
        }
        Relationships: []
      }
      promoted_listings: {
        Row: {
          clicks: number
          created_at: string
          credits_spent: number
          end_date: string
          id: string
          impressions: number
          is_active: boolean
          listing_id: string
          start_date: string
          target_category: string | null
          target_location: string | null
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          credits_spent?: number
          end_date: string
          id?: string
          impressions?: number
          is_active?: boolean
          listing_id: string
          start_date?: string
          target_category?: string | null
          target_location?: string | null
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          credits_spent?: number
          end_date?: string
          id?: string
          impressions?: number
          is_active?: boolean
          listing_id?: string
          start_date?: string
          target_category?: string | null
          target_location?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoted_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          created_at: string
          duration: number | null
          id: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: []
      }
      saved_listings: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_reviews: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          review_text: string | null
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          review_text?: string | null
          reviewer_id: string
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      snoozed_users: {
        Row: {
          created_at: string
          id: string
          snoozed_until: string
          snoozed_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snoozed_until: string
          snoozed_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snoozed_until?: string
          snoozed_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sponsored_posts: {
        Row: {
          clicks: number
          content: string
          created_at: string
          credits_spent: number
          end_date: string
          frequency_cap: number
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          link_url: string | null
          start_date: string
          target_age_max: number | null
          target_age_min: number | null
          target_category: string | null
          target_gender: string | null
          target_location: string | null
          user_id: string
        }
        Insert: {
          clicks?: number
          content: string
          created_at?: string
          credits_spent?: number
          end_date: string
          frequency_cap?: number
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          start_date?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_category?: string | null
          target_gender?: string | null
          target_location?: string | null
          user_id: string
        }
        Update: {
          clicks?: number
          content?: string
          created_at?: string
          credits_spent?: number
          end_date?: string
          frequency_cap?: number
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          start_date?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_category?: string | null
          target_gender?: string | null
          target_location?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      story_highlight_items: {
        Row: {
          created_at: string
          highlight_id: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          created_at?: string
          highlight_id: string
          id?: string
          media_type?: string
          media_url: string
        }
        Update: {
          created_at?: string
          highlight_id?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_highlight_items_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "story_highlights"
            referencedColumns: ["id"]
          },
        ]
      }
      story_highlights: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      story_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message: string | null
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message?: string | null
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message?: string | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          weekly_event_digest: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          weekly_event_digest?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          weekly_event_digest?: boolean
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
      user_warnings: {
        Row: {
          created_at: string
          details: string | null
          duration_hours: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          issued_by: string
          reason: string
          related_report_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_by: string
          reason: string
          related_report_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_by?: string
          reason?: string
          related_report_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_related_report_id_fkey"
            columns: ["related_report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          document_url: string | null
          full_name: string | null
          id: string
          reason: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          document_url?: string | null
          full_name?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          document_url?: string | null
          full_name?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verified_sellers: {
        Row: {
          criteria_met: Json | null
          id: string
          user_id: string
          verification_type: string
          verified_at: string
        }
        Insert: {
          criteria_met?: Json | null
          id?: string
          user_id: string
          verification_type?: string
          verified_at?: string
        }
        Update: {
          criteria_met?: Json | null
          id?: string
          user_id?: string
          verification_type?: string
          verified_at?: string
        }
        Relationships: []
      }
      watch_playlist_items: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          video_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          video_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "watch_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_playlist_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "watch_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_saved_videos: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_saved_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "watch_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "watch_video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "watch_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "watch_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_videos: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_live: boolean
          live_viewer_count: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_live?: boolean
          live_viewer_count?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_live?: boolean
          live_viewer_count?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_group_member: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      check_setup_complete: { Args: never; Returns: boolean }
      create_group_conversation: {
        Args: { p_group_name: string; p_member_ids: string[] }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_admin_or_mod: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_page_admin: {
        Args: { _page_id: string; _user_id: string }
        Returns: boolean
      }
      remove_group_member: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      friendship_status: "pending" | "accepted" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      friendship_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
