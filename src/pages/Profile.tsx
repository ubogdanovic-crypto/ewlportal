import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Building2, Bell, Globe, Lock, Loader2 } from "lucide-react";

interface NotificationPreferences {
  order_status: boolean;
  worker_pipeline: boolean;
  document_signing: boolean;
  police_interview: boolean;
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, profile, role, updatePassword } = useAuth();
  const { toast } = useToast();

  // Company info state
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    order_status: true,
    worker_pipeline: true,
    document_signing: true,
    police_interview: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Language state
  const [language, setLanguage] = useState(i18n.language);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Load company info
  useEffect(() => {
    if (!profile?.company_id) {
      setCompanyLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, contact_person, contact_phone, address")
        .eq("id", profile.company_id!)
        .single();
      if (data) {
        setCompanyName(data.name || "");
        setContactPerson(data.contact_person || "");
        setContactPhone(data.contact_phone || "");
        setAddress(data.address || "");
      }
      setCompanyLoading(false);
    })();
  }, [profile?.company_id]);

  // Load notification preferences from profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", user.id)
        .single();
      if (data?.notification_preferences) {
        setNotifPrefs(data.notification_preferences as unknown as NotificationPreferences);
      }
    })();
  }, [user]);

  const saveCompany = async () => {
    if (!profile?.company_id) return;
    setCompanySaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: companyName.trim(),
        contact_person: contactPerson.trim(),
        contact_phone: contactPhone.trim(),
        address: address.trim(),
      })
      .eq("id", profile.company_id);
    setCompanySaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("profile.companySaved") });
    }
  };

  const saveNotifPrefs = async () => {
    if (!user) return;
    setNotifSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: notifPrefs as any })
      .eq("user_id", user.id);
    setNotifSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("profile.preferencesSaved") });
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: lang })
        .eq("user_id", user.id);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: t("auth.passwordMinLength"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("auth.passwordMismatch"), variant: "destructive" });
      return;
    }
    setPasswordSaving(true);
    const { error } = await updatePassword(newPassword);
    setPasswordSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.passwordUpdated") });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>

        {/* Company Info - only for client role */}
        {role === "client" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("profile.companyInfo")}
              </CardTitle>
              <CardDescription>{t("profile.companyInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {companyLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : profile?.company_id ? (
                <>
                  <div className="space-y-2">
                    <Label>{t("profile.companyName")}</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("profile.contactPerson")}</Label>
                    <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("profile.contactPhone")}</Label>
                    <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={50} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("profile.address")}</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
                  </div>
                  <Button onClick={saveCompany} disabled={companySaving}>
                    {companySaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("common.save")}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("profile.noCompany")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("profile.notificationPrefs")}
            </CardTitle>
            <CardDescription>{t("profile.notificationPrefsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              { key: "order_status", label: t("profile.notifOrderStatus") },
              { key: "worker_pipeline", label: t("profile.notifWorkerPipeline") },
              { key: "document_signing", label: t("profile.notifDocumentSigning") },
              { key: "police_interview", label: t("profile.notifPoliceInterview") },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="cursor-pointer">{label}</Label>
                <Switch
                  checked={notifPrefs[key]}
                  onCheckedChange={(checked) =>
                    setNotifPrefs((prev) => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
            <Button onClick={saveNotifPrefs} disabled={notifSaving}>
              {notifSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("profile.language")}
            </CardTitle>
            <CardDescription>{t("profile.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={language === "sr" ? "default" : "outline"}
                onClick={() => handleLanguageChange("sr")}
              >
                Srpski
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                onClick={() => handleLanguageChange("en")}
              >
                English
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t("profile.security")}
            </CardTitle>
            <CardDescription>{t("profile.securityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("auth.newPassword")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.confirmPassword")}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                maxLength={128}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={passwordSaving || !newPassword}>
              {passwordSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("profile.changePassword")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
