import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, UserCog, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ROLES = ["client", "ops", "management"] as const;

export default function ManagementUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editUser, setEditUser] = useState<any>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["mgmt-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: companies } = await supabase.from("companies").select("id, name");

      const companyMap = Object.fromEntries((companies || []).map((c: any) => [c.id, c.name]));
      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      return (profiles || []).map((p: any) => ({
        ...p,
        role: roleMap[p.user_id] || "client",
        company_name: p.company_id ? companyMap[p.company_id] || "—" : "—",
      }));
    },
  });

  const filtered = users.filter((u: any) => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleEditRole = (user: any) => {
    setEditUser(user);
    setEditRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!editUser || editRole === editUser.role) { setEditUser(null); return; }
    setSaving(true);

    // Delete existing role
    await supabase.from("user_roles").delete().eq("user_id", editUser.user_id);
    // Insert new role
    const { error } = await supabase.from("user_roles").insert({
      user_id: editUser.user_id,
      role: editRole as any,
    });

    if (error) toast.error(error.message);
    else toast.success(t("mgmt.roleUpdated" as any));

    setSaving(false);
    setEditUser(null);
    queryClient.invalidateQueries({ queryKey: ["mgmt-users"] });
  };

  const handleToggleActive = async (user: any) => {
    await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
    queryClient.invalidateQueries({ queryKey: ["mgmt-users"] });
    toast.success(t("ops.statusUpdated"));
  };

  const ROLE_COLORS: Record<string, string> = {
    client: "bg-primary/15 text-primary border-primary/30",
    ops: "bg-accent/15 text-accent-foreground border-accent/30",
    management: "bg-success/15 text-success border-success/30",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            {t("mgmt.userManagement" as any)}
          </h1>
          <Badge variant="secondary">{filtered.length} {t("mgmt.totalUsers" as any).toLowerCase()}</Badge>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{t(`mgmt.role_${r}` as any)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pipeline.fullName")}</TableHead>
                    <TableHead>{t("pipeline.email")}</TableHead>
                    <TableHead>{t("mgmt.role" as any)}</TableHead>
                    <TableHead>{t("mgmt.company" as any)}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_COLORS[user.role] || ""}>
                          {t(`mgmt.role_${user.role}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{user.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.is_active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                          {user.is_active ? t("ops.statusActive") : t("ops.statusInactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEditRole(user)}>
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleToggleActive(user)}>
                            {user.is_active ? t("mgmt.deactivate" as any) : t("mgmt.activate" as any)}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("common.noResults")}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit role dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mgmt.changeRole" as any)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{editUser?.full_name || editUser?.email}</p>
            <Label>{t("mgmt.role" as any)}</Label>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{t(`mgmt.role_${r}` as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
