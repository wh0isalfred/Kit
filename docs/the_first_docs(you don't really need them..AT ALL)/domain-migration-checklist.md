# KIT Port Harcourt — domain migration checklist

For when a real domain (e.g. `kitglobal.com`) is bought, replacing
`kit-ph.vercel.app` as both the site's address and the email sender.
Do these roughly in this order — verification has to land before the
code changes go live, or email will just silently fail again.

---

## 1. Verify the domain with Resend

**Where:** Resend dashboard → Domains → Add domain.

- Add the domain (e.g. `kitglobal.com`).
- Resend gives you a set of DNS records (SPF, DKIM, and usually a
  DMARC recommendation).
- Add those records at your **domain registrar's** DNS settings (not
  Vercel's — this step is separate from hosting).
- Wait for Resend to show the domain as verified. This can take a few
  minutes to a few hours depending on DNS propagation.

**Don't skip ahead to step 3 until this shows verified** — sending
from an address on an unverified domain will fail or land in spam.

---

## 2. Point the domain at Vercel (hosting)

**Where:** Vercel dashboard → your project → Settings → Domains.

- Add the domain there.
- Vercel gives you its own DNS records (usually an A record or CNAME)
  — add those at the registrar too, alongside Resend's records from
  step 1. They don't conflict; they're different record types.
- Once Vercel shows the domain as active, `kit-ph.vercel.app` will
  still work as a fallback, but the real domain should become the
  canonical address.

---

## 3. Code change — sender address

**File:** `lib/email/resend.ts`

Change:
```ts
export const EMAIL_FROM = "KIT Port Harcourt <onboarding@resend.dev>";
```
to something on the verified domain, e.g.:
```ts
export const EMAIL_FROM = "KIT Port Harcourt <noreply@kitglobal.com>";
```
Pick whichever local part you want (`noreply@`, `hello@`, `no-reply@`
— doesn't matter to Resend, just needs to be on the verified domain).

This is the only line that needs to change for email to start
reaching real parents instead of just your own inbox.

---

## 4. Environment variable — site URL

**File:** `.env.local` (local) and Vercel → Project → Settings →
Environment Variables (production + preview).

Change:
```
NEXT_PUBLIC_SITE_URL=https://kit-ph.vercel.app
```
to:
```
NEXT_PUBLIC_SITE_URL=https://kitglobal.com
```

This env var feeds the Paystack callback URL construction (§7 of the
handoff doc). **This is baked in at build time** — after changing it
in Vercel, you must trigger a new deployment, not just save the
variable. A redeploy with no code changes (or just an empty commit)
is enough.

---

## 5. Paystack dashboard — callback/webhook URLs

**Where:** Paystack dashboard → Settings → API Keys & Webhooks (or
wherever your webhook URL is registered).

- If the webhook URL was registered as
  `https://kit-ph.vercel.app/api/paystack/webhook`, update it to
  `https://kitglobal.com/api/paystack/webhook`.
- Same for any callback URL if one was manually entered rather than
  built dynamically from `NEXT_PUBLIC_SITE_URL`.

This step is easy to miss because nothing in your own code fails —
Paystack just keeps posting to the old URL, which may or may not
still resolve depending on whether the `.vercel.app` domain stays
active.

---

## 6. Sweep the codebase for hardcoded references

**Where:** project root, PowerShell.

```
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.json,*.md | Select-String "vercel.app"
```

Anywhere this turns up outside of comments/docs (README, this
handoff doc itself, etc.) is a potential hardcoded URL that needs
updating to the new domain — things like Open Graph image URLs,
`sitemap.xml` or `robots.txt` if either exists, or any absolute link
that wasn't built from `NEXT_PUBLIC_SITE_URL`.

---

## 7. Test before trusting it

- Approve a test application (12-week) or enrol a test summer
  application, using **your own real email address** as
  `parent_email` — confirm the email actually lands, and check the
  sender shows the new domain, not `resend.dev`.
- Trigger the Paystack webhook with a real test transaction on the
  live `kitglobal.com` URL, not `kit-ph.vercel.app` — this is also
  the "prove the webhook on the deployed URL" item still open from
  the original handoff doc, so it's worth doing both at once.

---

## Summary — the 3 things that actually change

| What | Where | From | To |
|---|---|---|---|
| Sender address | `lib/email/resend.ts` | `onboarding@resend.dev` | `noreply@kitglobal.com` (or similar) |
| Site URL | `.env.local` + Vercel env vars | `https://kit-ph.vercel.app` | `https://kitglobal.com` |
| Webhook URL | Paystack dashboard | `.../kit-ph.vercel.app/...` | `.../kitglobal.com/...` |

Everything else (DNS records at the registrar, Vercel domain
settings) is dashboard configuration, not code.
