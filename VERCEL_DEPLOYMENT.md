# 🚀 Vercel Deployment Guide for Zuni Hub

Complete step-by-step guide to deploy Zuni Hub on Vercel.

## 📋 Prerequisites

- [ ] GitHub/GitLab/Bitbucket account
- [ ] Code pushed to a Git repository
- [ ] Vercel account (sign up at [vercel.com](https://vercel.com))

---

## 🎯 Step 1: Prepare Your Repository

### 1.1 Ensure Code is Committed

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Verify .gitignore

Make sure `.env.local` and `.env` are in `.gitignore` (they should be already):
```bash
cat .gitignore | grep .env
```

---

## 🔗 Step 2: Connect to Vercel

### 2.1 Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your repository (GitHub/GitLab/Bitbucket)
4. Click **"Import"**

### 2.2 Configure Project

Vercel will auto-detect Next.js. Verify these settings:

- **Framework Preset:** `Next.js` ✅
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

**⚠️ Important:** Don't click "Deploy" yet! We need to set environment variables first.

---

## 🔐 Step 3: Set Environment Variables

### 3.1 Generate NextAuth Secret

First, generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output (you'll need it in the next step).

### 3.2 Add Environment Variables in Vercel

1. In the Vercel project setup page, scroll down to **"Environment Variables"**
2. Click **"Add"** for each variable below
3. For each variable, select **"Production"**, **"Preview"**, and **"Development"**
4. Click **"Add"** after each one

#### Required Variables:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.kapoavjqihxgvznxjnux:YOUR_DATABASE_PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require

DIRECT_URL=postgresql://postgres.kapoavjqihxgvznxjnux:YOUR_DATABASE_PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require

# NextAuth.js (CRITICAL - Replace with your values!)
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=paste-your-generated-secret-here

# Supabase Client
NEXT_PUBLIC_SUPABASE_URL=https://kapoavjqihxgvznxjnux.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcG9hdmpxaWh4Z3Z6bnhqbnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ1ODksImV4cCI6MjA3NjA2MDU4OX0.G_ENKasKUJeAu6LH6O1fipdOBcqiNldO3u2AQgKUWWk

# Resend Email Service
RESEND_API_KEY=YOUR_RESEND_API_KEY
FROM_EMAIL=Zuni <noreply@mail.zuni.social>
BASE_URL=https://your-project.vercel.app
```

**⚠️ IMPORTANT NOTES:**

1. **NEXTAUTH_URL**: 
   - For first deploy: Use `https://your-project.vercel.app` (Vercel will show you the URL)
   - After custom domain: Update to `https://your-custom-domain.com`
   - Must match exactly (no trailing slash, with https://)

2. **NEXTAUTH_SECRET**: 
   - Paste the secret you generated with `openssl rand -base64 32`
   - Must be different from your local development secret

3. **BASE_URL**: 
   - Same as `NEXTAUTH_URL`
   - Used for email verification links
   - Update after setting custom domain

4. **Database Password**: 
   - Replace `zaza5` with your actual Supabase database password if different

### 3.3 Verify All Variables

After adding all variables, you should see:
- ✅ DATABASE_URL
- ✅ DIRECT_URL
- ✅ NEXTAUTH_URL
- ✅ NEXTAUTH_SECRET
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ RESEND_API_KEY
- ✅ FROM_EMAIL
- ✅ BASE_URL

---

## 🚀 Step 4: Deploy

### 4.1 Initial Deployment

1. Click **"Deploy"** button
2. Vercel will:
   - Install dependencies (`npm install`)
   - Generate Prisma Client
   - Build your Next.js app (`npm run build`)
   - Deploy to production

### 4.2 Monitor Build Logs

Watch the build logs for:
- ✅ Dependencies installed successfully
- ✅ Prisma Client generated
- ✅ Next.js build completed
- ❌ Any errors (fix before proceeding)

**Common Build Issues:**

- **"Prisma Client not generated"**: Add `prisma generate` to build command (see Step 5.1)
- **"Missing environment variables"**: Double-check all variables are set
- **"Database connection failed"**: Verify DATABASE_URL is correct

---

## ⚙️ Step 5: Configure Build Settings (If Needed)

### 5.1 Add Prisma Generate to Build

If Prisma Client isn't generated automatically:

1. Go to **Project Settings** → **General**
2. Under **"Build & Development Settings"**
3. Update **"Build Command"** to:
   ```bash
   npx prisma generate && npm run build
   ```

**Note:** Vercel usually auto-detects Prisma, but this ensures it runs.

### 5.2 Install Command (Optional)

If you need to install additional dependencies, update **"Install Command"**:
```bash
npm install
```

---

## 🌐 Step 6: Set Custom Domain (Optional)

### 6.1 Add Domain

1. Go to **Project Settings** → **Domains**
2. Enter your domain (e.g., `zuni.social`)
3. Click **"Add"**

### 6.2 Configure DNS

Vercel will show you DNS records to add:
- **A Record** or **CNAME Record**
- Add these to your domain's DNS settings

### 6.3 Update Environment Variables

After domain is verified, update:
- `NEXTAUTH_URL` → `https://your-custom-domain.com`
- `BASE_URL` → `https://your-custom-domain.com`

Then **redeploy** (Vercel will auto-redeploy on next push, or click "Redeploy" manually).

---

## ✅ Step 7: Post-Deployment Verification

### 7.1 Test Basic Functionality

Visit your Vercel URL and test:

- [ ] **Homepage loads** (splash screen → landing page)
- [ ] **Sign up works** (create test account)
- [ ] **Email verification received** (check inbox)
- [ ] **Email verification link works** (click link)
- [ ] **Sign in works** (after verification)
- [ ] **Create post works**
- [ ] **Upload image works** (test with post)
- [ ] **Add comment works**
- [ ] **Subscribe to university works**

### 7.2 Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Check for errors:
   - ❌ CSP violations
   - ❌ Failed API requests
   - ❌ Missing environment variables
   - ❌ Database connection errors

### 7.3 Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → **"Deployments"**
2. Click on latest deployment
3. Check **"Functions"** tab for server-side errors
4. Check **"Logs"** for runtime errors

---

## 🔄 Step 8: Continuous Deployment

### 8.1 Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch → **Production** deployment
- Push to other branches → **Preview** deployment
- Open Pull Request → **Preview** deployment

### 8.2 Manual Redeploy

To manually redeploy:
1. Go to **Deployments** tab
2. Click **"..."** on any deployment
3. Click **"Redeploy"**

---

## 🐛 Troubleshooting

### Issue: Build Fails - "Prisma Client not found"

**Solution:**
1. Go to **Project Settings** → **General**
2. Update **Build Command** to:
   ```bash
   npx prisma generate && npm run build
   ```

### Issue: "Missing Supabase environment variables"

**Solution:**
1. Go to **Project Settings** → **Environment Variables**
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Ensure they're enabled for **Production**, **Preview**, and **Development**
4. Redeploy

### Issue: "Can't reach database server"

**Solution:**
1. Verify `DATABASE_URL` and `DIRECT_URL` are correct
2. Check Supabase dashboard for connection issues
3. Ensure SSL mode is included: `?sslmode=require`
4. Check Vercel logs for specific error

### Issue: NextAuth not working - "Invalid callback URL"

**Solution:**
1. Verify `NEXTAUTH_URL` matches your Vercel domain exactly
2. Must be `https://` (not `http://`)
3. No trailing slash
4. Update and redeploy

### Issue: Email verification links point to localhost

**Solution:**
1. Update `BASE_URL` environment variable
2. Must match your production domain
3. Redeploy after updating

### Issue: Images not uploading

**Solution:**
1. Check Supabase Storage RLS policies
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
3. Check browser console for CSP violations
4. Verify `middleware.ts` allows Supabase connections

---

## 📊 Monitoring & Analytics

### Vercel Analytics (Optional)

1. Go to **Project Settings** → **Analytics**
2. Enable **Vercel Analytics** (free tier available)
3. Track page views, performance, and errors

### Function Logs

Monitor serverless function logs:
1. Go to **Deployments** → Click deployment
2. Click **"Functions"** tab
3. View real-time logs and errors

---

## 🔒 Security Checklist

Before going live, verify:

- [ ] All environment variables are set (not using defaults)
- [ ] `NEXTAUTH_SECRET` is strong and unique
- [ ] `NEXTAUTH_URL` matches production domain exactly
- [ ] Database uses SSL (`sslmode=require`)
- [ ] `.env.local` is NOT committed to Git
- [ ] HTTPS is enabled (automatic on Vercel)
- [ ] CSP headers are working (check browser console)
- [ ] Supabase Storage RLS policies are configured

---

## 🎯 Quick Reference

### Vercel Dashboard URLs

- **Projects**: https://vercel.com/dashboard
- **Your Project**: https://vercel.com/your-username/your-project
- **Environment Variables**: Project Settings → Environment Variables
- **Deployments**: Project → Deployments tab

### Important Commands

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Test build locally (simulate Vercel)
npm run build

# Check Prisma Client
npx prisma generate
```

### Environment Variables Template

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-here
NEXT_PUBLIC_SUPABASE_URL=https://kapoavjqihxgvznxjnux.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=your-resend-key
FROM_EMAIL=Zuni <noreply@mail.zuni.social>
BASE_URL=https://your-domain.vercel.app
```

---

## 🚀 You're Ready!

Follow these steps and your app will be live on Vercel in minutes!

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Check deployment logs in Vercel dashboard

---

**Last Updated:** 2024

