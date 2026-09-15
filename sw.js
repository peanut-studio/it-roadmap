/* ============================================================
   서비스 워커 — 오프라인 동작

   앱 전체가 2MB 남짓이고 단어 데이터는 정적이다. 설치할 때 통째로 받아두고
   그 뒤로는 네트워크를 타지 않는다. 지하철에서도 기내에서도 똑같이 열린다.

   갱신은 아래 CACHE_VERSION 문자열 하나로 제어한다. 값이 바뀌면 브라우저가
   이 파일이 달라진 것을 보고 새로 설치하고, activate 에서 옛 캐시를 지운다.

   ⚠️ 데이터만 새로 굽고 이 값을 안 올리면 설치된 앱에는 영원히 안 보인다.
      서비스 워커는 '이 파일의 바이트'가 바뀌어야 재설치되기 때문이다.
      tools/build.py 를 돌린 커밋에는 반드시 이 줄이 같이 들어가야 한다.
   ============================================================ */

var CACHE_VERSION = "8a2c7e7c11f3";
var CACHE = "it-vocab-" + CACHE_VERSION;

/* 설치할 때 받아둘 것 전부.
   data/terms/*.js 와 data/scenes/*.js 는 12권이 전부 들어간다 — 오프라인에서
   어느 단어를 펼칠지 미리 알 수 없으므로 고를 수가 없다. */
var PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",

  "css/tokens.css",
  "css/app.css",

  "fonts/pretendard-subset.woff2",

  "js/ui.js",
  "js/store.js",
  "js/quiz.js",
  "js/app.js",
  "js/art.js",
  "js/screens.js",
  "js/reading.js",
  "js/recall.js",
  "js/quiz-screens.js",

  "data/index.js",
  "data/terms/cs.js",
  "data/terms/lang.js",
  "data/terms/net.js",
  "data/terms/web.js",
  "data/terms/db.js",
  "data/terms/arch.js",
  "data/terms/sec.js",
  "data/terms/cloud.js",
  "data/terms/infra.js",
  "data/terms/tool.js",
  "data/terms/ai.js",
  "data/terms/pm.js",

  "data/scenes/cs.js",
  "data/scenes/lang.js",
  "data/scenes/net.js",
  "data/scenes/web.js",
  "data/scenes/db.js",
  "data/scenes/arch.js",
  "data/scenes/sec.js",
  "data/scenes/cloud.js",
  "data/scenes/infra.js",
  "data/scenes/tool.js",
  "data/scenes/ai.js",
  "data/scenes/pm.js",

  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

/* 한 파일이라도 못 받으면 addAll 은 통째로 실패한다. 그게 맞다 —
   반쯤 받은 캐시로 오프라인에 들어가면 어떤 단어는 열리고 어떤 단어는
   빈 화면이 된다. 전부 받았을 때만 설치를 성공으로 친다. */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

/* 옛 판의 캐시를 지운다. 이름에 버전이 들어 있으므로 이번 것만 남기면 된다. */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (n) {
          return n !== CACHE && n.indexOf("it-vocab-") === 0 ? caches.delete(n) : null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;

  // 읽기만 캐시한다. POST 같은 것은 그대로 흘려보낸다.
  if (req.method !== "GET") return;

  // 다른 출처는 손대지 않는다. 이 앱은 외부를 부르지 않지만, 확장 프로그램이
  // 끼워 넣는 요청까지 캐시에 담을 이유는 없다.
  if (new URL(req.url).origin !== self.location.origin) return;

  /* 주소창에 직접 친 주소나 새로고침은 항상 index.html 로 답한다.
     해시 라우팅이라 서버 경로는 언제나 루트 하나뿐이다. */
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("index.html").then(function (hit) {
        return hit || fetch(req); // security-ok: OWASP-A10-1 — 서비스 워커는 서버가 아니라 브라우저 안에서 자기 페이지 요청을 가로채는 자리다. req 는 이 브라우저가 이미 보내려던 요청이고 위에서 동일 출처만 통과시켰다
      })
    );
    return;
  }

  /* 캐시 우선. 정적 자산이고 갱신은 CACHE_VERSION 이 맡으므로
     매번 네트워크에 물어볼 이유가 없다 — 그게 오프라인 동작의 값이다. */
  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) { // security-ok: OWASP-A10-1 — 위와 같다. 브라우저가 자기 출처에 보내려던 요청을 중계할 뿐이고, 동일 출처 검사를 이미 통과했다
        /* precache 에서 빠진 것(나중에 추가된 단어장 청크 등)은 받는 김에 담아둔다.
           basic 이 아닌 응답은 오류거나 opaque 라 캐시에 넣으면 안 된다. */
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
