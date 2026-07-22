# Vertical Slice v0.1 — `/boxies`

| Campo | Valor |
|---|---|
| **Status** | Implementation |
| **Date** | 2026-07-21 |
| **Based on** | ADR-0001 + Phase-1-Foundation (partial) |
| **Host** | `/boxies` (parallel; does **not** replace `/admin2`) |

---

## Observaciones técnicas vs ADR-0001

Estas no amplían el alcance del slice; quedan registradas para alinear docs en un ADR amendment posterior.

| Tema | ADR-0001 | Vertical Slice v0.1 | Nota |
|---|---|---|---|
| Host canónico | `/app` | `/boxies` | Path de producto provisional para materializar arquitectura **sin** 301 ni retirar `/admin2`. Decidir después si `/boxies` se convierte en canónico o redirige a `/app`. |
| Redirect `/admin2` | 301 → `/app` | **No** | Restricción explícita del slice: no tocar rutas existentes. |
| BuilderPage | Migrar al Shell | **No** — placeholder “Coming Soon” | El editor sigue en `/admin/ai-project-builder.html`. ProjectsPage puede enlazar “Administrar” al Builder legacy. |
| Naming chrome | `boxies-*` | `boxies-*` | Cumple ADR. El Shell legacy `admin/js/platform/boxies-app-shell.js` **no** se modifica (sigue sirviendo admin2/builder). |
| Auth | Reutilizar | Reutilizar vía `auth-bridge` en `/boxies` | Misma pila PlatformAuth / VisitorAuth / profiles.rol. OAuth returnPath del slice → `/boxies`. |

---

## Alcance del slice

```text
/boxies → BoxiesApp.boot() → Auth Gate → Shell → #boxiesContent → ProjectsPage
```

Fuera de alcance: Supabase, OAuth core, RLS, HALL redesign, admin2, Builder actual, legacy dashboard.

---

## Criterio de éxito

Deploy → `https://360preventa.com/boxies` muestra un único Shell con ProjectsPage en `#boxiesContent`, login con la sesión de plataforma existente, sin regresiones en rutas previas.

---

## Vertical Slice v0.2 (addendum)

| Cambio | Notas |
|---|---|
| Dock + Fullscreen | Shell dock oficial; reutiliza `BuilderDock.bindFullscreen` + `#builderFullscreenBtn` |
| Header marca | `B O X I E S` (letter-spacing) |
| Projects → Builder | `Router.navigate('builder', { project })` — sin salir de `/boxies` |
| BuilderPage | Adaptador: `AiProjectBuilderView.render(#boxiesContent)`; chrome anidado se elimina; Guardar/Publicar se promueven al header BOXIES |
| Limitación técnica | El editor aún genera shell propio vía `BoxiesAppShell.html`; el adaptador lo desmonta tras render. No se reescribieron engines. |
| URL | `/boxies?page=builder&project=<slug>&proyecto=<slug>` (`proyecto` para engines) |
