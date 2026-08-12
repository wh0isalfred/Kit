# Deployment & Domain Migration Guide

**For:** Deploying KIT to production
**Status:** ✅ LIVE at https://kitacademy.net, running with real students.
**Last updated:** 12 August 2026 (session 8) — updated for two launch-day findings; domain/DNS content itself unchanged, see prior revision.

---

## 0. MIGRATION STATUS — updated

| Step | Status |
|---|---|
| Domain, SSL, Resend, `NEXT_PUBLIC_SITE_URL` | ✅ (unchanged from prior revision) |
| **Paystack webhook URL updated to kitacademy.net** | ⬜ Still unverified |
| **Paystack payment redirect actually firing** | 🔴 **CONFIRMED BROKEN.** An application went through without the Paystack redirect ever firing. Under active investigation, currently paused. This is the top priority open item in the whole project — see doc 01 §III and doc 07. |
| Paystack key rotated (a live key was pasted into chat during development) | ⬜ Reported done, never independently re-verified |
| Migration 0029 (summer bucket student read policy) actually applied | ⬜ Written and handed off, **never confirmed run** — see doc 02 §VI, doc 07 Bug 3 |

**Do not treat Paystack as working based on this document or any other — it's confirmed broken as of this revision. Test a real transaction before relying on it.**

---

## I. PRE-LAUNCH DEPLOYMENT CHECKLIST — unchanged from prior revision, except:

### Payments (Paystack) — this section is not currently passing
- [ ] ~~Live keys configured~~ — configured, but **the actual payment flow does not work end to end.** Diagnose before checking this off.
- [ ] Webhook URL registered — unverified
- [ ] Test a real transaction with a test card — **do this, it will currently fail or behave unexpectedly**

### Database
- [ ] All 29 migrations applied — verify specifically that 0027 and 0029 both show up in `supabase migration list`; 0028 should **not** be applied (deliberately reverted to UI-only, see doc 01)

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
