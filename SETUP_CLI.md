# CLI Setup Guide for Vercel & Supabase

This guide will help you set up Vercel CLI and Supabase CLI for local development.

## Prerequisites

✅ Docker (Already Installed)
❌ Node.js & npm (Required)

## Step 1: Install Node.js

1. Download Node.js LTS (v20.x or later) from: https://nodejs.org/
2. Run the installer and follow the setup wizard
3. Restart your terminal/PowerShell after installation
4. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

## Step 2: Install Project Dependencies

Once Node.js is installed, run:

```powershell
npm install
```

This will install:
- Vercel CLI (v48.1.6)
- Supabase CLI (v2.70.5)
- All project dependencies

## Step 3: Verify CLI Installation

Check that the CLIs are available:

```powershell
npx vercel --version
npx supabase --version
```

## Step 4: Login to Vercel

```powershell
npx vercel login
```

This will:
1. Open your browser for authentication
2. Link your Vercel account
3. Save credentials locally

## Step 5: Link Vercel Project

```powershell
npx vercel link
```

Follow the prompts to:
1. Select your scope/team
2. Link to existing project or create new one
3. This creates `.vercel` folder with project settings

## Step 6: Login to Supabase

```powershell
npx supabase login
```

This will generate an access token link. Visit the link and paste the token back.

## Step 7: Link Supabase Project

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in your Supabase dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

## Step 8: Setup Environment Variables

Create a `.env.local` file with your credentials:

```bash
# Supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Xendit (if applicable)
XENDIT_SECRET_KEY=your-xendit-secret-key
XENDIT_WEBHOOK_TOKEN=your-webhook-token

# JWT
JWT_SECRET=your-jwt-secret
```

## Step 9: Start Local Supabase (Optional)

If you want to develop with local Supabase:

```powershell
npx supabase start
```

This will:
- Start Docker containers for Supabase services
- Provide local URLs and credentials
- Run on ports defined in `supabase/config.toml`

## Step 10: Deploy to Vercel

```powershell
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod
```

## Common Commands Reference

### Vercel CLI

```powershell
# Deploy to preview
npx vercel

# Deploy to production
npx vercel --prod

# View deployment logs
npx vercel logs

# List all deployments
npx vercel list

# Pull environment variables
npx vercel env pull .env.local

# Push environment variables
npx vercel env add
```

### Supabase CLI

```powershell
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# View status
npx supabase status

# Run migrations
npx supabase db push

# Create new migration
npx supabase migration new migration_name

# Reset database
npx supabase db reset

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.types.ts
```

## Docker Setup (Already Completed)

Since you have Docker installed, Supabase CLI can use it to:
- Run local Supabase instance
- Test migrations before deploying
- Develop offline

## Troubleshooting

### Issue: "npm not found"
**Solution**: Install Node.js first (Step 1)

### Issue: "Permission denied"
**Solution**: Run PowerShell as Administrator or use:
```powershell
npx --yes vercel
npx --yes supabase
```

### Issue: "Docker not running"
**Solution**: Start Docker Desktop before running `supabase start`

### Issue: Port already in use
**Solution**: Check `supabase/config.toml` and change ports if needed

## Next Steps

1. ✅ Install Node.js
2. ✅ Run `npm install`
3. ✅ Login to Vercel
4. ✅ Login to Supabase
5. ✅ Create `.env.local` file
6. ✅ Test deployment with `npx vercel`

## Additional Resources

- Vercel CLI Docs: https://vercel.com/docs/cli
- Supabase CLI Docs: https://supabase.com/docs/guides/cli
- Project Documentation: See `docs/` folder
