// Keeps the app page on the phone so it opens without signal. Data always comes from the network.
// v2.5.21: also when GitHub (where the page is kept) is down or slow: an error page, a page that is not the app,
// or no answer within 8 seconds -> the saved copy opens instead.
var P = 'cupsales-' + self.registration.scope + '-', C = P + 'f798e2a2';
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
// v2.7.0: phone notifications (Firebase sends data only: title, body, tab, id). A tap opens CupSales on the bell.
self.addEventListener('message', function (e) { var d = e.data || {}; if (d.cs === 'url' && d.url) e.waitUntil(caches.open('cs-url-' + self.registration.scope).then(function (c) { return c.put('last-url', new Response(String(d.url))); })); });
self.addEventListener('push', function (e) {
  var m = {}; try { m = e.data ? e.data.json() : {}; } catch (x) { try { m = { data: { body: e.data.text() } }; } catch (y) { } }
  var d = m.data || (m.notification ? { title: m.notification.title, body: m.notification.body } : {}) || {};
  e.waitUntil(self.registration.showNotification(String(d.title || 'CupSales'), { body: String(d.body || ''), icon: 'icon-192.png', badge: 'icon-192.png', tag: String(d.id || 'cupsales'), data: { tab: String(d.tab || '') } }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (L) {
    for (var i = 0; i < L.length; i++) { if (L[i].url.indexOf(self.registration.scope) === 0) { try { L[i].postMessage({ cs: 'bell' }); } catch (x) { } return L[i].focus(); } }
    return caches.open('cs-url-' + self.registration.scope).then(function (c) { return c.match('last-url'); }).then(function (r) { return r ? r.text() : self.registration.scope; }).then(function (u) { return self.clients.openWindow(u); });
  }));
});
