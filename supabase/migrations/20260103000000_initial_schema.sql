-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Parent Properties Table
CREATE TABLE parent_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties (Units) Table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_property_id UUID NOT NULL REFERENCES parent_properties(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('apartment', 'house', 'condo', 'commercial', 'shop', 'flat', 'land', 'warehouse', 'other')),
  rent_amount DECIMAL(10, 2) NOT NULL,
  rent_frequency TEXT NOT NULL CHECK (rent_frequency IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied')),
  unit_details TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenancies Table
CREATE TABLE tenancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  rent_amount DECIMAL(10, 2) NOT NULL,
  rent_frequency TEXT NOT NULL CHECK (rent_frequency IN ('monthly', 'yearly')),
  security_deposit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  advance_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  next_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'online')),
  transaction_id TEXT,
  advance_used DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_parent_properties_owner ON parent_properties(owner_id);
CREATE INDEX idx_properties_parent ON properties(parent_property_id);
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_tenancies_property ON tenancies(property_id);
CREATE INDEX idx_tenancies_tenant ON tenancies(tenant_id);
CREATE INDEX idx_tenancies_owner ON tenancies(owner_id);
CREATE INDEX idx_payments_tenancy ON payments(tenancy_id);
CREATE INDEX idx_payments_owner ON payments(owner_id);
CREATE INDEX idx_payments_date ON payments(date);

-- Enable Row Level Security
ALTER TABLE parent_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parent_properties
CREATE POLICY "Owners can view their own parent properties"
  ON parent_properties FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own parent properties"
  ON parent_properties FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own parent properties"
  ON parent_properties FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own parent properties"
  ON parent_properties FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for properties
CREATE POLICY "Owners can view their own properties"
  ON properties FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Tenants can view their rented properties"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenancies
      WHERE tenancies.property_id = properties.id
      AND tenancies.tenant_id = auth.uid()
      AND tenancies.status = 'active'
    )
  );

CREATE POLICY "Owners can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own properties"
  ON properties FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for tenancies
CREATE POLICY "Owners can view their tenancies"
  ON tenancies FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Tenants can view their own tenancies"
  ON tenancies FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Owners can insert tenancies"
  ON tenancies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their tenancies"
  ON tenancies FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their tenancies"
  ON tenancies FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for payments
CREATE POLICY "Owners can view their payments"
  ON payments FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Tenants can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Owners can insert payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their payments"
  ON payments FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their payments"
  ON payments FOR DELETE
  USING (auth.uid() = owner_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_parent_properties_updated_at
  BEFORE UPDATE ON parent_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenancies_updated_at
  BEFORE UPDATE ON tenancies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
