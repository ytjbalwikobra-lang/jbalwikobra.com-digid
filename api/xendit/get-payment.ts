import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set cache headers - short cache for payment status (data can change)
  res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Database configuration error' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          'x-client-info': 'jbalwikobra-xendit-api'
        }
      }
    });

    // Optimize: Select only needed fields to reduce cache egress
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('xendit_id, external_id, payment_method, amount, currency, status, payment_data, created_at, expiry_date, description')
      .eq('xendit_id', id)
      .single();

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('[Get Payment] Database error:', paymentError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (paymentData) {
      console.log('[Get Payment] Found payment data with status:', paymentData.status);
      
      // DEBUG: Log the raw payment data to understand what's stored
      console.log('[Get Payment] Raw payment_data field:', JSON.stringify(paymentData.payment_data, null, 2));
      console.log('[Get Payment] Stored payment_method:', paymentData.payment_method);
      
      // CRITICAL FIX: Check if this is a VA payment that's missing VA details
      const isVAPayment = paymentData.payment_method === 'invoice' || 
                         paymentData.payment_method === 'bri' || 
                         paymentData.payment_method === 'bni' || 
                         paymentData.payment_method === 'mandiri' ||
                         paymentData.payment_method === 'bca';
      
      const hasVADetails = !!(paymentData.payment_data?.account_number || paymentData.payment_data?.virtual_account_number);
      
      console.log('[Get Payment] VA Payment check:', { isVAPayment, hasVADetails });
      
      // If this is a VA payment but missing VA details, try to get them from fixed_virtual_accounts table
      if (isVAPayment && !hasVADetails) {
        console.log('[Get Payment] 🔄 VA payment missing details - checking fixed_virtual_accounts table');
        
        try {
          // Optimize: Select only needed fields
          const { data: fixedVAData, error: vaError } = await supabase
            .from('fixed_virtual_accounts')
            .select('id, external_id, account_number, bank_code, name, status, expiration_date, expected_amount')
            .eq('external_id', paymentData.external_id)
            .single();
          
          if (fixedVAData && !vaError) {
            console.log('[Get Payment] ✅ Found Fixed VA data:', fixedVAData.account_number);
            
            // Return with VA details from fixed_virtual_accounts table
            return res.status(200).json({
              id: paymentData.xendit_id,
              payment_method: paymentData.payment_method || 'unknown',
              amount: paymentData.amount,
              currency: paymentData.currency || 'IDR',
              status: paymentData.status,
              external_id: paymentData.external_id,
              created: paymentData.created_at,
              description: paymentData.description,
              expiry_date: paymentData.expiry_date,
              
              // VA details from fixed_virtual_accounts table
              account_number: fixedVAData.account_number,
              virtual_account_number: fixedVAData.account_number,
              bank_code: fixedVAData.bank_code,
              bank_name: `${fixedVAData.bank_code} VA`,
              account_holder_name: fixedVAData.name,
              transfer_amount: fixedVAData.expected_amount,
              invoice_url: paymentData.payment_data?.invoice_url || paymentData.payment_data?.payment_url,
              
              // Other payment data
              payment_url: paymentData.payment_data?.payment_url,
              qr_string: paymentData.payment_data?.qr_string,
              qr_url: paymentData.payment_data?.qr_url
            });
          } else {
            console.log('[Get Payment] ⚠️ No Fixed VA data found:', vaError?.message);
          }
        } catch (error) {
          console.error('[Get Payment] Error fetching Fixed VA data:', error);
        }
      }
      
      // CRITICAL FIX: If this is a QRIS payment but QR string is missing, try to fetch from Xendit
      const isQRISPayment = paymentData.payment_method === 'qris' || paymentData.payment_method === 'QRIS';
      const hasQRString = !!(paymentData.payment_data?.qr_string);
      
      console.log('[Get Payment] QRIS check:', { isQRISPayment, hasQRString });
      
      if (isQRISPayment && !hasQRString) {
        console.log('[Get Payment] 🔄 QRIS payment missing QR string - attempting to fetch from Xendit API');
        
        try {
          const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
          if (XENDIT_SECRET_KEY) {
            const xenditResponse = await fetch(`https://api.xendit.co/v3/payment_requests/${paymentData.xendit_id}`, {
              headers: {
                'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (xenditResponse.ok) {
              const xenditData = await xenditResponse.json();
              console.log('[Get Payment] 📥 Xendit API response received');
              
              if (xenditData.actions && xenditData.actions.length > 0) {
                const presentAction = xenditData.actions.find((action: any) => action.type === 'PRESENT_TO_CUSTOMER');
                if (presentAction && presentAction.value) {
                  console.log('[Get Payment] ✅ Found QR string in Xendit API!');
                  
                  // Update our database with the QR string
                  const updatedPaymentData = {
                    ...paymentData.payment_data,
                    qr_string: presentAction.value,
                    qr_url: presentAction.value
                  };
                  
                  await supabase
                    .from('payments')
                    .update({ payment_data: updatedPaymentData })
                    .eq('xendit_id', id);
                  
                  // Return with QR string
                  return res.status(200).json({
                    id: paymentData.xendit_id,
                    payment_method: paymentData.payment_method || 'unknown',
                    amount: paymentData.amount,
                    currency: paymentData.currency || 'IDR',
                    status: paymentData.status,
                    external_id: paymentData.external_id,
                    created: paymentData.created_at,
                    description: paymentData.description,
                    expiry_date: paymentData.expiry_date,
                    
                    // QR string from Xendit API
                    qr_string: presentAction.value,
                    qr_url: presentAction.value,
                    
                    // Other payment data
                    virtual_account_number: paymentData.payment_data?.virtual_account_number || paymentData.payment_data?.account_number,
                    account_number: paymentData.payment_data?.account_number,
                    bank_code: paymentData.payment_data?.bank_code,
                    bank_name: paymentData.payment_data?.bank_name,
                    invoice_url: paymentData.payment_data?.invoice_url,
                    account_holder_name: paymentData.payment_data?.account_holder_name,
                    transfer_amount: paymentData.payment_data?.transfer_amount,
                    payment_url: paymentData.payment_data?.payment_url,
                    action_type: paymentData.payment_data?.action_type,
                    payment_code: paymentData.payment_data?.payment_code,
                    retail_outlet: paymentData.payment_data?.retail_outlet
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('[Get Payment] Error fetching QR string from Xendit:', error);
        }
      }
      
      // Return the stored payment data (original behavior)
      return res.status(200).json({
        id: paymentData.xendit_id,
        payment_method: paymentData.payment_method || 'unknown',
        amount: paymentData.amount,
        currency: paymentData.currency || 'IDR',
        status: paymentData.status,
        external_id: paymentData.external_id,
        created: paymentData.created_at,
        description: paymentData.description,
        expiry_date: paymentData.expiry_date,
        
        // Payment method specific data (stored as JSON)
        qr_string: paymentData.payment_data?.qr_string,
        qr_url: paymentData.payment_data?.qr_url,
        
        // Virtual Account data - support both field name formats
        virtual_account_number: paymentData.payment_data?.virtual_account_number || paymentData.payment_data?.account_number,
        account_number: paymentData.payment_data?.account_number,
        bank_code: paymentData.payment_data?.bank_code,
        bank_name: paymentData.payment_data?.bank_name,
        invoice_url: paymentData.payment_data?.invoice_url,
        account_holder_name: paymentData.payment_data?.account_holder_name,
        transfer_amount: paymentData.payment_data?.transfer_amount,
        
        // Other payment data
        payment_url: paymentData.payment_data?.payment_url,
        action_type: paymentData.payment_data?.action_type,
        payment_code: paymentData.payment_data?.payment_code,
        retail_outlet: paymentData.payment_data?.retail_outlet
      });
    }

    // If not in payments table, check orders table by xendit_invoice_id
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, xendit_invoice_id, status, payment_channel, payment_method, amount, customer_name, customer_email, created_at')
      .eq('xendit_invoice_id', id)
      .single();

    if (orderData && !orderError) {
      console.log('[Get Payment] Found order data with status:', orderData.status);
      
      // Convert order data to payment format for consistency
      const convertedStatus = orderData.status?.toUpperCase(); // Convert to uppercase for consistency
      console.log('[Get Payment] Converted status to:', convertedStatus);
      
      return res.status(200).json({
        id: orderData.xendit_invoice_id || id,
        payment_method: orderData.payment_channel || orderData.payment_method || 'unknown',
        amount: orderData.amount,
        currency: orderData.currency || 'IDR',
        status: convertedStatus,
        external_id: orderData.client_external_id || orderData.id,
        created: orderData.created_at,
        description: `Order ${orderData.id}`,
        expiry_date: orderData.expires_at,
        
        // Additional order data
        order_id: orderData.id,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        paid_at: orderData.paid_at
      });
    }

    // If not found in database, try to fetch from Xendit directly
    const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
    if (!XENDIT_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment service configuration error' });
    }

    // Try Payment Request API first
    try {
      const response = await fetch(`https://api.xendit.co/payment_requests/${id}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Format the response similar to our stored format
        const formattedData: any = {
          id: data.id,
          payment_method: data.payment_method?.type || 'unknown',
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          external_id: data.reference_id,
          created: data.created,
          description: data.description,
          expiry_date: data.expires_at
        };

        // Add method-specific data
        if (data.payment_method?.qr) {
          formattedData.qr_string = data.payment_method.qr.qr_string;
        }
        if (data.payment_method?.virtual_account) {
          formattedData.account_number = data.payment_method.virtual_account.channel_properties?.account_number;
          formattedData.bank_code = data.payment_method.virtual_account.channel_code;
        }
        if (data.actions?.length > 0) {
          const authAction = data.actions.find(action => action.action === 'AUTH');
          if (authAction) {
            formattedData.payment_url = authAction.url;
            formattedData.action_type = authAction.action;
          }
        }

        return res.status(200).json(formattedData);
      }
    } catch (err) {
      console.error('[Get Payment] Xendit API error:', err);
    }

    // Try legacy invoice API as fallback
    try {
      const response = await fetch(`https://api.xendit.co/v2/invoices/${id}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        return res.status(200).json({
          id: data.id,
          payment_method: 'invoice',
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          external_id: data.external_id,
          created: data.created,
          description: data.description,
          expiry_date: data.expiry_date,
          payment_url: data.invoice_url
        });
      }
    } catch (err) {
      console.error('[Get Payment] Invoice API error:', err);
    }

    return res.status(404).json({ error: 'Payment not found' });

  } catch (error) {
    console.error('[Get Payment] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
