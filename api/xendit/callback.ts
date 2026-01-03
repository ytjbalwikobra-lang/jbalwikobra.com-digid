/**
 * Xendit Callback Endpoint (Legacy)
 * 
 * This is a compatibility endpoint for existing Xendit webhook configuration.
 * It redirects all requests to the main webhook handler.
 * 
 * Xendit Configuration URL: https://www.jbalwikobra.com/api/xendit/callback
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './webhook';

// Re-export the webhook handler for the /callback path
export default async function callbackHandler(req: VercelRequest, res: VercelResponse) {
  console.log('[Callback] Request received, forwarding to webhook handler');
  return handler(req, res);
}
