// API Request Optimization Utilities
import { VercelRequest, VercelResponse } from '@vercel/node';
// Make Redis optional at runtime to avoid build errors when 'ioredis' isn't installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    redisClient = new Redis(redisUrl);
    redisClient.on('error', (err: unknown) => console.error('Redis Client Error:', err));
    redisClient.on('connect', () =>   } catch (e) {
    console.warn('ioredis not installed or failed to initialize. Falling back to in-memory cache.');
    redisClient = null;
  }
}

export function generateCacheKey(req: VercelRequest): string {
  const { action, page, limit, search, status, ...otherParams } = req.query;
  const params = { action, page, limit, search, status, ...otherParams };
  return `${req.url}-${JSON.stringify(params)}`;
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!redisClient) {
    // Fallback to in-memory if Redis is not configured
    const cached = (global as any).apiCache?.get(key);
    if (!cached) return null;
    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      (global as any).apiCache.delete(key);
      return null;
    }
    return cached.data as T;
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.error('Error getting from Redis cache:', error);
  }
  return null;
}

export async function setToCache<T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> {
  if (!redisClient) {
    // Fallback to in-memory if Redis is not configured
    if (!(global as any).apiCache) {
      (global as any).apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
    }
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    (global as any).apiCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    return;
  }

  try {
    // Set with expiration in seconds
    await redisClient.setex(key, ttlMinutes * 60, JSON.stringify(data));
  } catch (error) {
    console.error('Error setting to Redis cache:', error);
  }
}

export async function clearCache(): Promise<void> {
  if (!redisClient) {
    if ((global as any).apiCache) {
      (global as any).apiCache.clear();
    }
    return;
  }

  try {
    await redisClient.flushdb(); // Clear all keys in the current DB
  } catch (error) {
    console.error('Error clearing Redis cache:', error);
  }
}

// Middleware to add cache headers for better client-side caching
export function setCacheHeaders(res: VercelResponse, maxAgeSeconds: number = 300): void {
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`);
  res.setHeader('ETag', `"${Date.now()}"`);
}

// Request validation utilities
export function validatePagination(req: VercelRequest): { page: number; limit: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  return { page, limit };
}

export function validateStringParam(value: any, maxLength: number = 100): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().substring(0, maxLength) || undefined;
}

// Error response helper
export function sendError(res: VercelResponse, message: string, status: number = 500): void {
  res.status(status).json({ 
    error: message,
    timestamp: new Date().toISOString()
  });
}

// Success response helper with consistent format
export function sendSuccess<T>(res: VercelResponse, data: T, meta?: any): void {
  res.status(200).json({
    data,
    meta,
    timestamp: new Date().toISOString()
  });
}