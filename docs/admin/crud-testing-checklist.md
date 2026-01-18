# Admin Panel CRUD Operations - Testing Checklist

**Date**: December 30, 2025  
**Purpose**: Verify all CRUD operations work correctly after payment system changes

---

## 🔐 Prerequisites

1. **Admin Authentication**: Login as admin user
2. **Browser**: Open https://www.jbalwikobra.com/admin
3. **Network Tab**: Keep browser DevTools open to monitor API calls

---

## ✅ Testing Checklist

### 1. **Orders Management** (`/admin/orders`)

#### **READ (List Orders)**
- [ ] Navigate to Admin > Orders
- [ ] Verify orders table loads
- [ ] Check if recent orders display correctly
- [ ] Verify payment method shows correctly (especially QRIS)
- [ ] **API Call**: `/api/admin?action=orders`
- [ ] **Expected**: List of orders with all fields populated

#### **READ (Order Details)**
- [ ] Click on any order to view details
- [ ] Verify all order information displays
- [ ] Check payment status
- [ ] Check payment method details
- [ ] **Expected**: Complete order information

#### **UPDATE (Order Status)**
- [ ] Select an order with status "pending"
- [ ] Change status to "processing" or "completed"
- [ ] Click "Update Status" button
- [ ] **API Call**: `/api/admin?action=update-order`
- [ ] **Expected**: Status updates successfully
- [ ] **Verify**: Order status changed in list

#### **DELETE**
- [ ] ❌ Not implemented (intentionally - orders should not be deleted)

---

### 2. **Products Management** (`/admin/products`)

#### **CREATE (New Product)**
- [ ] Navigate to Admin > Products
- [ ] Click "Add New Product" or "Create Product" button
- [ ] Fill in product form:
  - Game Title
  - Product Name
  - Price
  - Category
  - Description
- [ ] Click "Save" or "Create"
- [ ] **API Call**: Direct Supabase call (no /api/admin endpoint)
- [ ] **Expected**: New product appears in list

#### **READ (List Products)**
- [ ] Verify products table loads
- [ ] Check pagination works
- [ ] Use filters (category, search)
- [ ] **API Call**: `/api/admin?action=products`
- [ ] **Expected**: List of products

#### **UPDATE (Edit Product)**
- [ ] Click "Edit" on any product
- [ ] Modify product details (name, price, etc.)
- [ ] Click "Save" or "Update"
- [ ] **API Call**: Direct Supabase call
- [ ] **Expected**: Product updates successfully
- [ ] **Verify**: Changes reflected in list

#### **DELETE (Soft Delete)**
- [ ] Click "Delete" or "Deactivate" on a product
- [ ] Confirm deletion
- [ ] **API Call**: Direct Supabase call (sets `is_active = false`)
- [ ] **Expected**: Product no longer appears in active list
- [ ] **Note**: This is soft delete, not permanent deletion

---

### 3. **Users Management** (`/admin/users`)

#### **READ (List Users)**
- [ ] Navigate to Admin > Users
- [ ] Verify users table loads
- [ ] Check user data displays correctly
- [ ] **API Call**: `/api/admin?action=users`
- [ ] **Expected**: List of registered users

#### **CREATE**
- [ ] ❌ Not available in admin (users self-register)

#### **UPDATE**
- [ ] ❌ Not implemented (admin cannot edit user data)
- [ ] **Note**: This should be added for admin role management

#### **DELETE**
- [ ] ❌ Not implemented (admin cannot delete users)
- [ ] **Note**: This should be added for account suspension

---

### 4. **Banners Management** (`/admin/banners`)

#### **CREATE (New Banner)**
- [ ] Navigate to Admin > Banners
- [ ] Click "Add Banner" button
- [ ] Fill in banner form:
  - Title
  - Image URL or upload
  - Link URL
  - Position/Order
- [ ] Click "Save"
- [ ] **API Call**: Direct Supabase call
- [ ] **Expected**: New banner appears in list

#### **READ (List Banners)**
- [ ] Verify banners table loads
- [ ] Check banner preview/images display
- [ ] **API Call**: Direct Supabase call
- [ ] **Expected**: List of banners

#### **UPDATE (Edit Banner)**
- [ ] Click "Edit" on any banner
- [ ] Modify banner details
- [ ] Click "Update"
- [ ] **API Call**: Direct Supabase call
- [ ] **Expected**: Banner updates successfully

#### **DELETE**
- [ ] Click "Delete" on a banner
- [ ] Confirm deletion
- [ ] **API Call**: Direct Supabase call
- [ ] **Expected**: Banner removed from list

---

### 5. **Flash Sales Management** (`/admin/flash-sales`)

#### **CREATE**
- [ ] Navigate to Admin > Flash Sales
- [ ] Click "Create Flash Sale" button
- [ ] Fill in flash sale form:
  - Product selection
  - Discount percentage
  - Start date/time
  - End date/time
- [ ] Click "Create"
- [ ] **Expected**: New flash sale created

#### **READ**
- [ ] Verify flash sales list loads
- [ ] Check active/upcoming/expired status
- [ ] **Expected**: List of flash sales

#### **UPDATE**
- [ ] Click "Edit" on a flash sale
- [ ] Modify details
- [ ] Click "Update"
- [ ] **Expected**: Flash sale updates

#### **DELETE**
- [ ] Click "Delete" on a flash sale
- [ ] Confirm deletion
- [ ] **Expected**: Flash sale removed

---

### 6. **Notifications Management** (`/admin/notifications`)

#### **CREATE (New Notification)**
- [ ] Navigate to Admin > Notifications
- [ ] Click "Create Notification" button
- [ ] Fill in notification form:
  - Title
  - Message
  - Type (info, warning, success, error)
  - Target users (all/specific)
- [ ] Click "Send" or "Create"
- [ ] **API Call**: `/api/admin-notifications`
- [ ] **Expected**: Notification created and sent

#### **READ**
- [ ] Verify notifications list loads
- [ ] Check notification history
- [ ] **Expected**: List of sent notifications

#### **UPDATE**
- [ ] ❌ Not implemented (notifications are immutable once sent)

#### **DELETE**
- [ ] Click "Delete" to remove notification from history
- [ ] **Expected**: Notification removed

---

### 7. **Settings Management** (`/admin/settings`)

#### **READ**
- [ ] Navigate to Admin > Settings
- [ ] Verify all settings load
- [ ] **Expected**: Website settings displayed

#### **UPDATE**
- [ ] Modify any setting (site name, contact info, etc.)
- [ ] Click "Save Settings"
- [ ] **API Call**: Direct Supabase call
- [ ] **Expected**: Settings saved successfully
- [ ] **Verify**: Changes reflected on public pages

---

## 🧪 Payment System Integration Tests

### After QRIS Payment Changes

#### **Test 1: View QRIS Order**
- [ ] Navigate to Admin > Orders
- [ ] Find an order with payment method "qris"
- [ ] Click to view order details
- [ ] **Verify**:
  - [ ] Payment method shows "QRIS"
  - [ ] Payment ID is displayed
  - [ ] Order status is correct
  - [ ] QR code reference (if stored)

#### **Test 2: Create Test QRIS Payment**
- [ ] Go to public website
- [ ] Create a test purchase with QRIS
- [ ] Complete payment (or leave pending)
- [ ] Go to Admin > Orders
- [ ] **Verify**:
  - [ ] Order appears in list
  - [ ] Payment method = "qris"
  - [ ] Payment ID matches
  - [ ] Status is correct

#### **Test 3: Update Order Status (QRIS)**
- [ ] In Admin > Orders, find QRIS order
- [ ] Update status from "pending" to "processing"
- [ ] Save changes
- [ ] **Verify**:
  - [ ] Status updates successfully
  - [ ] No errors related to payment method
  - [ ] Order history updated

#### **Test 4: Check Payment Data Integrity**
- [ ] Open browser DevTools > Network tab
- [ ] Navigate to Admin > Orders
- [ ] Inspect API response for orders with QRIS
- [ ] **Verify JSON structure**:
  ```json
  {
    "id": "...",
    "payment_method": "qris",
    "payment_channel": "qris",
    "xendit_invoice_id": "qr_...",
    "status": "...",
    "amount": 10000,
    ...
  }
  ```

---

## 🔍 Database Checks

### Verify Payment Records

```sql
-- Check payments table has QRIS records
SELECT id, xendit_id, payment_method, status, 
       payment_data->'qr_string' as has_qr_code
FROM payments 
WHERE payment_method = 'qris' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check orders table has QRIS orders
SELECT id, xendit_invoice_id, payment_method, payment_channel, status
FROM orders 
WHERE payment_method = 'xendit' 
  AND payment_channel LIKE '%qris%'
ORDER BY created_at DESC 
LIMIT 5;

-- Verify new QR Code API payments
SELECT id, xendit_id, payment_method, 
       LENGTH(payment_data->'qr_string') as qr_length,
       created_at
FROM payments 
WHERE xendit_id LIKE 'qr_%'
ORDER BY created_at DESC 
LIMIT 5;
```

---

## ✅ Success Criteria

All checkboxes above should be checked (✅) for CRUD operations to be considered working.

### Priority Tests:
1. **HIGH**: Orders READ and UPDATE
2. **HIGH**: Products CREATE, READ, UPDATE
3. **MEDIUM**: Banners CRUD
4. **MEDIUM**: Flash Sales CRUD
5. **LOW**: Users READ (UPDATE/DELETE not critical for now)

---

## 🐛 Issues to Report

If any test fails, document:
1. **Which operation failed** (Create, Read, Update, Delete)
2. **Which page/entity** (Orders, Products, etc.)
3. **Error message** (from UI or browser console)
4. **API call details** (endpoint, status code, response)
5. **Steps to reproduce**

---

## 📝 Notes

- **Authentication Required**: All tests require admin login
- **Service Role Key**: Backend uses Supabase service role key for admin operations
- **Direct DB Access**: Some operations bypass API and use direct Supabase calls
- **Soft Deletes**: Products use soft delete (is_active = false)
- **No Order Deletion**: Orders cannot be deleted (by design)
- **No User Editing**: Admins cannot edit user profiles (should be added)

---

## 🎯 Next Steps

After completing this checklist:

1. **Document Failures**: Create issues for any failed tests
2. **Review Security**: Ensure admin auth is properly enforced
3. **Add Missing Features**: Implement missing UPDATE/DELETE operations where needed
4. **Automate Tests**: Create automated test suite for admin CRUD operations
