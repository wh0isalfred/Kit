# Deployment & Domain Migration Guide

**For:** Deploying KIT to production, and as a reusable template for the next domain migration
**Status:** ✅ LIVE at https://kitacademy.net (domain bought from Spaceship, migrated 29 July 2026)
**Last updated:** 29 July 2026 (session 7)

---

## 0. CURRENT STATUS

| Step | Status |
|---|---|
| Domain purchased (kitacademy.net, Spaceship) | ✅ |
| A records → Vercel, CNAME `www` → cname.vercel-dns.com | ✅ |
| Vercel domain Active + SSL auto-provisioned | ✅ |
| Resend domain verified (SPF + DKIM on Spaceship DNS) | ✅ |
| `EMAIL_FROM` = `KIT <noreply@kitacademy.net>` | ✅ |
| `NEXT_PUBLIC_SITE_URL` = `https://kitacademy.net` + redeployed | ✅ |
| Paystack live key rotated (after an earlier leak) | ✅ **Confirmed done** |
| Migrations 0025 + 0026 run | ✅ **Confirmed via direct schema/function query, not assumed** |
| Batch shell (Phase 3.6) built and deployed | ✅ |
| **Paystack webhook URL updated to kitacademy.net** | ⬜ **STILL UNVERIFIED — see below** |
| Sweep for hardcoded `vercel.app` references | ⬜ **VERIFY** |

**On the Paystack webhook specifically:** this has been flagged as an open item across two revisions of this document set now, with no confirmation anywhere in the build history that it was actually tested end-to-end on the live domain. Do not assume it works because the rest of the domain migration succeeded — test a real transaction and confirm `payment_status` flips to `paid` before relying on it for launch.

The sections below are a reusable template for the *next* migration (e.g., if the domain changes again, or a new environment is stood up). Where they say a placeholder domain, read `kitacademy.net` for anything referring to the current, already-completed migration.

---

## I. PRE-LAUNCH DEPLOYMENT CHECKLIST

### Code Quality

- [ ] `npm run build` succeeds with no errors
- [ ] All migrations applied to live Supabase — verify with `supabase migration list`, or more reliably, query `information_schema.columns` / `pg_proc` directly for the specific things you expect (see doc 02 §IX). This project was burned twice by trusting a document's claim about migration status over the database itself.
- [ ] No hardcoded `localhost` or test URLs in code

### Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY          (KEEP SECRET)
PAYSTACK_SECRET_KEY                sk_live_...  (rotated 29 July 2026)
NEXT_PUBLIC_SITE_URL               https://kitacademy.net
RESEND_API_KEY
```

### Payments (Paystack)

- [ ] Live keys configured (`sk_live_*`, not `sk_test_*`)
- [ ] Webhook URL registered: `https://kitacademy.net/api/paystack/webhook` — **and actually tested**, not just registered
- [ ] Callback URL set: `https://kitacademy.net/apply/callback`
- [ ] Test a real transaction end-to-end

### Email (Resend)

- [x] Domain verified
- [x] From email set: `KIT <noreply@kitacademy.net>`
- [ ] Send one real test enrolment and confirm the Summer ID email lands (check spam)

### Database (Supabase)

- [ ] Backups enabled
- [ ] All RLS policies present and active
- [ ] SECURITY DEFINER functions tested
- [ ] Summer cohort active: `summer_cohorts.active = true`

### URLs & Redirects

- [ ] Home, apply, apply callback, `/summer`, `/smportal`, `/admin` all load
- [ ] **New:** each batch's shell loads — `/admin/summer/batch/[any batchId]/overview`, `/class`, `/resources`, `/homework`

### Mobile & Accessibility

- [ ] iPhone 12 (Safari), Pixel 5 (Chrome)
- [ ] Touch targets ≥44px
- [ ] Color contrast passes WCAG AA

---

## II. LAUNCH DAY (10 August 2026)

### 1 Hour Before

- [ ] Paystack dashboard open, Supabase dashboard open, mobile device on hand
- [ ] For each batch running today: confirm the Class tab has the right meet link and instructor set

### Go Live (9 AM)

- [ ] Cohort active, Week 1 published
- [ ] Meet links set per batch
- [ ] Don't click "Go Live" on any batch until you're actually in the room

### First 30 Minutes

Watch: applications coming in, Paystack webhooks firing, no 500s in Vercel logs.

### During First Class

- [ ] 15 min before, per batch running: click **Go Live**
- [ ] After class, per batch: click **End Class**

### End of Day 1

- [ ] Tally applications and payments
- [ ] Review Supabase audit log for errors
- [ ] Short post-launch note: what worked, what didn't

---

## III. DOMAIN MIGRATION TEMPLATE (For the Next One)

Kept as a reusable process, not a live task — the current domain (kitacademy.net) is already done.

### Step 1: Verify Domain with Resend
Add domain in Resend, add the SPF/DKIM/DMARC TXT records at the registrar, wait for "Verified."

### Step 2: Point Domain at Vercel
Add domain in Vercel, add the CNAME/A records at the registrar, wait for "Active."

### Step 3: Update Code (Sender Email)
`lib/email/resend.ts` — update `EMAIL_FROM`.

### Step 4: Update Environment Variables
`NEXT_PUBLIC_SITE_URL` in Vercel, then **redeploy** (baked at build time):
```bash
git commit --allow-empty -m "chore: redeploy for domain migration"
git push origin main
```

### Step 5: Update Paystack Webhook URL
Paystack dashboard → Settings → Webhooks. Update both the webhook and callback URL. **Then actually test a transaction — don't just update the URL and assume it works.**

### Step 6: Sweep for Hardcoded URLs

```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.json | Select-String "vercel.app"
```

### Step 7: Test End-to-End
Apply flow, email delivery, Summer ID gate, admin dashboard, and — new for this codebase — the batch shell's four tabs, on the new domain.

### Step 8: Update Status
Same checklist shape as §0 above.

---

## IV. SSL/TLS

Auto-handled by Vercel once DNS points correctly. If a certificate doesn't appear within 48 hours, verify DNS is actually pointing to Vercel (not just Resend), and check the Vercel dashboard for errors.

---

## V. ROLLBACK PROCEDURE

1. Revert DNS to the previous working setup.
2. Revert `NEXT_PUBLIC_SITE_URL` in Vercel, redeploy.
3. Point the Paystack webhook back.
4. Communicate a fallback URL if users are affected.
5. Debug with Vercel/Supabase logs, then retry.

**Target:** rollback in under 5 minutes. Users should see minutes of disruption, not hours.

---

## VI. EMERGENCY CONTACTS & ESCALATION

| Issue | Action |
|-------|--------|
| Payment webhook failing | Check Paystack dashboard + webhook logs |
| Email not sending | Check Resend dashboard + API key |
| Site 500 error | Check Vercel logs + Supabase logs |
| Database down | Supabase status page + backups |
| A batch's shell won't load | Check the batch actually exists (`batches` table), and that the admin's session/role check is passing — see doc 02 §II on the auth gate |

---

## VII. COST NOTES (Post-Launch)

Rough monthly estimate at current scale: Vercel $20–50, Supabase $25, Paystack ~1.5%+₦100/txn, Resend $20, domain ~$1–5/year. Don't cut costs on database backups, SSL, or email deliverability.

---

**Questions?** Email Alfred. Test locally before deploying anything that touches payments or auth.

**Last verified:** 29 July 2026 (session 7)
