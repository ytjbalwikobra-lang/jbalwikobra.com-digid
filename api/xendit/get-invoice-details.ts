import type { VercelRequest, VercelResponse } from '@vercel/node';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_BASE_URL = 'https://api.xendit.co';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { invoice_id } = req.query;

  if (!invoice_id || typeof invoice_id !== 'string') {
    return res.status(400).json({ error: 'Invoice ID is required' });
  }

  if (!XENDIT_SECRET_KEY) {
    console.error('[Get Invoice Details] Missing XENDIT_SECRET_KEY');
    return res.status(500).json({ error: 'Payment service configuration error' });
  }

  try {
    
    const response = await fetch(`${XENDIT_BASE_URL}/v2/invoices/${invoice_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Get Invoice Details] Xendit API error:', response.status, error);
      return res.status(response.status).json({ error: 'Failed to fetch invoice details' });
    }

    const invoiceData = await response.json();
        // Extract Virtual Account details
    let vaDetails: Record<string, any> = {};
    
    if (invoiceData.available_banks && invoiceData.available_banks.length > 0) {
      const bank = invoiceData.available_banks[0];
      vaDetails = {
        virtual_account_number: bank.virtual_account_number || bank.account_number,
        bank_code: bank.bank_code,
        bank_name: bank.bank_name,
        account_holder_name: bank.account_holder_name,
        transfer_amount: bank.transfer_amount
      };
    } else if (invoiceData.available_virtual_account_banks && invoiceData.available_virtual_account_banks.length > 0) {
      const vaBank = invoiceData.available_virtual_account_banks[0];
      vaDetails = {
        virtual_account_number: vaBank.virtual_account_number,
        bank_code: vaBank.bank_code,
        bank_name: vaBank.bank_name,
        account_holder_name: vaBank.account_holder_name
      };
    }

    // Cache: private karena data invoice spesifik, short TTL untuk polling
    res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=20');

    return res.status(200).json({
      id: invoiceData.id,
      status: invoiceData.status,
      invoice_url: invoiceData.invoice_url,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      expiry_date: invoiceData.expiry_date,
      ...vaDetails,
      available_banks: invoiceData.available_banks,
      available_virtual_account_banks: invoiceData.available_virtual_account_banks
    });

  } catch (error) {
    console.error('[Get Invoice Details] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}