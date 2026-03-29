import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTasks } from "@/hooks/api/useTasks";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, AlertTriangle, ArrowRight } from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-warning",
  urgent: "text-destructive font-medium",
};

export function MyTasksWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: tasks = [] } = useMyTasks(user?.id || "");

  const overdue = tasks.filter((t: any) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
  const today = tasks.filter((t: any) => t.due_date && isToday(parseISO(t.due_date)));
  const upcoming = tasks.filter((t: any) => !t.due_date || (!isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))));
  const display = [...overdue, ...today, ...upcoming].slice(0, 5);

  const toggleDone = async (taskId: string) => {
    await supabase.from("tasks").update({
      status: "done",
      completed_at: new Date().toISOString(),
      completed_by: user?.id,
    }).eq("id", taskId);
    if (user) queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine(user.id) });
  };

  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            {t("tasks.myTasks")}
            {overdue.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">{overdue.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")} className="text-xs">
            {t("common.viewDetails")} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {display.map((task: any) => {
          const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
          return (
            <div key={task.id} className="flex items-start gap-2.5 py-1.5">
              <Checkbox
                className="mt-0.5"
                onCheckedChange={() => toggleDone(task.id)}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-tight ${PRIORITY_COLORS[task.priority] || ""}`}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className={`text-xs mt-0.5 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                    {format(parseISO(task.due_date), "MMM d")}
                    {isOverdue && " — overdue"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {tasks.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{tasks.length - 5} more
          </p>
        )}
      </CardContent>
    </Card>
  );
}
