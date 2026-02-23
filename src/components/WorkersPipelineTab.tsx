import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PipelineStageBadge, PipelineProgress } from "@/components/PipelineStage";
import { Badge } from "@/components/ui/badge";
import { Users, Eye } from "lucide-react";

interface WorkersPipelineTabProps {
  orderId: string;
}

export function WorkersPipelineTab({ orderId }: WorkersPipelineTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["order-workers", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  if (workers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t("orders.noWorkersYet")}</p>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-success/15 text-success border-success/30",
      rejected: "bg-destructive/15 text-destructive border-destructive/30",
      withdrawn: "bg-muted text-muted-foreground",
      completed: "bg-primary/15 text-primary border-primary/30",
    };
    return <Badge variant="outline" className={colors[status] || ""}>{t(`pipeline.status_${status}` as any)}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground mb-2">
            {workers.filter(w => w.status === 'active').length} {t("pipeline.activeWorkers")} · {workers.filter(w => w.status === 'rejected').length} {t("pipeline.rejected")}
          </div>
        </CardContent>
      </Card>

      {/* Workers table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("pipeline.workerName")}</TableHead>
              <TableHead>{t("pipeline.nationality")}</TableHead>
              <TableHead>{t("pipeline.currentStage")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker: any) => (
              <TableRow key={worker.id}>
                <TableCell className="font-medium">
                  {worker.first_name} {worker.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{worker.nationality || "—"}</TableCell>
                <TableCell>
                  <PipelineStageBadge stage={worker.current_stage} size="sm" />
                </TableCell>
                <TableCell>{statusBadge(worker.status)}</TableCell>
                <TableCell>
                  {worker.current_stage === "client_review" && worker.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/candidates/${worker.id}/review`)}
                      className="text-accent border-accent/30 hover:bg-accent/10"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {t("pipeline.review")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
