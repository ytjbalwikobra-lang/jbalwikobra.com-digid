/**
 * Payment Service - Unified Xendit Payment Links v2
 * Single endpoint for all payment methods
 */

export type CreateInvoiceInput = {
  externalId: string;
  clientExternalId?: string; // Alias for clarity
  amount: number;
  payerEmail?: string;
  description?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  paymentMethod?: string;
  customer?: {
    given_names?: string;
    email?: string;
    mobile_number?: string;
  };
  order?: {
    product_id?: string;
    product_name?: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    order_type?: 'purchase' | 'rental';
    amount: number;
    rental_duration?: string | null;
    user_id?: string | null;
  };
};

export async function createXenditInvoice(input: CreateInvoiceInput) {
  console.log('[Payment] Creating payment:', {
    externalId: input.externalId,
    amount: input.amount,
    method: input.paymentMethod,
    hasOrder: !!input.order
  });
  
  // Timeout for better UX
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    // Always use create-direct-payment (it handles all methods via Payment Links v2)
    if (!input.paymentMethod) {
      throw new Error('Payment method is required');
    }

    const payload = {
      amount: input.amount,
      currency: 'IDR',
      payment_method_id: input.paymentMethod,
      customer: input.customer || {
        given_names: input.order?.customer_name,
        email: input.order?.customer_email || input.payerEmail,
        mobile_number: input.order?.customer_phone
      },
      description: input.description || 'Payment',
      external_id: input.clientExternalId || input.externalId,
      success_redirect_url: input.successRedirectUrl,
      failure_redirect_url: input.failureRedirectUrl,
      order: input.order
    };
    
    console.log('[Payment] Calling API with method:', input.paymentMethod);
    
    const response = await fetch('/api/xendit/create-direct-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const data = await response.json();
    console.log('[Payment] Response:', { status: response.status, hasUrl: !!data.payment_url });
    
    if (!response.ok) {
      console.error('[Payment] Failed:', data);
      throw new Error(data?.error || data?.message || 'Payment creation failed');
    }
    
    return {
      id: data.id,
      invoice_url: data.payment_url || data.invoice_url,
      status: data.status
    };
    
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Koneksi terlalu lambat. Silakan coba lagi.');
    }
    console.error('[Payment] Error:', error);
    throw error;
  }
}