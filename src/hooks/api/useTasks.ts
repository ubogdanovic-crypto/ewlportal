import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useMyTasks(userId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.mine(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", userId)
        .in("status", ["todo", "in_progress"])
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllTasks(filters?: { status?: string; assignee?: string; entity_type?: string; entity_id?: string }) {
  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: async () => {
      let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.assignee) query = query.eq("assigned_to", filters.assignee);
      if (filters?.entity_type && filters?.entity_id) {
        query = query.eq("entity_type", filters.entity_type).eq("entity_id", filters.entity_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useEntityTasks(entityType: string, entityId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byEntity(entityType, entityId),
    enabled: !!entityType && !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
