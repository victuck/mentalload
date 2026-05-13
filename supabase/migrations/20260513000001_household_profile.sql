-- Add profile JSONB column to households (idempotent)
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Allow household members to update the profile
CREATE POLICY "households_update" ON households
  FOR UPDATE TO authenticated
  USING (is_household_member(id))
  WITH CHECK (is_household_member(id));
