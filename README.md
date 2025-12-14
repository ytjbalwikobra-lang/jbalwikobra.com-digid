# JB Alwikobra E-commerce

A modern e-commerce platform for gaming account sales and rentals, built with React, TypeScript, and Supabase.

## 📊 System Health Status

**Last Updated:** December 14, 2024  
**Overall Health:** 7.2/10

| Category | Status | Score | Priority Actions |
|----------|--------|-------|-----------------|
| Security | ⚠️ Needs Attention | 6.5/10 | Fix 25 vulnerabilities |
| Performance | ⚠️ Needs Attention | 5.8/10 | Optimize 56+ queries |
| Code Quality | ✅ Good | 7.8/10 | Enable strict mode |
| Architecture | ✅ Good | 8.2/10 | Reduce service duplication |

📖 **[View Full Analysis Report](./SYSTEM_ANALYSIS_REPORT.md)** | 🎯 **[See Action Plan](./RECOMMENDATIONS_AND_ACTION_PLAN.md)** | ⚡ **[Quick Start](./QUICK_START_IMMEDIATE_ACTIONS.md)**

---

## Features

- 🎮 Gaming account marketplace
- 💳 Secure payment processing with Xendit
- 📱 WhatsApp integration for notifications
- 🔐 Multi-layer authentication system
- 📊 Admin dashboard for order management
- 🚀 Real-time updates and notifications

## 🔐 Security & Environment Setup

### Quick Start
```bash
# 1. Clone the repository
git clone <repository-url>
cd jb-alwikobra-ecommerce

# 2. Set up environment variables
cp .env.template .env
# Edit .env with your actual API keys

# 3. Install dependencies
npm install

# 4. Validate security configuration
node scripts/validate-env-security.js

# 5. Start development server
npm start
```

### Environment Configuration

This project uses environment variables for all sensitive configuration. **Never commit real API keys to Git.**

#### Required Environment Variables

**Frontend (Public - exposed to browser):**
```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_XENDIT_PUBLIC_KEY=xnd_public_development_...
REACT_APP_SITE_NAME=JB Alwikobra
REACT_APP_SITE_URL=https://your-domain.com
REACT_APP_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
```

**Backend (Private - server-side only):**
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
XENDIT_SECRET_KEY=xnd_development_...
XENDIT_CALLBACK_TOKEN=your_callback_token_here
WHATSAPP_API_KEY=your_whatsapp_api_key_here
TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here
```

#### Environment Files
- `.env.template` - Safe template with placeholders
- `.env.example` - Example with safe dummy values
- `.env.development.template` - Development-specific template
- `.env.production.template` - Production-specific template
- `.env` - Your actual secrets (git-ignored)

### Security Features

#### Automated Security Scanning
This repository includes GitHub Actions workflows that automatically:
- 🔍 Scan for exposed secrets in code and files
- 🛡️ Check dependencies for vulnerabilities
- 🔐 Validate environment file security
- 📊 Run CodeQL security analysis

#### Environment Security Validation
Run the security validator to check your configuration:
```bash
node scripts/validate-env-security.js
```

This script checks for:
- ✅ Required environment variables are set
- ✅ No real secrets in example files
- ✅ Proper .gitignore configuration
- ✅ No hardcoded secrets in source code

#### Security Best Practices Applied
- 🔒 All API keys stored in environment variables
- 🚫 No hardcoded secrets in source code
- 🛡️ Environment files properly git-ignored
- 📋 Template system for safe onboarding
- 🔍 Automated secret scanning in CI/CD
- ⚡ Graceful error handling for missing keys

### Deployment Security

#### Production Checklist
- [ ] Set environment variables in deployment platform
- [ ] Use production API keys (not development)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure proper CORS policies
- [ ] Run security validation: `node scripts/validate-env-security.js`
- [ ] Monitor deployment for security alerts

#### Cloudflare Turnstile Configuration

This application includes Cloudflare Turnstile for bot protection on authentication forms. To configure:

1. **Get Turnstile Keys:**
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Go to Turnstile section
   - Create a new site
   - Copy the Site Key and Secret Key

2. **Configure Environment Variables:**
   - **Frontend (Vercel):** Add `REACT_APP_TURNSTILE_SITE_KEY` with your site key
   - **Backend (Vercel):** Add `TURNSTILE_SECRET_KEY` with your secret key

3. **Optional Configuration:**
   - Turnstile is optional and gracefully degrades if not configured
   - The app will work without Turnstile keys but won't have captcha protection
   - Recommended for production to prevent automated attacks

#### Platform-Specific Setup
**Vercel:**
```bash
vercel env add REACT_APP_TURNSTILE_SITE_KEY production
vercel env add TURNSTILE_SECRET_KEY production
vercel env add XENDIT_SECRET_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

**Netlify:** Dashboard → Site Settings → Environment Variables

**Railway:** Dashboard → Variables tab

See [SECRET_MANAGEMENT_GUIDELINES.md](./SECRET_MANAGEMENT_GUIDELINES.md) for comprehensive security documentation.

## 📖 Documentation

### 🎯 Getting Started (Start Here!)
- **[Quick Start Guide](./QUICK_START_IMMEDIATE_ACTIONS.md)** - ⚡ Execute these steps first (30 min)
- **[System Analysis Report](./SYSTEM_ANALYSIS_REPORT.md)** - 📊 Complete health check and current status
- **[Recommendations & Action Plan](./RECOMMENDATIONS_AND_ACTION_PLAN.md)** - 🎯 Prioritized improvement roadmap

### 🔐 Security & Configuration
- [Cloudflare Turnstile Setup](./CLOUDFLARE_TURNSTILE_SETUP.md) - Complete guide for bot protection setup
- [Secret Management Guidelines](./SECRET_MANAGEMENT_GUIDELINES.md) - Comprehensive security documentation
- [Critical Missing Environment Variables](./CRITICAL_MISSING_ENV_VARS.md) - Required configuration

### ⚡ Performance & Optimization
- [Supabase Cache Egress Optimization](./SUPABASE_CACHE_EGRESS_OPTIMIZATION.md) - Database query optimization guide
- [Cache Optimization Implementation](./CACHE_OPTIMIZATION_IMPLEMENTATION_SUMMARY.md) - Performance improvements

### 📋 Feature Documentation
- [GTM Implementation Plan](./GTM_IMPLEMENTATION_PLAN.md) - Google Tag Manager setup
- [Enhanced WhatsApp Rental Messaging](./ENHANCED_WHATSAPP_RENTAL_MESSAGING.md) - Notification system
- [Product Archive Visibility Fix](./PRODUCT_ARCHIVE_VISIBILITY_FIX.md) - Product management
- [See all documentation files](.) - 30+ specialized guides available

## 🛠️ Development

### Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Supabase, Node.js API routes
- **Payments:** Xendit payment gateway
- **Notifications:** WhatsApp API integration
- **Deployment:** Vercel

### Project Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Application pages
├── services/      # API service functions
├── contexts/      # React context providers
├── utils/         # Utility functions
└── types/         # TypeScript type definitions

api/
├── admin/         # Admin API endpoints
├── auth/          # Authentication endpoints
├── xendit/        # Payment processing
└── analytics/     # Analytics endpoints
```

### Security Validation
Always run security checks before committing:
```bash
# Validate environment security
node scripts/validate-env-security.js

# Check for secrets in code
npm run security-check  # (if available)

# Run comprehensive checks
./comprehensive-check.sh
```

## 🚀 Contributing

1. Follow the security guidelines in [SECRET_MANAGEMENT_GUIDELINES.md](./SECRET_MANAGEMENT_GUIDELINES.md)
2. Never commit real API keys or sensitive data
3. Use the provided environment templates
4. Run security validation before submitting PRs
5. All security checks must pass in CI/CD

## 📞 Support

For security-related questions or to report vulnerabilities:
- Review [SECRET_MANAGEMENT_GUIDELINES.md](./SECRET_MANAGEMENT_GUIDELINES.md)
- Create a GitHub issue for general questions
- Contact the development team directly for sensitive security issues

---

**⚠️ Security Notice:** This application handles payment data and user information. Always follow security best practices and keep dependencies updated.
