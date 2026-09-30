# DocuFlow — Working Prototype

A document tracker with multi-level review, for DOST-STII. This is a capstone
prototype, not production software — prioritize working and simple over
scalable or polished. Read `PLAN.md` alongside this file for the actual
day-by-day task list; this file holds the standing rules that apply to every
task.

## Tech stack
- Backend: Laravel (PHP)
- Frontend: React, connected via Inertia.js (NOT a separate API — no Sanctum,
  no CORS, use normal Laravel session auth and Inertia's page props)
- Styling: Tailwind CSS + shadcn/ui components
- Database: MySQL
- Hosting: Railway (auto-deploys from the `prototype` branch on push)

## Scope — ONLY these 2 use cases
1. Submit/Resubmit Document
2. Review Document

## Actors (never call any of these "user" — use these exact names)
- Document Source
- Immediate Supervisor (L1)
- Section Head (L2)
- Division Chief (L3)
(No Super Admin role needed for this prototype.)

## Do NOT build any of these — intentionally cut for time:
- Real AI integration (Ollama). "AI feedback" is MOCKED: a canned string
  pulled from a small fixed list, shown on the document. There is NO
  duplicate-submission check at all in this prototype — not even a fake
  rule-based one — since duplicate detection is specifically an AI feature
  and faking it half-heartedly was decided against.
- Google Workspace webhook / live edit logging. Just store the link/file.
- Email sending. Notifications are in-system only (a notifications table +
  a simple list/bell in the UI).
- Philippine holiday calendar. TAT is counted in plain calendar days.
- Any admin panel, user management UI, AI knowledge approval, or audit trail
  screen. Test accounts are created via a seeder, not a UI.
- Any real dashboard, analytics, search, or filtering. The document list is
  a plain table: reference number, status, submitted date/time, nothing
  else — but it should be visually polished per the design system below,
  not literally bare/unstyled.

If a request seems to need one of the above, stop and ask instead of
building it.

## Key business rules
- Reference number format: `DOCTYPE-YYYY-NNNNN`, generated on first
  submission, kept unchanged through all resubmissions.
- Document types (fixed list for the dropdown): Report, Policy Draft,
  Financial Record, Project Proposal, Memo, Other.
- File upload rules: accept a Google Workspace link (docs.google.com /
  drive.google.com) OR a file upload (.pdf, .docx, .xlsx). Max 10MB per
  file, 100MB total.
- Self-Review Restriction: a submitter can never select themself as
  reviewer; a reviewer can never review a document they submitted.
- L1/L2 reviewer dropdowns (on submit and on Forward) list every seeded
  user with that role — no separate "eligibility" setting in this
  prototype.
- Resubmission: keeps the same reference number, creates a new revision,
  goes back to the same L1 who reviewed it before, and resets to Level 1.
- Review actions by level: L1 = Return or Forward (to a chosen L2).
  L2 = Return or Endorse (to the one seeded L3). L3 = Return or Approve.
- Status values (use these exact strings):
  `pending_l1_review`, `pending_l2_review`, `pending_l3_review`,
  `returned_to_source`, `approved_complete`
- TAT/rating: when a review action completes, calculate calendar days since
  assignment. Rating = 5 if done before day 5, 3 if on day 5, 1 if after.
- Submission date/time must be visible in the document list (Laravel's
  automatic `created_at` timestamp covers this).

## Design system (confirmed via mockups — follow exactly)

**Font:** Google Sans Flex, loaded from Google Fonts as a variable font with
explicit weights only (don't load the full variable range):
```
https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&display=swap
```
One family for everything — body text at 400, labels/headers at 500, strong
emphasis at 700. Fallback stack: `'Google Sans Flex', Roboto, Arial, sans-serif`.

**Icons:** Material Symbols Outlined only. No emoji anywhere in the UI.
```
https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined
```

**Color palette** — light mode only, no dark mode:

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FAF9F6` | Main content background |
| `paper-dim` | `#F1EFE9` | Sidebar background (tonal elevation, not a shadow) |
| `ink` | `#1C1B19` | Primary text |
| `ink-muted` | `#78766E` | Secondary/label text |
| `border` | `#ECE9E1` | Card and table borders |
| `dost-blue` | `#0089B8` | Primary actions, active nav, links |
| `dost-blue-deep` | `#045A73` | Hover/active state of the above |
| `stamp-green` | `#2F6D4F` (text) / `#E1EEE6` (bg) | Status: Approved - Complete |
| `stamp-amber` | `#7A4C0A` (text) / `#F5E7D3` (bg) | Status: any Pending Review |
| `stamp-rust` | `#7A2E22` (text) / `#F3DFDA` (bg) | Status: Returned to Source |

Do not introduce gradients, drop-shadows-on-every-card, or any color outside
this table. Elevation between the sidebar/main-content/card layers comes
from the tonal steps above (`paper-dim` → `paper` → white), not shadows.

**Corner radius (differentiated by element, not one value everywhere):**
- Buttons, inputs, nav items: 8px
- Cards: 12px
- Status badges: full pill (999px)

**Buttons — Material hierarchy, three types only:**
- Filled (solid `dost-blue` background, white text): the one primary action
  on a screen (Submit, Forward, Endorse, Approve).
- Outlined (`dost-blue` or `stamp-rust` border + matching text, transparent
  background): secondary actions (Cancel, Return).
- Text (no border, colored text only): low-emphasis actions (View).

**Status badges:** pill-shaped, using the stamp colors above, label text in
sentence case (e.g. "Pending L2 review", not "PENDING L2 REVIEW").

**Layout — sidebar:**
- Collapsible icon-only rail, ~60px collapsed width, expands to show labels
  when toggled. A chevron toggle button sits at the bottom of the sidebar.
- The collapsed/expanded state must persist across the whole app (store it
  once — e.g. in a shared layout/localStorage — not per-page), so it
  doesn't reset every time someone navigates.
- Nav items differ by role: Document Source sees "My documents" and
  "Submit document"; L1/L2/L3 see "Review queue". All roles see
  "Notifications".

**Layout — document list:**
- A card containing a table: reference number, document type, submitted by,
  submitted date, status (as a stamp badge), and an action button/link.
- No search bar, no filters, no dashboard summary above it.

**Layout — document review screen:**
- Two columns. Left (wider, ~60%): the document preview panel. Right
  (~40%): stacked cards — (1) document details (reference number, type,
  submitted by, date, status badge), (2) AI feedback (mocked, visually
  separated and italicized, clearly labeled as AI-generated and distinct
  from the reviewer's own remarks), (3) the reviewer's assessment/remarks
  textarea, (4) the action buttons for that review level.
- Document details do NOT go in a full-width header — they're a card in
  the right column, beside the preview.
- Document preview: embed a Google Workspace link via its `/preview` URL
  (no API key needed); embed an uploaded PDF natively via `<iframe>`
  (browsers do this with no library). For uploaded .docx/.xlsx, show a file
  card with an "Open" button instead — no inline preview attempt.

## Working style
- Make small changes. After each change, tell me exactly how to test it
  manually before moving to the next thing.
- Don't refactor or "improve" code I didn't ask you to touch.
- Follow the design system above exactly — don't substitute a different
  font, icon set, color, or component pattern even if it seems reasonable.
