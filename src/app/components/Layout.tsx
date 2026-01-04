import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Building2, LayoutDashboard, Home, Users, IndianRupee, LogOut, Menu, X, TrendingUp } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isOwner = user?.role === 'OWNER';
  
  const ownerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: IndianRupee },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];
  
  const tenantMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
  ];
  
  const menuItems = isOwner ? ownerMenuItems : tenantMenuItems;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">RentHub</h1>
                <p className="text-xs text-muted-foreground">
                  {isOwner ? 'Owner Portal' : 'Tenant Portal'}
                </p>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto max-w-full">
              <div className="flex items-center gap-1 flex-nowrap">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentPage === item.id ? 'default' : 'ghost'}
                          onClick={() => onNavigate(item.id)}
                          className="whitespace-nowrap"
                        >
                          <Icon className="h-4 w-4 md:mr-2" />
                          <span className="hidden lg:inline">{item.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" onClick={logout} className="whitespace-nowrap">
                      <LogOut className="h-4 w-4 md:mr-2" />
                      <span className="hidden lg:inline">Logout</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </nav>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </nav>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2026 RentHub - Property Management System</p>
          <p className="mt-1">Data stored locally in your browser using localStorage</p>
        </div>
      </footer>
    </div>
  );
};