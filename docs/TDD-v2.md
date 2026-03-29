# EWL Portal v2 -- Technical Design Document

**Version:** 2.0
**Date:** 2026-03-29
**Author:** EWL Engineering
**Status:** Draft

---

## 1. System Overview

### 1.1 Current Architecture

```
Browser (React SPA)
    |
    +-- Supabase Client (supabase-js v2.97)
    |       |
    |       +-- Auth (email/password, JWT, localStorage)
    |       +-- Database (PostgreSQL via PostgREST, RLS)
    |       +-- Storage (S3-compatible, 2 buckets)
    |       +-- Realtime (WebSocket, LISTEN/NOTIFY)
    |       +-- Edge Functions (Deno, 5 functions)
    |
    +-- External Services
            +-- Resend (email delivery)
            +-- SignWell (e-signing)
            +-- Google Fonts (Inter)
```

### 1.2 V2 Architecture (No Change to Core Stack)

The architecture remains a Supabase-backed React SPA. V2 adds:
- New database tables (5) and enum values
- New edge functions (4) and a pg_cron scheduled job
- Refactored frontend with custom hooks layer
- New partner role with dedicated routes

**Rationale for keeping the stack:**
- Supabase handles auth, RLS, real-time, storage, and serverless -- no backend to build
- At projected scale (50 concurrent users, 500 workers/year), Supabase Pro tier is sufficient
- Team familiarity: Lovable-generated code is already understood
- Cost: Supabase Pro ($25/mo) + Resend + SignWell << custom backend hosting

---

## 2. Database Design

### 2.1 Schema Changes

#### New Enum Values
```sql
-- Extend app_role
ALTER TYPE app_role ADD VALUE 'partner';
```

#### New Tables

**leads**
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source TEXT NOT NULL CHECK (source IN ('referral', 'cold', 'event', 'website', 'partner', 'other')),
  status TEXT NOT NULL DEFAULT 'cold' CHECK (status IN ('cold', 'warm', 'hot', 'negotiating', 'won', 'lost')),
  owner_id UUID REFERENCES auth.users(id),
  estimated_workers INTEGER,
  estimated_revenue_eur NUMERIC(10,2),
  next_action TEXT,
  next_action_date DATE,
  notes TEXT,
  lost_reason TEXT,
  converted_company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_next_action_date ON leads(next_action_date);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops and management can manage leads"
  ON leads FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));
```

**lead_activities**
```sql
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'meeting', 'email', 'whatsapp', 'note')),
  content TEXT NOT NULL,
  outcome TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops and management can manage lead activities"
  ON lead_activities FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));
```

**tasks**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT CHECK (entity_type IN ('lead', 'order', 'worker', 'company', 'general')),
  entity_id UUID,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_assigned ON tasks(assigned_to) WHERE status != 'done';
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'done';
CREATE INDEX idx_tasks_entity ON tasks(entity_type, entity_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see tasks assigned to them
CREATE POLICY "Users see own tasks"
  ON tasks FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- Ops/management can see and manage all tasks
CREATE POLICY "Ops and management manage all tasks"
  ON tasks FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));

-- Any user can create tasks
CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**partner_agencies**
```sql
CREATE TABLE partner_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partner_agencies ENABLE ROW LEVEL SECURITY;

-- Partners see own agency
CREATE POLICY "Partners see own agency"
  ON partner_agencies FOR SELECT
  USING (
    has_role(auth.uid(), 'partner') AND
    id = get_user_partner_agency_id(auth.uid())
  );

-- Ops/management manage all
CREATE POLICY "Ops and management manage partner agencies"
  ON partner_agencies FOR ALL
  USING (has_role(auth.uid(), 'ops') OR has_role(auth.uid(), 'management'));
```

**automation_rules**
```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('stage_change', 'document_status', 'signing_status', 'schedule')),
  trigger_condition JSONB NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('change_stage', 'send_notification', 'create_task', 'send_email')),
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management manages automation rules"
  ON automation_rules FOR ALL
  USING (has_role(auth.uid(), 'management'));

CREATE POLICY "All authenticated can read active rules"
  ON automation_rules FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);
```

#### Table Modifications

```sql
-- Add partner_agency_id to orders
ALTER TABLE orders ADD COLUMN partner_agency_id UUID REFERENCES partner_agencies(id);
CREATE INDEX idx_orders_partner ON orders(partner_agency_id);

-- Add partner_agency_id to profiles (for partner users)
ALTER TABLE profiles ADD COLUMN partner_agency_id UUID REFERENCES partner_agencies(id);

-- Add SLA fields to pipeline_stage_config
ALTER TABLE pipeline_stage_config ADD COLUMN expected_duration_days INTEGER;
ALTER TABLE pipeline_stage_config ADD COLUMN sla_warning_days INTEGER;

-- Add preferences to profiles
ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}';
```

#### New Database Functions

```sql
-- Get partner agency for a user
CREATE OR REPLACE FUNCTION get_user_partner_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT partner_agency_id FROM profiles WHERE user_id = _user_id;
$$;

-- Check SLA breaches (called by pg_cron)
CREATE OR REPLACE FUNCTION check_sla_breaches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  w RECORD;
  stage_config RECORD;
  days_in_stage INTEGER;
BEGIN
  FOR w IN
    SELECT w.id, w.current_stage, w.first_name, w.last_name,
           h.created_at AS stage_entered_at,
           o.reference_number, c.name AS company_name
    FROM workers w
    JOIN pipeline_stage_history h ON h.worker_id = w.id AND h.to_stage = w.current_stage
    JOIN orders o ON o.id = w.order_id
    JOIN companies c ON c.id = w.company_id
    WHERE w.status = 'active'
    AND h.created_at = (
      SELECT MAX(h2.created_at) FROM pipeline_stage_history h2
      WHERE h2.worker_id = w.id AND h2.to_stage = w.current_stage
    )
  LOOP
    SELECT * INTO stage_config FROM pipeline_stage_config
    WHERE stage_key = w.current_stage::text;

    IF stage_config.expected_duration_days IS NOT NULL THEN
      days_in_stage := EXTRACT(DAY FROM now() - w.stage_entered_at);
      IF days_in_stage > stage_config.expected_duration_days THEN
        -- Insert SLA breach notification
        INSERT INTO notifications (
          recipient_email, notification_type, subject, body,
          entity_type, entity_id, status
        )
        SELECT p.email,
          'sla_breach',
          'SLA Breach: ' || w.first_name || ' ' || w.last_name,
          'Worker ' || w.first_name || ' ' || w.last_name || ' has been in stage ' ||
          w.current_stage || ' for ' || days_in_stage || ' days (expected: ' ||
          stage_config.expected_duration_days || ' days). Order: ' || w.reference_number,
          'worker', w.id, 'pending'
        FROM profiles p
        JOIN user_roles ur ON ur.user_id = p.user_id
        WHERE ur.role IN ('ops', 'management')
        AND p.is_active = true;
      END IF;
    END IF;
  END LOOP;
END;
$$;
```

#### Partner RLS Policies

```sql
-- Partners see orders assigned to their agency
CREATE POLICY "Partners see assigned orders"
  ON orders FOR SELECT
  USING (
    has_role(auth.uid(), 'partner') AND
    partner_agency_id = get_user_partner_agency_id(auth.uid())
  );

-- Partners see workers for their assigned orders
CREATE POLICY "Partners see workers for assigned orders"
  ON workers FOR SELECT
  USING (
    has_role(auth.uid(), 'partner') AND
    order_id IN (
      SELECT id FROM orders
      WHERE partner_agency_id = get_user_partner_agency_id(auth.uid())
    )
  );

-- Partners can insert workers for their assigned orders
CREATE POLICY "Partners can submit candidates"
  ON workers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'partner') AND
    order_id IN (
      SELECT id FROM orders
      WHERE partner_agency_id = get_user_partner_agency_id(auth.uid())
    )
  );

-- Partners can upload to worker-documents bucket
CREATE POLICY "Partners upload candidate documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'worker-documents' AND
    has_role(auth.uid(), 'partner')
  );
```

---

## 3. Frontend Architecture

### 3.1 Directory Structure (v2)

```
src/
├── components/
│   ├── ui/                          # shadcn/ui (unchanged)
│   ├── settings/                    # Management settings (unchanged)
│   ├── crm/                         # NEW: CRM components
│   │   ├── LeadKanban.tsx
│   │   ├── LeadCard.tsx
│   │   ├── LeadDetailPanel.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── LeadForm.tsx
│   ├── tasks/                       # NEW: Task components
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   └── MyTasksWidget.tsx
│   ├── partner/                     # NEW: Partner components
│   │   ├── CandidateSubmitForm.tsx
│   │   ├── OrderRequirements.tsx
│   │   └── PartnerMessageThread.tsx
│   ├── common/                      # NEW: Shared components
│   │   ├── ErrorBoundary.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── MobileCardView.tsx
│   │   ├── DebouncedSearch.tsx
│   │   ├── FilterBar.tsx
│   │   └── BulkActionBar.tsx
│   ├── AppLayout.tsx
│   ├── AppSidebar.tsx               # Add partner nav items
│   ├── ProtectedRoute.tsx           # Add partner role
│   └── ...existing components
│
├── hooks/                           # REFACTORED: Custom hooks
│   ├── api/                         # NEW: Data fetching hooks
│   │   ├── useWorkers.ts
│   │   ├── useWorker.ts
│   │   ├── useOrders.ts
│   │   ├── useOrder.ts
│   │   ├── useCompanies.ts
│   │   ├── useCompany.ts
│   │   ├── useDocuments.ts
│   │   ├── useNotifications.ts
│   │   ├── useLeads.ts
│   │   ├── useLead.ts
│   │   ├── useTasks.ts
│   │   └── usePartnerOrders.ts
│   ├── mutations/                   # NEW: Mutation hooks
│   │   ├── useUpdateWorkerStage.ts
│   │   ├── useCreateOrder.ts
│   │   ├── useUploadDocument.ts
│   │   ├── useBulkStageChange.ts
│   │   ├── useCreateLead.ts
│   │   ├── useUpdateLead.ts
│   │   ├── useCreateTask.ts
│   │   └── useSubmitCandidate.ts
│   ├── use-toast.ts
│   └── use-mobile.tsx
│
├── pages/                           # EXISTING + NEW
│   ├── ...existing 28 pages (refactored to use hooks)
│   ├── crm/                         # NEW
│   │   ├── CrmDashboard.tsx
│   │   ├── LeadsList.tsx
│   │   └── LeadDetail.tsx
│   ├── partner/                     # NEW
│   │   ├── PartnerDashboard.tsx
│   │   ├── PartnerOrders.tsx
│   │   ├── PartnerOrderDetail.tsx
│   │   └── PartnerProfile.tsx
│   └── tasks/                       # NEW
│       └── TasksPage.tsx
│
├── lib/
│   ├── queryKeys.ts                 # NEW: Centralized query keys
│   ├── notifications.ts
│   └── utils.ts
│
├── contexts/
│   └── AuthContext.tsx               # Add partner role handling
│
├── i18n/translations/
│   ├── en.ts                        # Add CRM, tasks, partner translations
│   └── sr.ts
│
├── __tests__/                       # NEW: Test directory
│   ├── auth.test.ts
│   ├── orders.test.ts
│   ├── pipeline.test.ts
│   ├── documents.test.ts
│   └── rls.test.ts
│
└── App.tsx                          # Add CRM, partner, task routes
```

### 3.2 Query Keys

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  // Workers
  workers: {
    all: ['workers'] as const,
    list: (filters?: WorkerFilters) => ['workers', 'list', filters] as const,
    detail: (id: string) => ['workers', 'detail', id] as const,
    documents: (workerId: string) => ['workers', 'documents', workerId] as const,
    history: (workerId: string) => ['workers', 'history', workerId] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    list: (filters?: OrderFilters) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    byCompany: (companyId: string) => ['orders', 'company', companyId] as const,
  },

  // Companies
  companies: {
    all: ['companies'] as const,
    detail: (id: string) => ['companies', 'detail', id] as const,
  },

  // CRM
  leads: {
    all: ['leads'] as const,
    list: (filters?: LeadFilters) => ['leads', 'list', filters] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
    activities: (leadId: string) => ['leads', 'activities', leadId] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    mine: (userId: string) => ['tasks', 'mine', userId] as const,
    byEntity: (type: string, id: string) => ['tasks', 'entity', type, id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },

  // Partner
  partner: {
    orders: (agencyId: string) => ['partner', 'orders', agencyId] as const,
    candidates: (orderId: string) => ['partner', 'candidates', orderId] as const,
  },

  // Config
  config: {
    pipelineStages: ['config', 'pipeline-stages'] as const,
    emailTemplates: ['config', 'email-templates'] as const,
    automationRules: ['config', 'automation-rules'] as const,
  },
} as const;
```

### 3.3 Custom Hook Pattern

```typescript
// src/hooks/api/useWorkers.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

interface WorkerFilters {
  stage?: string;
  status?: string;
  companyId?: string;
  orderId?: string;
  search?: string;
  flagVisaDelay?: boolean;
  flagEuprava?: boolean;
}

export function useWorkers(filters?: WorkerFilters) {
  return useQuery({
    queryKey: queryKeys.workers.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('workers')
        .select('*, orders!inner(reference_number, position_title), companies!inner(name)')
        .eq('status', 'active');

      if (filters?.stage) query = query.eq('current_stage', filters.stage);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.companyId) query = query.eq('company_id', filters.companyId);
      if (filters?.orderId) query = query.eq('order_id', filters.orderId);
      if (filters?.flagVisaDelay) query = query.eq('flag_visa_delay', true);
      if (filters?.flagEuprava) query = query.eq('flag_euprava', true);
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// src/hooks/mutations/useBulkStageChange.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

export function useBulkStageChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workerIds,
      toStage,
      note,
    }: {
      workerIds: string[];
      toStage: string;
      note?: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Update all workers
      const { error: updateError } = await supabase
        .from('workers')
        .update({ current_stage: toStage })
        .in('id', workerIds);
      if (updateError) throw updateError;

      // Get current stages for history
      const { data: workers } = await supabase
        .from('workers')
        .select('id, current_stage')
        .in('id', workerIds);

      // Insert history records
      const historyRecords = workerIds.map((id) => ({
        worker_id: id,
        from_stage: workers?.find((w) => w.id === id)?.current_stage,
        to_stage: toStage,
        changed_by: user.id,
        notes: note || `Bulk stage change (${workerIds.length} workers)`,
      }));

      const { error: historyError } = await supabase
        .from('pipeline_stage_history')
        .insert(historyRecords);
      if (historyError) throw historyError;

      return { count: workerIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
    },
  });
}
```

### 3.4 Route Changes

```typescript
// Additions to App.tsx

// CRM routes (ops + management)
<Route element={<ProtectedRoute allowedRoles={["ops", "management"]} />}>
  <Route path="/crm" element={<CrmDashboard />} />
  <Route path="/crm/leads" element={<LeadsList />} />
  <Route path="/crm/leads/:id" element={<LeadDetail />} />
</Route>

// Tasks route (all authenticated)
<Route element={<ProtectedRoute allowedRoles={["client", "ops", "management", "partner"]} />}>
  <Route path="/tasks" element={<TasksPage />} />
</Route>

// Partner routes
<Route element={<ProtectedRoute allowedRoles={["partner"]} />}>
  <Route path="/partner" element={<PartnerDashboard />} />
  <Route path="/partner/orders" element={<PartnerOrders />} />
  <Route path="/partner/orders/:id" element={<PartnerOrderDetail />} />
  <Route path="/partner/profile" element={<PartnerProfile />} />
</Route>
```

### 3.5 Error Boundary

```typescript
// src/components/common/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">
            {this.state.error?.message}
          </p>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 4. Edge Functions (New)

### 4.1 process-automation-rules

**Trigger:** Called via database webhook on `workers` UPDATE (current_stage change) and `worker_documents` UPDATE (status/signing_status change).

```typescript
// supabase/functions/process-automation-rules/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { type, table, record, old_record } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch active rules matching trigger
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', determineTriggerType(table, record, old_record));

  for (const rule of rules || []) {
    if (evaluateCondition(rule.trigger_condition, record, old_record)) {
      await executeAction(supabase, rule, record);
    }
  }

  return new Response(JSON.stringify({ success: true }));
});

function determineTriggerType(table: string, record: any, old_record: any): string {
  if (table === 'workers' && record.current_stage !== old_record.current_stage) {
    return 'stage_change';
  }
  if (table === 'worker_documents' && record.status !== old_record.status) {
    return 'document_status';
  }
  if (table === 'worker_documents' && record.signing_status !== old_record.signing_status) {
    return 'signing_status';
  }
  return 'unknown';
}

function evaluateCondition(condition: any, record: any, old_record: any): boolean {
  // Example condition: { "to_stage": "documents_collection", "all_docs_verified": true }
  if (condition.to_stage && record.current_stage !== condition.to_stage) return false;
  // Additional condition checks...
  return true;
}

async function executeAction(supabase: any, rule: any, record: any) {
  switch (rule.action_type) {
    case 'change_stage':
      await supabase.from('workers').update({
        current_stage: rule.action_config.target_stage
      }).eq('id', record.id);
      // Record in history
      await supabase.from('pipeline_stage_history').insert({
        worker_id: record.id,
        from_stage: record.current_stage,
        to_stage: rule.action_config.target_stage,
        changed_by: '00000000-0000-0000-0000-000000000000', // system user
        notes: `Auto: ${rule.name}`,
      });
      break;
    case 'send_notification':
      await supabase.functions.invoke('send-notification', {
        body: rule.action_config,
      });
      break;
    case 'create_task':
      await supabase.from('tasks').insert({
        ...rule.action_config,
        entity_type: 'worker',
        entity_id: record.id,
        created_by: '00000000-0000-0000-0000-000000000000',
      });
      break;
  }
}
```

### 4.2 send-daily-digest

**Trigger:** pg_cron job, daily at 08:00 CET.

```sql
-- pg_cron setup
SELECT cron.schedule(
  'daily-ops-digest',
  '0 7 * * 1-5',  -- 07:00 UTC (08:00 CET) weekdays
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-daily-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'
  )$$
);
```

**Logic:**
1. Query all active workers with SLA breaches (days_in_stage > expected_duration_days)
2. Query tasks overdue (due_date < today, status != done)
3. Query documents pending verification for >48h
4. Compose HTML digest email
5. Send to all ops/management users via send-notification

### 4.3 bulk-generate-documents

**Purpose:** Generate documents for all approved workers in an order.

```typescript
// Request: { orderId: string, templateTypes: string[] }
// Process:
// 1. Fetch all workers in order with status=active, stage >= approved_by_client
// 2. For each worker x templateType combination:
//    a. Invoke generate-document logic (shared module)
//    b. Track success/failure
// 3. Return summary: { total, success, failed, errors: [{workerId, error}] }
```

---

## 5. Real-time & Subscriptions

### 5.1 Current Subscriptions
- `notifications` table: new notification toast + badge count
- `workers` table: pipeline stage changes (ops dashboard)
- `orders` table: order status changes

### 5.2 V2 Additions
- `leads` table: lead status changes (CRM kanban auto-update)
- `tasks` table: task assignment notifications
- `worker_documents` table: signing status changes (document page refresh)

### 5.3 Subscription Architecture

```typescript
// Centralize subscriptions in a hook per domain
// src/hooks/useRealtimeWorkers.ts
export function useRealtimeWorkers(queryClient: QueryClient) {
  useEffect(() => {
    const channel = supabase
      .channel('workers-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workers',
      }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}
```

---

## 6. Storage

### 6.1 Current Buckets
- `worker-documents` -- worker files (CV, passport, contracts)
- `document-templates` -- Word templates for generation

### 6.2 V2 Additions
No new buckets needed. Partner uploads go into `worker-documents` bucket with existing policies extended for partner role.

### 6.3 File Naming Convention
```
worker-documents/
  {workerId}/
    files/          # Manual uploads
    generated/      # Auto-generated documents
    signed/         # Signed copies from SignWell

document-templates/
  {templateKey}.docx  # e.g., invitation_letter.docx
```

---

## 7. Security Considerations

### 7.1 Partner Role Isolation
- Partners CANNOT see: internal_notes, protek_communication_log, email_templates, automation_rules
- Partners CANNOT see: client pricing (monthly_salary_eur), company PIB/maticni_broj
- Partners CAN see: order requirements (position, count, source_country, start_date, skills)
- Partners CAN: submit candidates, upload CVs, view candidate status

### 7.2 RLS Policy Testing
```typescript
// __tests__/rls.test.ts -- test pattern
describe('Partner RLS', () => {
  it('partner cannot see orders from other agencies', async () => {
    const partnerClient = createClient(URL, KEY, {
      // Use partner user credentials
    });
    const { data } = await partnerClient.from('orders').select('*');
    expect(data?.every(o => o.partner_agency_id === PARTNER_AGENCY_ID)).toBe(true);
  });

  it('partner cannot access internal notes', async () => {
    const { data, error } = await partnerClient.from('internal_notes').select('*');
    expect(data).toEqual([]);
  });
});
```

### 7.3 Rate Limiting
- Edge functions: Supabase default rate limits (1000 req/min)
- Bulk operations: frontend limits batch size to 50 workers per request
- File uploads: max 10MB per file, max 20 files per batch upload

---

## 8. Testing Strategy

### 8.1 Test Levels

| Level | Tool | Coverage Target | What |
|-------|------|----------------|------|
| Unit | Vitest | Hooks, utils, query keys | Data transformation, validation |
| Component | Testing Library | Critical UI components | Form submission, state changes |
| Integration | Vitest + Supabase local | API hooks + RLS | Data fetching, permission enforcement |
| E2E | Playwright (Phase 5) | Critical flows | Order creation, pipeline progression |

### 8.2 Critical Test Paths
1. **Auth:** Login -> role detection -> correct redirect -> session refresh -> logout
2. **Order:** Create draft -> fill 4 steps -> submit -> verify reference number generated
3. **Pipeline:** Add worker -> change stage -> verify history recorded -> bulk change
4. **Documents:** Upload -> verify -> generate -> send for signing -> webhook status update
5. **CRM:** Create lead -> log activity -> create task -> convert to company
6. **Partner:** Login -> see assigned orders -> submit candidate -> check status
7. **RLS:** Client sees only own company data, partner sees only own agency orders

---

## 9. Performance Optimization

### 9.1 Query Optimization
- Add composite indexes for common filter combinations
- Use `.select()` with only needed columns (not `*`) for list views
- Implement cursor-based pagination for workers list (>100 records)
- Cache pipeline_stage_config with staleTime: Infinity (rarely changes)

### 9.2 Bundle Optimization
- Route-based code splitting (React.lazy for each page group)
- Tree-shake unused Radix UI components
- Preload critical routes on hover

### 9.3 Real-time Optimization
- Throttle real-time query invalidation (max 1 per second per channel)
- Use targeted invalidation (specific queryKey, not broad)

---

## 10. Migration Plan

### 10.1 Database Migrations (Ordered)

| # | Migration | Dependencies | Reversible |
|---|-----------|-------------|------------|
| 1 | Add `partner` to app_role enum | None | No (enum values can't be removed) |
| 2 | Create `partner_agencies` table | Migration 1 | Yes (DROP TABLE) |
| 3 | Add `partner_agency_id` to orders, profiles | Migration 2 | Yes (DROP COLUMN) |
| 4 | Create `leads` table + RLS | None | Yes |
| 5 | Create `lead_activities` table + RLS | Migration 4 | Yes |
| 6 | Create `tasks` table + RLS | None | Yes |
| 7 | Create `automation_rules` table + RLS | None | Yes |
| 8 | Add SLA fields to pipeline_stage_config | None | Yes |
| 9 | Add preferences to profiles | None | Yes |
| 10 | Create `get_user_partner_agency_id` function | Migration 2 | Yes |
| 11 | Partner RLS policies for orders, workers, storage | Migration 3, 10 | Yes |
| 12 | Create `check_sla_breaches` function + pg_cron | Migration 8 | Yes |
| 13 | Seed initial automation rules | Migration 7 | Yes |

### 10.2 Data Migration
- Seed existing leads from board meeting notes (manual, one-time)
- No existing data modifications required
- All changes are additive

### 10.3 Deployment Sequence
1. Run database migrations (Supabase dashboard or CLI)
2. Deploy new edge functions
3. Deploy frontend (Lovable or manual Vite build)
4. Configure pg_cron jobs
5. Seed lead data
6. Invite partner users

---

## 11. Monitoring & Observability

### 11.1 Current State
- Console.error logging only
- No structured logging, no metrics, no alerting

### 11.2 V2 Improvements
- Supabase Dashboard: monitor API usage, active connections, storage usage
- Edge function logs: Supabase log explorer for function errors
- SLA breach notifications serve as operational alerts
- Daily digest email serves as health check (if no email = system down)

### 11.3 Key Metrics to Track
- Active users per day (by role)
- Pipeline throughput (workers moved per day)
- Avg time per pipeline stage
- Edge function error rate
- Document generation success rate
- Email delivery rate
