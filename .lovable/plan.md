

# EWL Portal — Implementation Plan

## Overview
A full-stack bilingual (Serbian/English) web portal for EastWestLinks, a Serbian labor recruitment company. The portal digitizes the worker placement pipeline: from client order submission through candidate sourcing, documentation, visa processing, and worker arrival in Serbia. It replaces manual processes (phone, email, Excel, local hard drive).

**Three user roles:** Client (external HR managers), Ops (EWL internal staff), Management (analytics + admin).

---

## Phase 1: Foundation & Authentication
Set up the core infrastructure that everything else builds on.

- **Supabase project setup** — Database schema for `users`, `companies` tables with RLS policies
- **Custom color theme** — Navy primary (#1E3A5F), orange accent (#F97316), Inter font, light background (#F8FAFC)
- **Bilingual i18n system** — Language context provider with SR/EN translations, language toggle in nav
- **Auth flows** — Login page (email + password, EWL logo, language toggle), forgot password, accept-invite page for new client users
- **Layout shell** — Fixed 240px left sidebar (desktop), hamburger nav (mobile), role-based menu items
- **Role-based routing** — Redirect users to appropriate dashboard based on role; protect routes per role

---

## Phase 2: Client Dashboard & Order Management
The primary client-facing experience — this is what clients see and interact with daily.

- **Client Dashboard** (`/dashboard`) — Summary cards (active orders, workers in pipeline, pending actions, workers arrived), pending action cards with CTAs, active orders table, recent notifications, "Place New Order" button
- **New Order Form** (`/orders/new`) — 4-step wizard with progress bar: Job Details → Order Specifics → Accommodation & Compensation → Review & Submit. Inline validation, autosave drafts, confirmation screen with reference number
- **My Orders list** (`/orders`) — Filterable table (All/Active/Fulfilled/Cancelled), search by position, sortable columns
- **Order Detail** (`/orders/:id`) — 5 tabs: Overview, Workers Pipeline, Documents, Notifications, Timeline
- **Database:** `orders` table with full schema and RLS (clients see only their company's orders)

---

## Phase 3: Worker Pipeline & Candidate Review
The core operational workflow — tracking workers through 14 pipeline stages.

- **Database:** `workers`, `pipeline_stage_history` tables with RLS
- **Worker pipeline display** — Colored stage badges (gray→blue→teal→amber→purple→green→navy) on order detail pages
- **Candidate Review Page** (`/candidates/:id/review`) — Worker info, CV download, approve/reject buttons, rejection reason modal (required)
- **Realtime subscriptions** — Pipeline stage changes reflect immediately on client dashboard without refresh
- **Stage history audit trail** — Every stage change recorded with actor, timestamp, notes (immutable)

---

## Phase 4: Ops Dashboard & Worker Management
The internal EWL workspace for managing all clients, orders, and workers.

- **Ops Dashboard** (`/ops`) — Stats bar (active clients, open orders, pipeline count, overdue items), attention-required panel (stalled workers, missing docs, pending approvals), all-orders table, activity feed
- **All Clients** (`/ops/clients`) — Client list with status badges, last activity, quick actions
- **Client Detail** (`/ops/clients/:id`) — Company info, portal users, orders table, workers table, documents, activity log
- **All Orders** (`/ops/orders`) — Comprehensive filterable/sortable table across all clients, bulk stage updates
- **Order Detail (Ops)** (`/ops/orders/:id`) — Same 5 tabs as client + Internal Notes tab, Protek Communication Log tab, Contract Generation tab. Enhanced pipeline view with passport numbers, stage selector dropdown, document checklist icons, flags
- **Worker Profile** (`/ops/workers/:id`) — Full personal info, pipeline status with stage selector, special flags (e-Uprava, visa delay, custom), document checklist, internal notes, notification history
- **Database:** `internal_notes`, `protek_communication_log` tables (zero client access)

---

## Phase 5: Document Management & Checklist System
Managing the extensive paperwork for each worker.

- **Database:** `documents` table with visibility control (client_visible / internal_only), versioning
- **Supabase Storage** — `documents` bucket (private, signed URLs with 1-hour expiry), `worker-media` bucket, `templates` bucket. Folder structure: `/{company_id}/{order_id}/{worker_id}/{document_type}/`
- **Document checklist per worker** — 11 document types with status indicators (✅ Uploaded / ❌ Missing / ⏳ Pending signature), upload/download, visibility toggle
- **Client document uploads** — APR extract, sistematizacija, accommodation contract on order detail
- **Document versioning** — Re-uploads increment version, old versions remain accessible

---

## Phase 6: Document Generation & E-Signature
The core ops workflow — auto-generating and signing the 3 mandatory documents.

- **Document Generation page** (`/ops/workers/:id/generate-documents`) — Auto-populates from passport data + order data, manual entry for start date and custom clauses
- **Three document templates:** Invitation Letter (Serbian), Work Contract (Serbian), Job Offer (English)
- **Edge Function: `generate-documents`** — Merges data into PDF templates, returns signed URLs
- **Document preview** — Preview PDFs in modal before sending
- **SignWell integration** — Edge Function `send-to-signature` creates signing request, `signwell-webhook` receives completion events
- **Client signing page** (`/documents/:id/sign`) — Embedded PDF viewer, "Sign Electronically" button, post-signing download
- **Database:** `document_templates` table for template management
- **Supabase Storage:** `templates` bucket for master templates

---

## Phase 7: Email Notifications
Automated bilingual email notifications for all 15 trigger events.

- **Edge Function: `send-notification-email`** — Selects correct template in user's preferred language, sends via Resend API, logs to `notifications` table
- **15 email templates** (each in SR + EN): New order received, order confirmation, sourcing started, CVs ready, candidate approved/rejected, documents ready for signature, documents signed, visa submitted, police interview scheduled (with detailed instructions), visa approved, visa printed, worker arrived, action reminder, welcome email
- **In-app notifications** — Notification panel on dashboard, badge count, realtime updates
- **Database:** `notifications` table with delivery status tracking
- **Edge Function: `stale-worker-check`** — Daily scheduled function to detect workers stuck beyond threshold

---

## Phase 8: Interview Scheduling
Coordinating candidate interviews between clients and workers.

- **Schedule Interview page** (`/ops/interviews/schedule`) — Multi-select candidates, date/time picker, platform selector (Zoom/Teams/Meet), meeting link, notes
- **Calendar invite emails** to client participants
- **Interview details** on worker profile and order detail

---

## Phase 9: Management Dashboard & Analytics
KPI tracking and system administration for EWL leadership.

- **KPI Dashboard** (`/management`) — Charts: workers placed per month (bar), pipeline distribution (donut), average time per stage (horizontal bar), top clients (table), orders by source country (pie), overdue items trend (line). All filterable by date range
- **Reports** (`/management/reports`) — Generate by client/date/order/country/stage, export CSV/PDF, monthly summary report
- **System Settings** (`/management/settings`) — 5 tabs: Pipeline Stages (edit labels + thresholds), Notification Templates (edit SR+EN email templates), Document Templates (upload/replace), User Management (invite/deactivate/reset), Company Settings (EWL branding for generated docs)

---

## Phase 10: Polish & Production Readiness
Final refinements for a production-quality MVP.

- **Mobile optimization** — Client screens fully usable on mobile (approve/reject, sign docs, check status)
- **Empty states** — Friendly copy with illustrations and clear CTAs throughout
- **Loading states** — Skeleton loaders for tables and cards
- **Visa delay transparency** — Client-visible notice when visa delay flag is set, with ops-entered estimate
- **Candidate pool** — Searchable rejected candidates list for ops to pull from for future orders
- **Form polish** — Inline validation, bilingual error messages, autosave on multi-step forms
- **Table enhancements** — Sortable columns, filterable headers, pagination (25 rows default), sticky headers, row hover

