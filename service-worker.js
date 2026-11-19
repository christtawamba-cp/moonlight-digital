const CACHE_NAME = "moonlight-digital-v2";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-512.png"
];
// INSTALLATION
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});
// ACTIVATION
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});
// GESTION DES REQUÊTES
self.addEventListener("fetch", event => {
  const request = event.request;
  // Ne pas intercepter les requêtes qui ne sont pas HTTP(S)
  if (!request.url.startsWith("http")) {
    return;
  }
  const url = new URL(request.url);
  // Ne pas gérer les requêtes vers Supabase ou d'autres domaines
  if (url.origin !== self.location.origin) {
    return;
  }
  // Les pages HTML doivent être récupérées depuis le serveur
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseCopy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match("./index.html");
          });
        })
    );
    return;
  }
  // Les autres fichiers utilisent le cache puis le réseau
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(response => {
        if (response.ok && request.method === "GET") {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseCopy);
          });
        }
        return response;
      });
    })
  );
});
