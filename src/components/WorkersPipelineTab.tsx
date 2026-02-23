import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PipelineStageBadge } from "@/components/PipelineStage";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WorkersPipelineTabProps {
  orderId: string;
  companyId?: string;
}

export function WorkersPipelineTab({ orderId, companyId }: WorkersPipelineTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", nationality: "", passportNumber: "", dateOfBirth: "", position: "" });

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

  const handleAddWorker = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !companyId) {
      toast.error(t("pipeline.nameRequired"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("workers").insert({
      order_id: orderId,
      company_id: companyId,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      nationality: form.nationality.trim() || null,
      passport_number: form.passportNumber.trim() || null,
      date_of_birth: form.dateOfBirth || null,
      current_stage: "sourcing" as const,
      status: "active" as const,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("pipeline.workerAdded"));
      setForm({ firstName: "", lastName: "", nationality: "", passportNumber: "", dateOfBirth: "", position: "" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order-workers", orderId] });
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-success/15 text-success border-success/30",
      rejected: "bg-destructive/15 text-destructive border-destructive/30",
      withdrawn: "bg-muted text-muted-foreground",
      completed: "bg-primary/15 text-primary border-primary/30",
    };
    return <Badge variant="outline" className={colors[status] || ""}>{t(`pipeline.status_${status}` as any)}</Badge>;
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary + Add button */}
      <Card>
        <CardContent className="pt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {workers.filter(w => w.status === 'active').length} {t("pipeline.activeWorkers")} · {workers.filter(w => w.status === 'rejected').length} {t("pipeline.rejected")}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("pipeline.addWorker")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("pipeline.addWorker")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("pipeline.firstName")} *</Label>
                    <Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("pipeline.lastName")} *</Label>
                    <Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} maxLength={100} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("pipeline.nationality")}</Label>
                  <Input value={form.nationality} onChange={(e) => setForm(f => ({ ...f, nationality: e.target.value }))} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>{t("pipeline.passportNumber")}</Label>
                  <Input value={form.passportNumber} onChange={(e) => setForm(f => ({ ...f, passportNumber: e.target.value }))} maxLength={50} />
                </div>
                <div className="space-y-2">
                  <Label>{t("pipeline.dateOfBirth")}</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                </div>
                <Button onClick={handleAddWorker} disabled={saving || !form.firstName.trim() || !form.lastName.trim()} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("pipeline.addWorker")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {workers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("orders.noWorkersYet")}</p>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
