# JB AlWikobra E-commerce Platform

A modern e-commerce platform for digital product sales, built with React, TypeScript, and Supabase.

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
├── src/                    # Source code
│   ├── components/         # Reusable React components
│   ├── pages/              # Page components
│   ├── features/           # Feature modules
│   ├── services/           # API services
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── layouts/            # Layout components
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript types
├── api/                    # Serverless API endpoints
│   ├── __tests__/          # API test files
│   ├── _config/            # API configuration
│   ├── _middleware/        # API middleware
│   └── _utils/             # API utilities
├── scripts/                # Utility scripts
│   ├── tests/              # Test scripts
│   ├── monitoring/         # Monitoring & diagnostic scripts
│   └── maintenance/        # Maintenance & migration scripts
├── docs/                   # Documentation
│   ├── admin/              # Admin panel documentation
│   ├── features/           # Feature documentation
│   ├── architecture/       # Architecture documentation
│   ├── deployment/         # Deployment guides
│   ├── security/           # Security documentation
│   ├── troubleshooting/    # Troubleshooting guides
│   ├── guides/             # How-to guides
│   └── INDEX.md            # Documentation index
├── migrations/             # Database migrations
├── public/                 # Static assets
└── supabase/              # Supabase configuration
```

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
- Product catalog with search and filters
- Shopping cart with real-time updates
- Multiple payment methods (QRIS, Bank Transfer, E-wallet)
- Order tracking and history
- WhatsApp notifications
- Purchase notification ticker

### Admin Features
- Comprehensive admin dashboard
- Product management (CRUD)
- Order management
- Real-time notifications
- WhatsApp group integration
- Analytics and reporting
- User management

## 🔧 Maintenance

### Maintenance Mode

Enable maintenance mode via environment variable:
```bash
REACT_APP_MAINTENANCE_MODE=true
```

See [Maintenance Mode Guide](docs/deployment/maintenance-mode-guide.md) for details.

### Database Migrations

Migrations are stored in `/migrations/` and should be run in order:
```bash
# Run migration
npm run migrate
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
