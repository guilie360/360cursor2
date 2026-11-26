-- Permite rol cliente (Mi perfil) en profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol = ANY (ARRAY[
    'usuario'::text,
    'cliente'::text,
    'asesor'::text,
    'hunter'::text,
    'admin'::text,
    'super_admin'::text
  ]));

UPDATE public.profiles
SET rol = 'cliente',
    nombre_visible = COALESCE(NULLIF(nombre_visible, ''), nombre, 'Cliente')
WHERE id = 'bd507203-410e-43c3-a15a-f58d78efaf7d'
  AND lower(coalesce(rol, '')) <> 'cliente';
