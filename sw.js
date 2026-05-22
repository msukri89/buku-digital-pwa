const CACHE_NAME = "pdf-flip-viewer-v10";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        FILES_TO_CACHE.map(function (file) {
          return cache.add(file).catch(function () {
            console.log("Gagal cache:", file);
          });
        })
      );
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(function (networkResponse) {
          return caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(function () {
          return caches.match("./index.html");
        });
    })
  );
});
