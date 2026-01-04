import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Property, ParentProperty, Tenancy } from '../utils/db';
import { dataService, LegacyUser, LegacyPayment } from '../utils/dataService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Building2, Plus, Edit, Trash2, Download, Search, ChevronDown, ChevronUp, LayoutGrid, List, Home, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { exportPropertiesToExcel } from '../utils/excel';
import { toast } from 'sonner';
import { UnitDetailDialog } from './UnitDetailDialog';

export const PropertiesPage: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [parentProperties, setParentProperties] = useState<ParentProperty[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [tenants, setTenants] = useState<LegacyUser[]>([]);
  const [payments, setPayments] = useState<LegacyPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // Unit Detail Dialog
  const [selectedUnit, setSelectedUnit] = useState<Property | null>(null);
  const [showUnitDetail, setShowUnitDetail] = useState(false);
  
  // Parent Property Dialog
  const [showAddParentDialog, setShowAddParentDialog] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentProperty | null>(null);
  const [deletingParent, setDeletingParent] = useState<ParentProperty | null>(null);
  const [deleteParentConfirmText, setDeleteParentConfirmText] = useState('');
  const [parentFormData, setParentFormData] = useState({
    name: '',
    address: ''
  });
  
  // Unit Dialog
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Property | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Property | null>(null);
  const [deleteUnitConfirmText, setDeleteUnitConfirmText] = useState('');
  const [unitFormData, setUnitFormData] = useState({
    parentPropertyId: '',
    unitName: '',
    unitDetails: '',
    type: '' as Property['type'] | '',
    rentAmount: '',
    rentFrequency: 'monthly' as Property['rentFrequency'],
    dueDay: '1',
    notes: ''
  });
  
  useEffect(() => {
    loadData();
  }, [user]);
  
  const loadData = async () => {
    if (user) {
      setIsLoading(true);
      try {
        const [props, parents, tens, pays] = await Promise.all([
          dataService.getProperties(user.id),
          dataService.getParentProperties(user.id),
          dataService.getTenancies(user.id),
          dataService.getPayments(user.id)
        ]);
        setProperties(props);
        setParentProperties(parents);
        setPayments(pays);
        
        // Load tenant profiles
        try {
          const users = await dataService.getUsers(user.id);
          setTenants(users);
        } catch (error) {
          console.warn('Could not load tenant profiles:', error);
          setTenants([]);
        }
        setTenancies(tens);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load properties data');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Parent Property Functions
  const resetParentForm = () => {
    setParentFormData({ name: '', address: '' });
    setEditingParent(null);
  };
  
  const handleEditParent = (parent: ParentProperty) => {
    setEditingParent(parent);
    setParentFormData({
      name: parent.name,
      address: parent.address
    });
    setShowAddParentDialog(true);
  };
  
  const handleSubmitParent = async () => {
    if (!parentFormData.name || !parentFormData.address) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    try {
      if (editingParent) {
        await dataService.updateParentProperty(editingParent.id, {
          name: parentFormData.name,
          address: parentFormData.address
        });
        toast.success('Parent property updated successfully');
      } else {
        await dataService.createParentProperty(
          user!.id,
          parentFormData.name,
          parentFormData.address
        );
        toast.success('Parent property added successfully');
      }
      
      await loadData();
      setShowAddParentDialog(false);
      resetParentForm();
    } catch (error) {
      console.error('Error saving parent property:', error);
      toast.error('Failed to save parent property');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteParent = async () => {
    if (deletingParent) {
      // Check if there are units under this parent
      const hasUnits = properties.some(p => p.parentPropertyId === deletingParent.id);
      if (hasUnits) {
        toast.error('Cannot delete parent property with existing units');
        return;
      }
      
      setIsLoading(true);
      try {
        await dataService.deleteParentProperty(deletingParent.id);
        toast.success('Parent property deleted successfully');
        await loadData();
        setDeletingParent(null);
      } catch (error) {
        console.error('Error deleting parent property:', error);
        toast.error('Failed to delete parent property');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Unit Functions
  const resetUnitForm = () => {
    setUnitFormData({
      parentPropertyId: '',
      unitName: '',
      unitDetails: '',
      type: '' as Property['type'] | '',
      rentAmount: '',
      rentFrequency: 'monthly',
      dueDay: '1',
      notes: ''
    });
    setEditingUnit(null);
  };

  const handleAddUnitToParent = (parentId: string) => {
    setUnitFormData({
      parentPropertyId: parentId,
      unitName: '',
      unitDetails: '',
      type: '' as Property['type'] | '',
      rentAmount: '',
      rentFrequency: 'monthly',
      dueDay: '1',
      notes: ''
    });
    setEditingUnit(null);
    setShowAddUnitDialog(true);
  };
  
  const handleEditUnit = (unit: Property) => {
    setEditingUnit(unit);
    setUnitFormData({
      parentPropertyId: unit.parentPropertyId,
      unitName: unit.unitName,
      unitDetails: unit.unitDetails || '',
      type: unit.type,
      rentAmount: unit.rentAmount.toString(),
      rentFrequency: unit.rentFrequency,
      dueDay: unit.dueDay?.toString() || '1',
      notes: unit.notes || ''
    });
    setShowAddUnitDialog(true);
  };
  
  const handleSubmitUnit = async () => {
    if (!unitFormData.parentPropertyId || !unitFormData.unitName || !unitFormData.type || !unitFormData.rentAmount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    try {
      if (editingUnit) {
        await dataService.updateProperty(editingUnit.id, {
          unitName: unitFormData.unitName,
          unitDetails: unitFormData.unitDetails,
          type: unitFormData.type as any,
          rentAmount: parseFloat(unitFormData.rentAmount),
          rentFrequency: unitFormData.rentFrequency
        });
        toast.success('Unit updated successfully');
      } else {
        const parentProperty = parentProperties.find(p => p.id === unitFormData.parentPropertyId);
        await dataService.createProperty({
          parentPropertyId: unitFormData.parentPropertyId,
          ownerId: user!.id,
          unitName: unitFormData.unitName,
          unitDetails: unitFormData.unitDetails,
          type: unitFormData.type as any,
          rentAmount: parseFloat(unitFormData.rentAmount),
          rentFrequency: unitFormData.rentFrequency,
          dueDay: parseInt(unitFormData.dueDay) || 1,
          status: 'vacant'
        });
        toast.success(`Unit "${unitFormData.unitName}" added successfully to ${parentProperty?.name || 'parent property'}`);
      }
      
      await loadData();
      setShowAddUnitDialog(false);
      resetUnitForm();
    } catch (error) {
      console.error('Error saving unit:', error);
      toast.error('Failed to save unit');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteUnit = async () => {
    if (deletingUnit) {
      const tenancy = tenancies.find(t => t.propertyId === deletingUnit.id && t.status === 'active');
      if (tenancy) {
        const tenantId = tenancy.profileId || tenancy.tenantId;
        const tenant = tenantId ? tenants.find(t => t.id === tenantId) : null;
        toast.error(
          `Cannot delete unit with active tenancy. Please end the tenancy for ${tenant?.name || 'Unknown Tenant'} (${tenant?.email || 'No email'}) first.`,
          { duration: 5000 }
        );
        return;
      }
      
      setIsLoading(true);
      try {
        await dataService.deleteProperty(deletingUnit.id);
        toast.success('Unit deleted successfully');
        await loadData();
        setDeletingUnit(null);
        setDeleteUnitConfirmText('');
      } catch (error) {
        console.error('Error deleting unit:', error);
        toast.error('Failed to delete unit');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const toggleGroup = (parentId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId);
    } else {
      newExpanded.add(parentId);
    }
    setExpandedGroups(newExpanded);
  };
  
  // Filter properties
  const filteredProperties = properties.filter(p => {
    const parent = parentProperties.find(pp => pp.id === p.parentPropertyId);
    const matchesSearch = (parent?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (parent?.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });
  
  // Group properties by parent
  const groupedProperties = () => {
    const groups = new Map<string, Property[]>();
    filteredProperties.forEach(p => {
      if (!groups.has(p.parentPropertyId)) {
        groups.set(p.parentPropertyId, []);
      }
      groups.get(p.parentPropertyId)!.push(p);
    });
    return groups;
  };
  
  // Calculate group statistics
  const getGroupStats = (units: Property[]) => {
    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.status === 'occupied').length;
    const totalRent = units.reduce((sum, u) => {
      const tenancy = tenancies.find(t => t.propertyId === u.id && t.status === 'active');
      return tenancy ? sum + tenancy.rentAmount : sum;
    }, 0);
    
    return { totalUnits, occupiedUnits, totalRent };
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl">Properties</h1>
          <p className="text-muted-foreground">
            Manage your parent properties and rental units
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportPropertiesToExcel(properties)} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          {/* Add Parent Property */}
          <Dialog open={showAddParentDialog} onOpenChange={(open) => {
            setShowAddParentDialog(open);
            if (!open) resetParentForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Add Parent Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingParent ? 'Edit' : 'Add'} Parent Property</DialogTitle>
                <DialogDescription>
                  Create a parent property to group your rental units. Each parent property has a name and address.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Property Name *</Label>
                  <Input
                    id="parentName"
                    value={parentFormData.name}
                    onChange={(e) => setParentFormData({...parentFormData, name: e.target.value})}
                    placeholder="CBS Complex, Industrial Park, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentAddress">Address *</Label>
                  <Textarea
                    id="parentAddress"
                    value={parentFormData.address}
                    onChange={(e) => setParentFormData({...parentFormData, address: e.target.value})}
                    placeholder="123 Main Street, Downtown, City - 400001"
                    rows={3}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>After creating the parent property, you can add individual rental units to it.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowAddParentDialog(false);
                  resetParentForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitParent}>
                  {editingParent ? 'Update' : 'Add'} Property
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Add Unit */}
          <Dialog open={showAddUnitDialog} onOpenChange={(open) => {
            setShowAddUnitDialog(open);
            if (!open) resetUnitForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUnit ? 'Edit' : 'Add'} Rental Unit</DialogTitle>
                <DialogDescription>
                  Add a rental unit to a parent property with specific rent details and tenant information.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Select Parent Property */}
                <div className="space-y-2">
                  <Label htmlFor="parentProperty">Parent Property *</Label>
                  <Select 
                    value={unitFormData.parentPropertyId} 
                    onValueChange={(value) => setUnitFormData({...unitFormData, parentPropertyId: value})}
                    disabled={!!editingUnit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent property" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentProperties.map(parent => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name} - {parent.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parentProperties.length === 0 && (
                    <p className="text-sm text-red-500">Please add a parent property first</p>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-4">Unit Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitName">Unit Name/Number *</Label>
                      <Input
                        id="unitName"
                        value={unitFormData.unitName}
                        onChange={(e) => setUnitFormData({...unitFormData, unitName: e.target.value})}
                        placeholder="Shop 1, Flat A, Unit 101"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitDetails">Unit Details (Optional)</Label>
                      <Input
                        id="unitDetails"
                        value={unitFormData.unitDetails}
                        onChange={(e) => setUnitFormData({...unitFormData, unitDetails: e.target.value})}
                        placeholder="Ground Floor, Shop No. 5"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="type">Unit Type *</Label>
                    <Select value={unitFormData.type} onValueChange={(value: Property['type']) => setUnitFormData({...unitFormData, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="shop">Shop</SelectItem>
                        <SelectItem value="flat">Flat</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="rentAmount">Rent Amount *</Label>
                      <Input
                        id="rentAmount"
                        type="number"
                        value={unitFormData.rentAmount}
                        onChange={(e) => setUnitFormData({...unitFormData, rentAmount: e.target.value})}
                        placeholder="2500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency *</Label>
                      <Select value={unitFormData.rentFrequency} onValueChange={(value: Property['rentFrequency']) => setUnitFormData({...unitFormData, rentFrequency: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDay">Due Day *</Label>
                      <Select value={unitFormData.dueDay} onValueChange={(value) => setUnitFormData({...unitFormData, dueDay: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={day.toString()}>
                              Day {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={unitFormData.notes}
                      onChange={(e) => setUnitFormData({...unitFormData, notes: e.target.value})}
                      placeholder="Additional notes about this unit..."
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowAddUnitDialog(false);
                  resetUnitForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitUnit} disabled={parentProperties.length === 0}>
                  {editingUnit ? 'Update' : 'Add'} Unit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Filters & View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="shop">Shop</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>View</Label>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'grouped' | 'individual')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grouped">
                    <div className="flex items-center">
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      Grouped by Property
                    </div>
                  </SelectItem>
                  <SelectItem value="individual">
                    <div className="flex items-center">
                      <List className="mr-2 h-4 w-4" />
                      Individual Units
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Parent Properties without Units */}
      {parentProperties.length > 0 && filteredProperties.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parent Properties</CardTitle>
            <p className="text-sm text-muted-foreground">
              You have {parentProperties.length} parent {parentProperties.length === 1 ? 'property' : 'properties'} but no units yet. Add units to start managing rentals.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parentProperties.map(parent => (
                <Card key={parent.id} className="border-2">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Home className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">{parent.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-7">
                          {parent.address}
                        </p>
                        <Badge variant="secondary" className="mt-2 ml-7">0 Units</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddUnitToParent(parent.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Unit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditParent(parent)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingParent(parent)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button onClick={() => handleAddUnitToParent(parentProperties[0].id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Unit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Properties Display */}
      {filteredProperties.length === 0 && parentProperties.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg mb-2">No Properties Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding a parent property, then add units to it
            </p>
            <Button onClick={() => setShowAddParentDialog(true)}>
              <Home className="mr-2 h-4 w-4" />
              Add Parent Property
            </Button>
          </CardContent>
        </Card>
      ) : filteredProperties.length > 0 && viewMode === 'grouped' ? (
        /* Grouped View */
        <div className="space-y-4">
          {Array.from(groupedProperties()).map(([parentId, units]) => {
            const isExpanded = expandedGroups.has(parentId);
            const stats = getGroupStats(units);
            const parent = parentProperties.find(p => p.id === parentId);
            
            if (!parent) return null;
            
            return (
              <Card key={parentId}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleGroup(parentId)}
                    >
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{parent.name}</CardTitle>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {parent.address}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline" className="h-8 px-3">
                        {stats.totalUnits} {stats.totalUnits === 1 ? 'Unit' : 'Units'}
                      </Badge>
                      <Badge variant={stats.occupiedUnits > 0 ? 'default' : 'secondary'} className="h-8 px-3">
                        {stats.occupiedUnits} Occupied
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddUnitToParent(parentId);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Unit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditParent(parent);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingParent(parent);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {/* Group Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Units</p>
                      <p className="text-2xl font-semibold">{stats.totalUnits}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Occupancy</p>
                      <p className="text-2xl font-semibold">
                        {stats.totalUnits > 0 
                          ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Monthly Rent</p>
                      <p className="text-2xl font-semibold">₹{stats.totalRent.toLocaleString()}</p>
                    </div>
                  </div>
                </CardHeader>
                
                {/* Expanded Units */}
                {isExpanded && (
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {units.map(unit => {
                        const tenancy = tenancies.find(t => t.propertyId === unit.id && t.status === 'active');
                        const tenantId = tenancy ? (tenancy.profileId || tenancy.tenantId) : null;
                        const tenant = tenantId ? tenants.find(t => t.id === tenantId) : null;
                        
                        return (
                          <Card key={unit.id} className="border">
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{unit.unitName}</p>
                                    {unit.unitDetails && (
                                      <p className="text-xs text-muted-foreground">{unit.unitDetails}</p>
                                    )}
                                  </div>
                                  <Badge variant={unit.status === 'occupied' ? 'default' : 'secondary'} className="text-xs">
                                    {unit.status}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="capitalize">{unit.type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Rent:</span>
                                    <span>₹{unit.rentAmount.toLocaleString()}/{unit.rentFrequency}</span>
                                  </div>
                                  {tenant && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Tenant:</span>
                                      <span className="truncate ml-2">{tenant.name}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUnit(unit);
                                      setShowUnitDetail(true);
                                    }}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleEditUnit(unit)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeletingUnit(unit)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {/* Add Unit Button for this Parent */}
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleAddUnitToParent(parentId)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Unit to {parent.name}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* Individual View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map(property => {
            const tenancy = tenancies.find(t => t.propertyId === property.id && t.status === 'active');
            const tenantId = tenancy ? (tenancy.profileId || tenancy.tenantId) : null;
            const tenant = tenantId ? tenants.find(t => t.id === tenantId) : null;
            const parent = parentProperties.find(p => p.id === property.parentPropertyId);
            
            return (
              <Card key={property.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{parent?.name || 'Unknown'}</CardTitle>
                      <p className="text-sm font-medium text-blue-600 mt-1">
                        {property.unitName}
                      </p>
                      {property.unitDetails && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {property.unitDetails}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {parent?.address || 'Unknown'}
                      </p>
                    </div>
                    <Badge variant={property.status === 'occupied' ? 'default' : 'secondary'}>
                      {property.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="capitalize">{property.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rent:</span>
                      <span>₹{property.rentAmount.toLocaleString()}/{property.rentFrequency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due Day:</span>
                      <span>Day {property.dueDay}</span>
                    </div>
                    {tenant && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tenant:</span>
                        <span>{tenant.name}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUnit(property);
                          setShowUnitDetail(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditUnit(property)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingUnit(property)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Delete Parent Confirmation */}
      <AlertDialog open={!!deletingParent} onOpenChange={(open) => {
        if (!open) {
          setDeletingParent(null);
          setDeleteParentConfirmText('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parent Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingParent?.name}"? This will only work if there are no units under this property.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmParentName" className="text-sm font-medium">
              Type <span className="font-bold text-red-600">{deletingParent?.name}</span> to confirm deletion
            </Label>
            <Input
              id="confirmParentName"
              value={deleteParentConfirmText}
              onChange={(e) => setDeleteParentConfirmText(e.target.value)}
              placeholder="Type property name here"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This action cannot be undone. Please double-check before confirming.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteParentConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteParent}
              disabled={deleteParentConfirmText !== deletingParent?.name}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Unit Confirmation */}
      <AlertDialog open={!!deletingUnit} onOpenChange={(open) => {
        if (!open) {
          setDeletingUnit(null);
          setDeleteUnitConfirmText('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete unit "{deletingUnit?.unitName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmUnitName" className="text-sm font-medium">
              Type <span className="font-bold text-red-600">{deletingUnit?.unitName}</span> to confirm deletion
            </Label>
            <Input
              id="confirmUnitName"
              value={deleteUnitConfirmText}
              onChange={(e) => setDeleteUnitConfirmText(e.target.value)}
              placeholder="Type unit name here"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This action cannot be undone. Please double-check before confirming.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteUnitConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUnit}
              disabled={deleteUnitConfirmText !== deletingUnit?.unitName}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Unit Detail Dialog */}
      <UnitDetailDialog
        open={showUnitDetail}
        onOpenChange={setShowUnitDetail}
        unit={selectedUnit}
        tenancy={selectedUnit ? tenancies.find(t => t.propertyId === selectedUnit.id && t.status === 'active') || null : null}
        tenant={selectedUnit && tenancies.find(t => t.propertyId === selectedUnit.id && t.status === 'active') 
          ? (() => {
              const ten = tenancies.find(t => t.propertyId === selectedUnit.id && t.status === 'active')!;
              const tenantId = ten.profileId || ten.tenantId;
              return tenantId ? tenants.find(t => t.id === tenantId) || null : null;
            })()
          : null}
        parentProperty={selectedUnit ? parentProperties.find(p => p.id === selectedUnit.parentPropertyId) || null : null}
        payments={payments}
      />
    </div>
  );
};