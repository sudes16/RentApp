import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tenancy, Property, ParentProperty } from '../utils/db';
import { LegacyPayment } from '../utils/types';
import { dataService } from '../utils/dataService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Building2, IndianRupee, Calendar, Download } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { downloadReceipt } from '../utils/excel';
import { toast } from 'sonner';

export const TenantDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<LegacyPayment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [parentProperties, setParentProperties] = useState<ParentProperty[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Use tenant-specific methods that rely on RLS
      const myTenancies = await dataService.getMyTenancies();
      const myPayments = await dataService.getMyPayments();
      
      setTenancies(myTenancies);
      setPayments(myPayments);
      
      // Get property and parent property details
      if (myTenancies.length > 0 && user) {
        const propertyIds = [...new Set(myTenancies.map(t => t.propertyId))];
        // Get properties - may need special RLS policy for tenant to view their property
        const props = await dataService.getProperties(user.id);
        const parents = await dataService.getParentProperties(user.id);
        setProperties(props.filter(p => propertyIds.includes(p.id)));
        setParentProperties(parents);
      }
      
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast.error('Failed to load rental information');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      const property = properties.find(p => p.id === payment.propertyId);
      if (property && user) {
        // For now, use user as owner placeholder
        // TODO: Fetch actual owner details from profiles
        downloadReceipt(payment, property, user, user);
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your rental information...</p>
        </div>
      </div>
    );
  }
  
  const activeTenancy = tenancies.find(t => t.status === 'active');
  const currentProperty = properties.find(p => p.id === activeTenancy?.propertyId);
  const totalPaymentsMade = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = activeTenancy && isAfter(new Date(), parseISO(activeTenancy.nextDueDate)) ? 1 : 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl">My Rental Information</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}
        </p>
      </div>
      
      {activeTenancy && currentProperty ? (
        <>
          {/* Current Rental Info */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Property</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {(() => {
                  const parent = parentProperties.find(p => p.id === currentProperty.parentPropertyId);
                  return (
                    <>
                      <div className="text-2xl mb-1">{parent?.name || 'Unknown'}</div>
                      <p className="text-sm text-blue-600 font-medium">
                        {currentProperty.unitName}
                      </p>
                      {currentProperty.unitDetails && (
                        <p className="text-xs text-muted-foreground">
                          {currentProperty.unitDetails}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {parent?.address || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: {currentProperty.type}
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Monthly Rent</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">₹{activeTenancy.rentAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {activeTenancy.rentFrequency}
                </p>
              </CardContent>
            </Card>
            
            <Card className={isAfter(new Date(), parseISO(activeTenancy.nextDueDate)) ? 'border-red-200' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Next Payment Due</CardTitle>
                <Calendar className={`h-4 w-4 ${isAfter(new Date(), parseISO(activeTenancy.nextDueDate)) ? 'text-red-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl ${isAfter(new Date(), parseISO(activeTenancy.nextDueDate)) ? 'text-red-600' : ''}`}>
                  {format(parseISO(activeTenancy.nextDueDate), 'MMM d, yyyy')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount: ₹{activeTenancy.rentAmount.toLocaleString()}</p>
                {isAfter(new Date(), parseISO(activeTenancy.nextDueDate)) && (
                  <p className="text-xs text-red-500 mt-1">Payment Overdue</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Advance Balance</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">₹{activeTenancy.advanceBalance.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Available for next payment
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Tenancy Start</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">
                  {format(parseISO(activeTenancy.startDate), 'MMM yyyy')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(activeTenancy.startDate), 'MMMM d, yyyy')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Security Deposit</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">
                  ₹{activeTenancy.securityDeposit?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Refundable
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Total Payments Made</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">₹{totalPaymentsMade.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payment history</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map(payment => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center border rounded-lg p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm">
                                {format(parseISO(payment.date), 'MMMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Receipt: {payment.receiptNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm">
                                ₹{payment.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {payment.method.replace('_', ' ')}
                              </p>
                            </div>
                            {payment.advanceUsed > 0 && (
                              <div>
                                <p className="text-xs text-blue-600">
                                  Advance Used: ₹{payment.advanceUsed}
                                </p>
                              </div>
                            )}
                          </div>
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Note: {payment.notes}
                            </p>
                          )}
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
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg mb-2">No Active Rental</h3>
            <p className="text-sm text-muted-foreground">
              You don't have any active rental properties assigned to your account.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};