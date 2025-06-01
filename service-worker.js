
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
  '/components/ConfirmClearHistoryModal.tsx',
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
  '/components/icons/BroomIcon.tsx',
  '/components/icons/NewTrashIcon.tsx',
  '/components/icons/SunIcon.tsx',
  '/components/icons/MoonIcon.tsx',
  '/components/icons/LogoutIcon.tsx',
  '/components/icons/InstallIcon.tsx',
  // GitHubIcon.tsx is not used by the current custom auth App.tsx
  // GoogleIcon.tsx is an empty file per user content and thus not cached.
  
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
  'https://esm.sh/@supabase/supabase-js@^2.44.4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        const cachePromises = urlsToCache.map(urlToCache => {
          const request = new Request(urlToCache, {mode: 'cors'}); 
          return fetch(request)
            .then(response => {
              if (!response.ok) {
                if (urlToCache.startsWith('https://cdn.') || urlToCache.startsWith('https://fonts.googleapis.') || urlToCache.startsWith('https://fonts.gstatic.') || urlToCache.startsWith('https://esm.sh')) {
                  // For CDNs, try no-cors if cors fails, as some CDNs might not send CORS headers for all assets
                  // but opaque responses can still be cached and used.
                  return fetch(new Request(urlToCache, {mode: 'no-cors'}));
                }
                // For local assets, a non-ok response is an actual issue.
                throw new Error(`Failed to fetch ${urlToCache} with status ${response.status}`);
              }
              return response;
            })
            .then(response => {
              // Cache if the response is ok (status 200) or opaque (for no-cors requests)
              if (response.status === 200 || response.type === 'opaque') {
                 return cache.put(urlToCache, response);
              }
              // Don't cache other non-ok responses (e.g., 404 for local assets)
              console.warn(`Skipping caching for ${urlToCache} due to non-ok/non-opaque response status: ${response.status}`);
              return Promise.resolve(); 
            })
            .catch(err => console.warn(`Skipping ${urlToCache} from cache due to error: ${err}`));
        });
        return Promise.all(cachePromises);
      })
      .then(() => self.skipWaiting()) 
      .catch(err => {
        console.error('Service worker installation failed:', err)
      })
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

  // Network-first for Supabase API calls
  if (requestUrl.hostname.endsWith('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Network-first for navigation, then cache, then fallback to app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If network response is OK, cache it and return it
          if (response.ok) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/index.html'); // Fallback to app shell
            });
        })
    );
    return;
  }

  // Cache-first for other requests (static assets)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          // If network response is valid, cache it
          if (networkResponse && networkResponse.ok) {
            // Determine if this resource should be dynamically cached
            const shouldCache = urlsToCache.some(url => {
                // Handle cases where request URL might have query params but cached URL doesn't
                const requestPath = requestUrl.origin + requestUrl.pathname;
                return requestPath === url || (url.startsWith(requestUrl.origin) && requestPath.startsWith(url));
            }) ||
            requestUrl.hostname.includes('esm.sh') || 
            requestUrl.hostname.includes('cdn.tailwindcss.com') ||
            requestUrl.hostname.includes('fonts.googleapis.com') ||
            requestUrl.hostname.includes('fonts.gstatic.com');
            
            if (shouldCache) {
                 const responseToCache = networkResponse.clone();
                 caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                 });
            }
          }
          return networkResponse;
        });
      })
      .catch((error) => {
        // Optional: Could return a fallback for specific asset types if needed
        // console.warn(`Fetch failed for ${event.request.url}; Error: ${error}`);
        // For example, return a placeholder image for failed image requests
      })
  );
});
```
  </change>
</changes>

Now, when the app meets the PWA install criteria and the `beforeinstallprompt` event is fired, an "Install App" button (with an icon and text, text hidden on smaller screens) will appear in the header next to the language and theme toggles. Clicking this button will show the browser's native installation prompt, allowing users to easily add Wuyiyit AI to their home screen on mobile devices.