# Purchase Flow Documentation

## Overview
This document describes the complete purchase flow for the JB Alwikobra e-commerce platform, from product selection to payment completion.

## Purchase Flow Architecture

### 1. Product Selection & Checkout Initiation
**Location**: `src/pages/ProductDetailPage.tsx`, `src/components/public/product-detail/CheckoutModal.tsx`

**Flow**:
1. Customer browses products on the catalog page or product detail page
2. Customer clicks "Beli Sekarang" (Buy Now) or "Sewa Sekarang" (Rent Now) button
3. System opens checkout modal with product information pre-filled
4. Customer can choose between:
   - **Purchase**: One-time payment for full ownership
   - **Rental**: Time-based rental with duration options

**Key Components**:
- `CheckoutModal.tsx` - Main checkout UI component
- `PurchaseFormHeader.tsx` - Displays order summary
- `CustomerInfoForm.tsx` - Collects customer information
- `PaymentMethods.tsx` - Payment method selection
- `PurchaseActions.tsx` - Checkout action buttons

### 2. Customer Information Collection
**Location**: `src/components/purchase-form/CustomerInfoForm.tsx`

**Required Fields**:
- Full Name (`customer_name`)
- Email Address (`customer_email`)
- WhatsApp Phone Number (`customer_phone`)

**Validation**:
- Name: Non-empty string
- Email: Valid email format (regex: `/\S+@\S+\.\S+/`)
- Phone: Valid Indonesian phone format with +62 prefix
- All fields are required and validated in real-time

### 3. Payment Method Selection
**Location**: `src/components/purchase-form/PaymentMethods.tsx`, `src/config/paymentMethodConfig.ts`

**Supported Payment Methods**:
1. **QRIS** - QR Code payment (Quick Response Code Indonesian Standard)
2. **Bank Virtual Account**:
   - BNI Virtual Account
   - BRI Virtual Account
   - Mandiri Virtual Account
   - Permata Virtual Account
   - CIMB Virtual Account
   - BSI Virtual Account
   - BJB Virtual Account
3. **E-Wallets**:
   - AstraPay
4. **Over-the-Counter**:
   - Indomaret

**Payment Method Configuration**:
- Defined in `api/_config/paymentChannels.ts`
- Frontend configuration in `src/config/paymentMethodConfig.ts`
- Only activated payment methods are shown to customers

### 4. Order Creation
**Location**: `api/xendit/create-invoice.ts`

**Process**:
1. Frontend calls `/api/xendit/create-invoice` with:
   ```typescript
   {
     amount: number,
     customer_name: string,
     customer_email: string,
     customer_phone: string,
     product_id: string,
     product_name: string,
     payment_method: string,
     order_type: 'purchase' | 'rental',
     rental_duration?: string // if rental
   }
   ```

2. Backend validates request data
3. Creates order record in Supabase `orders` table with status `pending`
4. Generates external ID for Xendit tracking: `ORDER-{timestamp}-{random}`

**Order Schema**:
```typescript
{
  id: UUID,
  customer_name: string,
  customer_email: string,
  customer_phone: string,
  product_id: UUID,
  product_name: string,
  amount: number,
  order_type: 'purchase' | 'rental',
  rental_duration?: string,
  status: 'pending' | 'paid' | 'completed' | 'cancelled',
  payment_method: string,
  client_external_id: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 5. Payment Invoice Creation
**Location**: `api/xendit/create-invoice.ts`

**Process**:
1. System calls Xendit API to create payment invoice:
   - For QRIS: Creates QR code
   - For Virtual Account: Creates VA number
   - For E-Wallet: Creates payment URL/deeplink
   - For OTC: Creates payment code

2. Xendit responds with payment details:
   ```typescript
   {
     id: string,
     external_id: string,
     status: string,
     amount: number,
     expiry_date: string,
     invoice_url: string,
     // Method-specific fields:
     qr_string?: string,
     virtual_account_number?: string,
     actions?: { checkout_url, deeplink, etc }
   }
   ```

3. Backend updates order with Xendit payment ID
4. Creates admin notification for new order
5. Returns payment details to frontend

**Error Handling**:
- Invalid payment method → 400 Bad Request
- Xendit API failure → 500 Internal Server Error
- Database error → 500 Internal Server Error
- All errors are logged for debugging

### 6. Payment Interface Display
**Location**: `src/pages/PaymentInterface.tsx`

**Features**:
1. **Payment Instructions** based on method:
   - QRIS: Display QR code for scanning
   - Virtual Account: Display VA number and bank instructions
   - E-Wallet: Display payment button/deeplink
   - OTC: Display payment code and store instructions

2. **Countdown Timer**: Shows time remaining until payment expires

3. **Real-time Status Polling**:
   - Polls payment status every 5 seconds
   - Automatically redirects on successful payment
   - Updates UI if payment details change (e.g., QR code loads)

4. **Copy-to-Clipboard**: Easy copying of VA numbers or payment codes

5. **Payment Instructions**: Step-by-step guide for each payment method

**Polling Logic**:
```typescript
// Poll for QR string if missing (QRIS)
if (paymentMethod === 'qris' && !qr_string) {
  poll /api/xendit/get-payment every 5s
}

// Poll for VA number if missing
if (paymentMethod.includes('Virtual Account') && !va_number) {
  poll /api/xendit/get-payment every 5s
}

// Poll for payment completion
if (status !== 'paid') {
  poll /api/xendit/get-payment every 5s
  if (status === 'paid') redirect to success page
}
```

### 7. Payment Processing (Customer Side)
**Customer Actions**:
1. **QRIS**: Scan QR code with any Indonesian e-wallet app, confirm payment
2. **Virtual Account**: Transfer exact amount to displayed VA number via bank
3. **E-Wallet**: Click payment button, authorize in wallet app
4. **OTC**: Visit store (e.g., Indomaret), provide payment code, pay cash

**Xendit Processing**:
- Receives payment from payment provider
- Updates payment status internally
- Sends webhook notification to our system

### 8. Payment Webhook Handling
**Location**: `api/xendit/webhook.ts`

**Process**:
1. Xendit sends POST request to `/api/xendit/webhook` with payment update
2. Backend verifies webhook signature/token for security
3. Extracts payment data:
   ```typescript
   {
     id: string,
     external_id: string,
     status: 'PAID' | 'SUCCEEDED' | 'SETTLED' | 'EXPIRED' | 'CANCELLED',
     paid_amount: number,
     paid_at: string
   }
   ```

4. Maps Xendit status to internal status:
   - `PAID/SUCCEEDED/SUCCESS` → `paid`
   - `SETTLED` → `completed`
   - `EXPIRED/CANCELLED` → `cancelled`

5. Updates order in database:
   - Sets `status` to mapped status
   - Records `paid_at` timestamp
   - Logs payment details

6. Creates admin notification for paid order

7. Sends WhatsApp notification to customer (if configured)

**Security**:
- Validates `x-callback-token` header
- Checks for duplicate webhook calls (idempotency)
- Logs all webhook events for audit

### 9. Payment Status Check
**Location**: `api/xendit/get-payment.ts`, `api/xendit/check-order-status.ts`

**Endpoints**:

1. **GET /api/xendit/get-payment?id={payment_id}**
   - Fetches current payment details from Xendit
   - Used for polling payment status
   - Returns latest payment information

2. **GET /api/xendit/check-order-status?external_id={external_id}**
   - Checks order status in database by external ID
   - Returns order details and payment status
   - Used for order tracking

### 10. Payment Completion & Redirect
**Location**: `src/pages/PaymentStatusPage.tsx`

**Success Flow**:
1. Payment interface detects payment completion via polling
2. Redirects to: `/payment-status?status=success&order_id={order_id}`
3. Success page displays:
   - Success message with animation
   - Order details (order ID, amount, payment method)
   - Next steps instructions
   - Contact information
   - Button to view order history

**Failure Flow**:
1. Payment expires or is cancelled
2. Redirects to: `/payment-status?status=failed&order_id={order_id}`
3. Failure page displays:
   - Failure reason
   - Order details
   - Option to retry payment
   - Contact support information

### 11. Order History & Tracking
**Location**: `src/pages/OrderHistoryPage.tsx`

**Features**:
- Lists all customer orders
- Filters by status (pending, paid, completed, cancelled)
- Shows order details on click
- Allows reordering for failed payments
- Displays payment receipts/invoices

## Services & Utilities

### Payment Services
- `src/services/paymentService.ts` - Frontend payment operations
- `src/services/xenditPaymentService.ts` - Xendit API integration
- `src/services/ordersService.ts` - Order CRUD operations
- `src/services/optimizedOrderService.ts` - Optimized order queries

### Configuration Files
- `api/_config/paymentChannels.ts` - Backend payment method config
- `src/config/paymentMethodConfig.ts` - Frontend payment method config
- `src/config/paymentChannels.ts` - Legacy config (backup)

## Testing

### Unit Tests
**Location**: `src/__tests__/paymentFlow.test.ts`

**Coverage**:
- Order creation validation
- Payment status updates
- Order status transitions
- Payment method support
- Error handling

### Integration Tests
**Location**: `scripts/test-purchase-flow.ps1`

**Usage**:
```powershell
# Test QRIS payment
.\scripts\test-purchase-flow.ps1 http://localhost:3000 qris

# Test BNI Virtual Account
.\scripts\test-purchase-flow.ps1 http://localhost:3000 bni

# Test on production
.\scripts\test-purchase-flow.ps1 https://www.jbalwikobra.com qris
```

**Test Flow**:
1. Creates test payment with specified method
2. Verifies payment creation response
3. Displays payment details (QR code, VA number, etc.)
4. Shows payment actions/URLs
5. Reports success or failure

### Manual Testing Checklist
- [ ] Product selection from catalog
- [ ] Checkout modal opens correctly
- [ ] Customer info form validates correctly
- [ ] Payment method selection works
- [ ] Order creates successfully
- [ ] Payment interface displays correctly
- [ ] QR code loads (for QRIS)
- [ ] VA number displays (for bank transfer)
- [ ] Payment instructions are clear
- [ ] Countdown timer works
- [ ] Status polling detects payment
- [ ] Success page displays correctly
- [ ] Order appears in history
- [ ] Admin receives notification
- [ ] Customer receives WhatsApp message

## Key Features

### 1. Mobile-First Design
- Responsive UI for all screen sizes
- Touch-friendly buttons and inputs
- Optimized for mobile e-wallet payments

### 2. Real-Time Updates
- Payment status polling every 5 seconds
- Automatic redirect on payment completion
- Live countdown timer

### 3. Error Recovery
- Missing QR code retry logic
- Missing VA number polling
- Clear error messages
- Retry payment options

### 4. Security
- Server-side payment validation
- Webhook signature verification
- No sensitive data in frontend
- Encrypted API communications

### 5. User Experience
- Clear step-by-step instructions
- Visual payment method icons
- Copy-to-clipboard functionality
- Progress indicators
- Loading states

## Known Issues & Considerations

1. **QR Code Loading Delay**: QRIS QR codes may take 2-5 seconds to generate, system polls for updates

2. **VA Number Availability**: Some bank VA numbers generate asynchronously, polling implemented

3. **Payment Expiry**: Payments typically expire in 24 hours, countdown timer alerts user

4. **Webhook Delays**: Xendit webhooks may have delays, frontend polling compensates

5. **Network Resilience**: System handles network failures gracefully with retry logic

## Future Improvements

1. **Payment Links**: Generate shareable payment links
2. **Recurring Payments**: Support subscription-based rentals
3. **Multi-Currency**: Support other currencies beyond IDR
4. **Payment Analytics**: Track conversion rates and popular methods
5. **One-Click Payments**: Save payment methods for faster checkout
6. **Split Payments**: Allow partial payments or installments
7. **Gift Cards**: Support voucher/promo codes
8. **3D Secure**: Enhanced security for card payments

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/xendit/create-invoice` | POST | Create order and payment invoice |
| `/api/xendit/create-direct-payment` | POST | Create direct payment (alternative) |
| `/api/xendit/get-payment` | GET | Fetch payment details by ID |
| `/api/xendit/check-order-status` | GET | Check order status by external ID |
| `/api/xendit/get-invoice-details` | GET | Get Xendit invoice details |
| `/api/xendit/webhook` | POST | Handle payment status webhooks |
| `/api/xendit/payment-methods` | GET | List available payment methods |

## Environment Variables

**Required for Payment Processing**:
```bash
# Backend (Private)
XENDIT_SECRET_KEY=xnd_development_...
XENDIT_CALLBACK_TOKEN=your_callback_token_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Frontend (Public)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

## Support & Troubleshooting

### Common Issues

**Issue**: Payment not detected after customer pays
**Solution**: Check webhook configuration in Xendit dashboard, verify callback token

**Issue**: QR code not displaying
**Solution**: Check payment status polling, verify QR string in payment data

**Issue**: Order not found
**Solution**: Verify external_id format, check database order records

**Issue**: Webhook authentication failed
**Solution**: Verify XENDIT_CALLBACK_TOKEN matches Xendit dashboard

### Debug Logging
- All payment operations log to console with prefixes: `[Payment]`, `[Webhook]`, `[Admin]`
- Webhook events logged in `api/xendit/webhook.ts`
- Payment polling logged in `src/pages/PaymentInterface.tsx`

### Contact
For issues related to:
- **Xendit integration**: Check Xendit dashboard and documentation
- **Database**: Review Supabase logs and query performance
- **Frontend bugs**: Check browser console for errors
- **Webhook issues**: Review webhook logs in Xendit dashboard

---

**Last Updated**: December 30, 2024
**Version**: 1.0.0
