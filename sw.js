/* Service Worker: macht Systemtools installierbar und offline nutzbar.
   Eigene Dateien: erst Netz, bei Fehler aus dem Cache (Updates kommen sofort an).
   Fremde Adressen (CDN, Sprachmodelle, Speedtest, IP-Abfrage) werden nicht angefasst. */
const CACHE = "st-app-v1";
const PRECACHE = [
  "./",
  "einstellungen/",
  "tools/akku/",
  "tools/fps/",
  "tools/geraete/",
  "tools/geraeteinfo/",
  "tools/licht/",
  "tools/netzwerk/",
  "tools/palette/",
  "tools/rechner/",
  "tools/sensoren/",
  "tools/speedtest/",
  "tools/transkription/",
  "tools/verknuepfungen/",
  "apps/2048/",
  "apps/befehle/",
  "apps/buchstabieren/",
  "apps/datum/",
  "apps/einheiten/",
  "apps/lernkarten/",
  "apps/memory/",
  "apps/minesweeper/",
  "apps/notizen/",
  "apps/passwort/",
  "apps/ports/",
  "apps/prozent/",
  "apps/schiebepuzzle/",
  "apps/snake/",
  "apps/stoppuhr/",
  "apps/subnetz/",
  "apps/sudoku/",
  "apps/tetris/",
  "apps/text/",
  "apps/tictactoe/",
  "apps/timer/",
  "apps/todo/",
  "apps/trinkgeld/",
  "apps/wuerfel/",
  "apps/zaehler/",
  "apps/zahlensysteme/",
  "assets/style.css",
  "assets/common.js",
  "manifest.json",
  "assets/icons/icon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/maskable-512.png",
  "assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("st-app-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") { const home = await caches.match(new URL("./", self.registration.scope).href); if (home) return home; }
      throw err;
    }
  })());
});
