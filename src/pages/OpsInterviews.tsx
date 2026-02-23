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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowUpDown, CalendarDays, CalendarIcon, Loader2 } from "lucide-react";
import { PipelineStageBadge } from "@/components/PipelineStage";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const INTERVIEW_STAGES = [
  "interview_scheduled",
  "interview_completed",
] as const;

export default function OpsInterviews() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data, isLoading } = useQuery({
    queryKey: ["ops-interviews"],
    queryFn: async () => {
      const { data: workers, error } = await supabase
        .from("workers")
        .select("id, first_name, last_name, current_stage, updated_at, order_id, company_id, status, interview_date")
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

  const updateInterviewDate = useMutation({
    mutationFn: async ({ workerId, date }: { workerId: string; date: Date | undefined }) => {
      const { error } = await supabase
        .from("workers")
        .update({ interview_date: date ? format(date, "yyyy-MM-dd") : null } as any)
        .eq("id", workerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-interviews"] });
      toast({ title: "Date updated", description: "Interview date has been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const interviews = data || [];

  const filteredInterviews = interviews
    .filter((w: any) => stageFilter === "all" || w.current_stage === stageFilter)
    .sort((a: any, b: any) => {
      const dateA = a.interview_date ? new Date(a.interview_date).getTime() : (sortDir === "asc" ? Infinity : -Infinity);
      const dateB = b.interview_date ? new Date(b.interview_date).getTime() : (sortDir === "asc" ? Infinity : -Infinity);
      return sortDir === "asc" ? dateA - dateB : dateB - dateA;
    });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.interviews")}</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="client_review">Client Review</SelectItem>
              <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
              <SelectItem value="interview_completed">Interview Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="gap-1.5"
          >
            <ArrowUpDown className="h-4 w-4" />
            Date {sortDir === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !filteredInterviews.length ? (
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
                    <TableHead>Interview Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Update Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterviews.map((w: any) => (
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
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[160px] justify-start text-left font-normal text-sm",
                                !w.interview_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {w.interview_date
                                ? format(new Date(w.interview_date), "dd MMM yyyy")
                                : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={w.interview_date ? new Date(w.interview_date) : undefined}
                              onSelect={(date) =>
                                updateInterviewDate.mutate({ workerId: w.id, date })
                              }
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
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
