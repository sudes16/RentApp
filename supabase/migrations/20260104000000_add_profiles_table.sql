-- Add profiles table for tenant information
-- This allows owners to create tenant records without requiring authentication

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'TENANT' CHECK (role IN ('OWNER', 'TENANT')),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_by ON profiles(created_by);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Owners can view all profiles they created"
  ON profiles FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Tenants can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update profiles they created"
  ON profiles FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Tenants can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete profiles they created"
  ON profiles FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update tenancies table to use profile_id instead of tenant_id
ALTER TABLE tenancies 
  ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX idx_tenancies_profile ON tenancies(profile_id);

-- Update RLS policy for tenancies to work with profiles
-- (Keep existing tenant_id policies for backward compatibility)
CREATE POLICY "Owners can view tenancies by profile"
  ON tenancies FOR SELECT
  USING (
    auth.uid() = owner_id
    OR (profile_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = tenancies.profile_id
      AND profiles.created_by = auth.uid()
    ))
  );

CREATE POLICY "Tenants can view their own tenancies via profile"
  ON tenancies FOR SELECT
  USING (
    profile_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = tenancies.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Update payments table to add profile_id
ALTER TABLE payments
  ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Make tenant_id nullable for backward compatibility
ALTER TABLE payments
  ALTER COLUMN tenant_id DROP NOT NULL;

-- Create index for the new column
CREATE INDEX idx_payments_profile ON payments(profile_id);

-- Add RLS policy for tenants to view their own payments via profile
CREATE POLICY "Tenants can view their own payments via profile"
  ON payments FOR SELECT
  USING (
    profile_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = payments.profile_id
      AND profiles.user_id = auth.uid()
    )
  );
