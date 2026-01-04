import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Property, ParentProperty, Tenancy, Payment, User } from '../utils/db';
import { dataService } from '../utils/dataService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Building2, IndianRupee, Users, AlertCircle, Download, TrendingUp, Home, BarChart3, PieChart, AlertTriangle } from 'lucide-react';
import { format, parseISO, isAfter, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInDays, addDays } from 'date-fns';
import { exportAllDataToExcel } from '../utils/excel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [parentProperties, setParentProperties] = useState<ParentProperty[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('all');
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeTenancies: 0,
    monthlyCollection: 0,
    overduePayments: 0,
    vacantProperties: 0,
    advanceBalance: 0,
    expectedMonthlyRent: 0,
    expiringLeases: 0,
    monthlyCollectionGrowth: 0,
    tenancyGrowth: 0
  });
  
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
      calculateStats();
    }
  }, [selectedParentId, properties, tenancies, payments]);
  
  const loadData = async () => {
    if (!user) return;
    
    try {
      const [props, parents, tens, pays, users] = await Promise.all([
        dataService.getProperties(user.id),
        dataService.getParentProperties(user.id),
        dataService.getTenancies(user.id),
        dataService.getPayments(user.id),
        dataService.getUsers(user.id)
      ]);
      
      setProperties(props);
      setParentProperties(parents);
      setTenancies(tens);
      setPayments(pays);
      setTenants(users);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };
  
  const calculateStats = () => {
    // Filter properties based on selection
    const filteredProps = selectedParentId === 'all' 
      ? properties 
      : properties.filter(p => p.parentPropertyId === selectedParentId);
    
    const filteredPropertyIds = new Set(filteredProps.map(p => p.id));
    
    // Filter tenancies for selected properties
    const filteredTenancies = tenancies.filter(t => filteredPropertyIds.has(t.propertyId));
    const activeTens = filteredTenancies.filter(t => t.status === 'active');
    
    // Filter payments for selected properties
    const filteredPayments = payments.filter(p => filteredPropertyIds.has(p.propertyId));
    
    const today = new Date();
    const overdueCount = activeTens.filter(t => 
      isAfter(today, parseISO(t.nextDueDate))
    ).length;
    
    const expectedMonthlyRent = activeTens
      .filter(t => t.rentFrequency === 'monthly')
      .reduce((sum, t) => sum + t.rentAmount, 0);
    
    const vacantCount = filteredProps.filter(p => p.status === 'vacant').length;
    
    const totalAdvance = activeTens.reduce((sum, t) => sum + t.advanceBalance, 0);
    
    // Get this month's collections
    const thisMonth = format(today, 'yyyy-MM');
    const monthlyCollection = filteredPayments
      .filter(p => p.date.startsWith(thisMonth))
      .reduce((sum, p) => sum + p.amount, 0);
    
    // Get last month's collections for growth calculation
    const lastMonth = format(subMonths(today, 1), 'yyyy-MM');
    const lastMonthCollection = filteredPayments
      .filter(p => p.date.startsWith(lastMonth))
      .reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyCollectionGrowth = lastMonthCollection > 0 
      ? ((monthlyCollection - lastMonthCollection) / lastMonthCollection) * 100 
      : 0;
    
    // Calculate tenancy growth (compare to 30 days ago)
    const thirtyDaysAgo = subMonths(today, 1);
    const previousActiveTenancies = tenancies.filter(t => 
      t.status === 'active' && parseISO(t.startDate) <= thirtyDaysAgo
    ).length;
    const tenancyGrowth = previousActiveTenancies > 0
      ? ((activeTens.length - previousActiveTenancies) / previousActiveTenancies) * 100
      : 0;
    
    // Calculate expiring leases (within 30 days)
    const expiringCount = activeTens.filter(t => {
      if (!t.endDate) return false;
      const endDate = parseISO(t.endDate);
      const daysUntilExpiry = differenceInDays(endDate, today);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;
    
    setStats({
      totalProperties: filteredProps.length,
      activeTenancies: activeTens.length,
      monthlyCollection,
      overduePayments: overdueCount,
      vacantProperties: vacantCount,
      advanceBalance: totalAdvance,
      expectedMonthlyRent,
      expiringLeases: expiringCount,
      monthlyCollectionGrowth,
      tenancyGrowth
    });
  };
  
  const handleExportData = () => {
    const filteredTenants = tenants.filter(u => 
      tenancies.some(t => (t.profileId || t.tenantId) === u.id)
    );
    exportAllDataToExcel(properties, parentProperties, tenancies, payments, filteredTenants);
  };
  
  // Filter data based on selected parent property
  const filteredPropertyIds = selectedParentId === 'all' 
    ? new Set(properties.map(p => p.id))
    : new Set(properties.filter(p => p.parentPropertyId === selectedParentId).map(p => p.id));
  
  // Calculate monthly revenue data for bar chart (last 6 months)
  const getMonthlyRevenueData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = parseISO(p.date);
        return filteredPropertyIds.has(p.propertyId) && 
               isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
      });
      
      const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      data.push({
        month: format(monthDate, 'MMM yyyy'),
        revenue: total
      });
    }
    return data;
  };
  
  // Calculate property distribution data for pie chart
  const getPropertyDistributionData = () => {
    const filteredProps = selectedParentId === 'all' 
      ? properties 
      : properties.filter(p => p.parentPropertyId === selectedParentId);
    
    const distribution: { [key: string]: number } = {};
    filteredProps.forEach(p => {
      const type = p.type || 'other';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    const colors: { [key: string]: string } = {
      apartment: '#3b82f6',
      house: '#10b981',
      condo: '#f59e0b',
      commercial: '#8b5cf6',
      shop: '#06b6d4',
      flat: '#14b8a6',
      land: '#f97316',
      warehouse: '#6366f1',
      other: '#6b7280'
    };
    
    return Object.entries(distribution).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: colors[type] || '#6b7280'
    }));
  };
  
  const monthlyRevenueData = getMonthlyRevenueData();
  const propertyDistributionData = getPropertyDistributionData();
  
  const recentPayments = payments
    .filter(p => filteredPropertyIds.has(p.propertyId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  const upcomingDues = tenancies
    .filter(t => t.status === 'active' && filteredPropertyIds.has(t.propertyId))
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
    .slice(0, 5);
  
  const getDisplayName = () => {
    if (selectedParentId === 'all') return 'All Properties';
    const parent = parentProperties.find(p => p.id === selectedParentId);
    return parent?.name || 'Unknown';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
        <Button onClick={handleExportData} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export All Data
        </Button>
      </div>
      
      {/* Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-md space-y-2">
              <Label>View Statistics For</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4" />
                      All Properties
                    </div>
                  </SelectItem>
                  {parentProperties.map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>
                      <div className="flex items-center">
                        <Home className="mr-2 h-4 w-4" />
                        {parent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing data for: <span className="font-medium text-foreground">{getDisplayName()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setOpenDialog('units')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Units</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              {stats.vacantProperties} vacant • Click for details
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setOpenDialog('tenancies')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Tenancies</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.activeTenancies}</div>
            <p className="text-xs text-muted-foreground">
              Current tenants • Click for details
            </p>
            {stats.tenancyGrowth !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${stats.tenancyGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-3 w-3 ${stats.tenancyGrowth < 0 ? 'rotate-180' : ''}`} />
                <span>{Math.abs(stats.tenancyGrowth).toFixed(1)}% vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setOpenDialog('collection')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">This Month's Collection</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₹{stats.monthlyCollection.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Revenue this month • Click for details
            </p>
            {stats.monthlyCollectionGrowth !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${stats.monthlyCollectionGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-3 w-3 ${stats.monthlyCollectionGrowth < 0 ? 'rotate-180' : ''}`} />
                <span>{Math.abs(stats.monthlyCollectionGrowth).toFixed(1)}% vs last month</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setOpenDialog('expected')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Monthly Rent Expected</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₹{stats.expectedMonthlyRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From monthly tenancies • Click for details
            </p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${stats.overduePayments > 0 ? 'border-red-200' : ''}`} onClick={() => setOpenDialog('overdue')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Overdue Payments</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.overduePayments > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${stats.overduePayments > 0 ? 'text-red-600' : ''}`}>
              {stats.overduePayments}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overduePayments > 0 ? 'Needs attention' : 'All up to date'} • Click for details
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setOpenDialog('advance')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Advance Balance</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₹{stats.advanceBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Held in advance • Click for details
            </p>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${stats.expiringLeases > 0 ? 'border-orange-200' : ''}`} onClick={() => setOpenDialog('expiring')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Expiring Leases</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.expiringLeases > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${stats.expiringLeases > 0 ? 'text-orange-600' : ''}`}>
              {stats.expiringLeases}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.expiringLeases > 0 ? 'Within 30 days' : 'None expiring soon'} • Click for details
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Visual Analytics Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Property Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {propertyDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={propertyDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => 
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {propertyDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} properties`, 'Count']}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No properties to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent payments</p>
              ) : (
                recentPayments.map(payment => {
                  const property = properties.find(p => p.id === payment.propertyId);
                  const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                  const tenant = tenants.find(u => u.id === (payment.tenantId || payment.profileId));
                  return (
                    <div key={payment.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm">{tenant?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {parent?.name || 'Unknown'} - {property?.unitName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(payment.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Due Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming dues</p>
              ) : (
                upcomingDues.map(tenancy => {
                  const property = properties.find(p => p.id === tenancy.propertyId);
                  const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                  const tenant = tenants.find(u => u.id === (tenancy.profileId || tenancy.tenantId));
                  const isOverdue = isAfter(new Date(), parseISO(tenancy.nextDueDate));
                  return (
                    <div key={tenancy.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm">{parent?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {property?.unitName} - {tenant?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm ${isOverdue ? 'text-red-600' : ''}`}>
                          ₹{tenancy.rentAmount.toLocaleString()}
                        </p>
                        <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {format(parseISO(tenancy.nextDueDate), 'MMM d, yyyy')}
                          {isOverdue && ' (Overdue)'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Detail Dialogs */}
      {/* Total Units Dialog */}
      <Dialog open={openDialog === 'units'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Units - Detailed Breakdown</DialogTitle>
            <DialogDescription>
              Complete list of all property units with their current status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {properties.filter(p => filteredPropertyIds.has(p.id)).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No units found</p>
            ) : (
              properties.filter(p => filteredPropertyIds.has(p.id)).map(property => {
                const parent = parentProperties.find(p => p.id === property.parentPropertyId);
                const currentTenancy = tenancies.find(t => t.propertyId === property.id && t.status === 'active');
                const tenant = currentTenancy ? tenants.find(u => u.id === (currentTenancy.profileId || currentTenancy.tenantId)) : null;
                return (
                  <div key={property.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{parent?.name || 'Unknown'} - {property.unitName}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{property.type}</Badge>
                        <Badge variant={property.status === 'vacant' ? 'secondary' : 'default'}>
                          {property.status === 'vacant' ? 'Vacant' : 'Occupied'}
                        </Badge>
                      </div>
                      {tenant && <p className="text-sm text-muted-foreground mt-1">Tenant: {tenant.name}</p>}
                    </div>
                    {currentTenancy && (
                      <div className="text-right">
                        <p className="font-medium">₹{currentTenancy.rentAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{currentTenancy.rentFrequency}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Active Tenancies Dialog */}
      <Dialog open={openDialog === 'tenancies'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Active Tenancies - Detailed Breakdown</DialogTitle>
            <DialogDescription>
              Complete list of all active tenancies with tenant and property information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {tenancies.filter(t => t.status === 'active' && filteredPropertyIds.has(t.propertyId)).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active tenancies</p>
            ) : (
              tenancies.filter(t => t.status === 'active' && filteredPropertyIds.has(t.propertyId)).map(tenancy => {
                const property = properties.find(p => p.id === tenancy.propertyId);
                const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                const tenant = tenants.find(u => u.id === (tenancy.profileId || tenancy.tenantId));
                return (
                  <div key={tenancy.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{tenant?.name}</p>
                        <p className="text-sm text-muted-foreground">{tenant?.email}</p>
                        <p className="text-sm text-muted-foreground">{tenant?.phone}</p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Property</p>
                        <p className="font-medium">{parent?.name} - {property?.unitName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rent Amount</p>
                        <p className="font-medium">₹{tenancy.rentAmount.toLocaleString()} / {tenancy.rentFrequency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p>{format(parseISO(tenancy.startDate), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next Due</p>
                        <p>{format(parseISO(tenancy.nextDueDate), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Monthly Collection Dialog */}
      <Dialog open={openDialog === 'collection'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>This Month's Collection - Detailed Breakdown</DialogTitle>
            <DialogDescription>
              All payments received this month ({format(new Date(), 'MMMM yyyy')})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const thisMonth = format(new Date(), 'yyyy-MM');
              const monthPayments = payments.filter(p => filteredPropertyIds.has(p.propertyId) && p.date.startsWith(thisMonth));
              return monthPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No payments this month</p>
              ) : (
                <>                  {monthPayments.map(payment => {
                    const property = properties.find(p => p.id === payment.propertyId);
                    const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                    const tenant = tenants.find(u => u.id === (payment.tenantId || payment.profileId));
                    return (
                      <div key={payment.id} className="flex justify-between items-start p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{tenant?.name}</p>
                          <p className="text-sm text-muted-foreground">{parent?.name} - {property?.unitName}</p>
                          <p className="text-xs text-muted-foreground">{format(parseISO(payment.date), 'MMM d, yyyy')} • {payment.method.replace('_', ' ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{payment.receiptNumber}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Total Collection</p>
                      <p className="text-xl font-bold text-green-600">₹{stats.monthlyCollection.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Expected Monthly Rent Dialog */}
      <Dialog open={openDialog === 'expected'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expected Monthly Rent - Detailed Breakdown</DialogTitle>
            <DialogDescription>
              All monthly tenancies and their expected rent amounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const monthlyTenancies = tenancies.filter(t => t.status === 'active' && t.rentFrequency === 'monthly' && filteredPropertyIds.has(t.propertyId));
              return monthlyTenancies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No monthly tenancies</p>
              ) : (
                <>                  {monthlyTenancies.map(tenancy => {
                    const property = properties.find(p => p.id === tenancy.propertyId);
                    const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                    const tenant = tenants.find(u => u.id === (tenancy.profileId || tenancy.tenantId));
                    return (
                      <div key={tenancy.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{tenant?.name}</p>
                          <p className="text-sm text-muted-foreground">{parent?.name} - {property?.unitName}</p>
                        </div>
                        <p className="font-medium">₹{tenancy.rentAmount.toLocaleString()}</p>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Total Expected Monthly</p>
                      <p className="text-xl font-bold">₹{stats.expectedMonthlyRent.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Overdue Payments Dialog */}
      <Dialog open={openDialog === 'overdue'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Overdue Payments - Detailed Breakdown</DialogTitle>
            <DialogDescription>
              All tenancies with payments past their due date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const overdueTenancies = tenancies.filter(t => t.status === 'active' && filteredPropertyIds.has(t.propertyId) && isAfter(new Date(), parseISO(t.nextDueDate)));
              return overdueTenancies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-green-600">✓ All payments are up to date!</p>
                </div>
              ) : (
                overdueTenancies.map(tenancy => {
                  const property = properties.find(p => p.id === tenancy.propertyId);
                  const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                  const tenant = tenants.find(u => u.id === (tenancy.profileId || tenancy.tenantId));
                  const daysOverdue = Math.floor((new Date().getTime() - parseISO(tenancy.nextDueDate).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={tenancy.id} className="p-4 border border-red-200 bg-red-50 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{tenant?.name}</p>
                          <p className="text-sm text-muted-foreground">{parent?.name} - {property?.unitName}</p>
                        </div>
                        <Badge className="bg-red-600">Overdue</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="text-red-600 font-medium">{format(parseISO(tenancy.nextDueDate), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Overdue</p>
                          <p className="text-red-600 font-medium">{daysOverdue} days</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount Due</p>
                          <p className="font-medium">₹{tenancy.rentAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contact</p>
                          <p>{tenant?.phone}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Advance Balance Dialog */}
      <Dialog open={openDialog === 'advance'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advance Balance - Detailed Breakdown</DialogTitle>
            <DialogDescription>
              All tenancies with advance balance amounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const tenanciesWithAdvance = tenancies.filter(t => t.status === 'active' && t.advanceBalance > 0 && filteredPropertyIds.has(t.propertyId));
              return tenanciesWithAdvance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No advance balances</p>
              ) : (
                <>                  {tenanciesWithAdvance.map(tenancy => {
                    const property = properties.find(p => p.id === tenancy.propertyId);
                    const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                    const tenant = tenants.find(u => u.id === (tenancy.profileId || tenancy.tenantId));
                    return (
                      <div key={tenancy.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{tenant?.name}</p>
                          <p className="text-sm text-muted-foreground">{parent?.name} - {property?.unitName}</p>
                        </div>
                        <p className="font-medium text-green-600">₹{tenancy.advanceBalance.toLocaleString()}</p>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Total Advance Held</p>
                      <p className="text-xl font-bold text-green-600">₹{stats.advanceBalance.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Expiring Leases Dialog */}
      <Dialog open={openDialog === 'expiring'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expiring Leases - Detailed Breakdown</DialogTitle>
            <DialogDescription>
              All leases expiring within the next 30 days
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const today = new Date();
              const expiringTenancies = tenancies.filter(t => {
                if (t.status !== 'active' || !filteredPropertyIds.has(t.propertyId) || !t.endDate) return false;
                const endDate = parseISO(t.endDate);
                const daysUntilExpiry = differenceInDays(endDate, today);
                return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
              });
              
              return expiringTenancies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-green-600">✓ No leases expiring in the next 30 days!</p>
                </div>
              ) : (
                expiringTenancies.map(tenancy => {
                  const property = properties.find(p => p.id === tenancy.propertyId);
                  const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                  const tenant = tenants.find(u => u.id === (tenancy.profileId || tenancy.tenantId));
                  const daysUntilExpiry = differenceInDays(parseISO(tenancy.endDate!), today);
                  const isUrgent = daysUntilExpiry <= 7;
                  
                  return (
                    <div key={tenancy.id} className={`p-4 border rounded-lg space-y-2 ${isUrgent ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{tenant?.name}</p>
                          <p className="text-sm text-muted-foreground">{parent?.name} - {property?.unitName}</p>
                        </div>
                        <Badge className={isUrgent ? 'bg-red-600' : 'bg-orange-600'}>
                          {isUrgent ? 'Urgent' : 'Expiring Soon'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Lease End Date</p>
                          <p className={`font-medium ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                            {format(parseISO(tenancy.endDate!), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Remaining</p>
                          <p className={`font-medium ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                            {daysUntilExpiry} days
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Rent</p>
                          <p className="font-medium">₹{tenancy.rentAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Renewals</p>
                          <p>{tenancy.renewalCount || 0} times</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contact</p>
                          <p>{tenant?.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};