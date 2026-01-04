/**
 * Data Service - Handles all database operations through Supabase
 * Replaces the old localStorage-based db.ts
 */

import { supabaseDb, Profile } from './supabase';
import {
  ParentProperty,
  Property,
  Tenancy,
  Payment,
  LegacyParentProperty,
  LegacyProperty,
  LegacyTenancy,
  LegacyPayment,
  toCamelCase,
} from './types';

// Legacy User type for backward compatibility
export interface LegacyUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'OWNER' | 'TENANT';
}

// Conversion utilities to maintain backward compatibility with existing components
function convertParentProperty(dbProperty: ParentProperty): LegacyParentProperty {
  return {
    id: dbProperty.id,
    ownerId: dbProperty.owner_id,
    name: dbProperty.name,
    address: dbProperty.address,
    createdAt: dbProperty.created_at,
  };
}

function convertProperty(dbProperty: Property): LegacyProperty {
  return {
    id: dbProperty.id,
    parentPropertyId: dbProperty.parent_property_id,
    ownerId: dbProperty.owner_id,
    unitName: dbProperty.unit_name,
    unitDetails: dbProperty.unit_details,
    type: dbProperty.type as 'shop' | 'flat' | 'land' | 'warehouse',
    rentAmount: dbProperty.rent_amount,
    rentFrequency: dbProperty.rent_frequency,
    dueDay: dbProperty.due_day,
    securityDeposit: dbProperty.security_deposit,
    status: dbProperty.status,
    createdAt: dbProperty.created_at,
  };
}

function convertTenancy(dbTenancy: Tenancy): LegacyTenancy {
  return {
    id: dbTenancy.id,
    propertyId: dbTenancy.property_id,
    tenantId: dbTenancy.tenant_id,
    profileId: dbTenancy.profile_id,  // Preserve profileId for filtering
    rentAmount: dbTenancy.rent_amount,
    rentFrequency: dbTenancy.rent_frequency,
    startDate: dbTenancy.start_date,
    nextDueDate: dbTenancy.next_due_date,
    advanceBalance: dbTenancy.advance_balance,
    securityDeposit: dbTenancy.security_deposit,
    status: dbTenancy.status,
    createdAt: dbTenancy.created_at,
  };
}

function convertPayment(dbPayment: Payment): LegacyPayment {
  return {
    id: dbPayment.id,
    tenancyId: dbPayment.tenancy_id,
    propertyId: dbPayment.property_id,
    tenantId: dbPayment.tenant_id || '',
    profileId: dbPayment.profile_id,
    amount: dbPayment.amount,
    date: dbPayment.date,
    method: dbPayment.method,
    transactionId: dbPayment.transaction_id,
    advanceUsed: dbPayment.advance_used,
    notes: dbPayment.notes,
    receiptNumber: `REC-${new Date(dbPayment.created_at).getFullYear()}-${dbPayment.id.slice(0, 4)}`,
    createdAt: dbPayment.created_at,
  };
}

function convertProfile(dbProfile: Profile): LegacyUser {
  return {
    id: dbProfile.id,
    name: dbProfile.name,
    email: dbProfile.email,
    phone: dbProfile.phone,
    role: dbProfile.role,
  };
}

// Data Service API
export const dataService = {
  // Parent Properties
  async getParentProperties(ownerId: string): Promise<LegacyParentProperty[]> {
    try {
      const properties = await supabaseDb.getParentProperties(ownerId);
      return properties.map(convertParentProperty);
    } catch (error) {
      console.error('Error fetching parent properties:', error);
      throw error;
    }
  },

  async createParentProperty(
    ownerId: string,
    name: string,
    address: string
  ): Promise<LegacyParentProperty> {
    try {
      const property = await supabaseDb.createParentProperty({
        owner_id: ownerId,
        name,
        address,
      });
      return convertParentProperty(property);
    } catch (error) {
      console.error('Error creating parent property:', error);
      throw error;
    }
  },

  async updateParentProperty(
    id: string,
    updates: { name?: string; address?: string }
  ): Promise<LegacyParentProperty> {
    try {
      const property = await supabaseDb.updateParentProperty(id, updates);
      return convertParentProperty(property);
    } catch (error) {
      console.error('Error updating parent property:', error);
      throw error;
    }
  },

  async deleteParentProperty(id: string): Promise<void> {
    try {
      await supabaseDb.deleteParentProperty(id);
    } catch (error) {
      console.error('Error deleting parent property:', error);
      throw error;
    }
  },

  // Properties (Units)
  async getProperties(ownerId: string): Promise<LegacyProperty[]> {
    try {
      const properties = await supabaseDb.getProperties(ownerId);
      return properties.map(convertProperty);
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  },

  async getPropertiesByParent(parentId: string): Promise<LegacyProperty[]> {
    try {
      const properties = await supabaseDb.getPropertiesByParent(parentId);
      return properties.map(convertProperty);
    } catch (error) {
      console.error('Error fetching properties by parent:', error);
      throw error;
    }
  },

  async createProperty(data: {
    parentPropertyId: string;
    ownerId: string;
    unitName: string;
    unitDetails?: string;
    type: 'apartment' | 'house' | 'condo' | 'commercial' | 'shop' | 'flat' | 'land' | 'warehouse' | 'other';
    rentAmount: number;
    rentFrequency: 'monthly' | 'yearly';
    dueDay?: number;
    securityDeposit?: number;
    status?: 'vacant' | 'occupied';
  }): Promise<LegacyProperty> {
    try {
      const property = await supabaseDb.createProperty({
        parent_property_id: data.parentPropertyId,
        owner_id: data.ownerId,
        unit_name: data.unitName,
        unit_details: data.unitDetails,
        type: data.type as any,
        rent_amount: data.rentAmount,
        rent_frequency: data.rentFrequency,
        due_day: data.dueDay,
        security_deposit: data.securityDeposit,
        status: data.status || 'vacant',
      });
      return convertProperty(property);
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  },

  async updateProperty(
    id: string,
    updates: Partial<{
      unitName: string;
      unitDetails: string;
      type: 'apartment' | 'house' | 'condo' | 'commercial' | 'shop' | 'flat' | 'land' | 'warehouse' | 'other';
      rentAmount: number;
      rentFrequency: 'monthly' | 'yearly';
      status: 'vacant' | 'occupied';
    }>
  ): Promise<LegacyProperty> {
    try {
      const dbUpdates: any = {};
      if (updates.unitName) dbUpdates.unit_name = updates.unitName;
      if (updates.unitDetails) dbUpdates.unit_details = updates.unitDetails;
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.rentAmount !== undefined) dbUpdates.rent_amount = updates.rentAmount;
      if (updates.rentFrequency) dbUpdates.rent_frequency = updates.rentFrequency;
      if (updates.status) dbUpdates.status = updates.status;

      const property = await supabaseDb.updateProperty(id, dbUpdates);
      return convertProperty(property);
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  async deleteProperty(id: string): Promise<void> {
    try {
      await supabaseDb.deleteProperty(id);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  },

  // Tenancies
  async getTenancies(ownerId: string): Promise<LegacyTenancy[]> {
    try {
      const tenancies = await supabaseDb.getTenancies(ownerId);
      return tenancies.map(convertTenancy);
    } catch (error) {
      console.error('Error fetching tenancies:', error);
      throw error;
    }
  },

  async getMyTenancies(): Promise<LegacyTenancy[]> {
    try {
      const tenancies = await supabaseDb.getMyTenancies();
      return tenancies.map(convertTenancy);
    } catch (error) {
      console.error('Error fetching my tenancies:', error);
      throw error;
    }
  },

  async getTenancyByProperty(propertyId: string): Promise<LegacyTenancy | null> {
    try {
      const tenancy = await supabaseDb.getTenancyByProperty(propertyId);
      return tenancy ? convertTenancy(tenancy) : null;
    } catch (error) {
      console.error('Error fetching tenancy by property:', error);
      throw error;
    }
  },

  async createTenancy(data: {
    propertyId: string;
    tenantId?: string;  // For backward compatibility (auth.users)
    profileId?: string;  // For new profile-based tenants
    ownerId: string;
    rentAmount: number;
    rentFrequency: 'monthly' | 'yearly';
    startDate: string;
    nextDueDate: string;
    advanceBalance: number;
    securityDeposit: number;
  }): Promise<LegacyTenancy> {
    try {
      // Use profile_id if provided, otherwise fall back to tenant_id
      // For new tenants, we'll use profile_id. tenant_id can be set to owner_id for FK constraint
      const tenancyData: any = {
        property_id: data.propertyId,
        tenant_id: data.tenantId || data.ownerId,  // Use ownerId as fallback for FK constraint
        owner_id: data.ownerId,
        rent_amount: data.rentAmount,
        rent_frequency: data.rentFrequency,
        start_date: data.startDate,
        next_due_date: data.nextDueDate,
        advance_balance: data.advanceBalance,
        security_deposit: data.securityDeposit,
        status: 'active',
      };
      
      // Add profile_id if provided
      if (data.profileId) {
        tenancyData.profile_id = data.profileId;
      }
      
      const tenancy = await supabaseDb.createTenancy(tenancyData);
      return convertTenancy(tenancy);
    } catch (error) {
      console.error('Error creating tenancy:', error);
      throw error;
    }
  },

  // Alias for backward compatibility
  async addTenancy(data: {
    propertyId: string;
    tenantId?: string;
    profileId?: string;
    ownerId: string;
    rentAmount: number;
    rentFrequency: 'monthly' | 'yearly';
    startDate: string;
    nextDueDate: string;
    advanceBalance: number;
    securityDeposit: number;
  }): Promise<LegacyTenancy> {
    return this.createTenancy(data);
  },

  async updateTenancy(
    id: string,
    updates: Partial<{
      rentAmount: number;
      nextDueDate: string;
      advanceBalance: number;
      securityDeposit: number;
      status: 'active' | 'ended';
    }>
  ): Promise<LegacyTenancy> {
    try {
      const dbUpdates: any = {};
      if (updates.rentAmount !== undefined) dbUpdates.rent_amount = updates.rentAmount;
      if (updates.nextDueDate) dbUpdates.next_due_date = updates.nextDueDate;
      if (updates.advanceBalance !== undefined) dbUpdates.advance_balance = updates.advanceBalance;
      if (updates.securityDeposit !== undefined) dbUpdates.security_deposit = updates.securityDeposit;
      if (updates.status) dbUpdates.status = updates.status;

      const tenancy = await supabaseDb.updateTenancy(id, dbUpdates);
      return convertTenancy(tenancy);
    } catch (error) {
      console.error('Error updating tenancy:', error);
      throw error;
    }
  },

  async deleteTenancy(id: string): Promise<void> {
    try {
      await supabaseDb.deleteTenancy(id);
    } catch (error) {
      console.error('Error deleting tenancy:', error);
      throw error;
    }
  },

  // Payments
  async getPayments(ownerId: string): Promise<LegacyPayment[]> {
    try {
      const payments = await supabaseDb.getPayments(ownerId);
      return payments.map(convertPayment);
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  async getMyPayments(): Promise<LegacyPayment[]> {
    try {
      const payments = await supabaseDb.getMyPayments();
      return payments.map(convertPayment);
    } catch (error) {
      console.error('Error fetching my payments:', error);
      throw error;
    }
  },

  async getPaymentsByTenancy(tenancyId: string): Promise<LegacyPayment[]> {
    try {
      const payments = await supabaseDb.getPaymentsByTenancy(tenancyId);
      return payments.map(convertPayment);
    } catch (error) {
      console.error('Error fetching payments by tenancy:', error);
      throw error;
    }
  },

  async createPayment(data: {
    tenancyId: string;
    propertyId: string;
    tenantId: string;
    profileId?: string;
    ownerId: string;
    amount: number;
    date: string;
    method: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'online';
    transactionId?: string;
    advanceUsed: number;
    notes?: string;
  }): Promise<LegacyPayment> {
    try {
      const payment = await supabaseDb.createPayment({
        tenancy_id: data.tenancyId,
        property_id: data.propertyId,
        tenant_id: (data.profileId ? null : data.tenantId) as string | null, // Use null if using profile_id
        profile_id: data.profileId,
        owner_id: data.ownerId,
        amount: data.amount,
        date: data.date,
        method: data.method,
        transaction_id: data.transactionId,
        advance_used: data.advanceUsed,
        notes: data.notes,
      });
      return convertPayment(payment);
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  async updatePayment(
    id: string,
    updates: Partial<{
      amount: number;
      date: string;
      method: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'online';
      transactionId: string;
      advanceUsed: number;
      notes: string;
    }>
  ): Promise<LegacyPayment> {
    try {
      const dbUpdates: any = {};
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.date) dbUpdates.date = updates.date;
      if (updates.method) dbUpdates.method = updates.method;
      if (updates.transactionId) dbUpdates.transaction_id = updates.transactionId;
      if (updates.advanceUsed !== undefined) dbUpdates.advance_used = updates.advanceUsed;
      if (updates.notes) dbUpdates.notes = updates.notes;

      const payment = await supabaseDb.updatePayment(id, dbUpdates);
      return convertPayment(payment);
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  async deletePayment(id: string): Promise<void> {
    try {
      await supabaseDb.deletePayment(id);
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },

  // Utility function to generate IDs (for compatibility)
  generateId(): string {
    return crypto.randomUUID();
  },

  // User/Profile Management (for Tenants)
  async getUsers(ownerId: string): Promise<LegacyUser[]> {
    try {
      const profiles = await supabaseDb.getProfiles(ownerId);
      return profiles.map(convertProfile);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUserByEmail(email: string, ownerId: string): Promise<LegacyUser | null> {
    try {
      const profile = await supabaseDb.getProfileByEmail(email, ownerId);
      return profile ? convertProfile(profile) : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  },

  async getUserById(id: string): Promise<LegacyUser | null> {
    try {
      const profile = await supabaseDb.getProfileById(id);
      return profile ? convertProfile(profile) : null;
    } catch (error) {
      console.error('Error fetching user by id:', error);
      return null; // Return null instead of throwing for compatibility
    }
  },

  async addUser(user: {
    name: string;
    email: string;
    phone?: string;
    role: 'OWNER' | 'TENANT';
    createdBy: string;
  }): Promise<LegacyUser & { tempPassword?: string }> {
    try {
      let authUserId: string | undefined;
      let tempPassword: string | undefined;

      // Create Supabase Auth user for tenants so they can login
      if (user.role === 'TENANT') {
        // Generate secure temporary password
        tempPassword = `Rent${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8).toUpperCase()}!`;
        
        try {
          const authUser = await supabaseDb.createAuthUser(
            user.email,
            tempPassword,
            {
              name: user.name,
              role: user.role,
              phone: user.phone || ''
            }
          );
          authUserId = authUser.id;
        } catch (authError: any) {
          // If auth user creation fails, log but continue with profile creation
          console.warn('Failed to create auth user:', authError.message);
        }
      }

      // Create profile record
      const profile = await supabaseDb.createProfile({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        user_id: authUserId,
        created_by: user.createdBy,
      });
      
      const result = convertProfile(profile);
      return tempPassword ? { ...result, tempPassword } : result;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async updateUser(
    id: string,
    updates: { name?: string; email?: string; phone?: string }
  ): Promise<LegacyUser> {
    try {
      const profile = await supabaseDb.updateProfile(id, updates);
      return convertProfile(profile);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await supabaseDb.deleteProfile(id);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
};
