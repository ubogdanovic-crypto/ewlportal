import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTasks, useAllTasks } from "@/hooks/api/useTasks";
import { queryKeys } from "@/lib/queryKeys";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isPast, isThisWeek, parseISO } from "date-fns";

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "",
  high: "text-warning",
  urgent: "text-destructive font-medium",
};

export default function TasksPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const isOpsOrMgmt = role === "ops" || role === "management";

  const { data: myTasks = [], isLoading: loadingMine } = useMyTasks(user?.id || "");
  const { data: allTasks = [], isLoading: loadingAll } = useAllTasks();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", priority: "normal", due_date: "",
    entity_type: "general", entity_id: "",
  });

  const handleCreate = async () => {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      due_date: form.due_date || null,
      entity_type: form.entity_type !== "general" ? form.entity_type : null,
      assigned_to: user.id,
      created_by: user.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("tasks.taskCreated"));
    setForm({ title: "", description: "", priority: "normal", due_date: "", entity_type: "general", entity_id: "" });
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine(user.id) });
  };

  const toggleTask = async (task: any) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    const updates: any = { status: newStatus };
    if (newStatus === "done") {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user?.id;
    } else {
      updates.completed_at = null;
      updates.completed_by = null;
    }
    const { error } = await supabase.from("tasks").update(updates).eq("id", task.id);
    if (error) toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    if (user) queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine(user.id) });
  };

  const categorize = (tasks: any[]) => {
    const overdue: any[] = [];
    const today: any[] = [];
    const thisWeek: any[] = [];
    const later: any[] = [];
    const done: any[] = [];

    for (const task of tasks) {
      if (task.status === "done") { done.push(task); continue; }
      if (!task.due_date) { later.push(task); continue; }
      const d = parseISO(task.due_date);
      if (isPast(d) && !isToday(d)) overdue.push(task);
      else if (isToday(d)) today.push(task);
      else if (isThisWeek(d)) thisWeek.push(task);
      else later.push(task);
    }
    return { overdue, today, thisWeek, later, done };
  };

  const renderTaskList = (tasks: any[], label: string, icon: React.ReactNode) => {
    if (tasks.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon} {label} ({tasks.length})
        </div>
        {tasks.map((task: any) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 border rounded-lg ${task.status === "done" ? "opacity-60" : ""}`}
          >
            <Checkbox
              checked={task.status === "done"}
              onCheckedChange={() => toggleTask(task)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${task.status === "done" ? "line-through text-muted-foreground" : PRIORITY_COLORS[task.priority]}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {task.due_date && (
                  <span className={isPast(parseISO(task.due_date)) && task.status !== "done" ? "text-destructive font-medium" : ""}>
                    {format(parseISO(task.due_date), "MMM d")}
                  </span>
                )}
                {task.priority !== "normal" && (
                  <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                    {t(`tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` as any)}
                  </Badge>
                )}
                {task.entity_type && (
                  <Badge variant="secondary" className="text-xs">{task.entity_type}</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const myCategories = categorize(myTasks);
  const allCategories = categorize(allTasks);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("tasks.title")}</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("tasks.newTask")}
          </Button>
        </div>

        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">
              {t("tasks.myTasks")}
              {myCategories.overdue.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">{myCategories.overdue.length}</Badge>
              )}
            </TabsTrigger>
            {isOpsOrMgmt && <TabsTrigger value="all">{t("tasks.allTasks")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="mine" className="space-y-4 mt-4">
            {loadingMine ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : myTasks.filter((t: any) => t.status !== "done").length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success/40" />
                  <p className="text-muted-foreground">{t("tasks.allCaughtUp")}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4 space-y-6">
                  {renderTaskList(myCategories.overdue, t("tasks.overdue"), <AlertTriangle className="h-4 w-4 text-destructive" />)}
                  {renderTaskList(myCategories.today, t("tasks.today"), <Clock className="h-4 w-4 text-primary" />)}
                  {renderTaskList(myCategories.thisWeek, t("tasks.thisWeek"), <Clock className="h-4 w-4 text-muted-foreground" />)}
                  {renderTaskList(myCategories.later, t("tasks.later"), <Clock className="h-4 w-4 text-muted-foreground" />)}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isOpsOrMgmt && (
            <TabsContent value="all" className="space-y-4 mt-4">
              {loadingAll ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <Card>
                  <CardContent className="pt-4 space-y-6">
                    {renderTaskList(allCategories.overdue, t("tasks.overdue"), <AlertTriangle className="h-4 w-4 text-destructive" />)}
                    {renderTaskList(allCategories.today, t("tasks.today"), <Clock className="h-4 w-4 text-primary" />)}
                    {renderTaskList(allCategories.thisWeek, t("tasks.thisWeek"), <Clock className="h-4 w-4 text-muted-foreground" />)}
                    {renderTaskList(allCategories.later, t("tasks.later"), <Clock className="h-4 w-4 text-muted-foreground" />)}
                    {renderTaskList(allCategories.done, t("tasks.completed"), <CheckCircle2 className="h-4 w-4 text-success" />)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* New Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tasks.newTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("tasks.title")} *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("tasks.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("tasks.priority")}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("tasks.priorityLow")}</SelectItem>
                    <SelectItem value="normal">{t("tasks.priorityNormal")}</SelectItem>
                    <SelectItem value="high">{t("tasks.priorityHigh")}</SelectItem>
                    <SelectItem value="urgent">{t("tasks.priorityUrgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("tasks.dueDate")}</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
