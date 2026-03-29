# EWL Portal v2 -- UX/UI Design Document

**Version:** 2.0
**Date:** 2026-03-29
**Author:** EWL Product Team
**Status:** Draft

---

## 1. Design System Foundation

### 1.1 Current Design System (v1)

**Framework:** shadcn/ui (Radix UI primitives + Tailwind CSS)
**Font:** Inter (Google Fonts), weights 300-700
**Border Radius:** 0.5rem (8px) default

**Color Palette (HSL):**

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary | 213 52% 24.5% (Navy) | 25 95% 53% (Orange) | Sidebar, buttons, links |
| Accent | 25 95% 53% (Orange) | 25 95% 53% | CTAs, highlights, active states |
| Success | 142 71% 45% (Green) | same | Positive status, confirmations |
| Warning | 38 92% 50% (Amber) | same | Alerts, overdue items |
| Info | 199 89% 48% (Cyan) | same | Informational badges |
| Destructive | 0 84% 60% (Red) | 0 62% 30% | Errors, rejections, delete actions |

**Sidebar:** Navy dark (#1e2d44) with orange accent for active items.

### 1.2 V2 Design System Additions

**New semantic colors (add to CSS variables):**

| Token | Value | Usage |
|-------|-------|-------|
| --crm-cold | 210 15% 60% | Cold leads |
| --crm-warm | 25 80% 55% | Warm leads |
| --crm-hot | 0 75% 55% | Hot leads |
| --crm-won | 142 71% 45% | Won leads (= success) |
| --crm-lost | 0 0% 50% | Lost leads |
| --partner | 270 60% 55% | Partner role color |
| --sla-breach | 0 90% 50% | SLA breach indicators |
| --sla-warning | 38 92% 50% | SLA warning (= warning) |

**Typography scale (unchanged, works well):**
- Page titles: text-2xl font-bold (24px)
- Card titles: text-lg font-semibold (18px)
- Body: text-sm (14px)
- Meta/labels: text-xs text-muted-foreground (12px)

**Spacing system (Tailwind defaults):**
- Page padding: p-4 sm:p-6
- Card gaps: space-y-6
- Section gaps: space-y-4
- Inline gaps: gap-2 or gap-4

---

## 2. Navigation Architecture

### 2.1 Current Navigation (v1)

**Desktop:** Left sidebar (collapsible), 240px width.
**Mobile:** Hamburger menu triggering sidebar overlay.

**Problem:** Mobile sidebar is clunky. Requires two taps to navigate. No bottom navigation.

### 2.2 V2 Navigation

#### Desktop (>768px)
Keep the left sidebar. Add CRM and Tasks sections:

```
CLIENT SIDEBAR               OPS SIDEBAR                    PARTNER SIDEBAR
---                          ---                            ---
Dashboard                    Dashboard                      Dashboard
Orders                       CRM ▾                          Orders
Documents                      Leads                        Candidates
Notifications [3]              Pipeline Board                Messages
Tasks                        Clients                        Profile
Profile                      Orders
                             Workers
                             Interviews
                             Documents
                             Tasks
                             Notifications [3]

MANAGEMENT SIDEBAR (extends OPS)
---
+ Management ▾
    Dashboard
    Users
    Reports
    Settings
    Automation Rules
```

#### Mobile (<768px)
Replace sidebar with **bottom tab bar** (5 items max):

```
CLIENT MOBILE TABS
[Dashboard] [Orders] [Tasks] [Notifications] [More...]
                                              └─ Documents, Profile

OPS MOBILE TABS
[Dashboard] [CRM] [Workers] [Tasks] [More...]
                                     └─ Clients, Orders, Interviews, Documents, Notifications, Profile

PARTNER MOBILE TABS
[Dashboard] [Orders] [Messages] [Profile]
```

**Implementation:**
```tsx
// src/components/BottomNav.tsx
// Fixed bottom bar, h-16, bg-background, border-t
// 5 icon+label items, active state = accent color
// "More" opens a sheet with remaining items
```

---

## 3. Page-by-Page UX Design

### 3.1 Client Dashboard (v2 changes)

**Current:** 4 stat cards + recent orders list.
**V2 additions:**

```
┌─────────────────────────────────────────────────┐
│ [Welcome, {name}]                [New Order ▶]  │
├────────┬────────┬────────┬──────────────────────┤
│ Active │Workers │Pending │ Workers              │
│ Orders │in Pipe │Actions │ Arrived              │
│   3    │  26    │   5    │   2                  │
├────────┴────────┴────────┴──────────────────────┤
│                                                  │
│ ┌─ My Tasks (3 overdue) ───────────────────┐    │
│ │ ☐ Review candidates for Order EWL-2026-  │    │
│ │   0004 — due: Mar 28 ⚠ OVERDUE           │    │
│ │ ☐ Upload accommodation proof — due: Apr 2│    │
│ │ ☐ Confirm worker arrival dates — Apr 5   │    │
│ │                         [View all tasks →]│    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ┌─ Worker Arrival Timeline ────────────────┐    │
│ │ ●──●──●──○──○──○   Apr 15: 3 workers     │    │
│ │ City Express order  expected arrival      │    │
│ │                                           │    │
│ │ ●──●──○──○──○──○   May 1: 2 workers      │    │
│ │ LM Dekor order      visa stage           │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ┌─ Recent Orders ──────────────────────────┐    │
│ │ EWL-2026-0004 | Welder | 13 workers | ● │    │
│ │ EWL-2026-0003 | CNC Op | 10 workers | ● │    │
│ │                         [View all →]      │    │
│ └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**New widgets:**
- **My Tasks** -- shows tasks assigned to this client user, overdue highlighted
- **Worker Arrival Timeline** -- visual timeline showing expected arrivals per order

---

### 3.2 Ops Dashboard (v2 changes)

**Current:** 4 stat cards + bar chart + attention required.
**V2 additions:**

```
┌─────────────────────────────────────────────────┐
│ Operations Dashboard                             │
├────────┬────────┬────────┬──────────────────────┤
│Clients │ Open   │Workers │ SLA                  │
│  8     │Orders  │in Pipe │ Breaches             │
│        │  5     │  36    │   4 ⚠                │
├────────┴────────┴────────┴──────────────────────┤
│                                                  │
│ ┌─ My Tasks Today (5) ────────────────────┐     │
│ │ ● Call Kristijan — MK Group     [Done]  │     │
│ │ ● Follow up Snezana — Milsped   [Done]  │     │
│ │ ○ Send CVs to City Express      [→]     │     │
│ │ ○ Check Clean Trade docs        [→]     │     │
│ │ ⚠ Call Igor — OVERDUE 3 days    [→]     │     │
│ │                      [View all tasks →]  │     │
│ └─────────────────────────────────────────┘     │
│                                                  │
│ ┌─ CRM Quick View ───────┬─ Pipeline Chart ──┐  │
│ │ Cold: 4  Warm: 3       │ [████████░░░░░░] │  │
│ │ Hot: 2   Negotiating: 1│ Sourcing: 12     │  │
│ │ Follow-ups overdue: 2 ⚠│ Review: 8        │  │
│ │      [Open CRM →]      │ Documents: 10    │  │
│ │                         │ Visa: 4          │  │
│ │                         │ Arrived: 2       │  │
│ └─────────────────────────┴──────────────────┘  │
│                                                  │
│ ┌─ Attention Required ────────────────────┐     │
│ │ ⚠ Rajan Patel — visa_application 12d    │     │
│ │ ⚠ Amit Singh — documents_collection 9d  │     │
│ │ ⚠ Clean Trade docs — 3 pending verify   │     │
│ └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**New widgets:**
- **SLA Breaches** stat card -- count of workers exceeding expected stage duration
- **My Tasks Today** -- tasks due today or overdue, quick-complete button
- **CRM Quick View** -- lead status counts with overdue follow-up alert

---

### 3.3 CRM: Lead Kanban Board (NEW)

Primary view for lead management. Replaces Google Docs + board meeting tracking.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Lead Pipeline            [+ New Lead]  [Table View] [Kanban View●] │
├──────────┬──────────┬──────────┬────────────┬───────┬──────────────┤
│  Cold(4) │ Warm(3)  │  Hot(2)  │Negotiat(1) │Won(3) │  Lost(1)     │
├──────────┼──────────┼──────────┼────────────┼───────┼──────────────┤
│┌────────┐│┌────────┐│┌────────┐│┌──────────┐│       │              │
││Milsped ││ │D-Expr. ││ │EXPO   │││MK Group  ││       │              │
││Snezana ││ │via Djole││ │Nesa G. │││Kristijan ││       │              │
││Est: 20w││ │Est: 15w││ │Est: 50w│││Est: 30w  ││       │              │
││Next:Mon││ │Next:Mon││ │Next:Tue│││Next: Fri ││       │              │
││⚠overdue││ │        ││ │        │││          ││       │              │
│└────────┘│└────────┘│└────────┘│└──────────┘│       │              │
│┌────────┐│┌────────┐│┌────────┐│            │       │              │
││Konkord ││ │Deki    ││ │Nefert. ││            │       │              │
││Boris Z.││ │Ćevap   ││ │Igor   ││            │       │              │
│└────────┘│└────────┘│└────────┘│            │       │              │
│┌────────┐│┌────────┐│          │            │       │              │
││Milos V.││ │Slepcev.││          │            │       │              │
│└────────┘│└────────┘│          │            │       │              │
│┌────────┐│          │          │            │       │              │
││Marina  ││          │          │            │       │              │
││AADeliv. ││          │          │            │       │              │
│└────────┘│          │          │            │       │              │
└──────────┴──────────┴──────────┴────────────┴───────┴──────────────┘
```

**Lead Card Design:**
```
┌─────────────────────┐
│ Company Name    [●]  │  ← status dot color
│ Contact Person       │
│ Est: 20 workers      │
│ Source: referral      │
│ Next: Mon Mar 31  ⚠  │  ← ⚠ if overdue
│ Owner: Marko         │
└─────────────────────┘
```

**Interactions:**
- **Drag-and-drop** between columns to change status
- **Click** to open lead detail panel (slide-in from right)
- **Quick actions** on hover: Log call, Log meeting, Create task
- **Mobile:** Cards stack vertically, swipe between columns

**Lead Detail Panel (Sheet):**
```
┌───────────────────────────────────────┐
│ ← Back          Company Name     [Edit]│
├───────────────────────────────────────┤
│ Status: [Hot ▼]  Owner: [Marko ▼]    │
│ Source: Referral  Est. Workers: 20    │
│ Est. Revenue: €40,000                 │
│                                       │
│ Next Action: Call Snezana             │
│ Due: Mon Mar 31  ⚠ OVERDUE           │
│ [✓ Complete]  [Reschedule]            │
├───────────────────────────────────────┤
│ ACTIVITY LOG                [+ Add]   │
│                                       │
│ 📞 Call — Mar 27, Marko              │
│ "Called Snezana. No answer."          │
│                                       │
│ 📧 Email — Mar 24, Marko            │
│ "Sent pricing proposal for 20 workers"│
│                                       │
│ 🤝 Meeting — Mar 20, Marko          │
│ "Met at their office. Interested but  │
│  decision makers not reached yet."    │
├───────────────────────────────────────┤
│ TASKS                       [+ Add]   │
│ ☐ Follow up with Snezana — Mar 31   │
│ ☑ Send proposal — Mar 24 ✓          │
├───────────────────────────────────────┤
│ NOTES                                 │
│ "Huge company but decisions made by   │
│  small number of people we haven't    │
│  reached yet."                        │
│                                       │
│ [Convert to Client ▶]                │
│ (Creates company + links lead)        │
└───────────────────────────────────────┘
```

---

### 3.4 Task Management (NEW)

**Accessible from:** Every dashboard widget + dedicated /tasks page + entity detail panels.

**Tasks Page Layout:**
```
┌─────────────────────────────────────────────────┐
│ Tasks                    [+ New Task]            │
│ [My Tasks●] [All Tasks] [Overdue (3)]           │
├─────────────────────────────────────────────────┤
│ Filter: [All Priorities ▼] [All Entities ▼]      │
│                                                  │
│ ⚠ OVERDUE                                       │
│ ┌──────────────────────────────────────────┐    │
│ │ ☐ Call Igor — Nefertiti                   │    │
│ │   🏢 Lead: Nefertiti/KFC                  │    │
│ │   👤 Marko  📅 Mar 25 (4 days overdue)    │    │
│ │   Priority: High                    [→]   │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ 📅 TODAY                                        │
│ ┌──────────────────────────────────────────┐    │
│ │ ☐ Send CVs to City Express                │    │
│ │   📋 Order: EWL-2026-0004                 │    │
│ │   👤 Kaca  📅 Today                        │    │
│ │   Priority: Normal                  [→]   │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ 📅 THIS WEEK                                    │
│ ┌──────────────────────────────────────────┐    │
│ │ ☐ Verify Clean Trade documents            │    │
│ │   👤 Worker: Rajan Patel                   │    │
│ │   👤 Kaca  📅 Apr 2                        │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ✅ COMPLETED (today)                            │
│ ┌──────────────────────────────────────────┐    │
│ │ ☑ Call Kristijan — MK Group               │    │
│ │   Completed by Marko, 10:30              │    │
│ └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**Quick Task Creation (from any page):**
```
┌──────────────────────────────────┐
│ Quick Task                  [×]  │
│ Title: [________________________]│
│ Assign to: [Kaca ▼]             │
│ Due date: [Apr 2 ▼]             │
│ Priority: ○Low ●Normal ○High    │
│ Link to: [Order: EWL-2026-0004] │
│                      [Create ▶] │
└──────────────────────────────────┘
```

---

### 3.5 Partner Portal (NEW)

Clean, simple interface. Partner doesn't need complex navigation.

**Partner Dashboard:**
```
┌─────────────────────────────────────────────────┐
│ Welcome, Vishal                                  │
│ EWL Partner Portal — ProSource India             │
├────────┬────────┬────────┬──────────────────────┤
│ Active │Candid. │ Accept │ Pending              │
│ Orders │ Submit │  Rate  │ Review               │
│   4    │  28    │  78%   │   6                  │
├────────┴────────┴────────┴──────────────────────┤
│                                                  │
│ ┌─ Active Orders ─────────────────────────┐     │
│ │                                          │     │
│ │ EWL-2026-0004                            │     │
│ │ Welder — 13 workers needed               │     │
│ │ City Express, Serbia                      │     │
│ │ Start: Apr 15 | Submitted: 8/13          │     │
│ │ [View Details →] [Submit Candidate →]    │     │
│ │                                          │     │
│ │ EWL-2026-0003                            │     │
│ │ CNC Operator — 10 workers needed         │     │
│ │ LM Dekor Plus, Serbia                    │     │
│ │ Start: May 1 | Submitted: 6/10           │     │
│ │ [View Details →] [Submit Candidate →]    │     │
│ └──────────────────────────────────────────┘     │
│                                                  │
│ ┌─ Recent Activity ───────────────────────┐     │
│ │ ✓ Rajan Patel approved — EWL-2026-0004  │     │
│ │ ✗ Sunil Kumar rejected — needs welding   │     │
│ │   cert. EWL-2026-0004                    │     │
│ │ ⏳ Amit Singh — pending review           │     │
│ └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Partner Order Detail:**
```
┌─────────────────────────────────────────────────┐
│ ← Back to Orders                                 │
│                                                  │
│ EWL-2026-0004 — Welder                          │
│ Status: Sourcing | 8/13 submitted                │
├─────────────────────────────────────────────────┤
│ REQUIREMENTS                                     │
│ ┌──────────────────────────────────────────┐    │
│ │ Position: Welder                          │    │
│ │ Workers needed: 13                        │    │
│ │ Source country: India                     │    │
│ │ Start date: April 15, 2026               │    │
│ │ Contract: 12 months                       │    │
│ │ Experience: 3+ years                      │    │
│ │ Education: Vocational                     │    │
│ │ Serbian language: Not required            │    │
│ │ Skills: MIG/TIG welding, blueprint reading│    │
│ │                                           │    │
│ │ Job Description:                          │    │
│ │ "Skilled welder for automotive parts..."  │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ [+ Submit New Candidate]                        │
│                                                  │
│ SUBMITTED CANDIDATES (8)                        │
│ ┌──────────────────────────────────────────┐    │
│ │ ✓ Rajan Patel    Approved  Mar 25        │    │
│ │ ✓ Amit Singh     Approved  Mar 24        │    │
│ │ ⏳ Priya Sharma   CV Sent   Mar 27       │    │
│ │ ⏳ Vikram Rao     CV Sent   Mar 27       │    │
│ │ ✗ Sunil Kumar    Rejected  Mar 26        │    │
│ │   Reason: "Missing welding certification" │    │
│ │ ⏳ Raj Malhotra   Sourcing  Mar 28       │    │
│ │ ⏳ Deepak Nair    Sourcing  Mar 28       │    │
│ │ ⏳ Anita Desai    Sourcing  Mar 28       │    │
│ └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**Candidate Submission Form:**
```
┌─────────────────────────────────────────────────┐
│ Submit Candidate — EWL-2026-0004                │
├─────────────────────────────────────────────────┤
│                                                  │
│ Personal Information                             │
│ First Name*:  [________________]                 │
│ Last Name*:   [________________]                 │
│ Nationality*: [India ▼         ]                 │
│ Date of Birth:[____/____/______]                 │
│ Phone:        [________________]                 │
│ Email:        [________________]                 │
│                                                  │
│ Passport Information                             │
│ Passport No*: [________________]                 │
│ Expiry Date*: [____/____/______]                 │
│                                                  │
│ Documents                                        │
│ CV*:    [Choose file...] or drag & drop          │
│ Photo:  [Choose file...] or drag & drop          │
│                                                  │
│ Notes for EWL team:                              │
│ [________________________________________]       │
│ [________________________________________]       │
│                                                  │
│ [Cancel]                    [Submit Candidate ▶] │
└─────────────────────────────────────────────────┘
```

---

### 3.6 Bulk Operations UX (NEW)

**Bulk Select Mode (Worker List):**
```
┌─────────────────────────────────────────────────┐
│ Workers          [☐ Select All]  [Exit Select]   │
│ 3 selected       [Move Stage ▼] [Upload Docs ▼] │
├─────────────────────────────────────────────────┤
│ [☑] Rajan Patel    | documents_collection | ●   │
│ [☑] Amit Singh     | documents_collection | ●   │
│ [☐] Priya Sharma   | cv_screening         | ●   │
│ [☑] Vikram Rao     | documents_collection | ●   │
│ [☐] Sunil Kumar    | rejected             | ✗   │
└─────────────────────────────────────────────────┘
```

**Bulk Stage Change Dialog:**
```
┌────────────────────────────────────┐
│ Move 3 Workers                     │
│                                    │
│ From: documents_collection         │
│ To:   [document_generation ▼]      │
│                                    │
│ Note (optional):                   │
│ [All docs verified, proceed to gen]│
│                                    │
│ Workers:                           │
│ • Rajan Patel                      │
│ • Amit Singh                       │
│ • Vikram Rao                       │
│                                    │
│ [Cancel]        [Move 3 Workers ▶] │
└────────────────────────────────────┘
```

**Bulk Document Upload:**
```
┌────────────────────────────────────────┐
│ Bulk Upload Documents                  │
│                                        │
│ ┌────────────────────────────────┐    │
│ │                                │    │
│ │   Drag & drop files here       │    │
│ │   or click to browse           │    │
│ │                                │    │
│ │   Naming: lastname_doctype.pdf │    │
│ │   e.g. patel_passport.pdf      │    │
│ │                                │    │
│ └────────────────────────────────┘    │
│                                        │
│ Matched files:                         │
│ ✓ patel_passport.pdf → Rajan Patel    │
│ ✓ singh_cv.pdf → Amit Singh           │
│ ⚠ rao_cert.pdf → No match (manual?)  │
│                                        │
│ [Cancel]              [Upload All ▶]  │
└────────────────────────────────────────┘
```

---

### 3.7 Mobile-First Redesign

#### Mobile Table → Card View

**Current (broken on mobile):**
```
Worker | Nationality | Stage | Status | Actions
(horizontal scroll required, small tap targets)
```

**V2 (card view on mobile):**
```
┌─────────────────────────────┐
│ Rajan Patel            [→]  │
│ 🇮🇳 Indian                   │
│ ┌─────────────────────────┐ │
│ │ documents_collection    │ │
│ └─────────────────────────┘ │
│ ● Active  |  Order: 0004   │
│ ⚠ Visa delay               │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Amit Singh             [→]  │
│ 🇮🇳 Indian                   │
│ ┌─────────────────────────┐ │
│ │ visa_application        │ │
│ └─────────────────────────┘ │
│ ● Active  |  Order: 0004   │
└─────────────────────────────┘
```

#### Mobile Bottom Navigation
```
┌─────────────────────────────────┐
│                                 │
│       (page content)            │
│                                 │
├────┬────┬────┬────┬────────────┤
│ 🏠 │ 📋 │ 👥 │ ✓  │ •••        │
│Home│CRM │Work│Task│ More       │
└────┴────┴────┴────┴────────────┘
```

**Bottom nav specs:**
- Height: 64px (safe area inset padding for iOS)
- Icon: 20px + label 10px below
- Active: accent color (orange)
- Inactive: muted-foreground
- Badge: red dot for notification count

#### Mobile Form Optimization
- Full-width inputs (no 2-column grids)
- Large touch targets: min 44x44px
- Sticky submit buttons at bottom
- Native date picker via `type="date"`
- Camera access for document upload via `capture="environment"`

---

## 4. Component Specifications

### 4.1 New Components

#### LeadCard
```
Props: { lead: Lead, onDragStart, onClick, compact?: boolean }
Size: 220px width (kanban), full-width (list)
States: default, hover (shadow-md), dragging (opacity-50, shadow-lg)
Content: company name (bold), contact, est. workers, next action + date, owner avatar
Overdue indicator: warning border-left-4 + "⚠" icon
```

#### TaskCard
```
Props: { task: Task, onToggle, onClick, compact?: boolean }
Size: full-width
States: todo (default), in_progress (accent left border), done (muted, strikethrough)
Content: checkbox, title, entity link, assignee avatar, due date
Overdue: destructive text color on due date, warning background
```

#### BulkActionBar
```
Props: { selectedCount: number, actions: Action[], onClear }
Position: sticky bottom, z-50
Animation: slide up on selection, slide down on clear
Content: "{n} selected" + action buttons + "Clear" button
Background: primary with white text
```

#### SLAIndicator
```
Props: { daysInStage: number, expectedDays: number, warningDays: number }
Display:
  - Green if daysInStage < expectedDays - warningDays
  - Amber if daysInStage >= expectedDays - warningDays
  - Red pulse if daysInStage > expectedDays
Format: "{days}d / {expected}d" with progress bar
```

#### DebouncedSearch
```
Props: { onSearch, delay?: 300, placeholder }
Behavior: debounce input, show loading spinner during delay
Clear button appears when input has value
```

#### MobileCardView
```
Props: { data: T[], renderCard: (item: T) => ReactNode, emptyState }
Behavior: replaces Table on screens < 768px
Renders vertical card stack with gap-3
Pagination: "Load more" button (not infinite scroll)
```

### 4.2 Modified Components

#### AppSidebar
- Add partner navigation items
- Add CRM section (ops/management)
- Add Tasks link (all roles)
- Collapse to bottom nav on mobile

#### ProtectedRoute
- Add `partner` to allowedRoles type
- Add partner redirect (/ -> /partner)

#### NotificationBell
- Add task overdue count alongside notification count
- Split badge: "3 / 2" (notifications / tasks)

---

## 5. Interaction Patterns

### 5.1 Drag and Drop (CRM Kanban)
- Library: `@dnd-kit/core` (accessible, mobile-friendly)
- Visual feedback: ghost card at 50% opacity follows cursor
- Drop zone: column highlights with dashed border on drag over
- Mobile: long-press to start drag (300ms), haptic feedback
- Undo: toast with "Undo" button for 5 seconds after drop

### 5.2 Optimistic Updates
Apply to all frequent mutations:
- Task toggle (done/undone): instant UI update, rollback on error
- Lead status change (drag): instant column move, rollback on error
- Notification mark-as-read: instant badge decrement

### 5.3 Loading States
Replace generic Loader2 spinner with contextual skeletons:

```
// Card skeleton
┌─────────────────────────┐
│ ████████████             │  <- title
│ ██████                   │  <- subtitle
│ ████████████████         │  <- content
│ ██████████               │  <- content
└─────────────────────────┘

// Table skeleton
│ ████████ │ ██████ │ ████████████ │ ██████ │
│ ████████ │ ██████ │ ████████████ │ ██████ │
│ ████████ │ ██████ │ ████████████ │ ██████ │
```

### 5.4 Empty States
Each section gets a contextual empty state:

```
// No leads
┌─────────────────────────┐
│     📊                   │
│  No leads yet            │
│  Start by adding your    │
│  first lead.             │
│  [+ Add Lead]            │
└─────────────────────────┘

// No tasks
┌─────────────────────────┐
│     ✓                    │
│  All caught up!          │
│  No tasks due today.     │
└─────────────────────────┘
```

### 5.5 Confirmation Patterns
- **Destructive actions** (delete worker, reject candidate): AlertDialog with typed confirmation
- **Status changes** (move stage, change order status): Inline confirm with note
- **Bulk actions**: Dialog showing affected items + confirm button with count

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|-----------|-------|----------------|
| Mobile | <640px (sm) | Single column, bottom nav, card views, full-width inputs |
| Tablet | 640-1023px (md) | 2-column grids, sidebar collapsed by default |
| Desktop | 1024-1279px (lg) | Full sidebar, 3-4 column stat grids |
| Wide | 1280px+ (xl) | Max-width containers, extra dashboard columns |

**Critical mobile fixes:**
- Pipeline progress: horizontal scroll within card (not page scroll)
- Kanban board: horizontal swipe between columns (like Trello mobile)
- Stage change: bottom sheet instead of popover
- Document actions: action sheet instead of icon buttons

---

## 7. Accessibility Requirements

### 7.1 Keyboard Navigation
- Kanban: arrow keys to move between cards, Enter to open, Space to pick up for drag
- Task list: Tab between tasks, Space to toggle completion
- Bulk select: Shift+Click for range select, Ctrl+Click for individual toggle
- Search: Focus with "/" shortcut (desktop)

### 7.2 Screen Reader
- Kanban columns: `role="list"`, cards: `role="listitem"`
- Pipeline progress: `aria-valuenow`, `aria-valuemax` for progress indication
- Status badges: `aria-label` with full status text (not just color)
- Task checkbox: `aria-checked`, `aria-label` with task title

### 7.3 Color Independence
- Never use color alone to convey status -- always include icon or text
- Pipeline stages: color + text label
- Task priority: color + text (Low/Normal/High/Urgent)
- SLA indicator: color + "Xd / Yd" text

---

## 8. Animation & Micro-interactions

Keep animations minimal and purposeful:

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transition | Fade in | 150ms | ease-out |
| Card hover | Shadow expand | 200ms | ease-in-out |
| Kanban drag | Scale 1.02 + shadow | instant | - |
| Task complete | Strikethrough + fade | 300ms | ease-out |
| Toast notification | Slide up + fade | 200ms | ease-out |
| Bottom nav switch | Icon scale pulse | 150ms | ease-out |
| Skeleton loading | Shimmer | 1.5s loop | linear |
| SLA breach | Red pulse | 2s loop | ease-in-out |
| Bulk action bar | Slide up | 200ms | ease-out |

**Motion reduction:** Respect `prefers-reduced-motion` -- disable all non-essential animations.

---

## 9. Dark Mode

V1 has dark mode support via `next-themes`. V2 maintains it:

- All new colors defined in both `:root` and `.dark` selectors
- CRM status colors adjusted for dark backgrounds (increase lightness by 10%)
- Kanban cards: dark card background distinct from column background
- Partner portal: same theme support

**Test checklist:**
- All badge variants readable in both modes
- Chart colors distinguishable in both modes
- Form inputs visible (border contrast)
- Pipeline stage colors work on dark background

---

## 10. Internationalization (UX Impact)

### 10.1 New Translation Keys (v2)

```
crm: {
  title, leads, pipeline, newLead, leadDetail, activities, logCall,
  logMeeting, logEmail, logWhatsapp, logNote, convertToClient,
  cold, warm, hot, negotiating, won, lost, source, estimatedWorkers,
  estimatedRevenue, nextAction, nextActionDate, owner, lostReason,
  overdueFollowups, noLeads, addFirstLead
}

tasks: {
  title, myTasks, allTasks, overdue, newTask, quickTask, assignTo,
  dueDate, priority, priorityLow, priorityNormal, priorityHigh,
  priorityUrgent, status, statusTodo, statusInProgress, statusDone,
  statusCancelled, allCaughtUp, noTasks, linkedTo, completedBy
}

partner: {
  dashboard, orders, submitCandidate, candidates, requirements,
  submitted, accepted, rejected, pending, acceptance_rate,
  noOrders, submitFirst, candidateSubmitted, messages
}

bulk: {
  selected, moveStage, uploadDocs, generateDocs, selectAll,
  clearSelection, confirm, processing
}

sla: {
  breach, warning, daysInStage, expectedDays, overdueBy
}
```

### 10.2 Layout Considerations
- Serbian text is typically 15-20% longer than English
- All containers must handle text overflow (truncate or wrap)
- CRM kanban card width accommodates longer Serbian labels
- Button text: use icons + short labels, not full sentences

---

## 11. Design QA Checklist

Before shipping each phase:

- [ ] All pages tested at 375px, 768px, 1024px, 1440px widths
- [ ] Dark mode tested on all new pages
- [ ] All new components have hover, focus, active, disabled states
- [ ] Empty states designed for all lists/tables
- [ ] Loading skeletons for all async data
- [ ] Error states for all API failures
- [ ] Touch targets >= 44x44px on mobile
- [ ] Color contrast >= 4.5:1 (WCAG AA)
- [ ] All status indicators use color + text/icon (not color alone)
- [ ] Serbian translations complete and fit within layouts
- [ ] Keyboard navigation works for all interactive elements
- [ ] `prefers-reduced-motion` respected
- [ ] Toast notifications for all mutations (success + error)
- [ ] Undo available for destructive or hard-to-reverse actions
