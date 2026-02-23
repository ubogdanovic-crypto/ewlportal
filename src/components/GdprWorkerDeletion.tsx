import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2 } from "lucide-react";

interface GdprWorkerDeletionProps {
  workerId: string;
  workerName: string;
}

export function GdprWorkerDeletion({ workerId, workerName }: GdprWorkerDeletionProps) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (role !== "management") return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete related data first
      await supabase.from("pipeline_stage_history").delete().eq("worker_id", workerId);
      await supabase.from("worker_documents").delete().eq("worker_id", workerId);
      await supabase.from("internal_notes").delete().eq("entity_type", "worker").eq("entity_id", workerId);

      // Delete worker
      const { error } = await supabase.from("workers").delete().eq("id", workerId);
      if (error) throw error;

      toast.success(t("gdpr.workerDeleted" as any));
      navigate("/ops/workers");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="h-4 w-4" />
          {t("gdpr.deleteWorkerData" as any)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("gdpr.deleteTitle" as any)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("gdpr.deleteWarning" as any, { name: workerName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("gdpr.typeToConfirm" as any)} <strong>DELETE</strong>
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            {t("gdpr.confirmDelete" as any)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
