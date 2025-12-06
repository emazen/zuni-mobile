# 🔐 NextAuth Deployment Guide

## Critical NextAuth Configuration for Production

### Required Environment Variables

```env
NEXTAUTH_URL="https://your-production-domain.com"
NEXTAUTH_SECRET="your-generated-secret-here"
```

### ⚠️ IMPORTANT: NEXTAUTH_URL

**This must match your production domain EXACTLY:**
- ✅ Correct: `https://zuni.social`
- ✅ Correct: `https://www.zuni.social` (if using www)
- ❌ Wrong: `http://zuni.social` (missing https)
- ❌ Wrong: `https://zuni.social/` (trailing slash)
- ❌ Wrong: `https://zuni.social:3000` (port number)

**Why it matters:**
- NextAuth uses this URL to generate callback URLs
- Mismatched URLs cause authentication to fail
- Cookies won't be set correctly if URL doesn't match

### 🔑 Generating NEXTAUTH_SECRET

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

**Example output:**
```
Xx+eJ5O213XD8A2Lu5/v0Dj4hn7X4ybqGMpZe5JD89o=
```

**Requirements:**
- Minimum 32 characters
- Random and unpredictable
- Different from development secret
- Keep it secret (never commit to Git)

### Current NextAuth Configuration

Your `lib/auth.ts` is configured with:
- ✅ **JWT Strategy**: Using JWT sessions (stateless, works well in serverless)
- ✅ **Prisma Adapter**: Database adapter for sessions/accounts
- ✅ **Credentials Provider**: Custom email/password authentication
- ✅ **Email Verification**: Required before sign-in
- ✅ **Custom Callbacks**: Includes user ID and email verification status

### Session Configuration

```typescript
session: {
  strategy: "jwt"  // ✅ Good for serverless/production
}
```

**Why JWT is good for production:**
- Works with serverless functions (Vercel, etc.)
- No database queries for session validation
- Scales better than database sessions
- Faster response times

### Callback URLs

NextAuth automatically creates these endpoints:
- `/api/auth/signin` - Sign in page
- `/api/auth/signout` - Sign out endpoint
- `/api/auth/callback/credentials` - Credentials callback
- `/api/auth/session` - Get current session
- `/api/auth/csrf` - CSRF token

**All work automatically** - no additional configuration needed.

### Custom Sign-In Page

Your config specifies:
```typescript
pages: {
  signIn: "/auth/signin",
}
```

**Note:** This is a custom page path, but NextAuth will still use the default modal if the page doesn't exist. Your app uses a custom modal (`AuthModalCombined`), so this setting may not be used.

### Production Checklist for NextAuth

- [ ] `NEXTAUTH_URL` is set to exact production domain (with https://)
- [ ] `NEXTAUTH_SECRET` is a strong random string (32+ chars)
- [ ] Both variables are set in hosting platform (not just .env.local)
- [ ] HTTPS is enabled in production
- [ ] Cookies are not being blocked by browser
- [ ] Domain matches exactly (no trailing slashes, ports, etc.)

### Testing NextAuth in Production

1. **Test Sign Up:**
   ```
   POST /api/auth/callback/credentials
   Body: { email, password, username, gender, isSignUp: "true" }
   ```

2. **Test Sign In:**
   ```
   POST /api/auth/callback/credentials
   Body: { email, password, isSignUp: "false" }
   ```

3. **Test Session:**
   ```
   GET /api/auth/session
   ```

4. **Test Sign Out:**
   ```
   POST /api/auth/signout
   ```

### Common NextAuth Production Issues

#### Issue: "Invalid callback URL"
**Cause:** `NEXTAUTH_URL` doesn't match actual domain
**Fix:** Update `NEXTAUTH_URL` to exact production domain

#### Issue: "JWT_SECRET is missing"
**Cause:** `NEXTAUTH_SECRET` not set
**Fix:** Add `NEXTAUTH_SECRET` to environment variables

#### Issue: Session not persisting
**Cause:** Cookie domain/path issues or HTTPS mismatch
**Fix:** 
- Ensure HTTPS is enabled
- Verify `NEXTAUTH_URL` matches domain
- Check browser console for cookie errors

#### Issue: "CSRF token mismatch"
**Cause:** Domain mismatch or cookie issues
**Fix:** 
- Verify `NEXTAUTH_URL` is correct
- Check if cookies are being blocked
- Ensure same-site cookie settings

### NextAuth + Prisma Adapter

Your setup uses `PrismaAdapter`, which:
- Stores sessions in database (even with JWT strategy)
- Stores accounts for OAuth (not used in your case)
- Requires database connection

**For production:**
- Ensure database connection is stable
- Use connection pooling (you're using pgbouncer ✅)
- Monitor database connection errors

### Security Best Practices

1. **Never commit secrets to Git**
   - ✅ `.env.local` is in `.gitignore`
   - ✅ Use hosting platform's environment variables

2. **Use different secrets for each environment**
   - Development: `localhost` secret
   - Staging: Staging secret
   - Production: Production secret

3. **Rotate secrets periodically**
   - If compromised, generate new secret
   - Users will need to sign in again

4. **Monitor authentication failures**
   - Track failed login attempts
   - Set up alerts for suspicious activity

### Vercel-Specific Notes

If deploying to Vercel:
- ✅ NextAuth works out of the box
- ✅ Environment variables are automatically available
- ✅ HTTPS is automatic
- ✅ Edge functions supported (but JWT strategy recommended)

**Vercel Environment Variables:**
1. Go to Project → Settings → Environment Variables
2. Add `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
3. Select "Production", "Preview", and "Development"
4. Redeploy after adding variables

### Railway-Specific Notes

If deploying to Railway:
- ✅ NextAuth works with Railway
- ✅ Set environment variables in Railway dashboard
- ✅ HTTPS is automatic with Railway domains

**Railway Environment Variables:**
1. Go to Project → Variables tab
2. Add `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
3. Redeploy after adding variables

---

## Quick Reference

**Generate Secret:**
```bash
openssl rand -base64 32
```

**Required Variables:**
```env
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generated-secret-here"
```

**Test Session:**
```bash
curl https://your-domain.com/api/auth/session
```

---

**Last Updated:** 2024

