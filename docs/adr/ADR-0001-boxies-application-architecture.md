# ADR-0001 — BOXIES Application Architecture

| Campo | Valor |
|---|---|
| **Status** | Accepted |
| **Version** | 1.0 |
| **Date** | 2026-07-21 |
| **Deciders** | Product / Architecture |
| **Implementation** | Not started — blocked until [Phase 1 Foundation plan](../architecture/Phase-1-Foundation.md) is approved and docs are committed |

---

## Principios

BOXIES se rige por estos principios:

1. Una sola aplicación.
2. Un solo Shell.
3. Un solo DOM de chrome.
4. Una sola forma de registrar Pages.
5. El Shell es inmutable.
6. Las Pages describen; el Shell interpreta.
7. La lógica de dominio nunca modifica la arquitectura.

---

## Contexto

Durante el desarrollo coexistieron varias entradas independientes (herramientas de administración, editor de proyecto, dashboards legacy) y se intentó **unificarlas visualmente**.

Eso fue un error de dirección.

Unificar apariencia no produce una aplicación. Produce forks que “casi” se parecen: headers distintos, paddings distintos, sidebars distintas, tipografías distintas.

BOXIES debe existir como **una sola aplicación**, no como un conjunto de páginas coordinadas a ojo.

---

## Decisión

BOXIES se construye como una aplicación con:

- un **`BoxiesApp`** que inicia el sistema;
- un **Auth Gate**;
- un **Router** y **Page Registry**;
- un **Shell inmutable** con un único Content Slot `#boxiesContent`;
- **Pages** que solo declaran un manifiesto y montan contenido en el slot.

La referencia arquitectónica es:

```text
BoxiesApp → Shell → #boxiesContent → Current Page
```

Punto.

No hay segunda referencia arquitectónica. No hay layouts por módulo. No hay HTML de chrome duplicado.

---

## No objetivos

Esta ADR **NO** pretende:

- cambiar Supabase
- cambiar Auth
- cambiar RLS
- cambiar OAuth
- cambiar HALL (design system)
- rediseñar la UI por gusto visual
- agregar funcionalidades de producto

Su único objetivo es definir la **arquitectura de aplicación**.

---

## Jerarquía canónica

```text
BOXIES
  └── BoxiesApp                 ← inicia la aplicación
        ├── Auth Gate
        ├── Router
        ├── Page Registry
        └── Shell (inmutable)
              ├── Header
              ├── Sidebar
              ├── Workspace
              ├── Dock
              └── #boxiesContent
                    └── Current Page
```

El Shell **no** arranca la aplicación.  
**`BoxiesApp.boot()`** decide cuándo montar el Shell (tras Auth válida).

Incorrecto:

```js
new BoxiesShell()
```

Correcto:

```js
BoxiesApp.boot()
```

---

## Diagrama de arquitectura

```text
Browser
  └── /app  (host canónico)
        └── BoxiesApp.boot()
              ├── Auth Gate
              │     ├── no sesión → Login UI (fuera del Shell)
              │     └── sesión OK ↓
              ├── Router
              ├── Page Registry
              └── Shell.mount()   // una sola vez por sesión de app
                    ├── boxies-header
                    ├── boxies-sidebar
                    ├── boxies-workspace
                    │     └── #boxiesContent
                    └── boxies-dock
                          └── Router activa Page
                                ├── previous.unmount()
                                ├── Shell.applyManifest(page)
                                └── page.mount(#boxiesContent)
```

### EL SHELL NO TIENE DOM DUPLICADO

En toda la app autenticada existe **un** header, **un** aside (sidebar), **un** main/workspace y **un** footer/dock.

Nunca. Jamás. Ni en pruebas.

Ese fue el origen del problema histórico.

---

## El Shell es inmutable

Una Page **nunca** puede modificar:

- Header
- Sidebar
- Dock
- Workspace
- Layout
- CSS del Shell

Una Page **solamente** puede:

- registrar navegación (manifiesto)
- registrar acciones de header (manifiesto)
- escribir dentro de `#boxiesContent`

### Las Pages son efímeras

Pueden crearse, destruirse y reemplazarse sin afectar la existencia del Shell.

El Shell existe independientemente de cualquier Page.

---

## Contrato de Page (manifiesto)

La Page **describe**. El Shell **interpreta**.  
La Page **no** manipula el DOM del Header ni de la Sidebar.

Forma conceptual:

```ts
export default {
  id: "projects",
  title: "BOXIES",
  icon: "...",
  nav: [
    { id: "projects", label: "Proyectos" },
    // ...
  ],
  actions: [
    { id: "logout", label: "Cerrar sesión", kind: "secondary" },
  ],
  mount(contentEl, ctx) {
    // solo #boxiesContent
  },
  unmount() {
    // cleanup
  },
};
```

Registro:

```js
BoxiesPages.register(ProjectsPageManifest)
```

---

## Lifecycle

```text
BoxiesApp.boot()
  → AuthGate.resolve()
      → fail: Login (no Shell)
      → ok:
          Shell.mount(root)          // una vez
          Router.start()
            → onNavigate(pageId)
                → previous?.unmount()
                → Shell.applyManifest(page)
                → clear #boxiesContent
                → page.mount(#boxiesContent, ctx)
```

- **Navegación:** solo Router.
- **Logout:** dejar de servir Pages → mostrar Login; el Shell puede desmontarse o quedarse oculto según el plan técnico de Phase 1 (sin duplicar chrome).

---

## Checklist permanente (toda pantalla nueva)

1. ¿Necesita un nuevo HTML de app? → **NO**
2. ¿Necesita otro header? → **NO**
3. ¿Necesita otra sidebar? → **NO**
4. ¿Necesita otro workspace? → **NO**
5. ¿Necesita otro footer/dock? → **NO**
6. ¿Qué cambia? → **Solo `#boxiesContent`** (+ manifiesto nav/actions)

Cualquier “sí” en 1–5 invalida el diseño.

---

## Decisiones de producto fijadas en v1.0

### Host canónico: `/boxies` (V5.4)

- La aplicación administrativa vive en **`/boxies`**.
- `/admin` y `/admin2` fueron **eliminados**; deep-links hacen **301 → `/boxies/`**.
- Nota histórica: el ADR v1.0 mencionaba `/app` como nombre de producto; el host materializado y vigente es `/boxies`.

### Login: fuera del Shell

```text
/app
  → Auth Gate
  → ¿sesión?
      → NO  → Login (fuera del Shell)
      → SÍ  → BoxiesApp.boot() → Shell → Page
```

### Legacy dashboard: cuarentena

- `admin/dashboard` (y stack constructora asociada) **no** se migra al Core en la misma fase.
- Se mantiene en cuarentena / legacy.
- Cuando el Core esté estable: redirect.
- Nunca mezclar AdminAuth legacy dentro del Shell de plataforma en el mismo PR de foundation.

---

## Separación de capas

| Capa | Rol |
|---|---|
| **BoxiesApp / Core** | Boot, Auth gate, Router, Registry |
| **Shell** | Chrome inmutable + `#boxiesContent` |
| **Pages** | Manifiesto + mount/unmount del slot |
| **HALL** | Design system (primitivas). No es App Shell |
| **Dominios** (CMS, plataforma, etc.) | Lógica de producto dentro de Pages |

El design system (HALL) y el App Shell son capas distintas. Ambas obligatorias; ninguna sustituye a la otra.

---

## Naming de chrome

El chrome usa prefijo **`boxies-`**.  
El Content Slot se llama **`#boxiesContent`**.

La implementación hará el rename desde nombres legacy de layout en una fase técnica dedicada (con alias temporales si hace falta). Esta ADR solo fija el lenguaje canónico.

---

## Consecuencias

### Positivas

- Una sola aplicación escalable (CRM, Analytics, Billing, etc. sin reinventar layout).
- Imposible “casi igual”: el chrome es único.
- Cursor y humanos tienen un contrato versionado (ADR), no un chat.

### Negativas / costos

- Rename y consolidación de entrypoints.
- Disciplina estricta: rechazar PRs con segundo chrome.
- Legacy en cuarentena hasta redirects.

### Riesgos

| Riesgo | Mitigación |
|---|---|
| DOM duplicado “temporal” | Regla absoluta + QA de un solo `boxies-header` en DOM |
| Pages que mutan header | Solo manifiesto; sin APIs de DOM de chrome |
| Varios HTML host | Un `/app`; 301 desde `/admin2` |
| Mezclar Auth/RLS en foundation | Explicit non-goals |

---

## Colección de ADRs

Este documento inicia la serie:

| ID | Tema |
|---|---|
| **ADR-0001** | Application Architecture *(este documento)* |
| ADR-0002 | Authentication Model *(futuro)* |
| ADR-0003 | Routing Strategy *(futuro)* |
| ADR-0004 | Page Manifest Contract *(futuro, detalle)* |
| ADR-0005 | HALL Design System *(futuro / enlace a regla existente)* |

---

## Proceso de trabajo a partir de aquí

1. Aprobar ADR.
2. Diseñar plan técnico de implementación a partir del ADR.
3. Implementar **una fase pequeña**.
4. Validar.
5. Continuar con la siguiente fase.

No implementar foundation sin un plan técnico de Phase 1 derivado de este ADR.

---

## Fase 1 sugerida (solo planificación; no ejecutar aún)

Entregar únicamente:

- `BoxiesApp.boot()`
- Shell mount único + `#boxiesContent`
- Registry + una Page de prueba (p. ej. Projects)
- Host `/app` (y redirect desde `/admin2` cuando toque)

Sin features nuevas. Sin tocar Auth/Supabase/RLS/OAuth contracts. Sin rediseño visual por gusto.

---

## Aprobación

**ADR-0001 v1.0 — Accepted** como contrato arquitectónico oficial de BOXIES.
