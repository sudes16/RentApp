// Shared TypeScript types for the application

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'TENANT';
  phone?: string;
  created_at: string;
}

export interface ParentProperty {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  parent_property_id: string;
  owner_id: string;
  unit_name: string;
  unit_details?: string;
  type: 'apartment' | 'house' | 'condo' | 'commercial' | 'shop' | 'flat' | 'land' | 'warehouse' | 'other';
  rent_amount: number;
  rent_frequency: 'monthly' | 'yearly';
  due_day?: number;
  security_deposit?: number;
  status: 'vacant' | 'occupied';
  created_at: string;
  updated_at: string;
}

export interface Tenancy {
  id: string;
  property_id: string;
  tenant_id: string;
  profile_id?: string;  // New profile-based tenant reference
  owner_id: string;
  rent_amount: number;
  rent_frequency: 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_due_date: string;
  advance_balance: number;
  security_deposit: number;
  status: 'active' | 'ended';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  tenancy_id: string;
  property_id: string;
  tenant_id: string | null;
  profile_id?: string;
  owner_id: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'online';
  transaction_id?: string;
  advance_used: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Legacy types for backward compatibility (camelCase versions)
export interface LegacyUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'TENANT';
  password?: string;
  phone?: string;
  createdAt: string;
}

export interface LegacyParentProperty {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface LegacyProperty {
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

export interface LegacyTenancy {
  id: string;
  propertyId: string;
  tenantId: string;
  profileId?: string;  // New profile-based tenant reference
  rentAmount: number;
  rentFrequency: 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  advanceBalance: number;
  securityDeposit: number;
  status: 'active' | 'ended';
  renewalCount?: number;
  originalRent?: number;
  createdAt: string;
}

export interface LegacyPayment {
  id: string;
  tenancyId: string;
  propertyId: string;
  tenantId: string;
  profileId?: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'upi';
  transactionId?: string;
  advanceUsed: number;
  notes?: string;
  receiptNumber?: string;
  createdAt: string;
}

// Conversion utilities
export function toSnakeCase<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

export function toCamelCase<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
