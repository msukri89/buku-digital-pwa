const NAMA_CACHE = 'buku-pwa-v5';
const fileYangDisimpan = ['./', './index.html', './style.css', './app.js', './manifest.json'];

self.addEventListener('install', event => {
    self.skipWaiting(); // Paksa pakai versi baru
    event.waitUntil(caches.open(NAMA_CACHE).then(cache => cache.addAll(fileYangDisimpan)));
});

self.addEventListener('activate', event => {
    // Hapus memori nyangkut
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== NAMA_CACHE).map(key => caches.delete(key)))));
});

self.addEventListener('fetch', event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
