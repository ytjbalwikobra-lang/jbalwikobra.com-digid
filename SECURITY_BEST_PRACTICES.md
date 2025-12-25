# 🔒 Security Best Practices Guide
**Last Updated:** December 25, 2024  
**Purpose:** Maintain secure coding practices and protect user data

---

## 🎯 Core Security Principles

1. **Never trust user input** - Always validate and sanitize
2. **Principle of least privilege** - Grant minimum required permissions
3. **Defense in depth** - Multiple layers of security
4. **Fail securely** - Errors should not expose sensitive information
5. **Keep secrets secret** - Never commit credentials

---

## 🔐 Authentication & Authorization

### Password Security
```typescript
// ✅ GOOD - Use bcrypt with proper salt rounds
import bcrypt from 'bcryptjs';

const saltRounds = 10; // Minimum 10, 12 recommended
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verify password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### Session Management
```typescript
// ✅ GOOD - Generate secure random tokens
import crypto from 'crypto';

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 character hex string
}

// Set appropriate expiry
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
```

### Authorization Checks
```typescript
// ✅ GOOD - Always check permissions
async function deleteOrder(userId: string, orderId: string) {
  // Verify user owns the order
  const order = await getOrder(orderId);
  if (order.user_id !== userId && !isAdmin(userId)) {
    throw new Error('Unauthorized');
  }
  
  // Proceed with deletion
  await supabase.from('orders').delete().eq('id', orderId);
}
```

---

## 🛡️ Input Validation & Sanitization

### Always Validate Input
```typescript
// ✅ GOOD - Validate all inputs
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePhone(phone: string): boolean {
  // Indonesian phone format
  const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
  return phoneRegex.test(phone);
}

// In API handler
if (!validateEmail(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
```

### Sanitize HTML Input
```typescript
// ✅ GOOD - Sanitize user-generated content
function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Or use a library
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

### SQL Injection Prevention
```typescript
// ✅ GOOD - Use parameterized queries (Supabase handles this)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail); // Safely parameterized

// ❌ BAD - Never construct raw SQL from user input
// const query = `SELECT * FROM users WHERE email = '${userEmail}'`; // VULNERABLE!
```

---

## 🔑 Environment Variables & Secrets

### Managing Secrets
```bash
# ✅ GOOD - Use .env files (never commit)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
XENDIT_SECRET_KEY=xnd_xxx...

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### Environment Variable Usage
```typescript
// ✅ GOOD - Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing required environment variables');
}

// ❌ BAD - Never log secrets
// console.log('API Key:', SUPABASE_KEY); // DON'T DO THIS!
```

### Client vs Server Secrets
```typescript
// ✅ GOOD - Separate public and private keys
// Client-side (public)
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Server-side only (private)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Never expose service role key to client!
```

---

## 🌐 API Security

### Rate Limiting
```typescript
// ✅ GOOD - Implement rate limiting
const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT = 60; // 60 calls per window

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    rateMap.set(key, { count: 1, ts: now });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }
  
  entry.count++;
  return true;
}
```

### CORS Configuration
```typescript
// ✅ GOOD - Restrict CORS to known origins
const allowedOrigins = [
  'https://jbalwikobra.com',
  'https://www.jbalwikobra.com',
  // Add staging/dev as needed
];

export function corsHeaders(origin?: string) {
  if (origin && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }
  return {};
}
```

### Request Validation
```typescript
// ✅ GOOD - Validate request structure
interface CreateOrderRequest {
  product_id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
}

function validateCreateOrderRequest(body: any): body is CreateOrderRequest {
  return (
    typeof body.product_id === 'string' &&
    typeof body.customer_name === 'string' &&
    validateEmail(body.customer_email) &&
    typeof body.amount === 'number' &&
    body.amount > 0
  );
}

// In API handler
if (!validateCreateOrderRequest(req.body)) {
  return res.status(400).json({ error: 'Invalid request body' });
}
```

---

## 💳 Payment Security

### Webhook Verification
```typescript
// ✅ GOOD - Verify webhook signatures
import crypto from 'crypto';

function verifyXenditWebhook(
  callbackToken: string,
  receivedToken: string
): boolean {
  return callbackToken === receivedToken;
}

// In webhook handler
const receivedToken = req.headers['x-callback-token'];
if (!verifyXenditWebhook(XENDIT_CALLBACK_TOKEN, receivedToken)) {
  return res.status(401).json({ error: 'Invalid webhook signature' });
}
```

### PCI Compliance
```typescript
// ✅ GOOD - Never store sensitive payment data
// Let payment processor handle:
// - Credit card numbers
// - CVV codes
// - Card expiry dates

// Only store:
// - Payment method type (e.g., "QRIS", "BCA")
// - Transaction ID from payment processor
// - Payment status
```

---

## 🗄️ Database Security

### Row-Level Security (RLS)
```sql
-- ✅ GOOD - Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can see all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

### Query Optimization (Security Aspect)
```typescript
// ✅ GOOD - Fetch only necessary data
const { data } = await supabase
  .from('users')
  .select('id, email, name') // Don't include password_hash!
  .eq('id', userId);

// ❌ BAD - Exposing sensitive data
// .select('*') // Might include password_hash, tokens, etc.
```

---

## 🔍 Security Headers

### Set Security Headers
```typescript
// ✅ GOOD - Add security headers
export function setSecurityHeaders(res: VercelResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
}
```

---

## 📝 Logging & Monitoring

### Safe Logging
```typescript
// ✅ GOOD - Log without sensitive data
console.log('User login attempt:', {
  email: email,
  timestamp: new Date().toISOString(),
  ip: req.ip,
  // DON'T log: password, tokens, session IDs
});

// ❌ BAD - Logging sensitive data
// console.log('Login:', { email, password }); // NEVER DO THIS!
```

### Error Handling
```typescript
// ✅ GOOD - Don't expose internal errors
try {
  // ... operation ...
} catch (error) {
  console.error('Internal error:', error); // Log for debugging
  
  // Return generic message to user
  return res.status(500).json({
    error: 'An error occurred. Please try again later.'
  });
  // DON'T return: error.message, stack traces, etc.
}
```

---

## 🧪 Security Testing

### Regular Security Audits
```bash
# Run npm audit regularly
npm audit

# Fix vulnerabilities
npm audit fix

# For breaking changes (test thoroughly!)
npm audit fix --force
```

### Penetration Testing Checklist
- [ ] SQL Injection attempts
- [ ] XSS attacks
- [ ] CSRF attacks
- [ ] Authentication bypass
- [ ] Authorization bypass
- [ ] Rate limiting effectiveness
- [ ] Input validation
- [ ] API security

---

## 🚨 Incident Response

### If Security Breach Detected:

1. **Immediate Actions**
   - Disable compromised accounts
   - Rotate all secrets/API keys
   - Block suspicious IPs
   - Enable additional logging

2. **Investigation**
   - Review access logs
   - Identify scope of breach
   - Document timeline
   - Preserve evidence

3. **Communication**
   - Notify affected users
   - Report to authorities (if required)
   - Update status page
   - Internal team briefing

4. **Remediation**
   - Fix vulnerability
   - Deploy patch
   - Verify fix
   - Update documentation

5. **Post-Incident**
   - Write post-mortem
   - Update security practices
   - Implement prevention measures
   - Train team

---

## 📚 Security Resources

### Tools
- [OWASP ZAP](https://www.zaproxy.org/) - Security scanner
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency scanning
- [Snyk](https://snyk.io/) - Vulnerability scanning

### Guidelines
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Security Headers](https://securityheaders.com/)

### Training
- OWASP WebGoat
- HackerOne CTF
- PentesterLab

---

## ✅ Security Checklist for New Features

Before deploying new features:
- [ ] Input validation implemented
- [ ] Authentication required (if needed)
- [ ] Authorization checks in place
- [ ] No secrets in code
- [ ] Sensitive data encrypted
- [ ] Rate limiting added
- [ ] Security headers set
- [ ] Error messages don't expose internals
- [ ] Logging doesn't include sensitive data
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protection (if needed)
- [ ] Security testing performed

---

**Last Review:** December 25, 2024  
**Next Review:** Monthly  
**Owner:** Security Team / Engineering Lead
