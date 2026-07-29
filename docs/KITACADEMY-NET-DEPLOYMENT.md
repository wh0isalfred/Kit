# KIT Academy Deployment — Domain + Resend Setup (As-Built Record)

**Date completed:** 29 July 2026
**Domain:** kitacademy.net (via Spaceship)
**Status:** DNS, SSL, and Resend are live and working. **The Paystack webhook has not been confirmed tested on this domain — see §IV.**
**Last updated:** 29 July 2026 (session 7)

This document is kept as both a record of what was done for this specific migration, and a reusable reference for the next one. The step-by-step instructions below are still accurate as a how-to; the checklist at the end reflects real, current status — not what was planned.

---

## I. DOMAIN SETUP (Spaceship → Vercel) — DONE

1. Vercel → Project → Settings → Domains → add `kitacademy.net`.
2. Spaceship DNS: A records for the root domain to Vercel's IPs, CNAME for `www` to `cname.vercel-dns.com`. Copy exact values from Vercel's own domain setup page — don't reuse values from memory or an old guide, they can change.
3. Propagation: 5 minutes to 48 hours. `nslookup kitacademy.net` to check.
4. SSL: auto-provisioned by Vercel once the domain shows "Active." No manual step.

**Confirmed working.**

---

## II. RESEND EMAIL SETUP — DONE

1. Resend → Domains → add `kitacademy.net`.
2. Add the SPF, DKIM, and DMARC TXT records Resend generates to Spaceship DNS, alongside the A/CNAME records from §I.
3. Wait for "Verified" in the Resend dashboard.
4. Test with a real send (via the Resend dashboard or a curl call to the Resend API).

**Confirmed working** — Summer ID emails and KIT ID/password-link emails on approval both send successfully from `noreply@kitacademy.net`.

---

## III. CODE & ENVIRONMENT VARIABLES — DONE

- `NEXT_PUBLIC_SITE_URL` = `https://kitacademy.net` in Vercel, followed by a redeploy (this is baked at build time — changing the env var alone does nothing until the next build):
  ```bash
  git commit --allow-empty -m "chore: redeploy to pick up domain env vars"
  git push origin main
  ```
- Email sender in code set to `KIT <noreply@kitacademy.net>`.
- Resend wired directly into the relevant Server Actions (enrolment, approval) — no separate Edge Function or database trigger was used; the simplest option (calling the Resend SDK directly from the Server Action that already runs the enrolment/approval logic) is what shipped.

**Confirmed working.**

---

## IV. PAYSTACK — STATUS: WEBHOOK NOT CONFIRMED TESTED

**Callback URL and webhook URL were updated** in the Paystack dashboard to point at `kitacademy.net` instead of the old Vercel preview URL. **What has not been confirmed anywhere in this project's build history: an actual end-to-end test transaction on the live domain, checked all the way through to `payment_status` flipping to `paid` in the database.**

This has now been flagged as an open item across multiple document revisions without resolution. **Before relying on payments working on launch day, actually run a test transaction and watch it complete.** Don't take "the URL was updated" as equivalent to "it works" — those are different claims, and this document previously conflated them.

```
Paystack Dashboard → Settings → Webhooks
Registered: https://kitacademy.net/api/paystack/webhook
```

---

## V. SEARCH FOR HARDCODED OLD-DOMAIN REFERENCES

```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.json,*.md | Select-String "kit-ph.vercel.app"
```

**Status:** not confirmed clean in this revision — treat as an open item, same as the webhook test, rather than assuming it was done just because the rest of the migration succeeded.

---

## VI. PRE-LAUNCH VERIFICATION CHECKLIST — CURRENT STATUS

### DNS & Domain
- [x] Domain points to Vercel
- [x] HTTPS enforces, no warnings

### Resend Email
- [x] Domain verified
- [x] Sender shows `KIT <noreply@kitacademy.net>`
- [x] Real enrolment/approval emails confirmed delivered

### Code & Environment
- [x] `NEXT_PUBLIC_SITE_URL` correct, redeployed
- [x] Email sender updated in code
- [x] Resend wired directly in Server Actions

### Payments
- [ ] **Paystack webhook URL updated — yes. Actually tested end-to-end — no. Do this before launch.**
- [ ] Sweep for `kit-ph.vercel.app` references — not confirmed clean

### Functionality
- [x] Apply → Paystack init → callback works on the new domain (init and callback confirmed; the *webhook* — the part that marks payment as received — is the untested piece, see above)
- [x] Summer ID gate and portal load correctly
- [x] Batch shell (all four tabs, all batches) loads correctly on the new domain

---

## VII. LAUNCH DAY (10 August)

Same shape as doc 04's launch-day section — this document doesn't duplicate it in full. The one addition specific to this domain migration: **before 8 AM on launch day, run the Paystack test transaction that's been outstanding since this migration.** It should have been done well before launch day; if it hasn't been, it's the single highest-priority open item in this entire document set.

---

## VIII. ROLLBACK

If the domain breaks: revert DNS, revert `NEXT_PUBLIC_SITE_URL`, redeploy, point the Paystack webhook back to the old URL, communicate a fallback, debug, retry. Same procedure as doc 04 §V.

If Resend breaks: disable the automatic email call in the enrolment/approval Server Actions, copy Summer IDs and KIT IDs manually in the interim, re-enable once fixed.

---

## Commands Cheat Sheet

```bash
nslookup kitacademy.net
dig kitacademy.net

git commit --allow-empty -m "chore: redeploy to pick up env vars"
git push origin main

grep -r "kit-ph.vercel.app" src/
```

---

## Support

Domain: Spaceship support. Resend: Resend docs/support, common issue is DNS propagation. Vercel: deploy logs/dashboard. Email not sending: Resend dashboard logs + `RESEND_API_KEY`.

---

**Everything except the Paystack webhook test is confirmed done. That one item is real, outstanding, and worth doing today, not on launch morning.**

**Last verified:** 29 July 2026 (session 7)
