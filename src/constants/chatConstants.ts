/**
 * chatConstants.ts
 * Konstanta untuk sistem live chat — timing, limits, intervals
 */

/** Interval polling percakapan sebagai safety net (ms) — realtime adalah mekanisme utama */
export const POLL_CONVERSATIONS_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

/** Interval cek jam operasional (ms) */
export const CHECK_BUSINESS_HOURS_INTERVAL_MS = 60 * 1000; // 60 detik

/** Max ukuran file gambar (bytes) */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/** Max ukuran file dokumen (bytes) */
export const MAX_DOCUMENT_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

/** Max panjang pesan text (karakter) */
export const MAX_MESSAGE_LENGTH = 5000;

/** TTL untuk typing indicator (ms) — harus match dengan backend */
export const TYPING_INDICATOR_TTL_MS = 10 * 1000; // 10 detik

/** Debounce delay untuk typing indicator (ms) */
export const TYPING_DEBOUNCE_MS = 3000; // 3 detik

/** Durasi notifikasi toast (ms) */
export const TOAST_DURATION_MS = 3000; // 3 detik

/** Rate limit cleanup interval di serverless (ms) */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

/** Rate limit window (ms) */
export const RATE_LIMIT_WINDOW_MS = 10 * 1000; // 10 detik

/** Max request dalam rate limit window */
export const RATE_LIMIT_MAX_REQUESTS = 60;
