# 360Preventa

## Objetivo

360Preventa es una plataforma para la presentación interactiva de proyectos inmobiliarios.

Este proyecto parte de un HTML funcional que ya reproduce la interfaz pública. El objetivo es conservar exactamente ese diseño y convertirlo en una aplicación modular conectada a Supabase.

## Objetivos técnicos

- Mantener la interfaz visual existente.
- Eliminar contenido hardcodeado.
- Modularizar HTML, CSS y JavaScript.
- Consumir toda la información desde Supabase.
- Preparar el proyecto para un Dashboard administrativo.
- Mantener compatibilidad con WordPress durante la transición.

## Arquitectura

WordPress
→ Widget HTML
→ HTML + CSS + JavaScript
→ Supabase
→ Dashboard

## Módulos

- Hero
- Descripción
- Constructora
- Amenidades
- Estado del proyecto
- Tipologías
- Viviendas
- Multimedia
- Recorridos 360
- Calculadora
- Contacto

## Reglas

- No modificar el diseño.
- No eliminar funcionalidades existentes.
- Priorizar componentes reutilizables.
- Mantener una arquitectura escalable.
