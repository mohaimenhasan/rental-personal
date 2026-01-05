-- Rental Management Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'tenant');
CREATE TYPE payment_method AS ENUM ('etransfer', 'cash', 'cheque', 'bank_transfer');
CREATE TYPE rent_component AS ENUM ('base_rent', 'gas', 'water', 'hydro');
CREATE TYPE property_type AS ENUM ('house', 'townhouse', 'condo', 'apartment');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'tenant' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Properties table
CREATE TABLE properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Toronto',
    postal_code TEXT NOT NULL,
    property_type property_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Units table (rooms/apartments within properties)
CREATE TABLE units (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms DECIMAL(2,1) NOT NULL DEFAULT 1,
    is_shared_bathroom BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Leases table
CREATE TABLE leases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    base_rent DECIMAL(10,2) NOT NULL,
    includes_gas BOOLEAN DEFAULT FALSE,
    includes_water BOOLEAN DEFAULT FALSE,
    includes_hydro BOOLEAN DEFAULT FALSE,
    gas_amount DECIMAL(10,2),
    water_amount DECIMAL(10,2),
    hydro_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Payments table
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method payment_method NOT NULL,
    component rent_component NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Reminders table
CREATE TABLE reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    send_email BOOLEAN DEFAULT TRUE,
    send_sms BOOLEAN DEFAULT FALSE,
    rent_reminder_id UUID REFERENCES rent_reminders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Rent reminders table (auto-generated monthly)
CREATE TABLE rent_reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
    month DATE NOT NULL,
    base_rent DECIMAL(10,2) NOT NULL,
    gas_amount DECIMAL(10,2) DEFAULT 0,
    water_amount DECIMAL(10,2) DEFAULT 0,
    hydro_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late')),
    is_late BOOLEAN DEFAULT FALSE,
    late_since DATE,
    tenant_notified_at TIMESTAMPTZ,
    admin_notified_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(lease_id, month)
);

-- Create indexes for better performance
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_leases_unit_id ON leases(unit_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_active ON leases(is_active);
CREATE INDEX idx_payments_lease_id ON payments(lease_id);
CREATE INDEX idx_payments_month_year ON payments(year, month);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_rent_reminder_id ON reminders(rent_reminder_id);
CREATE INDEX idx_rent_reminders_lease_id ON rent_reminders(lease_id);
CREATE INDEX idx_rent_reminders_month ON rent_reminders(month);
CREATE INDEX idx_rent_reminders_status ON rent_reminders(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins and managers can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow insert during signup"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for properties (admin and manager only)
CREATE POLICY "Admins and managers can view properties"
    ON properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can manage properties"
    ON properties FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- RLS Policies for units
CREATE POLICY "Admins and managers can view units"
    ON units FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Tenants can view their rented units"
    ON units FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.unit_id = units.id
            AND leases.tenant_id = auth.uid()
            AND leases.is_active = true
        )
    );

CREATE POLICY "Admins can manage units"
    ON units FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- RLS Policies for leases
CREATE POLICY "Admins and managers can view all leases"
    ON leases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Tenants can view their own leases"
    ON leases FOR SELECT
    USING (tenant_id = auth.uid());

CREATE POLICY "Admins can manage leases"
    ON leases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Managers can insert and update leases"
    ON leases FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'manager'
        )
    );

CREATE POLICY "Managers can update leases"
    ON leases FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'manager'
        )
    );

-- RLS Policies for payments
CREATE POLICY "Admins and managers can view all payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Tenants can view their own payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = payments.lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Admins and managers can manage payments"
    ON payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
    ON reminders FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all reminders"
    ON reminders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can manage their own reminders"
    ON reminders FOR ALL
    USING (user_id = auth.uid());

-- RLS Policies for rent_reminders
CREATE POLICY "Admins and managers can view all rent reminders"
    ON rent_reminders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Tenants can view their own rent reminders"
    ON rent_reminders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = rent_reminders.lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Admins and managers can manage rent reminders"
    ON rent_reminders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at
    BEFORE UPDATE ON units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
    BEFORE UPDATE ON leases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_reminders_updated_at
    BEFORE UPDATE ON rent_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to sync reminder completion with rent_reminder status
-- When admin marks a reminder as complete, it also marks the associated rent_reminder as paid
CREATE OR REPLACE FUNCTION sync_rent_reminder_on_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if reminder is being marked as complete and has a rent_reminder_id
    IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE AND NEW.rent_reminder_id IS NOT NULL THEN
        UPDATE rent_reminders
        SET
            status = 'paid',
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.rent_reminder_id;

        -- Also mark all other reminders linked to this rent_reminder as complete
        UPDATE reminders
        SET is_completed = TRUE
        WHERE rent_reminder_id = NEW.rent_reminder_id
        AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to sync completion status
CREATE TRIGGER sync_rent_reminder_completion
    AFTER UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION sync_rent_reminder_on_complete();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'tenant'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for automatic profile creation on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
