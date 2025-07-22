import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import StartTrialPage from './pages/auth/StartTrialPage';
import EmailConfirmationPage from './pages/auth/EmailConfirmationPage';
import TestEmailConfirmation from './pages/auth/TestEmailConfirmation';
import SubscriptionRequiredPage from './pages/auth/SubscriptionRequiredPage';
import AccessRestrictedPage from './pages/auth/AccessRestrictedPage';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import PropertiesPage from './pages/properties/PropertiesPage';
import PropertyDetailPage from './pages/properties/PropertyDetailPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import TemplateDetailPage from './pages/templates/TemplateDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import ReportDetailPage from './pages/reports/ReportDetailPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import SubscriptionPage from './pages/admin/SubscriptionPage';
import InspectionPage from './pages/inspections/InspectionPage';
import StartInspectionPage from './pages/inspections/StartInspectionPage';
import LandingPage from './pages/marketing/LandingPage';

// Auth Guard Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, isDevMode, requiresPayment, isTrialExpired, isAdmin, needsPaymentSetup } = useAuthStore();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated && !isDevMode) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && !isDevMode) {
    const currentPath = window.location.pathname;

    // Rule 1: If user is trialing and needs to complete payment setup (customer_id is NULL)
    // AND they are not already on the /start-trial page
    if (needsPaymentSetup && currentPath !== '/start-trial') {
      return <Navigate to="/start-trial" replace />;
    }

    // Rule 2: If user's trial has expired OR their subscription is in a state requiring payment (e.g., canceled, past_due)
    // AND they are not already on the /subscription-required or /access-restricted pages
    if (requiresPayment && currentPath !== '/subscription-required' && currentPath !== '/access-restricted') {
      if (isAdmin) {
        return <Navigate to="/subscription-required" replace />;
      } else {
        return <Navigate to="/access-restricted" replace />;
      }
    }
  }
  
  return <>{children}</>;
};

// Admin Guard Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading, isDevMode, requiresPayment, isAuthenticated } = useAuthStore();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated && !isDevMode) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin && !isDevMode) {
    return <Navigate to="/access-restricted" replace />;
  }

  // Check if user needs to complete payment setup
  if (requiresPayment && !isDevMode) {
    return <Navigate to="/subscription-required" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { initialize, loading } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <>
      <Router>
        <Routes>
          {/* Marketing pages */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Debug route */}
          <Route path="/debug/email" element={<TestEmailConfirmation />} />
          
          {/* Subscription required page */}
          <Route path="/subscription-required" element={<SubscriptionRequiredPage />} />
          
          {/* Access restricted page for non-admin members */}
          <Route path="/access-restricted" element={<AccessRestrictedPage />} />
          
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route 
              path="/start-trial" 
              element={
                <ProtectedRoute>
                  <StartTrialPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/auth/confirm-email" element={<EmailConfirmationPage />} />
          </Route>

          {/* Add the auth callback route */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          {/* Start inspection route (outside dashboard layout) */}
          <Route 
            path="/start-inspection/:propertyId" 
            element={
              <ProtectedRoute>
                <StartInspectionPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected dashboard routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="properties/:id" element={<PropertyDetailPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="templates/:id" element={<TemplateDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:id" element={<ReportDetailPage />} />
            <Route path="inspections/:id" element={<InspectionPage />} />
            
            {/* Admin routes */}
            <Route 
              path="admin/settings" 
              element={
                <AdminRoute>
                  <AdminSettingsPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="admin/users" 
              element={
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="admin/subscription" 
              element={
                <AdminRoute>
                  <SubscriptionPage />
                </AdminRoute>
              } 
            />
          </Route>
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/\" replace />} />
        </Routes>
      </Router>
      
      <Toaster position="top-right" />
    </>
  );
}

export default App;