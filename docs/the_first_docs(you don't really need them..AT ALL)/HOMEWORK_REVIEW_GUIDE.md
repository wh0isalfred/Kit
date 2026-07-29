# Step 5 Complete — Google Classroom-Style Homework Review

**Status:** Homework review system is complete and ready to deploy.

---

## What's New

A **Google Classroom-like homework review interface** embedded in `BatchSessionManager`:

1. **Per-batch, per-week homework list** — shows all assignments for that week that have submissions
2. **Modal roster view** — click an assignment to see all students and their submission status
3. **Inline feedback return** — expand a student row, type feedback, and return the assignment without leaving the modal
4. **Status tracking** — displays "Not turned in", "Turned in", "Returned" pills with submission timestamps
5. **Live updates** — when you return an assignment, the row updates immediately

## User Flow

**Admin at `/admin/summer`:**
1. Pick a batch + week from dropdowns
2. See "Live class & batch sessions" section with the homework list at the bottom
3. Click an assignment → modal opens with the roster
4. Click a student → expand to see:
   - Their submission (link or file)
   - Any prior feedback you've given
   - A textarea to type new feedback
5. Hit "Return assignment" → feedback is stored, status changes to "Returned"
6. Student sees the returned assignment + feedback in their portal

## Files to Deploy

**New files:**
- `HomeworkReview.tsx` → `src/app/admin/(protected)/summer/HomeworkReview.tsx`
- `homework-review.css` → append to `src/app/globals.css`

**Updated files:**
- `BatchSessionManager.tsx` → `src/app/admin/(protected)/summer/BatchSessionManager.tsx`
- `batch-actions.ts` → `src/app/admin/(protected)/summer/batch-actions.ts` (append the new functions)
- `summer-page.tsx` → `src/app/admin/(protected)/summer/page.tsx`

## Key Implementation Details

### Server Actions (batch-actions.ts)

Two new async functions:

**`getHomeworkRoster(resourceId, batchId, week)`** — fetches the roster for a homework resource in a specific batch/week. Calls the `get_homework_roster` RPC which returns students with their submission status, URLs, and prior feedback.

**`returnHomework(resourceId, summerId, feedback)`** — marks a submission as returned and stores feedback. Calls the `return_homework` RPC.

### Components

**`HomeworkReview`** — the roster modal. On mount, fetches the roster for the selected homework/batch/week. Renders:
- Stats bar (total, not turned in, turned in, returned)
- Roster list, sorted by status (assigned → turned_in → returned)
- Each student can be expanded to show submission + feedback form

**`BatchSessionManager`** — enhanced to include homework section. When you pick a batch/week, it shows homework resources for that week as clickable buttons. Clicking opens `HomeworkReview` in a modal overlay.

### CSS

Google Classroom aesthetic:
- Clean roster rows with click-to-expand
- Status pills matching summer portal colors (blue for "turned in", green for "returned")
- Modal overlay with close button
- Inline feedback textarea with return button
- Stats bar showing counts at a glance

---

## Testing Checklist

- [ ] Navigate to `/admin/summer`
- [ ] Create a batch if you don't have one
- [ ] Add a homework assignment to a week (mark it as homework in SummerResources)
- [ ] Enrol a student in the batch
- [ ] (As student) Submit the homework from `/smportal`
- [ ] (As admin) Go to Batches dropdown → pick the batch
- [ ] Week dropdown → pick the week with homework
- [ ] See "Homework for this week" section with the assignment button
- [ ] Click the assignment → modal opens
- [ ] See the student in the roster with status "Turned in"
- [ ] Click the student row to expand
- [ ] See their submission link/file
- [ ] Type feedback and hit "Return assignment"
- [ ] Row updates to show "Returned" status
- [ ] (As student) Refresh portal → homework shows "Returned" with feedback

---

## Known Limitations

1. **No batch/week filter persistence** — if you refresh, you're back at batch 1, week 1. Could add localStorage to remember selection.

2. **No manual refetch button** — if a new submission comes in while you're reviewing, you won't see it until you close and reopen the modal. Real classroom would poll or use websockets.

3. **Feedback text is one-time** — once you return with feedback, the textarea clears. You can't edit the feedback from the modal; you'd need a separate "edit feedback" flow if that's desired.

4. **No file preview** — file submissions show the path but no preview. Would need S3 integration to display PDFs, images, etc.

---

## Next Steps (Optional Polish)

- Add a "Re-turn" button to replace feedback if admin changes their mind
- Show submission timestamps more prominently ("Turned in 2 days late")
- Add a "Message student" feature
- Bulk actions (return all turned-in, etc.)
- File preview for common types
- Email notification to student when feedback is returned

---

## Database Note

The `get_homework_roster` RPC must return fields:
```
summer_student_id, name, status, submitted_at, submission_url, submission_storage_path, feedback, returned_at
```

If the RPC signature is different, update `HomeworkReview.tsx` to destructure the correct fields.
