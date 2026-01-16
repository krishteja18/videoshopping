export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'buyer' | 'seller'
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'buyer' | 'seller'
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'buyer' | 'seller'
          created_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          seller_id: string
          video_url: string
          thumbnail_url: string | null
          description: string | null
          likes_count: number
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          video_url: string
          thumbnail_url?: string | null
          description?: string | null
          likes_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          video_url?: string
          thumbnail_url?: string | null
          description?: string | null
          likes_count?: number
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string | null
          price: number
          original_price: number | null
          image_url: string | null
          stock: number
          rating: number
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description?: string | null
          price: number
          original_price?: number | null
          image_url?: string | null
          stock?: number
          rating?: number
          created_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          description?: string | null
          price?: number
          original_price?: number | null
          image_url?: string | null
          stock?: number
          rating?: number
          created_at?: string
        }
      }
      video_products: {
        Row: {
          video_id: string
          product_id: string
        }
        Insert: {
          video_id: string
          product_id: string
        }
        Update: {
          video_id?: string
          product_id?: string
        }
      }
      cart: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
        }
      }
      wishlist: {
        Row: {
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          product_id?: string
          created_at?: string
        }
      }
    }
  }
}
