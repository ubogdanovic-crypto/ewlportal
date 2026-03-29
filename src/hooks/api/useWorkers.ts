import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useWorkersList() {
  return useQuery({
    queryKey: ["ops-workers-all-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*, orders(reference_number, position_title), companies(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useWorker(id: string) {
  return useQuery({
    queryKey: queryKeys.workers.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*, orders(reference_number, position_title), companies(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkerHistory(workerId: string) {
  return useQuery({
    queryKey: queryKeys.workers.history(workerId),
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stage_history")
        .select("*")
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useWorkersByOrder(orderId: string) {
  return useQuery({
    queryKey: ["order-workers", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useWorkersByCompany(companyId: string) {
  return useQuery({
    queryKey: ["company-workers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useActiveWorkers() {
  return useQuery({
    queryKey: ["ops-workers-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
  });
}
