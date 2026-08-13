# Deployment & Domain Migration Guide

**For:** Deploying KIT to production
**Status:** ✅ LIVE at https://kitacademy.net, running with real students.
**Last updated:** 13 August 2026 (session 9) — status table corrected; domain/DNS content itself unchanged, see prior revision.

---

## 0. MIGRATION STATUS — updated

| Step | Status |
|---|---|
| Domain, SSL, Resend, `NEXT_PUBLIC_SITE_URL` | ✅ (unchanged from prior revision) |
| **Paystack payment flow** | ✅ **WORKING.** Multiple real payments collected successfully. The earlier "broken" report was payment abandonment — a parent closing the checkout modal — which `submitApplication` deliberately handles by saving the application anyway. See doc 07. |
| Paystack key rotated (a live key was pasted into chat during development) | ⬜ Reported done, never independently re-verified |
| **Paystack USD / international payments** | 🔴 **NOT POSSIBLE on this account.** Paystack could not enable USD. Migration 0033 and the supporting code exist but are deliberately unrun. Blocked pending a Stripe integration. |
| Migrations 0029–0032, 0034 | ✅ All confirmed run and working |
| Migration 0033 (USD pricing) | ⛔ **Deliberately NOT run.** Do not apply as-is. |
| SEO: robots, sitemap, metadata, OG image, structured data | ✅ Deployed and verified |
| Google Search Console + Bing Webmaster Tools | ✅ Verified, sitemap submitted, homepage and /apply indexed |

**Payments work for Nigerian cards and manual bank transfers. International parents currently pay the naira amount and their bank handles conversion — a Stripe integration is the real fix.**

---

## I. PRE-LAUNCH DEPLOYMENT CHECKLIST — unchanged from prior revision, except:

### Payments (Paystack) — working for NGN
- [x] Live keys configured and the flow works end to end — multiple real payments collected
- [x] Webhook confirmed firing (applications correctly marked paid automatically)
- [ ] **International payments still unsolved** — see status table above. Stripe needed.
- [ ] Confirm the live secret key was actually rotated after being exposed in chat during development

### Database
- [ ] All migrations through 0034 applied — verify in `supabase migration list`. **Two are deliberately NOT applied: 0028** (would have allowed redoing graded homework; the UI feature was removed instead) **and 0033** (USD pricing; Paystack can't support it). Neither absence is a mistake.
- [ ] Regenerate types after any new migration: `npx supabase gen types typescript --linked > src/lib/database.types.ts`

### URLs & Redirects — added this session
- [ ] `/smportal` loads for a real (non-admin) student session, not just an admin's browser — this exact distinction is what two launch-day bugs looked like from the outside (see doc 07)
- [ ] A resource "View" link actually opens for a real student, not just an admin

---

## II. LAUNCH DAY — unchanged from prior revision (already happened; kept as reference for the next cohort's launch)

---

## III–X. Domain migration reference, SSL, performance, communication templates, rollback, monitoring, cost — unchanged from prior revision

---

**Questions?** Email Alfred. See doc 07 for the full detail on what's already gone wrong once in production.

**Last verified:** 12 August 2026 (session 8)
