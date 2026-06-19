
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.users TO authenticated;

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);


CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);