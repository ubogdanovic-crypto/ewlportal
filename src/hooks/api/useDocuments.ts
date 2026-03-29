import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useWorkerDocuments(workerId: string) {
  return useQuery({
    queryKey: queryKeys.workers.documents(workerId),
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_documents")
        .select("*")
        .eq("worker_id", workerId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAllDocuments() {
  return useQuery({
    queryKey: ["ops-all-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_documents")
        .select("*, workers(first_name, last_name, company_id, order_id, companies(name), orders(reference_number))")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
