ALTER TABLE public.products
ADD COLUMN fts tsvector GENERATED ALWAYS AS (
  to_tsvector('english', title || ' ' || COALESCE(description, ''))
) STORED;


CREATE INDEX products_fts_idx ON public.products USING GIN (fts);


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'delete-old-deleted-products', 
  '0 3 * * *',                   
  $$
    DELETE FROM public.products
    WHERE status = 'deleted'::product_status
      AND updated_at < now() - INTERVAL '14 days';
  $$
);