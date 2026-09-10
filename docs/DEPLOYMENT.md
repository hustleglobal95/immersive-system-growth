# Deployment

Forge is a standard Next.js application and can deploy to hosts that support the selected Next.js runtime.

Before production:

```bash
npm run check
npm run build
```

Then test the production build with `npm run start`.

## Production checks

- verify all GLB, texture, HDR and video paths resolve
- test direct navigation and refresh
- test iOS Safari and Android Chrome on real hardware
- test reduced-motion mode
- test slow network loading
- verify no cross-origin asset failures
- verify page content remains useful before 3D assets finish loading
- inspect the final bundle and asset weight
