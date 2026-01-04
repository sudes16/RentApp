import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tenancy, Property, User } from '../utils/db';
import { LegacyPayment } from '../utils/types';
import { dataService } from '../utils/dataService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Plus, Download, IndianRupee, Calendar as CalendarIcon, List } from 'lucide-react';
import { format, parseISO, addMonths, addYears, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { exportPaymentReportToExcel, downloadReceipt } from '../utils/excel';
import { toast } from 'sonner';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<LegacyPayment[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [parentProperties, setParentProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState({
    tenancyId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    method: 'cash' as LegacyPayment['method'],
    transactionId: '',
    useAdvance: false,
    advanceAmount: '',
    notes: ''
  });
  
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
        setTenancies(tens.filter(t => t.status === 'active'));
        setPayments(pays);
        setTenants(users.filter(u => u.role === 'TENANT'));
      } catch (error) {
        console.error('Error loading payments data:', error);
      }
    }
  };
  
  const resetForm = () => {
    setFormData({
      tenancyId: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'cash',
      transactionId: '',
      useAdvance: false,
      advanceAmount: '',
      notes: ''
    });
  };
  
  const selectedTenancy = tenancies.find(t => t.id === formData.tenancyId);
  const maxAdvanceUse = selectedTenancy?.advanceBalance || 0;
  
  const handleRecordPayment = async () => {
    if (!formData.tenancyId || !formData.amount || !formData.date) {
      toast.error('Please fill in required fields');
      return;
    }
    
    const tenancy = tenancies.find(t => t.id === formData.tenancyId);
    if (!tenancy || !user) {
      toast.error('Tenancy not found');
      return;
    }
    
    const property = properties.find(p => p.id === tenancy.propertyId);
    if (!property) {
      toast.error('Property not found');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    const advanceUsed = formData.useAdvance && formData.advanceAmount ? parseFloat(formData.advanceAmount) : 0;
    
    if (advanceUsed > tenancy.advanceBalance) {
      toast.error('Advance amount exceeds available balance');
      return;
    }
    
    try {
      // Create payment record
      await dataService.createPayment({
        tenancyId: tenancy.id,
        propertyId: property.id,
        tenantId: tenancy.tenantId,
        profileId: tenancy.profileId,
        ownerId: user.id,
        amount: amount,
        date: formData.date,
        method: formData.method,
        transactionId: formData.transactionId,
        advanceUsed,
        notes: formData.notes
      });
      
      // Update tenancy advance balance and next due date
      const newAdvanceBalance = tenancy.advanceBalance - advanceUsed + (amount > tenancy.rentAmount ? amount - tenancy.rentAmount : 0);
      
      let newNextDueDate = parseISO(tenancy.nextDueDate);
      if (tenancy.rentFrequency === 'monthly') {
        newNextDueDate = addMonths(newNextDueDate, 1);
      } else {
        newNextDueDate = addYears(newNextDueDate, 1);
      }
      
      await dataService.updateTenancy(tenancy.id, {
        advanceBalance: newAdvanceBalance,
        nextDueDate: newNextDueDate.toISOString().split('T')[0]
      });
      
      toast.success('Payment recorded successfully');
      await loadData();
      setShowRecordDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };
  
  const handleExport = () => {
    exportPaymentReportToExcel(payments, properties, tenants);
  };
  
  const handleDownloadReceipt = (payment: LegacyPayment) => {
    const property = properties.find(p => p.id === payment.propertyId);
    const tenant = tenants.find(t => t.id === (payment.profileId || payment.tenantId));
    if (property && tenant && user) {
      downloadReceipt(payment, property, tenant, user);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl">Payments</h1>
          <p className="text-muted-foreground">
            Record and manage rent payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Dialog open={showRecordDialog} onOpenChange={(open) => {
            setShowRecordDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={tenancies.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Rent Payment</DialogTitle>
                <DialogDescription>
                  Enter the details of the payment made by the tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tenancy">Select Tenancy *</Label>
                  <Select value={formData.tenancyId} onValueChange={(value) => {
                    const tenancy = tenancies.find(t => t.id === value);
                    setFormData({
                      ...formData,
                      tenancyId: value,
                      amount: tenancy?.rentAmount.toString() || ''
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a tenant/property" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenancies.map(t => {
                        const property = properties.find(p => p.id === t.propertyId);
                        const parent = property ? parentProperties.find(p => p.id === property.parentPropertyId) : null;
                        const tenant = tenants.find(u => u.id === (t.profileId || t.tenantId));
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            {tenant?.name} - {parent?.name || 'Unknown'} ({property?.unitName}) - ₹{t.rentAmount}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTenancy && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Rent Amount:</span>{' '}
                      <span className="font-medium">₹{selectedTenancy.rentAmount}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Next Due:</span>{' '}
                      <span className="font-medium">{format(parseISO(selectedTenancy.nextDueDate), 'MMM d, yyyy')}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Advance Available:</span>{' '}
                      <span className="font-medium text-green-600">₹{selectedTenancy.advanceBalance}</span>
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="2500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">Payment Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method *</Label>
                  <Select value={formData.method} onValueChange={(value: Payment['method']) => setFormData({...formData, method: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(formData.method === 'bank_transfer' || formData.method === 'upi' || formData.method === 'online') && (
                  <div className="space-y-2">
                    <Label htmlFor="transactionId">Transaction ID</Label>
                    <Input
                      id="transactionId"
                      type="text"
                      value={formData.transactionId}
                      onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
                      placeholder="Enter transaction/reference ID"
                    />
                  </div>
                )}
                
                {maxAdvanceUse > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useAdvance"
                        checked={formData.useAdvance}
                        onChange={(e) => setFormData({...formData, useAdvance: e.target.checked, advanceAmount: e.target.checked ? maxAdvanceUse.toString() : ''})}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="useAdvance">Use Advance Balance (₹{maxAdvanceUse} available)</Label>
                    </div>
                    {formData.useAdvance && (
                      <Input
                        type="number"
                        value={formData.advanceAmount}
                        onChange={(e) => setFormData({...formData, advanceAmount: e.target.value})}
                        max={maxAdvanceUse}
                        placeholder="Amount to use from advance"
                      />
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional notes about this payment..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowRecordDialog(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleRecordPayment}>
                  Record Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Payments View with Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'calendar')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-10">
                  <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg mb-2">No Payments Recorded</h3>
                  <p className="text-sm text-muted-foreground">
                    Start recording payments from your tenants
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map(payment => {
                    const property = properties.find(p => p.id === payment.propertyId);
                    const tenant = tenants.find(t => t.id === payment.tenantId);
                    
                    return (
                      <div key={payment.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span className="text-xs">Date</span>
                            </div>
                            <p className="text-sm">{format(parseISO(payment.date), 'MMM d, yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{payment.receiptNumber}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Tenant</p>
                            <p className="text-sm">{tenant?.name}</p>
                            <p className="text-xs font-medium text-muted-foreground">{property?.parentPropertyName}</p>
                            <p className="text-xs text-blue-600">{property?.unitName}</p>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <IndianRupee className="h-4 w-4" />
                              <span className="text-xs">Amount</span>
                            </div>
                            <p className="text-sm">₹{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {payment.method.replace('_', ' ')}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Details</p>
                            {payment.advanceUsed > 0 && (
                              <p className="text-xs text-blue-600">
                                Advance Used: ₹{payment.advanceUsed}
                              </p>
                            )}
                            {payment.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {payment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Payment Calendar - {selectedYear}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedYear(selectedYear - 1)}>
                  Previous Year
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedYear(new Date().getFullYear())}>
                  Current Year
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedYear(selectedYear + 1)}>
                  Next Year
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eachMonthOfInterval({
                  start: startOfYear(new Date(selectedYear, 0, 1)),
                  end: endOfYear(new Date(selectedYear, 0, 1))
                }).map((month) => {
                  // Get all active tenancies
                  const activeTenanciesForMonth = tenancies.filter(t => t.status === 'active');
                  
                  return (
                    <Card key={month.toString()} className="overflow-hidden">
                      <CardHeader className="pb-3 bg-muted">
                        <CardTitle className="text-sm font-medium">
                          {format(month, 'MMMM yyyy')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 space-y-2">
                        {activeTenanciesForMonth.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">No active tenancies</p>
                        ) : (
                          activeTenanciesForMonth.map(tenancy => {
                            const property = properties.find(p => p.id === tenancy.propertyId);
                            const tenant = tenants.find(t => t.id === tenancy.tenantId);
                            
                            // Check if payment exists for this month
                            const monthStart = startOfMonth(month);
                            const monthEnd = endOfMonth(month);
                            const paymentForMonth = payments.find(p => 
                              p.tenancyId === tenancy.id && 
                              isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd })
                            );
                            
                            // Check if this is a yearly payment tenancy
                            const isYearlyAdvance = tenancy.rentFrequency === 'yearly' && tenancy.advanceBalance >= tenancy.rentAmount;
                            
                            let status: 'paid' | 'pending' | 'overdue' | 'advance';
                            let statusColor: string;
                            
                            if (paymentForMonth) {
                              status = 'paid';
                              statusColor = 'bg-green-100 border-green-300 text-green-800';
                            } else if (isYearlyAdvance) {
                              status = 'advance';
                              statusColor = 'bg-blue-100 border-blue-300 text-blue-800';
                            } else if (isSameMonth(month, new Date()) || month > new Date()) {
                              status = 'pending';
                              statusColor = 'bg-yellow-100 border-yellow-300 text-yellow-800';
                            } else {
                              status = 'overdue';
                              statusColor = 'bg-red-100 border-red-300 text-red-800';
                            }
                            
                            return (
                              <div key={tenancy.id} className={`p-2 rounded border ${statusColor}`}>
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{tenant?.name}</p>
                                    <p className="text-xs truncate">{property?.unitName}</p>
                                  </div>
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    {status === 'paid' && '✓'}
                                    {status === 'advance' && 'ADV'}
                                    {status === 'pending' && '...'}
                                    {status === 'overdue' && '!'}
                                  </Badge>
                                </div>
                                <p className="text-xs mt-1">
                                  ₹{tenancy.rentAmount.toLocaleString()}
                                </p>
                                {status === 'advance' && (
                                  <p className="text-xs mt-1 font-medium">Paid in Advance</p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span className="text-sm">Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                  <span className="text-sm">Paid in Advance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                  <span className="text-sm">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                  <span className="text-sm">Overdue</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};