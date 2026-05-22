-- New table for named-but-not-signed-up household partners
CREATE TABLE placeholder_members (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  avatar_colour TEXT NOT NULL DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE placeholder_members ENABLE ROW LEVEL SECURITY;

-- Household members can read, create, and delete placeholders in their household
CREATE POLICY "placeholder_members_select" ON placeholder_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = placeholder_members.household_id AND user_id = auth.uid()
  ));

CREATE POLICY "placeholder_members_insert" ON placeholder_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = placeholder_members.household_id AND user_id = auth.uid()
  ));

CREATE POLICY "placeholder_members_delete" ON placeholder_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = placeholder_members.household_id AND user_id = auth.uid()
  ));

-- Non-FK column on tasks for placeholder attribution (no FK — owner_id already FKs to profiles)
ALTER TABLE tasks ADD COLUMN placeholder_owner_id UUID;

CREATE INDEX idx_tasks_placeholder_owner_id ON tasks(placeholder_owner_id);
