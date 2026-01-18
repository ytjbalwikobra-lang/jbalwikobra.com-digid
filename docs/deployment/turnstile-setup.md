# Cloudflare Turnstile Setup Guide

This guide walks you through setting up Cloudflare Turnstile for bot protection on your authentication forms.

## What is Cloudflare Turnstile?

Cloudflare Turnstile is a privacy-first, CAPTCHA alternative that protects your forms from bots and automated attacks. It provides a better user experience than traditional CAPTCHAs while maintaining strong security.

## Prerequisites

- A Cloudflare account (free tier works)
- Access to your Vercel project settings

## Step 1: Get Cloudflare Turnstile Keys

1. **Log into Cloudflare Dashboard**
   - Visit https://dash.cloudflare.com/
   - Log in with your Cloudflare account

2. **Navigate to Turnstile**
   - In the left sidebar, click on "Turnstile"
   - Or visit: https://dash.cloudflare.com/?to=/:account/turnstile

3. **Add a Site**
   - Click "Add site" button
   - Fill in the required information:
     - **Site name**: Your app name (e.g., "JB Alwikobra Production")
     - **Domain**: Your production domain (e.g., `jbalwikobra.com-digid.vercel.app`)
     - **Widget Mode**: Choose "Managed" (recommended) or "Non-interactive"
   - Click "Create"

4. **Copy Your Keys**
   - **Site Key**: This is your public key (safe to expose in frontend)
   - **Secret Key**: This is your private key (keep secret, server-side only)

## Step 2: Configure Environment Variables in Vercel

### Method 1: Using Vercel Dashboard (Recommended)

1. **Open Your Vercel Project**
   - Go to https://vercel.com/
   - Select your project

2. **Navigate to Environment Variables**
   - Click "Settings" tab
   - Click "Environment Variables" in the left sidebar

3. **Add Frontend Variable (REACT_APP_TURNSTILE_SITE_KEY)**
   - Click "Add New"
   - **Key**: `REACT_APP_TURNSTILE_SITE_KEY`
   - **Value**: Paste your Turnstile Site Key
   - **Environments**: Select all (Production, Preview, Development)
   - Click "Save"

4. **Add Backend Variable (TURNSTILE_SECRET_KEY)**
   - Click "Add New" again
   - **Key**: `TURNSTILE_SECRET_KEY`
   - **Value**: Paste your Turnstile Secret Key
   - **Environments**: Select all (Production, Preview, Development)
   - Click "Save"

5. **Redeploy Your Application**
   - After adding variables, trigger a new deployment
   - Go to "Deployments" tab
   - Click "..." on the latest deployment
   - Select "Redeploy"
   - OR push a new commit to trigger automatic deployment

### Method 2: Using Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Add Site Key (Public - Frontend)
vercel env add REACT_APP_TURNSTILE_SITE_KEY production
# Paste your site key when prompted

# Add Secret Key (Private - Backend)
vercel env add TURNSTILE_SECRET_KEY production
# Paste your secret key when prompted

# Pull the new environment variables locally for development
vercel env pull .env.local
```

## Step 3: Local Development Setup

1. **Create `.env.local` file**
   ```bash
   cp .env.template .env.local
   ```

2. **Add Your Turnstile Keys**
   Edit `.env.local` and add:
   ```bash
   # Frontend (Public)
   REACT_APP_TURNSTILE_SITE_KEY=your_site_key_here
   
   # Backend (Private)
   TURNSTILE_SECRET_KEY=your_secret_key_here
   ```

3. **Never Commit `.env.local`**
   - This file is already in `.gitignore`
   - Never commit real keys to version control

## Step 4: Verify Installation

### Frontend Verification

1. **Start Development Server**
   ```bash
   npm start
   ```

2. **Open Authentication Page**
   - Navigate to login/signup page
   - You should see the Cloudflare Turnstile widget (dark theme)
   - It may be a checkbox or may auto-verify

3. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check console for any Turnstile-related errors
   - Should see no warnings about missing keys

### Backend Verification

1. **Test Signup Flow**
   - Try creating a new account
   - Complete the Turnstile challenge
   - Submit the form
   - Should succeed without captcha errors

2. **Test Login Flow**
   - Try logging in
   - Complete the Turnstile challenge
   - Submit the form
   - Should succeed without captcha errors

### Check Server Logs

In Vercel Dashboard:
1. Go to "Deployments"
2. Click on latest deployment
3. Click "Functions" tab
4. Check logs for `/api/auth`
5. Should NOT see "Captcha verification failed" errors

## Troubleshooting

### Widget Not Showing

**Problem**: Turnstile widget doesn't appear on the form

**Solutions**:
1. Check if `REACT_APP_TURNSTILE_SITE_KEY` is set correctly
2. Check browser console for errors
3. Verify the domain in Cloudflare matches your deployment URL
4. Clear browser cache and reload

### "Captcha verification failed" Error

**Problem**: Form submission fails with captcha error

**Solutions**:
1. Verify `TURNSTILE_SECRET_KEY` is set in Vercel
2. Check that both keys are from the same Turnstile site
3. Ensure you're using the correct environment (dev vs prod keys)
4. Check Vercel function logs for detailed error messages

### Widget Shows Wrong Theme

**Problem**: Widget appears in light theme instead of dark

**Solution**: The theme is hardcoded to 'dark' in `TurnstileWidget.tsx`. To change:
```typescript
// In src/components/TurnstileWidget.tsx
options={{
  theme: 'light', // or 'auto'
  size: 'normal',
}}
```

### Development Mode Issues

**Problem**: Widget behaves differently in development

**Solution**: 
- Cloudflare Turnstile may be more lenient in development
- Always test in production or preview environments
- Consider using different site keys for dev/prod

## Testing Without Turnstile (Optional)

The application gracefully handles missing Turnstile configuration:

1. **Don't set the environment variables**
   - App will work without captcha protection
   - Console warning will be logged
   - Forms will work normally

2. **Why you might skip it temporarily**
   - Testing other features
   - Development environment
   - Staging environment

3. **Why you should use it in production**
   - Prevents automated bot attacks
   - Protects against credential stuffing
   - Reduces spam account creation
   - Meets security best practices

## Security Best Practices

1. **Keep Secret Keys Secret**
   - Never commit `TURNSTILE_SECRET_KEY` to Git
   - Only set in Vercel environment variables
   - Don't share in public channels

2. **Use Different Keys for Environments**
   - Create separate Turnstile sites for:
     - Development/Testing
     - Staging
     - Production
   - Configure appropriate domains for each

3. **Monitor Turnstile Analytics**
   - Check Cloudflare dashboard regularly
   - Review verification attempts
   - Watch for unusual patterns
   - Adjust settings if needed

4. **Rotate Keys Periodically**
   - Generate new keys every 6-12 months
   - Update in Vercel immediately
   - Monitor for issues after rotation

## Additional Resources

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [@marsidev/react-turnstile](https://github.com/marsidev/react-turnstile)

## Support

If you encounter issues:
1. Check Vercel function logs
2. Check Cloudflare Turnstile analytics
3. Review browser console errors
4. Consult this guide's troubleshooting section
