# Development Environment Setup

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Local Machine                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Node.js    │  │    Docker    │  │   VS Code    │     │
│  │    + npm     │  │   Desktop    │  │   Editor     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Project Directory                         │  │
│  │  ┌─────────────┐  ┌─────────────┐                  │  │
│  │  │ Vercel CLI  │  │Supabase CLI │                  │  │
│  │  │   v48.1.6   │  │   v2.70.5   │                  │  │
│  │  └─────────────┘  └─────────────┘                  │  │
│  │                                                      │  │
│  │  Files:                                             │  │
│  │  • package.json                                     │  │
│  │  • vercel.json                                      │  │
│  │  • .env.local (your secrets)                       │  │
│  │  • supabase/config.toml                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Docker Containers (Local Supabase)                │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │   │PostgreSQL│  │  Studio  │  │   APIs   │        │  │
│  │   │:54322    │  │:54323    │  │:54321    │        │  │
│  │   └──────────┘  └──────────┘  └──────────┘        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Deploy / Sync
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Services                          │
│                                                              │
│  ┌───────────────────┐          ┌───────────────────┐      │
│  │   Vercel Cloud    │          │  Supabase Cloud   │      │
│  │                   │          │                   │      │
│  │  • Frontend Host  │◄────────►│  • PostgreSQL DB  │      │
│  │  • API Functions  │  Calls   │  • Auth           │      │
│  │  • Edge Network   │          │  • Storage        │      │
│  └───────────────────┘          └───────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Setup Steps

### Step 1: Prerequisites ✓ (Docker installed)
```
[✓] Docker Desktop
[ ] Node.js (Need to install)
[ ] npm (Comes with Node.js)
```

### Step 2: Install Node.js
1. Download from: https://nodejs.org/
2. Install LTS version (v20.x or later)
3. Verify: `node --version` and `npm --version`

### Step 3: Install CLIs
```powershell
# Run automated setup
.\setup-cli.ps1

# Or manually
npm install
```

### Step 4: Authenticate
```powershell
# Login to Vercel
npx vercel login
→ Opens browser → Login → Credentials saved

# Login to Supabase
npx supabase login
→ Generates token URL → Paste token → Authenticated
```

### Step 5: Link Projects
```powershell
# Link Vercel project
npx vercel link
→ Choose scope → Select/create project → .vercel/ folder created

# Link Supabase project
npx supabase link --project-ref YOUR_REF
→ Connected to remote database
```

### Step 6: Configure Environment
```powershell
# Copy template
cp .env.local.example .env.local

# Edit .env.local with your values:
# - Supabase URL & Keys
# - Xendit Keys
# - JWT Secret

# Or pull from Vercel
npx vercel env pull .env.local
```

## Development Workflows

### Workflow 1: Local Development with Remote Services
```
Your Code → npm start → Localhost:3000
              ↓
         Supabase Cloud ← API calls
```

### Workflow 2: Local Development with Local Supabase
```
Your Code → npm start → Localhost:3000
              ↓
         Docker Containers ← API calls
         (Local Supabase)
              ↓
         Test Migrations
```

### Workflow 3: Deployment
```
Your Code → npm run build → Build files
              ↓
         npx vercel --prod
              ↓
         Vercel Cloud → Live site
              ↓
         Supabase Cloud ← Production DB
```

## File Structure

```
jbalwikobra.com-digid/
├── .env.local               ← Your secrets (gitignored)
├── .env.local.example       ← Template file
├── SETUP_CLI.md             ← Full setup guide
├── CLI_REFERENCE.md         ← Quick commands
├── setup-cli.ps1            ← Automated setup script
│
├── vercel.json              ← Vercel configuration
├── package.json             ← Dependencies & scripts
│
├── supabase/
│   ├── config.toml          ← Supabase local config
│   └── migrations/          ← Database migrations
│
├── api/                     ← Vercel serverless functions
└── src/                     ← React application
```

## What Each Tool Does

### Vercel CLI
- **Deploy** your frontend and API functions
- **Manage** environment variables
- **View** logs and analytics
- **Test** deployments before production

### Supabase CLI
- **Run** local PostgreSQL database
- **Create** and test migrations
- **Sync** with remote database
- **Generate** TypeScript types
- **Manage** database schema

### Docker
- **Hosts** local Supabase services
- **Isolates** development environment
- **Provides** consistent setup across machines

## Next Steps

1. **Install Node.js** → https://nodejs.org/
2. **Run setup script** → `.\setup-cli.ps1`
3. **Login to services** → Follow prompts
4. **Configure environment** → Create `.env.local`
5. **Start developing** → `npm start`
6. **Deploy** → `npx vercel --prod`

## Support

- 📖 Full Guide: [SETUP_CLI.md](./SETUP_CLI.md)
- ⚡ Quick Reference: [CLI_REFERENCE.md](./CLI_REFERENCE.md)
- 📁 Project Docs: [docs/](./docs/)
