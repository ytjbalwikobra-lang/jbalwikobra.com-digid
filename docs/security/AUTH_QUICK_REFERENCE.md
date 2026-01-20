# 🚀 Auth System - Quick Reference Guide

## 📁 File Structure

```
Authentication System
├── Backend (API)
│   ├── api/auth.ts                    ⭐ Main auth endpoint
│   ├── api/_middleware/authMiddleware.ts  ⭐ Admin auth validation
│   └── api/_utils/validation.ts       ✨ NEW - Input validation
│
├── Frontend (Services)
│   ├── src/services/authService.ts    ⭐ SINGLE SOURCE OF TRUTH
│   ├── src/utils/auth.ts              ⚠️ Deprecated (use authService)
│   └── src/contexts/TraditionalAuthContext.tsx
│
└── Documentation
    └── docs/security/AUTH_REVAMP_2026-01-20.md
```

## 🎯 Which File to Use?

### For Client-Side Auth Operations
**Use:** `src/services/authService.ts`

```typescript
import { 
  isLoggedIn, 
  isAdmin, 
  getCurrentUserProfile, 
  getAuthUserId, 
  getUserRole,
  logout 
} from '../services/authService';

// Check if user is logged in
const loggedIn = await isLoggedIn();

// Check if user is admin
const admin = await isAdmin();

// Get user profile
const profile = await getCurrentUserProfile();

// Logout
await logout();
```

### For API Input Validation
**Use:** `api/_utils/validation.ts`

```typescript
import { 
  isValidEmail, 
  isValidPhone, 
  isValidPassword,
  sanitizeString 
} from './_utils/validation.js';

// Validate email
if (!isValidEmail(email)) {
  return res.status(400).json({ error: 'Invalid email' });
}

// Validate password
const validation = isValidPassword(password);
if (!validation.valid) {
  return res.status(400).json({ error: validation.errors[0] });
}

// Sanitize input
const safeName = sanitizeString(name, 100);
```

### For Admin Auth Protection
**Use:** `api/_middleware/authMiddleware.ts`

```typescript
import { validateAdminAuth } from './_middleware/authMiddleware';

// In your API handler
const auth = await validateAdminAuth(req);
if (!auth.valid) {
  return res.status(401).json({ error: auth.error });
}

// Access user info
console.log(auth.userId, auth.userEmail, auth.isAdmin);
```

## 🔐 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 requests | 1 minute |
| Signup | 3 requests | 1 minute |
| Verify Phone | 5 requests | 1 minute |
| Validate Session | 20 requests | 1 minute |
| Logout | 10 requests | 1 minute |
| Others | 10 requests | 1 minute |

## 📊 Performance Tips

### ✅ DO
```typescript
// Use batch reads
const { token, userData, expires } = getAuthDataBatch();

// Check cache before API calls
const cached = await isLoggedIn(); // Uses 10s cache

// Select only needed fields in queries
.select('id, email, name, is_admin')
```

### ❌ DON'T
```typescript
// Don't make repeated localStorage calls
const token = localStorage.getItem('session_token');
const user = localStorage.getItem('user_data');
const expires = localStorage.getItem('session_expires');

// Don't use SELECT *
.select('*')

// Don't skip validation
const email = req.body.email; // ❌ No validation
```

## 🐛 Common Issues & Solutions

### Issue: "Rate limit exceeded"
**Solution:** Wait 60 seconds or implement exponential backoff

### Issue: "Session expired"
**Solution:** Call logout() and redirect to login

### Issue: "Invalid credentials"
**Solution:** Generic error - check both email/phone and password

### Issue: Cache shows stale data
**Solution:** Cache TTL is 10s - wait or clear cache manually

## 📞 Quick Commands

```bash
# Check for errors
npm run lint

# Run tests
npm test

# Build
npm run build

# Deploy
vercel --prod
```

## 🎓 Learning Resources

- [Full Documentation](../security/AUTH_REVAMP_2026-01-20.md)
- [Architecture Docs](../architecture/authentication-profile.md)
- [Admin Panel Security](../admin/panel-phase1-implementation.md)

## ⚡ Quick Examples

### Example 1: Protected Route
```typescript
// In your component
import { isAdmin } from '../services/authService';

useEffect(() => {
  const checkAuth = async () => {
    const admin = await isAdmin();
    if (!admin) {
      navigate('/login');
    }
  };
  checkAuth();
}, []);
```

### Example 2: API with Admin Protection
```typescript
import { validateAdminAuth } from './_middleware/authMiddleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await validateAdminAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }
  
  // Your protected logic here
}
```

### Example 3: Form with Validation
```typescript
import { isValidEmail, isValidPhone } from '../_utils/validation';

const handleSubmit = () => {
  if (!isValidEmail(email)) {
    setError('Invalid email format');
    return;
  }
  
  if (!isValidPhone(phone)) {
    setError('Invalid phone number');
    return;
  }
  
  // Submit form
};
```

---

**Last Updated:** January 20, 2026  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
