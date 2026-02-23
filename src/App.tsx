import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ClientDashboard from "./pages/ClientDashboard";
import OpsDashboard from "./pages/OpsDashboard";
import ManagementDashboard from "./pages/ManagementDashboard";
import ManagementUsers from "./pages/ManagementUsers";
import ManagementReports from "./pages/ManagementReports";
import OrdersList from "./pages/OrdersList";
import NewOrder from "./pages/NewOrder";
import OrderDetail from "./pages/OrderDetail";
import CandidateReview from "./pages/CandidateReview";
import OpsClients from "./pages/OpsClients";
import OpsClientDetail from "./pages/OpsClientDetail";
import OpsOrders from "./pages/OpsOrders";
import OpsOrderDetail from "./pages/OpsOrderDetail";
import OpsWorkers from "./pages/OpsWorkers";
import OpsWorkerProfile from "./pages/OpsWorkerProfile";
import Notifications from "./pages/Notifications";
import ClientDocuments from "./pages/ClientDocuments";
import OpsInterviews from "./pages/OpsInterviews";
import OpsDocuments from "./pages/OpsDocuments";
import ManagementSettings from "./pages/ManagementSettings";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function RoleRedirect() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  switch (role) {
    case "ops": return <Navigate to="/ops" replace />;
    case "management": return <Navigate to="/management" replace />;
    default: return <Navigate to="/dashboard" replace />;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Role-based redirect */}
            <Route path="/" element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            } />

            {/* Client routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={["client"]}>
                <ClientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute allowedRoles={["client"]}>
                <OrdersList />
              </ProtectedRoute>
            } />
            <Route path="/orders/new" element={
              <ProtectedRoute allowedRoles={["client"]}>
                <NewOrder />
              </ProtectedRoute>
            } />
            <Route path="/orders/:id" element={
              <ProtectedRoute allowedRoles={["client"]}>
                <OrderDetail />
              </ProtectedRoute>
            } />
            <Route path="/candidates/:id/review" element={
              <ProtectedRoute allowedRoles={["client"]}>
                <CandidateReview />
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute allowedRoles={["client"]}>
                <ClientDocuments />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />

            <Route path="/ops" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/ops/clients" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsClients />
              </ProtectedRoute>
            } />
            <Route path="/ops/clients/:id" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsClientDetail />
              </ProtectedRoute>
            } />
            <Route path="/ops/orders" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsOrders />
              </ProtectedRoute>
            } />
            <Route path="/ops/orders/:id" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsOrderDetail />
              </ProtectedRoute>
            } />
            <Route path="/ops/workers" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsWorkers />
              </ProtectedRoute>
            } />
            <Route path="/ops/workers/:id" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsWorkerProfile />
              </ProtectedRoute>
            } />
            <Route path="/ops/interviews" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsInterviews />
              </ProtectedRoute>
            } />
            <Route path="/ops/documents" element={
              <ProtectedRoute allowedRoles={["ops", "management"]}>
                <OpsDocuments />
              </ProtectedRoute>
            } />

            {/* Management routes */}
            <Route path="/management" element={
              <ProtectedRoute allowedRoles={["management"]}>
                <ManagementDashboard />
              </ProtectedRoute>
            } />
            <Route path="/management/users" element={
              <ProtectedRoute allowedRoles={["management"]}>
                <ManagementUsers />
              </ProtectedRoute>
            } />
            <Route path="/management/reports" element={
              <ProtectedRoute allowedRoles={["management"]}>
                <ManagementReports />
              </ProtectedRoute>
            } />

            <Route path="/management/settings" element={
              <ProtectedRoute allowedRoles={["management"]}>
                <ManagementSettings />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
