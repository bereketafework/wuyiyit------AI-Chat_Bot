
const CACHE_NAME = 'wuyiyit-ai-cache-v1.8'; // Incremented version
const urlsToCache = [
  '/', 
  '/index.html',
  '/manifest.json',
  '/index.tsx', 
  '/App.tsx',   
  '/types.ts',
  '/services/dbService.ts',
  '/services/geminiService.ts',
  '/services/supabaseClient.ts',
  '/localization.ts',

  // Key Components
  '/components/ChatMessage.tsx',
  '/components/ChatSessionList.tsx',
  '/components/HelpModal.tsx',
  '/components/LoadingSpinner.tsx',
  '/components/fileUtils.ts',
  '/components/ConfirmDeleteModal.tsx',
  // '/components/ConfirmClearHistoryModal.tsx', // Removed from cache
  '/components/EmailPasswordAuthForm.tsx',

  // Icons (TSX components)
  '/components/icons/SendIcon.tsx',
  '/components/icons/UserIcon.tsx',
  '/components/icons/BIcon.tsx',
  '/components/icons/MenuIcon.tsx',
  '/components/icons/PaperclipIcon.tsx',
  '/components/icons/XCircleIcon.tsx',
  '/components/icons/FileIcon.tsx',
  '/components/icons/PlusIcon.tsx',
  '/components/icons/QuestionMarkCircleIcon.tsx',
  '/components/icons/ChevronDownIcon.tsx',
  '/components/icons/BriefcaseIcon.tsx',
  '/components/icons/SparklesIcon.tsx',
  '/components/icons/AcademicCapIcon.tsx',
  '/components/icons/ChatBubbleLeftRightIcon.tsx',
  // '/components/icons/BroomIcon.tsx', // Removed from cache
  '/components/icons/NewTrashIcon.tsx',
  '/components/icons/SunIcon.tsx',
  '/components/icons/MoonIcon.tsx',
  '/components/icons/LogoutIcon.tsx',
  '/components/icons/InstallIcon.tsx',
  
  // App Icons (actual image files, from manifest.json)
  '/icon-48x48.png',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-256x256.png',
  '/icon-384x384.png',
  '/icon-512x512.png',

  // External Libraries & Resources
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;700&family=Noto+Sans:wght@400;500;700&display=swap',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/client',
  'https://esm.sh/@google/genai@^1.2.0',
  'https://esm.sh/@supabase/supabase-js@^2.44.4',
  'https://esm.sh/@vercel/analytics@1.2.2/react' // Added based on index.html importmap
];

const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/index.tsx',
    '/App.tsx',
    '/types.ts',
    '/localization.ts',
    '/services/supabaseClient.ts',
    '/services/dbService.ts',
    '/services/geminiService.ts',
    // Key components needed for initial render
    '/components/ChatSessionList.tsx', 
    '/components/ChatMessage.tsx',
    '/components/EmailPasswordAuthForm.tsx',
    '/components/LoadingSpinner.tsx',
    // Main external libs from importmap that are not dynamically loaded by esm.sh itself initially
    'https://esm.sh/react@^19.1.0',
    'https://esm.sh/react-dom@^19.1.0/client',
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('Opened cache:', CACHE_NAME);

        // Cache critical assets - installation fails if any of these fail
        console.log('Caching critical assets...');
        const criticalCachePromises = CRITICAL_ASSETS.map(async (urlToCache) => {
          const request = new Request(urlToCache, { mode: 'cors' }); // Use CORS for all, including local
          try {
            const response = await fetch(request);
            if (!response.ok) {
                // For esm.sh/cdn, try no-cors if cors fails, as they might be opaque
                if (urlToCache.startsWith('https://esm.sh') || urlToCache.startsWith('https://cdn.') || urlToCache.startsWith('https://fonts.googleapis.')) {
                     console.warn(`CORS fetch for critical ${urlToCache} failed (status ${response.status}), trying no-cors.`);
                     const noCorsResponse = await fetch(new Request(urlToCache, { mode: 'no-cors' }));
                     if (noCorsResponse.type === 'opaque') { // Opaque responses are fine for caching
                        await cache.put(urlToCache, noCorsResponse);
                        console.log('Successfully cached critical asset (no-cors):', urlToCache);
                        return;
                     } else {
                        throw new Error(`no-cors fetch for critical asset ${urlToCache} also failed or was not opaque. Status: ${noCorsResponse.status}`);
                     }
                }
              throw new Error(`Failed to fetch critical asset ${urlToCache} with status ${response.status}`);
            }
            await cache.put(urlToCache, response);
            // console.log('Successfully cached critical asset:', urlToCache);
          } catch (err) {
            console.error(`Failed to cache critical asset ${urlToCache}:`, err);
            throw err; // Re-throw to make Promise.all fail
          }
        });
        await Promise.all(criticalCachePromises);
        console.log('Critical assets cached successfully.');

        // Cache non-critical assets (best effort)
        console.log('Caching non-critical assets...');
        const nonCriticalAssets = urlsToCache.filter(url => !CRITICAL_ASSETS.includes(url));
        const nonCriticalCachePromises = nonCriticalAssets.map(async (urlToCache) => {
          const request = new Request(urlToCache, { mode: 'cors' });
          try {
            let response = await fetch(request);
            if (!response.ok) {
              if (urlToCache.startsWith('https://cdn.') || urlToCache.startsWith('https://fonts.googleapis.') || urlToCache.startsWith('https://fonts.gstatic.') || urlToCache.startsWith('https://esm.sh')) {
                // console.warn(`CORS fetch for non-critical ${urlToCache} failed, trying no-cors.`);
                response = await fetch(new Request(urlToCache, { mode: 'no-cors' }));
              } else {
                // For local non-critical assets, non-ok is still an issue for that specific asset
                console.warn(`Failed to fetch non-critical local asset ${urlToCache} with status ${response.status}`);
                return; // Skip caching this one
              }
            }
            // Cache if the response is ok (status 200) or opaque (for no-cors requests)
            if (response.status === 200 || response.type === 'opaque') {
              await cache.put(urlToCache, response);
              // console.log('Successfully cached non-critical asset:', urlToCache);
            } else {
              console.warn(`Skipping caching for non-critical ${urlToCache} due to non-ok/non-opaque response status: ${response.status}`);
            }
          } catch (err) {
            console.warn(`Skipping caching for non-critical ${urlToCache} due to error:`, err);
            // Do not re-throw for non-critical assets
          }
        });
        await Promise.all(nonCriticalCachePromises);
        console.log('Non-critical assets caching attempt complete.');

        await self.skipWaiting();
      } catch (err) {
        console.error('Service worker installation failed due to critical asset caching failure:', err);
        // If waitUntil's promise rejects, the SW install fails.
        throw err; 
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) 
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Network-first for Supabase API calls (or any other API calls you don't want cached)
  if (requestUrl.hostname.endsWith('supabase.co') || requestUrl.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For navigation requests (e.g., loading the app or navigating to a new "page" in SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If network response is OK, cache it (optional, for potential faster loads later) and return it
          if (response.ok) {
            // It's often not necessary to cache navigation requests themselves beyond the app shell,
            // unless they are distinct HTML pages. For an SPA, index.html is the key.
            // const resClone = response.clone();
            // caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => {
          // Network failed, serve the app shell (index.html) from cache
          console.log(`Network failed for navigation to ${event.request.url}, serving /index.html from cache.`);
          return caches.match('/index.html')
            .then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                // Fallback to '/' if '/index.html' somehow misses (should be caught by install)
                return caches.match('/');
            });
        })
    );
    return;
  }

  // Cache-first for other requests (static assets like JS, CSS, images)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
      .catch((error) => {
        console.warn(`Fetch failed for asset ${event.request.url}; Error: ${error}`);
        // For assets, if they are not in cache and network fails,
        // the browser will show a broken asset, which is usually acceptable.
        // You could return a placeholder for specific types (e.g. images) if desired.
      })
  );
});
