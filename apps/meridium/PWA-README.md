# SiteFlow Meridium PWA demo v0.7

- Installable over HTTPS on Android Chrome using the existing Vercel deployment.
- Stable app ID `/`, start URL `/`, scope `/`, theme `#092742`.
- `npm run build` generates `dist/sw.js` and precaches the built HTML, hashed JS/CSS, manifest, icons and demo logos using a content-versioned cache.
- Offline fallback loads the cached app shell. Demo tasks and preferences are localStorage only, **not synchronised**.
- SMS and WhatsApp remain simulations. No API endpoints, auth requests or external content are cached.
- Open the stable Vercel URL online, authenticate, wait for offline ready in Settings, and use Chrome menu > Install app / Add to home screen.
- Protected Vercel login can affect installation or future online launches. Protection was deliberately left enabled.
