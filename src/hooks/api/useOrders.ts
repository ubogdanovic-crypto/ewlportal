import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useOrdersList() {
  return useQuery({
    queryKey: ["ops-orders-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, companies(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useClientOrders(filter: "all" | "active" | "fulfilled" | "cancelled" = "all") {
  return useQuery({
    queryKey: ["orders", filter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "active") {
        query = query.in("status", ["submitted", "confirmed", "sourcing", "in_progress"]);
      } else if (filter === "fulfilled") {
        query = query.eq("status", "fulfilled");
      } else if (filter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useOrdersByCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.orders.byCompany(companyId),
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
