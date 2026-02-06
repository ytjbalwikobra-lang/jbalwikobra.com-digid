# QA Release Candidate Test Plan
## Admin Panel - 18 Defect Fixes Verification

**Date:** February 6, 2026  
**Version:** RC1  
**Tester:** _________________

---

## Pre-Test Setup

1. Start local development server:
   ```powershell
   vercel dev --listen 3000
   ```
2. Navigate to `http://localhost:3000/auth`
3. Log in with admin credentials
4. Open browser DevTools → Console (watch for `[AUTH DEBUG]` messages)
5. Verify you see: `[AUTH DEBUG] ✅ User authenticated successfully`

---

## PHASE 1: CRITICAL FIXES (4 Tests)

### Test 1: Admin Modal Padding Consistency
| Field | Value |
|-------|-------|
| **File** | `AdminModal.tsx` |
| **Fix** | py-5 → py-4 (4px grid alignment) |
| **Steps** | 1. Go to **Admin > Users** <br> 2. Click any **Edit** button <br> 3. Inspect the modal header/footer padding |
| **Expected** | Modal header and footer have consistent `py-4` (16px) padding. No 20px padding visible. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 2: Image Upload Memory Leak Fix
| Field | Value |
|-------|-------|
| **File** | `AdminImageUpload.tsx` |
| **Fix** | Added `URL.revokeObjectURL()` cleanup |
| **Steps** | 1. Go to **Admin > Products** <br> 2. Click **Add Product** or **Edit** an existing product <br> 3. Upload an image <br> 4. Upload a different image (replacing the first) <br> 5. Repeat 3-4 times |
| **Expected** | No memory errors in console. Image previews update cleanly. Check DevTools Memory tab shows no blob URL leaks. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 3: User Modal - Name Validation
| Field | Value |
|-------|-------|
| **File** | `AdminUserModal.tsx` |
| **Fix** | Name field validation (required, 2+ chars) |
| **Steps** | 1. Go to **Admin > Users** <br> 2. Click **Edit** on any user <br> 3. Clear the **Name** field completely <br> 4. Click **Save** |
| **Expected** | Save is **blocked**. Error message appears: "Full name must be at least 2 characters" |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 4: User Modal - Phone Input & Dirty State
| Field | Value |
|-------|-------|
| **File** | `AdminUserModal.tsx` |
| **Fix** | PhoneInput component with E.164 formatting, dirty state tracking |
| **Steps** | 1. Go to **Admin > Users** <br> 2. Click **Edit** on any user <br> 3. Verify phone field uses proper input with country code <br> 4. Make NO changes, click **Save** <br> 5. Change name, verify **Save** button enables <br> 6. Change phone number, verify it saves in E.164 format |
| **Expected** | - Phone input shows country selector (🇮🇩 +62 default) <br> - Save is disabled when no changes made (dirty state) <br> - Phone saves as E.164 format (e.g., `+628123456789`) |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## PHASE 2: VISUAL & UX FIXES (6 Tests)

### Test 5: Users Table - Stats from API
| Field | Value |
|-------|-------|
| **File** | `AdminUsersV2.tsx` |
| **Fix** | Stats fetched from API, not calculated client-side |
| **Steps** | 1. Go to **Admin > Users** <br> 2. Check the stats cards at the top (Total Users, Verified, Admins, etc.) <br> 3. Open DevTools Network tab <br> 4. Refresh page, look for `/api/admin/users-stats` call |
| **Expected** | Stats cards show real data from API. Network shows successful API call for stats. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 6: Users Table - Text Truncation
| Field | Value |
|-------|-------|
| **File** | `AdminUsersV2.tsx` |
| **Fix** | Added `truncate` class to prevent overflow |
| **Steps** | 1. Go to **Admin > Users** <br> 2. Find or create a user with a very long name/email <br> 3. Resize browser window narrower |
| **Expected** | Long text truncates with ellipsis (`...`). Table columns don't overflow or break layout. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 7: Users Table - Pagination Buttons
| Field | Value |
|-------|-------|
| **File** | `AdminUsersV2.tsx` |
| **Fix** | Pagination buttons properly disabled at boundaries |
| **Steps** | 1. Go to **Admin > Users** <br> 2. If you have 10+ users, navigate to page 1 <br> 3. Check "Previous" button state <br> 4. Navigate to last page <br> 5. Check "Next" button state |
| **Expected** | - "Previous" button disabled on page 1 <br> - "Next" button disabled on last page <br> - Buttons have proper disabled styling |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 8: Orders Table - Text Truncation
| Field | Value |
|-------|-------|
| **File** | `AdminOrdersV2.tsx` |
| **Fix** | Added `truncate` class to columns |
| **Steps** | 1. Go to **Admin > Orders** <br> 2. Find/verify orders with long customer names or addresses <br> 3. Resize browser window narrower |
| **Expected** | Long text truncates with ellipsis. Table maintains proper layout. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 9: Orders Table - English Labels
| Field | Value |
|-------|-------|
| **File** | `AdminOrdersV2.tsx` |
| **Fix** | Replaced Indonesian text with English |
| **Steps** | 1. Go to **Admin > Orders** <br> 2. Check all column headers and UI labels |
| **Expected** | All text is in English. No Indonesian like "Pelanggan", "Tanggal", etc. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 10: WhatsApp Settings - Grid Spacing
| Field | Value |
|-------|-------|
| **File** | `AdminWhatsAppSettings.tsx` |
| **Fix** | 4px grid alignment (p-4, p-6, gap-4, gap-6) |
| **Steps** | 1. Go to **Admin > WhatsApp Settings** <br> 2. Inspect padding and gaps visually <br> 3. Resize window to check responsive behavior |
| **Expected** | Consistent 4px grid spacing (16px, 24px). No odd padding values like 20px. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## PHASE 3: CONSISTENCY & ERROR HANDLING (8 Tests)

### Test 11: Notification Panel Padding
| Field | Value |
|-------|-------|
| **File** | `AdminNotificationPanel.tsx` |
| **Fix** | p-5 → p-4 |
| **Steps** | 1. Go to any Admin page <br> 2. Trigger a notification (e.g., save a user) <br> 3. Inspect notification panel padding |
| **Expected** | Notification panel uses `p-4` (16px) padding, consistent with design system. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 12: Products Table - Stock Input Validation
| Field | Value |
|-------|-------|
| **File** | `ProductsTable.tsx` |
| **Fix** | type="number" min="0" on stock input |
| **Steps** | 1. Go to **Admin > Products** <br> 2. Find the inline stock edit field <br> 3. Try to enter "-5" in the stock field <br> 4. Try to enter "abc" in the stock field |
| **Expected** | - Cannot enter negative numbers (min="0") <br> - Cannot enter text (type="number") <br> - Only accepts 0 or positive integers |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 13: Banners Page - Error State Wrapper
| Field | Value |
|-------|-------|
| **File** | `AdminBanners.tsx` |
| **Fix** | Added AdminErrorState wrapper |
| **Steps** | 1. Go to **Admin > Banners** <br> 2. Temporarily disconnect network (DevTools > Network > Offline) <br> 3. Refresh the page <br> 4. Reconnect network |
| **Expected** | Shows `AdminErrorState` component with retry button, not white screen or unhandled error. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 14: Flash Sales Page - Error State Wrapper
| Field | Value |
|-------|-------|
| **File** | `AdminFlashSales.tsx` |
| **Fix** | Added AdminErrorState wrapper |
| **Steps** | 1. Go to **Admin > Flash Sales** <br> 2. Temporarily disconnect network <br> 3. Refresh the page |
| **Expected** | Shows `AdminErrorState` component with retry button. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 15: Products Direct Page - Error State Wrapper
| Field | Value |
|-------|-------|
| **File** | `AdminProductsDirect.tsx` |
| **Fix** | Added AdminErrorState wrapper |
| **Steps** | 1. Go to **Admin > Products (Direct)** <br> 2. Temporarily disconnect network <br> 3. Refresh the page |
| **Expected** | Shows `AdminErrorState` component with retry button. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 16: Settings Page - Error State Wrapper
| Field | Value |
|-------|-------|
| **File** | `AdminSettings.tsx` |
| **Fix** | Added AdminErrorState wrapper |
| **Steps** | 1. Go to **Admin > Settings** <br> 2. Temporarily disconnect network <br> 3. Refresh the page |
| **Expected** | Shows `AdminErrorState` component with retry button. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 17: Overall Padding Consistency Check
| Field | Value |
|-------|-------|
| **Files** | All admin pages |
| **Fix** | Design system compliance (4px grid) |
| **Steps** | 1. Navigate through all admin pages: Users, Orders, Products, Settings, WhatsApp, Banners, Flash Sales <br> 2. Visually check spacing consistency |
| **Expected** | All pages use consistent padding (p-4, p-6). No visible spacing inconsistencies. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

### Test 18: Build Verification
| Field | Value |
|-------|-------|
| **Files** | All |
| **Fix** | No TypeScript/ESLint errors |
| **Steps** | 1. Run `npm run build` <br> 2. Check for any errors |
| **Expected** | Build completes successfully with no errors. |
| **Pass/Fail** | ☐ Pass ☐ Fail |
| **Notes** | |

---

## Test Summary

| Phase | Tests | Passed | Failed |
|-------|-------|--------|--------|
| Phase 1 (Critical) | 4 | ___ | ___ |
| Phase 2 (Visual/UX) | 6 | ___ | ___ |
| Phase 3 (Consistency) | 8 | ___ | ___ |
| **TOTAL** | **18** | ___ | ___ |

---

## Sign-off

- [ ] All 18 tests passed
- [ ] No console errors observed
- [ ] Build successful
- [ ] Ready for production deployment

**Tester Signature:** _________________  
**Date:** _________________

---

## Post-Testing: Remove Debug Logs

After testing, remove the debug logging from `TraditionalAuthContext.tsx`:
1. Search for `[AUTH DEBUG]` in the file
2. Remove all console.log statements containing `[AUTH DEBUG]`
3. Verify build still passes
