import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, Bell, Users, ImageIcon, GitBranch, Mail, FileText } from "lucide-react";
import { PipelineStageConfig } from "@/components/settings/PipelineStageConfig";
import { EmailTemplateEditor } from "@/components/settings/EmailTemplateEditor";
import { DocumentTemplateManager } from "@/components/settings/DocumentTemplateManager";

export default function ManagementSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
              {t("settings.general")}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="text-xs sm:text-sm">
              <GitBranch className="h-4 w-4 mr-1 hidden sm:inline" />
              {t("settings.pipeline")}
            </TabsTrigger>
            <TabsTrigger value="emails" className="text-xs sm:text-sm">
              <Mail className="h-4 w-4 mr-1 hidden sm:inline" />
              {t("settings.emails")}
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
              {t("settings.documents")}
            </TabsTrigger>
          </TabsList>

          {/* General Tab - existing content */}
          <TabsContent value="general" className="space-y-6 mt-6">
            {/* Company Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Profile
                </CardTitle>
                <CardDescription>Manage your organization's public information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" defaultValue="EastWestLinks" placeholder="Company name" />
                </div>
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Upload Logo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Logo upload coming soon.</p>
                </div>
                <div className="flex justify-end">
                  <Button disabled>Save Changes</Button>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Default Notification Preferences
                </CardTitle>
                <CardDescription>Configure default notification settings for new users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Order Status Updates</p>
                    <p className="text-xs text-muted-foreground">Send email when order status changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Worker Pipeline Milestones</p>
                    <p className="text-xs text-muted-foreground">Send email at key pipeline stages</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Document Verification Alerts</p>
                    <p className="text-xs text-muted-foreground">Notify when documents are verified or rejected</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* User Management Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>Manage user accounts, roles, and access permissions.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/management/users")} variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Go to User Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Config Tab */}
          <TabsContent value="pipeline" className="mt-6">
            <PipelineStageConfig />
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="emails" className="mt-6">
            <EmailTemplateEditor />
          </TabsContent>

          {/* Document Templates Tab */}
          <TabsContent value="documents" className="mt-6">
            <DocumentTemplateManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
