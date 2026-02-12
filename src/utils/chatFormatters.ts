/**
 * chatFormatters.ts
 * Utilitas format teks dan waktu yang digunakan bersama oleh admin dan customer chat.
 * Menghindari duplikasi fungsi yang sama di beberapa file.
 */

/** Format waktu sederhana ke format Indonesia (HH:MM) */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

/** Format tanggal lengkap dengan jam (dd MMM yyyy, HH:MM) */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/** Format tanggal panjang tanpa jam (Hari, dd Bulan yyyy) — untuk separator tanggal chat */
export const formatDateLong = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

/** Ambil inisial dari nama (1-2 huruf kapital) */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};
