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
    const nextDueDate = parseISO(tenancy.nextDueDate);
    
    // Filter payments for this specific tenancy
    const tenancyPayments = payments.filter(p => p.tenancyId === tenancy.id);
    
    console.log('UnitDetailDialog - Breakdown calculation:', {
      tenancyId: tenancy.id,
      totalPayments: payments.length,
      tenancyPayments: tenancyPayments.length,
      payments: tenancyPayments,
      startDate: format(startDate, 'yyyy-MM-dd'),
      nextDueDate: format(nextDueDate, 'yyyy-MM-dd')
    });
    
    // Start from the nextDueDate and go backwards
    let currentDueDate = new Date(nextDueDate);
    
    // Go backwards from nextDueDate to find all past due dates, but not before start date
    while (isAfter(currentDueDate, startDate)) {
      const prevDate = addMonths(currentDueDate, -1);
      // Stop if going back would put us before the start date
      if (isBefore(prevDate, startDate) || prevDate.getTime() < startDate.getTime()) {
        break;
      }
      currentDueDate = prevDate;
    }
    
    // Ensure we're not before start date
    if (isBefore(currentDueDate, startDate)) {
      // Find the first due date on or after the start date
      currentDueDate = new Date(nextDueDate);
      while (isAfter(currentDueDate, startDate)) {
        currentDueDate = addMonths(currentDueDate, -1);
      }
      // Move forward to be after start date
      if (isBefore(currentDueDate, startDate)) {
        currentDueDate = addMonths(currentDueDate, 1);
      }
    }
    
    console.log('First due date to check:', format(currentDueDate, 'yyyy-MM-dd'));
    
    // Now go forward to build the breakdown
    while ((isBefore(currentDueDate, today) || currentDueDate.getMonth() === today.getMonth()) && breakdown.length < 12) {
      // Skip if this date is before the start date
      if (isBefore(currentDueDate, startDate)) {
        currentDueDate = addMonths(currentDueDate, 1);
        continue;
      }
      
      const monthKey = format(currentDueDate, 'yyyy-MM');
      const dueDate = new Date(currentDueDate);
      
      // Find payments for this month from this tenancy's payments
      const monthPayments = tenancyPayments.filter(p => {
        const payDate = parseISO(p.date);
        // Match by checking if payment note includes the month name
        // or if payment date is within a reasonable range of the month
        const payMonth = format(payDate, 'MMMM yyyy');
        const expectedMonth = format(currentDueDate, 'MMMM yyyy');
        
        // Check if payment note mentions this month OR payment was made in this month
        const noteMatch = p.notes?.includes(expectedMonth);
        const dateMatch = payDate.getMonth() === currentDueDate.getMonth() && 
                         payDate.getFullYear() === currentDueDate.getFullYear();
        
        return noteMatch || dateMatch;
      });
      
      const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const isPaid = totalPaid >= tenancy.rentAmount;
      const isOverdue = !isPaid && isAfter(today, dueDate);
      
      console.log(`Month ${format(currentDueDate, 'MMMM yyyy')}:`, {
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        monthPayments: monthPayments.length,
        totalPaid,
        expected: tenancy.rentAmount,
        isPaid,
        payments: monthPayments.map(p => ({ amount: p.amount, date: p.date, notes: p.notes }))
      });
      
      breakdown.push({
        monthKey,
        month: format(currentDueDate, 'MMMM yyyy'),
        dueDate,
        paid: totalPaid,
        expected: tenancy.rentAmount,
        isPaid,
        isOverdue,
        payments: monthPayments
      });
      
      currentDueDate = addMonths(currentDueDate, 1);
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
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Parent Property</p>
                  <p className="font-medium">{parentProperty?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Unit Type</p>
                  <p className="font-medium capitalize">{unit.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Rent Amount</p>
                  <p className="font-medium">₹{unit.rentAmount.toLocaleString()}/{unit.rentFrequency}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={unit.status === 'occupied' ? 'default' : 'secondary'} className="w-fit">
                    {unit.status}
                  </Badge>
                </div>
              </div>
              
              {unit.unitDetails && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Details</p>
                  <p className="text-sm leading-relaxed">{unit.unitDetails}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tenant Information */}
          {tenancy && tenant && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-6">
                  <UserIcon className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold">Current Tenant</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{tenant.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm break-words">{tenant.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm">{tenant.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="text-sm font-medium">{format(parseISO(tenancy.startDate), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Rent Amount</p>
                    <p className="font-medium">₹{tenancy.rentAmount.toLocaleString()}
                      <span className="text-xs text-muted-foreground ml-1">/{tenancy.rentFrequency}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Next Due Date</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{format(parseISO(tenancy.nextDueDate), 'dd MMM yyyy')}</p>
                      {daysUntilDue < 0 && (
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    {daysUntilDue >= 0 ? (
                      <p className="text-xs text-muted-foreground">in {daysUntilDue} days</p>
                    ) : (
                      <p className="text-xs text-red-500">{Math.abs(daysUntilDue)} days overdue</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Security Deposit</p>
                    <p className="font-medium">₹{tenancy.securityDeposit.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Advance Balance</p>
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