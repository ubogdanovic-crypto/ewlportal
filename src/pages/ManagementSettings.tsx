import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, Bell, Users, ImageIcon } from "lucide-react";

export default function ManagementSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>
        </div>

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
      </div>
    </AppLayout>
  );
}
