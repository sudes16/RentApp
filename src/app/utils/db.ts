/**
 * Database compatibility layer
 * This file maintains backward compatibility with existing components
 * while using the new Supabase-powered dataService
 */

export type { User } from '../contexts/AuthContext';

// Re-export legacy types for backward compatibility
export interface ParentProperty {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface Property {
  id: string;
  parentPropertyId: string;
  ownerId: string;
  unitName: string;
  unitDetails?: string;
  type: 'apartment' | 'house' | 'condo' | 'commercial' | 'shop' | 'flat' | 'land' | 'warehouse' | 'other';
  rentAmount: number;
  rentFrequency: 'monthly' | 'yearly';
  dueDay?: number;
  securityDeposit?: number;
  notes?: string;
  status: 'vacant' | 'occupied';
  createdAt: string;
}

export interface Tenancy {
  id: string;
  propertyId: string;
  tenantId: string;
  profileId?: string; // New profile-based tenant reference
  rentAmount: number;
  rentFrequency: 'monthly' | 'yearly';
  startDate: string;
  endDate?: string; // Lease end date
  nextDueDate: string;
  advanceBalance: number;
  securityDeposit: number;
  status: 'active' | 'ended';
  renewalCount?: number; // Number of times lease has been renewed
  originalRent?: number; // Original rent amount before any renewals
  createdAt: string;
}

export interface Payment {
  id: string;
  tenancyId: string;
  propertyId: string;
  tenantId: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'upi';
  transactionId?: string;
  advanceUsed: number;
  notes?: string;
  receiptNumber: string;
  createdAt: string;
}

/**
 * IMPORTANT: This is a temporary compatibility wrapper
 * The actual implementation uses Supabase (async operations)
 * All methods return empty arrays/objects for now
 * Use the component's useEffect to load data asynchronously from dataService
 */
export const db = {
  init: () => {
    console.warn('db.init() is deprecated - data is now managed by Supabase');
  },
  
  generateId: (): string => {
    return crypto.randomUUID();
  },
  
  // Parent Properties - Return empty for now, components should use dataService
  getParentProperties: (): ParentProperty[] => {
    console.warn('db.getParentProperties() is deprecated - use dataService.getParentProperties() instead');
    return [];
  },
  
  addParentProperty: (property: ParentProperty) => {
    console.warn('db.addParentProperty() is deprecated - use dataService.createParentProperty() instead');
  },
  
  updateParentProperty: (property: ParentProperty) => {
    console.warn('db.updateParentProperty() is deprecated - use dataService.updateParentProperty() instead');
  },
  
  deleteParentProperty: (id: string) => {
    console.warn('db.deleteParentProperty() is deprecated - use dataService.deleteParentProperty() instead');
  },
  
  // Properties - Return empty for now, components should use dataService
  getProperties: (): Property[] => {
    console.warn('db.getProperties() is deprecated - use dataService.getProperties() instead');
    return [];
  },
  
  getPropertiesByOwner: (ownerId: string): Property[] => {
    console.warn('db.getPropertiesByOwner() is deprecated - use dataService.getProperties() instead');
    return [];
  },
  
  getPropertiesByParent: (parentId: string): Property[] => {
    console.warn('db.getPropertiesByParent() is deprecated - use dataService.getPropertiesByParent() instead');
    return [];
  },
  
  getPropertyById: (id: string): Property | undefined => {
    console.warn('db.getPropertyById() is deprecated');
    return undefined;
  },
  
  addProperty: (property: Property) => {
    console.warn('db.addProperty() is deprecated - use dataService.createProperty() instead');
  },
  
  updateProperty: (property: Property) => {
    console.warn('db.updateProperty() is deprecated - use dataService.updateProperty() instead');
  },
  
  deleteProperty: (id: string) => {
    console.warn('db.deleteProperty() is deprecated - use dataService.deleteProperty() instead');
  },
  
  // Tenancies - Return empty for now, components should use dataService
  getTenancies: (): Tenancy[] => {
    console.warn('db.getTenancies() is deprecated - use dataService.getTenancies() instead');
    return [];
  },
  
  getTenanciesByOwner: (ownerId: string): Tenancy[] => {
    console.warn('db.getTenanciesByOwner() is deprecated - use dataService.getTenancies() instead');
    return [];
  },
  
  getTenancyByProperty: (propertyId: string): Tenancy | null => {
    console.warn('db.getTenancyByProperty() is deprecated - use dataService.getTenancyByProperty() instead');
    return null;
  },
  
  addTenancy: (tenancy: Tenancy) => {
    console.warn('db.addTenancy() is deprecated - use dataService.createTenancy() instead');
  },
  
  updateTenancy: (tenancy: Tenancy) => {
    console.warn('db.updateTenancy() is deprecated - use dataService.updateTenancy() instead');
  },
  
  deleteTenancy: (id: string) => {
    console.warn('db.deleteTenancy() is deprecated - use dataService.deleteTenancy() instead');
  },
  
  // Payments - Return empty for now, components should use dataService
  getPayments: (): Payment[] => {
    console.warn('db.getPayments() is deprecated - use dataService.getPayments() instead');
    return [];
  },
  
  getPaymentsByOwner: (ownerId: string): Payment[] => {
    console.warn('db.getPaymentsByOwner() is deprecated - use dataService.getPayments() instead');
    return [];
  },
  
  getPaymentsByTenancy: (tenancyId: string): Payment[] => {
    console.warn('db.getPaymentsByTenancy() is deprecated - use dataService.getPaymentsByTenancy() instead');
    return [];
  },
  
  addPayment: (payment: Payment) => {
    console.warn('db.addPayment() is deprecated - use dataService.createPayment() instead');
  },
  
  updatePayment: (payment: Payment) => {
    console.warn('db.updatePayment() is deprecated - use dataService.updatePayment() instead');
  },
  
  deletePayment: (id: string) => {
    console.warn('db.deletePayment() is deprecated - use dataService.deletePayment() instead');
  },
  
  // Users - Not needed anymore (handled by Supabase Auth)
  getUsers: (): any[] => {
    console.warn('db.getUsers() is deprecated - users are managed by Supabase Auth');
    return [];
  },
  
  getUserById: (id: string): any => {
    console.warn('db.getUserById() is deprecated - use auth context instead');
    return null;
  },
  
  getUserByEmail: (email: string): any => {
    console.warn('db.getUserByEmail() is deprecated - use auth context instead');
    return null;
  },
  
  addUser: (user: any) => {
    console.warn('db.addUser() is deprecated - use auth.register() instead');
  },
  
  updateUser: (id: string, updates: Partial<{ name: string; email: string; phone: string }>) => {
    console.warn('db.updateUser() is deprecated - user updates should be handled by auth context');
  },
  
  deleteUser: (id: string) => {
    console.warn('db.deleteUser() is deprecated - user deletion should be handled by auth context');
  },
};
