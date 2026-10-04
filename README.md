# DocuFlow

A secure document tracker with multi-level review, built for **DOST-STII**.
Capstone project — APC IT241, Group 6.

**Project files (SharePoint):** https://asiapacificcollege.sharepoint.com/:f:/s/RRunS/IgAOdc2diKNOR7H_olxV98Q0ARQv2Snh5x7NpUzIQaIh2Qs?e=tf7R9O

---

## Project Scope

This working prototype implements exactly two use cases:

1. **Submit / Resubmit Document**: a Document Source submits a Google
   Workspace link or one file, and resubmits it after it is returned.
2. **Review Document**: three levels of reviewers return or move the
   document forward until it is approved.

Not included in the prototype: AI features, email (notifications are
in-app only), Google Workspace edit tracking, holiday calendars, admin or
user-management screens, dashboards, search and filters.

## Actors

| Actor | Can do |
|---|---|
| **Document Source** | Submit a document, resubmit it after it is returned |
| **Immediate Supervisor (L1)** | Return it, or Forward it to a chosen Section Head |
| **Section Head (L2)** | Return it, or Endorse it to the Division Chief |
| **Division Chief (L3)** | Return it, or Approve it |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13 (PHP 8.3) |
| Frontend | React 18, connected to Laravel with Inertia.js (no separate API) |
| Styling | Tailwind CSS 3 + shadcn/ui-style components, Google Sans Flex, Material Symbols |
| Database | MySQL |
| Document preview | Google Workspace `/preview` embeds, native PDF, docx-preview (Word), SheetJS (Excel) |
| Hosting | Railway |

## Project Structure

DocuFlow uses the standard Laravel + Inertia layout: Laravel serves every
page and hands the data to a React page component, so the frontend and
backend live in one project rather than two separate apps.

```
app/
  Http/Controllers/        Backend: request handling
    SubmissionController.php   submit and resubmit (UC-02)
    ReviewController.php       Return / Forward / Endorse / Approve (UC-03)
    DocumentController.php     document lists, document page, file access
    NotificationController.php in-system notifications
  Services/                Backend: business logic
    WorkflowService.php        routing between levels, reference numbers
    TatRatingService.php       turnaround time and the 5/3/1 rating
    NotificationService.php    creating notifications
  Models/                  Backend: User, Document, DocumentRevision, Review, Notification
database/
  migrations/              Backend: database tables
  seeders/                 Backend: test accounts for each role
routes/
  web.php                  Backend: every URL in the app
resources/
  js/                      Frontend (React)
    Pages/                   one component per screen (Documents/, Reviews/, Auth/)
    Components/              shared pieces (table, preview, review panel, status badge)
    Components/ui/           design-system primitives (button, input, card, ...)
    Layouts/                 sidebar layout and login layout
  css/app.css              Frontend: design tokens (colors) and Tailwind
  views/app.blade.php      the single HTML shell the React app mounts into
docs/                      course deliverables (diagrams, meeting minutes, reports)
```
