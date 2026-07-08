# 360Preventa - Base de Datos (Supabase)

## Tablas principales

### constructoras
Información de cada constructora.

Campos:
- id
- nombre
- slug
- descripcion
- ciudad
- direccion
- telefono
- email
- sitio_web
- logo_url
- plan
- estado

### proyectos
Pertenece a una constructora.

Campos:
- id
- constructora_id
- nombre
- slug
- descripcion
- ciudad
- direccion
- latitud
- longitud
- whatsapp
- email
- sitio_web
- estado
- publicado

### proyecto_config
Configuración visual del proyecto.

- color_accento
- color_fondo
- logo_url
- favicon_url
- fuente_titulo
- fuente_cuerpo
- video_hero_url
- imagen_hero_url
- texto_hero
- calculadora_activa
- tasa_interes_anual
- analytics_id

### amenidades
Catálogo global.

### proyecto_amenidades
Join entre proyectos y amenidades.

### proyecto_avances
Cronograma y estado del proyecto.

### tipologias
Modelos de vivienda.

### viviendas
Inventario de unidades.

### archivos
Repositorio multimedia.

Tipos:
- imagen
- video
- pdf
- tour_360
- brochure
- plano

## Relaciones principales

- constructoras -> proyectos
- proyectos -> proyecto_config
- proyectos -> proyecto_avances
- proyectos -> proyecto_amenidades
- proyecto_amenidades -> amenidades
- proyectos -> tipologias
- proyectos -> viviendas
- proyectos -> archivos
- viviendas -> archivos

## Estados

Proyecto:
- preventa
- en_construccion
- entregado
- archivado

Vivienda:
- disponible
- reservado
- vendido
- no_disponible

Avance:
- proximamente
- ejecucion
- completada

General:
- activo
- inactivo

Lead:
- nuevo
- contactado
- calificado
- negociacion
- cerrado_ganado
- cerrado_perdido

## Arquitectura

WordPress
-> Widget HTML
-> HTML/CSS/JS
-> Supabase
-> Dashboard

Todo el contenido debe obtenerse desde Supabase.
No debe existir información hardcodeada.
