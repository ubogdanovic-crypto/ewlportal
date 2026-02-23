import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ClipboardList } from "lucide-react";
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

type FilterType = "all" | "active" | "fulfilled" | "cancelled";

export default function OrdersList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", filter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "active") {
        query = query.in("status", ["submitted", "confirmed", "sourcing", "in_progress"]);
      } else if (filter === "fulfilled") {
        query = query.eq("status", "fulfilled");
      } else if (filter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const statusLabel = (status: string) => {
    const key = `orders.status${status.charAt(0).toUpperCase() + status.slice(1).replace("_", "")}` as any;
    // Map snake_case to camelCase for translation keys
    const map: Record<string, string> = {
      draft: "orders.statusDraft",
      submitted: "orders.statusSubmitted",
      confirmed: "orders.statusConfirmed",
      sourcing: "orders.statusSourcing",
      in_progress: "orders.statusInProgress",
      fulfilled: "orders.statusFulfilled",
      cancelled: "orders.statusCancelled",
    };
    return t(map[status] || status);
  };

  const filtered = orders.filter((o: any) =>
    !search || o.position_title?.toLowerCase().includes(search.toLowerCase()) ||
    o.reference_number?.toLowerCase().includes(search.toLowerCase())
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: t("orders.filterAll") },
    { key: "active", label: t("orders.filterActive") },
    { key: "fulfilled", label: t("orders.filterFulfilled") },
    { key: "cancelled", label: t("orders.filterCancelled") },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("orders.title")}</h1>
          <Button onClick={() => navigate("/orders/new")} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            {t("orders.placeNewOrder")}
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1">
            {filters.map((f) => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search") + "..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t("orders.noOrders")}</p>
              <p className="text-sm text-muted-foreground">{t("orders.startFirstOrder")}</p>
              <Button onClick={() => navigate("/orders/new")} className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" />
                {t("orders.placeNewOrder")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.referenceNumber")}</TableHead>
                  <TableHead>{t("orders.position")}</TableHead>
                  <TableHead className="text-center">{t("orders.workers")}</TableHead>
                  <TableHead>{t("orders.sourceCountry")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("orders.createdAt")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium text-primary">{order.reference_number}</TableCell>
                    <TableCell>{order.position_title}</TableCell>
                    <TableCell className="text-center">{order.number_of_workers}</TableCell>
                    <TableCell>{order.source_country || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">{t("common.viewDetails")}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
