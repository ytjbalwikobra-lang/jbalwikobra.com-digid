import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  console.log('[test-groups-simple] Request received');
  
  return res.status(200).json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString(),
    groups: [
      { id: '120363421819020887@g.us', name: 'TEST GROUP 1' },
      { id: '120363421819020999@g.us', name: 'TEST GROUP 2' }
    ]
  });
}
