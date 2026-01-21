/**
 * Server-only Payment Channel Configuration for Xendit V3 (ESM-safe)
 * Do NOT import from src/ in serverless functions to avoid ESM/CJS issues on Vercel.
 * 
 * ACTIVATED CHANNELS (synced with Xendit Dashboard: 2026-01-21):
 * - QRIS ✅
 * - AstraPay (E-Wallet) ✅
 * - Virtual Accounts: BJB, BNI, BRI, BSI, BSS, CIMB, Mandiri, Permata ✅
 * - Indomaret (Over-The-Counter) ✅
 * - Akulaku (PayLater) ✅
 * 
 * NOT ACTIVATED:
 * - BCA Virtual Account ❌
 * - Credit/Debit Card ❌
 * - OVO, DANA, GOPAY, SHOPEEPAY, LINKAJA ❌
 * - Alfamart ❌
 * - Kredivo, Atome, Indodana ❌
 */

export type ChannelType = 'EWALLET' | 'VIRTUAL_ACCOUNT' | 'QRIS' | 'OVER_THE_COUNTER' | 'PAYLATER'

export interface ActivatedPaymentChannel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  channel_code?: string;
  available: boolean;
  processing_time?: string;
  popular?: boolean;
  min_amount: number;
  max_amount: number;
}

// Keep this list aligned with actual activated channels on Xendit dashboard
// NO DUPLICATES - each channel appears exactly once
export const ACTIVATED_PAYMENT_CHANNELS: ActivatedPaymentChannel[] = [
  // QRIS - Activated ✅
  {
    id: 'qris',
    name: 'QRIS',
    type: 'QRIS',
    channel_code: 'QRIS',
    available: true,
    processing_time: 'Instant',
    min_amount: 1000,
    max_amount: 10_000_000,
    popular: true,
  },
  
  // E-Wallets - Only AstraPay is activated ✅
  {
    id: 'astrapay',
    name: 'AstraPay',
    type: 'EWALLET',
    channel_code: 'ASTRAPAY',
    available: true,
    processing_time: 'Instant',
    min_amount: 10_000,
    max_amount: 10_000_000,
    popular: true,
  },
  
  // Virtual Accounts - Activated channels only (BCA NOT activated)
  { id: 'bjb', name: 'BJB Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'BJB', available: true, processing_time: 'Instant', min_amount: 1000, max_amount: 500_000_000, popular: false },
  { id: 'bni', name: 'BNI Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'BNI', available: true, processing_time: 'Instant', min_amount: 1000, max_amount: 500_000_000, popular: true },
  { id: 'bri', name: 'BRI Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'BRI', available: true, processing_time: 'Instant', min_amount: 1000, max_amount: 1_000_000_000, popular: true },
  { id: 'bsi', name: 'BSI Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'BSI', available: true, processing_time: 'Instant', min_amount: 1000, max_amount: 100_000_000, popular: false },
  { id: 'bss', name: 'BSS Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'BSS', available: true, processing_time: 'Instant', min_amount: 1000, max_amount: 100_000_000, popular: false, description: 'Bank Sahabat Sampoerna' },
  { id: 'cimb', name: 'CIMB Niaga Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'CIMB', available: true, processing_time: 'Instant', min_amount: 1000, max_amount: 100_000_000, popular: false },
  { id: 'mandiri', name: 'Mandiri Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'MANDIRI', available: true, processing_time: '1-15 menit', min_amount: 1000, max_amount: 500_000_000, popular: true },
  { id: 'permata', name: 'Permata Virtual Account', type: 'VIRTUAL_ACCOUNT', channel_code: 'PERMATA', available: true, processing_time: 'Instant', min_amount: 1000, max_amount: 100_000_000, popular: false },
  
  // Over the counter - Activated ✅
  { id: 'indomaret', name: 'Indomaret', type: 'OVER_THE_COUNTER', channel_code: 'INDOMARET', available: true, processing_time: 'Instant setelah bayar', min_amount: 10_000, max_amount: 2_500_000, popular: true },
  
  // PayLater - Only Akulaku is activated ✅
  { id: 'akulaku', name: 'Akulaku', type: 'PAYLATER', channel_code: 'AKULAKU', available: true, processing_time: 'Instant', min_amount: 50_000, max_amount: 10_000_000, popular: false },
];

export function getActivatedPaymentChannels(): ActivatedPaymentChannel[] {
  return ACTIVATED_PAYMENT_CHANNELS.filter((c) => c.available);
}

export function getXenditChannelCode(paymentMethodId: string): string {
  const channel = ACTIVATED_PAYMENT_CHANNELS.find((c) => c.id === paymentMethodId);
  return channel?.channel_code || paymentMethodId.toUpperCase();
}

export function isChannelActivated(paymentMethodId: string): boolean {
  return getActivatedPaymentChannels().some((c) => c.id === paymentMethodId);
}
