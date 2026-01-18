# API Directory

Serverless API endpoints for the jbalwikobra.com platform.

## 📁 Directory Structure

```
api/
├── __tests__/           # Test and debug files
├── _config/             # Configuration files
├── _middleware/         # Middleware functions
├── _utils/              # Utility functions
├── cron/                # Cron job endpoints
├── xendit/              # Xendit payment integration
├── admin.ts             # Admin operations
├── admin-notifications.ts # Admin notifications
├── admin-whatsapp.ts    # Admin WhatsApp integration
├── admin-whatsapp-groups.ts # WhatsApp groups management
├── auth.ts              # Authentication
├── recent-purchases.ts  # Recent purchases ticker
└── reset-password.ts    # Password reset
```

## 🚀 Endpoints

### Authentication
- `POST /api/auth` - User authentication and registration

### Admin
- `GET/POST/PUT/DELETE /api/admin` - Admin CRUD operations
- `GET /api/admin-notifications` - Admin notifications
- `GET/POST /api/admin-whatsapp` - WhatsApp configuration
- `GET /api/admin-whatsapp-groups` - WhatsApp groups

### Payments
- `POST /api/xendit/*` - Xendit payment webhooks and operations

### Public
- `GET /api/recent-purchases` - Recent purchase ticker
- `POST /api/reset-password` - Password reset

### Scheduled Tasks
- `GET /api/cron/*` - Cron job endpoints

## 🧪 Testing

Test files are located in `__tests__/`:
- `test-whatsapp.ts` - WhatsApp integration tests
- `test-groups-simple.ts` - WhatsApp groups tests
- `debug-whatsapp-config.ts` - WhatsApp configuration debugging

## 🔒 Security

All API endpoints implement:
- CORS protection
- Rate limiting
- Input validation
- Authentication/authorization
- Cloudflare Turnstile verification (where required)

## 📝 Environment Variables

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `XENDIT_API_KEY` - Xendit API key
- `XENDIT_CALLBACK_TOKEN` - Xendit webhook token
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret

## 🚢 Deployment

APIs are deployed as Vercel serverless functions. Configuration in `vercel.json`.

## 📚 Documentation

For detailed API documentation, see:
- [Authentication Architecture](../docs/architecture/authentication-profile.md)
- [Payment Integration](../docs/features/)
- [WhatsApp Integration](../docs/admin/whatsapp-integration.md)
- [Security Best Practices](../docs/security/security-best-practices.md)
