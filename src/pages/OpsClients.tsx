import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building2, Eye } from "lucide-react";

export default function OpsClients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["ops-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").order("name");
      return data || [];
    },
  });

  // Get order counts per company
  const { data: orderCounts = {} } = useQuery({
    queryKey: ["ops-company-order-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("company_id, status");
      const counts: Record<string, { total: number; active: number }> = {};
      (data || []).forEach((o: any) => {
        if (!counts[o.company_id]) counts[o.company_id] = { total: 0, active: 0 };
        counts[o.company_id].total++;
        if (!["fulfilled", "cancelled", "draft"].includes(o.status)) counts[o.company_id].active++;
      });
      return counts;
    },
  });

  const filtered = companies.filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("ops.allClients")}</h1>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("common.search") + "..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ops.companyName")}</TableHead>
                  <TableHead>{t("ops.city")}</TableHead>
                  <TableHead>{t("ops.contactPerson")}</TableHead>
                  <TableHead className="text-center">{t("ops.totalOrders")}</TableHead>
                  <TableHead className="text-center">{t("ops.activeOrders")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((company: any) => {
                  const counts = (orderCounts as any)[company.id] || { total: 0, active: 0 };
                  return (
                    <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/ops/clients/${company.id}`)}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company.city || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{company.contact_person || "—"}</TableCell>
                      <TableCell className="text-center">{counts.total}</TableCell>
                      <TableCell className="text-center font-medium">{counts.active}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={company.is_active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                          {company.is_active ? t("ops.statusActive") : t("ops.statusInactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
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
