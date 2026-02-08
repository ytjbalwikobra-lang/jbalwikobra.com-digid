# JB AlWikobra E-commerce Platform

A modern e-commerce platform for digital product sales and game account rentals, built with React, TypeScript, Supabase, and Vercel.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel CLI (optional): `npm install -g vercel`

### Quick Setup (2 minutes)

```bash
# Clone and install
git clone <repository-url>
cd jbalwikobra.com-digid
npm install

# Option A: With Vercel (Recommended)
npm run setup:dev     # Links project and pulls env variables

# Option B: Manual
cp .env.development .env.local
# Edit .env.local with your credentials

# Start development
npm run dev           # Full stack with API
# OR
npm start             # Frontend only
```

**📚 For detailed setup**: See [QUICKSTART.md](QUICKSTART.md) or [Development Environment Guide](docs/guides/development-environment.md)

### Development Modes

```bash
npm start              # Frontend only (fast, UI dev)
npm run dev            # Full stack with Vercel Dev (recommended)
npm run dev:prod-like  # Production-like testing
npm run dev:docker     # Docker containerized environment
npm run preview        # Preview production build locally
```

## 📁 Project Structure

```
jbalwikobra.com-digid/
├── src/                    # Frontend source code
│   ├── components/         # Reusable React components
│   ├── pages/              # Page components (public + admin)
│   ├── features/           # Feature modules
│   ├── services/           # API & data services
│   │   ├── customerNotificationService.ts  # Customer notification client
│   │   ├── adminNotificationService.ts     # Admin notification client
│   │   ├── adminService.ts                 # Admin panel API service
│   │   ├── productService.ts               # Product CRUD operations
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── layouts/            # Layout components
│   ├── styles/             # CSS & design system (cyber-compact.css)
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript types
├── api/                    # Vercel Serverless API endpoints
│   ├── _config/            # API configuration
│   ├── _middleware/        # Auth & CORS middleware
│   ├── _utils/             # Shared utilities
│   │   ├── adminNotificationService.ts  # Backend notification creation
│   │   ├── cacheControl.ts              # Cache headers
│   │   ├── corsConfig.ts               # CORS configuration
│   │   └── dynamicWhatsAppService.ts   # WhatsApp integration
│   ├── xendit/             # Payment gateway (Xendit webhooks)
│   ├── cron/               # Scheduled jobs
│   └── admin.ts            # Admin API endpoint
├── scripts/                # Utility & maintenance scripts
├── migrations/             # Database migrations (SQL)
├── docs/                   # Documentation
├── public/                 # Static assets
└── supabase/              # Supabase migrations & config
```

## 🗄️ Database Architecture

### Supabase Tables

| Table | Purpose |
|---|---|
| `products` | Product catalog (purchases & rentals) |
| `orders` | All customer orders |
| `payments` | Xendit payment records |
| `users` / `profiles` | User accounts |
| `admin_notifications` | Admin panel notifications (new orders, payments, etc.) |
| `customer_notifications` | Customer-facing notifications (payment confirmations, promos) |
| `customer_notification_reads` | Tracks read status for global customer notifications |
| `whatsapp_providers` | WhatsApp Business API configuration |
| `reviews` | Product reviews |
| `flash_sales` | Flash sale campaigns |

### RPC Functions
- `get_unread_notification_count(uuid)` — Count unread customer notifications
- `mark_notification_read(uuid, uuid)` — Mark single notification as read
- `mark_all_notifications_read(uuid)` — Mark all notifications as read

### Notification System

The platform uses two separate notification systems:

1. **Admin Notifications** (`admin_notifications` table)
   - Created by: Xendit webhook, invoice creation API
   - Service: `api/_utils/adminNotificationService.ts` (backend)
   - Client: `src/services/adminNotificationService.ts` (frontend)
   - Types: `new_order`, `paid_order`, `new_rent`, `paid_rent`, `order_cancelled`

2. **Customer Notifications** (`customer_notifications` table)
   - Created by: Xendit webhook (on payment confirmation)
   - Client: `src/services/customerNotificationService.ts`
   - Types: `payment`, `order`, `product`, `system`, `promo`, `feed_post`
   - Realtime: Supabase Realtime subscriptions for instant toast notifications

> **Note**: Backward-compatibility views `notifications` and `notification_reads` exist as aliases for `customer_notifications` and `customer_notification_reads`.

## 💳 Payment Flow

```
Customer → Create Invoice (api/xendit/create-invoice.ts)
         → Xendit processes payment
         → Webhook callback (api/xendit/webhook.ts)
           ├── Update order status → 'paid'
           ├── Create admin notification (admin_notifications)
           ├── Create customer notification (customer_notifications)
           ├── Send WhatsApp to admin group
           └── Send WhatsApp to customer
```

## 🎨 Design System

The admin panel uses the **Cyber Compact Design System V3** defined in `src/styles/cyber-compact.css`.

All styling uses CSS custom properties (`--admin-*` namespace):
- Colors: `--admin-accent`, `--admin-success`, `--admin-error`, `--admin-warning`, `--admin-info`, `--admin-orange`, `--admin-purple`
- Backgrounds: `--admin-bg-pure`, `--admin-bg-surface`, `--admin-bg-card`, `--admin-bg-elevated`
- Text: `--admin-text`, `--admin-text-secondary`, `--admin-text-tertiary`, `--admin-text-muted`
- Borders: `--admin-border`, `--admin-border-light`, `--admin-border-lighter`

**Rule**: No hardcoded Tailwind color classes (e.g., `text-pink-500`, `bg-emerald-400`) in admin components. Always use `var(--admin-*)` tokens.

## 📚 Documentation

For comprehensive documentation, see [docs/INDEX.md](docs/INDEX.md)

### Quick Links
- [Deployment Instructions](docs/deployment/instructions.md)
- [Admin Panel Documentation](docs/admin/)
- [Security Best Practices](docs/security/security-best-practices.md)
- [Troubleshooting Guide](docs/troubleshooting/)
- [API Documentation](api/README.md)

## 🛠️ Development

### Available Scripts

```bash
# Development
npm start                   # Start development server
npm run build              # Build for production
npm test                   # Run tests

# Linting
npm run lint              # Run ESLint
npm run lint:fix          # Fix linting issues

# Deployment
npm run deploy            # Deploy to Vercel
```

### Environment Variables

See [.env.example](.env.example) for required environment variables:
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous key
- `REACT_APP_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key
- `REACT_APP_MAINTENANCE_MODE` - Enable/disable maintenance mode

For detailed configuration, see [docs/deployment/instructions.md](docs/deployment/instructions.md)

## 🔒 Security

- All secrets must be stored in environment variables
- Follow [security best practices](docs/security/security-best-practices.md)
- Use [secret management guidelines](docs/security/secret-management.md)
- Enable Cloudflare Turnstile for bot protection

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

See [Deployment Checklist](docs/deployment/checklist.md) for complete deployment guide.

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern=admin

# Run with coverage
npm test -- --coverage
```

### Manual Testing

Test scripts are available in `scripts/tests/`:
- Admin authentication tests
- Payment flow tests
- API endpoint tests
- WhatsApp integration tests

## 📦 Features

### Customer Features
- Product catalog with search, filters, and instant search dropdown
- Shopping cart with real-time updates
- Multiple payment methods via Xendit (QRIS, Bank Transfer, E-wallet, Indomaret)
- Order tracking and history
- In-app payment confirmation notifications (realtime)
- WhatsApp order confirmation messages
- Game account rental system
- Flash sale campaigns
- Product reviews

### Admin Features
- Comprehensive admin dashboard with analytics
- Product management (CRUD) with image upload
- Order management with status tracking
- Real-time floating notifications (new orders, payments)
- Full notification center page with filters, search, and bulk actions
- WhatsApp group integration (separate groups for purchases & rentals)
- User management
- Intelligent data prefetching

## 🔧 Maintenance

### Maintenance Mode

Enable maintenance mode via environment variable:
```bash
REACT_APP_MAINTENANCE_MODE=true
```

See [Maintenance Mode Guide](docs/deployment/maintenance-mode-guide.md) for details.

### Database Migrations

Migrations are stored in `/migrations/` (manual SQL) and `/supabase/migrations/` (Supabase CLI):

```bash
# Migrations should be run in chronological order against Supabase SQL Editor
# Key recent migrations:
# - 2026-02-08_rename_customer_notifications.sql    (table rename + RPC functions)
# - 2026-02-08_add_payment_type_check.sql           (add payment/order types)
# - 2026-02-08_add_notifications_compat_view.sql    (backward-compat views)
```

## 📊 Monitoring

### Performance Monitoring
- Vercel Analytics integration
- Speed Insights enabled
- Custom performance monitoring scripts in `scripts/monitoring/`

### Error Tracking
- API error logging
- Frontend error boundaries
- Webhook failure monitoring

## 🤝 Contributing

### Code Style
- Follow TypeScript best practices
- Use ESLint for code quality
- Follow component naming conventions
- Write meaningful commit messages

### Documentation
- Update documentation for new features
- Use kebab-case for file names
- Keep docs organized by category
- Update INDEX.md when adding new docs

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create pull request
git push origin feature/your-feature
```

## 📝 Changelog

See [docs/changelog-admin.md](docs/changelog-admin.md) and [docs/changelog-week1.md](docs/changelog-week1.md) for recent changes.

## 🗺️ Roadmap

See [docs/roadmap.md](docs/roadmap.md) for planned features and improvements.

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🆘 Support

For troubleshooting and support:
1. Check [troubleshooting guides](docs/troubleshooting/)
2. Review [FAQ section](docs/guides/)
3. Contact development team

## 🔗 Links

- **Production**: https://www.jbalwikobra.com
- **Documentation**: [docs/INDEX.md](docs/INDEX.md)
- **Repository**: Contact admin for access

---

Built with ❤️ using React, TypeScript, and Supabase
