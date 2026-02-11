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
