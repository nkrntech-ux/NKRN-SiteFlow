import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
async function filesIn(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async entry => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return paths.flat();
}
const files = (await filesIn(dist)).filter(file => !file.endsWith('/sw.js') && !file.endsWith('.map')).sort();
const digest = createHash('sha256');
const precache = [];
for (const file of files) {
  const url = '/' + relative(dist, file).split(sep).join('/');
  precache.push(url);
  digest.update(url);
  digest.update(await readFile(file));
}
const cacheName = 'siteflow-meridium-demo-' + digest.digest('hex').slice(0, 16);
const sw = [
  '/* Generated for SiteFlow Meridium demo; static app shell only. */',
  'const CACHE_NAME = ' + JSON.stringify(cacheName) + ';',
  'const APP_PATHS = ' + JSON.stringify(precache) + ';',
  "const APP_CACHE_PREFIX = 'siteflow-meridium-demo-';",
  "self.addEventListener('install', event => {",
  '  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_PATHS)));',
  '  self.skipWaiting();',
  '});',
  "self.addEventListener('activate', event => {",
  '  event.waitUntil((async () => {',
  '    const keys = await caches.keys();',
  '    await Promise.all(keys.filter(key => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));',
  '    await self.clients.claim();',
  '  })());',
  "self.addEventListener('fetch', event => {",
  '  const request = event.request;',
  "  if (request.method !== 'GET') return;",
  '  const url = new URL(request.url);',
  '  if (url.origin !== self.location.origin) return;',
  "  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;",
  "  if (request.mode === 'navigate') {",
  '    event.respondWith((async () => {',
  '      try { return await fetch(request); }',
  "      catch { return (await caches.match('/index.html')) || Response.error(); }",
  '    })());',
  '    return;',
  '  }',
  '  if (!APP_PATHS.includes(url.pathname)) return;',
  '  event.respondWith((async () => {',
  '    const cached = await caches.match(url.pathname);',
  '    if (cached) return cached;',
  '    return fetch(request);',
  '  })());',
  '});'
].join('\n') + '\n';
await writeFile(join(dist, 'sw.js'), sw, 'utf8');
console.log('SiteFlow PWA: ' + precache.length + ' cached app-shell files; ' + cacheName);
