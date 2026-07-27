// Exists only so Chrome offers "Install app" instead of "Add to Home screen" — its
// installability check requires a service worker with a fetch handler.
// ponytail: deliberately empty, no caching. Caching here would serve a stale app from
// the phone mid-move and make every fix look like it didn't deploy. If offline start-up
// ever matters, cache the four static files here and bump a version string on release.
self.addEventListener('fetch', function () {});
