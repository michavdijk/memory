const CACHE_NAME = "retro-memory-cache-v10";
const ASSETS_TO_CACHE = [
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/mario.png",
  "/images/luigi.png",
  "/images/peach.png",
  "/images/yoshi.png",
  "/images/boo.png",
  "/images/goomba.png",
  "/images/green_mushroom.png",
  "/images/red_mushroom.png"
];

self.addEventListener("install", (event) => {
  // Tijdens installatie cachen we alle kernbestanden zodat de app offline werkt.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (event) => {
  // Verwijder oude caches zodat alleen de nieuwste versie wordt behouden.
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Gebruik eerst de cache en probeer anders het netwerk.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        return caches.match("/index.html");
      });
    })
  );
});
