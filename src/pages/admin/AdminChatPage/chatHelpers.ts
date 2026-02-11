/**
 * chatHelpers.ts
 * Konstanta dan fungsi utilitas untuk halaman admin chat
 */

import type { ChatConversationStatus } from '../../../types/chat';

/** Tipe filter status termasuk opsi 'all' */
export type FilterStatus = 'all' | ChatConversationStatus;

/** Opsi filter status percakapan */
export const STATUS_OPTIONS: { value: FilterStatus; label: string; color: string }[] = [
  { value: 'all', label: 'Semua', color: 'var(--admin-text)' },
  { value: 'open', label: 'Baru', color: 'var(--admin-info)' },
  { value: 'assigned', label: 'Ditangani', color: 'var(--admin-warning)' },
  { value: 'resolved', label: 'Selesai', color: 'var(--admin-success)' },
  { value: 'closed', label: 'Ditutup', color: 'var(--admin-text-muted)' }
];

/** Format waktu sederhana tanpa date-fns */
export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

/** Format tanggal lengkap dengan jam */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/** Format waktu relatif dalam Bahasa Indonesia */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  if (diffHour < 24) return `${diffHour}j lalu`;
  if (diffDay < 7) return `${diffDay}h lalu`;
  
  return formatDate(dateString);
};

/** Ambil inisial dari nama (1-2 huruf) */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/** Label aktivitas percakapan dalam Bahasa Indonesia */
export function getActivityLabel(action: string): string {
  const labels: Record<string, string> = {
    'conversation_started': 'memulai percakapan',
    'conversation_assigned': 'mengambil alih percakapan',
    'conversation_reassigned': 'mengalihkan percakapan',
    'conversation_resolved': 'menyelesaikan percakapan',
    'conversation_closed': 'menutup percakapan',
    'conversation_reopened': 'membuka kembali percakapan',
    'message_sent': 'mengirim pesan',
    'message_read': 'membaca pesan',
    'admin_joined': 'bergabung ke percakapan',
    'admin_left': 'keluar dari percakapan',
    'file_uploaded': 'mengunggah file',
    'rating_submitted': 'memberikan rating'
  };
  return labels[action] || action;
}
