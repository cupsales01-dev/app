// Keeps the app page on the phone so it opens without signal. Data always comes from the network.
// v2.5.21: also when GitHub (where the page is kept) is down or slow: an error page, a page that is not the app,
// or no answer within 8 seconds -> the saved copy opens instead.
var P = 'cupsales-' + self.registration.scope + '-', C = P + '060f4ff8';
self.addEventListener('install', function (e) { self.skipWaiting(); e.waitUntil(caches.open(C).then(function (c) { return c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png']); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x.indexOf(P) === 0 && x !== C; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); })); });
function saved(req, page) { return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || (page ? caches.match('./') : r); }); } // only the page falls back to the saved page
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  var page = u.pathname.endsWith('/') || u.pathname.endsWith('.html');
  // page: newest from the network when there is signal and GitHub answers well, the saved copy when not
  var net = fetch(e.request).then(function (r) {
    if (!r.ok) return saved(e.request, page).then(function (s) { return s || r; });
    if (!page) { var cp = r.clone(); return caches.open(C).then(function (c) { return c.put(e.request, cp); }).catch(function () { }).then(function () { return r; }); }
    return r.clone().text().then(function (t) {
      if (t.indexOf('CupSales') < 0 || t.indexOf('function toast(') < 0) return saved(e.request, page).then(function (s) { return s || r; }); // not the app (an outage page)
      var cp2 = r.clone(); return caches.open(C).then(function (c) { return c.put(u.pathname.endsWith('/') ? './' : e.request, cp2); }).catch(function () { }).then(function () { return r; });
    });
  }).catch(function () { return saved(e.request, page); });
  var slow = new Promise(function (ok) { setTimeout(function () { saved(e.request, page).then(function (s) { if (s) ok(s); }); }, 8000); });
  e.waitUntil(net.catch(function () { })); // the newest page is still saved when the saved copy answered first
  e.respondWith(page ? Promise.race([net, slow]).then(function (r) { return r || net; }) : net);
});
