# 🚀 Deployment Guide for Zuni Hub

This guide covers everything you need to deploy Zuni Hub to production.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

You need to set these environment variables in your hosting platform (Vercel, Railway, etc.):

#### **Database (Supabase PostgreSQL)**
```env
DATABASE_URL="postgresql://postgres.kapoavjqihxgvznxjnux:zaza5@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.kapoavjqihxgvznxjnux:zaza5@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**⚠️ IMPORTANT:** 
- Replace `zaza5` with your actual database password
- Keep these secure - never commit them to Git
- Use your production database credentials (not local dev)

#### **NextAuth.js (Authentication)**
```env
NEXTAUTH_URL="https://your-production-domain.com"
NEXTAUTH_SECRET="generate-a-random-secret-here"
```

**⚠️ CRITICAL:**
- `NEXTAUTH_URL` must match your production domain exactly (with https://)
- `NEXTAUTH_SECRET` must be a random string (at least 32 characters)
- Generate a secure secret: `openssl rand -base64 32`

#### **Supabase Client (Storage & Public API)**
```env
NEXT_PUBLIC_SUPABASE_URL="https://kapoavjqihxgvznxjnux.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcG9hdmpxaWh4Z3Z6bnhqbnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ1ODksImV4cCI6MjA3NjA2MDU4OX0.G_ENKasKUJeAu6LH6O1fipdOBcqiNldO3u2AQgKUWWk"
```

**⚠️ NOTE:**
- These are public keys (safe to expose in client-side code)
- The anon key is already in your codebase

#### **Resend Email Service**
```env
RESEND_API_KEY="re_8Ddq1SAZ_sd74rNCKnRo5g7FqxQ58drLP"
FROM_EMAIL="Zuni <noreply@mail.zuni.social>"
BASE_URL="https://your-production-domain.com"
```

**⚠️ IMPORTANT:**
- `BASE_URL` must be your production domain (used for email verification links)
- Verify your Resend domain is configured correctly
- The `FROM_EMAIL` domain must be verified in Resend

---

## 🔧 Setup Steps

### Step 1: Generate NextAuth Secret

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

Copy the output and use it as your `NEXTAUTH_SECRET`.

### Step 2: Run Database Migrations

Before deploying, ensure your database schema is up to date:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (if not already done)
npx prisma migrate deploy
```

**⚠️ For Production:**
- Use `prisma migrate deploy` (not `prisma migrate dev`)
- This applies pending migrations without creating new ones

### Step 3: Verify Supabase Storage Policies

Your Supabase Storage bucket (`uploads`) needs these RLS policies:

1. **Allow authenticated viewing:**
   - Policy Name: `Allow authenticated viewing`
   - Bucket: `uploads`
   - Policy Definition: `bucket_id = 'uploads'`
   - Allowed Operation: `SELECT`
   - Target Roles: `authenticated`

2. **Allow authenticated uploads:**
   - Policy Name: `Allow authenticated uploads`
   - Bucket: `uploads`
   - Policy Definition: `bucket_id = 'uploads'`
   - Allowed Operation: `INSERT`
   - Target Roles: `authenticated`

3. **Allow anon uploads (if needed):**
   - Policy Name: `Allow anon uploads`
   - Bucket: `uploads`
   - Policy Definition: `bucket_id = 'uploads'`
   - Allowed Operation: `INSERT`
   - Target Roles: `anon`

**⚠️ SECURITY NOTE:** 
- Currently allowing `anon` uploads is a security vulnerability
- Consider implementing signed URLs or backend proxy uploads for production

### Step 4: Verify Resend Domain

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Verify your domain (`mail.zuni.social`)
3. Add the required DNS records
4. Ensure domain status is "Verified"

---

## 🚀 Deployment Platforms

### Option 1: Vercel (Recommended for Next.js)

1. **Connect Repository:**
   - Push your code to GitHub/GitLab/Bitbucket
   - Import project in Vercel dashboard

2. **Configure Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add all variables from the checklist above
   - Set them for "Production", "Preview", and "Development"

3. **Build Settings:**
   - Framework Preset: Next.js
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Deploy:**
   - Vercel will automatically deploy on push to main branch
   - Or click "Deploy" in dashboard

**Vercel-Specific Notes:**
- Vercel automatically handles Next.js optimizations
- Edge functions are supported
- Automatic HTTPS certificates
- Custom domains supported

### Option 2: Railway

1. **Create New Project:**
   - Connect your GitHub repository
   - Select "Deploy from GitHub repo"

2. **Configure Environment Variables:**
   - Go to Variables tab
   - Add all required environment variables

3. **Configure Build:**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Healthcheck Path: `/api/health` (if you have one)

4. **Deploy:**
   - Railway will automatically deploy

### Option 3: Self-Hosted (Docker)

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

Update `next.config.js`:
```js
const nextConfig = {
  output: 'standalone', // Add this for Docker
  // ... rest of your config
}
```

---

## ✅ Post-Deployment Verification

### 1. Test Authentication
- [ ] Sign up with a new account
- [ ] Check email verification email is received
- [ ] Verify email link works
- [ ] Sign in with verified account
- [ ] Sign out works correctly

### 2. Test Core Features
- [ ] Create a post
- [ ] Upload an image with post
- [ ] View post details
- [ ] Add a comment
- [ ] Upload an image with comment
- [ ] Subscribe to a university
- [ ] View university board

### 3. Test Image Uploads
- [ ] Upload image from post creation
- [ ] Upload image from comment
- [ ] View enlarged images
- [ ] Verify images are accessible via Supabase Storage

### 4. Check Console for Errors
- [ ] Open browser DevTools
- [ ] Check for any console errors
- [ ] Verify no CSP violations
- [ ] Check network requests succeed

### 5. Test Mobile Responsiveness
- [ ] Test on mobile device or emulator
- [ ] Verify header stays fixed
- [ ] Check footer visibility
- [ ] Test image enlargement on mobile
- [ ] Verify scrolling works correctly

---

## 🔒 Security Checklist

### Environment Variables
- [ ] All secrets are in environment variables (not hardcoded)
- [ ] `.env.local` is in `.gitignore`
- [ ] Production secrets are different from development
- [ ] `NEXTAUTH_SECRET` is a strong random string

### Database
- [ ] Using connection pooling (pgbouncer)
- [ ] SSL mode is enabled (`sslmode=require`)
- [ ] Database password is strong and unique

### Supabase Storage
- [ ] RLS policies are configured correctly
- [ ] Consider implementing signed URLs for uploads
- [ ] Public read access is intentional (if enabled)

### NextAuth
- [ ] `NEXTAUTH_URL` matches production domain exactly
- [ ] HTTPS is enabled in production
- [ ] Session strategy is appropriate (JWT is used)

### Content Security Policy
- [ ] CSP allows Supabase connections
- [ ] No unsafe inline scripts (except where necessary)
- [ ] Image sources are restricted appropriately

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in your hosting platform's environment variables.

### Issue: "Can't reach database server"
**Solution:** 
- Verify `DATABASE_URL` and `DIRECT_URL` are correct
- Check if your hosting platform allows outbound connections to Supabase
- Ensure SSL mode is set: `?sslmode=require`

### Issue: "new row violates row-level security policy"
**Solution:** 
- Check Supabase Storage RLS policies
- Ensure policies allow the operations you need
- Verify you're using the correct Supabase project

### Issue: "Failed to fetch" (CSP violation)
**Solution:** 
- Check `middleware.ts` CSP settings
- Ensure Supabase URL is in `connect-src`
- Verify the URL matches exactly

### Issue: Email verification not working
**Solution:**
- Verify `BASE_URL` is set to production domain
- Check Resend API key is valid
- Verify Resend domain is verified
- Check email service logs

### Issue: NextAuth session not persisting
**Solution:**
- Verify `NEXTAUTH_URL` matches production domain exactly
- Ensure `NEXTAUTH_SECRET` is set
- Check if cookies are being blocked
- Verify HTTPS is enabled

---

## 📝 Additional Notes

### Prisma in Production
- Always run `prisma generate` before building
- Use `prisma migrate deploy` for production migrations
- Consider using Prisma Data Proxy for better connection pooling

### Next.js Build Optimizations
- Images are automatically optimized by Next.js
- Static pages are pre-rendered
- API routes run on serverless functions (Vercel) or Node.js server

### Monitoring
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor database connection pool usage
- Track API response times
- Monitor Supabase Storage usage

### Backup Strategy
- Supabase provides automatic backups
- Consider exporting database schema regularly
- Backup environment variables securely

---

## 🎯 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Run migrations (development)
npx prisma migrate dev

# 4. Build for production
npm run build

# 5. Start production server (local testing)
npm start

# 6. Deploy (Vercel)
vercel --prod

# 7. Deploy (Railway)
railway up
```

---

## 📞 Support

If you encounter issues during deployment:
1. Check the troubleshooting section above
2. Review your hosting platform's logs
3. Verify all environment variables are set correctly
4. Check Supabase dashboard for any errors
5. Review Next.js build output for warnings

---

**Last Updated:** 2024
**Version:** 1.0.0

