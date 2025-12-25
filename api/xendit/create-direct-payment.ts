import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getActivatedPaymentChannels, getXenditChannelCode } from '../_config/paymentChannels.js';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_BASE_URL = 'https://api.xendit.co';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use shared server config (no imports from src/)

// Simple order creation function for direct payments
const SITE_URL = process.env.SITE_URL || process.env.REACT_APP_SITE_URL || 'https://www.jbalwikobra.com';

async function createOrderRecord(order: any, externalId: string, paymentMethodId: string) {
  if (!order || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[Direct Payment] Skipping order creation - missing order data or Supabase config');

    return null;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // DUPLICATE PREVENTION: Check for recent duplicate orders (within 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('id, client_external_id, created_at')
      .eq('customer_email', order.customer_email)
      .eq('amount', order.amount)
      .gte('created_at', twoMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (checkError) {
      console.warn('[Direct Payment] Error checking for duplicates:', checkError);
      // Continue with order creation if duplicate check fails
    } else if (existingOrders && existingOrders.length > 0) {
      const existingOrder = existingOrders[0];
      console.log('[Direct Payment] 🚫 Duplicate order detected - returning existing order');
      console.log(`   Existing: ${existingOrder.id} (${existingOrder.created_at})`);
      console.log(`   Customer: ${order.customer_email}, Amount: ${order.amount}`);
      return existingOrder;
    }

    const orderPayload = {
      client_external_id: externalId,
      product_id: order.product_id || null,
      customer_name: order.customer_name || 'Customer',
      customer_email: order.customer_email || 'customer@jbalwikobra.com',
      customer_phone: order.customer_phone || '6200000000000',
      order_type: order.order_type || 'purchase',
      amount: order.amount,
      payment_method: 'xendit',
      rental_duration: order.rental_duration || null,
      user_id: order.user_id || null,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id, customer_name, customer_email, customer_phone, amount, status, order_type, rental_duration, product_id, created_at, client_external_id')
      .single();

    if (error) {
      console.error('[Direct Payment] Order creation error:', error);
      console.error('[Direct Payment] Failed order payload:', JSON.stringify(orderPayload, null, 2));
      return null;
    }

    console.log('[Direct Payment] Order created successfully:', data?.id);
    return data;
  } catch (error) {
    console.error('[Direct Payment] Order creation failed:', error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!XENDIT_SECRET_KEY) {
    console.error('[Xendit V3 Payment] Missing XENDIT_SECRET_KEY');
    return res.status(500).json({ error: 'Payment service configuration error' });
  }

  try {
    console.log('[Xendit V3 Payment] Starting payment request processing');
    
    const {
      amount,
      currency = 'IDR',
      payment_method_id,
      customer,
      description,
      external_id,
      success_redirect_url,
      failure_redirect_url,
      order
    } = req.body;

    // Validate required fields
    if (!amount || !payment_method_id || !external_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, payment_method_id, external_id' 
      });
    }

    // Get activated payment channels
  const activatedChannels = getActivatedPaymentChannels();
    const paymentChannel = activatedChannels.find(channel => channel.id === payment_method_id);
    
    if (!paymentChannel || !paymentChannel.available) {
      const availableMethods = activatedChannels
        .filter(channel => channel.available)
        .map(channel => channel.id);
      
      console.error(`[Xendit V3 Payment] Payment method '${payment_method_id}' is not activated`);
      return res.status(400).json({ 
        error: `Payment method '${payment_method_id}' is not available. Please select from activated payment methods.`,
        available_methods: availableMethods
      });
    }

    // Check amount limits
  if (amount < (paymentChannel as any).min_amount || amount > (paymentChannel as any).max_amount) {
      return res.status(400).json({
    error: `Amount ${amount} is outside valid range for ${paymentChannel.name}. Min: ${(paymentChannel as any).min_amount}, Max: ${(paymentChannel as any).max_amount}`
      });
    }

    // Create Xendit Payment Request payload - Use different APIs for different channel types
    const xenditChannelCode = getXenditChannelCode(payment_method_id);
    
    // Set expiry to 24 hours from now
    const requestExpiryDate = new Date();
    requestExpiryDate.setHours(requestExpiryDate.getHours() + 24);
    const expiryIsoString = requestExpiryDate.toISOString();
    
    let apiEndpoint: string;
    let requestPayload: any;
    let apiVersion = '2024-11-11';
    let vaData: any = null; // For storing Fixed VA data

    // Use different API endpoints based on payment method type
    if (paymentChannel.type === 'VIRTUAL_ACCOUNT') {
      // NEW APPROACH: Use Fixed VA + Invoice binding for immediate VA numbers
      console.log('[Xendit Fixed VA] Using Fixed VA + Invoice binding approach');
      console.log('[Xendit Fixed VA] Bank Code:', xenditChannelCode);
      console.log('[Xendit Fixed VA] Payment Method ID:', payment_method_id);
      
      // Step 1: Create Fixed Virtual Account
      const vaExternalId = `va-${external_id}-${Date.now()}`;
      
      const fixedVAPayload: any = {
        external_id: vaExternalId,
        bank_code: xenditChannelCode,
        name: order?.customer_name || customer?.given_names || 'Customer Payment',
        expected_amount: amount,
        is_closed: true, // Only accept exact amount
        expiration_date: expiryIsoString
      };
      
      // CRITICAL FIX: Some banks don't support description field in Fixed VA creation
      const banksWithoutDescriptionSupport = [
        'PERMATA_VIRTUAL_ACCOUNT', 
        'PERMATA',
        'BSI_VIRTUAL_ACCOUNT',
        'BSI',
        'CIMB_VIRTUAL_ACCOUNT',
        'CIMB',
        'BNI_VIRTUAL_ACCOUNT',
        'BNI',
        'MANDIRI_VIRTUAL_ACCOUNT',
        'MANDIRI',
        'BJB_VIRTUAL_ACCOUNT',
        'BJB'
      ];
      
      if (!banksWithoutDescriptionSupport.includes(xenditChannelCode)) {
        fixedVAPayload.description = description || `Payment for ${order?.product_name || 'product'}`;
      } else {
        console.log(`[Xendit Fixed VA] Skipping description for ${xenditChannelCode} (not supported)`);
      }
      
      console.log('[Xendit Fixed VA] Payload for', xenditChannelCode, ':', JSON.stringify(fixedVAPayload, null, 2));

      // Create the Fixed VA first
      const vaResponse = await fetch(`${XENDIT_BASE_URL}/callback_virtual_accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
          'Xendit-API-Version': '2017-10-31'
        },
        body: JSON.stringify(fixedVAPayload)
      });

      if (!vaResponse.ok) {
        const vaError = await vaResponse.text();
        console.error('[Xendit Fixed VA] Failed to create Fixed VA:', vaResponse.status, vaError);
        return res.status(vaResponse.status).json({
          error: 'Failed to create Virtual Account',
          details: vaError
        });
      }

      vaData = await vaResponse.json(); // Store VA data for later use
      console.log('[Xendit Fixed VA] ✅ Fixed VA created:', vaData.id, vaData.account_number);

      // Step 2: Create Invoice with Fixed VA binding
      apiEndpoint = `${XENDIT_BASE_URL}/v2/invoices`;
      apiVersion = '2018-05-15';
      
      requestPayload = {
        external_id: external_id,
        amount: amount,
        description: description || `Payment for ${order?.product_name || 'product'}`,
        invoice_duration: 86400, // 24 hours
        customer: {
          given_names: order?.customer_name || customer?.given_names || 'Customer',
          mobile_number: customer?.mobile_number || '+62000000000',
          email: customer?.email || 'customer@example.com'
        },
        payment_methods: [xenditChannelCode],
        currency: currency,
        should_send_email: false,
        success_redirect_url: success_redirect_url || `${SITE_URL}/payment-success?external_id=${external_id}`,
        failure_redirect_url: failure_redirect_url || `${SITE_URL}/payment-failed?external_id=${external_id}`,
        // BIND THE FIXED VA TO THE INVOICE
        callback_virtual_account_id: vaData.id
      };

      console.log('[Xendit Fixed VA] Creating Invoice with VA binding:', vaData.id);
      
    } else if (paymentChannel.type === 'QRIS' || paymentChannel.type === 'EWALLET') {
      // QRIS and E-Wallets use the V3 Payment Requests API (BACK TO V3 - WAS WORKING BEFORE)
      apiEndpoint = `${XENDIT_BASE_URL}/v3/payment_requests`;
      
      // RESTORE THE ORIGINAL V3 FORMAT THAT WAS WORKING
      requestPayload = {
        reference_id: external_id,
        type: "PAY",
        country: "ID",
        currency: currency,
        request_amount: amount,
        capture_method: "AUTOMATIC",
        channel_code: xenditChannelCode,
        channel_properties: {
          success_return_url: success_redirect_url || `${SITE_URL}/payment-status?status=success`,
          failure_return_url: failure_redirect_url || `${SITE_URL}/payment-status?status=failed`
        },
        webhook: {
          url: `${SITE_URL}/api/xendit/webhook`
        },
        description: `Payment for ${order?.product_name || 'product'}`,
        expires_at: expiryIsoString,
        metadata: {
          client_external_id: external_id,
          product_id: order?.product_id || null,
          user_id: order?.user_id || null,
          order_type: order?.order_type || 'purchase',
          customer_name: order?.customer_name || customer?.given_names || null,
          customer_email: order?.customer_email || customer?.email || null,
          customer_phone: order?.customer_phone || customer?.mobile_number || null,
          rental_duration: order?.rental_duration || null,
          amount: amount.toString(),
          requested_expiry: expiryIsoString
        }
      };
      
      console.log('[Xendit V3 Payment] Using V3 Payment Requests API for QRIS/E-Wallet (RESTORED)');
      
    } else if (paymentChannel.type === 'OVER_THE_COUNTER') {
      // Over-the-counter payments use V2 API
      apiEndpoint = `${XENDIT_BASE_URL}/v2/payment_requests`;
      apiVersion = '2022-07-31';
      
      requestPayload = {
        reference_id: external_id,
        amount: amount,
        currency: currency,
        channel_code: xenditChannelCode,
        channel_properties: {
          customer_name: order?.customer_name || customer?.given_names || 'Customer',
          success_return_url: success_redirect_url || `${SITE_URL}/payment-status?status=success`,
          failure_return_url: failure_redirect_url || `${SITE_URL}/payment-status?status=failed`
        },
        webhook: {
          url: `${SITE_URL}/api/xendit/webhook`
        },
        description: description || `Payment for ${order?.product_name || 'product'}`,
        expires_at: expiryIsoString,
        metadata: {
          client_external_id: external_id,
          product_id: order?.product_id || null,
          user_id: order?.user_id || null,
          order_type: order?.order_type || 'purchase',
          customer_name: order?.customer_name || customer?.given_names || null,
          customer_email: order?.customer_email || customer?.email || null,
          customer_phone: order?.customer_phone || customer?.mobile_number || null,
          rental_duration: order?.rental_duration || null,
          amount: amount.toString(),
          requested_expiry: expiryIsoString
        }
      };
      
      console.log('[Xendit OTC Payment] Using V2 Payment Requests API for Over-the-Counter');
      
    } else {
      // Fallback to V3 API for other payment types
      apiEndpoint = `${XENDIT_BASE_URL}/v3/payment_requests`;
      
      requestPayload = {
        reference_id: external_id,
        type: "PAY",
        country: "ID",
        currency: currency,
        request_amount: amount,
        capture_method: "AUTOMATIC",
        channel_code: xenditChannelCode,
        channel_properties: {
          success_return_url: success_redirect_url || `${SITE_URL}/payment-status?status=success`,
          failure_return_url: failure_redirect_url || `${SITE_URL}/payment-status?status=failed`
        },
        webhook: {
          url: `${SITE_URL}/api/xendit/webhook`
        },
        description: description || `Payment for ${order?.product_name || 'product'}`,
        expiry_date: expiryIsoString,
        metadata: {
          client_external_id: external_id,
          product_id: order?.product_id || null,
          user_id: order?.user_id || null,
          order_type: order?.order_type || 'purchase',
          customer_name: order?.customer_name || customer?.given_names || null,
          customer_email: order?.customer_email || customer?.email || null,
          customer_phone: order?.customer_phone || customer?.mobile_number || null,
          rental_duration: order?.rental_duration || null,
          amount: amount.toString(),
          requested_expiry: expiryIsoString
        }
      };
      
      console.log('[Xendit Payment] Using V3 Payment Requests API (fallback)');
    }

    // Create order record if order data provided
    const createdOrder = await createOrderRecord(order, external_id, payment_method_id);

    // CRITICAL FIX: Create admin notification for new order
    if (createdOrder && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Get product name for notification - ENHANCED LOGIC
        let productName = order?.product_name; // This usually doesn't exist in order object
        
        console.log('[New Order] Initial product name from order:', productName);
        console.log('[New Order] Order product_id:', order?.product_id);
        
        // Always try to fetch product name directly from products table since order.product_name usually doesn't exist
        if (order?.product_id) {
          try {
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('name')
              .eq('id', order.product_id)
              .single();
              
            if (productError) {
              console.error('[New Order] Product fetch error:', productError);
            } else if (productData?.name) {
              productName = productData.name;
              console.log('[New Order] Product name fetched successfully:', productName);
            } else {
              console.warn('[New Order] Product data exists but no name field:', productData);
            }
          } catch (fetchError) {
            console.error('[New Order] Exception fetching product:', fetchError);
          }
        } else {
          console.warn('[New Order] No product_id available for fetching product name');
        }
        
        // Final fallback with better description
        if (!productName) {
          // Try to infer from order type
          const isRental = order?.order_type === 'rental';
          productName = isRental ? 'Akun Game Rental' : 'Akun Game Premium';
          console.log('[New Order] Using fallback product name based on order type:', productName);
        }
        console.log('[New Order] Final product name for notification:', productName);
        
        // Create admin database notification for new order (floating notification only)
        await createNewOrderAdminNotification(
          supabase,
          createdOrder.id,
          order?.customer_name || 'Customer',
          productName,
          Number(order?.amount || 0),
          order?.customer_phone,
          order?.order_type || 'purchase'
        );
        
        // NOTE: No WhatsApp group notification for new orders - only for paid orders
        
        console.log('[New Order] Admin notifications sent successfully');
      } catch (notificationError) {
        console.error('[New Order] Failed to send admin notifications:', notificationError);
        // Don't fail the payment creation if notifications fail
      }
    }

    console.log('[Xendit Payment] Making request to:', apiEndpoint);
    console.log('[Xendit Payment] Channel type:', paymentChannel.type);
    console.log('[Xendit Payment] Channel code:', xenditChannelCode);
    console.log('[Xendit Payment] Payload:', JSON.stringify(requestPayload, null, 2));

    // Prepare headers with required API version and idempotency
    const headers: Record<string, string> = {
      'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'api-version': apiVersion,
    };
    if (external_id) headers['x-idempotency-key'] = String(external_id);

    // Log headers safely (exclude Authorization)
    const { Authorization: _hidden, ...safeHeaders } = headers as any;
    console.log('[Xendit Payment] Headers being sent:', JSON.stringify(safeHeaders, null, 2));
    console.log('[Xendit Payment] Full URL:', apiEndpoint);

    // Make request to Xendit API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload)
    });

    const responseData = await response.json();
    console.log('[Xendit Payment] Response status:', response.status);
    console.log('[Xendit Payment] API endpoint used:', apiEndpoint);
    console.log('[Xendit Payment] Payment channel type:', paymentChannel.type);
    
    // CRITICAL DEBUG: Log the full Xendit response for QRIS payments
    if (paymentChannel.type === 'QRIS') {
      console.log('[Xendit QRIS Payment] 🔍 FULL XENDIT RESPONSE:', JSON.stringify(responseData, null, 2));
      console.log('[Xendit QRIS Payment] 🔍 Actions present:', !!responseData.actions);
      console.log('[Xendit QRIS Payment] 🔍 Actions count:', responseData.actions ? responseData.actions.length : 0);
      if (responseData.actions) {
        responseData.actions.forEach((action: any, index: number) => {
          console.log(`[Xendit QRIS Payment] 🔍 Action ${index}:`, {
            type: action.type,
            has_value: !!action.value,
            value_preview: action.value ? action.value.substring(0, 50) + '...' : 'NO VALUE'
          });
        });
      }
    }

    if (!response.ok) {
      console.error('[Xendit Payment] API Error:', responseData);
      
      // Handle specific Xendit error cases
      let userFriendlyMessage = responseData.message || 'Payment creation failed';
      let suggestions = [];
      
      if (responseData.error_code === 'NOT_FOUND' || responseData.message?.includes('not found')) {
        userFriendlyMessage = `Payment method ${paymentChannel.name} is currently not available`;
        suggestions.push('Please try a different payment method');
        
        // Suggest alternative payment methods
        const availableChannels = getActivatedPaymentChannels()
          .filter(c => c.id !== payment_method_id)
          .slice(0, 3)
          .map(c => c.name);
        
        if (availableChannels.length > 0) {
          suggestions.push(`Available alternatives: ${availableChannels.join(', ')}`);
        }
      }
      
      return res.status(400).json({ 
        error: userFriendlyMessage,
        suggestions: suggestions,
        details: responseData,
        available_methods: getActivatedPaymentChannels().map(c => ({
          id: c.id,
          name: c.name,
          type: c.type
        })),
        debug_info: {
          endpoint: apiEndpoint,
          payment_method: payment_method_id,
          channel_code: xenditChannelCode,
          channel_type: paymentChannel.type,
          api_version: apiVersion,
          original_error: responseData.error_code || responseData.message
        }
      });
    }

    // Format API response - handle Virtual Account API format
    let formattedResponse: any;
    
    if (paymentChannel.type === 'VIRTUAL_ACCOUNT') {
      // For Fixed VA + Invoice binding, responseData is Invoice response, not VA response
      // We need to use the vaData we stored from Fixed VA creation
      formattedResponse = {
        id: responseData.id,
        external_id: responseData.external_id || external_id,
        amount: responseData.amount || amount,
        currency: currency,
        status: responseData.status,
        payment_method: payment_method_id,
        // FIXED: Use vaData instead of responseData for VA details
        virtual_account_number: vaData?.account_number || responseData.account_number,
        account_number: vaData?.account_number || responseData.account_number, // Ensure account_number is always set
        bank_name: paymentChannel.name,
        bank_code: vaData?.bank_code || responseData.bank_code || xenditChannelCode,
        account_holder_name: vaData?.name || responseData.name,
        transfer_amount: vaData?.expected_amount || responseData.expected_amount || amount,
        expiry_date: responseData.expiry_date || responseData.expiration_date,
        actions: [],
        // Additional fields for Fixed VA
        fixed_va_id: vaData?.id,
        invoice_url: responseData.invoice_url
      };
      
      console.log('[Xendit VA Payment] ✅ Response formatted with VA data:', {
        invoice_id: responseData.id,
        va_number: formattedResponse.virtual_account_number,
        bank_code: formattedResponse.bank_code,
        vaData_available: !!vaData,
        our_payment_method: formattedResponse.payment_method,
        xendit_response_payment_method: responseData.payment_method
      });
    } else {
      // Payment Request API format for other payment types
      formattedResponse = {
        id: responseData.payment_request_id || responseData.id,
        external_id: responseData.reference_id || responseData.external_id,
        amount: responseData.request_amount || responseData.amount,
        currency: responseData.currency,
        status: responseData.status,
        payment_method: payment_method_id,
        payment_request_id: responseData.payment_request_id || responseData.id,
        actions: responseData.actions || []
      };
    }

    // Handle expiry date - different API versions use different field names
    let expiryDate = null;
    
    if (paymentChannel.type === 'VIRTUAL_ACCOUNT') {
      // Invoice API uses expiry_date field
      expiryDate = responseData.expiry_date;
      console.log('[Xendit VA Payment] Invoice API expiry date:', expiryDate);
    } else {
      // Payment Request API - try various field names
      const possibleExpiryFields = [
        'expiry_date', 'expires_at', 'expired_at', 'expires', 'expiration_date',
        'capture_expiry_date', 'payment_expiry_date', 'expiry', 'expire_at',
        'expire_date', 'valid_until', 'due_date', 'timeout', 'ttl'
      ];
      
      for (const field of possibleExpiryFields) {
        if (responseData[field]) {
          expiryDate = responseData[field];

          break;
        }
      }
      
      // Check nested objects for expiry fields (V3 API)
      if (!expiryDate && responseData.actions) {
        responseData.actions.forEach((action: any, index: number) => {
          for (const field of possibleExpiryFields) {
            if (action[field]) {
              expiryDate = action[field];

              break;
            }
          }
        });
      }
    }
    
    // Check metadata for backup expiry
    if (!expiryDate && responseData.metadata?.requested_expiry) {
      expiryDate = responseData.metadata.requested_expiry;

    }
    
    if (!expiryDate) {
      // Default to 24 hours from now if Xendit doesn't provide expiry
      const defaultExpiry = new Date();
      defaultExpiry.setHours(defaultExpiry.getHours() + 24);
      expiryDate = defaultExpiry.toISOString();
      console.log('[Xendit Payment] ⚠️ No expiry from API, using default 24h expiry:', expiryDate);
      console.log('[Xendit Payment] 📋 Available response fields for debugging:', Object.keys(responseData));
    }
    
    formattedResponse.expiry_date = expiryDate;

    // Handle Virtual Account specific processing
    if (paymentChannel.type === 'VIRTUAL_ACCOUNT') {
      // NEW: Use Fixed VA data that we created and bound to the invoice
      formattedResponse.invoice_url = responseData.invoice_url;
      formattedResponse.expiry_date = responseData.expiry_date || expiryDate;
      formattedResponse.bank_name = paymentChannel.name;
      formattedResponse.bank_code = xenditChannelCode;
      
      // VA data is already set in the initial formattedResponse above
      // Add the account_number field for backwards compatibility
      if (formattedResponse.virtual_account_number) {
        formattedResponse.account_number = formattedResponse.virtual_account_number;
        
        console.log('[Xendit Fixed VA] ✅ VA data properly formatted:', {
          invoice_id: responseData.id,
          va_number: formattedResponse.virtual_account_number, 
          bank_code: formattedResponse.bank_code,
          account_holder: formattedResponse.account_holder_name,
          amount: formattedResponse.transfer_amount
        });
      } else {
        console.error('[Xendit Fixed VA] ❌ CRITICAL: VA number missing in formatted response!');
        console.error('[Xendit Fixed VA] 📋 vaData available:', !!vaData);
        console.error('[Xendit Fixed VA] 📋 vaData.account_number:', vaData?.account_number);
        console.error('[Xendit Fixed VA] 📋 responseData keys:', Object.keys(responseData));
      }
      
      // Try to extract Virtual Account details from available banks
      if (responseData.available_banks && responseData.available_banks.length > 0) {
        const targetBank = responseData.available_banks.find((bank: any) => 
          bank.bank_code === xenditChannelCode || bank.bank_code === xenditChannelCode.toUpperCase()
        ) || responseData.available_banks[0];
        
        if (targetBank) {
          formattedResponse.virtual_account_number = targetBank.virtual_account_number || targetBank.account_number;
          formattedResponse.bank_code = targetBank.bank_code;
          formattedResponse.bank_name = targetBank.bank_name || paymentChannel.name;
          formattedResponse.account_holder_name = targetBank.account_holder_name;
          formattedResponse.transfer_amount = targetBank.transfer_amount || amount;
          
          console.log('[Xendit Invoice Payment] ✅ Bank details found:', targetBank.bank_code, targetBank.virtual_account_number || targetBank.account_number);
        }
      }
      
      // Try alternative VA bank extraction if available
      if (!formattedResponse.virtual_account_number && responseData.available_virtual_account_banks && responseData.available_virtual_account_banks.length > 0) {
        const targetBank = responseData.available_virtual_account_banks.find((bank: any) => 
          bank.bank_code === xenditChannelCode || bank.bank_code === xenditChannelCode.toUpperCase()
        ) || responseData.available_virtual_account_banks[0];
        
        if (targetBank && targetBank.virtual_account_number) {
          formattedResponse.virtual_account_number = targetBank.virtual_account_number;
          formattedResponse.bank_code = targetBank.bank_code;
          formattedResponse.bank_name = targetBank.bank_name || paymentChannel.name;
          
          console.log('[Xendit Invoice Payment] ✅ VA Bank details extracted:', targetBank.bank_code, targetBank.virtual_account_number);
        }
      }
      
      // Always include invoice URL as fallback payment method
      formattedResponse.payment_url = responseData.invoice_url;
      

      
    } else if (responseData.actions && responseData.actions.length > 0) {
      // V3 API action-based response format (QRIS, E-Wallets)
      const primaryAction = responseData.actions[0];
      
      console.log('[Xendit V3 Payment] 🔍 CRITICAL DEBUG - QRIS Action Details:', {
        action_type: primaryAction.type,
        action_value: primaryAction.value ? `Present (${primaryAction.value.length} chars)` : 'MISSING',
        action_value_preview: primaryAction.value ? primaryAction.value.substring(0, 50) + '...' : 'NO VALUE',
        all_actions: responseData.actions.map(a => ({ type: a.type, has_value: !!a.value }))
      });
      
      if (primaryAction.type === 'REDIRECT_CUSTOMER') {
        formattedResponse.payment_url = primaryAction.value;
        formattedResponse.action_type = 'REDIRECT_CUSTOMER';
        formattedResponse.redirect_url = primaryAction.value;
      } else if (primaryAction.type === 'PRESENT_TO_CUSTOMER') {
        formattedResponse.payment_url = primaryAction.value;
        formattedResponse.action_type = 'PRESENT_TO_CUSTOMER';
        formattedResponse.qr_string = primaryAction.value; // PaymentInterface expects qr_string
        formattedResponse.qr_code = primaryAction.value;   // Keep for backward compatibility
        
        console.log('[Xendit V3 Payment] ✅ QR String set successfully:', {
          qr_string_length: formattedResponse.qr_string ? formattedResponse.qr_string.length : 0,
          qr_string_preview: formattedResponse.qr_string ? formattedResponse.qr_string.substring(0, 50) + '...' : 'NOT SET'
        });
      }

      
    } else if (responseData.payment_url) {
      // Direct payment URL (fallback)
      formattedResponse.payment_url = responseData.payment_url;

    }

    // Store Fixed VA data in database if created
    if (vaData && paymentChannel.type === 'VIRTUAL_ACCOUNT') {
      await storeFixedVAData(vaData, external_id);
    }

    // Store payment data in database for later retrieval
    console.log('[Xendit Payment] 🏦 About to store payment data:', {
      payment_method_from_formatted: formattedResponse.payment_method,
      payment_method_id_param: payment_method_id,
      has_va_data: !!(formattedResponse.virtual_account_number || formattedResponse.account_number)
    });
    await storePaymentData(formattedResponse, payment_method_id, order);

    // Send payment link WhatsApp notification
    await sendPaymentLinkNotification(formattedResponse, order);

    console.log('[Xendit Payment] Success:', {
      payment_method_id,
      channel_type: paymentChannel.type,
      external_id,
      amount,
      status: formattedResponse.status,
      payment_request_id: formattedResponse.payment_request_id,
      api_endpoint: apiEndpoint,
      api_version: apiVersion
    });

    // DEBUG: Log the complete formatted response for Virtual Account payments
    if (paymentChannel.type === 'VIRTUAL_ACCOUNT') {
      console.log('[Xendit Payment] 🔍 COMPLETE VA RESPONSE:', JSON.stringify(formattedResponse, null, 2));
      console.log('[Xendit Payment] 🏦 VA Number Check:', formattedResponse.virtual_account_number || formattedResponse.account_number || 'NOT SET');
      
      // Add debug info to response
      formattedResponse._debug = {
        va_fields_before_storage: {
          account_number: formattedResponse.account_number,
          virtual_account_number: formattedResponse.virtual_account_number,
          bank_code: formattedResponse.bank_code,
          bank_name: formattedResponse.bank_name
        }
      };
    }

    // TEMPORARY: Add a marker to verify deployment
    formattedResponse._deployment_test = "CODE_CHANGES_DEPLOYED";
    
    return res.status(200).json(formattedResponse);

  } catch (error) {
    console.error('[Xendit Payment] Error:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('[Xendit Payment] Error name:', error.name);
      console.error('[Xendit Payment] Error message:', error.message);
      console.error('[Xendit Payment] Error stack:', error.stack);
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: 'processing_error'
    });
  }
}

// Store Fixed VA data in database
async function storeFixedVAData(vaData: any, externalId: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[Store Fixed VA] Skipping VA storage - missing Supabase config');
    return;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from('fixed_virtual_accounts')
      .upsert({
        xendit_va_id: vaData.id,
        external_id: vaData.external_id,
        bank_code: vaData.bank_code,
        account_number: vaData.account_number,
        name: vaData.name,
        expected_amount: vaData.expected_amount,
        status: vaData.status,
        expiration_date: vaData.expiration_date,
        is_closed: vaData.is_closed,
        merchant_code: vaData.merchant_code,
        currency: vaData.currency || 'IDR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'external_id' });

    if (error) {
      console.error('[Store Fixed VA] Database error:', error);
    } else {
      console.log('[Store Fixed VA] ✅ Fixed VA stored successfully:', vaData.id);
    }
  } catch (error) {
    console.error('[Store Fixed VA] Error:', error);
  }
}

// Store payment data for later retrieval (Multi-API compatible)
async function storePaymentData(paymentData: any, paymentMethodId: string, order: any) {
  console.log('[Store Payment V3] 🔍 CRITICAL DEBUG - Input parameters:', {
    paymentData_payment_method: paymentData.payment_method,
    paymentMethodId_param: paymentMethodId,
    paymentData_has_va: !!(paymentData.virtual_account_number || paymentData.account_number),
    paymentData_account_number: paymentData.account_number,
    paymentData_bank_code: paymentData.bank_code,
    paymentData_keys: Object.keys(paymentData)
  });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[Store Payment] Skipping payment storage - missing Supabase config');
    return;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Store payment data as JSON - compatible with both V2 and V3 APIs
    const paymentSpecificData: any = {};
    
    // Universal fields (both V2 and V3)
    if (paymentData.payment_request_id) paymentSpecificData.payment_request_id = paymentData.payment_request_id;
    if (paymentData.payment_url) paymentSpecificData.payment_url = paymentData.payment_url;
    
    // V3 API specific fields
    if (paymentData.actions) paymentSpecificData.actions = paymentData.actions;
    if (paymentData.action_type) paymentSpecificData.action_type = paymentData.action_type;
    if (paymentData.redirect_url) paymentSpecificData.redirect_url = paymentData.redirect_url;
    if (paymentData.qr_code) paymentSpecificData.qr_code = paymentData.qr_code;
    if (paymentData.qr_string) {
      paymentSpecificData.qr_string = paymentData.qr_string;
      console.log('[Store Payment V3] ✅ QRIS QR String being stored:', {
        qr_string_length: paymentData.qr_string.length,
        qr_string_preview: paymentData.qr_string.substring(0, 50) + '...'
      });
    } else {
      console.log('[Store Payment V3] ❌ QRIS QR String MISSING from paymentData!');
    }
    
    // CRITICAL: Force VA field extraction for Virtual Account payments
    if (paymentData.account_number !== undefined) {
      paymentSpecificData.account_number = paymentData.account_number;
      console.log('[Store Payment V3] ✅ Extracted account_number:', paymentData.account_number);
    }
    if (paymentData.virtual_account_number !== undefined) {
      paymentSpecificData.virtual_account_number = paymentData.virtual_account_number;
      console.log('[Store Payment V3] ✅ Extracted virtual_account_number:', paymentData.virtual_account_number);
    }
    if (paymentData.bank_code !== undefined) {
      paymentSpecificData.bank_code = paymentData.bank_code;
      console.log('[Store Payment V3] ✅ Extracted bank_code:', paymentData.bank_code);
    }
    if (paymentData.bank_name !== undefined) paymentSpecificData.bank_name = paymentData.bank_name;
    if (paymentData.invoice_url !== undefined) paymentSpecificData.invoice_url = paymentData.invoice_url;
    if (paymentData.account_holder_name !== undefined) paymentSpecificData.account_holder_name = paymentData.account_holder_name;
    if (paymentData.transfer_amount !== undefined) paymentSpecificData.transfer_amount = paymentData.transfer_amount;

    // Ensure we always have an expiry date with comprehensive field checking
    let expiryDate = null;
    
    console.log('[Store Payment V3] Storing payment data with fields:', Object.keys(paymentData));
    
    // Try various field names that Xendit might use in the payment data
    const possibleExpiryFields = [
      'expiry_date', 'expires_at', 'expired_at', 'expires', 'expiration_date',
      'capture_expiry_date', 'payment_expiry_date', 'expiry', 'expire_at',
      'expire_date', 'valid_until', 'due_date', 'timeout', 'ttl'
    ];
    
    for (const field of possibleExpiryFields) {
      if (paymentData[field]) {
        expiryDate = paymentData[field];

        break;
      }
    }
    
    // Check nested actions for expiry fields
    if (!expiryDate && paymentData.actions) {

      paymentData.actions.forEach((action: any, index: number) => {
        for (const field of possibleExpiryFields) {
          if (action[field]) {
            expiryDate = action[field];

            break;
          }
        }
      });
    }
    
    if (!expiryDate) {
      const defaultExpiry = new Date();
      defaultExpiry.setHours(defaultExpiry.getHours() + 24); // 24 hours from now
      expiryDate = defaultExpiry.toISOString();
      console.log('[Store Payment V3] ⚠️ No expiry provided, using default 24h expiry:', expiryDate);
      console.log('[Store Payment V3] 📋 Available paymentData fields for debugging:', Object.keys(paymentData));
    }

    const paymentRecord = {
      xendit_id: paymentData.id || paymentData.payment_request_id,
      external_id: paymentData.external_id,
      // CRITICAL FIX: Always use paymentMethodId parameter, never paymentData.payment_method
      payment_method: paymentMethodId, // This MUST be the original payment_method_id like "bri", not from Xendit response
      amount: paymentData.amount,
      currency: paymentData.currency || 'IDR',
      status: paymentData.status,
      description: paymentData.description,
      payment_data: paymentSpecificData,
      expiry_date: expiryDate,
      created_at: new Date().toISOString()
    };

    // DEBUG: Log what's being stored for ALL payments to catch VA payments
    console.log('[Store Payment V3] 🏦 STORING PAYMENT DATA:', {
      xendit_id: paymentRecord.xendit_id,
      external_id: paymentRecord.external_id,
      payment_method: paymentRecord.payment_method,
      paymentMethodId_param: paymentMethodId,
      has_account_number: !!paymentSpecificData.account_number,
      has_virtual_account_number: !!paymentSpecificData.virtual_account_number,
      has_bank_code: !!paymentSpecificData.bank_code,
      payment_data_keys: Object.keys(paymentSpecificData)
    });

    // CRITICAL: Add database verification step
    console.log('[Store Payment V3] 🔧 About to store:', JSON.stringify(paymentRecord, null, 2));

    // Use upsert to prevent duplicate payment records - use xendit_id as conflict key
    const { data, error } = await supabase
      .from('payments')
      .upsert(paymentRecord, { onConflict: 'xendit_id' })
      .select(); // Return the inserted data

    if (error) {
      console.error('[Store Payment V3] ❌ CRITICAL DATABASE ERROR:', error);
      console.error('[Store Payment V3] 📋 Failed record:', JSON.stringify(paymentRecord, null, 2));
      
      // Try alternative storage method for VA payments
      if (paymentMethodId === 'bri' || paymentMethodId === 'bni' || paymentMethodId === 'mandiri') {
        console.log('[Store Payment V3] 🔄 Attempting emergency VA storage...');
        try {
          const emergencyRecord = {
            xendit_id: paymentData.id,
            external_id: paymentData.external_id,
            payment_method: paymentMethodId, // Force correct payment method
            amount: paymentData.amount,
            currency: 'IDR',
            status: paymentData.status || 'PENDING',
            description: 'Emergency VA storage',
            payment_data: {
              account_number: paymentData.account_number,
              virtual_account_number: paymentData.virtual_account_number,
              bank_code: paymentData.bank_code,
              bank_name: paymentData.bank_name
            },
            expiry_date: expiryDate,
            created_at: new Date().toISOString()
          };
          
          const { error: emergencyError } = await supabase
            .from('payments')
            .insert(emergencyRecord);
            
          if (emergencyError) {
            console.error('[Store Payment V3] ❌ Emergency storage also failed:', emergencyError);
          } else {
            console.log('[Store Payment V3] ✅ Emergency VA storage succeeded');
          }
        } catch (emergencyErr) {
          console.error('[Store Payment V3] ❌ Emergency storage exception:', emergencyErr);
        }
      }
    } else {
      console.log('[Store Payment V3] ✅ Successfully stored payment data for:', paymentRecord.xendit_id);
      console.log('[Store Payment V3] 📋 Stored data:', JSON.stringify(data, null, 2));
      
      // Additional debug for VA payments
      if (paymentMethodId.includes('bri') || paymentMethodId.includes('bni') || paymentMethodId.includes('mandiri')) {
        console.log('[Store Payment V3] 🏦 VA Payment stored successfully with VA data:', {
          account_number: paymentSpecificData.account_number,
          virtual_account_number: paymentSpecificData.virtual_account_number,
          bank_code: paymentSpecificData.bank_code,
          stored_payment_method: data?.[0]?.payment_method
        });
      }
    }

  } catch (error) {
    console.error('[Store Payment V3] Error:', error);
  }
}

// Create admin database notification for new order
async function createNewOrderAdminNotification(sb: any, orderId: string, customerName: string, productName: string, amount: number, customerPhone?: string, orderType?: string) {
  try {
    const isRental = orderType === 'rental';
    const typeLabel = isRental ? 'RENTAL' : 'PURCHASE';
    
    const title = `Bang! ada yang ORDER ${typeLabel} nih!`;
    
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const message = `namanya ${customerName}, produknya ${productName} harganya ${formatAmount(amount)}, ${isRental ? 'order RENTAL' : 'order PURCHASE'}, belum di bayar sih, tapi moga aja di bayar amin.`;

    // Ensure orderId is a valid UUID or null
    let validOrderId = null;
    if (orderId && typeof orderId === 'string') {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
      if (isValidUUID) {
        validOrderId = orderId;
      } else {
        console.warn('[New Order Admin] Invalid UUID format for orderId:', orderId, 'Using null instead');
      }
    }

    const notification = {
      type: 'new_order',
      title,
      message,
      order_id: validOrderId,
      customer_name: customerName,
      product_name: productName,
      amount: Math.round(Number(amount)),
      is_read: false,
      metadata: {
        priority: 'normal',
        category: 'order',
        order_type: orderType || 'purchase',
        customer_phone: customerPhone,
        original_order_id: orderId,
        payment_status: 'pending'
      },
      created_at: new Date().toISOString()
    };

    console.log('[New Order Admin] Creating new order notification:', notification);

    const { data, error } = await sb
      .from('admin_notifications')
      .insert(notification)
      .select('id, type, title, message, order_id, user_id, product_name, amount, created_at, is_read, metadata')
      .single();

    if (error) {
      console.error('[New Order Admin] Notification insert error:', error);
      throw error;
    } else {
      console.log('[New Order Admin] New order notification created successfully with ID:', data?.id);
      return data;
    }
  } catch (error) {
    console.error('[New Order Admin] Failed to create new order notification:', error);
    throw error;
  }
}

// Send WhatsApp group notification for new order
async function sendNewOrderGroupNotification(customerName: string, productName: string, amount: number, orderType: string, orderId: string) {
  try {
    const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
    const wa = new DynamicWhatsAppService();
    
    const isRental = orderType === 'rental';
    const typeLabel = isRental ? 'RENTAL ORDER' : 'PURCHASE ORDER';
    const contextId = `new-order:${orderId}`;
    
    // Check if already sent to prevent duplicates
    const alreadySent = await wa.hasMessageLog('new-order-group', contextId);
    if (alreadySent) {
      console.log('[New Order Group] Already sent notification for order:', orderId);
      return;
    }

    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const message = `🚨 *NEW ${typeLabel}* 🚨

👤 **Customer:** ${customerName}
🎯 **Product:** ${productName}
💰 **Amount:** ${formatAmount(amount)}
📋 **Order ID:** ${orderId}
${isRental ? '⏰ **Type:** Rental' : '🛒 **Type:** Purchase'}

⚠️ **STATUS:** PENDING PAYMENT
Customer has been sent payment link.

⏳ **Next Steps:**
• Monitor payment completion
• Prepare product delivery
• Follow up if needed

#NewOrder #${isRental ? 'Rental' : 'Purchase'}Pending`;

    // Get appropriate group based on order type and settings
    const settings = await wa.getActiveProviderSettings();
    let groupId = settings?.default_group_id; // fallback
    
    if (settings?.group_configurations) {
      const groupConfigs = settings.group_configurations;
      
      if (isRental && groupConfigs.rental_orders) {
        groupId = groupConfigs.rental_orders;
      } else if (!isRental && groupConfigs.purchase_orders) {
        groupId = groupConfigs.purchase_orders;
      }
    }

    const result = await wa.sendGroupMessage({
      message,
      groupId,
      contextType: 'new-order-group',
      contextId
    });

    if (result.success) {
      console.log(`[New Order Group] Successfully sent notification for order ${orderId} to group ${groupId}`);
    } else {
      console.error('[New Order Group] Failed to send notification:', result.error);
    }

  } catch (error) {
    console.error('[New Order Group] Error sending group notification:', error);
  }
}

// Send payment link WhatsApp notification to customer
async function sendPaymentLinkNotification(paymentData: any, order: any) {
  try {
    // Skip if no customer phone number
    if (!order?.customer_phone) {
      console.log('[Payment Link Notification] No customer phone provided, skipping notification');
      return;
    }

    const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
    const wa = new DynamicWhatsAppService();

    // Get site URL for payment link
    const SITE_URL = process.env.SITE_URL || process.env.REACT_APP_SITE_URL || 'https://www.jbalwikobra.com';
    
    // Create payment interface URL
    const paymentParams = new URLSearchParams({
      id: paymentData.id,
      method: paymentData.payment_method || 'unknown',
      amount: paymentData.amount?.toString() || '0',
      external_id: paymentData.external_id || '',
      description: paymentData.description || 'Payment'
    });
    
    const paymentLink = `${SITE_URL}/payment?${paymentParams.toString()}`;
    
    // Format expiry date
    const expiryText = paymentData.expiry_date 
      ? new Date(paymentData.expiry_date).toLocaleString('id-ID', {
          dateStyle: 'full',
          timeStyle: 'short'
        })
      : '24 jam dari sekarang';

    // Get product name - fetch from database if not provided
    let productName = order.product_name || 'Product';
    if (!order.product_name && order.product_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: productData } = await supabase
          .from('products')
          .select('name')
          .eq('id', order.product_id)
          .single();
        
        if (productData?.name) {
          productName = productData.name;
          console.log('[Payment Link Notification] Fetched product name:', productName);
        }
      } catch (error) {
        console.error('[Payment Link Notification] Error fetching product name:', error);
      }
    }

    // Different messages for purchase vs rental
    const isRental = order.order_type === 'rental';
    const customerName = order.customer_name || 'Customer';
    const amount = paymentData.amount || 0;
    
    const message = isRental 
      ? `🎮 *RENTAL PAYMENT LINK*

Halo ${customerName}! 👋

Segera selesaikan pembayaran untuk rental akun *${productName}* senilai *Rp ${Number(amount).toLocaleString('id-ID')}* dengan durasi *${order.rental_duration || 'sesuai pilihan'}*.

🔗 **Klik link berikut untuk melanjutkan pembayaran:**
${paymentLink}

⏰ **Link pembayaran berlaku sampai:**
${expiryText}

📋 **Detail Rental:**
• Product: ${productName}
• Durasi: ${order.rental_duration || 'Sesuai pilihan'}
• Total: Rp ${Number(amount).toLocaleString('id-ID')}

⚠️ **PENTING:**
• Gunakan link di atas jika Anda keluar dari halaman pembayaran
• Pembayaran akan dikonfirmasi otomatis
• Akses rental dimulai setelah pembayaran berhasil

💬 **Support:** wa.me/6289653510125
🌐 **Website:** https://jbalwikobra.com

Terima kasih! 🙏`
      : `🎮 *PAYMENT LINK - PURCHASE*

Halo ${customerName}! 👋

Segera selesaikan pembayaran untuk pembelian akun *${productName}* senilai *Rp ${Number(amount).toLocaleString('id-ID')}*.

🔗 **Klik link berikut untuk melanjutkan pembayaran:**
${paymentLink}

⏰ **Link pembayaran berlaku sampai:**
${expiryText}

📋 **Detail Order:**
• Product: ${productName}
• Total: Rp ${Number(amount).toLocaleString('id-ID')}
• Type: Full Purchase

✅ **Yang Anda dapatkan:**
• Akun permanen milik Anda
• Full access selamanya
• Support after sales
• Garansi 7 hari

💬 **Support:** wa.me/6289653510125
🌐 **Website:** https://jbalwikobra.com

Terima kasih! 🙏`;

    // Send notification with idempotency
    const contextId = `payment-link:${paymentData.id}`;
    const alreadySent = await wa.hasMessageLog('payment-link', contextId);
    
    if (alreadySent) {
      console.log('[Payment Link Notification] Already sent for payment:', paymentData.id);
      return;
    }

    const result = await wa.sendMessage({
      phone: order.customer_phone,
      message: message,
      contextType: 'payment-link',
      contextId: contextId
    });

    if (result.success) {
      console.log(`[Payment Link Notification] Sent successfully to ${order.customer_phone} for payment ${paymentData.id}`);
    } else {
      console.error('[Payment Link Notification] Failed to send:', result.error);
    }

  } catch (error) {
    console.error('[Payment Link Notification] Error:', error);
  }
}


