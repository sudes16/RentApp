/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase credentials are configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase credentials not found!\n\n' +
    'To fix this:\n' +
    '1. Create a .env file in your project root\n' +
    '2. Add these lines:\n' +
    '   VITE_SUPABASE_URL=your-project-url\n' +
    '   VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    '3. Get credentials from: https://app.supabase.com → Settings → API\n' +
    '4. Restart your dev server\n\n' +
    'See SUPABASE_SETUP.md for detailed instructions.'
  );
}

// Create a dummy client if credentials are missing (prevents app crash)
// This allows the app to render the UI, but database operations won't work
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key-replace-with-real-key'
);

// Database Types
export interface ParentProperty {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  parent_property_id: string;
  unit_name: string;
  type: 'apartment' | 'house' | 'condo' | 'commercial' | 'shop' | 'flat' | 'land' | 'warehouse' | 'other';
  rent_amount: number;
  rent_frequency: 'monthly' | 'yearly';
  due_day?: number;
  security_deposit?: number;
  status: 'vacant' | 'occupied';
  unit_details?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tenancy {
  id: string;
  property_id: string;
  tenant_id: string;
  profile_id?: string;  // New: for profile-based tenants
  owner_id: string;
  start_date: string;
  end_date?: string;
  rent_amount: number;
  rent_frequency: 'monthly' | 'yearly';
  security_deposit: number;
  advance_balance: number;
  next_due_date: string;
  status: 'active' | 'ended';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  tenancy_id: string;
  property_id: string;
  tenant_id: string | null;
  profile_id?: string;  // New: for profile-based tenants
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

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'OWNER' | 'TENANT';
  user_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Helper functions for data access
export const supabaseDb = {
  // Parent Properties
  async getParentProperties(ownerId: string) {
    const { data, error } = await supabase
      .from('parent_properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('name');
    
    if (error) throw error;
    return data as ParentProperty[];
  },

  async createParentProperty(property: Omit<ParentProperty, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('parent_properties')
      .insert(property)
      .select()
      .single();
    
    if (error) throw error;
    return data as ParentProperty;
  },

  async updateParentProperty(id: string, updates: Partial<ParentProperty>) {
    const { data, error } = await supabase
      .from('parent_properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as ParentProperty;
  },

  async deleteParentProperty(id: string) {
    const { error } = await supabase
      .from('parent_properties')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Properties (Units)
  async getProperties(ownerId: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('unit_name');
    
    if (error) throw error;
    return data as Property[];
  },

  async getPropertiesByParent(parentId: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('parent_property_id', parentId)
      .order('unit_name');
    
    if (error) throw error;
    return data as Property[];
  },

  async createProperty(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single();
    
    if (error) throw error;
    return data as Property;
  },

  async updateProperty(id: string, updates: Partial<Property>) {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Property;
  },

  async deleteProperty(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Tenancies
  async getTenancies(ownerId: string) {
    const { data, error } = await supabase
      .from('tenancies')
      .select('*')
      .eq('owner_id', ownerId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data as Tenancy[];
  },

  async getMyTenancies() {
    // For logged-in tenants - RLS will automatically filter
    const { data, error } = await supabase
      .from('tenancies')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data as Tenancy[];
  },

  async getTenancyByProperty(propertyId: string) {
    const { data, error } = await supabase
      .from('tenancies')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'active')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data as Tenancy;
  },

  async createTenancy(tenancy: Omit<Tenancy, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('tenancies')
      .insert(tenancy)
      .select()
      .single();
    
    if (error) throw error;
    return data as Tenancy;
  },

  async updateTenancy(id: string, updates: Partial<Tenancy>) {
    const { data, error } = await supabase
      .from('tenancies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Tenancy;
  },

  async deleteTenancy(id: string) {
    const { error } = await supabase
      .from('tenancies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Payments
  async getPayments(ownerId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('owner_id', ownerId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data as Payment[];
  },

  async getMyPayments() {
    // For logged-in tenants - RLS will automatically filter
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data as Payment[];
  },

  async getPaymentsByTenancy(tenancyId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenancy_id', tenancyId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data as Payment[];
  },

  async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();
    
    if (error) throw error;
    return data as Payment;
  },

  async updatePayment(id: string, updates: Partial<Payment>) {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Payment;
  },

  async deletePayment(id: string) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Profiles (Tenants)
  async getProfiles(createdBy: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('created_by', createdBy)
      .order('name');
    
    if (error) throw error;
    return data as Profile[];
  },

  async getProfileByEmail(email: string, createdBy: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('created_by', createdBy)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data as Profile;
  },

  async getProfileById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data as Profile;
  },

  async createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  async updateProfile(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  async deleteProfile(id: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Auth helpers for tenant account creation
  async createAuthUser(email: string, password: string, metadata: { name: string; role: string; phone?: string }) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });
    
    if (error) throw error;
    return data.user;
  }
};