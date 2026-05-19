-- Allow the auth trigger (handle_new_user) to insert a profile row on signup.
-- profiles has RLS enabled but no INSERT policy, which blocks new user creation.
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (true);
