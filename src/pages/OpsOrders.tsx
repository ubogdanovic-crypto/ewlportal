import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  sourcing: "bg-accent/15 text-accent border-accent/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  fulfilled: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function OpsOrders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filters = useUrlFilters({ status: "all" });
  const [search, setSearch] = useState(filters.get("q"));
  const debouncedSearch = useDebouncedValue(search, 300);
  const statusFilter = filters.get("status") || "all";
  const setStatusFilter = (v: string) => filters.set("status", v);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["ops-orders-all"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, companies(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: "orders.statusDraft", submitted: "orders.statusSubmitted", confirmed: "orders.statusConfirmed",
      sourcing: "orders.statusSourcing", in_progress: "orders.statusInProgress", fulfilled: "orders.statusFulfilled",
      cancelled: "orders.statusCancelled",
    };
    return t(map[status] || status);
  };

  const filtered = orders.filter((o: any) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      return o.position_title?.toLowerCase().includes(s) || o.reference_number?.toLowerCase().includes(s) || (o.companies as any)?.name?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("ops.allOrders")}</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("common.search") + "..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.filterAll")}</SelectItem>
              <SelectItem value="submitted">{t("orders.statusSubmitted")}</SelectItem>
              <SelectItem value="confirmed">{t("orders.statusConfirmed")}</SelectItem>
              <SelectItem value="sourcing">{t("orders.statusSourcing")}</SelectItem>
              <SelectItem value="in_progress">{t("orders.statusInProgress")}</SelectItem>
              <SelectItem value="fulfilled">{t("orders.statusFulfilled")}</SelectItem>
              <SelectItem value="cancelled">{t("orders.statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {filtered.map((order: any) => (
              <Card key={order.id} className="cursor-pointer" onClick={() => navigate(`/ops/orders/${order.id}`)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">{order.reference_number}</span>
                    <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>{statusLabel(order.status)}</Badge>
                  </div>
                  <p className="text-sm mt-1">{order.position_title}</p>
                  <p className="text-xs text-muted-foreground">{(order.companies as any)?.name || "—"} · {order.number_of_workers} workers · {order.source_country || "—"}</p>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground">{t("common.noResults")}</p>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.referenceNumber")}</TableHead>
                  <TableHead>{t("ops.client")}</TableHead>
                  <TableHead>{t("orders.position")}</TableHead>
                  <TableHead className="text-center">{t("orders.workers")}</TableHead>
                  <TableHead>{t("orders.sourceCountry")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("orders.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order: any) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/ops/orders/${order.id}`)}>
                    <TableCell className="font-medium text-primary">{order.reference_number}</TableCell>
                    <TableCell>{(order.companies as any)?.name || "—"}</TableCell>
                    <TableCell>{order.position_title}</TableCell>
                    <TableCell className="text-center">{order.number_of_workers}</TableCell>
                    <TableCell>{order.source_country || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>{statusLabel(order.status)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(order.created_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
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
    </AppLayout>
  );
}
