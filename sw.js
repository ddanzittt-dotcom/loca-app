const CACHE_NAME = 'loca-cache-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

// 설치 단계: 필요한 핵심 파일들을 브라우저 캐시에 저장합니다.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// 활성화 단계: 이전 버전의 캐시가 있다면 정리합니다.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 패치(Fetch) 단계: 네트워크 요청 시 캐시된 데이터가 있으면 먼저 반환합니다.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시 반환, 없으면 네트워크 요청
        if (response) {
          return response;
        }
        return fetch(event.request).then(fetchResponse => {
          // 유효하지 않은 응답은 바로 반환
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          // 정상 응답은 캐시에 복사해두고 반환
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
          return fetchResponse;
        });
      }).catch(() => {
        // 완전 오프라인일 때의 폴백(Fallback) 처리 공간
        console.log('오프라인 상태입니다.');
      })
  );
});