export interface User {
  id: string;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  skills: string[];
  is_freelancer: boolean;
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  completed_orders: number;
  level: "newbie" | "experienced" | "pro" | "top";
  is_online: boolean;
  referral_code?: string;
  language: string;
  created_at: string;
}

export interface Package {
  name: string;
  description: string;
  price: number;
  delivery_days: number;
  revisions: number;
  features: string[];
}

export interface GalleryItem {
  url: string;
  type: "image" | "video";
  thumbnail?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Gig {
  id: string;
  seller_id: string;
  seller?: User;
  title: string;
  description: string;
  category_id: number;
  subcategory_id?: number;
  tags: string[];
  packages: Package[];
  gallery: GalleryItem[];
  requirements?: string;
  faq: FAQItem[];
  is_active: boolean;
  is_featured: boolean;
  views_count: number;
  orders_count: number;
  rating: number;
  reviews_count: number;
  avg_response_time?: number;
  min_price: number;
  min_delivery_days: number;
  is_favorited: boolean;
  created_at: string;
  updated_at: string;
}

export interface GigListResponse {
  items: Gig[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export type OrderStatus =
  | "pending"
  | "in_progress"
  | "revision"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed";

export type PaymentMethod = "stars" | "ton" | "card";

export interface Order {
  id: string;
  order_number: string;
  gig_id: string;
  gig?: {
    id: string;
    title: string;
    gallery: GalleryItem[];
  };
  buyer_id: string;
  buyer?: { id: string; username?: string; first_name: string; avatar_url?: string };
  seller_id: string;
  seller?: { id: string; username?: string; first_name: string; avatar_url?: string };
  package_name: string;
  package_snapshot: Package;
  requirements_text?: string;
  status: OrderStatus;
  price: number;
  stars_price?: number;
  platform_fee: number;
  delivery_deadline?: string;
  revision_deadline?: string;
  revisions_used: number;
  delivery_files: Array<{ url: string; filename: string }>;
  delivery_note?: string;
  cancel_reason?: string;
  dispute_reason?: string;
  is_rated_by_buyer: boolean;
  is_rated_by_seller: boolean;
  payment_method?: PaymentMethod;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Message {
  id: string;
  order_id?: string;
  sender_id: string;
  sender?: { id: string; first_name: string; username?: string; avatar_url?: string; is_online?: boolean };
  receiver_id: string;
  content?: string;
  attachments: Array<{ url: string; type: string; filename?: string }>;
  message_type: "text" | "file" | "image" | "order_update" | "system";
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  user: User;
  last_message?: Message;
  unread_count: number;
  order_id?: string;
}

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewer?: { id: string; first_name: string; username?: string; avatar_url?: string };
  reviewee_id: string;
  gig_id: string;
  rating: number;
  communication_rating: number;
  quality_rating: number;
  deadline_rating: number;
  comment?: string;
  seller_reply?: string;
  is_buyer_review: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  name_en?: string;
  slug: string;
  emoji?: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: number;
  name: string;
  name_en?: string;
  slug: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  order_id?: string;
  type: string;
  amount?: number;
  stars_amount?: number;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
}

export interface WalletInfo {
  balance: number;
  stars_balance: number;
  ton_balance: number;
  total_earned: number;
  total_withdrawn: number;
  pending_clearance: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
