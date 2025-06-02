// service-worker.js
// This script tries to unregister itself and clean up caches.

self.addEventListener('install', () => {
  // Skip waiting to ensure the new service worker activates quickly.
  self.skipWaiting();
});

self.addEventListener('activate', async (event) => {
  try {
    // Unregister the service worker.
    await self.registration.unregister();
    console.log('Service worker unregistered successfully.');

    // Clear all caches controlled by this origin.
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('Deleting cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
    console.log('All caches deleted successfully.');

    // Force-reload all open clients (pages) to ensure they are no longer controlled by this SW.
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      if (client.url && 'navigate' in client) {
        client.navigate(client.url);
      }
    });
    console.log('Attempted to reload open clients.');

  } catch (err) {
    console.error('Error during service worker activation/cleanup:', err);
  }
});

// No fetch handler, so all requests go directly to the network once this SW is inactive or unregistered.
self.addEventListener('fetch', (event) => {
  // Intentionally empty or pass through:
  // event.respondWith(fetch(event.request)); // Or just return to let browser handle.
  return;
});
