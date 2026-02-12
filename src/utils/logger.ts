/**
 * logger.ts
 * Conditional logging utility — only logs in development, silent in production
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  /**
   * Force log bahkan di production (untuk error critical)
   */
  forceError: (...args: any[]) => {
    console.error(...args);
  }
};
