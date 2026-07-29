# KIT Academy Deployment — Domain + Resend Setup

**Date:** 29 July 2026 (Day before launch)  
**Domain:** kitacademy.net (via Spaceship)  
**Goal:** Point domain to Vercel + wire Resend email for Summer ID delivery

---

## I. DOMAIN SETUP (Spaceship → Vercel)

### Step 1: Add Domain to Vercel

1. Go to **Vercel Dashboard** → Project (Kit) → Settings → Domains
2. Click **Add Domain**
3. Enter: `kitacademy.net`
4. Vercel will show:
   - **CNAME record** (if using www): `cname.vercel-dns.com`
   - **A records** (root): IP addresses

### Step 2: Configure DNS at Spaceship

1. Log into **Spaceship.com** dashboard
2. Find your domain: `kitacademy.net`
3. Go to **DNS Settings** or **Nameservers**
4. Add these records:

#### For Root Domain (`kitacademy.net`):
```
Type: A
Name: @ (or leave blank)
Value: 76.76.19.138

Type: A
Name: @ (or leave blank)
Value: 76.76.19.139
```

#### For WWW Subdomain (`www.kitacademy.net`):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Copy exact values from Vercel's domain setup page — don't guess.**

### Step 3: Wait for DNS Propagation

DNS propagation takes **5 minutes to 48 hours**. Check status:

```bash
# Terminal (any OS)
nslookup kitacademy.net
# Should resolve to Vercel IPs within minutes
```

Vercel will show "Active" once DNS points correctly.

### Step 4: SSL Certificate (Auto)

Vercel automatically provisions an SSL certificate (Let's Encrypt) once domain is active. HTTPS enforced automatically. ✅

---

## II. RESEND EMAIL SETUP

### Step 1: Add Domain to Resend

1. Go to **Resend.com** → Domains
2. Click **Add Domain**
3. Enter: `kitacademy.net`
4. Resend generates DNS records:

#### SPF Record:
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

#### DKIM Record:
```
Type: TXT
Name: default._domainkey
Value: [Long DKIM value from Resend]
```

#### DMARC Record (Optional but recommended):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@kitacademy.net
```

**Add all three to Spaceship DNS alongside the A/CNAME records.**

### Step 2: Verify Domain in Resend

1. After adding DNS records (wait 5 min for propagation)
2. In Resend dashboard → Domains
3. Click **Verify** on kitacademy.net
4. Status should show "Verified" (green checkmark)

**If not verified:** Check DNS records in Spaceship are exact. DNS takes time.

### Step 3: Test Email Sending

```bash
# Test via Resend SDK (if you have API key set up)
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@kitacademy.net",
    "to": "your-email@gmail.com",
    "subject": "Test Email",
    "html": "<p>If you see this, Resend is working!</p>"
  }'
```

Should receive email within seconds.

---

## III. UPDATE CODE & ENV VARS

### Step 1: Environment Variables (Vercel)

Update in **Vercel Dashboard → Settings → Environment Variables**:

```
OLD: NEXT_PUBLIC_SITE_URL = https://kit-ph.vercel.app
NEW: NEXT_PUBLIC_SITE_URL = https://kitacademy.net

Keep: RESEND_API_KEY = re_... (already set if you have it)
```

**After changing env vars, you MUST redeploy:**

```bash
git commit --allow-empty -m "chore: redeploy to pick up domain env vars"
git push origin main
```

This forces Next.js to rebake the env vars into the build.

### Step 2: Update Email Sender (Code)

Find where Resend sends emails (usually in `lib/email/resend.ts` or similar):

```typescript
// OLD
export const EMAIL_FROM = "KIT <onboarding@resend.dev>";

// NEW
export const EMAIL_FROM = "KIT <noreply@kitacademy.net>";
```

Commit:

```bash
git add src/lib/email/resend.ts  # or wherever it is
git commit -m "feat: update email sender to kitacademy.net domain"
git push
```

### Step 3: Wire Resend in `enrol_summer_student` Function

This is the critical piece. When a student is enrolled, send them their Summer ID.

**Location:** Supabase → SQL Editor or migrations

```sql
-- In the enrol_summer_student RPC function (or add a trigger)
-- After inserting summer_student, call Resend API:

SELECT http_post(
  'https://api.resend.com/emails',
  json_build_object(
    'from', 'noreply@kitacademy.net',
    'to', p_parent_email,  -- parent email address
    'subject', 'Your KIT Summer ID',
    'html', format(
      '<p>Hi,</p><p>Your child''s Summer ID is: <strong>%s</strong></p><p>Visit: https://kitacademy.net/summer</p>',
      v_summer_id  -- the generated ID
    )
  ),
  json_build_object(
    'Authorization', 'Bearer ' || current_setting('app.resend_api_key')
  )
);
```

**Or:** Create a separate Edge Function at `/api/email/send-summer-id` and call it via HTTP trigger.

**Or (simplest):** In the Next.js Server Action `enrolSummerStudent`:

```typescript
// app/admin/summer/actions.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enrolSummerStudent(...) {
  // ... enrol logic ...
  
  // Send email
  await resend.emails.send({
    from: "noreply@kitacademy.net",
    to: parentEmail,
    subject: "Your KIT Summer ID",
    html: `
      <p>Hi,</p>
      <p>Your child's Summer ID is: <strong>${summerId}</strong></p>
      <p><a href="https://kitacademy.net/summer">Go to Summer Portal</a></p>
    `,
  });

  return { success: true, summerId };
}
```

### Step 4: Update Paystack Callback URL

**Paystack Dashboard → Settings → Webhooks**

```
OLD: https://kit-ph.vercel.app/api/paystack/webhook
NEW: https://kitacademy.net/api/paystack/webhook
```

Also update callback URL if manually set.

### Step 5: Update Sitemap & Robots.txt

If these reference the old domain:

**`public/sitemap.xml`:**
```xml
<loc>https://kitacademy.net/</loc>
<!-- instead of kit-ph.vercel.app -->
```

**`public/robots.txt`:**
```
Sitemap: https://kitacademy.net/sitemap.xml
```

### Step 6: Search for Hardcoded URLs

```powershell
# PowerShell: find all vercel.app references
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.json,*.md | Select-String "kit-ph.vercel.app"
```

Replace any found with `kitacademy.net`.

---

## IV. PRE-LAUNCH VERIFICATION CHECKLIST

### DNS & Domain

- [ ] Domain points to Vercel (nslookup shows Vercel IPs)
- [ ] Vercel shows "Active" on domain
- [ ] HTTPS enforces (visit https://kitacademy.net, no warnings)
- [ ] Apex redirect works: kitacademy.net → www.kitacademy.net (if set up)

### Resend Email

- [ ] Resend domain shows "Verified" (green checkmark)
- [ ] Test email sent successfully
- [ ] Email sender shows "KIT <noreply@kitacademy.net>" (not generic@resend.com)
- [ ] SPF/DKIM records added to Spaceship DNS

### Code & Environment

- [ ] NEXT_PUBLIC_SITE_URL = https://kitacademy.net in Vercel env
- [ ] Redeployed after env var change
- [ ] Email sender updated to noreply@kitacademy.net (in code)
- [ ] Resend wired in enrol_summer_student (manual email or API)
- [ ] Paystack webhook URL updated
- [ ] No hardcoded kit-ph.vercel.app references in code

### Functionality

- [ ] Apply form → Paystack → callback works on new domain
- [ ] Admin approval → Summer ID generated + email sent
- [ ] Summer ID gate → /summer works
- [ ] Portal loads → /smportal works
- [ ] Smoke test passes

---

## V. LAUNCH DAY (10 August)

### Before 8 AM

- [ ] DNS propagated (nslookup confirms)
- [ ] Resend verified
- [ ] All code deployed
- [ ] Test application → payment → approval → email flow
- [ ] Check Vercel logs for errors
- [ ] Check Resend logs for email delivery

### At 9 AM (1 hour before class)

- [ ] Cohort status: active = true
- [ ] Week 1 published
- [ ] Meet link set
- [ ] Do NOT go live yet (class hasn't started)

### At ~9:50 AM (10 min before class)

- [ ] Go live
- [ ] Monitor: Are students joining Zoom?
- [ ] Monitor: Are emails sending (check Resend dashboard)?
- [ ] Monitor: Any Vercel errors?

### During Class

- [ ] Watch for issues
- [ ] Note: Any parents complaining about missing Summer ID email?
- [ ] Note: Any students unable to join?

### After Class

- [ ] End class (click "End Class")
- [ ] Review Resend delivery stats (all emails delivered?)
- [ ] Check Vercel logs for errors
- [ ] Write post-launch report

---

## VI. ROLLBACK (If Something Breaks)

**If domain doesn't work:**

1. Revert DNS: Point kitacademy.net back to old Vercel setup (or remove it)
2. Keep using kit-ph.vercel.app as fallback
3. Update Paystack webhook back to kit-ph.vercel.app
4. Communicate: "We've moved to kitacademy.net, but you can still use kit-ph.vercel.app"
5. Debug the DNS issue

**If Resend emails don't work:**

1. Disable auto-email in enrol_summer_student (remove API call)
2. Send Summer IDs manually (copy/paste from database)
3. Post-launch: Debug Resend auth, DNS, etc.
4. Re-enable auto-email when fixed

---

## VII. POST-LAUNCH

### Week 1

- Monitor Resend delivery daily
- Check email bounce rates
- Adjust email template if needed
- Tally: How many applications? How many emails delivered?

### Week 2

- If no major issues: Mark Resend as production-ready ✅
- Plan Phase 4 (12-week program) now that Summer is running

---

## Commands Cheat Sheet

```bash
# Check DNS propagation
nslookup kitacademy.net
dig kitacademy.net

# Redeploy after env changes (forces rebuild)
git commit --allow-empty -m "chore: redeploy to pick up env vars"
git push origin main

# Search for old domain references
grep -r "kit-ph.vercel.app" src/
```

---

## Support

**Domain issues?** Contact Spaceship support with DNS record details  
**Resend issues?** Check Resend docs or support; common issue is DNS not propagating  
**Vercel issues?** Check Vercel deploy logs or dashboard  
**Email not sending?** Check Resend dashboard logs + RESEND_API_KEY in Vercel env vars  

---

**Everything set? You're ready to launch. Good luck!** 🚀

Last verified: 29 July 2026
