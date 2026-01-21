# Quick Reference - CLI Commands

## 🚀 Quick Start

```powershell
# 1. Install Node.js from https://nodejs.org/
# 2. Run the setup script
.\setup-cli.ps1

# 3. Login to services
npx vercel login
npx supabase login

# 4. Link projects
npx vercel link
npx supabase link --project-ref YOUR_PROJECT_REF
```

## 📦 Vercel Commands

```powershell
# Deploy
npx vercel                    # Preview deployment
npx vercel --prod            # Production deployment

# Environment
npx vercel env pull          # Download env vars to .env.local
npx vercel env add           # Add new env var
npx vercel env ls            # List all env vars

# Project
npx vercel link              # Link to project
npx vercel list              # List deployments
npx vercel logs              # View logs
npx vercel inspect URL       # Inspect deployment
```

## 🗄️ Supabase Commands

```powershell
# Local Development
npx supabase start           # Start local instance
npx supabase stop            # Stop local instance
npx supabase status          # View status & credentials

# Database Migrations
npx supabase migration new name         # Create new migration
npx supabase db push                    # Push migrations to remote
npx supabase db reset                   # Reset local database
npx supabase db diff -f migration_name  # Generate diff migration

# Types
npx supabase gen types typescript --local > src/types/database.types.ts

# Remote
npx supabase link --project-ref REF     # Link to remote project
npx supabase db pull                    # Pull remote schema
```

## 🔧 Development Workflow

### Deploy to Vercel
```powershell
npm run build                # Build the app
npx vercel --prod           # Deploy to production
```

### Test Migrations Locally
```powershell
npx supabase start                     # Start local DB
npx supabase migration new test_feature
# Edit the migration file
npx supabase db reset                  # Test migration
npx supabase db push                   # Push to remote
```

### Pull Environment Variables
```powershell
npx vercel env pull .env.local
```

## 🐳 Docker Commands (for Supabase)

```powershell
# Start Docker Desktop first!
docker ps                    # Check running containers
docker compose up -d         # Start services from docker-compose.yml
docker compose down          # Stop services
docker system prune          # Clean up unused resources
```

## 📝 Common Tasks

### First Time Setup
1. Install Node.js
2. Run `.\setup-cli.ps1`
3. Login: `npx vercel login` and `npx supabase login`
4. Link projects
5. Create `.env.local` from `.env.local.example`

### Deploy New Version
```powershell
npm run build
npx vercel --prod
```

### Create & Deploy Migration
```powershell
npx supabase migration new feature_name
# Edit migration file
npx supabase db push
```

### View Logs
```powershell
npx vercel logs              # Vercel logs
npx supabase logs            # Supabase logs (when using local)
```

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm not found` | Install Node.js from nodejs.org |
| `Docker not running` | Start Docker Desktop |
| `Port already in use` | Change ports in `supabase/config.toml` |
| `Permission denied` | Run PowerShell as Administrator |
| `Module not found` | Run `npm install` |

## 📚 Documentation

- Full Setup Guide: [SETUP_CLI.md](./SETUP_CLI.md)
- Vercel Docs: https://vercel.com/docs/cli
- Supabase Docs: https://supabase.com/docs/guides/cli
- Project Docs: [docs/](./docs/)
