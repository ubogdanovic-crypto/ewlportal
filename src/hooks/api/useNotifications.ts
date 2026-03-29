import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useNotifications(userId: string | undefined, role: string | null) {
  return useQuery({
    queryKey: ["notifications-inbox", userId, role],
    enabled: !!userId,
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (role === "client") {
        query = query.eq("recipient_user_id", userId!);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useInternalNotes(entityType: string, entityId: string) {
  return useQuery({
    queryKey: [`ops-${entityType}-notes`, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_notes")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProtekLog(orderId: string) {
  return useQuery({
    queryKey: ["ops-order-protek", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protek_communication_log")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
