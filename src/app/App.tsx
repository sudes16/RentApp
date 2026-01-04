import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Layout } from './components/Layout';
import { OwnerDashboard } from './components/OwnerDashboard';
import { TenantDashboard } from './components/TenantDashboard';
import { PropertiesPage } from './components/PropertiesPage';
import { TenantsPage } from './components/TenantsPage';
import { PaymentsPage } from './components/PaymentsPage';
import { RevenueAnalytics } from './components/RevenueAnalytics';
import { Toaster } from './components/ui/sonner';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <LoginPage />;
  }
  
  const isOwner = user.role === 'OWNER';
  
  const renderPage = () => {
    if (!isOwner) {
      return <TenantDashboard />;
    }
    
    switch (currentPage) {
      case 'dashboard':
        return <OwnerDashboard />;
      case 'properties':
        return <PropertiesPage />;
      case 'tenants':
        return <TenantsPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'analytics':
        return <RevenueAnalytics />;
      default:
        return <OwnerDashboard />;
    }
  };
  
  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

AppContent.displayName = 'AppContent';

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

App.displayName = 'App';

export default App;