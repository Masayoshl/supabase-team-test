CREATE OR REPLACE FUNCTION public.generate_invite_code(length integer DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, (floor(random() * length(chars))::integer) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE public.teams 
  ALTER COLUMN invite_code SET DEFAULT public.generate_invite_code(8);


ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.teams TO authenticated;


CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid();
$$;


CREATE POLICY "Authenticated users can view teams"
  ON public.teams FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view team members"
  ON public.users FOR SELECT 
  TO authenticated
  USING (
    id = auth.uid() OR team_id = public.get_user_team_id()
  );


CREATE OR REPLACE FUNCTION public.auto_join_created_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
  UPDATE public.users 
  SET team_id = NEW.id 
  WHERE id = auth.uid();
  
  RETURN NEW;
END;
$$;


CREATE TRIGGER on_team_created
AFTER INSERT ON public.teams
FOR EACH ROW 
EXECUTE FUNCTION public.auto_join_created_team();