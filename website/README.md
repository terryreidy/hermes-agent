# Website

This directory now builds a very small static site for Vercel.

## Build

```bash
npm run build
```

That writes a plain `build/index.html` with bold typography.

## Deployment

### Vercel

Vercel project settings:

- **Root Directory:** `website`
- **Build Command:** `npm run build`
- **Output Directory:** `build`

The repo already contains `website/vercel.json`, so Vercel should pick up the settings automatically.

### GitHub Pages

GitHub Pages is no longer the target for this directory, but the old notes are left here if you need them.
