import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Payment Reminder Cron Job
 * 
 * DEPRECATED: WhatsApp individual notification dihapus (auth revamp).
 * Customer notification sekarang melalui in-app notification.
 * 
 * Cron job ini dinonaktifkan. Jika butuh payment reminder,
 * implementasi via email atau in-app notification di masa depan.
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment reminder via WhatsApp telah dinonaktifkan. Gunakan in-app notification.',
    count: 0
  });
}
