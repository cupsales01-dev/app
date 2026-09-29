// Keeps the app page on the phone so it opens without signal. Data always comes from the network.
var P = 'cupsales-' + self.registration.scope + '-', C = P + '66313669';
self.addEventListener('install', function (e) { self.skipWaiting(); e.waitUntil(caches.open(C).then(function (c) { return c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png']); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x.indexOf(P) === 0 && x !== C; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // page: newest from the network when there is signal, the saved copy when there is not
  e.respondWith(fetch(e.request).then(function (r) { if (!r.ok) return r; var cp = r.clone(); caches.open(C).then(function (c) { c.put(u.pathname.endsWith('/') ? './' : e.request, cp).catch(function () { }); }); return r; })
    .catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('./'); }); }));
});
