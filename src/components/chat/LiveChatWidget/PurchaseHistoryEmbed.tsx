/**
 * PurchaseHistoryEmbed.tsx
 * Kartu embed riwayat pembelian yang ditampilkan di dalam percakapan chat.
 * Digunakan di sisi pelanggan (ChatView) dan admin (ChatMessageView).
 */

import React from 'react';
import type { PurchaseEmbedData } from '../../../types/chat';

/** Formatter mata uang Rupiah */
const fmtCurrency = (amount?: number) =>
  amount != null
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    : '-';

/** Formatter tanggal singkat */
const fmtDate = (iso?: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

/** Label status pembayaran dengan warna */
const statusLabel = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'success':
    case 'completed':
      return { text: 'Sukses', cls: 'text-green-400' };
    case 'pending':
      return { text: 'Menunggu', cls: 'text-amber-400' };
    case 'failed':
      return { text: 'Gagal', cls: 'text-red-400' };
    case 'expired':
      return { text: 'Kedaluwarsa', cls: 'text-orange-400' };
    default:
      return { text: status || '-', cls: 'text-[var(--cyber-text-secondary)]' };
  }
};

interface PurchaseHistoryEmbedProps {
  /** Data embed pembelian — disimpan di metadata pesan */
  data: PurchaseEmbedData;
  /** Varian tampilan: 'customer' (widget) atau 'admin' (panel admin) */
  variant?: 'customer' | 'admin';
}

/** Kartu embed riwayat pembelian di dalam bubble chat */
export const PurchaseHistoryEmbed: React.FC<PurchaseHistoryEmbedProps> = ({
  data,
  variant = 'customer'
}) => {
  const st = statusLabel(data.status);
  const isAdmin = variant === 'admin';

  // Token CSS berdasarkan varian
  const bgCard = isAdmin ? 'var(--admin-bg-elevated)' : 'var(--cyber-bg-surface)';
  const border = isAdmin ? 'var(--admin-border)' : 'var(--cyber-border)';
  const textPrimary = isAdmin ? 'var(--admin-text)' : 'var(--cyber-text-primary)';
  const textMuted = isAdmin ? 'var(--admin-text-muted)' : 'var(--cyber-text-muted)';
  const accent = isAdmin ? 'var(--admin-accent)' : 'var(--cyber-accent)';

  return (
    <div
      className="rounded-xl overflow-hidden max-w-[280px] w-full shadow-sm"
      style={{ background: bgCard, border: `1px solid ${border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <span className="text-base">🛒</span>
        <span className="text-xs font-semibold" style={{ color: accent }}>
          Riwayat Pembelian
        </span>
      </div>

      {/* Detail */}
      <div className="px-3 py-2 space-y-1.5">
        {data.orderId && (
          <Row label="Order ID" value={data.orderId} textPrimary={textPrimary} textMuted={textMuted} mono />
        )}
        {data.productName && (
          <Row label="Produk" value={data.productName} textPrimary={textPrimary} textMuted={textMuted} />
        )}
        {data.amount != null && (
          <Row label="Jumlah" value={fmtCurrency(data.amount)} textPrimary={textPrimary} textMuted={textMuted} bold />
        )}
        {data.paymentMethod && (
          <Row label="Metode" value={data.paymentMethod.toUpperCase()} textPrimary={textPrimary} textMuted={textMuted} />
        )}
        {data.status && (
          <div className="flex justify-between items-center">
            <span className="text-[11px]" style={{ color: textMuted }}>Status</span>
            <span className={`text-[11px] font-semibold ${st.cls}`}>
              {data.status === 'paid' || data.status === 'success' || data.status === 'completed' ? '✅ ' : ''}
              {st.text}
            </span>
          </div>
        )}
        {data.paidAt && (
          <Row label="Tanggal" value={fmtDate(data.paidAt)} textPrimary={textPrimary} textMuted={textMuted} />
        )}
      </div>
    </div>
  );
};

/** Baris detail label-value */
const Row: React.FC<{
  label: string;
  value: string;
  textPrimary: string;
  textMuted: string;
  mono?: boolean;
  bold?: boolean;
}> = ({ label, value, textPrimary, textMuted, mono, bold }) => (
  <div className="flex justify-between items-center gap-2">
    <span className="text-[11px] shrink-0" style={{ color: textMuted }}>{label}</span>
    <span
      className={`text-[11px] text-right truncate ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`}
      style={{ color: textPrimary }}
    >
      {value}
    </span>
  </div>
);
