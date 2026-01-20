import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Configure CORS headers for Vercel deployments
 * Supports production, preview, and local development domains
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  // Get the origin from the request (with null safety)
  const headers = req.headers || {};
  const origin = headers.origin || headers.referer || '';
  
  // Configure allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://jbalwikobra.com',
    'https://www.jbalwikobra.com'
  ];
  
  // Allow all Vercel preview and production domains
  const isVercelDomain = origin.includes('.vercel.app') || 
                         origin.includes('jbalwikobra.com') ||
                         origin.includes('localhost');
  
  const allowedOrigin = isVercelDomain || allowedOrigins.includes(origin) 
    ? origin 
    : allowedOrigins[0];
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCorsPreFlight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}
