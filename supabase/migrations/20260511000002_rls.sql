ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Profiles: readable by anyone authenticated, writable only by owner
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Households: readable by members, creatable by authenticated users
CREATE POLICY "households_select" ON households FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = id AND user_id = auth.uid()
  ));
CREATE POLICY "households_insert" ON households FOR INSERT TO authenticated WITH CHECK (true);

-- Members: readable by members of same household
CREATE POLICY "members_select" ON household_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = household_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "members_insert" ON household_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "members_update" ON household_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Invites: readable and creatable by household members
CREATE POLICY "invites_select" ON invites FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = invites.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "invites_insert" ON invites FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = invites.household_id AND user_id = auth.uid()
  ));

-- Allow unauthenticated invite lookup (for join flow)
CREATE POLICY "invites_select_by_token" ON invites FOR SELECT USING (true);

-- Tasks: readable and writable by household members
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM household_members WHERE household_id = tasks.household_id AND user_id = auth.uid()
  ));

-- Completions: readable and insertable by household members
CREATE POLICY "completions_select" ON task_completions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    WHERE t.id = task_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "completions_insert" ON task_completions FOR INSERT TO authenticated
  WITH CHECK (completed_by = auth.uid());
