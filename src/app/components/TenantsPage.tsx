import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tenancy, Property, User } from '../utils/db';
import { LegacyPayment } from '../utils/types';
import { dataService } from '../utils/dataService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Users, Plus, Building2, IndianRupee, Calendar, Mail, Phone } from 'lucide-react';
import { format, parseISO, addMonths, addYears, isAfter, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

// Helper function to calculate tenant status
const getTenantStatus = (tenancy: Tenancy): { status: 'active' | 'late' | 'pending'; label: string; variant: 'default' | 'destructive' | 'secondary' } => {
  const today = new Date();
  const dueDate = parseISO(tenancy.nextDueDate);
  const daysOverdue = differenceInDays(today, dueDate);
  
  if (daysOverdue > 0) {
    return { status: 'late', label: `Late (${daysOverdue}d)`, variant: 'destructive' };
  } else if (daysOverdue > -7 && daysOverdue <= 0) {
    return { status: 'pending', label: 'Due Soon', variant: 'secondary' };
  } else {
    return { status: 'active', label: 'Active', variant: 'default' };
  }
};

export const TenantsPage: React.FC = () => {
  const { user } = useAuth();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [parentProperties, setParentProperties] = useState<any[]>([]);
  const [payments, setPayments] = useState<LegacyPayment[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewingTenancy, setRenewingTenancy] = useState<Tenancy | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<{ user: User; tenancy: Tenancy } | null>(null);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [tenantCredentials, setTenantCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<{ tenancy: Tenancy; amount: number; totalAmount: number; months: string[]; monthCount: number; selectedMonths: boolean[] } | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [filterParentProperty, setFilterParentProperty] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    propertyId: '',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    startDate: '',
    rentAmount: '',
    rentFrequency: 'monthly' as 'monthly' | 'yearly',
    securityDeposit: '',
    advancePayment: ''
  });
  
  const [renewalFormData, setRenewalFormData] = useState({
    duration: '1',
    applyIncrement: true,
    incrementPercentage: '10',
    newAdvance: ''
  });
  
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  useEffect(() => {
    loadData();
  }, [user]);
  
  const loadData = async () => {
    if (!user) {
      console.log('TenantsPage: No user found, skipping data load');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('TenantsPage: Starting data load for user:', user.id);
      setIsLoading(true);
      
      console.log('TenantsPage: Fetching properties...');
      const props = await dataService.getProperties(user.id);
      console.log('TenantsPage: Properties loaded:', props.length);
      
      console.log('TenantsPage: Fetching tenancies...');
      const tens = await dataService.getTenancies(user.id);
      console.log('TenantsPage: Tenancies loaded:', tens.length);
      console.log('TenantsPage: First tenancy (if any):', tens[0]);
      
      console.log('TenantsPage: Fetching parent properties...');
      const parents = await dataService.getParentProperties(user.id);
      console.log('TenantsPage: Parent properties loaded:', parents.length);
      
      console.log('TenantsPage: Fetching payments...');
      const allPayments = await dataService.getPayments(user.id);
      console.log('TenantsPage: Payments loaded:', allPayments.length);
      
      setProperties(props);
      setTenancies(tens);
      setParentProperties(parents);
      setPayments(allPayments);
      
      // Use profileId from tenancies (new schema) with fallback to tenantId (old schema)
      const tenantIds = tens.map(t => t.profileId || t.tenantId).filter(Boolean);
      console.log('TenantsPage: Tenant IDs from tenancies:', tenantIds);
      
      try {
        console.log('TenantsPage: Fetching users/profiles...');
        const allUsers = await dataService.getUsers(user.id);
        console.log('TenantsPage: Users loaded:', allUsers.length);
        console.log('TenantsPage: All users:', allUsers.map(u => ({ id: u.id, name: u.name })));
        
        const tenantUsers = allUsers.filter(u => tenantIds.includes(u.id));
        console.log('TenantsPage: Filtered tenant users:', tenantUsers.length);
        console.log('TenantsPage: Filtered users objects:', tenantUsers.map(u => ({ id: u.id, name: u.name })));
        setTenants(tenantUsers);
      } catch (userError) {
        console.warn('TenantsPage: Failed to load users (profiles table may not exist):', userError);
        // If profiles table doesn't exist, just set empty array
        setTenants([]);
        toast.warning('Tenant profiles unavailable. Please run the database migration.');
      }
      
      setIsLoading(false);
      console.log('TenantsPage: Data load complete.');
    } catch (error) {
      console.error('TenantsPage: Error loading data:', error);
      toast.error('Failed to load tenant data.');
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      propertyId: '',
      tenantName: '',
      tenantEmail: '',
      tenantPhone: '',
      startDate: '',
      rentAmount: '',
      rentFrequency: 'monthly',
      securityDeposit: '',
      advancePayment: ''
    });
  };
  
  const handleAssignTenant = async () => {
    if (!formData.propertyId || !formData.tenantName || !formData.tenantEmail || !formData.startDate || !formData.rentAmount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      console.log('handleAssignTenant: Starting tenant assignment...');
      const property = properties.find(p => p.id === formData.propertyId);
      if (!property) {
        toast.error('Property not found');
        return;
      }
      
      // Check if property already has an active tenancy
      const existingActiveTenancy = tenancies.find(
        t => t.propertyId === formData.propertyId && t.status === 'active'
      );
      
      if (existingActiveTenancy) {
        toast.error('This property already has an active tenant. Please end the existing tenancy first.');
        return;
      }
      
      // Create or get tenant user
      console.log('handleAssignTenant: Checking if tenant exists:', formData.tenantEmail);
      if (!user) throw new Error('User not authenticated');
      let tenant = await dataService.getUserByEmail(formData.tenantEmail, user.id);
      
      if (!tenant) {
        console.log('handleAssignTenant: Creating new tenant profile...');
        // Create new tenant user
        const newTenant = {
          name: formData.tenantName,
          email: formData.tenantEmail,
          phone: formData.tenantPhone || undefined,
          role: 'TENANT' as const,
          createdBy: user.id
        };
        tenant = await dataService.addUser(newTenant);
        console.log('handleAssignTenant: Tenant created:', tenant);
      } else {
        console.log('handleAssignTenant: Existing tenant found:', tenant);
      }
      
      const startDate = parseISO(formData.startDate);
      
      // Default due day is 5th of every month
      const dueDay = property.dueDay || 5;
      
      // Calculate next due date and prorated amount
      let nextDueDate: Date;
      let proratedAmount = 0;
      
      if (formData.rentFrequency === 'monthly') {
        // Set to the due day in the start month
        const dueDateInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth(), dueDay);
        
        // If tenant starts after the due day, calculate prorated rent
        if (startDate.getDate() > dueDay) {
          // First full rent is due next month
          nextDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, dueDay);
          
          // Calculate prorated rent for partial month
          const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
          const daysOccupied = daysInMonth - startDate.getDate() + 1; // +1 to include start day
          const rentPerDay = parseFloat(formData.rentAmount) / daysInMonth;
          proratedAmount = Math.round(rentPerDay * daysOccupied);
          
          console.log('Prorated rent calculation:', {
            startDate: format(startDate, 'yyyy-MM-dd'),
            daysInMonth,
            daysOccupied,
            rentPerDay: rentPerDay.toFixed(2),
            proratedAmount
          });
        } else {
          // Tenant starts before or on due day, first rent due this month
          nextDueDate = dueDateInStartMonth;
        }
      } else {
        // For yearly, add 1 year from start date
        nextDueDate = addYears(startDate, 1);
      }
      
      console.log('handleAssignTenant: Creating tenancy...', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        nextDueDate: format(nextDueDate, 'yyyy-MM-dd'),
        dueDay,
        proratedAmount
      });
      // Create tenancy
      const newTenancy = {
        propertyId: formData.propertyId,
        profileId: tenant.id,
        ownerId: user!.id,
        startDate: format(startDate, 'yyyy-MM-dd'),
        rentAmount: parseFloat(formData.rentAmount),
        rentFrequency: formData.rentFrequency,
        securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
        advanceBalance: formData.advancePayment ? parseFloat(formData.advancePayment) : 0,
        nextDueDate: format(nextDueDate, 'yyyy-MM-dd')
      };
      
      const createdTenancy = await dataService.addTenancy(newTenancy);
      console.log('handleAssignTenant: Tenancy created', createdTenancy);
      
      // If there's a prorated amount, record it as the first payment
      if (proratedAmount > 0) {
        const tenantId = tenant.id;
        await dataService.createPayment({
          tenancyId: createdTenancy.id,
          propertyId: formData.propertyId,
          tenantId: tenantId,
          profileId: tenantId,
          ownerId: user!.id,
          amount: proratedAmount,
          date: format(startDate, 'yyyy-MM-dd'),
          method: 'cash',
          advanceUsed: 0,
          notes: `Prorated rent for ${format(startDate, 'MMM d')} - ${format(new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0), 'MMM d, yyyy')} (${Math.round((proratedAmount / parseFloat(formData.rentAmount)) * 100)}% of monthly rent)`
        });
        console.log('handleAssignTenant: Prorated payment recorded');
        
        toast.success(`Tenant assigned! Prorated rent of ₹${proratedAmount.toLocaleString()} recorded for partial month.`);
      } else {
        toast.success('Tenant assigned successfully!');
      }
      
      await dataService.updateProperty(property.id, { status: 'occupied' });
      console.log('handleAssignTenant: Property marked as occupied');
      
      // Show credentials dialog if tenant was newly created with password
      console.log('handleAssignTenant: Checking for credentials...', 'tempPassword' in tenant, tenant);
      if ('tempPassword' in tenant && tenant.tempPassword) {
        console.log('handleAssignTenant: Showing credentials dialog');
        setTenantCredentials({
          email: tenant.email,
          password: String(tenant.tempPassword),
          name: tenant.name
        });
        setShowCredentialsDialog(true);
      } else {
        console.log('handleAssignTenant: No tempPassword found in tenant object');
      }
      
      // Only show generic success if prorated payment wasn't already shown
      if (proratedAmount === 0) {
        toast.success('Tenant assigned successfully!');
      }
      setShowAssignDialog(false);
      resetForm();
      await loadData();
      console.log('handleAssignTenant: Complete!');
    } catch (error) {
      console.error('handleAssignTenant: Error:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error('Failed to assign tenant: ' + errorMessage);
    }
  };
  
  const handleConfirmPayment = async () => {
    if (!confirmingPayment || !user) return;
    
    try {
      const profileId = confirmingPayment.tenancy.profileId || confirmingPayment.tenancy.tenantId;
      
      if (!profileId) {
        toast.error('Tenant ID not found');
        return;
      }
      
      // Find the tenant profile to get the user_id for the payment record
      const tenantProfile = tenants.find(t => t.id === profileId);
      if (!tenantProfile) {
        toast.error('Tenant profile not found');
        return;
      }
      
      // Get only selected months
      const selectedMonthIndices = confirmingPayment.selectedMonths
        .map((selected, index) => selected ? index : -1)
        .filter(index => index !== -1);
      
      if (selectedMonthIndices.length === 0) {
        toast.error('Please select at least one month to pay');
        return;
      }
      
      console.log('Recording payments for months:', selectedMonthIndices.map(i => confirmingPayment.months[i]));
      console.log('Tenant profile:', tenantProfile);
      
      // Record payments for each selected month
      for (const i of selectedMonthIndices) {
        console.log('Creating payment for:', confirmingPayment.months[i]);
        await dataService.createPayment({
          tenancyId: confirmingPayment.tenancy.id,
          propertyId: confirmingPayment.tenancy.propertyId,
          tenantId: profileId,
          profileId: profileId,
          ownerId: user.id,
          amount: confirmingPayment.amount,
          date: format(new Date(), 'yyyy-MM-dd'),
          method: 'cash',
          advanceUsed: 0,
          notes: `Rent payment for ${confirmingPayment.months[i]}`
        });
      }
      
      // Update next due date by adding the number of selected months paid
      const currentDue = parseISO(confirmingPayment.tenancy.nextDueDate);
      const newDueDate = confirmingPayment.tenancy.rentFrequency === 'monthly' 
        ? addMonths(currentDue, selectedMonthIndices.length)
        : addYears(currentDue, selectedMonthIndices.length);
      
      await dataService.updateTenancy(confirmingPayment.tenancy.id, {
        nextDueDate: format(newDueDate, 'yyyy-MM-dd')
      });
      
      toast.success(`${selectedMonthIndices.length} payment${selectedMonthIndices.length > 1 ? 's' : ''} recorded successfully!`);
      setShowPaymentConfirmDialog(false);
      setConfirmingPayment(null);
      await loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error('Failed to record payment: ' + errorMessage);
    }
  };
  
  const handleEndTenancy = async (tenancy: Tenancy) => {
    try {
      await dataService.updateTenancy(tenancy.id, { status: 'ended' });
      await dataService.updateProperty(tenancy.propertyId, { status: 'vacant' });
      toast.success('Tenancy ended');
      loadData();
    } catch (error) {
      console.error('Error ending tenancy:', error);
      toast.error('Failed to end tenancy');
    }
  };
  
  const handleRenewLease = async () => {
    if (!renewingTenancy) return;
    
    const duration = parseInt(renewalFormData.duration);
    const currentRent = renewingTenancy.rentAmount;
    const incrementPercentage = renewalFormData.applyIncrement ? parseFloat(renewalFormData.incrementPercentage) / 100 : 0;
    const newRent = Math.round(currentRent * (1 + incrementPercentage));
    
    // Calculate new end date
    const currentEndDate = renewingTenancy.endDate ? parseISO(renewingTenancy.endDate) : new Date();
    const newEndDate = addYears(currentEndDate, duration);
    
    // Calculate new next due date
    const newNextDueDate = renewingTenancy.rentFrequency === 'monthly' 
      ? addMonths(parseISO(renewingTenancy.nextDueDate), 1)
      : addYears(parseISO(renewingTenancy.nextDueDate), 1);
    
    // Calculate advance
    const newAdvance = renewalFormData.newAdvance ? parseFloat(renewalFormData.newAdvance) : 0;
    
    // Update tenancy
    try {
      await dataService.updateTenancy(renewingTenancy.id, {
        rentAmount: newRent,
        nextDueDate: newNextDueDate.toISOString().split('T')[0],
        advanceBalance: renewingTenancy.advanceBalance + newAdvance
      });
      
      toast.success(`Lease renewed! New rent: ₹${newRent.toLocaleString()}`);
      setShowRenewalDialog(false);
      setRenewingTenancy(null);
      setRenewalFormData({
        duration: '1',
        applyIncrement: true,
        incrementPercentage: '10',
        newAdvance: ''
      });
      loadData();
    } catch (error) {
      console.error('Error renewing lease:', error);
      toast.error('Failed to renew lease');
    }
  };
  
  const openRenewalDialog = (tenancy: Tenancy) => {
    setRenewingTenancy(tenancy);
    setShowRenewalDialog(true);
  };
  
  const openEditDialog = (tenant: User, tenancy: Tenancy) => {
    setEditingTenant({ user: tenant, tenancy });
    setEditFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || ''
    });
    setShowEditDialog(true);
  };
  
  const handleEditTenant = async () => {
    if (!editingTenant || !editFormData.name || !editFormData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      // Update user information
      await dataService.updateUser(editingTenant.user.id, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone
      });
      
      toast.success('Tenant information updated');
      setShowEditDialog(false);
      setEditingTenant(null);
      loadData();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    }
  };
  
  const handleDeleteTenant = async (tenant: User, tenancy: Tenancy) => {
    if (!confirm(`Are you sure you want to delete ${tenant.name}? This will end the tenancy and remove the tenant account.`)) {
      return;
    }
    
    try {
      // End the tenancy first
      await dataService.updateTenancy(tenancy.id, { status: 'ended' });
      await dataService.updateProperty(tenancy.propertyId, { status: 'vacant' });
      
      // Delete the user account
      await dataService.deleteUser(tenant.id);
      
      toast.success('Tenant deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Failed to delete tenant');
    }
  };
  
  const vacantProperties = properties.filter(p => p.status === 'vacant');
  const activeTenancies = tenancies.filter(t => t.status === 'active');
  
  // Filter tenancies based on search and filters
  const filteredTenancies = activeTenancies.filter(tenancy => {
    const property = properties.find(p => p.id === tenancy.propertyId);
    const tenant = tenants.find(t => t.id === (tenancy.profileId || tenancy.tenantId));
    const parentProperty = property ? parentProperties.find(pp => pp.id === property.parentPropertyId) : null;
    const tenantStatus = getTenantStatus(tenancy);
    
    // Search filter
    const matchesSearch = !searchTerm || 
      (tenant?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property?.unitName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (parentProperty?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Payment status filter
    const matchesPaymentStatus = filterPaymentStatus === 'all' || tenantStatus.status === filterPaymentStatus;
    
    // Parent property filter
    const matchesParentProperty = filterParentProperty === 'all' || property?.parentPropertyId === filterParentProperty;
    
    return matchesSearch && matchesPaymentStatus && matchesParentProperty;
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl">Tenants</h1>
          <p className="text-muted-foreground">
            Manage tenant assignments and information
          </p>
        </div>
        <Dialog open={showAssignDialog} onOpenChange={(open) => {
          setShowAssignDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              disabled={isLoading || vacantProperties.length === 0}
              title={isLoading ? 'Loading properties...' : vacantProperties.length === 0 ? 'No vacant properties available. Add a property first.' : 'Assign a tenant to a vacant property'}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isLoading ? 'Loading...' : 'Assign Tenant'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Tenant to Property</DialogTitle>
              <DialogDescription>
                Assign a tenant to a vacant property and set the rent details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="property">Select Property *</Label>
                <Select value={formData.propertyId} onValueChange={(value) => {
                  const property = vacantProperties.find(p => p.id === value);
                  setFormData({
                    ...formData, 
                    propertyId: value,
                    rentAmount: property ? property.rentAmount.toString() : '',
                    rentFrequency: property ? property.rentFrequency : 'monthly'
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vacant property" />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantProperties.map(p => {
                      const parent = parentProperties.find(pp => pp.id === p.parentPropertyId);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {parent?.name || 'Unknown'} - {p.unitName} - ₹{p.rentAmount}/{p.rentFrequency}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tenantName">Tenant Name *</Label>
                <Input
                  id="tenantName"
                  value={formData.tenantName}
                  onChange={(e) => setFormData({...formData, tenantName: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Tenant Email *</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  value={formData.tenantEmail}
                  onChange={(e) => setFormData({...formData, tenantEmail: e.target.value})}
                  placeholder="tenant@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Used for login. If new, default password: tenant123
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tenantPhone">Phone Number</Label>
                <Input
                  id="tenantPhone"
                  type="tel"
                  value={formData.tenantPhone}
                  onChange={(e) => setFormData({...formData, tenantPhone: e.target.value})}
                  placeholder="+1234567890"
                />
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Rent Details</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="rentAmount">Rent Amount *</Label>
                    <Input
                      id="rentAmount"
                      type="number"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({...formData, rentAmount: e.target.value})}
                      placeholder="25000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rentFrequency">Payment Frequency *</Label>
                    <Select 
                      value={formData.rentFrequency} 
                      onValueChange={(value: 'monthly' | 'yearly') => setFormData({...formData, rentFrequency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startDate">Tenancy Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  value={formData.securityDeposit}
                  onChange={(e) => setFormData({...formData, securityDeposit: e.target.value})}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="advance">Advance Payment</Label>
                <Input
                  id="advance"
                  type="number"
                  value={formData.advancePayment}
                  onChange={(e) => setFormData({...formData, advancePayment: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAssignDialog(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleAssignTenant}>
                Assign Tenant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Filters & Search */}
      {activeTenancies.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Search Tenants</Label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active (Up to Date)</SelectItem>
                    <SelectItem value="pending">Due Soon</SelectItem>
                    <SelectItem value="late">Late/Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Parent Property</Label>
                <Select value={filterParentProperty} onValueChange={setFilterParentProperty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {parentProperties.map(parent => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterPaymentStatus('all');
                    setFilterParentProperty('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tenants List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tenants...</p>
            </CardContent>
          </Card>
        ) : activeTenancies.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg mb-2">No Active Tenants</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {vacantProperties.length > 0 
                  ? "Start by assigning tenants to your vacant properties"
                  : "Add properties first, then assign tenants"
                }
              </p>
              {vacantProperties.length > 0 && (
                <Button onClick={() => setShowAssignDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Tenant
                </Button>
              )}
            </CardContent>
          </Card>
        ) : filteredTenancies.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg mb-2">No Tenants Match Your Filters</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterPaymentStatus('all');
                  setFilterParentProperty('all');
                }}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTenancies.map(tenancy => {
            const property = properties.find(p => p.id === tenancy.propertyId);
            const tenant = tenants.find(t => t.id === (tenancy.profileId || tenancy.tenantId));
            const parentProperty = property ? parentProperties.find(pp => pp.id === property.parentPropertyId) : null;
            const tenantStatus = getTenantStatus(tenancy);
            const tenancyPayments = payments.filter(p => p.tenancyId === tenancy.id);
            const totalPaid = tenancyPayments.reduce((sum, p) => sum + p.amount, 0);
            
            if (!property || !tenant) return null;
            
            return (
              <Card key={tenancy.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{tenant.email}</p>
                      {tenant.phone && (
                        <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                      )}
                    </div>
                    <Badge variant={tenantStatus.variant}>
                      {tenantStatus.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">Property</span>
                      </div>
                      <p className="text-sm font-medium">{parentProperty?.name || 'Unknown'}</p>
                      <p className="text-xs text-blue-600">{property.unitName}</p>
                      {property.unitDetails && (
                        <p className="text-xs text-muted-foreground">{property.unitDetails}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{parentProperty?.address || ''}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <IndianRupee className="h-4 w-4" />
                        <span className="text-sm">Rent Details</span>
                      </div>
                      <p className="text-sm font-semibold">
                        ₹{tenancy.rentAmount.toLocaleString()}/{tenancy.rentFrequency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Advance: ₹{tenancy.advanceBalance.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Security: ₹{tenancy.securityDeposit.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Payment Status</span>
                      </div>
                      <p className={`text-sm font-medium ${tenantStatus.status === 'late' ? 'text-red-600' : 'text-green-600'}`}>
                        {tenantStatus.status === 'late' ? 'Overdue' : 'Up to Date'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Next Due: {format(parseISO(tenancy.nextDueDate), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started: {format(parseISO(tenancy.startDate), 'MMM yyyy')}
                      </p>
                      
                      {/* Rent Due Button */}
                      <div className="mt-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant={tenantStatus.status === 'late' ? 'destructive' : 'default'}
                          className="w-full text-xs"
                          onClick={() => {
                            // Calculate all overdue months
                            const today = new Date();
                            today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
                            const dueDate = parseISO(tenancy.nextDueDate);
                            dueDate.setHours(0, 0, 0, 0); // Reset to start of day
                            
                            console.log('Payment Calculation:', {
                              tenantStartDate: tenancy.startDate,
                              nextDueDate: tenancy.nextDueDate,
                              today: format(today, 'yyyy-MM-dd'),
                              dueDate: format(dueDate, 'yyyy-MM-dd')
                            });
                            
                            const months: string[] = [];
                            let currentDue = new Date(dueDate);
                            
                            // Count months where due date has passed
                            while (currentDue < today) {
                              const monthName = format(currentDue, 'MMMM yyyy');
                              console.log('Adding overdue month:', monthName, 'due on', format(currentDue, 'yyyy-MM-dd'));
                              months.push(monthName);
                              if (tenancy.rentFrequency === 'monthly') {
                                currentDue = addMonths(currentDue, 1);
                              } else {
                                currentDue = addYears(currentDue, 1);
                              }
                            }
                            
                            console.log('Total overdue months:', months.length, months);
                            
                            // If no overdue months, it means payment is for current/next period
                            if (months.length === 0) {
                              months.push(format(dueDate, 'MMMM yyyy'));
                            }
                            
                            const totalAmount = tenancy.rentAmount * months.length;
                            
                            setConfirmingPayment({
                              tenancy,
                              amount: tenancy.rentAmount,
                              totalAmount,
                              months,
                              monthCount: months.length,
                              selectedMonths: new Array(months.length).fill(true) // All selected by default
                            });
                            setShowPaymentConfirmDialog(true);
                          }}
                        >
                          <IndianRupee className="h-3 w-3 mr-1" />
                          {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0); // Reset to start of day
                            const dueDate = parseISO(tenancy.nextDueDate);
                            dueDate.setHours(0, 0, 0, 0); // Reset to start of day
                            let monthCount = 0;
                            let currentDue = new Date(dueDate);
                            
                            while (currentDue < today) {
                              monthCount++;
                              if (tenancy.rentFrequency === 'monthly') {
                                currentDue = addMonths(currentDue, 1);
                              } else {
                                currentDue = addYears(currentDue, 1);
                              }
                            }
                            
                            if (monthCount === 0) monthCount = 1;
                            const total = tenancy.rentAmount * monthCount;
                            
                            return monthCount > 1 
                              ? `₹${total.toLocaleString()} (${monthCount} ${tenancy.rentFrequency === 'monthly' ? 'months' : 'periods'})`
                              : `₹${tenancy.rentAmount.toLocaleString()} - ${format(dueDate, 'MMM yyyy')}`;
                          })()}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <IndianRupee className="h-4 w-4" />
                        <span className="text-sm">Payment History</span>
                      </div>
                      <p className="text-sm font-semibold text-green-600">
                        ₹{totalPaid.toLocaleString()} paid
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tenancyPayments.length} payment{tenancyPayments.length !== 1 ? 's' : ''}
                      </p>
                      {tenancyPayments.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Last: {format(parseISO(tenancyPayments[0].date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openRenewalDialog(tenancy)}
                    >
                      Renew Lease
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(tenant, tenancy)}
                    >
                      Edit Tenant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEndTenancy(tenancy)}
                    >
                      End Tenancy
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTenant(tenant, tenancy)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      {/* Lease Renewal Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={(open) => {
        setShowRenewalDialog(open);
        if (!open) {
          setRenewingTenancy(null);
          setRenewalFormData({
            duration: '1',
            applyIncrement: true,
            incrementPercentage: '10',
            newAdvance: ''
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renew Lease Agreement</DialogTitle>
            <DialogDescription>
              Review and confirm the lease renewal terms
            </DialogDescription>
          </DialogHeader>
          {renewingTenancy && (
            <div className="space-y-4">
              {/* Current Lease Info */}
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <h3 className="font-medium text-sm">Current Lease Terms</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Rent</p>
                    <p className="font-medium">₹{renewingTenancy.rentAmount.toLocaleString()}/{renewingTenancy.rentFrequency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Renewals</p>
                    <p className="font-medium">{renewingTenancy.renewalCount || 0} times</p>
                  </div>
                  {renewingTenancy.originalRent && (
                    <div>
                      <p className="text-muted-foreground">Original Rent</p>
                      <p className="font-medium">₹{renewingTenancy.originalRent.toLocaleString()}</p>
                    </div>
                  )}
                  {renewingTenancy.endDate && (
                    <div>
                      <p className="text-muted-foreground">Current End Date</p>
                      <p className="font-medium">{format(parseISO(renewingTenancy.endDate), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Renewal Options */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Renewal Duration (Years)</Label>
                    <Select value={renewalFormData.duration} onValueChange={(value) => setRenewalFormData({...renewalFormData, duration: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Year</SelectItem>
                        <SelectItem value="2">2 Years</SelectItem>
                        <SelectItem value="3">3 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="increment">Rent Increment (%)</Label>
                    <Input
                      id="increment"
                      type="number"
                      value={renewalFormData.incrementPercentage}
                      onChange={(e) => setRenewalFormData({...renewalFormData, incrementPercentage: e.target.value})}
                      disabled={!renewalFormData.applyIncrement}
                      placeholder="10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="applyIncrement"
                    checked={renewalFormData.applyIncrement}
                    onChange={(e) => setRenewalFormData({...renewalFormData, applyIncrement: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="applyIncrement">Apply automatic rent increment</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newAdvance">Additional Advance Payment (Optional)</Label>
                  <Input
                    id="newAdvance"
                    type="number"
                    value={renewalFormData.newAdvance}
                    onChange={(e) => setRenewalFormData({...renewalFormData, newAdvance: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* New Terms Preview */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2">
                <h3 className="font-medium text-sm text-blue-900">New Lease Terms</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-blue-700">New Rent Amount</p>
                    <p className="font-bold text-lg text-blue-900">
                      ₹{(() => {
                        const incrementPercentage = renewalFormData.applyIncrement ? parseFloat(renewalFormData.incrementPercentage) / 100 : 0;
                        return Math.round(renewingTenancy.rentAmount * (1 + incrementPercentage)).toLocaleString();
                      })()}
                    </p>
                    {renewalFormData.applyIncrement && (
                      <p className="text-xs text-blue-600">
                        +₹{(() => {
                          const incrementPercentage = parseFloat(renewalFormData.incrementPercentage) / 100;
                          return Math.round(renewingTenancy.rentAmount * incrementPercentage).toLocaleString();
                        })()} ({renewalFormData.incrementPercentage}% increase)
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-blue-700">New End Date</p>
                    <p className="font-medium text-blue-900">
                      {(() => {
                        const currentEndDate = renewingTenancy.endDate ? parseISO(renewingTenancy.endDate) : new Date();
                        const newEndDate = addYears(currentEndDate, parseInt(renewalFormData.duration));
                        return format(newEndDate, 'MMM d, yyyy');
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">Duration</p>
                    <p className="font-medium text-blue-900">{renewalFormData.duration} Year{renewalFormData.duration !== '1' ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Total Advance</p>
                    <p className="font-medium text-blue-900">
                      ₹{(renewingTenancy.advanceBalance + (renewalFormData.newAdvance ? parseFloat(renewalFormData.newAdvance) : 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenewLease}>
              Confirm Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Tenant Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setEditingTenant(null);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant Information</DialogTitle>
            <DialogDescription>
              Update tenant contact details and information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Tenant Name *</Label>
              <Input
                id="editName"
                value={editFormData.name}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email Address *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                placeholder="tenant@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone Number</Label>
              <Input
                id="editPhone"
                type="tel"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                placeholder="+1234567890"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTenant}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🎉 Tenant Account Created!</DialogTitle>
            <DialogDescription>
              Share these login credentials with the tenant so they can access their dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tenant Name</p>
                <p className="text-base sm:text-lg font-semibold break-words">{tenantCredentials?.name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Email / Username</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded border text-xs sm:text-sm break-all">
                    {tenantCredentials?.email}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      navigator.clipboard.writeText(tenantCredentials?.email || '');
                      toast.success('Email copied!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Temporary Password</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded border text-xs sm:text-sm font-mono break-all">
                    {tenantCredentials?.password}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      navigator.clipboard.writeText(tenantCredentials?.password || '');
                      toast.success('Password copied!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> The tenant should change this password after their first login. 
                They can login at the same portal you use.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCredentialsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentConfirmDialog} onOpenChange={(open) => {
        setShowPaymentConfirmDialog(open);
        if (!open) setConfirmingPayment(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Rent Payment</DialogTitle>
            <DialogDescription>
              Please confirm that the rent payment has been received
            </DialogDescription>
          </DialogHeader>
          {confirmingPayment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Per {confirmingPayment.tenancy.rentFrequency === 'monthly' ? 'Month' : 'Year'} Rent</span>
                  <span className="text-sm font-medium">₹{confirmingPayment.amount.toLocaleString()}</span>
                </div>
                
                <div className="border-t pt-3">
                  <span className="text-sm font-medium mb-2 block">Select Months to Pay:</span>
                  <div className="space-y-2">
                    {confirmingPayment.months.map((month, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded">
                        <input
                          type="checkbox"
                          checked={confirmingPayment.selectedMonths[idx]}
                          onChange={(e) => {
                            const newSelected = [...confirmingPayment.selectedMonths];
                            newSelected[idx] = e.target.checked;
                            setConfirmingPayment({
                              ...confirmingPayment,
                              selectedMonths: newSelected,
                              totalAmount: newSelected.filter(s => s).length * confirmingPayment.amount
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm flex-1">{month}</span>
                        <span className="text-sm font-medium">₹{confirmingPayment.amount.toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium">Total Amount</span>
                  <span className="text-xl font-bold">₹{(confirmingPayment.selectedMonths.filter(s => s).length * confirmingPayment.amount).toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Date</span>
                  <span className="text-sm font-medium">{format(new Date(), 'MMM d, yyyy')}</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                This will record {confirmingPayment.selectedMonths.filter(s => s).length} payment{confirmingPayment.selectedMonths.filter(s => s).length > 1 ? 's' : ''} and update the next due date accordingly.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentConfirmDialog(false);
                setConfirmingPayment(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment}>
              Confirm Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};