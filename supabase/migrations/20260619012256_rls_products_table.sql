
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;


GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;


CREATE POLICY "Team members can view team products"
  ON public.products FOR SELECT
  TO authenticated
  USING (team_id = public.get_user_team_id());


CREATE POLICY "Team members can create products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id = public.get_user_team_id()
    AND creator_id = auth.uid()
  );


CREATE POLICY "Team members can update team products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (team_id = public.get_user_team_id())
  WITH CHECK (team_id = public.get_user_team_id());


CREATE POLICY "No hard deletes for authenticated users"
  ON public.products FOR DELETE
  TO authenticated
  USING (false);
