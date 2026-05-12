-- Atomic household creation: creates household + adds creator as member in one
-- transaction. SECURITY DEFINER bypasses RLS so the creator can read back the
-- new household before the household_members row is committed.
CREATE OR REPLACE FUNCTION create_household(household_name text, member_default_tab text DEFAULT 'balance')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO households (name) VALUES (household_name) RETURNING id INTO new_id;
  INSERT INTO household_members (household_id, user_id, default_tab)
    VALUES (new_id, auth.uid(), member_default_tab::text);
  RETURN new_id;
END;
$$;
