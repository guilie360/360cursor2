# Phase 1 — Foundation

| Campo | Valor |
|---|---|
| **Status** | Historical — superseded by [BOXIES V5.4](./BOXIES-V5.4-Canonical-Host.md) (`/boxies` only) |
| **Based on** | [ADR-0001](../adr/ADR-0001-boxies-application-architecture.md) v1.0 |
| **Goal** | Establecer `BoxiesApp` + Shell inmutable + Registry/Router mínimos + una Page real, sin features nuevas |
| **Out of band** | Auth contracts, Supabase, RLS, OAuth, HALL redesign, legacy dashboard migration |

> **V5.4:** `/admin` y `/admin2` eliminados; host canónico = `/boxies`. Paths `admin/js/boxies/` en este doc son históricos.
>
> **Nota v0.1 (histórica):** el primer materializado usó host **`/boxies`** (paralelo a `/admin2`), no `/app`.

---

## 0. Propósito

Convertir la decisión de ADR-0001 en un plan **ejecutable, ordenado y verificable**.

Al terminar Phase 1 debe ser cierto:

1. Existe **un** host de aplicación en `/app`.
2. Existe **un** Shell montado por `BoxiesApp.boot()` (no por las Pages).
3. Existe **un** `#boxiesContent`.
4. Existe **un** registro de Pages y un Router mínimo.
5. `ProjectsPage` corre dentro del Shell.
6. El editor de proyecto (`BuilderPage`) corre dentro del **mismo** Shell (mismo DOM de chrome).
7. Si se vacía `#boxiesContent`, ambas rutas se ven idénticas a nivel chrome.
8. No se tocÓ Auth/Supabase/RLS/OAuth ni se rediseñó UI por gusto.

---

## 1. No se toca en esta fase

| Área | Acción |
|---|---|
| Supabase schema / migrations | No |
| RLS | No |
| OAuth flows / callback logic | No (solo redirects de URL de app si hace falta `returnPath` hacia `/app`) |
| Auth model / `profiles.rol` / AdminAuth legacy | No (reutilizar gate actual de plataforma) |
| HALL design system visual polish | No |
| Features nuevas (Users/Media/Settings reales) | No — pueden quedar stubs registrados o diferirse a Phase 2 |
| Migrar `admin/dashboard` al Core | No — cuarentena |
| Showroom visitante | No |
| Event bus avanzado | No |

---

## 2. Decisiones de producto (ya fijadas en ADR-0001)

| Tema | Decisión |
|---|---|
| Host | `/app` |
| Redirect | `/admin2` → 301 → `/app` |
| Login | Fuera del Shell |
| Legacy dashboard | Cuarentena |
| Content slot | `#boxiesContent` |
| Naming chrome | `boxies-*` |

---

## 3. Resultado estructural objetivo

```text
/app/index.html                 ← único host HTML de la app
docs/adr/ADR-0001-...           ← ya existe
docs/architecture/Phase-1-...   ← este documento

js/boxies/  OR  admin/js/boxies/   ← Core (preferencia: admin/js/boxies/ junto a plataforma actual)
  app.js                BoxiesApp.boot()
  shell.js              BoxiesAppShell (mount / applyManifest / contentEl)
  router.js             Router mínimo
  pages.js              Page Registry
  auth-bridge.js        Adaptador al gate existente (sin reescribir Auth)

css/boxies/
  shell.css             SOLO geometría/chrome del Shell (extraído)

admin/js/pages/
  projects-page.js
  builder-page.js       ← wrap del editor actual, no rewrite de engines

.cursor/rules/
  boxies-app-shell.mdc  ← checklist permanente ADR
```

> **Nota de ubicación:** preferir `admin/js/boxies/` y `css/boxies/` para no mezclar Core con el showroom raíz. El plan técnico asume esa convención salvo que la revisión diga lo contrario.

---

## 4. Inventario: crear / renombrar / eliminar / conservar

### 4.1 Crear

| Archivo | Rol |
|---|---|
| `app/index.html` | Host canónico `/app` |
| `css/boxies/shell.css` | Chrome geometry (`boxies-header`, sidebar, workspace, dock, vars) |
| `admin/js/boxies/app.js` | `BoxiesApp.boot()` |
| `admin/js/boxies/shell.js` | Shell mount + applyManifest + `#boxiesContent` |
| `admin/js/boxies/pages.js` | Registry `register` / `get` / `list` |
| `admin/js/boxies/router.js` | Activate page by id (+ query parse mínima) |
| `admin/js/boxies/auth-bridge.js` | Reutiliza sesión plataforma existente; no nuevo auth stack |
| `admin/js/pages/projects-page.js` | Manifiesto + mount tabla proyectos |
| `admin/js/pages/builder-page.js` | Manifiesto + mount del editor (engines intactos) |
| `.cursor/rules/boxies-app-shell.mdc` | Regla alwaysApply del checklist ADR |
| `app/.htaccess` o regla Hostinger equiv. | 301 `/admin2` → `/app` *(según hosting)* |

### 4.2 Evolucionar (no borrar aún)

| Archivo | Cambio en Phase 1 |
|---|---|
| `admin/js/platform/boxies-app-shell.js` | Sustituir por `admin/js/boxies/shell.js` o convertir en thin re-export; eliminar string HTML paralelo al final de la fase |
| `admin/css/ai-project-builder.css` | Separar: chrome → `css/boxies/shell.css`; resto (steps/widgets) permanece como CSS de BuilderPage |
| `admin/js/views/ai-project-builder.js` | Dejar de poseer el Shell; convertirse / delegar en `builder-page.js` |
| `admin/js/builder/dock.js` | API del dock pasa a Shell (o Shell llama Dock como capability) |
| `admin2/*` | Dejar de ser app host; redirect o página mínima que redirige a `/app` |
| `admin/ai-project-builder.html` | Alias: boot `/app?page=builder&proyecto=` o mount del mismo Core |

### 4.3 Renombrar (clases / ids / vars de chrome)

| Legacy | Canónico |
|---|---|
| `builder-app` | `boxies-app` |
| `builder-header-fixed` | `boxies-header` |
| `builder-header-left` | `boxies-header__left` |
| `builder-header-title` | `boxies-header__title` |
| `builder-header-actions` | `boxies-header__actions` |
| `builder-header-btn` | `boxies-header-btn` |
| `builder-header-action-btn` | `boxies-action-btn` |
| `builder-progress-sidebar` | `boxies-sidebar` |
| `builder-rail-item` | `boxies-nav-item` |
| `builder-rail-row` | `boxies-nav-item__row` |
| `builder-rail-mark` | `boxies-nav-item__mark` |
| `builder-workspace` | `boxies-workspace` |
| `builder-main-panel` | `boxies-workspace__panel` |
| `#builderStepPanel` | `#boxiesContent` |
| `builder-dock` | `boxies-dock` |
| `builder-dock-inner` | `boxies-dock__inner` |
| `builder-dock-tools` | `boxies-dock__tools` |
| `builder-dock-ctrl` | `boxies-dock__ctrl` |
| `--builder-header-height` | `--boxies-header-h` |
| `--builder-rail-width` | `--boxies-sidebar-w` |
| `--builder-dock-height` | `--boxies-dock-h` |
| `--builder-dock-safe` | `--boxies-dock-safe` |
| `platform-builder-shell` / `builder-has-dock` | `boxies-app` / `boxies-has-dock` |

**Estrategia de rename:** en Phase 1 se permite **alias CSS temporal** (ambos selectores) durante como máximo 1 fase; al cierre de Phase 1 QA debe usar solo canónicos en chrome montado por Shell. Clases de **dominio** del editor (`.builder-step-title`, engines UI) pueden quedar con prefijo `builder-` *dentro del Content Slot* — son contenido de BuilderPage, no chrome.

### 4.4 Eliminar / vaciar al cierre de Phase 1

| Archivo | Acción |
|---|---|
| Layout overrides en `admin2/css/shell.css` que toquen geometría de chrome | Eliminar o reducir a redirect-only |
| HTML chrome duplicado en `admin2/index.html` | Sustituir por redirect a `/app` |
| Fallback string HTML de Shell dentro de `ai-project-builder.js` | Eliminar; solo `BoxiesApp` / Shell |
| Uso de `#builderStepPanel` en Shell | Eliminar |

### 4.5 Conservar sin migrar

| Archivo | Motivo |
|---|---|
| `admin/js/builder/engines/*` | Dominio CMS |
| `admin/js/platform-builder/bootstrap.js` | Adaptar llamada a boot; no reescribir auth |
| `admin2/js/auth-gate.js` (lógica) | Extraer/adaptar a `auth-bridge`; no cambiar reglas de rol |
| `admin2/js/api/projects.js` | Reutilizar desde ProjectsPage |
| `admin/dashboard.html` + AdminAuth | Cuarentena |
| `auth/*` | Fuera del Shell |
| `css/hall/*` | Design system |

---

## 5. Orden de implementación (dependencias)

```text
T0  Docs already: ADR-0001 + this plan (commit docs)
 │
T1  css/boxies/shell.css          ← extract chrome rules (alias ok)
 │
T2  admin/js/boxies/shell.js      ← mount DOM canónico + #boxiesContent
 │     depends: T1
T3  admin/js/boxies/pages.js      ← registry
T4  admin/js/boxies/router.js     ← depends: T3, T2
T5  admin/js/boxies/auth-bridge.js
T6  admin/js/boxies/app.js        ← depends: T2–T5
 │
T7  app/index.html                ← host /app + login gate UI reuse
 │     depends: T6
T8  ProjectsPage                  ← depends: T6, API projects
T9  BuilderPage wrap              ← depends: T6, existing editor
 │     depends: T1 aliases so editor CSS still works during cutover
T10 Wire deep-links / redirects   ← /admin2→/app, builder URL→/app?page=builder
T11 Remove duplicate chrome       ← admin2 shell geometry, fallbacks
T12 Cursor rule boxies-app-shell.mdc
T13 QA gate                       ← acceptance below
```

No empezar T9 antes de T8 si se quiere validar Shell con Page simple primero (recomendado).  
BuilderPage es el cambio de mayor riesgo: va **después** de ProjectsPage verde.

---

## 6. Tareas Phase 1 (checklist)

### PHASE 1 — FOUNDATION

#### 1. Crear `BoxiesApp`
- [ ] `admin/js/boxies/app.js` con `BoxiesApp.boot()`
- [ ] Orquesta: auth-bridge → shell.mount → router.start
- [ ] **No** exporta API para que Pages construyan Shell

**Aceptación:** desde consola/`boot`, tras sesión válida, existe exactamente un `.boxies-header` en el DOM.

#### 2. Extraer `BoxiesAppShell`
- [ ] `admin/js/boxies/shell.js`: `mount(root)`, `unmount()`, `applyManifest(manifest)`, `getContentEl()`
- [ ] DOM único: header / sidebar / workspace / `#boxiesContent` / dock
- [ ] Pages no reciben nodos de header para mutarlos

**Aceptación:** `getContentEl().id === 'boxiesContent'`; vaciar slot no destruye chrome.

#### 3. Migrar naming `builder-*` → `boxies-*` (chrome)
- [ ] Extraer reglas a `css/boxies/shell.css`
- [ ] Alias temporales documentados
- [ ] Body/html classes canónicas

**Aceptación:** Shell montado usa clases canónicas; screenshot chrome == chrome previo del editor (tolerancia visual, no pixel-perfect redesign).

#### 4. Crear `#boxiesContent`
- [ ] Único slot de contenido
- [ ] Eliminar dependencia de `#builderStepPanel` en Shell
- [ ] BuilderPage escribe en `#boxiesContent` (adapter si engines aún buscan el id viejo: un solo alias interno en BuilderPage, no en Shell)

**Aceptación:** `document.querySelectorAll('#boxiesContent').length === 1`.

#### 5. Crear Page Registry
- [ ] `register(manifest)`, `get(id)`, `list()`
- [ ] Validar campos mínimos: `id`, `mount`, `unmount`

**Aceptación:** registrar dos pages stub y listarlas sin montar Shell dos veces.

#### 6. Crear Router
- [ ] Resolve page id desde path/query (`?page=projects` v1 está bien)
- [ ] Lifecycle: unmount → applyManifest → mount
- [ ] Default page: `projects`

**Aceptación:** navegar `projects` ↔ stub no duplica header.

#### 7. Montar `ProjectsPage` de prueba (producción-usable)
- [ ] Manifiesto nav plataforma
- [ ] Reutilizar listado actual de proyectos + link al editor
- [ ] Solo pinta dentro de `#boxiesContent`

**Aceptación:** `/app` (logueado) muestra tabla; chrome = Shell; Administrar abre BuilderPage o deep-link acordado.

#### 8. Migrar `BuilderPage`
- [ ] Editor existente monta **dentro** del Shell
- [ ] Acciones Guardar/Publicar/Showroom vía manifiesto `actions` / left
- [ ] Rail de pasos = nav del manifiesto de BuilderPage (Shell interpreta)
- [ ] Engines sin cambio de negocio

**Aceptación:** editar `?proyecto=demo3` funciona; un solo chrome; fullscreen dock ok.

#### 9. Eliminar layouts duplicados
- [ ] `/admin2` → redirect `/app`
- [ ] Quitar HTML/CSS chrome paralelo de admin2
- [ ] Quitar fallback Shell string en view builder
- [ ] `ai-project-builder.html` no introduce segundo Shell

**Aceptación:** grep de montaje: una sola función `Shell.mount` en runtime de app.

#### 10. QA
- [ ] Ejecutar batería §8
- [ ] Actualizar ADR-0001 status note: Phase 1 implemented *(solo tras QA)*

---

## 7. Criterios de aceptación globales (Definition of Done Phase 1)

1. **Un solo DOM de chrome** en `/app` autenticado (`querySelectorAll('.boxies-header').length === 1`).
2. **Slot vacío idéntico:** Projects y Builder sin contenido de page → misma estructura de chrome.
3. **Login fuera del Shell:** sin sesión no existe `.boxies-app` montado (o equivalente).
4. **ProjectsPage** lista proyectos con la API actual.
5. **BuilderPage** carga proyecto por slug/query sin regresión funcional conocida del editor.
6. **`/admin2`** redirige a `/app`.
7. **No** hay cambios en migraciones Supabase / RLS / OAuth core.
8. **Cursor rule** `boxies-app-shell.mdc` presente.
9. Working tree de Phase 1 no reintroduce `admin2` layout geometry.

---

## 8. Pruebas antes de continuar a Phase 2

### Manual

| # | Prueba | Resultado esperado |
|---|---|---|
| M1 | Abrir `/app` sin sesión | Login, no Shell |
| M2 | Login plataforma válido | Shell + ProjectsPage |
| M3 | Navegar stub/settings si existe | Sin segundo header |
| M4 | Projects → Administrar demo3 | BuilderPage mismo chrome |
| M5 | Guardar / Publicar en builder | Comportamiento previo |
| M6 | Fullscreen dock | Entra/sale OK |
| M7 | Logout | Vuelve a Login; no chrome huérfano |
| M8 | `/admin2` | Land en `/app` |
| M9 | URL legacy builder | Land en app+builder o redirect documentado |

### Invariantes (consola)

```js
document.querySelectorAll('.boxies-header').length === 1
document.querySelectorAll('#boxiesContent').length === 1
document.querySelectorAll('.boxies-sidebar').length === 1
document.querySelectorAll('.boxies-dock').length === 1
```

### Diff de arquitectura

- Ningún PR de Phase 1 añade `dashboard-header` / `dashboard-sidebar` nuevos para plataforma.
- Ninguna Page llama a `document.querySelector('.boxies-header')` para mutar estructura (solo lectura prohibida también salvo APIs Shell).

---

## 9. Riesgos y mitigaciones (Phase 1)

| Riesgo | Mitigación |
|---|---|
| Cortar CSS del editor al extraer chrome | Alias + dejar step/widget CSS en archivo builder |
| Bootstrap del builder asume `#builderRoot` | Adapter en BuilderPage; no reescribir engines |
| OAuth `returnPath` apunta a `/admin2` | Permitir ambos en bridge; preferir `/app` en saves nuevos |
| Hostinger path `/app` | Verificar deploy estático + redirect rules |
| Scope creep (“ya que estamos, Users real”) | Bloqueado por No objetivos |

---

## 10. Entregables de documentación (este hito)

Antes de escribir código de foundation:

1. ADR-0001 Accepted — **hecho**
2. Este Phase-1 plan — **revisión pendiente**
3. **Un solo commit** de documentación arquitectónica:
   - `docs/adr/**`
   - `docs/architecture/Phase-1-Foundation.md`
4. Tras aprobación del plan → implementación por tareas 1→10

---

## 11. Qué sigue después de Phase 1 (fuera de alcance)

- Phase 2: Pages stub reales (Users/Media/Settings) solo manifiesto + placeholder en slot
- ADR-0003 Routing Strategy (paths limpios `/app/projects`)
- ADR-0004 detalle formal del manifiesto
- Retiro de aliases CSS `builder-*` de chrome
- Redirect legacy dashboard

---

## 12. Aprobación

| Revisor | Estado |
|---|---|
| Product / Architecture | Pending |
| Ready for docs commit | Pending |
| Ready for implementation | Blocked until plan approved |
