# Development Environment Setup Guide

Complete guide for setting up a development environment that mirrors production for the JB AlWikobra e-commerce platform.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Development Modes](#development-modes)
4. [Environment Configuration](#environment-configuration)
5. [Docker Setup](#docker-setup)
6. [Vercel Dev Setup](#vercel-dev-setup)
7. [Testing Locally](#testing-locally)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

### Required Software

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Vercel CLI** (install globally): `npm install -g vercel`

### Optional (for Docker)

- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)

### Required Accounts

- Supabase account (for database)
- Xendit account (for payments - use test mode)
- Cloudflare account (for Turnstile)
- Vercel account (for deployment and dev CLI)

---

## 🚀 Quick Start

### Option 1: Standard Setup (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd jbalwikobra.com-digid

# 2. Install dependencies
npm install

# 3. Link to Vercel project (pulls environment variables)
npm run vercel:link

# 4. Pull environment variables from Vercel
npm run vercel:pull

# 5. Start development server with API support
npm run dev
```

### Option 2: Docker Setup (For consistency)

```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd jbalwikobra.com-digid

# 2. Copy environment template
cp .env.development .env.local

# 3. Configure your environment variables in .env.local

# 4. Start all services with Docker
npm run dev:docker-build

# Access:
# - Frontend: http://localhost:3000
# - Supabase Studio: http://localhost:3001
# - pgAdmin: http://localhost:5050
# - Mailhog: http://localhost:8025
```

### Option 3: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local from template
cp .env.development .env.local

# 3. Edit .env.local with your credentials

# 4. Start development server
npm start  # Frontend only
# OR
npm run dev  # Frontend + API functions
```

---

## 🔧 Development Modes

The project supports multiple development modes to match different testing scenarios:

### 1. Frontend Only (`npm start`)

- **Use case**: UI development, no API testing needed
- **Features**: React development server only
- **Port**: http://localhost:3000
- **API**: Uses mock data from `setupProxy.js`

```bash
npm start
```

### 2. Full Stack with Vercel Dev (`npm run dev`)

- **Use case**: Full application testing with serverless functions
- **Features**: Frontend + API endpoints running locally
- **Port**: http://localhost:3000
- **API**: Real API endpoints at `/api/*`

```bash
npm run dev
```

### 3. Production-like Mode (`npm run dev:prod-like`)

- **Use case**: Testing production behavior locally
- **Features**: Production build with development env
- **Port**: http://localhost:3000
- **API**: Full API with production settings

```bash
npm run dev:prod-like
```

### 4. Docker Containerized (`npm run dev:docker`)

- **Use case**: Consistent environment across team
- **Features**: Full stack in containers
- **Ports**: Multiple services (see Docker section)
- **API**: Isolated environment with database

```bash
npm run dev:docker
```

### 5. Production Preview (`npm run preview`)

- **Use case**: Test production build locally
- **Features**: Optimized production build
- **Port**: http://localhost:3000
- **API**: Production-optimized code

```bash
npm run preview
```

---

## ⚙️ Environment Configuration

### Environment Files

| File | Purpose | Committed? |
|------|---------|------------|
| `.env.example` | Template with all variables | ✅ Yes |
| `.env.development` | Development defaults | ✅ Yes |
| `.env.local` | Your local config (overrides all) | ❌ No |
| `.env.production` | Production config | ❌ No |

### Setting Up `.env.local`

1. **Copy the development template:**
   ```bash
   cp .env.development .env.local
   ```

2. **Fill in your credentials:**
   - Supabase URL and keys
   - Xendit test keys
   - Cloudflare Turnstile keys
   - WhatsApp API credentials

3. **Important**: Use **TEST/DEVELOPMENT** keys only!

### Key Environment Variables

#### Frontend Variables (REACT_APP_*)

```env
# Supabase (Frontend)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# Payment Gateway (Public key only)
REACT_APP_XENDIT_PUBLIC_KEY=xnd_public_development_xxx

# Turnstile (Test key that always passes)
REACT_APP_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# Feature flags
REACT_APP_DEBUG_MODE=true
REACT_APP_MOCK_PAYMENTS=true
```

#### Backend Variables (Vercel Dev)

```env
# Supabase (Backend - Service Role)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Xendit (Secret keys)
XENDIT_SECRET_KEY=xnd_development_xxx
XENDIT_CALLBACK_TOKEN=your_callback_token

# Turnstile (Backend)
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### Using Vercel Environment Variables

If you have access to the Vercel project:

```bash
# Link to Vercel project
vercel link

# Pull environment variables
vercel env pull .env.local

# This creates .env.local with all production/preview variables
```

---

## 🐳 Docker Setup

### Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Stack            │
├─────────────────────────────────────────┤
│  Frontend (React)        :3000          │
│  PostgreSQL              :5432          │
│  Redis                   :6379          │
│  Supabase Studio         :3001          │
│  pgAdmin                 :5050          │
│  Mailhog (Email)         :8025          │
└─────────────────────────────────────────┘
```

### Docker Commands

```bash
# Start all services
npm run docker:up

# Start with rebuild
npm run dev:docker-build

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Clean up (removes volumes)
npm run docker:clean
```

### Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Supabase Studio | http://localhost:3001 | From env vars |
| pgAdmin | http://localhost:5050 | admin@jbalwikobra.local / admin |
| Mailhog | http://localhost:8025 | - |
| PostgreSQL | localhost:5432 | postgres / postgres |
| Redis | localhost:6379 | - |

### Docker Troubleshooting

**Port already in use:**
```bash
# Find and kill process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Check which containers are running
docker ps

# Stop specific service
docker-compose stop frontend
```

**Database not initializing:**
```bash
# Clean volumes and restart
npm run docker:clean
npm run dev:docker-build
```

---

## 🚀 Vercel Dev Setup

Vercel Dev CLI runs your serverless functions locally, mimicking production behavior.

### Installation

```bash
# Install globally
npm install -g vercel

# Or use project version
npx vercel --version
```

### Configuration

Vercel Dev uses `vercel.json` for configuration. The project includes `vercel.dev.json` for development-specific settings.

### Running Vercel Dev

```bash
# Standard mode
vercel dev

# Or use npm script
npm run dev

# Production-like mode
npm run dev:prod-like

# With custom port
vercel dev --listen 3000
```

### How It Works

1. **Frontend**: Proxies to React dev server
2. **API Routes**: Runs `/api` endpoints as serverless functions
3. **Environment**: Loads from `.env.local`
4. **Hot Reload**: Automatically reloads on changes

### API Endpoints Available

All endpoints in `/api` are available:

- `POST /api/auth` - Authentication
- `GET /api/admin` - Admin operations
- `POST /api/xendit/create-direct-payment` - Payment creation
- `POST /api/xendit/webhook` - Payment webhooks
- `GET /api/admin-whatsapp` - WhatsApp config
- `GET /api/recent-purchases` - Purchase ticker

### Testing API Endpoints

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test admin endpoint
curl http://localhost:3000/api/admin?action=settings

# Test WhatsApp config
curl http://localhost:3000/api/admin-whatsapp
```

---

## 🧪 Testing Locally

### Payment Testing

Use Xendit test mode credentials:

```env
REACT_APP_XENDIT_PUBLIC_KEY=xnd_public_development_xxx
XENDIT_SECRET_KEY=xnd_development_xxx
```

**Test Cards** (Xendit):
- Success: `4000000000000002`
- Failed: `4000000000000010`

**Test Virtual Accounts**:
- Generate test VA numbers in Xendit dashboard
- Use mock responses in development

### Turnstile Testing

For local testing, use the always-pass test keys:

```env
# Frontend (always passes)
REACT_APP_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# Backend (always passes)
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### Database Testing

#### Using Supabase Cloud (Recommended)

1. Create a separate dev project in Supabase
2. Use dev project credentials
3. Apply migrations to dev database

#### Using Local PostgreSQL (Docker)

1. Start Docker containers: `npm run docker:up`
2. Apply migrations to local DB
3. Use pgAdmin to manage database

### WhatsApp Testing

Mock responses are provided in `setupProxy.js`:

- Test group listing
- Test message sending
- Test configuration updates

---

## 📊 Development Workflow

### Daily Development

```bash
# 1. Start development server
npm run dev

# 2. Make changes to code
# Files auto-reload on save

# 3. Test in browser
# http://localhost:3000

# 4. Check console for errors
# Both browser and terminal

# 5. Run tests
npm test

# 6. Lint code
npm run lint
```

### Before Committing

```bash
# 1. Run linter
npm run lint:fix

# 2. Run type checking
npm run tsc

# 3. Run tests
npm test

# 4. Build to ensure no errors
npm run build

# 5. Preview production build
npm run preview
```

### Testing Production Behavior

```bash
# 1. Build production version
npm run build:prod

# 2. Preview locally
npm run preview:prod

# 3. Test all features
# - Payment flows
# - Admin functions
# - WhatsApp integration
# - Authentication

# 4. Check bundle size
npm run build:analyze
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port
PORT=3001 npm start
```

#### 2. Environment Variables Not Loading

**Error**: `REACT_APP_SUPABASE_URL is undefined`

**Solution**:
```bash
# 1. Check .env.local exists
ls -la .env.local

# 2. Verify it starts with REACT_APP_
cat .env.local | grep REACT_APP

# 3. Restart dev server
npm run dev
```

#### 3. API Endpoints Return 404

**Error**: `404 Not Found` for `/api/*` routes

**Solution**:
```bash
# Use Vercel Dev instead of npm start
npm run dev

# Or check vercel.json configuration
cat vercel.json
```

#### 4. Vercel Dev Won't Start

**Error**: `Vercel CLI not found`

**Solution**:
```bash
# Install globally
npm install -g vercel

# Or use npx
npx vercel dev

# Link to project
vercel link
```

#### 5. Database Connection Failed

**Error**: `Connection refused` to Supabase

**Solution**:
```bash
# 1. Check Supabase credentials
echo $REACT_APP_SUPABASE_URL

# 2. Verify project is running
# Check Supabase dashboard

# 3. Test connection
curl $REACT_APP_SUPABASE_URL/rest/v1/

# 4. Check RLS policies if queries fail
```

#### 6. Docker Container Won't Start

**Error**: `Container already exists`

**Solution**:
```bash
# Stop all containers
docker-compose down

# Remove volumes
docker-compose down -v

# Rebuild
npm run dev:docker-build
```

#### 7. Hot Reload Not Working

**Solution**:
```bash
# 1. Clear node_modules
rm -rf node_modules
npm install

# 2. Clear React cache
rm -rf build
npm start

# 3. Check file watchers (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Getting Help

1. Check [troubleshooting docs](../troubleshooting/)
2. Review [GitHub issues](repository-url/issues)
3. Check Vercel/Supabase status pages
4. Contact development team

---

## 📚 Additional Resources

### Documentation
- [Main README](../PROJECT_README.md)
- [Deployment Guide](deployment/instructions.md)
- [API Documentation](../api/README.md)
- [Troubleshooting](../troubleshooting/)

### External Resources
- [Vercel Dev Docs](https://vercel.com/docs/cli/dev)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Xendit Test Mode](https://developers.xendit.co/api-reference/#test-mode)
- [React Scripts](https://create-react-app.dev/docs/available-scripts)

### Tools
- [Vercel CLI](https://vercel.com/docs/cli)
- [Supabase CLI](https://supabase.com/docs/reference/cli)
- [Docker Compose](https://docs.docker.com/compose/)

---

## ✅ Checklist

Before starting development:

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` configured
- [ ] Vercel project linked (optional)
- [ ] Development server starts successfully
- [ ] Can access frontend at http://localhost:3000
- [ ] API endpoints respond (if using Vercel Dev)
- [ ] Database connection works
- [ ] Test payment creates successfully

---

## 🎯 Next Steps

1. **Explore the codebase**: Start with `src/App.tsx`
2. **Review documentation**: Check [docs/INDEX.md](../INDEX.md)
3. **Run tests**: `npm test`
4. **Make your first change**: Try updating a component
5. **Test locally**: Use production-like mode
6. **Deploy**: Follow [deployment guide](deployment/instructions.md)

---

**Happy coding! 🚀**
