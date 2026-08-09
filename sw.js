/* ============================================================
   Idealis Dashboard — Service Worker

   ESTRATEGIA: NETWORK-FIRST, sempre.
   A rede ganha. O cache so entra quando a rede falha (offline).

   Isso e proposital: a estrategia cache-first e o que causa
   "abri o site e continua a versao antiga" depois de um deploy.
   Aqui, se voce tem internet, voce SEMPRE ve a versao nova.

   O cache existe so para o app abrir offline, nao para acelerar.

   KILL SWITCH: abrir a pagina com ?sw=off desregistra o SW e
   limpa todos os caches. Use se algo travar.
   ============================================================ */

const VERSAO = 'idealis-dash-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

/* instala e ja assume o controle, sem esperar abas antigas fecharem */
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSAO)
      .then((c) => c.addAll(SHELL).catch(() => null))
  );
});

/* ao ativar, apaga qualquer cache de versao anterior */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(
        ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  /* so mexe em GET do mesmo site */
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* NUNCA intercepta chamada de API ou de script externo:
     Supabase, Apps Script e CDNs passam direto pela rede */
  if (url.pathname.includes('/rest/') ||
      url.pathname.includes('/auth/') ||
      url.pathname.includes('/storage/')) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        /* guarda uma copia so para uso offline */
        if (res && res.status === 200 && res.type === 'basic') {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit || caches.match('./index.html')
        )
      )
  );
});

/* permite forcar atualizacao pela pagina */
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
