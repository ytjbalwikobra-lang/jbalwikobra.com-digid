export type ProductTier = 'reguler' | 'pelajar' | 'premium';

export interface Tier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  borderColor?: string;
  backgroundGradient?: string;
  icon?: string;
  priceRangeMin?: number;
  priceRangeMax?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameTitle {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  logoUrl?: string;
  isPopular: boolean;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  categoryId: string; // Foreign key (required after migration)
  tierId?: string; // New foreign key
  gameTitleId?: string; // New foreign key
  tierData?: Tier; // Populated tier data
  gameTitleData?: GameTitle; // Populated game title data
  categoryData?: Category; // Populated category data
  isFlashSale: boolean;
  flashSaleEndTime?: string;
  hasRental: boolean;
  rentalOptions?: RentalOption[];
  stock: number;
  soldChannel?: 'web' | 'wa' | null; // Sold channel indicator
  // Archiving
  isActive?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RentalOption {
  id: string;
  duration: string;
  price: number;
  description?: string;
}

/** Data status rental produk — dari API publik /api/product-rental-status */
export interface ProductRentalStatusData {
  /** Durasi rental, misal "1 Hari", "1 Minggu" */
  rentalDuration: string;
  /** Tanggal berakhirnya rental aktif (ISO 8601) */
  rentalEndDate: string;
  /** Status: active | expiring_soon */
  rentalStatus: 'active' | 'expiring_soon';
  /** Jumlah antrian rental di belakang rental aktif ini */
  queueCount: number;
}

export interface FlashSale {
  id: string;
  productId: string;
  salePrice: number;
  originalPrice: number;
  startTime: string;
  endTime: string;
  stock: number;
  isActive: boolean;
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

export interface WebsiteSettings {
  id: string; // singleton row id
  siteName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  address?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  companyDescription?: string;
  supportEmail?: string;
  businessHours?: string;
  footerCopyrightText?: string;
  newsletterEnabled?: boolean;
  socialMediaEnabled?: boolean;
  topupGameUrl?: string; // URL for Top Up Game feature
  whatsappChannelUrl?: string; // URL for WhatsApp channel
  heroButtonUrl?: string; // URL for new hero button
  jualAkunWhatsappUrl?: string; // URL for jual akun WhatsApp button
  updatedAt?: string;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string; // Optional WhatsApp number for direct consultation
}

export interface Order {
  id: string;
  productId: string;
  customer: Customer;
  type: 'purchase' | 'rental';
  amount: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  paymentMethod: 'xendit' | 'whatsapp';
  rentalDuration?: string;
  clientExternalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  // All products are single-quantity items
  quantity: 1;
  type: 'purchase' | 'rental';
  rentalOption?: RentalOption;
}
