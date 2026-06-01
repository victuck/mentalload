-- supabase/migrations/20260601000001_add_shared_tasks.sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_turn_user_id uuid REFERENCES profiles(id) NULL;
