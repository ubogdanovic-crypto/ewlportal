export const queryKeys = {
  workers: {
    all: ["workers"] as const,
    list: (filters?: Record<string, unknown>) => ["workers", "list", filters] as const,
    detail: (id: string) => ["workers", "detail", id] as const,
    documents: (workerId: string) => ["workers", "documents", workerId] as const,
    history: (workerId: string) => ["workers", "history", workerId] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (filters?: Record<string, unknown>) => ["orders", "list", filters] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
    byCompany: (companyId: string) => ["orders", "company", companyId] as const,
  },
  companies: {
    all: ["companies"] as const,
    detail: (id: string) => ["companies", "detail", id] as const,
  },
  leads: {
    all: ["leads"] as const,
    list: (filters?: Record<string, unknown>) => ["leads", "list", filters] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
    activities: (leadId: string) => ["leads", "activities", leadId] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    mine: (userId: string) => ["tasks", "mine", userId] as const,
    byEntity: (type: string, id: string) => ["tasks", "entity", type, id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    unread: ["notifications", "unread"] as const,
  },
  partner: {
    orders: (agencyId: string) => ["partner", "orders", agencyId] as const,
    candidates: (orderId: string) => ["partner", "candidates", orderId] as const,
  },
  config: {
    pipelineStages: ["config", "pipeline-stages"] as const,
    emailTemplates: ["config", "email-templates"] as const,
  },
} as const;
