import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, FileText, Bell, Settings } from "lucide-react";

const WELCOME_KEY = "ewl-welcome-dismissed";

export function ClientWelcomeDialog() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (role !== "client") return;
    const dismissed = localStorage.getItem(WELCOME_KEY);
    if (!dismissed) setOpen(true);
  }, [role]);

  const handleDismiss = () => {
    localStorage.setItem(WELCOME_KEY, "true");
    setOpen(false);
  };

  const handleStartOrder = () => {
    handleDismiss();
    navigate("/orders/new");
  };

  if (role !== "client") return null;

  const features = [
    { icon: ClipboardList, label: t("welcome.featureOrders" as any) },
    { icon: FileText, label: t("welcome.featureDocs" as any) },
    { icon: Bell, label: t("welcome.featureNotifications" as any) },
    { icon: Settings, label: t("welcome.featureProfile" as any) },
  ];

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t("welcome.title" as any)} {profile?.full_name || ""}! 👋
          </DialogTitle>
          <DialogDescription>
            {t("welcome.subtitle" as any)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {features.map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            {t("welcome.exploreLater" as any)}
          </Button>
          <Button onClick={handleStartOrder}>
            {t("welcome.placeFirstOrder" as any)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
