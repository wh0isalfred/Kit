# Deployment & Domain Migration Guide

**For:** Deploying KIT to production, migrating to a custom domain  
**Status:** Live 29 July 2026 on kit-ph.vercel.app  
**Next:** Domain acquisition + migration (kit.ng or similar)

---

## I. PRE-LAUNCH DEPLOYMENT CHECKLIST

**Timeline:** Run this 24–48 hours before going live.

### Code Quality

- [ ] No console errors (`npm run build` succeeds)
- [ ] All migrations applied to live Supabase (`supabase migration list`)
- [ ] Smoke test passes (`db-tests/smoke_test.sql`)
- [ ] No hardcoded `localhost` or test URLs in code

### Environment Variables (Vercel)

Verify all of these are set in Vercel → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL           [your-project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY eyJ...  (anon key)
SUPABASE_SERVICE_ROLE_KEY          eyJ...  (service role, KEEP SECRET)
PAYSTACK_SECRET_KEY                sk_live_...  (PRODUCTION KEY)
NEXT_PUBLIC_SITE_URL               https://kit-ph.vercel.app  (will change to real domain)
RESEND_API_KEY                     re_...  (not yet wired, but should exist)
```

### Payments (Paystack)

- [ ] Live keys configured (sk_live_*, not sk_test_*)
- [ ] Webhook URL registered: `https://kit-ph.vercel.app/api/paystack/webhook`
- [ ] Callback URL set: `https://kit-ph.vercel.app/apply/callback`
- [ ] Test a real transaction on staging URL with test card

### Email (Resend)

- [ ] API key added to Vercel env vars
- [ ] Domain verified in Resend dashboard (current domain: kit-ph.vercel.app)
- [ ] From email set: `noreply@kit-ph.vercel.app` (will change to custom domain)
- [ ] Test email template (when ready to wire; not yet wired)

### Database (Supabase)

- [ ] Backups enabled (Supabase Pro or configured)
- [ ] All RLS policies present and active
- [ ] SECURITY DEFINER functions tested (apply form, ID gate, approvals)
- [ ] No test data left in `applications` table
- [ ] Summer cohort active: `summer_cohorts.active = true`

### URLs & Redirects

- [ ] Home loads (/ route)
- [ ] Apply form loads (/apply)
- [ ] Apply callback works (submit test application)
- [ ] Summer gate loads (/summer)
- [ ] Summer portal loads (/smportal, with valid ID)
- [ ] Admin dashboard loads (/admin)

### Mobile & Accessibility

- [ ] Test on iPhone 12 (Safari)
- [ ] Test on Pixel 5 (Chrome)
- [ ] Buttons are ≥44px tall (touch target)
- [ ] Form fields have labels
- [ ] Color contrast passes WCAG AA

### Final Smoke Test

```bash
# Run the smoke test
psql $SUPABASE_URL < db-tests/smoke_test.sql

# Manually test key flows:
# 1. Apply → fill form → validate → Paystack init → callback
# 2. Admin: navigate /admin/summer (load cohort settings)
# 3. Summer ID gate: enter valid ID → signed cookie → portal loads
```

---

## II. LAUNCH DAY (10 August 2026)

### 1 Hour Before

- [ ] Team on standby (Alfred + any ops person)
- [ ] Paystack dashboard open (watch transactions)
- [ ] Supabase dashboard open (monitor logs)
- [ ] Mobile device on hand (test flows live)

### Go Live (9 AM)

- [ ] Cohort status: `active = true` (if not already)
- [ ] Week 1 status: `published = true`
- [ ] Meet link added for week 1
- [ ] Don't click "Go Live" yet (class hasn't started)

### First 30 Minutes

- **Watch:** Do applications come in? Do Paystack webhooks fire?
  - Check Paystack dashboard: transactions appearing?
  - Check Supabase logs: any errors in `submit_application()`?
  - Check Vercel logs: any 500 errors?

### During First Class (Assuming 10 AM Start)

- [ ] 15 min before: Click "Go Live" (Meet link turns green)
- [ ] Monitor: Are students joining? Any connection issues?
- [ ] After class: Click "End Class" (or let it expire after 1 hour)

### End of Day 1

- [ ] Tally: how many applications? how many paid?
- [ ] Check email: any parent complaints?
- [ ] Review Supabase audit log for errors
- [ ] Commit a brief post-launch report

---

## III. DOMAIN MIGRATION (When Real Domain Is Bought)

**Assumed timeline:** Buy domain (kit.ng or similar) in August, migrate in September.

### Step 1: Verify Domain with Resend (for email)

**Where:** Resend dashboard → Domains → Add domain

**Process:**
1. Enter domain (e.g., kitglobal.com)
2. Resend gives DNS records (SPF, DKIM, DMARC)
3. Add these records at your **registrar's DNS settings**
4. Wait for Resend to show "Verified" (5–30 min, depends on DNS propagation)

**Do NOT skip this step.** Sending from an unverified domain fails silently.

### Step 2: Point Domain at Vercel (for hosting)

**Where:** Vercel → Project Settings → Domains

**Process:**
1. Add domain (e.g., kitglobal.com)
2. Vercel gives DNS records (CNAME or A + AAAA)
3. Add these records at **registrar** (alongside Resend's records from Step 1)
4. Vercel shows "Active" (5–48 hours for full propagation)

**After this:** kitglobal.com resolves to your site. kit-ph.vercel.app still works as fallback.

### Step 3: Update Code (Sender Email)

**File:** `lib/email/resend.ts` (or wherever email is configured)

**Change:**
```typescript
// OLD
export const EMAIL_FROM = "KIT <onboarding@resend.dev>";

// NEW (on verified domain)
export const EMAIL_FROM = "KIT <noreply@kitglobal.com>";
```

### Step 4: Update Environment Variables

**Vercel → Project Settings → Environment Variables**

**Change:**
```
NEXT_PUBLIC_SITE_URL = https://kitglobal.com  (was https://kit-ph.vercel.app)
```

**Critical:** After changing this, **redeploy** (even with no code changes):
```bash
git commit --allow-empty -m "chore: redeploy for domain migration"
git push origin main
```

This env var is baked at build time. New builds pick up the new domain.

### Step 5: Update Paystack Webhook URL

**Paystack dashboard → Settings → Webhooks**

**Update:**
```
OLD: https://kit-ph.vercel.app/api/paystack/webhook
NEW: https://kitglobal.com/api/paystack/webhook
```

Also update callback URL if manually set.

### Step 6: Sweep for Hardcoded URLs

**PowerShell (Windows):**
```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.json | Select-String "vercel.app"
```

**Bash (Mac/Linux):**
```bash
grep -r "vercel.app" --include="*.ts" --include="*.tsx" --include="*.json"
```

Fix any found (e.g., Open Graph image URLs, sitemap, robots.txt, legal page footers).

### Step 7: Test End-to-End

**On the new domain:**

1. Apply form:
   - Visit https://kitglobal.com/apply
   - Submit test application
   - Check Paystack init request (should show correct domain in callback URL)
   - Complete payment
   - Check `/apply/callback` succeeds

2. Email:
   - Approve a test application
   - (When Resend is wired) Verify email sender shows `KIT <noreply@kitglobal.com>`

3. Summer gate:
   - Visit https://kitglobal.com/summer
   - Enter a valid Summer ID
   - Verify signed cookie is set
   - Portal loads on https://kitglobal.com/smportal

4. Admin:
   - Visit https://kitglobal.com/admin
   - Verify session works

### Step 8: Update Status

- [ ] DNS pointing to Vercel
- [ ] DNS verified by Resend
- [ ] Code email sender updated
- [ ] Env var `NEXT_PUBLIC_SITE_URL` updated
- [ ] Redeployed
- [ ] Paystack webhook URL updated
- [ ] No more `vercel.app` references in code
- [ ] All workflows tested on new domain

---

## IV. SSL/TLS CERTIFICATE

**Auto-handled by Vercel.** Once domain is pointed to Vercel:

1. Vercel auto-provisions an SSL certificate (Let's Encrypt)
2. HTTPS enforced automatically
3. No manual work needed

**If certificate doesn't appear within 48 hours:**
- Verify DNS is pointing to Vercel (not just Resend)
- Check Vercel dashboard → Domains → see any errors?
- Reach out to Vercel support

---

## V. PERFORMANCE AFTER MIGRATION

**Monitor these for 1 week:**
- Page load times (should be same or better)
- Paystack webhook reliability (watch transaction completion rates)
- Email delivery (when Resend is wired)
- Any 301 redirect chains (old domain → new domain)

**If performance degrades:**
1. Check Vercel build logs for errors
2. Check Supabase query performance (any N+1 queries suddenly appearing?)
3. Revert env var to old domain + redeploy (quick rollback)

---

## VI. COMMUNICATION (For Users)

### Email to Parents (When Domain Goes Live)

```
Subject: KIT moved to new domain

Hi KIT families,

We've migrated to our new home at kitglobal.com! 

Your Summer ID still works the same way:
1. Visit https://kitglobal.com/summer
2. Enter your ID (e.g., SM26734)
3. Access the portal at https://kitglobal.com/smportal

The old kit-ph.vercel.app address still works as a fallback, 
but please bookmark the new domain.

Questions? Reply to this email or contact us at kitph@gmail.com

— The KIT Team
```

### Update Social Media / Website

- Pinned post on socials: "We've moved! New domain: kitglobal.com"
- Update "Contact us" page with new domain
- Email signature updates

---

## VII. ROLLBACK PROCEDURE (If Something Breaks)

**If domain migration breaks the site:**

1. **Immediate:** Roll back Vercel DNS settings (point domain back to old Vercel project or remove it)
2. **Immediate:** Revert env var in Vercel (set `NEXT_PUBLIC_SITE_URL` back to kit-ph.vercel.app)
3. **Immediate:** Redeploy (force via empty commit)
4. **Check:** Does kit-ph.vercel.app work again?
5. **Update Paystack:** Point webhook back to kit-ph.vercel.app
6. **Communicate:** Email parents "Site back online at kit-ph.vercel.app while we troubleshoot"
7. **Debug:** Check Vercel logs, Supabase logs, DNS propagation
8. **Retry:** After fixing, attempt migration again

**Timeline:** Rollback should take <5 minutes. Users see downtime of minutes, not hours.

---

## VIII. POST-LAUNCH MONITORING

### Daily (First Week)

- [ ] Check Paystack dashboard: payment success rate
- [ ] Check Vercel: deployment errors, edge function latency
- [ ] Check Supabase: slow queries, RLS denials
- [ ] Check email: any bounce-backs (when Resend is wired)

### Weekly (After First Week)

- [ ] Tally applications + revenue
- [ ] Celebrate launch milestones with team
- [ ] Review user feedback (email, WhatsApp)
- [ ] Plan next week's content & resources

### Monthly (Ongoing)

- [ ] Database size (Supabase monitoring)
- [ ] Cost analysis (Vercel, Supabase, Paystack, Resend)
- [ ] User satisfaction (surveys, NPS if applicable)
- [ ] Plan next product phase (12-week program)

---

## IX. EMERGENCY CONTACTS & ESCALATION

| Issue | Action | Contact |
|-------|--------|---------|
| **Payment webhook failing** | Check Paystack dashboard + webhook logs | Paystack support + Alfred |
| **Email not sending** | Check Resend dashboard + API key | Resend support + Alfred |
| **Site 500 error** | Check Vercel logs + Supabase logs | Vercel support + Alfred |
| **Database down** | Supabase status page + check backups | Supabase support + Alfred |
| **Domain not resolving** | Check registrar DNS settings + wait 1 hour | Registrar support + Alfred |

**During an incident:**
1. Post status update on social media (if user-facing)
2. Email affected users with ETA
3. Provide fallback URL/access method
4. Update status every 30 min
5. Post-mortem after recovery (what broke, how to prevent)

---

## X. COST OPTIMIZATION (Post-Launch)

**Current monthly costs (estimate):**
- Vercel: $20–50 (Pro plan)
- Supabase: $25 (Pro plan, 100 GB data transfer included)
- Paystack: 1.5% + ₦100 per transaction (~₦5k/month at 200 students)
- Resend: $20 (100k emails/month)
- Domain: ~$1–5 (annual)

**Total:** ~₦20–30k/month before revenue

**To reduce costs:**
- Move Vercel to Hobby ($0) after launch if traffic permits (might hit Vercel rate limits)
- Supabase Starter tier ($0–50) if data < 1 GB (we're fine for now)
- Negotiate Paystack rates at >500 txn/month (can get 1.2%)

**Do NOT cut costs on:**
- Database backups (keep Pro)
- SSL/TLS (non-negotiable)
- Email deliverability (Resend or similar, never self-hosted)

---

**Questions?** Email Alfred. Deployment is final; changes should be tested locally first.

**Last verified:** 29 July 2026 (day before launch)
