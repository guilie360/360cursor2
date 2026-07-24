# BOXIES V5.4 — Host canónico único

**Estado:** aplicado (eliminación definitiva de hosts legacy).

## Decisión

La única aplicación administrativa oficial es:

```text
/boxies
```

Los hosts legacy **`/admin`** y **`/admin2`** fueron retirados del árbol de código. Las peticiones a esas rutas hacen **301 → `/boxies/`** (ver `.htaccess`).

## Layout de código (post-migración)

| Área | Ubicación |
|------|-----------|
| Host HTML | `boxies/index.html` |
| Core BOXIES | `js/boxies/` |
| Builder / engines | `js/builder/` |
| APIs CMS | `js/api/proyectos.js`, `js/api/projects.js` |
| Estilos shell / builder | `css/boxies/` |
| Estilos auth compartidos | `css/auth/` |

No debe existir dependencia de runtime hacia directorios `admin/` o `admin2/`.

## Compatibilidad

- Sin adapters HTML en `/admin` o `/admin2`.
- Sin `BoxiesHostPolicy` ni gates dual-host.
- OAuth fallback sin `returnPath` → `/boxies/`.
- `AuthRedirects.adminBuilder` / `adminDashboard` → `/boxies/`.

## Documentación histórica

Los planes previos (`Phase-1-Foundation.md`, `Vertical-Slice-v0.1.md`, ADR host `/app`) describen la migración. **Este documento prevalece** respecto al host de producto: canónico = `/boxies` (no `/app`, no `/admin2`).
