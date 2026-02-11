/**
 * types.ts
 * Tipe data dan konstanta untuk halaman konfigurasi WhatsApp
 */

export interface ProviderSettings {
  id: string;
  name: string;
  display_name: string;
  base_url: string;
  settings: {
    default_group_id?: string;
    group_configurations?: Partial<GroupConfiguration>;
  };
}

export interface ApiKeyInfo {
  id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  is_primary: boolean;
  usage_count: number;
  last_used_at: string | null;
}

export interface GroupConfiguration {
  purchase_orders: string;
  rental_orders: string;
  flash_sales: string;
  general_notifications: string;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
}

export interface ResultModalState {
  isOpen: boolean;
  success: boolean;
  title: string;
  message: string;
  details?: {
    messageId?: string;
    provider?: string;
    responseTime?: number;
    groupId?: string;
    sentMessage?: string;
  };
}

/** Template pesan untuk test messaging */
export const MESSAGE_TEMPLATES = [
  { id: 'custom', label: '✏️ Custom Message', text: '' },
  { id: 'simple', label: '📨 Simple Test', text: '🔔 Test message from Admin - {timestamp}' },
  { id: 'order', label: '🛒 Order Notification', text: '🛒 *Test Order Notification*\n\nOrder #TEST-{timestamp}\nCustomer: John Doe\nTotal: Rp 150,000\nStatus: ✅ Paid\n\n_This is a test message_' },
  { id: 'rental', label: '🔄 Rental Notification', text: '🔄 *Test Rental Notification*\n\nRental #RNT-{timestamp}\nProduct: Premium Account\nDuration: 7 days\nStatus: 🟢 Active\n\n_This is a test message_' },
  { id: 'flash', label: '⚡ Flash Sale Alert', text: '⚡ *FLASH SALE ALERT!*\n\nTest Flash Sale #{timestamp}\nDiscount: 50% OFF!\nEnds: 2 hours\n\n🔥 _Limited time offer!_' }
];

/** Jenis notifikasi yang bisa di-routing ke grup berbeda */
export const NOTIFICATION_TYPES = [
  { key: 'purchase_orders', label: 'Purchase Orders' },
  { key: 'rental_orders', label: 'Rental Orders' },
  { key: 'flash_sales', label: 'Flash Sales' },
  { key: 'general_notifications', label: 'General' }
] as const;
