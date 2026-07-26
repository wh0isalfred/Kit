# KIT Port Harcourt — Project Handoff

**Last updated:** 26 July 2026
**Read this first.** It's the single source of truth for anyone — human or AI — picking up this project. Where this doc and older docs disagree, this doc wins. Where this doc and the database disagree, **the database wins** (schema drifts faster than prose).

---

## 1 · What KIT is

A kids' tech-education platform in Port Harcourt, Nigeria. Ages 10–15. Two products:

| | Summer Build Camp | Future Skills Lab (12-week) |
|---|---|---|
| Length | 3 weeks | 12 weeks, Saturdays |
| Access | Summer ID only, no password | Real Supabase Auth account |
| ID format | `SM26734` | `WD2601-0042` |
| Price | ₦15,000 flat | ₦75,000 upfront / ₦27,000×3 |
| Batches | No — one roster | Max 15 per batch |
| Prize | ₦30,000 team prize | KIT Points + certificates |

These have **fundamentally different security models** — that's the central architectural fact (see §5).

**Owner:** Alfred (alfredenyinna03@gmail.com) is the sole founder/admin. *(Note: this project belongs to Alfred, who builds it via a shared Claude account. Do not attribute it to the account holder.)*

**Commercial reality:** Pre-revenue. Summer is the launch product, camp starts **10 August 2026**. Zero cohorts have run through the platform yet.

**Contact (standardised):** `kitph@gmail.com` / `+234 812 912 0553`. Any `kidsintechph@gmail.com` in old files/mockups is wrong.

---

## 2 · Stack

- **Next.js 16** App Router, TypeScript strict, **Turbopack**
- **Supabase** — Postgres 16, Auth, Storage, RLS. Project ref `hqwdfukdvbyqxcbuylow`
- **Paystack** — payments (working, see §7)
- **Vercel** — deploy. Repo: `github.com/wh0isalfred/Kit`, branch `main`
- **Resend** — email, **NOT yet wired** (see §8)
- Single `globals.css`, BEM-flat naming. **No Tailwind, no CSS modules.**
- Founder dev env: **Windows / PowerShell / VS Code** (use `Get-ChildItem`/`Select-String`, `curl.exe`, `Invoke-RestMethod`)

### Brand tokens (in `globals.css :root`)
```
--navy:#1F2C4F  --navy-2:#16203b  --blue:#1999E4  --green:#25B290
--ink:#1F2C4F  --muted:#5d6781  --faint:#97a0b5
--paper:#fcfdff  --line:#e8ebf2
--grad:linear-gradient(122deg,#1F2C4F,#1999E4,#25B290)
--grad-bright:linear-gradient(122deg,#4db4f0,#1999E4,#25B290)
--maxw:1160px
```
**No purple.** An earlier portal used invented purple tokens; they were removed. Navy/blue/green + the gradient only.

---

## 3 · Routes

```
/                     home (marketing)          ✅
/about                                          ✅
/apply                application + Paystack     ✅ working
/apply/callback       post-payment page          ✅ working
/refund-policy        full policy                ✅
/summer               marketing + Summer ID gate ✅
/smportal             gated student portal        ✅ (mid-redesign, see §9)
/admin                dashboard                   ✅
/admin/summer         cohort, weeks, resources,   ✅
                      live toggle, roster
/admin/applications   approve / reject / mark-paid✅
/login                DOES NOT EXIST — nav "Login" points to /summer
```

Marketing pages live under `app/(marketing)/` route group (shared layout renders the nav). `/summer`, `/smportal`, `/admin` sit outside it with their own chrome.

**Proxy/middleware:** `src/proxy.ts` (renamed from middleware.ts for Next 16, exports `proxy`). Matcher is **`/admin/:path*` only** — session refresh runs on admin, nowhere else. Broad matchers here have twice caused `/apply/callback` and other pages to 404; keep it scoped.

---

## 4 · Database — 19 migrations, live on Supabase

Migrations `20260721000001`–`000012` (original 12) then `0013`–`0019`. **The migrations are the schema truth**, not any prose doc.

### Core tables
`courses` · `profiles` (**PK is `user_id`, not `id`** — has bitten repeatedly) · `teachers` · `batches` · `students` · `applications` · `payments` · `resources` · `class_sessions` · `attendance` · `assignments` · `submissions` · `announcements` · `kit_points_rules` · `kit_points_ledger` · `certificates` · `summer_students` · `summer_content` · `summer_cohorts` · `summer_resources` · `summer_access_attempts` · `audit_log`

### Key conventions (do not violate)
- **All money is kobo** (bigint). Naira only at the display boundary, via views. Never `/100` in a component.
- **All ages derive from stored DOB**, never a stored age integer.
- **Points are a ledger**, `students.kit_points` is a trigger-maintained cache.
- **Display code reads naira from views; money-handling reads kobo from base tables. Never merge the two.**

### Migrations 13–19 (what each added)
- **0014** — `submit_application()` + `set_application_payment_ref()`, SECURITY DEFINER. **The only public write path into `applications`** (no anon RLS there — it holds a child's DOB, school, parent contact).
- **0015** — `registration_opens_at/closes_at` on `summer_cohorts` + public read policy scoped to the active row (so the countdown works without a session). Dropped `summer_camp_settings`.
- **0016** — `summer_resources` table (one row per resource) + `get_summer_resources()`. Replaces the jsonb arrays on `summer_content`, which couldn't do per-item publish/identity. Accumulates weeks up to `current_week`; never leaks future weeks.
- **0017** — Fixed pgcrypto search_path. **On Supabase, pgcrypto lives in the `extensions` schema, not `public`.** Functions calling `gen_random_bytes` must pin `search_path = public, extensions`. Affected `generate_summer_id`, `generate_certificate_serial`.
- **0018** — Added `applications.summer_student_id`; replaced the `approved_has_student` constraint with `approved_has_enrolment` (student_id OR summer_student_id). Summer enrolment could never satisfy the old constraint. Also updated `enrol_summer_student()` to set the link.
- **0019** — `is_live` + `live_started_at` on `summer_cohorts` + `set_summer_live()` admin toggle (audited).

### Key function signatures (verify via pg_proc before calling)
- `submit_application(p_student_name, p_student_dob, ...)` → returns application `uuid`
- `approve_application(p_application_id uuid, p_batch_id uuid)` → `student_id, kit_id, batch_label, email`. Requires `payment_status='paid'`.
- `reject_application(p_application_id, p_reason)` → `refund_due, refund_kobo`. **Surfaces** refund exposure, doesn't decide policy.
- `enrol_summer_student(p_application_id, ... OR p_name, p_cohort_year, ...)` → `summer_student_id, summer_id, name`. Two paths: from paid application, or bare roster import.
- `record_payment(p_payment_id uuid, ...)` — takes a **payment** id (instalments 2–3), not an application id.
- `verify_summer_id(id, ip, ua)` → whole gate: rate-limit → lookup → record, atomic. Gives no hint why an ID failed. **Requires an ACTIVE cohort** or it rejects valid IDs.
- `set_summer_live(p_cohort_year int, p_live bool)` — admin-only.
- `get_summer_portal(year)` / `get_summer_resources(year)` — student read paths.
- `write_audit(p_action, p_entity, p_entity_id uuid, p_summary, p_detail)` — **`p_entity_id` is uuid.** Tables keyed by year/week (summer_cohorts, summer_content) have no uuid — pass `null` and put the key in the summary.

### Views
`public_courses` (naira) · `students_for_teacher` (column-restricted) · `batch_top5` · `admin_application_queue` (returns `approvable`, `needs_payment_check` pre-computed — don't re-derive) · `admin_outstanding_payments` · `admin_stats`

### Storage buckets
`public-assets` · `batch-resources` · `submissions` · `certificates` · `summer`. Paths are `{year}/week{n}/{file}` — the policy parses ownership from the path.

---

## 5 · The two access models (the central design)

**12-week:** Supabase Auth session → `profiles.user_id → role` → RLS scopes every query. Students, teachers, admin all use this.

**Summer:** **No Auth account.** Summer ID checked against roster → HMAC-signed cookie (signed with the service-role key) grants read access. Because summer students have **no session, no RLS policy can serve them** — everything they read goes through SECURITY DEFINER functions behind the cookie check. (ADR 002.)

Consequence: if a summer read function ever starts returning per-student data, ADR 002 must be reopened first.

### Security posture
- RLS on every table.
- Every SECURITY DEFINER function pins `search_path` (prevents `profiles` shadowing / privilege escalation).
- Teachers have **no SELECT on `students`** — they read `students_for_teacher` (4 columns).
- Application amounts recomputed in the DB; tampered amounts rejected at the database, not just the Server Action.
- Signed URLs for summer files are **forwardable once minted** (10-min expiry). Fine for slides/homework; nothing sensitive in that bucket.

---

## 6 · Summer — fully built, end to end ✅

The launch product. Complete flow works: **apply → Paystack → pay → admin enrol → Summer ID → /summer gate → /smportal → resources.**

- **/admin/summer** — cohort dates, registration window, current week, prize; per-week content (title, note, Meet link, next class); resources (week tabs → day grouping → publish toggle, file upload ≤25MB, reorder, delete); roster; **live-class toggle**.
- **Live indicator** — cohort-level explicit toggle (`set_summer_live`), NOT computed from the clock. Admin "Go live / End class" with a running timer + "starts in X min" nudge. Portal reflects it. Chosen so the badge never lies (a kid clicking Join into an empty room is worse than no badge). **Admin must remember to toggle it**, same as bumping current week each Monday.
- **Current cohort:** Summer 2026, starts 10 Aug 2026, ends 28 Aug 2026, registration closes 8 Aug, prize ₦30,000, active=true. Admin user is Alfred (role admin).

### Operational gotchas
- **Bump `current_week` in admin each Monday** or students see nothing new (future weeks are gated).
- Time-sensitive reads (live state, countdown) need `noStore()` **inside the data function or the render — NOT at module scope.** A top-level `await` broke the Vercel build (`cookies called outside request scope`). Anything touching cookies/`createClient` must live *inside* the async component.

---

## 7 · Paystack — working ✅

- Init server-side (`initializeTransaction`, 15s timeout), callback at `/apply/callback` (verify-only, display), webhook at `/api/paystack/webhook` (HMAC-verified raw body, service-role client, guarded UPDATE, idempotent). Webhook is the **only** thing that marks paid in production.
- **On localhost, `payment_status` stays `pending_payment` even after a successful test payment** — the webhook can't reach localhost. Expected. Use "Record payment manually" in admin, or test the webhook from the deployed URL.
- **⚠️ SECURITY:** a live secret key was pasted into chat during development (`sk_live_b883...`). **It must be rolled** in the Paystack dashboard if not already done — status unconfirmed. Roll it.
- **Testing:** use `sk_test_` keys locally. Env baked at build — after changing Vercel env vars, **redeploy**.

### Required env vars
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (not ANON_KEY),
SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY, NEXT_PUBLIC_SITE_URL (real URL, not localhost),
RESEND_API_KEY (not yet set)
```

---

## 8 · What's NOT built / open

- 🔴 **Resend / email — not wired.** Enrolment generates the Summer ID but emails nothing; the founder currently copies it by hand. `provisionStudentAccount` also can't send login emails. This is the top remaining task. `login_email_sent_at` stays null and is retryable by design.
- 🟠 **Paystack webhook unproven on deployed URL** — works locally via manual mark-paid, never confirmed firing on Vercel.
- 🟠 **12-week side barely started** — zero batches exist (blocks all term approvals). Admin screens still unbuilt: Students, Courses, Batches, Teachers, Payments, Classes, Audit. RLS/schema for these already exists; only UI is missing.
- 🟡 **/smportal redesign in progress** — see §9.
- 🟡 **No rate limit on `submit_application`** (public write endpoint).
- 🟡 **Refund policy page built** but confirm the short version is placed near the apply consent checkbox + footer link.
- 🟡 **No domain** — `kit.ng` referenced but not acquired.

---

## 9 · The /smportal redesign (in flight — pick this up)

Portal works but was judged "too childish, not Harvard standard." Redesign brief agreed:
- **Warm but grown-up** — credible, still friendly for kids.
- **Colorful but polished** — keep the brand palette lively, more restraint.
- **Live state = a calm Join button that's simply prominent when class is on.** No red, no pulsing.
- **Replace emoji with SVG line icons** (the biggest "childish" tell — resource icons, hero).

**New CSS is done:** `kit-portal-v2/portal.css` (in outputs) — replaces the portal block in `globals.css`. It expects new markup: `pt-hero-inner`, `pt-res-tile.kind-*`, `pt-class.in-session`, `pt-class-btn.live`/`.idle`, `pt-empty-icon`, SVG icons.

**STILL TODO:** rewrite `PortalContent.tsx` markup to match the new CSS — swap emoji `kindIcon` for SVG line icons, use the new classes, keep existing logic (isLive prop, signed-URL file open, code toggle, home link, Footer). The current component still uses emoji and old classes.

---

## 10 · Working conventions (the founder's standing rules)

- **Push back honestly. Evaluate feasibility, don't validate by default.**
- **Never fabricate data or claim something works unverified.**
- **Document contradictions rather than silently resolving them.**
- **Commit messages:** short, human, no `"` / backtick / `$` (they break `git commit -m` quoting in PowerShell). For long ones, use the editor or `-F`.
- Rapid MVPs, free-tier tooling, AI agents as the dev team.

### For an AI picking this up
- **The migrations are canonical for schema.** Verify RPC signatures against `pg_proc` before calling — several bugs came from assumed parameter names.
- `profiles` PK is `user_id`. Zero is a legitimate state everywhere (pre-launch) — render it as "none yet", not broken.
- `"column X does not exist"` = the migration adding X hasn't been run. `"cookies called outside request scope"` = a cookie read at module scope; move it inside the function.
- **Uploads to this project's chat have been unreliable** — ask the founder to paste files as text.
- There's a real-Supabase **smoke test** at `db-tests/smoke_test.sql` — runs the whole chain in a rolled-back transaction. Run it after any migration touching a function/constraint. It exists because the shim-based tests missed three production bugs (pgcrypto schema, summer constraint, hardcoded instalment multiplier).

---

## 11 · Immediate next steps (in order)

1. **Roll the leaked Paystack key** if not already done (§7).
2. **Finish the /smportal redesign** — rewrite `PortalContent.tsx` to match `kit-portal-v2/portal.css` (§9).
3. **Wire Resend** — send the Summer ID on enrolment (§8).
4. **Prove the webhook** on the deployed Vercel URL with a test card (§7).
5. Then, if pursuing the 12-week product: build **Batches** first (unblocks all term approvals), then the remaining admin screens.
