# Landing scroll frames

615 frames WebP + stills por pausa, en `frames-cel/` (móvil) y `frames-pc/` (desktop).

## Hosting

**No uses Supabase Storage.** Preferido: Bunny CDN.

- CDN: `https://boxies.b-cdn.net/landing/scroll/frames-cel|frames-pc/...`
- Local / Hostinger fallback: `/landing/assets/scroll/...`

Subida (desde la raíz del repo, con la Storage Zone Password de Bunny):

```powershell
$env:BUNNY_STORAGE_ACCESS_KEY = '...'
$env:BUNNY_STORAGE_ZONE = 'boxies'
py -3 scripts/upload-landing-scroll-frames.py
```

Cuando Bunny tenga los archivos, descomenta en `landing/index.html`:

```js
window.LANDING_SCROLL_CDN = 'https://boxies.b-cdn.net/landing/scroll';
```

(o deja que `scroll-story.js` detecte el HEAD a Bunny solo).

Las carpetas `frames-*` están en `.gitignore` (≈74 MB). Súbelas a Bunny o cópialas al deploy de Hostinger.
