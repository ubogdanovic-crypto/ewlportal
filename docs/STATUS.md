# EWL Portal v2 — Project Status

**Last updated:** 2026-03-29
**Portal URL:** https://ewlportal.vercel.app
**Supabase project:** zkgufnxjembsvszdaqnx (Frankfurt)
**GitHub:** https://github.com/ubogdanovic-crypto/ewlportal
**Auto-deploy:** Working (push to main = live in ~15s)

---

## Users

| Email | Password | Role |
|-------|----------|------|
| uros.bogdanovic@codeit.rs | EwlAdmin2026! | management |
| marko@eastwestlinks.com | EwlOps2026! | ops |
| kaca@eastwestlinks.com | EwlOps2026! | ops |
| vishal@prosource.in | EwlPartner2026! | partner |

---

## Seeded Data

**Companies (9):** City Express, Clean Trade, LM Dekor Plus, Americar, Avalica, Deki Cevap, Spajder, Makrobiotik, Ribarnica Peda

**Orders (5):** EWL-2026-0001 (City Express, 13 Welders), EWL-2026-0002 (Clean Trade, 10 General Workers), EWL-2026-0003 (LM Dekor, 10 CNC Operators), EWL-2026-0004 (Americar, 2 Auto Mechanics), EWL-2026-0005 (Avalica, 3 Kitchen Helpers)

**CRM Leads (15):** Milsped, MK Group, Nefertiti (KFC/McDonalds), EXPO 2027, Dejan Slepcevic, D-Express, Konkord 200, Milos Ved, All About Delivery, Aleksandra Volf + 5 won leads linked to active clients

**Partner Agency:** ProSource India (Vishal) — assigned to EWL-2026-0001

---

## What Has Been Built

### Infrastructure
- [x] Migrated from Lovable Supabase to own project (zkgufnxjembsvszdaqnx, Frankfurt)
- [x] Deployed to Vercel with auto-deploy from GitHub
- [x] 16 database migrations applied
- [x] 8 edge functions deployed (invite-user, send-notification, send-for-signing, signwell-webhook, generate-document, extract-passport-data, process-automation-rules, send-daily-digest)
- [x] Anthropic API key configured for passport OCR
- [x] Auth redirect URLs configured for Vercel
- [x] 33 tests passing (7 test files)

### Phase 1: Stabilize & Harden
- [x] Error boundaries — global ErrorBoundary wrapping all routes + OfflineBanner for connectivity detection
- [x] Custom hooks layer — useWorkers, useOrders, useCompanies, useLeads, useTasks, useDocuments, useNotifications + centralized queryKeys.ts
- [x] Bulk operations — multi-select workers on OpsWorkers + bulk stage change dialog + bulk document generation per order
- [x] Debounced search — useDebouncedValue hook (300ms) applied to OpsWorkers, OpsOrders, OpsClients
- [x] URL-persisted filters — useUrlFilters hook applied to OpsWorkers, OpsOrders
- [x] Mobile bottom navigation — BottomNav component with role-aware tabs, visible on <768px
- [x] Mobile card views — OpsWorkers, OpsOrders, OpsClients show card layout on mobile instead of tables
- [x] Safe area CSS for iOS — viewport-fit=cover, env(safe-area-inset-bottom)
- [x] AppLayout — sidebar hidden on mobile, bottom nav visible, responsive padding

### Phase 2: CRM Module
- [x] Leads table + kanban board — 6 status columns (cold/warm/hot/negotiating/won/lost), drag-to-navigate, search, table/board toggle
- [x] Lead detail page — full info card, inline status change, next action tracking with overdue detection
- [x] Activity timeline — log call/meeting/email/whatsapp/note with outcome per lead
- [x] Convert Lead to Client — creates company from lead data, links converted_company_id, changes status to won
- [x] Lead funnel chart — Recharts horizontal bar chart on management dashboard with pipeline value
- [x] CRM quick view widget — lead status counts + overdue follow-ups on ops and management dashboards
- [x] Task management page — My Tasks / All Tasks tabs, categorized by overdue/today/this week/later
- [x] Task creation — from tasks page + contextual from lead detail
- [x] My Tasks widget — on all 3 dashboards (client, ops, management) with quick-complete toggle
- [x] 15 CRM leads seeded from board meeting data

### Phase 3: Partner Portal
- [x] Partner role — added to app_role enum, RLS policies, ProtectedRoute, AuthContext, AppSidebar
- [x] Partner agencies table — with partner_agency_id on orders and profiles
- [x] Partner dashboard — stats (active orders, candidates submitted, acceptance rate, pending review)
- [x] Partner order detail — requirements view, submitted candidates list with status
- [x] Candidate submission form — first/last name, nationality, passport, DOB, phone, email, CV upload
- [x] Partner messaging — message thread per order, real-time chat between partner and ops
- [x] Partner navigation — dedicated sidebar + bottom nav items
- [x] Test partner user created — Vishal (ProSource India), assigned to EWL-2026-0001

### Phase 4: Automation & Scale
- [x] Automation rules table — full schema with trigger types (stage_change, document_status, signing_status) and action types (change_stage, send_notification, create_task, send_email)
- [x] Automation rules UI — management settings tab with create/edit/toggle/delete, trigger + action configuration
- [x] process-automation-rules edge function — evaluates active rules on worker/document changes, executes actions
- [x] SLA tracking fields — expected_duration_days + sla_warning_days on pipeline_stage_config
- [x] SLA config UI — editable SLA days + warning days per stage in pipeline settings
- [x] SLA indicator component — warning (amber) + breach (red) states with day count
- [x] SLA indicator on worker profile — shows below pipeline progress bar
- [x] Daily digest edge function — SLA breaches, overdue tasks, pending docs, sends to ops/management
- [x] Bulk document generation — generate invitation letters/contracts/job offers for all approved workers in an order

### Passport OCR
- [x] extract-passport-data edge function — calls Claude Vision API, extracts 9 fields with confidence scores
- [x] Scan-first worker creation — upload passport PDF/image at top of Add Worker dialog, auto-fills form
- [x] Confidence indicators — amber/red warnings on fields with medium/low OCR confidence
- [x] Passport file auto-saved — stored as passport_copy document after worker creation
- [x] Re-scan from WorkerDocuments — re-extract data from uploaded passport, review + apply dialog
- [x] 3 new DB fields — gender, place_of_birth, issuing_country on workers table

### Documentation
- [x] PRD v2 (docs/PRD-v2.md) — 5 phases, user personas, feature requirements, success metrics
- [x] TDD v2 (docs/TDD-v2.md) — database schema, edge functions, frontend architecture, migration plan
- [x] UX/UI v2 (docs/UX-UI-v2.md) — design system, wireframes, component specs, responsive breakpoints

---

## What's Left To Do

### Configuration (no code needed)
- [ ] **Upload document templates** — .docx files for invitation letter, work contract, job offer → Settings > Documents in the portal
- [ ] **Custom domain** — point portal.eastwestlinks.com (or similar) to Vercel
- [ ] **Resend API key** — set via `supabase secrets set RESEND_API_KEY=...` for email notifications
- [ ] **Resend from address** — set via `supabase secrets set RESEND_FROM_EMAIL=portal@eastwestlinks.com`
- [ ] **SignWell API key** — set via `supabase secrets set SIGNWELL_API_KEY=...` for e-signing
- [ ] **Database webhook** — configure in Supabase dashboard (Database > Webhooks) to trigger process-automation-rules on workers UPDATE and worker_documents UPDATE
- [ ] **Daily digest cron** — set up pg_cron in Supabase dashboard to call send-daily-digest edge function weekdays at 08:00 CET
- [ ] **Rotate Anthropic API key** — the current key was exposed in conversation, generate new one at console.anthropic.com and update via `supabase secrets set ANTHROPIC_API_KEY=...`
- [ ] **Update user emails** — Marko and Kaca emails are placeholders (marko@eastwestlinks.com, kaca@eastwestlinks.com), update to their real emails

### Code (can be done in future sessions)
- [ ] **Bulk document upload** with filename matching (lastname_doctype.pdf pattern) — medium effort
- [ ] **Refactor existing pages to use custom hooks** — hooks exist but 10+ pages still have inline queries. Low urgency, works fine as-is
- [ ] **More test coverage** — auth flow, order creation wizard, RLS policy verification. Currently 33 tests, target 60%+ critical paths
- [ ] **SLA indicators on OpsWorkers list** — component exists, needs to be added to the worker table/cards
- [ ] **Email automation on stage transitions** — auto-send templated emails when worker moves stages (templates exist in email_templates table)
- [ ] **Task creation from order detail and worker profile** — contextual "+ Task" button (done for lead detail, needs to be added to other entity pages)
- [ ] **Notification bell count** — includes task overdue count alongside notification count

### Phase 5: Strategic (Month 3+)
- [ ] Multi-entity support (Serbia + Bulgaria legal entities)
- [ ] Financial tracking (revenue per worker, per order, per client, margins)
- [ ] Compliance module (visa expiry alerts, work permit renewals, document retention policies)
- [ ] Client self-service (upload company docs, sign framework agreement, view arrival timeline)
- [ ] Analytics & reporting (corridor analysis, seasonal patterns, client lifetime value, CSV/PDF export)
- [ ] Hindi language support for partner portal

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui (Radix UI) + Tailwind CSS |
| State | TanStack React Query |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password, JWT) |
| Storage | Supabase Storage (2 buckets) |
| Edge Functions | Supabase Edge Functions (Deno) |
| OCR | Anthropic Claude Vision API |
| Email | Resend (not yet configured) |
| E-signing | SignWell (not yet configured) |
| Hosting | Vercel (auto-deploy from GitHub) |
| i18n | i18next (Serbian + English) |
| Tests | Vitest + Testing Library |

## Database Tables (20)

**v1 (12):** companies, profiles, user_roles, orders, workers, pipeline_stage_history, worker_documents, internal_notes, protek_communication_log, notifications, email_templates, pipeline_stage_config

**v2 (8):** leads, lead_activities, tasks, partner_agencies, partner_messages, automation_rules + modified: orders (partner_agency_id), profiles (partner_agency_id, preferences), workers (gender, place_of_birth, issuing_country), pipeline_stage_config (expected_duration_days, sla_warning_days)

## Edge Functions (8)

| Function | Purpose |
|----------|---------|
| invite-user | Management user invitation with role assignment |
| send-notification | Email via Resend API with notification logging |
| send-for-signing | SignWell e-signature integration |
| signwell-webhook | Webhook receiver for signing status updates |
| generate-document | Docxtemplater-based Word document generation |
| extract-passport-data | Claude Vision API passport OCR (9 fields + confidence) |
| process-automation-rules | Evaluate and execute automation rules on triggers |
| send-daily-digest | Daily ops summary (SLA breaches, overdue tasks, pending docs) |
