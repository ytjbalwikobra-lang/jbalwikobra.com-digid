# 🔍 TROUBLESHOOTING PAYMENT & NOTIFICATION ISSUE

## Hasil Diagnostic (3 Jan 2026)

### ✅ Yang Sudah Bekerja:
- WhatsApp group configuration sudah benar
- Group ID: `120363405729592501@g.us` (ORDERAN WEBSITE ✅)
- WhatsApp API bisa mengirim pesan (ada log sukses sebelumnya)
- Admin notifications tercatat dengan baik

### ❌ Masalah Yang Ditemukan:
- **Semua payment baru masih status `pending`**
- Tidak ada notifikasi WhatsApp untuk payment baru
- Halaman tidak redirect ke success page

---

## 🎯 Kemungkinan Penyebab & Solusi

### 1. Customer Belum Benar-Benar Bayar
**Gejala:**
- QR Code ditampilkan tapi belum di-scan
- VA number ditampilkan tapi belum ditransfer

**Cek:**
```bash
# Pastikan customer sudah scan QR atau transfer ke VA
# Cek di Xendit Dashboard apakah payment statusnya PAID/SUCCEEDED
```

**Solusi:**
- Minta customer untuk benar-benar scan QR atau transfer
- Tunggu 1-2 menit untuk update dari bank

---

### 2. Xendit Webhook Tidak Terkirim
**Gejala:**
- Payment sudah PAID di Xendit Dashboard
- Tapi di database masih `pending`

**Cek Xendit Dashboard:**
1. Login ke https://dashboard.xendit.co
2. Pilih **Settings** → **Webhooks**
3. Pastikan webhook URL ter-set: `https://jbalwikobra-com-digid-digitalindo.vercel.app/api/xendit/webhook`
4. Lihat di **Webhook Logs** apakah ada request yang gagal

**Webhook URL yang benar:**
```
https://jbalwikobra-com-digid-digitalindo.vercel.app/api/xendit/webhook
```

**Events yang harus di-enable:**
- ✅ QR Code: `qr_code.status_changed`
- ✅ Invoice: `invoice.paid`, `invoice.succeeded`
- ✅ Payment: `payment.succeeded`, `payment.paid`

---

### 3. Webhook Callback Token Tidak Match
**Gejala:**
- Webhook dikirim tapi ditolak (401 Unauthorized)

**Cek:**
Pastikan `XENDIT_CALLBACK_TOKEN` di Vercel sama dengan yang di-set di Xendit Dashboard

**Di Vercel:**
1. Project Settings → Environment Variables
2. Cari `XENDIT_CALLBACK_TOKEN`
3. Catat nilai-nya

**Di Xendit:**
1. Settings → Webhooks
2. Callback token harus sama persis

---

### 4. Polling Frontend Tidak Berjalan
**Gejala:**
- Webhook berhasil update database
- Tapi frontend tidak redirect

**Debug:**
Buka browser Console (F12) saat di halaman payment, lihat log:
```
Polling payment status for ID: xxx
Payment status poll result: PAID
```

Jika tidak ada log, berarti polling error.

---

## 🔧 Testing Webhook Manual

Gunakan Xendit Dashboard untuk test webhook:

1. **Buka Webhook Logs**
2. **Pilih payment yang sudah PAID**
3. **Klik "Resend"**
4. **Check database apakah order status berubah**

---

## 📊 Cara Test Lengkap

### Test 1: Cek Payment di Xendit Dashboard
```
1. Login ke Xendit Dashboard
2. Cek payment terakhir
3. Status harus SUCCEEDED/PAID
```

### Test 2: Cek Webhook Delivery
```
1. Xendit Dashboard → Settings → Webhooks → Logs
2. Cari request untuk payment ID
3. Status code harus 200
4. Jika 401: Token issue
5. Jika 500: Server error
```

### Test 3: Cek Database
```bash
node /workspaces/jbalwikobra.com-digid/scripts/diagnose-payment-issue.js
```

Lihat apakah ada paid orders yang muncul.

---

## 🚨 Quick Fix

Jika payment sudah PAID di Xendit tapi database masih pending:

### Manual Update via SQL:

```sql
-- Cari order berdasarkan customer name atau amount
SELECT id, customer_name, amount, status, created_at
FROM orders
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- Update manual ke status paid (ganti ORDER_ID)
UPDATE orders
SET 
  status = 'paid',
  paid_at = NOW(),
  payment_channel = 'QRIS'
WHERE id = 'ORDER_ID_YANG_SUDAH_DIBAYAR';

-- Trigger manual webhook (gunakan webhook test di Xendit Dashboard)
```

Setelah manual update, jalankan:
```bash
# Test kirim notifikasi manual
curl -X POST https://jbalwikobra-com-digid-digitalindo.vercel.app/api/xendit/webhook?testGroupSend=1 \
  -H "Content-Type: application/json" \
  -d '{"message": "Test manual notification"}'
```

---

## 📞 Next Steps

1. **Cek Xendit Dashboard** - apakah payment benar-benar PAID
2. **Cek Webhook Logs** - apakah webhook terkirim dan berhasil
3. **Test Resend Webhook** - dari Xendit Dashboard
4. **Jika masih gagal** - share screenshot Xendit webhook logs

---

## 🔗 Useful Links

- Xendit Dashboard: https://dashboard.xendit.co
- Webhook Documentation: https://developers.xendit.co/api-reference/#webhooks
- Diagnostic Script: `/scripts/diagnose-payment-issue.js`
