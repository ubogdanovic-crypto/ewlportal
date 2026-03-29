import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PipelineStageBadge, STAGE_ORDER } from "@/components/PipelineStage";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { Search, Users, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OpsWorkers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const filters = useUrlFilters({ stage: "all", status: "all" });
  const [search, setSearch] = useState(filters.get("q"));
  const debouncedSearch = useDebouncedValue(search, 300);
  const stageFilter = filters.get("stage") || "all";
  const statusFilter = filters.get("status") || "all";
  const setStageFilter = (v: string) => filters.set("stage", v);
  const setStatusFilter = (v: string) => filters.set("status", v);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkStage, setBulkStage] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

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
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      return `${w.first_name} ${w.last_name}`.toLowerCase().includes(s) ||
        w.passport_number?.toLowerCase().includes(s) ||
        w.nationality?.toLowerCase().includes(s);
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((w: any) => w.id)));
    }
  };

  const handleBulkStageChange = async () => {
    if (!bulkStage || selected.size === 0 || !user) return;
    setBulkSaving(true);

    const workerIds = Array.from(selected);

    // Get current stages for history
    const selectedWorkers = workers.filter((w: any) => selected.has(w.id));

    // Update all workers
    const { error: updateError } = await supabase
      .from("workers")
      .update({ current_stage: bulkStage as any })
      .in("id", workerIds);

    if (updateError) {
      toast.error(updateError.message);
      setBulkSaving(false);
      return;
    }

    // Insert history records
    const historyRecords = selectedWorkers.map((w: any) => ({
      worker_id: w.id,
      from_stage: w.current_stage,
      to_stage: bulkStage,
      changed_by: user.id,
      notes: bulkNote.trim() || `Bulk stage change (${workerIds.length} workers)`,
    }));

    await supabase.from("pipeline_stage_history").insert(historyRecords);

    setBulkSaving(false);
    toast.success(`${workerIds.length} workers moved to ${bulkStage.replace(/_/g, " ")}`);
    setSelected(new Set());
    setBulkDialogOpen(false);
    setBulkStage("");
    setBulkNote("");
    queryClient.invalidateQueries({ queryKey: ["ops-workers-all-list"] });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("ops.allWorkers")}</h1>
          <Button onClick={() => navigate("/ops/orders")} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("pipeline.addWorker")}
          </Button>
        </div>

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
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {filtered.map((w: any) => (
                <Card key={w.id} className="cursor-pointer" onClick={() => navigate(`/ops/workers/${w.id}`)}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(w.id)}
                      onCheckedChange={() => toggleSelect(w.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{w.first_name} {w.last_name}</p>
                      <p className="text-xs text-muted-foreground">{w.nationality || "—"} · {(w.companies as any)?.name || "—"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <PipelineStageBadge stage={w.current_stage} size="sm" />
                        <Badge variant="outline" className={`text-xs ${w.status === "active" ? "bg-success/15 text-success border-success/30" : w.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-muted text-muted-foreground"}`}>
                          {t(`pipeline.status_${w.status}` as any)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground">{t("common.noResults")}</p>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
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
                  <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(w.id)}
                        onCheckedChange={() => toggleSelect(w.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium" onClick={() => navigate(`/ops/workers/${w.id}`)}>
                      {w.first_name} {w.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground" onClick={() => navigate(`/ops/workers/${w.id}`)}>{w.nationality || "—"}</TableCell>
                    <TableCell className="text-sm text-primary" onClick={() => navigate(`/ops/workers/${w.id}`)}>{(w.orders as any)?.reference_number || "—"}</TableCell>
                    <TableCell className="text-sm" onClick={() => navigate(`/ops/workers/${w.id}`)}>{(w.companies as any)?.name || "—"}</TableCell>
                    <TableCell onClick={() => navigate(`/ops/workers/${w.id}`)}><PipelineStageBadge stage={w.current_stage} size="sm" /></TableCell>
                    <TableCell onClick={() => navigate(`/ops/workers/${w.id}`)}>
                      <Badge variant="outline" className={w.status === "active" ? "bg-success/15 text-success border-success/30" : w.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-muted text-muted-foreground"}>
                        {t(`pipeline.status_${w.status}` as any)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                      <p className="text-muted-foreground">{t("common.noResults")}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          </>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: "Move Stage",
            icon: <ArrowRight className="h-4 w-4 mr-1" />,
            onClick: () => setBulkDialogOpen(true),
          },
        ]}
      />

      {/* Bulk Stage Change Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selected.size} Workers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Target Stage</Label>
              <Select value={bulkStage} onValueChange={setBulkStage}>
                <SelectTrigger><SelectValue placeholder="Select stage..." /></SelectTrigger>
                <SelectContent>
                  {STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{t(`pipeline.${s}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Reason for stage change..."
                rows={2}
                maxLength={300}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Workers: {workers.filter((w: any) => selected.has(w.id)).map((w: any) => `${w.first_name} ${w.last_name}`).join(", ")}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleBulkStageChange} disabled={bulkSaving || !bulkStage}>
              {bulkSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move {selected.size} Workers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
