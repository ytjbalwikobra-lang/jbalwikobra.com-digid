#!/usr/bin/env node

/**
 * Fix QRIS Payment - Fetch QR String from Xendit and Update Database
 * 
 * This script fetches the QR string for a QRIS payment from Xendit Invoice API
 * and updates the payment record in Supabase with the QR code data.
 * 
 * Usage:
 *   node scripts/fix-qris-payment.js <payment_id>
 * 
 * Example:
 *   node scripts/fix-qris-payment.js 6953bda45fa53a220c0fb5cc
 */

const https = require('https');

// Get payment ID from command line
const paymentId = process.argv[2];

if (!paymentId) {
  console.error('❌ Error: Payment ID is required');
  console.log('\nUsage:');
  console.log('  node scripts/fix-qris-payment.js <payment_id>');
  console.log('\nExample:');
  console.log('  node scripts/fix-qris-payment.js 6953bda45fa53a220c0fb5cc');
  process.exit(1);
}

// Environment variables
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!XENDIT_SECRET_KEY) {
  console.error('❌ Error: XENDIT_SECRET_KEY environment variable not set');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

console.log('🔧 Fixing QRIS Payment:', paymentId);
console.log('');

// Helper to make HTTPS requests
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function main() {
  // Step 1: Fetch invoice from Xendit
  console.log('📥 Step 1: Fetching invoice from Xendit Invoice API v2...');
  
  const xenditAuth = Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64');
  const xenditUrl = `https://api.xendit.co/v2/invoices/${paymentId}`;
  
  try {
    const xenditResponse = await httpsRequest(xenditUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${xenditAuth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (xenditResponse.status !== 200) {
      console.error('❌ Xendit API error:', xenditResponse.status);
      console.error('Response:', JSON.stringify(xenditResponse.data, null, 2));
      process.exit(1);
    }
    
    const invoiceData = xenditResponse.data;
    console.log('✅ Invoice fetched successfully');
    console.log('   Status:', invoiceData.status);
    console.log('   Amount:', invoiceData.currency, invoiceData.amount);
    console.log('   Payment Methods:', invoiceData.payment_methods);
    console.log('');
    
    // Step 2: Extract QR string from available_banks
    console.log('🔍 Step 2: Looking for QR string in available_banks...');
    
    if (!invoiceData.available_banks || invoiceData.available_banks.length === 0) {
      console.error('❌ No available_banks found in invoice response');
      console.log('\nFull invoice data:');
      console.log(JSON.stringify(invoiceData, null, 2));
      process.exit(1);
    }
    
    console.log(`   Found ${invoiceData.available_banks.length} bank(s)`);
    
    // Look for QRIS bank
    const qrisBank = invoiceData.available_banks.find(bank => 
      bank.bank_code === 'QRIS' || bank.bank_code === 'ID_SHOPEEPAY'
    );
    
    if (!qrisBank) {
      console.error('❌ QRIS bank not found in available_banks');
      console.log('\nAvailable banks:');
      invoiceData.available_banks.forEach(bank => {
        console.log(`   - ${bank.bank_code}:`, bank.bank_branch || 'no data');
      });
      process.exit(1);
    }
    
    const qrString = qrisBank.bank_branch || qrisBank.qr_string;
    
    if (!qrString) {
      console.error('❌ QR string not found in QRIS bank data');
      console.log('\nQRIS bank data:');
      console.log(JSON.stringify(qrisBank, null, 2));
      process.exit(1);
    }
    
    console.log('✅ QR string found!');
    console.log(`   Length: ${qrString.length} characters`);
    console.log(`   Preview: ${qrString.substring(0, 50)}...`);
    console.log('');
    
    // Step 3: Update Supabase
    console.log('💾 Step 3: Updating database...');
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // First, get the existing payment data
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('xendit_id', paymentId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching payment from database:', fetchError.message);
      process.exit(1);
    }
    
    if (!existingPayment) {
      console.error('❌ Payment not found in database');
      process.exit(1);
    }
    
    console.log('   Current payment_data:', JSON.stringify(existingPayment.payment_data, null, 2));
    
    // Update the payment_data with QR string
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
        status: invoiceData.status || existingPayment.status
      })
      .eq('xendit_id', paymentId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating payment:', updateError.message);
      process.exit(1);
    }
    
    console.log('✅ Payment updated successfully!');
    console.log('   Updated payment_data:', JSON.stringify(updatedPayment.payment_data, null, 2));
    console.log('');
    
    // Step 4: Verify
    console.log('✓ Step 4: Verification');
    console.log('   Payment ID:', paymentId);
    console.log('   QR String:', qrString ? 'Present ✅' : 'Missing ❌');
    console.log('   Status:', updatedPayment.status);
    console.log('');
    console.log('🎉 Done! The payment page should now display the QR code.');
    console.log(`   Visit: https://www.jbalwikobra.com/payment?id=${paymentId}&method=qris`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
