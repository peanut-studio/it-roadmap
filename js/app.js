/* ============================================================
   앱 셸 — 라우터, 탭바, 화면 전환
   해시 라우팅을 쓴다. 브라우저 뒤로가기가 그대로 동작하고
   file:// 로 열어도 문제가 없다.
   ============================================================ */

window.App = (function () {
  "use strict";

  var root;
  var tabbarEl;

  /* 목적지 4개. Apple HIG 3~5개, Material 3~5개 권장 범위 안이다.
     라벨은 항상 보인다. 아이콘만 있는 내비게이션은 발견하기 어렵다. */
  var TABS = [
    { path: "/home", label: "홈", icon: "home" },
    { path: "/books", label: "단어장", icon: "book" },
    { path: "/quiz", label: "퀴즈", icon: "quiz" },
    { path: "/progress", label: "진도", icon: "chart" },
  ];

  var routes = {};
  var scrollMemory = {};
  var lastPath = null;
  var goingBack = false;

  /* 화면이 어느 쪽에서 미끄러져 들어올지, 스크롤을 복원할지 새로 시작할지를
     가르는 값이다. 그런데 "지금 뒤로 가는 중인가" 는 브라우저가 안 알려준다.

     popstate 로 판정하면 안 된다 — 앞으로 가는 해시 이동에도 똑같이 뜨고,
     hashchange 보다 먼저 뜬다. 실측으로 앞으로 네 번 이동한 화면이 전부
     뒤로 방향으로 그려졌고, 앞으로 갔는데 옛 스크롤 자리로 돌아갔다.

     그래서 두 갈래로 정한다.
       ① 우리가 일으킨 이동(navigate·back) — 방향을 우리가 안다. pendingDir.
       ② 밖에서 온 이동(OS·브라우저 뒤로/앞으로) — 이력 항목마다 번호를
          찍어 두고, 도착한 항목의 번호가 떠난 항목보다 작으면 뒤로다.
          방금 민 새 항목은 번호가 없으므로(0) 앞으로다. */
  var pendingDir = null;
  var navSeq = 0;
  var lastSeq = 0;

  /* 옆걸음 — 단어에서 단어로 건너뛴 이동. 본문 [[링크]], 관련 용어,
     퀴즈 해설의 "다시 읽기", 떠올리기 카드가 여기 해당한다.

     ← 는 원래 계층을 올라간다. 그런데 옆걸음으로 도착한 자리에서는
     "위" 가 사용자가 기대하는 곳이 아니다 — HTTP 를 읽다 [[TCP]] 로
     건너뛴 사람이 ← 를 누르면 네트워크 목록이 아니라 HTTP 로 돌아가야 한다.
     TCP 가 다른 권이면 아예 처음 보는 단어장에 떨어졌다.

     그래서 옆걸음 여부를 이력 항목에 함께 찍어 두고, 그 자리에서만
     이력을 되감는다. 표시가 있다는 것 자체가 "우리가 민 항목이 앞에 있다"
     는 뜻이라, history.back() 이 앱 밖으로 나갈 걱정도 없다. */
  var pendingLateral = false;
  var arrivedLateral = false;
  var pendingReplace = false;

  function seqOf(state) {
    return state && typeof state.seq === "number" ? state.seq : 0;
  }

  /* 지금 이력 항목에 번호를 찍는다. 이미 번호가 있으면(뒤로 와서 다시 보는
     항목이면) 그대로 두고 기준만 옮긴다 — 다시 찍으면 순서가 뒤집힌다. */
  function stampSeq(cameFrom) {
    var st = history.state;
    var seq = seqOf(st);
    /* 이미 찍힌 항목이면 그때의 옆걸음 표시를 그대로 믿는다. 새 항목이면
       방금 일어난 이동이 옆걸음이었는지를 쓴다. */
    var lat = st && typeof st.lat === "boolean" ? st.lat : pendingLateral;
    /* 이 항목 바로 앞에 무엇이 있었는지도 같이 적는다. back() 이 쓴다 —
       올라갈 곳이 마침 바로 앞 항목이면 새 항목을 얹는 대신 되감아야
       같은 주소가 두 번 겹치지 않는다. 옆걸음 표시와 같은 규칙으로,
       이미 찍힌 항목이면 그때 적어 둔 것을 그대로 믿는다. */
    var prev = st && typeof st.prev === "string"
      ? st.prev
      : (pendingReplace ? null : cameFrom || null);
    if (!seq) {
      navSeq += 1;
      seq = navSeq;
    }
    try {
      history.replaceState({ seq: seq, lat: lat, prev: prev }, "");
    } catch (err) {
      /* file:// 이나 사생활 보호 모드에서 막힐 수 있다. 막히면 방향 판정만
         둔해지고 화면은 그대로 그려진다. */
    }
    lastSeq = seq;
    arrivedLateral = !!lat;
    pendingLateral = false;
    pendingReplace = false;
  }

  function register(pattern, render) {
    routes[pattern] = render;
  }

  function currentPath() {
    var hash = location.hash.replace(/^#/, "");
    return hash || "/home";
  }

  /* 주소는 사용자가 직접 고칠 수 있는 값이다. "%E0%A4%A" 처럼 반쪽짜리 인코딩이
     들어오면 decodeURIComponent 가 URIError 를 던지는데, 그게 렌더 밖으로 빠져나가면
     화면을 그리는 코드에 아예 닿지 못한다. 주소만 바뀌고 화면은 앞의 것이 남아서
     둘이 어긋난 채 멈춘다. 못 읽으면 원문 그대로 넘겨서 "찾을 수 없다" 로 흐르게 한다. */
  function decodeParam(raw) {
    try {
      return decodeURIComponent(raw);
    } catch (e) {
      return raw;
    }
  }

  /* "/books/:id" 같은 패턴과 실제 경로를 맞춘다. */
  function match(path) {
    var parts = path.split("/").filter(Boolean);
    var best = null;

    Object.keys(routes).forEach(function (pattern) {
      var pp = pattern.split("/").filter(Boolean);
      if (pp.length !== parts.length) return;

      var params = {};
      for (var i = 0; i < pp.length; i++) {
        if (pp[i].charAt(0) === ":") {
          params[pp[i].slice(1)] = decodeParam(parts[i]);
        } else if (pp[i] !== parts[i]) {
          return;
        }
      }
      best = { render: routes[pattern], params: params };
    });

    return best;
  }

  function navigate(path, replace, dir) {
    pendingDir = dir || "forward";
    /* 치환으로 만든 항목에는 "앞 항목" 을 적지 않는다.

       치환은 지금 항목을 덮어쓰는 것이라, 우리가 아는 "떠나온 경로" 는
       덮어쓴 그 항목이지 이력에서 하나 앞에 있는 항목이 아니다. 그것을
       prev 로 적으면 back() 이 되감을 곳을 잘못 안다. 적지 않으면
       back() 은 지금까지 하던 치환으로 그대로 떨어진다. */
    pendingReplace = !!replace;
    if (replace) {
      location.replace("#" + path);
    } else {
      location.hash = path;
    }
  }

  /* 단어에서 단어로 건너뛸 때 쓴다. 도착한 자리의 ← 가 "위" 대신
     "아까 그 화면" 으로 가게 표시를 남긴다. */
  function navigateLateral(path) {
    pendingLateral = true;
    navigate(path);
  }

  /* 이 화면의 한 단계 위. 상단바의 ← 가 가는 곳이다.

     history.back() 을 쓰면 안 된다. ← 는 계층을 올라가는 모양인데 이력을
     되감으면 다른 일을 한다 — 단어를 다섯 개 넘겨 본 사람은 목록으로
     나가려고 다섯 번 눌러야 한다(실측: 여섯 번 이동에 이력 항목 여덟 개).
     게다가 history.length 는 이 앱의 이력이 아니라 그 탭 전체를 세므로,
     다른 페이지를 거쳐 들어온 사람은 ← 한 번에 앱 밖으로 나간다.

     OS·브라우저 뒤로가기는 지금처럼 이력을 되감는다. 둘이 서로 다른
     일을 맡는 것이 맞다 — 하나는 "위로", 하나는 "아까 그 화면으로". */
  function parentOf(path) {
    var term = path.match(/^\/term\/(.+)$/);
    if (term) {
      var found = window.Store.termById(decodeParam(term[1]));
      return found ? "/books/" + found.bookId : "/books";
    }
    if (/^\/books\/.+/.test(path)) return "/books";
    /* 결과·진행 화면의 위는 그 탭의 뿌리다. 안 적어 두면 아래 return 으로
       떨어져 ← 가 홈으로 튄다 — 퀴즈를 보고 나온 사람이 갈 곳은 퀴즈다. */
    if (/^\/quiz\/.+/.test(path)) return "/quiz";
    if (/^\/recall\/.+/.test(path)) return "/recall";
    return "/home";
  }

  function back() {
    var here = currentPath();
    /* 옆걸음으로 온 자리에서는 "위" 가 아니라 "아까 그 화면" 이 맞다.
       이 표시는 우리가 민 항목에만 붙으므로 되감을 곳이 반드시 있다. */
    if (arrivedLateral) {
      pendingDir = "back";
      history.back();
      return;
    }
    var up = parentOf(here);
    if (up === here) return;

    /* 올라갈 곳이 마침 바로 앞 이력 항목이면 되감는다.

       치환(location.replace)만 쓰면 같은 주소가 이력에 두 번 눕는다.
       /books → /books/cs → /term/x 에서 ← 를 누르면 3번 항목이 /books/cs 로
       바뀌어 [/books, /books/cs, /books/cs] 가 된다. 여기서 OS 뒤로가기를
       누르면 브라우저는 2번으로 옮겨 가지만 주소가 똑같아 hashchange 가
       안 뜬다 — 화면이 그대로라 사용자에게는 첫 눌림이 씹힌 것으로 보인다.

       되감으면 항목이 하나 줄어 그 겹침 자체가 생기지 않는다. prev 는 우리가
       그린 항목에만 적히므로, 밖에서 바로 들어온 자리에서는 null 이라
       아래 치환으로 떨어진다 — 앱 밖으로 나가 버릴 걱정이 없다. */
    var st = history.state;
    if (st && st.prev === up) {
      pendingDir = "back";
      history.back();
      return;
    }

    // 그 밖에는 치환한다. ← 는 이력을 쌓지 않는다 — 위로 올라간 자리에서
    // OS 뒤로가기를 누르면 방금 올라온 화면으로 되돌아가는 고리가 생긴다.
    navigate(up, true, "back");
  }

  /* 탭바는 최상위 화면에서만 보인다.
     읽기 화면과 퀴즈 진행 화면은 하나의 일에 집중하는 모달성 화면이라
     Apple HIG 가 탭바를 감추는 것을 허용하는 경우에 해당한다. */
  function showsTabbar(path) {
    /* 결과·마무리는 한 일이 끝난 자리다. 집중용 모달이 아니므로 탭바를 준다.
       없을 때는 결과 화면에 ← 도 탭바도 없어서 읽던 단어로 돌아갈 길이
       앱 안에 아예 없었다. */
    return TABS.some(function (t) { return path === t.path; }) ||
      /^\/books\//.test(path) ||
      path === "/quiz/result" ||
      path === "/recall/done";
  }

  function activeTab(path) {
    if (path === "/home") return "/home";
    if (path.indexOf("/books") === 0 || path.indexOf("/term") === 0) return "/books";
    if (path.indexOf("/quiz") === 0 || path.indexOf("/recall") === 0) return "/quiz";
    if (path.indexOf("/progress") === 0) return "/progress";
    return null;
  }

  function renderTabbar(path) {
    if (!showsTabbar(path)) {
      tabbarEl.hidden = true;
      return;
    }
    tabbarEl.hidden = false;

    var active = activeTab(path);
    var dueCount = window.Store.reviewQueue().length;

    /* 칸 수를 CSS 에 넘긴다. CSS 는 repeat(var(--tabs, 4), 1fr) 로 받는데,
       넘기는 코드가 없어서 여태 폴백 4 로만 버티고 있었다 — 탭이 다섯이 되는
       날 다섯째가 조용히 아랫줄로 접힌다. 주석이 약속한 것을 이제 지킨다. */
    tabbarEl.style.setProperty("--tabs", String(TABS.length));

    // security-ok: OWASP-A03-4 — TABS 는 이 파일 상단의 고정 배열이고, 라벨은 UI.esc 를 거친다.
    tabbarEl.innerHTML = TABS.map(function (tab) {
      var isActive = tab.path === active;
      /* 숫자 알약은 그림으로만 둔다. 스크린리더에는 "퀴즈 3" 처럼 떨어져
         읽히면 뜻이 안 서므로, 탭 전체의 이름에 문장으로 넣는다.
         aria-hidden 만 걸어두면 복습이 밀렸다는 사실 자체가 안 들린다. */
      var badge =
        tab.path === "/quiz" && dueCount
          ? '<span class="tab__badge" aria-hidden="true">' + dueCount + "</span>"
          : "";
      var name =
        tab.path === "/quiz" && dueCount
          ? tab.label + ", 복습할 단어 " + dueCount + "개"
          : tab.label;
      return (
        '<a class="tab" href="#' + tab.path + '"' +
        ' aria-label="' + window.UI.esc(name) + '"' +
        (isActive ? ' aria-current="page"' : "") + ">" +
        window.UI.icon(tab.icon, 22) + badge +
        "<span>" + window.UI.esc(tab.label) + "</span></a>"
      );
    }).join("");
  }

  /* ---------------------------------------------------------- 그리기

     화면을 그리는 길은 둘이다.

       render()  — 화면 전환. 방향을 정하고, 스크롤을 새로 잡고, 초점을 옮긴다.
       refresh() — 같은 화면 제자리 갱신. 배지 하나 바뀌었다고 읽던 자리를
                   빼앗지 않는다.

     나누기 전에는 둘이 한 함수였다. 그래서 긴 본문을 3,400px 내려 읽고
     하단 고정 바의 "학습 완료" 를 누르면 맨 위로 튀고, 펼쳐 둔 접이식이
     전부 닫혔다 — 다 읽은 사람이 누르라고 만든 단추가 다 읽은 흔적을 지웠다.
     퀴즈 화면만 이 문제를 알고 render() 뒤에 스크롤을 도로 옮기고 있었다. */

  /* 다시 그리면 <details> 의 열림은 DOM 에만 있던 값이라 함께 사라진다.
     id 가 있으면 id 로, 없으면 순서로 짝을 짓는다. */
  function openStates() {
    var map = {};
    var all = root.querySelectorAll("details");
    for (var i = 0; i < all.length; i++) {
      map[all[i].id || "@" + i] = all[i].open;
    }
    return map;
  }

  function applyOpenStates(map) {
    if (!map) return;
    var all = root.querySelectorAll("details");
    for (var i = 0; i < all.length; i++) {
      if (map[all[i].id || "@" + i]) all[i].open = true;
    }
  }

  /* 갈아끼운 뒤 초점을 도로 놓는다. 같은 id 가 살아 있으면 거기로,
     아니면 화면의 제목으로. 스크롤은 건드리지 않는다 — 초점을 되찾자고
     읽던 자리를 옮기면 고치려던 것을 다시 부순다. */
  function restoreFocus(id) {
    if (id === null) return;
    var el = id ? root.querySelector("#" + CSS.escape(id)) : null;
    if (!el) el = root.querySelector("[data-focus], h1, h2");
    if (!el) return;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }

  function draw(inPlace) {
    var path = currentPath();

    if (!inPlace) {
      // 방향은 여기 한 곳에서만 정한다. 우리가 일으킨 이동이면 그 방향을 쓰고,
      // 밖에서 온 이동이면 이력 번호로 가른다.
      if (pendingDir) {
        goingBack = pendingDir === "back";
        pendingDir = null;
      } else {
        var seq = seqOf(history.state);
        goingBack = seq !== 0 && seq < lastSeq;
      }

      // 떠나는 화면의 스크롤 위치를 기억해 둔다. 뒤로 왔을 때 그 자리에 있어야 한다.
      if (lastPath) scrollMemory[lastPath] = window.scrollY;
    }

    var found = match(path);
    if (!found) {
      navigate("/home", true);
      return;
    }

    // 제자리 갱신이면 사용자가 만들어 둔 것을 먼저 챙긴다.
    var keepScroll = inPlace ? window.scrollY : 0;
    var keepOpen = inPlace ? openStates() : null;
    /* 초점도 챙긴다. 기다리는 화면의 제목은 data-focus 로 초점을 받아 둔
       상태인데, 본문이 도착해 통째로 갈아끼우면 그 요소가 사라지면서
       초점이 문서 맨 앞으로 조용히 떨어진다. 화면을 보는 사람은 못 느끼지만
       스크린리더로 읽던 사람은 있던 자리를 잃는다. */
    var keepFocus = inPlace && root.contains(document.activeElement)
      ? document.activeElement.id || ""
      : null;

    var html = found.render(found.params);
    /* 화면 전환 표시는 전환일 때만 붙이고, 제자리 갱신이면 반드시 걷는다.

       걷지 않으면 이 함수의 약속이 깨진다. 전환 표시는 #view 에 붙는데
       움직이는 것은 그 안의 main 이다(css/app.css 2547행). innerHTML 을
       갈아끼우면 main 이 새로 생기므로, 표시가 남아 있는 한 갱신 때마다
       화면 전체가 투명도 0 에서 12px 미끄러져 들어온다.
       실측: 배지 하나 바뀌는 refresh() 한 번에 screen-forward 가 다시 켜졌다.
       2000px 을 내려가 읽던 사람에게는 글이 통째로 한 번 깜빡이는 일이다. */
    root.className = inPlace
      ? ""
      : goingBack ? "screen-enter screen-enter--back" : "screen-enter";
    // 화면 함수는 문자열 템플릿으로 조립하되, 데이터가 들어가는 모든 지점에서
    // UI.esc 또는 UI.markdown(내부에서 먼저 이스케이프)을 통과시킨다.
    // 이스케이프 없이 값을 끼워 넣는 화면 함수는 이 프로젝트에서 버그로 취급한다.
    root.innerHTML = html; // security-ok: OWASP-A03-4 — 값은 전부 UI.esc / UI.markdown 을 거쳐 들어온다

    renderTabbar(path);
    document.body.dataset.route = path;

    if (inPlace) {
      applyOpenStates(keepOpen);
      window.scrollTo(0, keepScroll);
      restoreFocus(keepFocus);
    } else {
      // 앞으로 갈 때는 맨 위에서 시작하고, 뒤로 올 때는 보던 자리로 돌아간다.
      window.scrollTo(0, goingBack ? scrollMemory[path] || 0 : 0);

      // 화면이 바뀌면 스크린리더 초점을 본문으로 옮긴다.
      // 제자리 갱신에서는 옮기지 않는다 — 읽던 자리에서 초점만 튀어 오른다.
      var heading = root.querySelector("h1, h2, [data-focus]");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }

      var cameFrom = lastPath;
      lastPath = path;
      stampSeq(cameFrom);
    }

    document.dispatchEvent(new CustomEvent("screen:rendered", {
      detail: { path: path, inPlace: !!inPlace },
    }));

    /* screen:rendered 를 듣는 쪽이 DOM 을 더 붙여 높이를 바꾼다.
       그 뒤에 한 번 더 자리를 잡아야 읽던 곳에 그대로 남는다. */
    if (inPlace) window.scrollTo(0, keepScroll);
  }

  function render() {
    draw(false);
  }

  /* 상태만 바뀌었을 때 부른다. 주소가 그대로일 때만 뜻이 있다. */
  function refresh() {
    draw(true);
  }

  /* ---------------------------------------------------------- 테마 */

  function initTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem("it-vocab-mockup:theme");
    } catch (err) {
      /* 저장소를 못 쓰면 시스템 설정만 따른다 */
    }
    if (saved) document.documentElement.dataset.theme = saved;
  }

  function toggleTheme() {
    var el = document.documentElement;
    var isDark =
      el.dataset.theme === "dark" ||
      (!el.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    var next = isDark ? "light" : "dark";
    el.dataset.theme = next;
    try {
      localStorage.setItem("it-vocab-mockup:theme", next);
    } catch (err) {
      /* 저장 실패해도 이번 세션에는 적용된다 */
    }
    refresh();
  }

  /* ---------------------------------------------------------- 위임 이벤트
     화면을 통째로 다시 그리므로 리스너를 개별로 달지 않는다.
     data-action 하나로 모든 버튼을 받는다. */

  var actions = {};

  function on(name, handler) {
    actions[name] = handler;
  }

  function handleClick(event) {
    var el = event.target.closest("[data-action]");
    if (!el) return;
    var name = el.dataset.action;
    if (!actions[name]) return;
    event.preventDefault();
    actions[name](el.dataset, el, event);
  }

  function start() {
    root = document.getElementById("view");
    tabbarEl = document.getElementById("tabbar");

    initTheme();
    document.addEventListener("click", handleClick);
    window.addEventListener("hashchange", render);

    on("back", back);
    on("theme", toggleTheme);
    on("go", function (data) { navigate(data.to); });
    /* 옆걸음 이동. 끝난 판(퀴즈 결과·떠올리기 마무리)에서 단어를 열 때 쓴다.
       흔한 go 로 가면 그 단어의 ← 가 단어장 목록으로 나가 버려서, 틀린 것을
       하나 읽고 오려던 사람이 나머지 목록을 잃는다. */
    on("go-side", function (data) { navigateLateral(data.to); });

    render();
  }

  return {
    register: register,
    navigate: navigate,
    back: back,
    on: on,
    start: start,
    render: render,
    refresh: refresh,
    navigateLateral: navigateLateral,
    currentPath: currentPath,
  };
})();
