self.addEventListener('install', (event) => {
  console.log('Lilith SW instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Lilith SW ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          console.log('[SW] Removendo cache antigo:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não sejam GET ou que não sejam http/https (ex: extensões, websockets)
  // Ignorar também rotas internas do Next.js e da API para evitar erros 503
  if (
    event.request.method !== 'GET' || 
    !event.request.url.startsWith('http') ||
    event.request.url.includes('/_next/') ||
    event.request.url.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch((err) => {
      // Evita erros "Uncaught (in promise) TypeError: Failed to fetch" no console
      console.warn('[SW] Falha ao buscar recurso:', event.request.url, err);
      return new Response('Serviço temporariamente indisponível offline.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
      });
    })
  );
});
