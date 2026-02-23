import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PipelineStageBadge, STAGE_ORDER } from "@/components/PipelineStage";
import { Search, Users } from "lucide-react";

export default function OpsWorkers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["ops-workers-all-list"],
    queryFn: async () => {
      const { data } = await supabase.from("workers").select("*, orders(reference_number, position_title), companies(name)").order("updated_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = workers.filter((w: any) => {
    if (stageFilter !== "all" && w.current_stage !== stageFilter) return false;
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return `${w.first_name} ${w.last_name}`.toLowerCase().includes(s) ||
        w.passport_number?.toLowerCase().includes(s) ||
        w.nationality?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("ops.allWorkers")}</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("common.search") + "..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder={t("ops.filterByStage")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.filterAll")}</SelectItem>
              {STAGE_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{t(`pipeline.${s}` as any)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.filterAll")}</SelectItem>
              <SelectItem value="active">{t("pipeline.status_active")}</SelectItem>
              <SelectItem value="rejected">{t("pipeline.status_rejected")}</SelectItem>
              <SelectItem value="withdrawn">{t("pipeline.status_withdrawn")}</SelectItem>
              <SelectItem value="completed">{t("pipeline.status_completed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pipeline.workerName")}</TableHead>
                  <TableHead>{t("pipeline.nationality")}</TableHead>
                  <TableHead>{t("ops.order")}</TableHead>
                  <TableHead>{t("ops.client")}</TableHead>
                  <TableHead>{t("pipeline.currentStage")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w: any) => (
                  <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/ops/workers/${w.id}`)}>
                    <TableCell className="font-medium">{w.first_name} {w.last_name}</TableCell>
                    <TableCell className="text-muted-foreground">{w.nationality || "—"}</TableCell>
                    <TableCell className="text-sm text-primary">{(w.orders as any)?.reference_number || "—"}</TableCell>
                    <TableCell className="text-sm">{(w.companies as any)?.name || "—"}</TableCell>
                    <TableCell><PipelineStageBadge stage={w.current_stage} size="sm" /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={w.status === "active" ? "bg-success/15 text-success border-success/30" : w.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-muted text-muted-foreground"}>
                        {t(`pipeline.status_${w.status}` as any)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                      <p className="text-muted-foreground">{t("common.noResults")}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
