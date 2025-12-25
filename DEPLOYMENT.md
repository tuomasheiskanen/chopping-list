# Deployment Guide for Vercel

## Quick Checklist

### 1. Set up Turso Database (5 minutes)

1. Go to [turso.tech](https://turso.tech/) and sign up
2. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
3. Create a database:
   ```bash
   turso db create shopping-list
   ```
4. Get your database URL and token:
   ```bash
   turso db show shopping-list --url
   turso db tokens create shopping-list
   ```
5. Your `DATABASE_URL` will be: `libsql://your-db-name-org.turso.io?authToken=your-token`

### 2. Initialize Database Schema

```bash
export DATABASE_URL="libsql://your-db-name-org.turso.io?authToken=your-token"
npm run db:push
```

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your repository: `tuomasheiskanen/chopping-list`
4. Configure environment variables:
   - `DATABASE_URL` = Your Turso libSQL URL
   - `NUXT_SESSION_PASSWORD` = Generate with `openssl rand -base64 32`
   - `NUXT_OAUTH_GOOGLE_CLIENT_ID` = Your Google OAuth Client ID
   - `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` = Your Google OAuth Client Secret
5. Click "Deploy"

### 4. Update Google OAuth

After deployment, update Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your OAuth client
3. Add to **Authorized JavaScript origins**:
   - `https://your-app.vercel.app`
4. Add to **Authorized redirect URIs**:
   - `https://your-app.vercel.app/api/auth/google/callback`

### 5. Test Your Deployment

1. Visit your Vercel URL
2. Try signing in with Google
3. Create a test event and add items

## Troubleshooting

**Database connection errors:**
- Make sure your Turso database URL includes the auth token
- Format: `libsql://db-name-org.turso.io?authToken=token`

**OAuth errors:**
- Verify redirect URI matches exactly in Google Cloud Console
- Check that environment variables are set correctly in Vercel

**Build errors:**
- Ensure `npm run db:generate` runs during build (handled by vercel.json)
- Check Vercel build logs for specific errors

## Environment Variables Reference

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `libsql://db-org.turso.io?authToken=...` | Yes |
| `NUXT_SESSION_PASSWORD` | `abc123...` (32+ chars) | Yes |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID` | `123456.apps.googleusercontent.com` | Yes |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Yes |
