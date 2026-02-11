/**
 * admin/types.ts
 * Semua interface dan tipe yang diekspor dari adminService
 */

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  totalReviews: number;
  averageRating: number;
  pendingOrders: number;
  completedOrders: number;
  totalFlashSales: number;
  activeFlashSales: number;
}

export interface Order {
  id: string;
  customer_name: string;
  product_name?: string;
  amount: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  order_type: string;
  rental_duration?: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
  product_id?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  xendit_invoice_id?: string;
  payment_data?: {
    xendit_id?: string;
    payment_method_type?: string;
    payment_status?: string;
    qr_url?: string;
    qr_string?: string;
    account_number?: string;
    bank_code?: string;
    payment_url?: string;
    payment_code?: string;
    retail_outlet?: string;
    created_at?: string;
    expiry_date?: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  is_admin?: boolean;
  last_login?: string;
  last_login_at?: string;
  is_active?: boolean;
  phone_verified?: boolean;
  profile_completed?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category_id?: string;
  categoryData?: { id: string; name: string; slug?: string };
  game_title?: string;
  account_level?: string;
  account_details?: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  image?: string;
  images?: string[];
  tier?: string;
  tier_id?: string;
  game_title_id?: string;
  is_flash_sale?: boolean;
  flash_sale_end_time?: string;
  has_rental?: boolean;
  archived_at?: string;
}

export interface Review {
  id?: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at?: string;
  product_name?: string;
  user_name?: string;
  is_verified?: boolean;
  helpful_count?: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  cta_text?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashSale {
  id: string;
  product_id: string;
  sale_price: number;
  original_price: number;
  start_time: string;
  end_time: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  product?: Product;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
  stats?: {
    total?: number;
    verified?: number;
    admin?: number;
    active?: number;
    inactive?: number;
    [key: string]: number | undefined;
  };
}

export interface FeedPost {
  id: string;
  user_id: string;
  type: 'post' | 'announcement';
  product_id?: string | null;
  title?: string | null;
  content: string;
  rating?: number | null;
  image_url?: string | null;
  likes_count: number;
  comments_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  author_name?: string;
  views?: number;
}

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'paid_order' | 'cancelled_order' | 'new_user' | 'new_review';
  title: string;
  message: string;
  order_id?: string;
  user_id?: string;
  product_name?: string;
  amount?: number;
  created_at: string;
  is_read: boolean;
}

export interface OrderDayStat {
  date: string;
  count: number;
  revenue: number;
}

export interface OrderStatusDayStat {
  date: string;
  created: number;
  completed: number;
}

export interface TopProductStat {
  product_id: string | null;
  product_name: string;
  count: number;
  revenue: number;
}

export interface OrderItem {
  id: string;
  user_email: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface UserItem {
  id: string;
  email: string;
  name: string;
  created_at: string;
}
