-- PostgREST-friendly alias for OAuth visitor provisioning.
-- The canonical function uses p_proyecto_slug; this wrapper accepts proyecto_slug.

CREATE OR REPLACE FUNCTION public.provision_oauth_visitor(proyecto_slug text DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ensure_oauth_visitor(proyecto_slug);
$$;

GRANT EXECUTE ON FUNCTION public.provision_oauth_visitor(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
