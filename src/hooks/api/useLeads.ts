import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useLeads(filters?: { status?: string; owner?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: async () => {
      let query = supabase.from("leads").select("*").order("updated_at", { ascending: false });
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.owner) query = query.eq("owner_id", filters.owner);
      if (filters?.search) query = query.ilike("company_name", `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: queryKeys.leads.activities(leadId),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
