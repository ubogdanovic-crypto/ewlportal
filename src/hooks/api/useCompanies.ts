import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useActiveCompanies() {
  return useQuery({
    queryKey: ["ops-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCompanyOrderCounts() {
  return useQuery({
    queryKey: ["ops-company-order-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("company_id, status");
      if (error) throw error;
      const counts: Record<string, { total: number; active: number }> = {};
      (data || []).forEach((o: any) => {
        if (!counts[o.company_id]) counts[o.company_id] = { total: 0, active: 0 };
        counts[o.company_id].total++;
        if (!["fulfilled", "cancelled", "draft"].includes(o.status))
          counts[o.company_id].active++;
      });
      return counts;
    },
  });
}
