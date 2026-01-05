-- Migration: Integrate rent_reminders with reminders system
-- Run this in Supabase SQL Editor

-- 1. Create rent_reminders table if it doesn't exist
CREATE TABLE IF NOT EXISTS rent_reminders (
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

-- 2. Add rent_reminder_id column to reminders table
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS rent_reminder_id UUID REFERENCES rent_reminders(id) ON DELETE SET NULL;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_reminders_rent_reminder_id ON reminders(rent_reminder_id);
CREATE INDEX IF NOT EXISTS idx_rent_reminders_lease_id ON rent_reminders(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_reminders_month ON rent_reminders(month);
CREATE INDEX IF NOT EXISTS idx_rent_reminders_status ON rent_reminders(status);

-- 4. Enable RLS on rent_reminders
ALTER TABLE rent_reminders ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for rent_reminders
DROP POLICY IF EXISTS "Admins and managers can view all rent reminders" ON rent_reminders;
CREATE POLICY "Admins and managers can view all rent reminders"
    ON rent_reminders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Tenants can view their own rent reminders" ON rent_reminders;
CREATE POLICY "Tenants can view their own rent reminders"
    ON rent_reminders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = rent_reminders.lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins and managers can manage rent reminders" ON rent_reminders;
CREATE POLICY "Admins and managers can manage rent reminders"
    ON rent_reminders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- 6. Updated_at trigger for rent_reminders
DROP TRIGGER IF EXISTS update_rent_reminders_updated_at ON rent_reminders;
CREATE TRIGGER update_rent_reminders_updated_at
    BEFORE UPDATE ON rent_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Function to sync reminder completion with rent_reminder status
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

-- 8. Trigger to sync completion status
DROP TRIGGER IF EXISTS sync_rent_reminder_completion ON reminders;
CREATE TRIGGER sync_rent_reminder_completion
    AFTER UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION sync_rent_reminder_on_complete();

-- 9. Grant permissions
GRANT ALL ON rent_reminders TO authenticated;
