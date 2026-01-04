import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Property, Tenancy, Payment, ParentProperty, User } from '../utils/db';
import { dataService } from '../utils/dataService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Building2,
  CreditCard,
  BarChart3,
  PieChart
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, isBefore } from 'date-fns';

export const RevenueAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [parentProperties, setParentProperties] = useState<ParentProperty[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'3' | '6' | '12'>('6');
  
  useEffect(() => {
    loadData();
  }, [user]);
  
  const loadData = async () => {
    if (user) {
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
        console.error('Error loading revenue analytics data:', error);
      }
    }
  };
  
  // Calculate monthly revenue for the selected period
  const getMonthlyRevenue = () => {
    const months = parseInt(selectedPeriod);
    const monthlyData = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = parseISO(p.date);
        return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
      });
      
      const totalRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      
      monthlyData.push({
        month: format(monthDate, 'MMM yyyy'),
        revenue: totalRevenue,
        paymentCount: monthPayments.length
      });
    }
    
    return monthlyData;
  };
  
  // Calculate expected vs collected for current month
  const getCurrentMonthMetrics = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Calculate expected rent (all active tenancies)
    const activeTenancies = tenancies.filter(t => t.status === 'active');
    const expectedMonthly = activeTenancies.reduce((sum, t) => {
      if (t.rentFrequency === 'monthly') {
        return sum + t.rentAmount;
      } else {
        // For yearly, divide by 12
        return sum + (t.rentAmount / 12);
      }
    }, 0);
    
    // Calculate collected this month
    const monthPayments = payments.filter(p => {
      const paymentDate = parseISO(p.date);
      return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
    });
    const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate collection efficiency
    const efficiency = expectedMonthly > 0 ? (collected / expectedMonthly) * 100 : 0;
    
    return {
      expected: expectedMonthly,
      collected,
      efficiency: Math.round(efficiency),
      paymentsCount: monthPayments.length
    };
  };
  
  // Calculate overdue amounts
  const getOverdueMetrics = () => {
    const now = new Date();
    const overdueDetails = [];
    let totalOverdue = 0;
    
    tenancies.filter(t => t.status === 'active').forEach(tenancy => {
      const nextDueDate = parseISO(tenancy.nextDueDate);
      
      if (isBefore(nextDueDate, now)) {
        const property = properties.find(p => p.id === tenancy.propertyId);
        const tenant = tenants.find(u => u.id === (tenancy.profileId || tenancy.tenantId));
        
        // Calculate how many months/periods overdue
        let periodsOverdue = 0;
        let amountOverdue = 0;
        
        if (tenancy.rentFrequency === 'monthly') {
          let checkDate = nextDueDate;
          while (isBefore(checkDate, now)) {
            periodsOverdue++;
            amountOverdue += tenancy.rentAmount;
            checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, checkDate.getDate());
          }
        } else {
          periodsOverdue = 1;
          amountOverdue = tenancy.rentAmount;
        }
        
        totalOverdue += amountOverdue;
        overdueDetails.push({
          tenancy,
          property,
          tenant,
          periodsOverdue,
          amountOverdue
        });
      }
    });
    
    return {
      totalOverdue,
      count: overdueDetails.length,
      details: overdueDetails.sort((a, b) => b.amountOverdue - a.amountOverdue)
    };
  };
  
  // Calculate property-wise income
  const getPropertyWiseIncome = () => {
    const propertyIncome = parentProperties.map(parent => {
      const childProperties = properties.filter(p => p.parentPropertyId === parent.id);
      const propertyIds = childProperties.map(p => p.id);
      
      const propertyPayments = payments.filter(p => propertyIds.includes(p.propertyId));
      const totalIncome = propertyPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const occupiedUnits = childProperties.filter(p => p.status === 'occupied').length;
      const totalUnits = childProperties.length;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
      
      return {
        parent,
        totalIncome,
        paymentCount: propertyPayments.length,
        occupancyRate: Math.round(occupancyRate),
        units: totalUnits,
        occupiedUnits
      };
    });
    
    return propertyIncome.sort((a, b) => b.totalIncome - a.totalIncome);
  };
  
  // Payment method breakdown
  const getPaymentMethodBreakdown = () => {
    const methodStats = payments.reduce((acc, payment) => {
      if (!acc[payment.method]) {
        acc[payment.method] = { count: 0, amount: 0 };
      }
      acc[payment.method].count++;
      acc[payment.method].amount += payment.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
    
    return Object.entries(methodStats).map(([method, stats]) => ({
      method,
      count: stats.count,
      amount: stats.amount,
      percentage: payments.length > 0 ? (stats.count / payments.length) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  };
  
  // Occupancy metrics
  const getOccupancyMetrics = () => {
    const totalUnits = properties.length;
    const occupiedUnits = properties.filter(p => p.status === 'occupied').length;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    
    // Calculate potential revenue loss from vacant units
    const vacantProperties = properties.filter(p => p.status === 'vacant');
    const potentialMonthlyLoss = vacantProperties.reduce((sum, p) => {
      return sum + (p.rentFrequency === 'monthly' ? p.rentAmount : p.rentAmount / 12);
    }, 0);
    
    return {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate: Math.round(occupancyRate),
      potentialMonthlyLoss
    };
  };
  
  const monthlyRevenue = getMonthlyRevenue();
  const currentMonth = getCurrentMonthMetrics();
  const overdueMetrics = getOverdueMetrics();
  const propertyWiseIncome = getPropertyWiseIncome();
  const paymentMethodBreakdown = getPaymentMethodBreakdown();
  const occupancyMetrics = getOccupancyMetrics();
  
  // Calculate trend from previous month
  const currentMonthRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0;
  const previousMonthRevenue = monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0;
  const revenueTrend = previousMonthRevenue > 0 
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Revenue Analytics</h2>
          <p className="text-muted-foreground">Track income, collection efficiency, and property performance</p>
        </div>
        <Select value={selectedPeriod} onValueChange={(value: '3' | '6' | '12') => setSelectedPeriod(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 Months</SelectItem>
            <SelectItem value="6">Last 6 Months</SelectItem>
            <SelectItem value="12">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Current Month Collection */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">This Month Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{currentMonth.collected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of ₹{currentMonth.expected.toLocaleString()} expected
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(currentMonth.efficiency, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium">{currentMonth.efficiency}%</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Revenue Trend</CardTitle>
            {revenueTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{currentMonthRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Current month revenue</p>
            <div className={`flex items-center gap-1 mt-2 ${revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span className="text-xs font-medium">
                {Math.abs(revenueTrend).toFixed(1)}% vs last month
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Overdue Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{overdueMetrics.totalOverdue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueMetrics.count} {overdueMetrics.count === 1 ? 'tenant' : 'tenants'} overdue
            </p>
            {overdueMetrics.count > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                Requires attention
              </Badge>
            )}
          </CardContent>
        </Card>
        
        {/* Occupancy Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Occupancy Rate</CardTitle>
            <Building2 className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{occupancyMetrics.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {occupancyMetrics.occupiedUnits} of {occupancyMetrics.totalUnits} units occupied
            </p>
            {occupancyMetrics.vacantUnits > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Lost revenue: ₹{occupancyMetrics.potentialMonthlyLoss.toLocaleString()}/mo
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="properties">Property Performance</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Tracking</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>
        
        {/* Revenue Trends Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyRevenue.map((month, index) => {
                  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue));
                  const barWidth = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-green-600 font-semibold">₹{month.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {month.paymentCount} pays
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avg/Month</p>
                    <p className="text-xl font-bold">
                      ₹{Math.round(monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0) / monthlyRevenue.length).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Payments</p>
                    <p className="text-xl font-bold">
                      {monthlyRevenue.reduce((sum, m) => sum + m.paymentCount, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Property Performance Tab */}
        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property-wise Income Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyWiseIncome.map((item, index) => (
                  <Card key={item.parent.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.parent.name}</h3>
                          <p className="text-xs text-muted-foreground">{item.parent.address}</p>
                        </div>
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          {index === 0 ? 'Top Performer' : `#${index + 1}`}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Income</p>
                          <p className="text-lg font-bold text-green-600">₹{item.totalIncome.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Payments</p>
                          <p className="text-lg font-bold">{item.paymentCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Occupancy</p>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold">{item.occupancyRate}%</p>
                            <span className="text-xs text-muted-foreground">
                              ({item.occupiedUnits}/{item.units})
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Avg/Payment</p>
                          <p className="text-lg font-bold">
                            ₹{item.paymentCount > 0 ? Math.round(item.totalIncome / item.paymentCount).toLocaleString() : 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {propertyWiseIncome.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No property income data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Overdue Tracking Tab */}
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Payment Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              {overdueMetrics.details.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-green-600">All payments up to date!</p>
                  <p className="text-sm text-muted-foreground">No overdue payments at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueMetrics.details.map((item) => (
                    <Card key={item.tenancy.id} className="border-red-200 bg-red-50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.tenant?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.property?.unitName} - {item.property && parentProperties.find(p => p.id === item.property?.parentPropertyId)?.name}
                            </p>
                          </div>
                          <Badge variant="destructive">
                            {item.periodsOverdue} {item.tenancy.rentFrequency === 'monthly' ? 'month' : 'period'}(s) overdue
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Amount Overdue</p>
                            <p className="text-lg font-bold text-red-600">₹{item.amountOverdue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Rent Amount</p>
                            <p className="text-sm font-medium">₹{item.tenancy.rentAmount.toLocaleString()}/{item.tenancy.rentFrequency}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                            <p className="text-sm font-medium">{format(parseISO(item.tenancy.nextDueDate), 'dd MMM yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Contact</p>
                            <p className="text-sm font-medium">{item.tenant?.phone || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethodBreakdown.map((item) => (
                  <div key={item.method} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium capitalize">{item.method.replace('_', ' ')}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">₹{item.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.count} payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                
                {paymentMethodBreakdown.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No payment data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
