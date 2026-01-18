# 🔐 Secret Management Guidelines

This document provides comprehensive guidelines for managing API keys, tokens, and other sensitive information in the JB Alwikobra E-commerce project.

## 🚨 Critical Security Rules

### **NEVER commit secrets to Git**
- ✅ Use environment variables for all sensitive data
- ❌ Never hardcode API keys, tokens, or passwords in source code
- ❌ Never commit real secrets in example files
- ❌ Never share sensitive credentials in comments or documentation

### **Use proper environment variable patterns**
```typescript
// ✅ CORRECT - Use environment variables
const API_KEY = process.env.XENDIT_SECRET_KEY;
if (!API_KEY) {
  throw new Error('XENDIT_SECRET_KEY environment variable is required');
}

// ❌ WRONG - Hardcoded secret
const API_KEY = 'xnd_production_abc123def456...';
```

## 📋 Environment Variable Naming Convention

### **Frontend Variables (Public)**
These are exposed to the browser and should only contain non-sensitive configuration:
```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_XENDIT_PUBLIC_KEY=xnd_public_...
REACT_APP_WHATSAPP_NUMBER=628xxxxxxxxxx
REACT_APP_SITE_NAME="JB Alwikobra"
REACT_APP_SITE_URL=https://your-domain.com
```

### **Backend Variables (Private)**
These are server-side only and can contain sensitive information:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
XENDIT_SECRET_KEY=xnd_development_or_production_secret_key
XENDIT_CALLBACK_TOKEN=your_xendit_callback_token
WHATSAPP_API_KEY=your_whatsapp_api_key_here
WHATSAPP_GROUP_ID=your_group_id@g.us
```

## 🔧 Setup Instructions

### **1. Local Development Setup**
```bash
# 1. Copy the template
cp .env.template .env

# 2. Fill in your actual API keys
nano .env  # or use your preferred editor

# 3. Never commit the .env file
git status  # Should show .env is ignored
```

### **2. Production Deployment Setup**

#### **Vercel Deployment**
```bash
# Set environment variables in Vercel dashboard
vercel env add XENDIT_SECRET_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add WHATSAPP_API_KEY

# Or use CLI
vercel env add XENDIT_SECRET_KEY production
```

#### **Other Platforms**
- **Netlify**: Dashboard → Site Settings → Environment Variables
- **Heroku**: Dashboard → Settings → Config Vars
- **Railway**: Dashboard → Variables tab
- **AWS**: Use AWS Systems Manager Parameter Store or Secrets Manager

### **3. CI/CD Pipeline Setup**
```yaml
# GitHub Actions example
env:
  XENDIT_SECRET_KEY: ${{ secrets.XENDIT_SECRET_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## 🛡️ API Key Management by Service

### **Xendit (Payment Gateway)**
```bash
# Public key (safe for frontend)
REACT_APP_XENDIT_PUBLIC_KEY=xnd_public_development_...

# Secret key (backend only)
XENDIT_SECRET_KEY=xnd_development_...

# Callback token (webhook security)
XENDIT_CALLBACK_TOKEN=your_callback_token_here
```

**Security Notes:**
- Public keys can be exposed in frontend code
- Secret keys must NEVER be in frontend code
- Use different keys for development/production
- Rotate keys regularly (quarterly recommended)

### **Supabase (Database)**
```bash
# Anonymous key (safe for frontend)
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (backend only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Security Notes:**
- Anon keys are protected by Row Level Security (RLS)
- Service role keys bypass RLS - use carefully
- Never expose service role keys to frontend

### **WhatsApp API (Notifications)**
```bash
# API key for WhatsApp service
WHATSAPP_API_KEY=your_api_key_here

# Group ID for notifications
WHATSAPP_GROUP_ID=120363421819020887@g.us
```

**Security Notes:**
- API keys control message sending capabilities
- Group IDs should be treated as sensitive
- Monitor usage for unusual activity

## 📁 File Structure and Examples

### **Required Files**
```
.env.template    # Safe template with placeholders
.env.example     # Safe example with fake values
.env            # Your actual secrets (git-ignored)
.gitignore      # Must include .env
```

### **.env.template Example**
```bash
# Frontend Configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend Configuration  
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
XENDIT_SECRET_KEY=xnd_development_or_production_secret_key_here
```

### **.gitignore Requirements**
```bash
# Environment files
.env
.env.local
.env.*.local

# Never ignore these
!.env.template
!.env.example
```

## 🔍 Security Monitoring

### **Automated Scanning**
Our GitHub Actions workflow automatically scans for:
- ✅ Hardcoded API keys in source code
- ✅ JWT tokens in files
- ✅ Real secrets in example files
- ✅ Dependency vulnerabilities
- ✅ Code security issues

### **Manual Checks**
Regularly verify:
```bash
# Check for potential secrets in code
grep -r -E "(sk_|pk_|xnd_)[a-zA-Z0-9_-]{20,}" src/ api/

# Check for hardcoded URLs
grep -r -E "https://[a-zA-Z0-9-]+\.supabase\.co" src/ api/

# Verify .env is ignored
git check-ignore .env
```

## 🚨 Incident Response

### **If a Secret is Compromised:**

1. **Immediate Actions:**
   ```bash
   # 1. Revoke the compromised key immediately
   # 2. Generate new keys
   # 3. Update environment variables
   # 4. Force-push to remove from Git history (if committed)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Update all deployments:**
   - Update production environment variables
   - Restart all services
   - Monitor for unauthorized usage

3. **Audit and documentation:**
   - Document the incident
   - Review how it happened
   - Update procedures to prevent recurrence

### **Recovery Checklist:**
- [ ] Revoke compromised credentials
- [ ] Generate new credentials
- [ ] Update all environments
- [ ] Remove from Git history if needed
- [ ] Monitor for unauthorized usage
- [ ] Document incident and lessons learned

## 📚 Best Practices Summary

### **Development**
- ✅ Use `.env.template` for onboarding new developers
- ✅ Validate environment variables on startup
- ✅ Use different keys for dev/staging/production
- ✅ Implement graceful error handling for missing keys

### **Deployment**
- ✅ Use platform-specific secret management
- ✅ Automate secret rotation where possible
- ✅ Monitor secret usage and access logs
- ✅ Regular security audits

### **Team Management**
- ✅ Limit access to production secrets
- ✅ Use role-based access control
- ✅ Regular security training
- ✅ Document all secret management procedures

## 🔗 Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Xendit Security Best Practices](https://docs.xendit.co/api-reference/security/)
- [Supabase Security Guide](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

## 📞 Support

For security-related questions or to report potential vulnerabilities:
- Create a GitHub issue (for general questions)
- Contact the development team directly (for sensitive issues)

---

**Remember: Security is everyone's responsibility. When in doubt, choose the more secure option.**