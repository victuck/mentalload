-- Update handle_new_user to use on-palette avatar colours.
-- Previous version used the original indigo/tailwind palette colours (#6366f1 etc).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  colours TEXT[] := ARRAY[
    '#5E7FA6',
    '#8DAA94',
    '#E7B471',
    '#1F2D3D',
    '#F4C7B6',
    '#F2E8DC',
    '#DCE8E2'
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
    COALESCE(chosen_colour, '#5E7FA6')
  );
  RETURN NEW;
END;
$$;
