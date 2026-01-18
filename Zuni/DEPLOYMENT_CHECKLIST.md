# ✅ Deployment Checklist

Use this checklist before deploying to production.

## 🔐 Environment Variables (Required)

Copy these to your hosting platform (Vercel, Railway, etc.):

```env
# Database
DATABASE_URL="postgresql://postgres.kapoavjqihxgvznxjnux:YOUR_PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.kapoavjqihxgvznxjnux:YOUR_PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"

# NextAuth (CRITICAL - Change these!)
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://kapoavjqihxgvznxjnux.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcG9hdmpxaWh4Z3Z6bnhqbnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ1ODksImV4cCI6MjA3NjA2MDU4OX0.G_ENKasKUJeAu6LH6O1fipdOBcqiNldO3u2AQgKUWWk"

# Email (Resend)
RESEND_API_KEY="YOUR_RESEND_API_KEY"
FROM_EMAIL="Zuni <noreply@mail.zuni.social>"
BASE_URL="https://your-domain.com"
```

## ⚠️ CRITICAL: Before Deploying

- [ ] **Generate NEXTAUTH_SECRET**: Run `openssl rand -base64 32` and use the output
- [ ] **Update NEXTAUTH_URL**: Must be your exact production domain (e.g., `https://zuni.social`)
- [ ] **Update BASE_URL**: Must match your production domain
- [ ] **Update DATABASE_URL**: Replace `YOUR_PASSWORD` with actual database password
- [ ] **Update DIRECT_URL**: Replace `YOUR_PASSWORD` with actual database password
- [ ] **Verify Resend Domain**: Ensure `mail.zuni.social` is verified in Resend dashboard

## 🗄️ Database Setup

- [ ] Run `npx prisma generate` locally
- [ ] Run `npx prisma migrate deploy` (or ensure migrations are applied)
- [ ] Verify database connection works

## 📦 Supabase Storage

- [ ] Verify `uploads` bucket exists
- [ ] Check RLS policies are set:
  - [ ] Allow authenticated SELECT
  - [ ] Allow authenticated INSERT
  - [ ] (Optional) Allow anon INSERT (security risk - consider signed URLs)

## 🚀 Deployment Steps

1. [ ] Push code to Git repository
2. [ ] Connect repository to hosting platform (Vercel/Railway/etc.)
3. [ ] Add all environment variables in hosting platform
4. [ ] Set build command: `npm run build`
5. [ ] Deploy!

## ✅ Post-Deployment Tests

- [ ] Visit production URL
- [ ] Test sign up (check email received)
- [ ] Test email verification link
- [ ] Test sign in
- [ ] Test create post
- [ ] Test upload image
- [ ] Test add comment
- [ ] Test subscribe to university
- [ ] Test mobile view
- [ ] Check browser console for errors

## 🔒 Security Verification

- [ ] All environment variables are set (not using defaults)
- [ ] `.env.local` is NOT committed to Git
- [ ] HTTPS is enabled
- [ ] CSP headers are working (check browser console)
- [ ] Database uses SSL (`sslmode=require`)

---

**Quick Command to Generate Secret:**
```bash
openssl rand -base64 32
```

