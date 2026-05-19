-- Re-apply handle_new_user with SET search_path = public so the `profiles`
-- table resolves correctly regardless of the caller's search_path.
-- The remote version lost this setting when it was edited via the dashboard.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  colours TEXT[] := ARRAY[
    '#6366f1',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#ec4899'
  ];
  chosen_colour TEXT;
BEGIN
  SELECT c INTO chosen_colour
  FROM unnest(colours) AS c
  LEFT JOIN profiles ON profiles.avatar_colour = c
  GROUP BY c
  ORDER BY COUNT(profiles.id) ASC, array_position(colours, c) ASC
  LIMIT 1;

  INSERT INTO profiles (id, name, avatar_colour)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(chosen_colour, '#6366f1')
  );
  RETURN NEW;
END;
$$;
