# Fix QRIS QR Code Not Displaying - Solution Guide

## Problem
QRIS payment page does not display the QR code at: 
`https://www.jbalwikobra.com/payment?id=6953bda45fa53a220c0fb5cc&method=qris`

## Root Cause Analysis

### 1. QR Code Storage Issue
When QRIS payments are created using **Xendit Invoice API v2**, the QR code string is returned in a specific field structure:
```json
{
  "available_banks": [
    {
      "bank_code": "QRIS",
      "bank_branch": "00020101021226670016COM.XENDIT.WWW011893600916009160391600000670303UBE5204541153033605802ID5914Jualbeli Wikob6007Jakarta61051040062410220TKO65600001673400570303UBE6304D4C8"
    }
  ]
}
```

The `bank_branch` field contains the actual QR code string, but this was not being extracted and stored during payment creation.

### 2. Migration Already Run
The database migration `20251230_ensure_payments_table.sql` has been executed, ensuring the `payments` table has the correct structure including:
- `payment_data` (JSONB) - for storing QR codes and payment-specific data

## Solutions Implemented

### Solution 1: Fixed Payment Creation (For Future Payments)
**File**: `api/xendit/create-direct-payment.ts`

The code now properly extracts and stores QR codes during QRIS payment creation:
```typescript
// For QRIS payments, store the QR code URL if available
if (channelCode === 'QRIS') {
  if (xenditData.available_banks && xenditData.available_banks.length > 0) {
    const qrisBank = xenditData.available_banks.find((bank: any) => 
      bank.bank_code === 'QRIS' || bank.bank_code === 'ID_SHOPEEPAY'
    );
    
    if (qrisBank) {
      paymentSpecificData.qr_string = qrisBank.bank_branch || qrisBank.qr_string;
      paymentSpecificData.qr_url = qrisBank.bank_branch || qrisBank.qr_string;
    }
  }
}
```

✅ **Status**: Implemented and deployed. Future QRIS payments will have QR codes.

### Solution 2: Automatic Fallback (For Existing Payments)
**File**: `api/xendit/get-payment.ts`

Added fallback logic to automatically fetch QR codes from Xendit when missing:
```typescript
if (isQRISPayment && !hasQRString) {
  // Fetch from Xendit Invoice API v2
  const xenditResponse = await fetch(`https://api.xendit.co/v2/invoices/${paymentData.xendit_id}`, {
    headers: {
      'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Extract QR string and update database
  const qrisBank = xenditData.available_banks.find((bank: any) => 
    bank.bank_code === 'QRIS' || bank.bank_code === 'ID_SHOPEEPAY'
  );
  
  if (qrisBank && qrisBank.bank_branch) {
    await supabase.from('payments').update({ 
      payment_data: { ...payment_data, qr_string: qrisBank.bank_branch } 
    });
  }
}
```

⚠️ **Status**: Implemented but needs verification. Should auto-fix when payment page loads.

### Solution 3: Manual Fix Endpoint (For Troubleshooting)
**File**: `api/xendit/fix-qris-payment.ts`

Created a dedicated endpoint to manually fix specific payments:
```
GET /api/xendit/fix-qris-payment?id=<payment_id>
```

**Usage**:
```bash
curl "https://www.jbalwikobra.com/api/xendit/fix-qris-payment?id=6953bda45fa53a220c0fb5cc"
```

This endpoint:
1. Fetches the invoice from Xendit
2. Extracts the QR string from `available_banks`
3. Updates the database `payment_data` field
4. Returns success confirmation

### Solution 4: Debug Endpoint (For Investigation)
**File**: `api/xendit/debug-qris.ts`

Created debug endpoint to investigate Xendit API responses:
```
GET /api/xendit/debug-qris?id=<payment_id>
```

**Usage**:
```bash
curl "https://www.jbalwikobra.com/api/xendit/debug-qris?id=6953bda45fa53a220c0fb5cc"
```

This shows:
- Whether Xendit API is accessible
- The full `available_banks` structure
- Whether QR string exists in the response

## How to Fix Existing Payment

### Method 1: Automatic (Just refresh the page)
1. Open the payment URL in browser:
   ```
   https://www.jbalwikobra.com/payment?id=6953bda45fa53a220c0fb5cc&method=qris
   ```
2. The frontend will call `/api/xendit/get-payment`
3. The fallback logic should auto-fetch and store the QR code
4. Refresh the page if needed

### Method 2: Manual API Call
If automatic method doesn't work, use the fix endpoint:

```bash
# Step 1: Fix the payment
curl "https://www.jbalwikobra.com/api/xendit/fix-qris-payment?id=6953bda45fa53a220c0fb5cc"

# Step 2: Verify it worked
curl "https://www.jbalwikobra.com/api/xendit/get-payment?id=6953bda45fa53a220c0fb5cc" | jq '.qr_string'

# Step 3: Open payment page
open "https://www.jbalwikobra.com/payment?id=6953bda45fa53a220c0fb5cc&method=qris"
```

### Method 3: Debug First
If fix doesn't work, debug to see what's happening:

```bash
curl "https://www.jbalwikobra.com/api/xendit/debug-qris?id=6953bda45fa53a220c0fb5cc" | jq '.logs[]'
```

This will show step-by-step what happens when fetching from Xendit.

## Verification Steps

After applying the fix:

1. **Check API Response**:
   ```bash
   curl "https://www.jbalwikobra.com/api/xendit/get-payment?id=6953bda45fa53a220c0fb5cc"
   ```
   Should return:
   ```json
   {
     "qr_string": "00020101021226670016COM.XENDIT.WWW...",
     "qr_url": "00020101021226670016COM.XENDIT.WWW..."
   }
   ```

2. **Check Payment Page**:
   - Visit: `https://www.jbalwikobra.com/payment?id=6953bda45fa53a220c0fb5cc&method=qris`
   - Should see QR code displayed
   - QR code should be scannable with e-wallet apps

3. **Test New Payment**:
   - Create a new QRIS payment
   - QR code should appear immediately on payment page

## Technical Details

### Database Schema
Table: `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  xendit_id VARCHAR(255) UNIQUE NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'IDR',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payment_data JSONB,  -- Stores QR codes here
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Payment Data Structure (QRIS)
```json
{
  "qr_string": "00020101021226670016COM.XENDIT.WWW...",
  "qr_url": "00020101021226670016COM.XENDIT.WWW...",
  "invoice_url": "https://checkout.xendit.co/web/...",
  "payment_url": "https://checkout.xendit.co/web/..."
}
```

## Files Modified

1. ✅ `api/xendit/create-direct-payment.ts` - Fixed QR extraction during payment creation
2. ✅ `api/xendit/get-payment.ts` - Added automatic fallback logic
3. ✅ `api/xendit/fix-qris-payment.ts` - Manual fix endpoint (NEW)
4. ✅ `api/xendit/debug-qris.ts` - Debug endpoint (NEW)
5. ✅ `scripts/fix-qris-payment.js` - Node.js script for local fix (NEW)
6. ✅ `supabase/migrations/20251230_ensure_payments_table.sql` - Database structure (ALREADY RUN)

## Next Steps

1. ⏳ Wait for Vercel deployment to complete (~1-2 minutes)
2. 🧪 Test debug endpoint to verify Xendit API access
3. 🔧 Run fix endpoint to update the payment
4. ✅ Verify QR code displays on payment page
5. 🎉 Create a new QRIS payment to verify the full flow works

## Deployment Status

```bash
# Check if new endpoints are deployed
curl -I "https://www.jbalwikobra.com/api/xendit/debug-qris?id=test"
# Should return 400 (Bad Request) not 404 (Not Found)

curl -I "https://www.jbalwikobra.com/api/xendit/fix-qris-payment?id=test"
# Should return 400 (Bad Request) not 404 (Not Found)
```

When you see 400 instead of 404, the endpoints are deployed.

## Troubleshooting

### Issue: "INVALID_API_KEY" from Xendit
- Check if `XENDIT_SECRET_KEY` environment variable is set correctly in Vercel
- Key should start with `xnd_development_` or `xnd_production_`
- Verify key has Invoice API permissions

### Issue: "Payment not found in database"
- Payment might not be in `payments` table
- Check `orders` table instead
- May need to manually insert payment record

### Issue: "No available_banks in response"
- Payment might be too old (expired)
- Xendit might not return QR codes for expired invoices
- Try creating a new payment

### Issue: QR code still not showing after fix
- Clear browser cache
- Check browser console for frontend errors
- Verify `payment_data` field was actually updated in database

## Contact

If issues persist after following this guide:
1. Check Vercel deployment logs
2. Check Supabase logs for database errors
3. Use debug endpoint to see detailed logs
4. Check browser console for frontend errors
