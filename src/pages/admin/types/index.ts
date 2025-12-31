// Admin Dashboard Types

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  image: string;
  category: string;
  is_flash_sale?: boolean;
  flash_sale_end_time?: string;
  stock_quantity: number;
  seller_name?: string;
  created_at: string;
  is_active: boolean;
};

export type Order = {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'processing' | 'completed';
  payment_method?: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  admin_notes?: string;
  products?: {
    id: string;
    name: string;
    image: string;
  };
};

export type User = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  is_admin: boolean;
  is_active: boolean;
  phone_verified: boolean;
  created_at: string;
};

export type FeedPost = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  type: 'post' | 'announcement';
  is_deleted: boolean;
  created_at: string;
};

export type DashboardStats = {
  orders: {
    count: number;
    completed: number;
    revenue: number;
    completedRevenue: number;
  };
  users: { count: number };
  products: { count: number };
  flashSales: { count: number };
};

export type AdminTab = 'products' | 'orders' | 'users';
