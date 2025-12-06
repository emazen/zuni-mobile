# ⚡ Vercel Quick Start - 5 Minute Deploy

Fastest way to get Zuni Hub live on Vercel.

## 🚀 Step 1: Generate NextAuth Secret

```bash
openssl rand -base64 32
```

**Copy the output** - you'll need it in Step 3.

## 🔗 Step 2: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. **Don't click Deploy yet!**

## 🔐 Step 3: Add Environment Variables

In Vercel project setup, add these variables (select **Production**, **Preview**, **Development** for each):

```env
DATABASE_URL=postgresql://postgres.kapoavjqihxgvznxjnux:zaza5@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require

DIRECT_URL=postgresql://postgres.kapoavjqihxgvznxjnux:zaza5@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require

NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=paste-secret-from-step-1

NEXT_PUBLIC_SUPABASE_URL=https://kapoavjqihxgvznxjnux.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcG9hdmpxaWh4Z3Z6bnhqbnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ1ODksImV4cCI6MjA3NjA2MDU4OX0.G_ENKasKUJeAu6LH6O1fipdOBcqiNldO3u2AQgKUWWk

RESEND_API_KEY=re_8Ddq1SAZ_sd74rNCKnRo5g7FqxQ58drLP
FROM_EMAIL=Zuni <noreply@mail.zuni.social>
BASE_URL=https://your-project.vercel.app
```

**⚠️ Important:**
- Replace `your-project.vercel.app` with your actual Vercel URL (shown after import)
- Paste the secret from Step 1 into `NEXTAUTH_SECRET`
- Replace `zaza5` if your database password is different

## 🎯 Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Visit your live URL!

## ✅ Step 5: Update URLs After First Deploy

After first deploy, Vercel will show you your URL (e.g., `https://zuni-hub.vercel.app`):

1. Go to **Project Settings** → **Environment Variables**
2. Update:
   - `NEXTAUTH_URL` → Your actual Vercel URL
   - `BASE_URL` → Your actual Vercel URL
3. Click **"Redeploy"** (or push a new commit)

## 🧪 Step 6: Test

Visit your site and test:
- [ ] Sign up
- [ ] Check email for verification
- [ ] Verify email
- [ ] Sign in
- [ ] Create post
- [ ] Upload image

---

**That's it!** Your app is live! 🎉

For detailed troubleshooting, see `VERCEL_DEPLOYMENT.md`

