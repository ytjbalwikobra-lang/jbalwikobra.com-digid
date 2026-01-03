/**
 * Xendit Callback Endpoint (Legacy)
 * 
 * This is a compatibility endpoint for existing Xendit webhook configuration.
 * Redirects to main webhook handler at /api/xendit/webhook
 * 
 * Xendit Configuration URL: https://www.jbalwikobra.com/api/xendit/callback
 */

export { default } from './webhook';
