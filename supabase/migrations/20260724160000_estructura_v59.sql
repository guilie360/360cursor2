-- BOXIES V5.9 — Estructura del proyecto (incremental, no DROP)
-- Extiende tipologias/viviendas; añade organización física, plantas, ambientes, unidades (schema).

-- ── tipologias: modelo comercial enriquecido ─────────────────────────────────
ALTER TABLE public.tipologias
  ADD COLUMN IF NOT EXISTS producto text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS area_privada_m2 numeric,
  ADD COLUMN IF NOT EXISTS area_lote_m2 numeric,
  ADD COLUMN IF NOT EXISTS parqueaderos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plantas_internas integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── viviendas: vínculo tipología (nullable) ──────────────────────────────────
ALTER TABLE public.viviendas
  ADD COLUMN IF NOT EXISTS tipologia_id uuid REFERENCES public.tipologias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS viviendas_tipologia_id_idx
  ON public.viviendas (proyecto_id, tipologia_id);

-- ── proyecto_estructura ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proyecto_estructura (
  proyecto_id uuid PRIMARY KEY REFERENCES public.proyectos(id) ON DELETE CASCADE,
  development_type text NOT NULL DEFAULT 'edificio'
    CHECK (development_type IN ('edificio','torres','casas','urbanizacion','loteo','parcelacion')),
  org_etapas boolean NOT NULL DEFAULT false,
  org_sectores boolean NOT NULL DEFAULT false,
  org_manzanas boolean NOT NULL DEFAULT false,
  total_viviendas integer,
  total_lotes integer,
  tipologias_count integer,
  repeat_floor_distribution boolean NOT NULL DEFAULT true,
  draft_json jsonb,
  applied_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── proyecto_edificios (edificio / torre / bloque) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.proyecto_edificios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'edificio'
    CHECK (kind IN ('edificio','torre','bloque','manzana','sector','etapa')),
  nombre text NOT NULL DEFAULT '',
  pisos integer NOT NULL DEFAULT 1,
  sotanos integer NOT NULL DEFAULT 0,
  rooftop boolean NOT NULL DEFAULT false,
  unidades_por_piso integer NOT NULL DEFAULT 1,
  orden integer NOT NULL DEFAULT 0,
  config_json jsonb,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proyecto_edificios_proyecto_idx
  ON public.proyecto_edificios (proyecto_id, orden);

-- ── proyecto_niveles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proyecto_niveles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  edificio_id uuid REFERENCES public.proyecto_edificios(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'piso'
    CHECK (kind IN ('piso','sotano','azotea')),
  numero integer NOT NULL DEFAULT 1,
  nombre text,
  orden integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proyecto_niveles_edificio_idx
  ON public.proyecto_niveles (edificio_id, orden);

-- ── tipologia_plantas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipologia_plantas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipologia_id uuid NOT NULL REFERENCES public.tipologias(id) ON DELETE CASCADE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT 'Planta',
  orden integer NOT NULL DEFAULT 1,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tipologia_plantas_tipologia_idx
  ON public.tipologia_plantas (tipologia_id, orden);

-- ── tipologia_ambientes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipologia_ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipologia_id uuid NOT NULL REFERENCES public.tipologias(id) ON DELETE CASCADE,
  planta_id uuid REFERENCES public.tipologia_plantas(id) ON DELETE SET NULL,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tipologia_ambientes_tipologia_idx
  ON public.tipologia_ambientes (tipologia_id, orden);

-- ── proyecto_unidades (schema only — inventario futuro) ──────────────────────
CREATE TABLE IF NOT EXISTS public.proyecto_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  edificio_id uuid REFERENCES public.proyecto_edificios(id) ON DELETE SET NULL,
  nivel_id uuid REFERENCES public.proyecto_niveles(id) ON DELETE SET NULL,
  tipologia_id uuid REFERENCES public.tipologias(id) ON DELETE SET NULL,
  codigo text,
  nombre text,
  orden integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'disponible',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proyecto_unidades_proyecto_idx
  ON public.proyecto_unidades (proyecto_id, orden);

-- ── Seed amenidades residenciales (catálogo cerrado V5.9) ────────────────────
INSERT INTO public.amenidades (nombre, icono, categoria)
SELECT v.nombre, v.icono, v.categoria
FROM (VALUES
  ('Portería', 'door', 'Acceso'),
  ('Lobby', 'sofa', 'Acceso'),
  ('Recepción', 'desk', 'Acceso'),
  ('Control vehicular', 'car', 'Acceso'),
  ('Control peatonal', 'walk', 'Acceso'),
  ('Piscina', 'pool', 'Recreación'),
  ('Piscina infantil', 'pool', 'Recreación'),
  ('Jacuzzi', 'hot-tub', 'Recreación'),
  ('Parque infantil', 'playground', 'Recreación'),
  ('Parque', 'tree', 'Recreación'),
  ('Zona verde', 'leaf', 'Recreación'),
  ('Senderos', 'path', 'Recreación'),
  ('BBQ', 'grill', 'Recreación'),
  ('Terraza', 'terrace', 'Recreación'),
  ('Rooftop', 'roof', 'Recreación'),
  ('Salón social', 'users', 'Recreación'),
  ('Gimnasio', 'dumbbell', 'Deporte'),
  ('Cancha múltiple', 'court', 'Deporte'),
  ('Cancha de fútbol', 'soccer', 'Deporte'),
  ('Cancha de tenis', 'tennis', 'Deporte'),
  ('Cancha de pádel', 'padel', 'Deporte'),
  ('Zona de yoga', 'yoga', 'Deporte'),
  ('Sauna', 'sauna', 'Deporte'),
  ('Turco', 'steam', 'Deporte'),
  ('Vías internas', 'road', 'Movilidad'),
  ('Andenes', 'sidewalk', 'Movilidad'),
  ('Ciclorutas', 'bike', 'Movilidad'),
  ('Parqueaderos residentes', 'parking', 'Movilidad'),
  ('Parqueaderos visitantes', 'parking', 'Movilidad'),
  ('Parqueaderos motos', 'moto', 'Movilidad'),
  ('Bicicleteros', 'bike-rack', 'Movilidad'),
  ('Parqueadero subterráneo', 'garage', 'Movilidad'),
  ('Administración', 'office', 'Servicios'),
  ('Cuarto de residuos', 'trash', 'Servicios'),
  ('Depósitos', 'box', 'Servicios'),
  ('Zona de mascotas', 'paw', 'Servicios'),
  ('Lavandería comunal', 'laundry', 'Servicios'),
  ('Lago', 'lake', 'Naturaleza'),
  ('Laguna', 'lake', 'Naturaleza'),
  ('Bosque', 'forest', 'Naturaleza'),
  ('Jardines', 'garden', 'Naturaleza'),
  ('Mirador', 'viewpoint', 'Naturaleza'),
  ('Reserva / área natural', 'reserve', 'Naturaleza'),
  ('Portería 24/7', 'shield', 'Seguridad')
) AS v(nombre, icono, categoria)
WHERE NOT EXISTS (
  SELECT 1 FROM public.amenidades a WHERE a.nombre = v.nombre
);

-- Normalize known duplicates into Acceso/Recreación categories when already present
UPDATE public.amenidades SET categoria = 'Acceso'
WHERE nombre IN ('Portería 24/7') AND (categoria IS NULL OR categoria = 'Seguridad');

-- ── RLS (platform admin parity) ──────────────────────────────────────────────
ALTER TABLE public.proyecto_estructura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_edificios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipologia_plantas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipologia_ambientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_unidades ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'proyecto_estructura','proyecto_edificios','proyecto_niveles',
    'tipologia_plantas','tipologia_ambientes','proyecto_unidades','tipologias'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_platform_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO public USING (
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = ''admin'')
       ) WITH CHECK (
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = ''admin'')
       )',
      t || '_platform_admin_all', t
    );
  END LOOP;
END $$;

-- Public read for published showrooms (tipologias already may have policies; safe extras)
DROP POLICY IF EXISTS tipologias_public_read ON public.tipologias;
CREATE POLICY tipologias_public_read ON public.tipologias
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.proyectos p
      WHERE p.id = tipologias.proyecto_id AND (p.publicado = true OR p.is_public = true)
    )
  );

DROP POLICY IF EXISTS tipologia_plantas_public_read ON public.tipologia_plantas;
CREATE POLICY tipologia_plantas_public_read ON public.tipologia_plantas
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.proyectos p
      WHERE p.id = tipologia_plantas.proyecto_id AND (p.publicado = true OR p.is_public = true)
    )
  );

DROP POLICY IF EXISTS tipologia_ambientes_public_read ON public.tipologia_ambientes;
CREATE POLICY tipologia_ambientes_public_read ON public.tipologia_ambientes
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.proyectos p
      WHERE p.id = tipologia_ambientes.proyecto_id AND (p.publicado = true OR p.is_public = true)
    )
  );

-- ── Extend admin_sync_vivienda with tipologia_id ─────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_sync_vivienda(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_plat_admin boolean := false;
  is_staff boolean := false;
  pid uuid;
  vid uuid;
  tip uuid;
  result public.viviendas%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  pid := NULLIF(payload->>'proyecto_id', '')::uuid;
  IF pid IS NULL THEN
    RAISE EXCEPTION 'proyecto_id requerido';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.rol = 'admin'
  ) INTO is_plat_admin;

  SELECT EXISTS (
    SELECT 1 FROM public.proyectos pr
    WHERE pr.id = pid
      AND (pr.constructora_id = public.get_constructora_id() OR public.is_super_admin())
  ) INTO is_staff;

  IF NOT is_plat_admin AND NOT is_staff THEN
    RAISE EXCEPTION 'Sin permiso para gestionar viviendas';
  END IF;

  vid := NULLIF(payload->>'id', '')::uuid;
  tip := NULLIF(payload->>'tipologia_id', '')::uuid;

  IF vid IS NULL THEN
    INSERT INTO public.viviendas (
      proyecto_id, nombre, codigo, tipo, torre, piso,
      area_m2, habitaciones, banos, parqueaderos, precio, administracion,
      estado, publicado, planos_modo, tour360_modo, tipologia_id
    ) VALUES (
      pid,
      COALESCE(NULLIF(trim(payload->>'nombre'), ''), 'Nueva vivienda'),
      NULLIF(trim(payload->>'codigo'), ''),
      NULLIF(trim(payload->>'tipo'), ''),
      NULLIF(trim(payload->>'torre'), ''),
      NULLIF(payload->>'piso', '')::int,
      COALESCE(NULLIF(payload->>'area_m2', '')::numeric, 0),
      COALESCE(NULLIF(payload->>'habitaciones', '')::int, 0),
      COALESCE(NULLIF(payload->>'banos', '')::int, 0),
      COALESCE(NULLIF(payload->>'parqueaderos', '')::int, 0),
      COALESCE(NULLIF(payload->>'precio', '')::numeric, 0),
      COALESCE(NULLIF(payload->>'administracion', '')::numeric, 0),
      COALESCE(NULLIF(payload->>'estado', ''), 'disponible')::estado_vivienda,
      COALESCE((payload->>'publicado')::boolean, true),
      COALESCE(NULLIF(payload->>'planos_modo', ''), 'proximamente'),
      COALESCE(NULLIF(payload->>'tour360_modo', ''), 'proximamente'),
      tip
    )
    RETURNING * INTO result;
  ELSE
    UPDATE public.viviendas SET
      nombre = COALESCE(NULLIF(trim(payload->>'nombre'), ''), nombre),
      codigo = NULLIF(trim(payload->>'codigo'), ''),
      tipo = NULLIF(trim(payload->>'tipo'), ''),
      torre = NULLIF(trim(payload->>'torre'), ''),
      piso = NULLIF(payload->>'piso', '')::int,
      area_m2 = COALESCE(NULLIF(payload->>'area_m2', '')::numeric, area_m2),
      habitaciones = COALESCE(NULLIF(payload->>'habitaciones', '')::int, habitaciones),
      banos = COALESCE(NULLIF(payload->>'banos', '')::int, banos),
      parqueaderos = COALESCE(NULLIF(payload->>'parqueaderos', '')::int, parqueaderos),
      precio = COALESCE(NULLIF(payload->>'precio', '')::numeric, precio),
      administracion = COALESCE(NULLIF(payload->>'administracion', '')::numeric, administracion),
      estado = COALESCE(NULLIF(payload->>'estado', ''), estado::text)::estado_vivienda,
      publicado = COALESCE((payload->>'publicado')::boolean, publicado),
      planos_modo = COALESCE(NULLIF(payload->>'planos_modo', ''), planos_modo),
      tour360_modo = COALESCE(NULLIF(payload->>'tour360_modo', ''), tour360_modo),
      tipologia_id = CASE
        WHEN payload ? 'tipologia_id' THEN tip
        ELSE tipologia_id
      END,
      updated_at = now()
    WHERE id = vid AND proyecto_id = pid
    RETURNING * INTO result;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vivienda no encontrada';
    END IF;
  END IF;

  RETURN to_jsonb(result);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_sync_vivienda(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_sync_vivienda(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_vivienda(jsonb) TO anon;
