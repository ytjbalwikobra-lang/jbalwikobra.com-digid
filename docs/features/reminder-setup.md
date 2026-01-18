# Payment Reminder Cron Job Setup

## 🎯 Overview

Automated WhatsApp payment reminders for pending orders sent 2x daily (9 AM & 3 PM).

## 📋 Features

- ✅ Finds pending orders 1-24 hours old
- ✅ Sends WhatsApp reminder with payment link
- ✅ Skips expired payments automatically
- ✅ Rate limiting (1 second delay between messages)
- ✅ Detailed logging and error tracking

## 🔧 Setup in Vercel

### 1. Generate Cron Secret

```bash
openssl rand -base64 32
```

Copy the output (e.g., `Xy9z...abc==`)

### 2. Add Environment Variable

Vercel Dashboard → Project Settings → Environment Variables:

- **Name**: `CRON_SECRET`
- **Value**: The generated secret from step 1
- **Environments**: Production

### 3. Configure Cron Job

Vercel Dashboard → Project Settings → Cron Jobs → Add Cron Job:

- **Path**: `/api/cron/payment-reminder`
- **Schedule**: `0 9,15 * * *` (9 AM and 3 PM daily, UTC)
- **Region**: Select closest to your users

**Schedule Format:**
```
0 9,15 * * *
│  │  │ │ └── Day of week (0-7, 0 and 7 are Sunday)
│  │  │ └──── Month (1-12)
│  │  └────── Day of month (1-31)
│  └───────── Hour (0-23) - 9 AM and 3 PM
└──────────── Minute (0-59) - At :00

```

### Alternative Schedules:

- Every hour: `0 * * * *`
- Every 3 hours: `0 */3 * * *`
- Once daily at 10 AM: `0 10 * * *`

### 4. Secure the Endpoint

The cron job is protected by Bearer token authentication:

```typescript
const authHeader = req.headers.authorization;
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

Vercel automatically adds this header when calling configured cron jobs.

## 🧪 Manual Testing

Test the endpoint directly (requires CRON_SECRET):

```bash
curl -X GET https://www.jbalwikobra.com/api/cron/payment-reminder \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Payment reminders sent",
  "total_orders": 5,
  "reminders_sent": 5,
  "success_count": 5,
  "fail_count": 0,
  "results": [...]
}
```

## 📊 Monitoring

### View Cron Logs

Vercel Dashboard → Project → Deployments → Functions → Logs

Filter by: `/api/cron/payment-reminder`

### Check WhatsApp Delivery

Look for logs:
```
[Payment Reminder] Found X pending orders
[Payment Reminder] Order ABC123: SUCCESS
[Payment Reminder] Complete: X success, Y failed
```

### Verify in Database

Query pending orders:
```sql
SELECT 
  id,
  external_id,
  customer_name,
  customer_mobile_number,
  total_amount,
  created_at,
  status
FROM orders 
WHERE status = 'pending' 
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## 🔄 Logic Flow

1. Query orders: `status='pending'`, created 1-24 hours ago
2. For each order:
   - Verify has mobile number
   - Verify has active payment
   - Check payment not expired
   - Calculate hours since creation
   - Send WhatsApp with payment link
   - Log result
3. Return summary statistics

## 📱 Message Format

```
🔔 *PENGINGAT PEMBAYARAN*

Halo [Customer Name]! 

Kami ingin mengingatkan bahwa order Anda masih menunggu pembayaran:

📦 Order ID: [Order ID]
💰 Total: Rp [Amount]
💳 Metode: [Payment Method]
⏰ Dibuat: [Hours] jam yang lalu

Silakan selesaikan pembayaran melalui link berikut:
[Payment URL]

Link pembayaran akan expired dalam [Hours] jam.

Jika sudah melakukan pembayaran, mohon abaikan pesan ini.

Terima kasih! 🙏
*JB Alwikobra*
```

## ⚙️ Configuration

### Customize Reminder Timing

Edit the SQL query time range in `payment-reminder.ts`:

```typescript
// Current: 1-24 hours old
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// Example: 30 minutes - 12 hours
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
```

### Customize Rate Limiting

```typescript
// Current: 1 second between messages
await new Promise(resolve => setTimeout(resolve, 1000));

// More conservative: 2 seconds
await new Promise(resolve => setTimeout(resolve, 2000));
```

## 🚨 Troubleshooting

### Cron Not Running

1. Verify cron job configured in Vercel
2. Check correct path: `/api/cron/payment-reminder`
3. Verify schedule syntax valid
4. Check deployment succeeded

### No Reminders Sent

1. Verify pending orders exist in time window
2. Check orders have mobile numbers
3. Verify payments not expired
4. Check WhatsApp provider configured

### Authentication Errors

1. Verify `CRON_SECRET` environment variable set
2. Ensure secret matches in Vercel config
3. Check Authorization header format

### WhatsApp Delivery Failures

1. Check WhatsApp provider active
2. Verify API key valid
3. Check phone number format (+62...)
4. Review rate limiting

## 📈 Expected Results

With 100 pending orders per day:
- **Morning run (9 AM)**: ~50 reminders sent
- **Afternoon run (3 PM)**: ~30 reminders sent
- **Success rate**: >95%
- **Cost**: ~80 API calls/day

## 🔗 Related Files

- `/api/cron/payment-reminder.ts` - Main cron handler
- `/api/_utils/dynamicWhatsAppService.ts` - WhatsApp service
- `/api/xendit/create-direct-payment.ts` - Order creation
- `/api/xendit/webhook.ts` - Payment success handler

## ✅ Checklist

- [x] Cron file created and deployed
- [ ] CRON_SECRET generated and added to Vercel
- [ ] Cron job configured in Vercel dashboard
- [ ] Test run verified successful
- [ ] Monitoring setup in place
- [ ] Customer received first reminder

---

*Setup completed: Add CRON_SECRET to Vercel and configure cron job!*
