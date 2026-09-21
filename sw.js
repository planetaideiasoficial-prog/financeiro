const CACHE_NAME = 'gestor-financeiro-v5';
const ARQUIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// Instala e faz o cache inicial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS_CACHE).catch(() => {
        // Se algum arquivo externo falhar, continua mesmo assim
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Intercepta requisições e serve do cache quando possível
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Não interceptar requisições do Firebase (Auth e Firestore)
  if (request.url.includes('firebase') ||
      request.url.includes('firestore') ||
      request.url.includes('googleapis.com') ||
      request.url.includes('identitytoolkit')) {
    return;
  }

  // Estratégia: cache primeiro, rede depois
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Guarda uma cópia no cache para a próxima
        if (response && response.status === 200 && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Se estiver offline e não tiver no cache, retorna o index
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
