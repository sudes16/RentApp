import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Property, Tenancy, Payment, User, ParentProperty } from '../utils/db';
import { format, parseISO, differenceInDays, isAfter, isBefore, addMonths, addYears, startOfMonth } from 'date-fns';
import { IndianRupee, Calendar, User as UserIcon, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Separator } from './ui/separator';

interface UnitDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Property | null;
  tenancy: Tenancy | null;
  tenant: User | null;
  parentProperty: ParentProperty | null;
  payments?: Payment[];
}

export const UnitDetailDialog: React.FC<UnitDetailDialogProps> = ({
  open,
  onOpenChange,
  unit,
  tenancy,
  tenant,
  parentProperty,
  payments = []
}) => {
  if (!unit) return null;
  
  // Calculate monthly payment breakdown
  const getMonthlyBreakdown = () => {
    if (!tenancy || tenancy.rentFrequency !== 'monthly') return [];
    
    const breakdown = [];
    const startDate = parseISO(tenancy.startDate);
    const today = new Date();
    
    // Filter payments for this specific tenancy
    const tenancyPayments = payments.filter(p => p.tenancyId === tenancy.id);
    
    console.log('UnitDetailDialog - Breakdown calculation:', {
      tenancyId: tenancy.id,
      totalPayments: payments.length,
      tenancyPayments: tenancyPayments.length,
      payments: tenancyPayments
    });
    
    let currentDate = startOfMonth(startDate);
    
    while (isBefore(currentDate, today) || currentDate.getMonth() === today.getMonth()) {
      const monthKey = format(currentDate, 'yyyy-MM');
      const dueDay = unit.dueDay || 5; // Default to 5th
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
      
      // Find payments for this month from this tenancy's payments
      const monthPayments = tenancyPayments.filter(p => {
        const payDate = parseISO(p.date);
        // Match by checking if payment note includes the month name
        // or if payment date is within a reasonable range of the month
        const payMonth = format(payDate, 'MMMM yyyy');
        const expectedMonth = format(currentDate, 'MMMM yyyy');
        
        // Check if payment note mentions this month OR payment was made in this month
        const noteMatch = p.notes?.includes(expectedMonth);
        const dateMatch = payDate.getMonth() === currentDate.getMonth() && 
                         payDate.getFullYear() === currentDate.getFullYear();
        
        return noteMatch || dateMatch;
      });
      
      const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const isPaid = totalPaid >= tenancy.rentAmount;
      const isOverdue = !isPaid && isAfter(today, dueDate);
      
      console.log(`Month ${format(currentDate, 'MMMM yyyy')}:`, {
        monthPayments: monthPayments.length,
        totalPaid,
        expected: tenancy.rentAmount,
        isPaid,
        payments: monthPayments.map(p => ({ amount: p.amount, date: p.date, notes: p.notes }))
      });
      
      breakdown.push({
        monthKey,
        month: format(currentDate, 'MMMM yyyy'),
        dueDate,
        paid: totalPaid,
        expected: tenancy.rentAmount,
        isPaid,
        isOverdue,
        payments: monthPayments
      });
      
      currentDate = addMonths(currentDate, 1);
      
      // Limit to last 12 months
      if (breakdown.length >= 12) break;
    }
    
    return breakdown.reverse();
  };
  
  // Calculate outstanding dues
  const calculateOutstanding = () => {
    if (!tenancy) return { amount: 0, months: [] };
    
    const breakdown = getMonthlyBreakdown();
    const overdueMonths = breakdown.filter(m => m.isOverdue);
    const totalDue = overdueMonths.reduce((sum, m) => sum + (m.expected - m.paid), 0);
    
    return {
      amount: totalDue,
      months: overdueMonths
    };
  };
  
  const monthlyBreakdown = tenancy?.rentFrequency === 'monthly' ? getMonthlyBreakdown() : [];
  const outstanding = calculateOutstanding();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Calculate days until next due
  const daysUntilDue = tenancy ? differenceInDays(parseISO(tenancy.nextDueDate), new Date()) : 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Unit Details - {unit.unitName}</DialogTitle>
          <DialogDescription>
            Complete payment history and rental information for this unit
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Unit Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Parent Property</p>
                  <p className="font-medium break-words">{parentProperty?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Unit Type</p>
                  <p className="font-medium capitalize">{unit.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rent Amount</p>
                  <p className="font-medium">₹{unit.rentAmount.toLocaleString()}/{unit.rentFrequency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={unit.status === 'occupied' ? 'default' : 'secondary'}>
                    {unit.status}
                  </Badge>
                </div>
              </div>
              
              {unit.unitDetails && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Details</p>
                  <p className="text-sm">{unit.unitDetails}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tenant Information */}
          {tenancy && tenant && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold">Current Tenant</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium break-words">{tenant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-sm break-all">{tenant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                    <p className="text-sm break-words">{tenant.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                    <p className="text-sm">{format(parseISO(tenancy.startDate), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rent Amount</p>
                    <p className="font-medium">₹{tenancy.rentAmount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">/{tenancy.rentFrequency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Next Due Date</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-sm font-medium">{format(parseISO(tenancy.nextDueDate), 'dd MMM yyyy')}</p>
                      {daysUntilDue < 0 && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {daysUntilDue >= 0 ? (
                      <p className="text-xs text-muted-foreground">in {daysUntilDue} days</p>
                    ) : (
                      <p className="text-xs text-red-500">{Math.abs(daysUntilDue)} days overdue</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Security Deposit</p>
                    <p className="font-medium">₹{tenancy.securityDeposit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Advance Balance</p>
                    <p className="font-medium text-green-600">₹{tenancy.advanceBalance.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Outstanding Dues */}
          {outstanding.amount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Outstanding Dues</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-red-600">₹{outstanding.amount.toLocaleString()}</p>
                    <p className="text-sm text-red-700">
                      {outstanding.months.length} {outstanding.months.length === 1 ? 'month' : 'months'} overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-700">Overdue months:</p>
                    <p className="text-xs text-red-600">
                      {outstanding.months.map(m => format(m.dueDate, 'MMM yyyy')).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Payment Summary */}
          {tenancy && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Payment Summary</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payments</p>
                    <p className="text-2xl font-bold">{payments.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Payment</p>
                    <p className="text-2xl font-bold">
                      ₹{payments.length > 0 ? Math.round(totalPaid / payments.length).toLocaleString() : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Monthly Breakdown */}
          {monthlyBreakdown.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold">Monthly Rent Breakdown</h3>
                </div>
                <div className="space-y-2">
                  {monthlyBreakdown.map((month) => (
                    <div
                      key={month.monthKey}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        month.isOverdue
                          ? 'border-red-200 bg-red-50'
                          : month.isPaid
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{month.month}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {format(month.dueDate, 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ₹{month.paid.toLocaleString()} / ₹{month.expected.toLocaleString()}
                        </p>
                        <Badge
                          variant={month.isPaid ? 'default' : month.isOverdue ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {month.isPaid ? 'Paid' : month.isOverdue ? 'Overdue' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Payment History */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <IndianRupee className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Payment History</h3>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payments recorded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {payment.method.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(payment.date), 'dd MMM yyyy, HH:mm')}
                        </p>
                        {payment.transactionId && (
                          <p className="text-xs text-muted-foreground">
                            Transaction ID: {payment.transactionId}
                          </p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-muted-foreground">
                          {payment.receiptNumber}
                        </p>
                        {payment.advanceUsed > 0 && (
                          <p className="text-xs text-green-600">
                            Advance used: ₹{payment.advanceUsed.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};