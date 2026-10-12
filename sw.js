/* =========================================================
   オフラインで使えるようにする仕組み（サービスワーカー）
   - 一度ひらいたファイルをスマホの中に保存しておき、
     電波がないときは保存したものを使う
   - アプリや問題を更新したら VERSION の数字を1つ上げる
   ========================================================= */
const VERSION = 'v2';
const CACHE = 'takkenmogi-' + VERSION;

const APP_FILES = [
  './',
  './index.html',
  './questions.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// インストール時：アプリのファイルをまとめて保存
self.addEventListener('install', (e) => {
  const requests = APP_FILES.map((url) => new Request(url, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(requests)).then(() => self.skipWaiting()));
});

// 古いバージョンの保存データを消す
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 保存してあるものをすぐ返し、電波があれば裏で新しいものに入れかえる
// （入れかえが終わるまで waitUntil で待たせる。待たせないと途中で止められ、古いまま残ることがある）
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const network = fetch(e.request.url, { cache: 'no-cache' }).then(async (res) => {
    if (res && res.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(e.request, res.clone());
    }
    return res;
  });
  e.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(e.request, { ignoreSearch: true }))
      .then((cached) => cached || network)
  );
  e.waitUntil(network.catch(() => {}));
});
