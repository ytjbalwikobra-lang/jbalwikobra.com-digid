/**
 * Vercel Serverless Function to Fix QRIS Payment
 * 
 * This endpoint manually fetches QR string from Xendit Invoice API
 * and updates the payment record in database.
 * 
 * GET /api/xendit/fix-qris-payment?id=<payment_id>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: paymentId } = req.query;

  if (!paymentId || typeof paymentId !== 'string') {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  if (!XENDIT_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {

    // Step 1: Fetch from Xendit Invoice API v2
    const xenditUrl = `https://api.xendit.co/v2/invoices/${paymentId}`;
    const xenditAuth = Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64');

    const xenditResponse = await fetch(xenditUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${xenditAuth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!xenditResponse.ok) {
      const errorData = await xenditResponse.json();
      console.error('[Fix QRIS] Xendit API error:', errorData);
      return res.status(xenditResponse.status).json({ 
        error: 'Failed to fetch from Xendit',
        details: errorData
      });
    }

    const invoiceData = await xenditResponse.json();

    // Step 2: Extract QR string from available_banks
    if (!invoiceData.available_banks || invoiceData.available_banks.length === 0) {
      console.error('[Fix QRIS] No available_banks in response');
      return res.status(404).json({ 
        error: 'QR code not found',
        message: 'No available_banks in Xendit response'
      });
    }

    const qrisBank = invoiceData.available_banks.find((bank: any) => 
      bank.bank_code === 'QRIS' || bank.bank_code === 'ID_SHOPEEPAY'
    );

    if (!qrisBank) {
      console.error('[Fix QRIS] QRIS bank not found');
      return res.status(404).json({ 
        error: 'QRIS bank not found',
        available_banks: invoiceData.available_banks.map((b: any) => b.bank_code)
      });
    }

    const qrString = qrisBank.bank_branch || qrisBank.qr_string;

    if (!qrString) {
      console.error('[Fix QRIS] QR string not in QRIS bank data');
      return res.status(404).json({ 
        error: 'QR string not found in bank data',
        qris_bank: qrisBank
      });
    }

    // Step 3: Update database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get existing payment - Optimized: Select only required fields
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('id, xendit_id, payment_data, status, expiry_date')
      .eq('xendit_id', paymentId)
      .single();

    if (fetchError || !existingPayment) {
      console.error('[Fix QRIS] Payment not found in database:', fetchError);
      return res.status(404).json({ 
        error: 'Payment not found in database',
        details: fetchError
      });
    }

    // Update with QR string
    const updatedPaymentData = {
      ...(existingPayment.payment_data || {}),
      qr_string: qrString,
      qr_url: qrString,
      invoice_url: invoiceData.invoice_url,
      payment_url: invoiceData.invoice_url
    };

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({ 
        payment_data: updatedPaymentData,
        status: invoiceData.status || existingPayment.status,
        expiry_date: invoiceData.expiry_date || existingPayment.expiry_date
      })
      .eq('xendit_id', paymentId)
      .select('xendit_id, status, payment_data')
      .single();

    if (updateError) {
      console.error('[Fix QRIS] Update error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update database',
        details: updateError
      });
    }

    return res.status(200).json({
      success: true,
      message: 'QR code updated successfully',
      payment: {
        id: updatedPayment.xendit_id,
        status: updatedPayment.status,
        qr_string_length: qrString.length,
        has_qr_string: !!updatedPayment.payment_data?.qr_string,
        payment_url: updatedPayment.payment_data?.payment_url
      }
    });

  } catch (error) {
    console.error('[Fix QRIS] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
