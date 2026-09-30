# DocuFlow Working Prototype — Build Plan

## How to use this file
Work through the tasks below **in order, top to bottom**. After finishing a
task, stop and tell me exactly how to manually test it before starting the
next one. Do not skip ahead, do not combine multiple tasks into one change,
and do not build anything outside this plan's scope — if something seems to
need it, stop and ask instead of building it.

This plan works together with `CLAUDE.md` in the project root, which holds
the standing rules: tech stack, naming, business rules, and the full design
system (colors, font, icons, layout). Read `CLAUDE.md` first — this file is
the task list; `CLAUDE.md` is the reference for exactly how everything
should look and behave.

---

## Database schema

| Table | Key fields |
|---|---|
| `users` | id, name, email, password, role (`document_source`, `l1`, `l2`, `l3`) |
| `documents` | id, reference_number, document_type, google_workspace_link (nullable), file_path (nullable), status, current_review_level, submitted_by (→ users), assigned_reviewer_id (→ users), ai_feedback_text (text, mocked) |
| `document_revisions` | id, document_id, revision_number, change_note, submitted_by, created_at |
| `reviews` | id, document_id, reviewer_id, review_level, assessment, remarks, action (`return`/`forward`/`endorse`/`approve`), created_at |
| `notifications` | id, user_id, document_id, message, is_read |

(No `duplicate_warning` field — duplicate detection was cut entirely, not
just simplified.)

---

## Task list

### Day 1 — Foundation + design system setup
- [ ] **Task 1.1:** Create Laravel migrations and Eloquent models for the 5
  tables above, with correct relationships.
- [ ] **Task 1.2:** Create a database seeder: 1 Document Source, 2 L1
  reviewers, 1 L2, 1 L3, all with password "password".
- [ ] **Task 1.3:** Install and configure shadcn/ui. Set up Tailwind theme
  tokens for the full color palette in `CLAUDE.md` (paper, paper-dim, ink,
  ink-muted, border, dost-blue, dost-blue-deep, the three stamp
  color pairs). Load Google Sans Flex and Material Symbols Outlined from
  Google Fonts as specified in `CLAUDE.md`.
- [ ] **Task 1.4:** Build the shared app layout: the collapsible icon-rail
  sidebar (60px collapsed, expandable, toggle persisted across the app) with
  role-based nav items.
- [ ] **Task 1.5:** Confirm the app deploys successfully to Railway and the
  database connects.

**Verify Day 1:** You can log in locally as each of the 5 seeded accounts,
the sidebar collapses/expands and remembers its state when you navigate, the
fonts and colors match `CLAUDE.md`, and the same build is live on Railway.

### Day 2 — Submit new document
- [ ] **Task 2.1:** Build the submission form: Google Workspace link OR file
  upload, a Document Type dropdown (the fixed list in `CLAUDE.md`), and an
  L1 dropdown (every seeded L1 user).
- [ ] **Task 2.2:** Backend: validate the file/link against the upload
  rules, enforce the Self-Review Restriction, generate the reference
  number, assign to the selected L1, set status to `pending_l1_review`,
  create the first `document_revisions` row, create a notification for
  that L1.

**Verify Day 2:** A Document Source can submit a document, see the correct
reference number and status, and the assigned L1 gets a notification.

### Day 3 — Mocked AI feedback
- [ ] **Task 3.1:** On submission, set `ai_feedback_text` to a random canned
  message from a small fixed list (this simulates the AI Assistant). No
  duplicate check of any kind.
- [ ] **Task 3.2:** Show the AI feedback text on the document detail/review
  view, styled per `CLAUDE.md` (its own card, italicized, clearly labeled,
  visually separate from the reviewer's own remarks).

**Verify Day 3:** Every submission shows a canned AI feedback message in its
own clearly-labeled card.

### Day 4 — Resubmission
- [ ] **Task 4.1:** On a document with status `returned_to_source`, build a
  "Resubmit" action: update the link/file, require a change note.
- [ ] **Task 4.2:** Backend: keep the same reference number, create a new
  `document_revisions` row, return the document to the same L1 as before,
  reset status to `pending_l1_review`, notify that L1.

**Verify Day 4:** Full return → resubmit round-trip works and the reference
number never changes.

### Day 5 — Buffer + document list screens
- [ ] **Task 5.1:** Build "My documents" (Document Source) and "Review
  queue" (L1/L2/L3): a card containing a table — reference number, document
  type, submitted by, submitted date/time, status as a stamp badge, and an
  action link. No search, filter, or dashboard summary.
- [ ] Use this day to fix anything unfinished from Days 1–4.

**Verify Day 5:** Each role can navigate to and open their own relevant
documents, and the list matches the design system (stamp badges, card
styling, correct fonts/colors).

### Day 6 — L1 review actions
- [ ] **Task 6.1:** Build the review screen per `CLAUDE.md`'s two-column
  layout: left = document preview (embedded for Google Docs links and
  PDFs, an "Open" button for docx/xlsx); right = document details card,
  AI feedback card, assessment/remarks textarea, action buttons.
- [ ] **Task 6.2:** L1 sees Return (outlined, `stamp-rust`) or Forward
  (filled, `dost-blue`, with an L2 dropdown, Self-Review Restriction
  applied).
- [ ] **Task 6.3:** Backend: Return → status `returned_to_source`, notify
  Document Source. Forward → assign to chosen L2, status
  `pending_l2_review`, notify that L2. Both: save a `reviews` row,
  calculate TAT/rating.

**Verify Day 6:** Both L1 actions correctly update status, assignment, and
notifications, and the screen matches the design system.

### Day 7 — L2 review actions
- [ ] **Task 7.1:** Same review screen, L2 sees Return or Endorse (endorse
  auto-assigns the one seeded L3 — no dropdown needed).
- [ ] **Task 7.2:** Backend: same pattern as Day 6.

**Verify Day 7:** Both L2 actions correctly update status, assignment, and
notifications.

### Day 8 — L3 review actions
- [ ] **Task 8.1:** Same review screen, L3 sees Return or Approve.
- [ ] **Task 8.2:** Backend: Return → same pattern as before. Approve →
  status `approved_complete`, notify Document Source, save the `reviews`
  row with TAT/rating.

**Verify Day 8:** Full path — submit → L1 forward → L2 endorse → L3 approve
— works end-to-end without errors.

### Day 9 — Notifications + error handling
- [ ] **Task 9.1:** Build the in-system notification list/bell (mark as
  read, show unread count).
- [ ] **Task 9.2:** Add clear error messages for every exception case: self-
  review attempt, invalid file type/size, action not allowed for current
  status/role, resubmitting a document that isn't `returned_to_source`.

**Verify Day 9:** Every actor sees a notification at the right step, and
every blocked action shows a clear message instead of a silent failure.

### Day 10 — Full test pass
- [ ] **Task 10.1:** Manually test every path: return at each level,
  forward, endorse, approve, resubmit, self-review block.
- [ ] **Task 10.2:** Fix any bugs found.
- [ ] **Task 10.3:** Reseed clean demo data (a few documents at different
  stages, so the demo has something to show immediately).
- [ ] **Task 10.4:** Confirm the final build is live and working on Railway.

**Verify Day 10:** You can run your entire planned demo script without
errors, on the live Railway URL, not just locally.

### Day 11 — Buffer + rehearsal
- [ ] No new code unless something breaks. Rehearse the presentation using
  the live Railway app.

---

## Notes for whoever is running this plan
- After each task, report back: what changed, which files, and the exact
  steps to test it manually.
- If a task seems to require something from `CLAUDE.md`'s "Do NOT build"
  list, stop and ask before proceeding.
- If a task seems to require deviating from the design system in
  `CLAUDE.md`, stop and ask before proceeding.
- Keep changes small — one task at a time, not a whole day at once.
