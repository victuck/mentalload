-- Fix infinite recursion in household_members RLS policy.
-- The original policy queried household_members from within a policy ON household_members.
-- Solution: SECURITY DEFINER function bypasses RLS when checking membership.

CREATE OR REPLACE FUNCTION is_household_member(hid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members WHERE household_id = hid AND user_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "members_select" ON household_members;

CREATE POLICY "members_select" ON household_members FOR SELECT TO authenticated
  USING (is_household_member(household_id));
