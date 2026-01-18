# 🚀 Quick Start - Development Environment

Get up and running in 5 minutes with a production-like development environment.

## Prerequisites

- Node.js 18+
- npm or yarn
- Git

## Installation Steps

### 1. Clone & Install

```bash
git clone <repository-url>
cd jbalwikobra.com-digid
npm install
```

### 2. Setup Environment

**Option A: Using Vercel (Recommended)**
```bash
npm run vercel:link    # Link to Vercel project
npm run vercel:pull    # Pull environment variables
```

**Option B: Manual Setup**
```bash
cp .env.development .env.local
# Edit .env.local with your credentials
```

### 3. Start Development

```bash
npm run dev    # Full stack (Frontend + API)
# OR
npm start      # Frontend only
```

### 4. Access Application

- 🌐 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:3000/api/*
- 📊 **Docs**: [docs/guides/development-environment.md](development-environment.md)

## Quick Commands

```bash
# Development
npm start              # Frontend only
npm run dev            # Full stack with Vercel Dev
npm run dev:prod-like  # Production-like mode

# Testing
npm test               # Run tests
npm run preview        # Preview production build

# Docker
npm run dev:docker     # Start with Docker

# Utilities
npm run lint           # Check code quality
npm run build          # Build for production
```

## Available Modes

| Mode | Command | Use Case |
|------|---------|----------|
| **Frontend Only** | `npm start` | UI development |
| **Full Stack** | `npm run dev` | API testing |
| **Production-like** | `npm run dev:prod-like` | Final testing |
| **Docker** | `npm run dev:docker` | Consistent environment |
| **Preview** | `npm run preview` | Production build test |

## Environment Variables

### Required Frontend Variables

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

### Required Backend Variables (for Vercel Dev)

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
XENDIT_SECRET_KEY=xnd_development_xxx
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

## Test Credentials

### Turnstile (Always Pass)
```env
Site Key: 1x00000000000000000000AA
Secret: 1x0000000000000000000000000000000AA
```

### Xendit (Test Mode)
Use test mode keys from Xendit dashboard:
- Test card: `4000000000000002` (success)
- Test card: `4000000000000010` (failed)

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Environment Variables Not Loading
```bash
# Restart dev server
npm run dev

# Check .env.local exists
ls -la .env.local
```

### API 404 Errors
```bash
# Use Vercel Dev (not npm start)
npm run dev
```

## Next Steps

1. ✅ Development environment running
2. 📖 Read [full development guide](development-environment.md)
3. 🔍 Explore [codebase structure](../PROJECT_README.md)
4. 🧪 Run tests: `npm test`
5. 🚢 Deploy: See [deployment guide](../deployment/instructions.md)

## Need Help?

- 📚 [Full Development Guide](development-environment.md)
- 🐛 [Troubleshooting](../troubleshooting/)
- 📋 [Documentation Index](../INDEX.md)
- 🤝 Contact development team

---

**Happy coding! Let's build something amazing! 🎉**
