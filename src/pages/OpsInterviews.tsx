import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Loader2 } from "lucide-react";
import { PipelineStageBadge } from "@/components/PipelineStage";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const INTERVIEW_STAGES = [
  "interview_scheduled",
  "interview_completed",
] as const;

export default function OpsInterviews() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ops-interviews"],
    queryFn: async () => {
      const { data: workers, error } = await supabase
        .from("workers")
        .select("id, first_name, last_name, current_stage, updated_at, order_id, company_id, status")
        .in("current_stage", ["client_review", "interview_scheduled", "interview_completed"])
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      if (!workers?.length) return [];

      const orderIds = [...new Set(workers.map((w) => w.order_id))];
      const companyIds = [...new Set(workers.map((w) => w.company_id))];

      const [ordersRes, companiesRes] = await Promise.all([
        supabase.from("orders").select("id, reference_number").in("id", orderIds),
        supabase.from("companies").select("id, name").in("id", companyIds),
      ]);

      const orderMap = Object.fromEntries((ordersRes.data || []).map((o) => [o.id, o.reference_number]));
      const companyMap = Object.fromEntries((companiesRes.data || []).map((c) => [c.id, c.name]));

      return workers.map((w) => ({
        ...w,
        orderRef: orderMap[w.order_id] || "",
        companyName: companyMap[w.company_id] || "",
      }));
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ workerId, newStage }: { workerId: string; newStage: string }) => {
      const worker = interviews.find((w: any) => w.id === workerId);
      const fromStage = worker?.current_stage;

      const { error: workerErr } = await supabase
        .from("workers")
        .update({ current_stage: newStage as any })
        .eq("id", workerId);
      if (workerErr) throw workerErr;

      await supabase.from("pipeline_stage_history").insert({
        worker_id: workerId,
        from_stage: fromStage,
        to_stage: newStage as any,
        changed_by: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-interviews"] });
      toast({ title: "Stage updated", description: "Interview status has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const interviews = data || [];

  const stageBadgeVariant = (stage: string): "default" | "secondary" | "outline" => {
    if (stage === "interview_completed") return "default";
    if (stage === "interview_scheduled") return "secondary";
    return "outline";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.interviews")}</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !interviews.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <CalendarDays className="h-10 w-10" />
              <p>No candidates in interview stages.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Current Stage</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Update Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviews.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell
                        className="font-medium text-primary cursor-pointer hover:underline"
                        onClick={() => navigate(`/ops/workers/${w.id}`)}
                      >
                        {w.first_name} {w.last_name}
                      </TableCell>
                      <TableCell>{w.companyName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{w.orderRef}</TableCell>
                      <TableCell>
                        <PipelineStageBadge stage={w.current_stage} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(w.updated_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={w.current_stage}
                          onValueChange={(val) => updateStage.mutate({ workerId: w.id, newStage: val })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="client_review">Client Review</SelectItem>
                            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                            <SelectItem value="interview_completed">Interview Completed</SelectItem>
                            <SelectItem value="approved_by_client">Approved by Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
