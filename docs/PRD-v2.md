# EWL Portal v2 -- Product Requirements Document

**Version:** 2.0
**Date:** 2026-03-29
**Author:** EWL Product Team
**Status:** Draft

---

## 1. Executive Summary

EWL Portal v1 is a recruitment management platform built for EastWestLinks to manage the end-to-end process of bringing foreign workers (primarily from India) to Serbian employers. It serves three user roles: Client (Serbian employers), Ops (EWL operations team), and Management.

V1 was built on Lovable (AI-generated React + Supabase) and covers: order placement, 14-stage worker pipeline, document management with e-signing, email notifications, and bilingual UI (SR/EN).

**V2 goal:** Transform the portal from a worker-tracking tool into a complete recruitment operations platform -- adding CRM for lead management, partner portal for Indian recruitment agencies, automation for pipeline bottlenecks, and mobile-first experience for field ops.

---

## 2. Business Context

### 2.1 Current State (March 2026)
- **Active clients:** City Express (13 workers), LM Dekor Plus (10), Clean Trade (10), Avalica (3), Americar (2), Deki Cevap (pending), plus 8+ leads in pipeline
- **Team:** Marko (sales/ops), Kaca (ops coordinator -- starting portal use), Jeka (support), Djole (partnerships), Kole (advisory)
- **Partner:** Vishal/Prasad (Indian recruitment partner, no portal access)
- **Pain points:** Lead tracking is manual (board meetings + Google Docs), Indian partner coordination is WhatsApp/calls only, document/visa process is the primary bottleneck, no SLA tracking

### 2.2 Strategic Direction
- Scale to 100+ workers per quarter
- EU expansion via Bulgaria entity (India-EU FTA opportunity)
- Partner portal to reduce coordination overhead with Indian agencies
- Automation to handle volume without proportional headcount increase

### 2.3 Success Metrics

| Metric | Current (v1) | Target (v2) | How Measured |
|--------|-------------|-------------|--------------|
| Lead-to-client conversion | Unknown (manual) | Track + 20% improvement | CRM pipeline analytics |
| Order-to-arrival time | Unknown | <90 days avg | Pipeline stage timestamps |
| Document processing time | Manual tracking | <5 days avg per worker | Document status timestamps |
| Client self-service rate | ~30% | >70% | Client portal actions vs ops actions |
| Partner response time | WhatsApp (days) | <24h via portal | Partner portal activity log |
| Kaca daily time in portal | Starting week of 2026-03-31 | Primary work tool | Usage analytics |

---

## 3. User Personas

### 3.1 Client (Serbian Employer)
**Current:** HR manager or company owner who places worker orders and reviews candidates.
**V2 additions:** Self-service document uploads, company doc management, real-time worker arrival tracking, multi-order dashboard.

**Key needs:**
- Know exactly where each worker is in the pipeline
- Review candidates quickly with all info in one place
- Get notified immediately on status changes
- Upload company-side documents (contracts, accommodation proofs) without calling EWL

### 3.2 Ops (EWL Operations -- Marko, Kaca)
**Current:** Manages full pipeline -- workers, documents, interviews, client communication.
**V2 additions:** CRM for lead tracking, task management, bulk operations, SLA alerts, mobile-optimized workflow.

**Key needs:**
- Track all leads and follow-up tasks in one place (replace board meeting task lists)
- Batch-process workers (move stages, upload docs, generate contracts)
- Get alerted when workers are stalled or deadlines approaching
- Work from phone during client visits and field work

### 3.3 Management (Uros, Marko)
**Current:** KPI dashboards, user management, system configuration.
**V2 additions:** CRM analytics, conversion funnels, revenue forecasting, partner performance metrics.

**Key needs:**
- See pipeline health at a glance (leads -> clients -> orders -> workers -> arrived)
- Track revenue per client, per partner, per corridor
- Configure automation rules without developer involvement
- Monitor team workload and task completion

### 3.4 Partner (NEW -- Indian Recruitment Agency)
**New role in v2.** Vishal/Prasad and their team.
**Portal access:** Limited view of orders assigned to them, CV submission, candidate status updates.

**Key needs:**
- See exactly what each client requires (job specs, count, timeline)
- Upload CVs and candidate profiles directly (not via WhatsApp)
- Track which candidates were accepted/rejected and why
- Communicate with EWL ops within the portal

---

## 4. Feature Requirements

### 4.1 Phase 1: Stabilize & Harden (Priority: Critical)

#### F1.1 Mobile-Responsive Overhaul
**Problem:** User manual says "use desktop for best experience." Marko and Kaca work from phones during client visits.
**Requirement:** All ops pages must be fully functional on mobile (375px+). Tables convert to card views. Touch-friendly action buttons (min 44px tap targets). Sidebar becomes bottom nav on mobile.
**Acceptance criteria:**
- All 28 pages pass Lighthouse mobile audit >90
- Pipeline stage change works on mobile without horizontal scroll
- Document upload works from phone camera

#### F1.2 Error Boundaries & Recovery
**Problem:** No error boundaries -- any unhandled error crashes the entire app.
**Requirement:** Global error boundary with "Something went wrong" UI + retry button. Per-route error boundaries that isolate failures. Offline detection with reconnection banner.
**Acceptance criteria:**
- Failed API call shows error toast, does not crash page
- Network loss shows banner, auto-recovers on reconnect
- Supabase session expiry redirects to login with "session expired" message

#### F1.3 Bulk Operations
**Problem:** Ops must process workers one by one. With 30+ workers across orders, this is unsustainable.
**Requirement:**
- Bulk stage change: select multiple workers, move to next stage with shared note
- Bulk document upload: drag-and-drop multiple files, auto-match to workers by filename pattern
- Bulk document generation: generate contracts for all approved workers in one order
**Acceptance criteria:**
- Select 10 workers, change stage in one action (<3 seconds)
- Upload 10 documents, matched to workers by `lastname_doctype.pdf` pattern
- Generate all contracts for an order with one click

#### F1.4 Search & Filter Improvements
**Problem:** No debounced search, no URL-persisted filters, no saved filter presets.
**Requirement:**
- Debounced search (300ms) on all list pages
- Filters persisted in URL query params (shareable, back-button safe)
- Filter by: stage, status, company, date range, flags (visa delay, e-Uprava)
- Saved filter presets per user (stored in profiles.preferences)
**Acceptance criteria:**
- Copy URL with filters, paste in new tab -- same results
- Search input does not trigger API on every keystroke

#### F1.5 Custom Hooks Extraction
**Problem:** Pages are 300-400 lines with inline Supabase queries. Hard to maintain, test, and reuse.
**Requirement:** Extract data fetching into custom hooks:
- `useWorkers(filters)`, `useWorker(id)`
- `useOrders(filters)`, `useOrder(id)`
- `useCompanies()`, `useCompany(id)`
- `useDocuments(workerId)`, `useNotifications()`
- Centralized query keys in `src/lib/queryKeys.ts`
**Acceptance criteria:**
- No direct `supabase.from()` calls in page components
- All queries use centralized query keys
- Pages under 150 lines each

#### F1.6 Test Coverage
**Problem:** Zero test coverage despite vitest setup.
**Requirement:** Critical path tests:
- Auth flow (login, logout, session refresh, password reset)
- Order creation (all 4 wizard steps, draft save, submit)
- Pipeline stage change (with history recording)
- Document upload, verify, reject
- RLS policy verification (client cannot see other company data)
**Acceptance criteria:**
- >60% coverage on critical paths
- Tests run in CI before deploy
- All RLS policies have dedicated tests

---

### 4.2 Phase 2: CRM Module (Priority: High)

#### F2.1 Leads Table
**Problem:** Marko tracks 15+ leads manually via board meetings and phone calls. No history, no accountability, no metrics.
**Requirement:** New `leads` table and UI:

**Data model:**
```
leads:
  id, company_name, contact_person, contact_email, contact_phone,
  source (referral/cold/event/website/partner),
  status (cold/warm/hot/negotiating/won/lost),
  owner_id (references profiles),
  estimated_workers, estimated_revenue_eur,
  next_action, next_action_date,
  notes, lost_reason,
  converted_company_id (references companies -- when won),
  created_at, updated_at
```

**UI:** Kanban board view (columns = status) + table view toggle. Drag-and-drop between status columns. Click to expand lead detail panel.

**Acceptance criteria:**
- All 15+ current leads from board meeting migrated into system
- Marko can update lead status from phone in <10 seconds
- Filter by owner, status, next_action_date
- "Overdue follow-ups" alert on dashboard

#### F2.2 Activity Log
**Problem:** No record of calls, meetings, or follow-ups with prospects.
**Requirement:** New `lead_activities` table:

**Data model:**
```
lead_activities:
  id, lead_id (references leads),
  activity_type (call/meeting/email/whatsapp/note),
  content, outcome,
  created_by, created_at
```

**UI:** Timeline view on lead detail. Quick-add activity from lead card. Log call/meeting from mobile.

**Acceptance criteria:**
- Each board meeting action item can be logged as an activity
- Activity timeline shows complete history per lead
- Filter activities by type, date range

#### F2.3 Task System
**Problem:** Board meeting generates 20+ tasks tracked in Google Docs. No reminders, no tracking, no accountability.
**Requirement:** New `tasks` table:

**Data model:**
```
tasks:
  id, title, description,
  entity_type (lead/order/worker/general),
  entity_id,
  assigned_to (references profiles),
  status (todo/in_progress/done/cancelled),
  priority (low/normal/high/urgent),
  due_date,
  completed_at, completed_by,
  created_by, created_at
```

**UI:**
- "My Tasks" widget on every dashboard (client, ops, management)
- Task creation from any entity (lead, order, worker)
- Quick task from mobile (title + due date + assignee)
- Overdue tasks highlighted in red

**Acceptance criteria:**
- Board meeting task list (21 items from 27.03.2026) could be entered in <5 min
- Each team member sees their tasks on dashboard login
- Overdue tasks trigger notification

#### F2.4 CRM Dashboard Widgets
**Problem:** No visibility into sales pipeline health.
**Requirement:** Add to management dashboard:
- Lead funnel chart (cold -> warm -> hot -> won)
- Conversion rate by source
- Revenue forecast (estimated_workers * avg revenue per worker)
- Follow-up compliance (% of leads with overdue next_action)
- Top performers (leads won by owner)

---

### 4.3 Phase 3: Partner Portal (Priority: High)

#### F3.1 Partner Role
**Problem:** Indian partner (Vishal/Prasad) has zero portal access. All coordination via WhatsApp/calls.
**Requirement:** New `partner` role with:
- Login access to dedicated partner section
- See orders assigned to their agency
- Cannot see client company details, pricing, or internal notes
- Partner linked to `partner_agencies` table, not `companies`

**Data model:**
```
partner_agencies:
  id, name, country, contact_person, contact_email, contact_phone,
  is_active, created_at, updated_at

-- Add to orders:
  partner_agency_id (references partner_agencies, nullable)
```

**RLS:** Partner sees only orders where partner_agency_id matches their agency.

#### F3.2 CV Submission Workflow
**Problem:** CVs come via WhatsApp/email, manually uploaded by ops.
**Requirement:**
- Partner can upload CVs directly per order
- Partner creates candidate profile: name, nationality, DOB, passport, phone, email, CV file, photo
- Candidate enters pipeline at `sourcing` stage
- Ops reviews and moves to `cv_screening` or rejects
- Partner sees acceptance/rejection status with reason

**UI:** Order detail for partner shows: requirements + "Submit Candidate" form + submitted candidates list with status.

#### F3.3 Partner Communication
**Problem:** No structured communication channel with partner.
**Requirement:**
- Message thread per order (partner <-> ops)
- Notification on new message (in-app + email)
- File attachment support in messages
- Read receipts

#### F3.4 Partner Dashboard
**Requirement:**
- Active orders assigned to partner
- Candidates submitted (by status: pending/accepted/rejected)
- Response time metrics (avg time from order assignment to first CV submission)
- Required documents checklist per order

---

### 4.4 Phase 4: Automation & Scale (Priority: Medium)

#### F4.1 Pipeline Automation Rules
**Problem:** Manual stage transitions for repetitive workflows.
**Requirement:** Configurable rules engine:
- "When all required documents have status=verified -> auto-move to document_generation"
- "When signing_status=signed for all documents -> auto-move to documents_signed"
- "When visa_approved -> send arrival notification to client"
- Rules configured via management settings UI
- Audit trail: "Auto-moved by rule: [rule name]" in pipeline history

**Data model:**
```
automation_rules:
  id, name, description,
  trigger_type (stage_change/document_status/signing_status),
  trigger_condition (JSONB),
  action_type (change_stage/send_notification/create_task),
  action_config (JSONB),
  is_active, created_by, created_at
```

#### F4.2 SLA & Deadline Tracking
**Problem:** No visibility into which workers are stuck or falling behind.
**Requirement:**
- Expected duration per pipeline stage (configurable in pipeline_stage_config)
- SLA breach alert when worker exceeds expected duration
- Calendar view: expected arrival dates, visa interview dates, document deadlines
- Daily digest email to ops: overdue items summary

**Data additions to pipeline_stage_config:**
```
  expected_duration_days: integer (nullable)
  sla_warning_days: integer (nullable, alerts X days before breach)
```

#### F4.3 Email Automation Enhancement
**Problem:** Email templates exist but require manual trigger.
**Requirement:**
- Auto-send on stage transition (configurable per stage)
- Auto-send on document status change
- Auto-send weekly digest to clients (order status summary)
- Template variables expansion: add `{{days_in_stage}}`, `{{expected_arrival}}`, `{{documents_pending}}`

#### F4.4 Bulk Document Generation
**Problem:** Documents generated one by one per worker.
**Requirement:**
- "Generate All" button on order detail: generates invitation letters, contracts, job offers for all approved workers
- Batch signing: send all generated documents for signing in one action
- Progress indicator for batch operations
- Error handling: show which workers failed and why

---

### 4.5 Phase 5: Strategic (Priority: Low -- Month 3+)

#### F5.1 Multi-Entity Support
**Requirement:** Support for multiple EWL legal entities (Serbia + Bulgaria).
- Entity selector in management
- Orders tagged to entity
- Entity-specific document templates, email templates, pipeline configuration
- Separate reporting per entity

#### F5.2 Financial Tracking
**Requirement:**
- Revenue per worker, per order, per client
- Cost tracking: partner fees, visa costs, document costs
- Margin calculation and reporting
- Invoice generation (basic)

#### F5.3 Compliance Module
**Requirement:**
- Visa expiry tracking with renewal alerts (60/30/14 day warnings)
- Work permit renewal tracking
- Document retention policies (auto-archive after X months)
- GDPR compliance dashboard (existing deletion + audit trail)
- Data export for regulatory reporting

#### F5.4 Client Self-Service Enhancement
**Requirement:**
- Client uploads company documents (business registration, accommodation proof)
- Client signs framework agreement digitally
- Client views worker arrival timeline with milestones
- Client rates worker performance (post-arrival feedback)

#### F5.5 Analytics & Reporting
**Requirement:**
- Corridor analysis: avg time, cost, success rate by source country
- Seasonal patterns: order volume by month
- Client lifetime value
- Partner performance comparison
- Export to CSV/PDF

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Page load: <2s on 3G mobile connection
- API response: <500ms for list queries, <200ms for single record
- Real-time updates: <1s latency for pipeline changes
- Support 50 concurrent users without degradation

### 5.2 Security
- RLS on all new tables (leads, tasks, activities, partner data)
- Partner role cannot access: internal notes, communication logs, financial data, client pricing
- Session timeout: 30 min inactivity (existing)
- Rate limiting on edge functions
- Input sanitization on all user inputs

### 5.3 Accessibility
- WCAG 2.1 AA compliance (Radix UI provides foundation)
- Keyboard navigation for all actions
- Screen reader support for pipeline visualization
- Color contrast ratios >4.5:1

### 5.4 Internationalization
- All new features in both SR and EN
- Partner portal: add Hindi (optional, Phase 5)
- Date formats: localized (DD.MM.YYYY for SR, MM/DD/YYYY for EN)
- Currency: EUR primary, display with proper formatting

### 5.5 Data Migration
- Migrate existing board meeting leads into CRM module
- No breaking changes to existing tables (additive only)
- Backward-compatible API changes
- Zero downtime deployment

---

## 6. Out of Scope for V2

- Native mobile app (responsive web is sufficient)
- Integration with Serbian government systems (e-Uprava API not available)
- AI-powered candidate matching
- Multi-language CV parsing
- Video interview platform (use external: Google Meet/Zoom)
- Payroll/accounting integration
- WhatsApp Business API integration (Phase 3 messaging replaces need)

---

## 7. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Kaca adoption resistance | High -- if ops doesn't use portal, data is incomplete | Gradual onboarding, start with new workers only, parallel operation |
| Indian partner tech literacy | Medium -- partner may struggle with portal | Simple UI, training video, fallback to email notification |
| Supabase limits at scale | Medium -- RLS performance with complex policies | Monitor query performance, optimize policies, consider connection pooling |
| SignWell reliability | Low -- e-signing is external dependency | Fallback to manual upload of signed documents |
| EU expansion scope creep | High -- Bulgaria entity could derail v2 timeline | Phase 5 only, keep as additive module |

---

## 8. Release Plan

| Phase | Duration | Key Deliverable | Go/No-Go Criteria |
|-------|----------|----------------|-------------------|
| Phase 1 | 2 weeks | Stable, mobile-ready portal | Kaca can complete full workflow on phone |
| Phase 2 | 2 weeks | CRM module live | Marko tracks all leads in portal, not Google Docs |
| Phase 3 | 2 weeks | Partner portal live | Vishal submits first CV via portal |
| Phase 4 | 2 weeks | Automation rules active | At least 3 auto-transitions configured and working |
| Phase 5 | Ongoing | Strategic features | Per-feature release |

---

## Appendix A: Current Database Schema

### Enums
- `app_role`: client | ops | management
- `order_status`: draft | submitted | confirmed | sourcing | in_progress | fulfilled | cancelled
- `pipeline_stage`: sourcing | cv_screening | cv_sent_to_client | client_review | interview_scheduled | interview_completed | approved_by_client | documents_collection | document_generation | documents_signed | visa_application | police_interview | visa_approved | arrived
- `worker_status`: active | rejected | withdrawn | completed

### Tables (v1)
1. `companies` -- Client companies (name, address, PIB, maticni_broj, contact info)
2. `profiles` -- User profiles linked to auth.users (name, email, phone, company_id, language, notification_preferences)
3. `user_roles` -- Role assignments (user_id, role)
4. `orders` -- Job orders (company_id, position, workers count, salary, accommodation, status)
5. `workers` -- Worker candidates (personal info, passport, pipeline stage, status, flags, CV/photo URLs)
6. `pipeline_stage_history` -- Immutable audit trail (worker_id, from/to stage, changed_by, notes)
7. `worker_documents` -- Document checklist (type, status, file, signing status via SignWell)
8. `internal_notes` -- Ops/management notes on entities (worker/order/company)
9. `protek_communication_log` -- Communication history per order (direction, channel, content)
10. `notifications` -- Notification log (recipient, type, subject, body, status, is_read)
11. `email_templates` -- Email templates by trigger event and language
12. `pipeline_stage_config` -- Pipeline stage labels, colors, visibility, sort order

### New Tables (v2)
13. `leads` -- CRM lead tracking
14. `lead_activities` -- Activity log per lead
15. `tasks` -- Task management
16. `partner_agencies` -- Recruitment partner agencies
17. `automation_rules` -- Pipeline automation configuration

### Modified Tables (v2)
- `orders` -- add `partner_agency_id`
- `user_roles` -- add `partner` to app_role enum
- `pipeline_stage_config` -- add `expected_duration_days`, `sla_warning_days`
- `profiles` -- add `preferences` JSONB (saved filters, UI settings)

---

## Appendix B: Edge Functions (v1)

1. `generate-document` -- Docxtemplater-based Word document generation from templates
2. `send-notification` -- Email via Resend API with notification logging
3. `send-for-signing` -- SignWell e-signature integration
4. `invite-user` -- Management user invitation with role assignment
5. `signwell-webhook` -- Webhook receiver for signing status updates

### New Edge Functions (v2)
6. `process-automation-rules` -- Evaluate and execute automation rules on trigger events
7. `send-daily-digest` -- Scheduled daily summary email to ops
8. `send-weekly-client-digest` -- Weekly order status email to clients
9. `bulk-generate-documents` -- Batch document generation for an order
