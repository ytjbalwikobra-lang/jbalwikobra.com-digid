# 🔧 FIX: Webhook Endpoint Blocked by Vercel Protection

## Problem
Xendit webhook calls are being blocked with **401 Unauthorized** due to Vercel deployment protection. This prevents payment status updates and notifications.

## Solution

### Step 1: Disable Deployment Protection for Webhook Endpoint

1. **Login to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select Project**: jbalwikobra-com-digid-digitalindo
3. **Go to Settings** → **Deployment Protection**
4. **Add Bypass for API Routes**:
   - Option A: Add `/api/*` to bypass list (recommended for all API endpoints)
   - Option B: Specifically add `/api/xendit/webhook` to bypass list

### Step 2: Configure Vercel Protection Bypass

If full disable is not desired, use **Protection Bypass for Automation**:

1. **Go to Settings** → **Deployment Protection**
2. **Enable "Protection Bypass for Automation"**
3. **Copy the bypass secret**
4. **Configure Xendit** to send this in headers:
   - Header: `x-vercel-protection-bypass`
   - Value: `<your-bypass-secret>`

### Step 3: Verify Webhook Can Be Called

Test the webhook endpoint:

```bash
curl -X POST https://jbalwikobra-com-digid-digitalindo.vercel.app/api/xendit/webhook \
  -H "Content-Type: application/json" \
  -H "x-callback-token: YOUR_XENDIT_CALLBACK_TOKEN" \
  -d '{
    "id": "test",
    "event": "qr.payment",
    "status": "COMPLETED",
    "qr_code": {
      "id": "qr_test",
      "external_id": "order_test"
    }
  }'
```

Expected response: `200 OK` (not 401)

---

## Alternative: Make Webhook Publicly Accessible

### Option 1: Configure vercel.json (Already Done)

The webhook endpoint timeout has been increased to 30 seconds in `vercel.json`:

```json
{
  "functions": {
    "api/xendit/webhook.ts": {
      "maxDuration": 30
    }
  }
}
```

### Option 2: Environment-based Protection

Set environment variable in Vercel:

```
VERCEL_AUTOMATION_BYPASS_SECRET=<your-secret>
```

Then configure Xendit webhook to include this in headers.

---

## Quick Test After Fix

Run the test script:

```bash
node scripts/test-webhook-manually.js
```

Should return **200 OK** instead of **401**.

---

## Xendit Webhook Configuration

After fixing Vercel protection, ensure Xendit webhook is properly configured:

### Webhook URL:
```
https://jbalwikobra-com-digid-digitalindo.vercel.app/api/xendit/webhook
```

### Headers to Send:
```
x-callback-token: <YOUR_XENDIT_CALLBACK_TOKEN>
x-vercel-protection-bypass: <YOUR_VERCEL_BYPASS_SECRET> (if using bypass)
```

### Events to Enable:
- ✅ `qr.payment` - QR payment completed
- ✅ `invoice.paid` - Invoice paid
- ✅ `payment.succeeded` - Payment succeeded

---

## Verify After Fix

1. **Test webhook endpoint** accessibility
2. **Create a test payment** (Rp 10.000)
3. **Scan QR code** and complete payment
4. **Check logs** in Vercel Dashboard → Functions → webhook
5. **Verify order status** updated to `paid`
6. **Check WhatsApp** notification sent to group

---

## Root Cause Summary

The issue was **NOT** with the code, but with Vercel's deployment protection blocking external webhook calls from Xendit. The webhook handler code has been fixed to:

1. ✅ Recognize `COMPLETED` status as `paid`
2. ✅ Add detailed logging for debugging
3. ✅ Add fuzzy matching for external_id
4. ✅ Proper QR payment payload handling

But it couldn't work because the endpoint was **blocked by Vercel protection** (401 Unauthorized).

Once Vercel protection is configured correctly, all payments will process automatically!
