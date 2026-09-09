/* ============================================================
   화면 — 홈, 단어장, 단어 목록, 단어 상세, 진도

   렌더 규칙: 데이터가 화면으로 들어가는 지점에서는 반드시
   UI.esc 또는 UI.markdown 을 통과시킨다. 예외는 없다.
   ============================================================ */

(function () {
  "use strict";

  var UI = window.UI;
  var Store = window.Store;
  var App = window.App;
  var esc = UI.esc;

  /* ---------------------------------------------------------- 공통 조각 */

  function topbar(options) {
    var opts = options || {};
    var left = opts.back
      ? '<button class="icon-btn" data-action="back" aria-label="뒤로 가기">' + UI.icon("back", 22) + "</button>"
      : "";
    var title = opts.title
      ? '<h1 class="topbar__title">' + esc(opts.title) + "</h1>"
      : '<span class="topbar__spacer"></span>';
    return '<header class="topbar' + (opts.bordered ? " topbar--bordered" : "") + '">' +
      left + title + (opts.right || "") + "</header>";
  }

  function themeButton() {
    // 아이콘은 "지금 상태"가 아니라 "누르면 되는 상태"를 보여준다.
    var el = document.documentElement;
    var dark = el.dataset.theme === "dark" ||
      (!el.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    return '<button class="icon-btn" data-action="theme" aria-label="' +
      (dark ? "밝게 보기" : "어둡게 보기") + '">' + UI.icon(dark ? "sun" : "moon", 20) + "</button>";
  }

  function badge(status) {
    var meta = Store.STATUS_META[status];
    return '<span class="badge badge--' + status + '">' + UI.icon(meta.icon, 13) +
      esc(meta.label) + "</span>";
  }

  function statusDot(status) {
    var meta = Store.STATUS_META[status];
    return '<span class="dot dot--' + status + '" role="img" aria-label="' + esc(meta.full) + '"></span>';
  }

  function progressBar(percent) {
    return '<div class="progress" role="progressbar" aria-valuenow="' + percent +
      '" aria-valuemin="0" aria-valuemax="100"><div class="progress__fill" style="width:' +
      percent + '%"></div></div>';
  }

  /* 단어장 진행 막대. 퀴즈 통과 / 학습 완료 / 읽는 중을 한 막대 안에서 구분한다.
     "얼마나 했는가"가 아니라 "어디까지 갔는가"가 보여야 한다. */
  /* 막대와 범례는 같은 것을 세야 한다.
     복습 칸이 빠져 있어서, 범례에 "복습 2" 라고 적힌 단어장의 막대가
     그 2개를 안 그린 채 절반만 차 있었다. 상태 네 개를 모두 쌓는다.
     순서는 학습이 나아가는 순서 그대로다. */
  var BAR_SEGMENTS = [
    { key: "passed", label: "퀴즈 통과" },
    { key: "learned", label: "학습 완료" },
    { key: "reading", label: "읽는 중" },
    { key: "review", label: "복습 필요" },
  ];

  function stackedBar(stats) {
    var c = stats.counts;
    var pct = function (n) { return stats.total ? (n / stats.total) * 100 : 0; };

    /* 낭독기에 이 막대를 읽히지 않는다. 바로 밑 범례(bookLegend)가 같은 숫자를
       같은 순서로 글자로 적어 두므로, 막대까지 이름을 달면 "퀴즈 통과 21개,
       학습 완료 8개…" 를 연달아 두 번 듣게 된다. 막대는 옆 글자의 그림이다. */
    return '<div class="stacked" aria-hidden="true">' +
      BAR_SEGMENTS.map(function (s) {
        return '<div class="stacked__seg stacked__seg--' + s.key +
          '" style="width:' + pct(c[s.key]) + '%"></div>';
      }).join("") + "</div>";
  }

  function emptyState(iconName, title, body) {
    return '<div class="empty">' + UI.icon(iconName, 36, "empty__icon") +
      '<p class="empty__title">' + esc(title) + "</p>" +
      '<p class="empty__body">' + esc(body) + "</p></div>";
  }

  function relativeTime(ts) {
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return mins + "분 전";
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "시간 전";
    var days = Math.floor(hours / 24);
    if (days < 7) return days + "일 전";
    return Math.floor(days / 7) + "주 전";
  }

  /* 색인(data/index.js)을 못 받았을 때.

     못 받으면 Store.books() 가 빈 배열이다. 그 상태에서 단어장 탭은 제목만 남은
     백지가 됐고, 홈은 nextUp() 이 null 이라는 이유로 "다 봤습니다 — 모든 단어를
     한 번씩 통과했습니다" 를 축하했다. 한 글자도 못 읽은 사람에게 완주를 알린 셈이라,
     실패가 완료로 읽히고 사용자는 고칠 기회를 잃는다.

     색인은 앱이 켜질 때 통째로 오는 것이라 이 자리에서 다시 받을 길이 없다.
     새로고침이 곧 재시도다. 진도는 localStorage 에 있으니 새로고침해도 안 사라진다 —
     그 말을 같이 적어 두지 않으면 이 단추를 누르기가 무섭다. */
  function indexFailed() {
    return '<main class="screen">' +
      emptyState("inbox", "단어 목록을 불러오지 못했습니다",
        "연결이 끊겼거나 파일을 받지 못했습니다. 공부한 기록은 그대로 남아 있습니다.") +
      '<div class="empty__act"><button class="btn btn--primary" data-action="reload-app">' +
      "다시 시도</button></div></main>";
  }

  App.on("reload-app", function () {
    location.reload();
  });

  /* ---------------------------------------------------------- 홈
     앱을 열었을 때 3초 안에 "지금 뭘 하면 되지"가 보여야 한다.
     그래서 통계가 아니라 다음 행동 하나를 가장 크게 놓는다. */

  /* nextUp() 의 갈래마다 이 카드에 적을 말. 여기 적은 말이 곧 약속이라
     누르고 나서 벌어지는 일과 어긋나면 안 된다.

     "quiz-ready" 가 그렇게 어긋나 있었다. 이 갈래가 주는 단어는 이미 학습을 마친
     단어인데 라벨은 "다음 단어", 단추는 "읽기 시작" 이었고, 눌러도 퀴즈가 아니라
     본문으로만 갔다. 들어가 보면 제목 밑에 "학습 완료" 배지가 붙어 있어서
     카드가 방금 한 말이 도착하자마자 틀린 말이 됐다.
     할 일을 그대로 적고, 실제로 그리로 보낸다.

     action 이 없으면 "go"(주소로 이동)다. 있으면 그 이름으로 부르고 단어 id 를 넘긴다. */
  var REASON_COPY = {
    reading: { label: "읽던 단어", cta: "이어서 읽기" },
    new: { label: "다음 단어", cta: "읽기 시작" },
    review: { label: "복습할 단어", cta: "다시 읽기" },
    "quiz-ready": {
      label: "확인할 단어",
      icon: "quiz",
      cta: "퀴즈로 확인하기",
      action: "quiz-one",
    },
  };

  /* 0 인 항목은 세지 않는다. 아직 안 본 단어장에 "통과 0 · 학습 0" 을 적어두면
     화면만 빽빽해지고 알려주는 건 없다. 없는 건 없다고 한 번만 말한다. */
  function bookLegend(stats) {
    var items = [
      { key: "passed", label: "통과", n: stats.counts.passed },
      { key: "learned", label: "학습", n: stats.counts.learned },
      { key: "reading", label: "읽는 중", n: stats.counts.reading },
      { key: "review", label: "복습", n: stats.counts.review },
    ].filter(function (x) { return x.n > 0; });

    if (!items.length) {
      return '<div class="book__legend"><span class="legend-item">아직 안 본 단어장입니다</span></div>';
    }

    return '<div class="book__legend">' + items.map(function (x) {
      // 점 옆에 라벨과 숫자가 글자로 있다. 점까지 이름을 달면 같은 말이 두 번 난다.
      // statusDot 자체는 그대로 둔다 — 목록에서는 점이 상태를 나르는 유일한 표시다.
      return '<span class="legend-item"><span class="dot dot--' + x.key +
        '" aria-hidden="true"></span>' + esc(x.label) + " " + x.n + "</span>";
    }).join("") + "</div>";
  }

  function todayCard() {
    var next = Store.nextUp();
    /* 여기까지 오면 단어는 반드시 있다 — 색인을 못 받은 경우는 /home 이 위에서
       먼저 걸러낸다. 그래서 할 일이 없다는 건 정말로 다 통과했다는 뜻이다. */
    if (!next) {
      return '<div class="today"><div class="today__main">' +
        '<p class="today__label">' + UI.icon("check-double", 14) + "오늘 할 일 없음</p>" +
        '<p class="today__term">다 봤습니다</p>' +
        '<p class="today__summary">단어장의 모든 단어를 한 번씩 통과했습니다. 복습은 며칠 뒤에 다시 올라옵니다.</p>' +
        "</div></div>";
    }

    var copy = REASON_COPY[next.reason] || REASON_COPY.new;
    var t = next.term;
    /* 갈래마다 단추가 다른 데로 간다. "go" 는 주소(data-to)를 읽고 그 밖은 단어
       id(data-id)를 읽는다. 둘을 같이 달면 어느 쪽이 쓰이는지 여기서는 안 보인다. */
    var target = copy.action
      ? ' data-id="' + esc(t.id) + '"'
      : ' data-to="/term/' + esc(t.id) + '"';

    return '<div class="today"><div class="today__main">' +
      '<p class="today__label">' + UI.icon(copy.icon || "book", 14) + esc(copy.label) + "</p>" +
      '<p class="today__term">' + esc(t.term) + "</p>" +
      '<p class="today__summary">' + esc(UI.plain(t.summary)) + "</p>" +
      '<div class="today__cta"><button class="btn btn--primary btn--block" data-action="' +
      esc(copy.action || "go") + '"' + target + ">" +
      esc(copy.cta) + UI.icon("forward", 18) + "</button></div>" +
      "</div>" + nextStep(next.reason === "quiz-ready") + "</div>";
  }

  /* 학습 루프의 다음 걸음 하나만 보여준다.
     원래 여기엔 "학습 완료한 3개, 퀴즈로 확인할 수 있습니다"라는 문장이 있었는데,
     할 수 있다고 말만 하고 누를 데가 없었다. 문장을 버튼으로 바꾼다.

     읽기 -> 떠올리기 -> 퀴즈 순서대로 검사해서 먼저 걸리는 것을 내보낸다.
     둘 다 띄우면 어느 쪽이 먼저인지 다시 고민하게 된다.

     skipQuiz 는 카드의 큰 단추가 이미 퀴즈로 가는 경우에 준다. 안 주면 한 카드
     안에서 "퀴즈로 확인하기" 와 "퀴즈로 확인할까요" 가 위아래로 두 번 나온다 —
     두 번 말하면 서로 다른 두 가지 일처럼 읽힌다. */
  function nextStep(skipQuiz) {
    var toRecall = window.Recall ? window.Recall.candidates().length : 0;
    var toQuiz = Store.allTerms().filter(function (t) {
      return Store.statusOf(t.id) === Store.STATUS.LEARNED;
    }).length;

    /* 발판에 적는 숫자는 실제로 받게 될 판의 길이다. 재고를 적으면 안 된다 —
       "읽은 단어 512개, 뜻을 떠올려볼까요" 를 누르고 12장을 받으면 앱이
       거짓말을 한 것이 된다. 재고가 더 많으면 그건 뒤에 따로 적는다. */
    var recallMax = (window.Recall && window.Recall.SESSION_MAX) || 12;
    var recallNow = Math.min(toRecall, recallMax);

    var step = toRecall
      ? {
          action: "start-recall", icon: "layers",
          label: "뜻을 떠올려볼까요 · " + recallNow + "개" +
            (toRecall > recallNow ? " (읽은 단어 " + toRecall + "개 중)" : ""),
        }
      : toQuiz && !skipQuiz
        ? { action: "go", to: "/quiz", icon: "quiz", label: "학습 완료한 " + toQuiz + "개, 퀴즈로 확인할까요" }
        : null;

    if (!step) return "";

    return '<button class="today__foot" data-action="' + step.action + '"' +
      (step.to ? ' data-to="' + step.to + '"' : "") + ">" +
      UI.icon(step.icon, 15) + "<span>" + esc(step.label) + "</span>" +
      UI.icon("right", 16) + "</button>";
  }

  /* 한 판의 진짜 길이는 js/quiz-screens.js 가 들고 있다(SESSION_MAX).
     내보내 주면 그 값을 쓰고, 아니면 여기 적힌 수로 버틴다. 두 파일이 서로 다른
     수를 알고 있으면 이 카드가 광고한 길이와 실제로 시작되는 판이 또 어긋난다 —
     아래 주석이 적은 바로 그 병이 단위만 바뀐 채 돌아온다. */
  function sessionMax() {
    var n = window.QuizScreens && window.QuizScreens.SESSION_MAX;
    return typeof n === "number" && n > 0 ? n : 20;
  }

  /* 이 카드는 "복습할 단어 12개" 라고만 적고 곧바로 판을 시작했는데, 실제로는
     68문제가 나왔다. 단어 수는 범위의 크기이지 한 판의 길이가 아니다.
     게다가 퀴즈 탭은 같은 범위를 "68문제" 로 적어서, 같은 판으로 가는 두 문이
     서로 다른 단위로 광고하고 있었다. 시작될 판의 길이를 같이 적는다.

     본문이 아직 안 온 권이 섞여 있으면 문제 수를 아예 안 적는다. js/quiz.js 는
     본문이 없는 유형을 조용히 건너뛰므로 그때 센 수는 실제보다 작게 나온다.
     틀린 숫자를 적느니 없는 게 낫다. */
  /* 복습 대상이 걸린 권의 본문을 받아 둔다. 홈은 여태 본문을 한 번도 안 불러서
     문제 수를 세려 해도 재료가 없었다 — 그래서 "· 한 판 20문제" 가 앱을 새로 연
     사람에게는 거의 안 보였고, 고친 것이 안 고쳐진 것과 같았다.

     이미 왔거나 실패한 권은 다시 안 부른다. 그게 곧 고리를 끊는 조건이다 —
     받고 나면 missing 이 비므로 도착 -> 다시 그리기 -> 여기 -> 도착이 안 돈다.
     열두 권을 다 받지 않는다. 복습 큐에 걸린 권만이다. */
  var homeWarmed = {};
  function warmReviewBodies(due) {
    var missing = {};
    due.forEach(function (t) {
      if (!Store.hasBody(t.bookId) && !Store.bodyFailed(t.bookId) && !homeWarmed[t.bookId]) {
        missing[t.bookId] = true;
      }
    });
    var ids = Object.keys(missing);
    if (!ids.length) return;
    ids.forEach(function (id) { homeWarmed[id] = true; });

    var left = ids.length;
    ids.forEach(function (id) {
      Store.loadBody(id, function () {
        left -= 1;
        // 홈에 그대로 있을 때만 다시 그린다. 다른 화면으로 옮겨 갔으면 남의 화면이다.
        if (!left && App.currentPath() === "/home") App.refresh();
      });
    });
  }

  function reviewQuestionCount(due) {
    if (!window.Quiz) return 0;
    /* 아직 안 온 권이 있으면 세지 않는다. quiz.js 가 본문 없는 유형을 건너뛰므로
       그때 센 수는 실제보다 작다 — 작은 수를 적어 두면 눌렀을 때 또 어긋난다. */
    var ready = due.every(function (t) { return Store.hasBody(t.bookId); });
    if (!ready) {
      warmReviewBodies(due);
      return 0;
    }
    return window.Quiz.countQuestions(due, Store.allTerms(), sessionMax());
  }

  function reviewCall() {
    var due = Store.reviewQueue();
    if (!due.length) return "";
    var n = reviewQuestionCount(due);
    return '<button class="review-call" data-action="start-review">' +
      '<span class="review-call__icon">' + UI.icon("rotate", 22) + "</span>" +
      '<span style="flex:1;min-width:0">' +
      '<span class="review-call__title">복습할 단어 ' + due.length + "개" +
      (n ? " · 한 판 " + n + "문제" : "") + "</span>" +
      '<span class="review-call__sub">퀴즈에서 틀렸거나 본 지 오래된 단어입니다</span>' +
      "</span>" + UI.icon("right", 18) + "</button>";
  }

  function recentBlock() {
    var recent = Store.recentlyStudied(3);
    if (!recent.length) return "";
    return '<section class="block"><div class="block__head">' +
      '<h2 class="section-title">최근에 본 단어</h2>' +
      '<button class="link-btn" data-action="go" data-to="/progress">전체 기록</button></div>' +
      '<div class="stack">' + recent.map(function (t) {
        var status = Store.statusOf(t.id);
        return '<button class="card" style="padding:14px 16px;text-align:left;width:100%" ' +
          'data-action="go" data-to="/term/' + esc(t.id) + '">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
          statusDot(status) +
          '<span style="flex:1;min-width:0"><span class="term-row__term" style="font-size:15px">' +
          esc(t.term) + "</span></span>" +
          '<span class="meta">' + esc(t.bookName) + "</span>" +
          "</div></button>";
      }).join("") + "</div></section>";
  }

  function inProgressBlock() {
    var books = Store.books()
      .map(function (b) { return { book: b, stats: Store.bookStats(b) }; })
      .filter(function (x) { return x.stats.touched > 0 && x.stats.done < x.stats.total; })
      .sort(function (a, b) { return b.stats.touched - a.stats.touched; })
      .slice(0, 2);

    if (!books.length) return "";

    return '<section class="block"><div class="block__head">' +
      '<h2 class="section-title">공부 중인 단어장</h2>' +
      '<button class="link-btn" data-action="go" data-to="/books">전체</button></div>' +
      '<div class="stack">' + books.map(function (x) {
        return '<button class="book" data-action="go" data-to="/books/' + esc(x.book.id) + '">' +
          '<div class="book__top"><div>' +
          '<div class="book__name">' + esc(x.book.name) + "</div>" +
          '<div class="book__blurb">' + esc(x.book.blurb) + "</div></div>" +
          '<div class="book__count num">통과 ' + x.stats.done + " / " + x.stats.total + "</div></div>" +
          '<div class="book__bar">' + stackedBar(x.stats) + "</div></button>";
      }).join("") + "</div></section>";
  }

  function greetingLine() {
    var hour = new Date().getHours();
    var when = hour < 5 ? "늦은 밤" : hour < 12 ? "아침" : hour < 18 ? "오후" : "저녁";
    var stats = Store.overallStats();
    var due = stats.review;

    var headline = due
      ? "복습할 단어 <em>" + due + "개</em>가 기다리고 있습니다"
      : stats.counts.learned >= 3
        ? "읽은 단어를 <em>퀴즈로</em> 확인할 차례입니다"
        : "오늘도 <em>한 단어씩</em> 쌓아봅니다";

    var date = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

    return '<div class="home__greeting">' +
      '<p class="home__date">' + esc(date) + " " + esc(when) + "</p>" +
      // headline 은 위에서 만든 고정 문구 + 숫자뿐이다. 사용자 입력이 섞이지 않는다.
      '<h1 class="home__headline">' + headline + "</h1></div>";
  }

  App.register("/home", function () {
    // 단어가 하나도 없으면 인사도 통계도 할 말이 없다. 무슨 일이 있었는지만 말한다.
    if (!Store.books().length) return topbar({ right: themeButton() }) + indexFailed();

    return topbar({ right: themeButton() }) +
      '<main class="screen">' +
      greetingLine() +
      '<div class="stack stack--lg">' + todayCard() + reviewCall() + "</div>" +
      inProgressBlock() +
      recentBlock() +
      "</main>";
  });

  /* ---------------------------------------------------------- 단어장 목록 */

  App.register("/books", function () {
    var books = Store.books();
    var total = Store.overallStats();

    /* 색인이 없으면 이 화면은 제목만 남은 백지였다. 백지는 "여기엔 아무것도 없다" 로
       읽히지 "못 받았다" 로는 안 읽힌다. 그래서 다시 받을 길과 함께 사실을 적는다. */
    if (!books.length) return topbar({ title: "단어장", right: themeButton() }) + indexFailed();

    return topbar({ title: "단어장", right: themeButton() }) +
      '<main class="screen">' +
      '<p class="meta" style="margin-bottom:20px">전체 ' + total.total + "개 중 " +
      total.passed + "개 통과</p>" +
      '<div class="stack stack--lg">' + books.map(function (b) {
        var stats = Store.bookStats(b);
        return '<button class="book" data-action="go" data-to="/books/' + esc(b.id) + '">' +
          '<div class="book__top"><div>' +
          '<div class="book__name">' + esc(b.name) + "</div>" +
          '<div class="book__blurb">' + esc(b.blurb) + "</div></div>" +
          '<div class="book__count num">통과 ' + stats.done + " / " + stats.total + "</div></div>" +
          '<div class="book__bar">' + stackedBar(stats) + "</div>" +
          bookLegend(stats) + "</button>";
      }).join("") + "</div></main>";
  });

  /* ---------------------------------------------------------- 단어 목록
     단어가 많아질 때를 대비해 검색과 상태 필터를 같이 둔다.
     필터는 상태 이름 그대로 쓴다. 앱 전체가 같은 어휘를 쓴다. */

  var listState = { query: "", filter: "all", bookId: null };

  var FILTERS = [
    { key: "all", label: "전체" },
    { key: "review", label: "복습" },
    { key: "learned", label: "학습 완료" },
    { key: "passed", label: "퀴즈 통과" },
    { key: "new", label: "안 봄" },
  ];

  function filteredTerms(book) {
    var q = listState.query.trim().toLowerCase();
    return book.terms.filter(function (t) {
      var status = Store.statusOf(t.id);
      if (listState.filter !== "all" && status !== listState.filter) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().indexOf(q) !== -1 ||
        (t.reading || "").toLowerCase().indexOf(q) !== -1 ||
        (t.summary || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function termRows(list) {
    return list.map(function (t) {
      var status = Store.statusOf(t.id);
      return '<button class="term-row" data-action="go" data-to="/term/' + esc(t.id) + '">' +
        statusDot(status) +
        '<span class="term-row__body">' +
        '<span class="term-row__term">' + UI.highlight(t.term, listState.query) + "</span>" +
        '<span class="term-row__summary">' + UI.highlight(t.summary, listState.query) + "</span>" +
        "</span>" +
        '<span class="row__chevron">' + UI.icon("right", 18) + "</span></button>";
    }).join("");
  }

  App.register("/books/:bookId", function (params) {
    var book = Store.bookById(params.bookId);
    if (!book) return emptyState("inbox", "단어장을 찾을 수 없습니다", "단어장 목록에서 다시 선택해 주세요.");

    /* 목록을 보는 사람은 곧 그중 하나를 연다. 지금 본문을 받아두면 탭했을 때
       기다리는 화면을 안 본다. 이 화면 자체는 인덱스만으로 이미 다 그려진다. */
    Store.loadBody(book.id);

    // 다른 단어장으로 들어오면 검색과 필터를 초기화한다
    if (listState.bookId !== book.id) {
      listState = { query: "", filter: "all", bookId: book.id };
    }

    var counts = Store.bookStats(book).counts;
    var list = filteredTerms(book);

    var chips = FILTERS.map(function (f) {
      var n = f.key === "all" ? book.terms.length : counts[f.key];
      var pressed = listState.filter === f.key;
      return '<button class="chip" data-action="filter" data-key="' + f.key + '" aria-pressed="' +
        pressed + '"' + (n === 0 && f.key !== "all" ? " disabled" : "") + ">" +
        esc(f.label) + '<span class="chip__count num">' + n + "</span></button>";
    }).join("");

    var body = list.length
      ? '<div class="rows">' + termRows(list) + "</div>"
      : emptyState("search", "해당하는 단어가 없습니다", "검색어나 필터를 바꿔보세요.");

    return topbar({ back: true, title: book.name, bordered: false }) +
      '<div class="toolbar">' +
      '<label class="search">' + UI.icon("search", 18) +
      '<input type="search" id="term-search" placeholder="단어나 뜻으로 검색" value="' +
      esc(listState.query) + '" aria-label="단어 검색">' +
      "</label>" +
      '<div class="chips" role="group" aria-label="학습 상태로 거르기">' + chips + "</div>" +
      "</div>" +
      '<main class="screen screen--flush">' + body + "</main>";
  });

  /* 칩을 눌러도 주소는 그대로다. render() 로 다시 그리면 화면 전환으로 쳐서
     목록이 맨 위로 튀고 옆에서 미끄러져 들어온다 — 같은 목록을 거른 것뿐인데
     다른 데로 온 것처럼 보인다. 제자리에서 갈아 끼운다. */
  App.on("filter", function (data) {
    listState.filter = data.key;
    App.refresh();
  });

  // 입력할 때마다 화면을 통째로 다시 그리면 포커스가 날아간다.
  // 목록만 갈아 끼우고 입력창은 그대로 둔다.
  document.addEventListener("input", function (event) {
    if (event.target.id !== "term-search") return;
    listState.query = event.target.value;

    var book = Store.bookById(listState.bookId);
    if (!book) return;
    var list = filteredTerms(book);
    var main = document.querySelector(".screen--flush");
    if (!main) return;
    // security-ok: OWASP-A03-4 — termRows 는 UI.highlight/esc 로만 값을 넣는다
    main.innerHTML = list.length
      ? '<div class="rows">' + termRows(list) + "</div>"
      : emptyState("search", "해당하는 단어가 없습니다", "검색어나 필터를 바꿔보세요.");
  });

  /* ---------------------------------------------------------- 단어 상세
     제품의 중심 화면. 정보를 한 번에 쏟지 않는다. 다만 접는 기준은
     "길다" 가 아니라 "본체가 아니다" 다.
     항상 보이는 것: 표제어, 한 줄 뜻, 정의, 그림, 어떻게 작동하나,
                    왜 필요한가, 무엇으로 되어 있나, 흔히 잘못 아는 것.
     접어두는 것: 실제 사례, 무엇과 비교되나, 주의할 점, 관련 개념. */

  /* 접힌 줄에 붙일 한 줄 미리보기.
     NN/g 가 말하는 information scent — 열기 전에 뭐가 나올지 짐작할 수 있어야 한다.
     라벨만 여섯 줄 쌓여 있으면 어디를 열지 고를 근거가 없다.
     도해나 코드가 먼저 나오는 섹션은 미리 보여줄 문장이 없으므로 건너뛴다. */
  /* 접힌 줄에 붙일 한 줄 미리보기.

     처음에는 "첫 문장"을 뽑으려 했는데, 노트를 열어 보니 이 섹션들에는 산문이
     거의 없다. 소제목·비교표·목록이 본체다. 그래서 문장 대신 안에 든 항목의
     이름을 이어 붙인다. "GET · POST · PUT · DELETE" 가 어설픈 한 문장보다
     열지 말지 고르는 데 훨씬 도움이 된다. */
  function clean(line) {
    return UI.plain(line)
      .replace(/^[-*]\s+/, "")
      .replace(/^#+\s+/, "")
      .replace(/^\d+\.\s+/, "")   // "2. 회사별 정보 모름" 의 번호는 단서가 아니다
      .replace(/:$/, "")
      .trim();
  }

  function peekItems(lines) {
    var heads = lines.filter(function (l) { return /^#{3,6}\s+/.test(l); });
    if (heads.length >= 2) return heads.map(clean);

    var table = lines.find(function (l) { return /^\|/.test(l); });
    if (table) {
      return table.replace(/^\||\|$/g, "").split("|").map(clean).filter(Boolean);
    }

    var bullets = lines.filter(function (l) { return /^[-*]\s+/.test(l); });
    if (bullets.length) return [clean(bullets[0])];

    var prose = lines.filter(function (l) { return !/^(#|>|\|)/.test(l); }).map(clean);
    return prose.filter(function (l) { return l.length >= 12; }).slice(0, 1);
  }

  function peek(body, limit) {
    var lines = String(body || "")
      .replace(/```[\s\S]*?```/g, "\n")  // 코드/도해 블록은 한 줄 요약에 쓸 수 없다
      .split("\n")
      .map(function (l) { return l.trim(); })
      .filter(Boolean);

    var text = peekItems(lines).filter(Boolean).join(" · ");
    if (text.length < 6) return "";
    return text.length > limit ? text.slice(0, limit).trim() + "…" : text;
  }

  function plainPeek(body) {
    var text = peek(body, 46);
    return text ? '<span class="disclose__peek">' + esc(text) + "</span>" : "";
  }

  /* "- **틀린 말** — 실은 이렇다" 한 줄을 둘로 가른다.
     접힌 줄의 미리보기와 펼친 뒤의 목록이 같은 판단을 써야 해서 따로 세운다. */
  function parseMyths(body) {
    var items = [];
    String(body || "").split("\n").forEach(function (line) {
      var m = line.match(/^\s*-\s*\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
      if (m) items.push({ wrong: m[1].trim(), right: m[2].trim() });
    });
    return items;
  }

  /* 오해 칸의 미리보기는 따로 만든다.
     여느 칸처럼 앞 46자를 자르면 틀린 명제 뒤에 정정문 앞부분이 어중간하게 붙는다.
     훑고 지나가는 사람은 그 조각을 사실로 주워 담는다. 틀린 문장만 ✕ 를 달아 잇고
     정정문은 미리보기에서 아예 뺀다 — 정정은 열어야 볼 수 있는 것이 맞다.

     한 줄도 안 풀리면 미리보기를 비운다. 그때 평범한 자르기로 되돌리면
     방금 막은 위험이 그대로 돌아온다. */
  function mythPeek(body) {
    var wrongs = parseMyths(body).map(function (it) {
      return '<span class="x" aria-hidden="true">✕</span> ' + esc(UI.plain(it.wrong));
    });
    if (!wrongs.length) return "";
    return '<span class="disclose__peek disclose__peek--myth">' + wrongs.join(" · ") + "</span>";
  }

  /* 흔한 오해. 틀린 문장을 앞에 세우고 그 밑에서 부순다.
     순서가 중요하다 — 맞는 말을 먼저 하면 읽는 사람은 자기가 뭘 잘못
     알고 있었는지 모르고 지나간다. 그래서 평범한 목록으로 두지 않는다. */
  function mythPanel(body) {
    var items = parseMyths(body);
    if (!items.length) return UI.markdown(body);

    return '<ul class="myth">' + items.map(function (it) {
      return '<li class="myth__item">' +
        '<b class="myth__wrong"><span class="myth__x" aria-hidden="true">✕</span>' +
        UI.markdown(it.wrong).replace(/^<p>|<\/p>$/g, "") + "</b>" +
        '<span class="myth__right">' +
        UI.markdown(it.right).replace(/^<p>|<\/p>$/g, "") + "</span></li>";
    }).join("") + "</ul>";
  }

  var PANEL = { myth: mythPanel };

  /* ---- 확인 질문이 건너뛸 자리 ----

     원문의 "→ 뒤" 를 화면의 실제 칸으로 잇는 표. 저자는 마크다운 제목으로 생각하고
     쓰지만("→ 🚨 주의사항") 화면에 걸린 이름은 "주의할 점" 이다. 셋 다 같은 자리로
     가야 해서 한 칸에 세 이름을 등록한다 — 화면 이름, 이모지 뗀 원문 제목, 원문 제목.
     비교할 때 공백을 지우는 건 "그림 으로 보기" 처럼 띄어쓰기만 다른 표기를 살리기 위해서다.
     화면을 그릴 때마다 비운다. 앞 단어의 자리가 남아 있으면 엉뚱한 칸으로 데려간다. */
  var TARGETS = {};

  function slugOf(label) {
    return "p-" + String(label).replace(/\s+/g, "-");
  }

  /* "🚫 흔한 오해" -> "흔한 오해". build.py 의 strip_leading_emoji 와 같은 규칙이라
     저자가 이모지를 떼고 쓰든 붙여 쓰든 같은 칸으로 간다. */
  function bare(head) {
    return String(head || "").trim().replace(/^[^\w가-힣(]+/, "").trim();
  }

  function aim(name, id) {
    if (name) TARGETS[String(name).replace(/\s+/g, "")] = id;
  }

  function findTarget(name) {
    return TARGETS[String(name).replace(/\s+/g, "")] || "";
  }

  /* 한 칸이 받아 주는 이름을 전부 건다.
     저자는 "📊 비교: 세션 vs JWT" 를 "→ 비교" 라고 줄여 쓴다. 검사기도 부제를
     떼어 그 이름을 통과시키므로, 화면이 부제 붙은 원문만 알고 있으면 검사기는
     조용히 통과시키고 단추는 조용히 안 생긴다. 양쪽이 같은 이름을 알아야 한다. */
  function aimAll(names, id) {
    names.forEach(function (name) {
      if (!name) return;
      aim(name, id);
      aim(bare(name), id);
      var cut = String(name).indexOf(":");
      if (cut !== -1) {
        var stem = String(name).slice(0, cut).trim();
        aim(stem, id);
        aim(bare(stem), id);
      }
    });
  }

  /* 고정 자리로 올라간 칸은 여기서 빠져야 한다. 안 빼면 같은 글이 한 화면에
     두 번 나오고 id 도 겹친다.

     거를 때 슬롯 이름을 쓰지 않는다. 저자가 자기 제목을 써서 같은 슬롯으로
     짐작된 칸이 둘이 되는 편이 있는데(build.py 의 own_sections), 이름으로 거르면
     위로 안 올라간 나머지 하나까지 함께 사라진다. 실제로 꺼내 쓴 그 객체만 뺀다. */
  function disclosureSections(term, pinned) {
    var taken = (pinned || []).map(function (p) { return p.part; });

    return term.sections.filter(function (s) {
      return taken.indexOf(s) === -1;
    }).map(function (s) {
      var id = slugOf(s.label);
      var hint = s.slot === "myth" ? mythPeek(s.body) : plainPeek(s.body);
      var draw = PANEL[s.slot] || UI.markdown;

      aimAll([s.label, s.head], id);

      /* 전부 닫힌 채 시작한다. 예전에는 첫 칸을 열어뒀는데, 그때는 "해결하는
         문제"가 접혀 있어서 안 열면 읽을 게 요약 한 장뿐이었기 때문이다.
         이제 본체가 전부 위에 펼쳐져 있고 접힌 칸에 남는 것은 곁가지뿐이다 —
         그중 하나만 열어두면 그 칸이 특별해 보인다. */
      return '<details class="disclose" id="' + esc(id) + '"' +
        '><summary class="disclose__btn">' +
        '<span class="disclose__text">' +
        '<span class="disclose__label">' + esc(s.label) + "</span>" + hint +
        "</span>" +
        '<span class="disclose__icon">' + UI.icon("chevron", 18) + "</span>" +
        "</summary>" +
        '<div class="disclose__panel prose">' + draw(s.body) + "</div></details>";
    }).join("");
  }

  /* 접이식 밖에 그려지는 세 자리도 답이 있는 자리가 될 수 있다.
     "→ 정리" 나 "→ 그림" 은 저자가 실제로 쓰는 말이고, 검사기도 통과시킨다.
     화면이 이 이름들을 모르면 검사기는 조용히 통과시키고 단추는 조용히 안 생긴다. */
  var DEFINITION_NAMES = ["정의", "📝 정의", "한 줄 정의"];
  var FIGURE_NAMES = ["그림", "그림으로 보기", "🖼️ 그림으로 보기", "도해"];

  function figureSection(term) {
    if (!term.figure) return "";
    FIGURE_NAMES.forEach(function (name) { aim(name, "p-그림"); });
    return '<section class="figure-slot" id="p-그림">' + UI.markdown(term.figure) + "</section>";
  }

  /* ---- 이름 풀기 ----

     영어 이름을 낱말 단위로 쪼개 그 밑에 뜻을 달고, 도로 이어 붙인
     문장을 밑에 둔다. Transmission · Control · Protocol → "전송을
     통제하는 약속" — 이어 붙인 문장이 그대로 정의인 단어가 많다.
     이름을 풀면 외울 것이 하나 줄어든다.

     문법은 도해와 같다. '낱말 :: 뜻' 여러 줄과 '= 이어 읽으면 …' 한 줄.
     한 낱말짜리 이름(Docker 같은)은 쪼갤 게 없어서 '=' 줄만 있다 —
     그때도 유래 한 줄은 남기므로 칸은 선다. */
  function parseName(md) {
    var words = [], sum = "";
    String(md).split("\n").forEach(function (line) {
      var pair = line.match(/^\s*(.+?)\s*::\s*(.+)$/);
      if (pair) { words.push({ en: pair[1].trim(), ko: pair[2].trim() }); return; }
      var tail = line.match(/^\s*=\s*(.+)$/);
      if (tail) sum = tail[1].trim();
    });
    return { words: words, sum: sum };
  }

  function nameBlock(term) {
    if (!term.name) return "";
    var parsed = parseName(term.name);
    if (!parsed.words.length && !parsed.sum) return "";
    return '<aside class="analogy analogy--name"><b class="analogy__k">이름</b>' +
      (parsed.words.length
        ? '<span class="namebox">' + parsed.words.map(function (w) {
            return '<span class="namebox__word"><b class="namebox__en">' + esc(w.en) + "</b>" +
              '<span class="namebox__ko">' + esc(w.ko) + "</span></span>";
          }).join('<span class="namebox__plus" aria-hidden="true">+</span>') + "</span>"
        : "") +
      (parsed.sum
        ? '<span class="namebox__sum">' +
          UI.markdown(parsed.sum).replace(/^<p>|<\/p>$/g, "") + "</span>"
        : "") +
      "</aside>";
  }

  function analogyBlock(term) {
    if (!term.analogy) return "";
    return '<aside class="analogy"><b class="analogy__k">비유</b>' +
      UI.markdown(term.analogy).replace(/^<p>|<\/p>$/g, "") + "</aside>";
  }

  /* 비유 다음의 한 줄. 비유가 "무엇과 닮았나"(가상의 사물)를 주면
     예는 "어디서 봤나"(이미 겪은 장면)를 준다. 접힌 💡 실제 사례와
     다른 일을 한다 — 저건 사례 셋이고 이건 첫 30초의 "아, 그거" 다. */
  function exampleBlock(term) {
    if (!term.example) return "";
    return '<aside class="analogy analogy--case"><b class="analogy__k">예</b>' +
      UI.markdown(term.example).replace(/^<p>|<\/p>$/g, "") + "</aside>";
  }

  /* 예 다음의 한 줄. 비유가 "무엇과 닮았나", 예가 "어디서 봤나" 를 주면
     직접은 "지금 어떻게 보나" 를 준다. 직접 눈으로 본 것은 장면이 되어
     남는다. 실제로 해 볼 수 있는 단어에만 있고, 없어도 판은 선다. */
  function tryitBlock(term) {
    if (!term.tryit) return "";
    return '<aside class="analogy analogy--case"><b class="analogy__k">직접</b>' +
      UI.markdown(term.tryit).replace(/^<p>|<\/p>$/g, "") + "</aside>";
  }

  /* ---- 접지 않는 자리 ----

     밖에 나와 있던 것은 "왜 필요한가"·"무엇으로 되어 있나" 둘뿐이었고, 그 아래
     접힌 무더기 위에 "몰라도 판은 읽힌다" 가 붙어 있었다. 그런데 접힌 쪽은
     심화가 아니었다. 세어 보니 어떻게 작동하나 634/634, 흔히 잘못 아는 것
     634/634 로 전 편에 빠짐없이 있는 본체였고, 글 끝 확인 문제 1,902개 중
     903개가 그 둘을 답이 있는 자리로 가리키고 있었다. 안내를 믿고 접힌 것을
     건너뛴 사람은 마지막 문제에서 막힌다. 본체를 접어놓고 몰라도 된다고
     적어둔 셈이라 둘을 밖으로 꺼낸다.

     순서는 이해가 나아가는 순서다 — 무엇인가(정의·그림) → 어떻게 되나 →
     왜 필요한가 → 무엇으로 되어 있나 → 흔히 잘못 아는 것. 오해가 맨 뒤인 것은
     무엇인지 알기 전에 "이건 틀린 말이다" 를 먼저 읽으면 부술 대상이 없어서
     틀린 쪽만 남기 때문이다.

     자리마다 있고 없고가 다르다. "무엇으로 되어 있나" 는 부품이 있는 단어에만
     있다(634편 중 93편). 없으면 그 자리도 없다 — 빈 제목만 세워두지 않는다. */
  var PINNED_SLOTS = ["how", "why", "compose", "myth"];

  /* 고정 자리의 재료가 두 군데서 온다. 굽는 쪽(tools/build.py)이 이미 밖으로 빼 둔
     것은 term.why · term.compose 처럼 통째로 오고, 어떻게 작동하나 · 흔히 잘못
     아는 것은 아직 접이식 목록(term.sections) 안에 들어 있다. 한쪽만 보면
     그 자리가 조용히 사라지므로 화면에서 두 군데를 다 뒤진다. */
  function pinnedPart(term, slot) {
    if (term[slot]) return term[slot];
    return (term.sections || []).find(function (s) { return s.slot === slot; }) || null;
  }

  function pinnedParts(term) {
    var used = [];
    PINNED_SLOTS.forEach(function (slot) {
      var part = pinnedPart(term, slot);
      if (part) used.push({ slot: slot, part: part });
    });
    return used;
  }

  function pinnedSection(part, slot) {
    var id = slugOf(part.label);
    /* 오해 칸은 밖으로 나와도 그리는 법이 다르다 — 틀린 문장을 앞에 세우고
       그 밑에서 부순다. 접혀 있을 때 쓰던 그 판을 그대로 쓴다. */
    var draw = PANEL[slot] || UI.markdown;
    aimAll([part.label, part.head], id);
    return '<section class="pinsec" id="' + esc(id) + '">' +
      '<h2 class="pinsec__head">' + esc(part.label) + "</h2>" +
      '<div class="pinsec__body prose">' + draw(part.body) + "</div></section>";
  }

  function pinnedSections(parts) {
    return parts.map(function (p) { return pinnedSection(p.part, p.slot); }).join("");
  }

  /* 이해했는지. 맨 아래, 펼쳐진 채로, 다음 버튼 바로 위에 둔다.
     읽기가 끝나는 지점이자 "학습 완료" 를 누르기 직전의 마지막 관문이다. */
  /* 마무리 문단. 접이식에 두면 6칸 상한에 밀려 대부분의 단어에서 잘려 나간다.
     되짚고 나서 스스로 물어보는 순서라 확인 질문 바로 앞에 붙인다. */
  /* わわわIT用語辞典의 마지막 칸은 요약이 아니라 "이 단어가 나오면 '~구나'
     하고 생각하세요" 다. 이 앱의 목적도 글 읽기라, 마지막 칸이 지식을
     다시 늘어놓는 대신 다음에 이 말을 만났을 때 할 생각을 준다. */
  var RECAP_NAMES = ["이 말을 만나면", "한 번 더 정리", "정리", "📝 정리"];

  function recapBlock(term) {
    if (!term.recap) return "";
    aimAll(RECAP_NAMES, "p-정리");
    return '<section class="recap" id="p-정리">' +
      '<h2 class="recap__head">이 말을 만나면</h2>' +
      '<div class="prose">' + UI.markdown(term.recap) + "</div></section>";
  }

  /* 질문 한 줄을 { 질문, 답이 있는 자리 } 로 세운다.
     빌드가 "→ 뒤" 를 떼어내기 전에 구워둔 데이터에는 질문 문자열만 들어 있다.
     그때도 화면은 질문을 그대로 보여줘야 하므로 두 모양을 다 받는다. */
  function asked(item) {
    if (typeof item === "string") return { q: item, at: "" };
    return { q: (item && item.q) || "", at: (item && item.at) || "" };
  }

  /* 답이 있는 자리로 가는 단추. 질문만 던져놓고 끝나면 회상 연습은 절반만 된다 —
     자기 답이 맞았는지 알 길이 없고, 답의 절반은 접힌 칸 안에 있다.
     원문이 가리킨 이름이 표에서 안 풀리면 단추를 달지 않는다.
     아무 데도 못 가는 단추는 없는 것만 못하다. */
  function jumpButton(at) {
    var id = at ? findTarget(at) : "";
    if (!id) return "";
    return '<button class="selfcheck__jump" type="button" data-jump="' + esc(id) + '">' +
      '답이 있는 자리 <span aria-hidden="true">→</span> ' + esc(at) + "</button>";
  }

  function checkSection(term) {
    if (!term.check || !term.check.length) return "";
    return '<section class="selfcheck">' +
      '<h2 class="selfcheck__head">이 셋에 답할 수 있으면 이해한 것이다</h2>' +
      '<ol class="selfcheck__list">' +
      term.check.map(function (item, i) {
        var ask = asked(item);
        return '<li><span class="selfcheck__n" aria-hidden="true">' + (i + 1) + "</span>" +
          '<span class="selfcheck__body">' +
          /* esc 가 아니라 inline 이다. 확인 질문 1,908개 중 73개가 `/24`
             `23456` 처럼 인라인 코드를 품고 있는데, 그냥 이스케이프하면
             백틱이 글자로 찍혀 "`/24` 로는 왜 모자라나" 가 된다. */
          '<span class="selfcheck__q">' + UI.inline(ask.q) + "</span>" +
          jumpButton(ask.at) + "</span></li>";
      }).join("") + "</ol></section>";
  }

  /* ---- 열 살에게 ----

     이 앱의 목표 문장 그 자체 — 읽고 나면 IT 를 모르는 사람에게 제
     입으로 설명할 수 있어야 한다. 남을 가르칠 준비가 배움을 가장 깊게
     만들고(프로테제 효과), 답을 보기 전에 스스로 만들어 보는 인출이
     기억을 굳힌다(테스트 효과). 그래서 모범 답을 바로 보여주지 않고
     "해 봤다" 를 누른 다음에 연다.

     모범 답은 IT 낱말 0개로 쓴다. tools/check_template.py 가 금지어
     목록으로 그걸 잰다 — 지켜지는지가 곧 그 편의 품질 검사다. */
  function kidCard(term) {
    if (!term.kid) return "";
    return '<section class="kidcard">' +
      '<h2 class="kidcard__head">열 살에게 설명할 수 있으면 진짜 아는 것이다</h2>' +
      '<p class="kidcard__ask">IT 를 모르는 사람에게 이 단어를 두어 문장으로 ' +
      '설명해 보라 — 소리 내어. 막히면 비유와 그림에 다녀온다.</p>' +
      '<details class="kidcard__box"><summary class="kidcard__btn">해 봤다 — 모범 답 열기</summary>' +
      '<div class="kidcard__ans prose">' + UI.markdown(term.kid) + "</div></details></section>";
  }

  /* 노트끼리 거는 링크는 파일 이름을 가리키는데 화면에 걸리는 건 제목이다.
     "Index.md" 의 제목이 "인덱스" 인 식이라 제목만 보면 못 찾는다.
     빌드가 실어 보낸 별칭(제목·원어·파일 이름)으로 찾는다.
     관련 용어 칸과 본문 [[링크]] 가 같은 판정을 써야 해서 여기 하나로 둔다. */
  function termByName(name) {
    var wanted = String(name || "").trim().toLowerCase();
    if (!wanted) return null;
    return Store.allTerms().find(function (t) {
      return t.aliases
        ? t.aliases.indexOf(wanted) !== -1
        : t.term.toLowerCase() === wanted;
    }) || null;
  }

  /* ---- 단어에서 단어로 ----

     관련 개념과 본문 [[링크]] 는 목록에서 단어로 들어가는 것과 다른 일을 한다.
     계층을 한 칸 내려가는 게 아니라 옆으로 건너뛰는 것이다. 그런데 둘 다 평범한
     "go" 였다. HTTP 를 읽다 [[TCP]] 로 건너뛴 뒤 ← 를 누르면 상단바가 계층을
     거슬러 올라가서 HTTP 가 아니라 네트워크 목록으로 나갔고, TCP 가 다른 권이면
     읽던 것과 상관없는 단어장 한복판에 떨어졌다. 돌아갈 곳은 읽던 그 단어다. */
  App.on("go-term", function (data) {
    App.navigateLateral("/term/" + data.id);
  });

  function relatedSection(term) {
    if (!term.related || !term.related.length) return "";

    var items = term.related.map(function (r) {
      var found = termByName(r.term);
      // 이 목업에는 없는 단어도 그대로 보여준다. 원본 노트의 연결을 지우지 않는다.
      if (!found) {
        return '<div class="related__item related__item--plain">' +
          '<span class="related__term">' + esc(r.term) + "</span>" +
          '<span class="related__note">' + esc(r.note) + "</span></div>";
      }
      return '<button class="related__item" data-action="go-term" data-id="' + esc(found.id) + '">' +
        '<span class="related__term">' + esc(r.term) + "</span>" +
        '<span class="related__note">' + esc(r.note) + "</span></button>";
    }).join("");

    // 연결된 용어 이름 자체가 가장 좋은 미리보기다. 열기 전에 무엇이 걸려 있는지 보인다.
    var names = term.related.map(function (r) { return r.term; }).join(" · ");

    return "<details class=\"disclose\"><summary class=\"disclose__btn\">" +
      '<span class="disclose__text">' +
      '<span class="disclose__label">관련 개념 ' + term.related.length + "개</span>" +
      '<span class="disclose__peek">' + esc(names) + "</span></span>" +
      '<span class="disclose__icon">' + UI.icon("chevron", 18) + "</span></summary>" +
      '<div class="disclose__panel"><div class="related">' + items + "</div></div></details>";
  }

  /* 하단 고정 버튼. 상태에 따라 라벨이 바뀌면서 다음 할 일을 알려준다.
     읽기 -> 학습 완료 -> 퀴즈 -> 복습 이라는 루프가 이 버튼 하나에 드러난다. */
  function primaryAction(term, status) {
    if (status === Store.STATUS.PASSED) {
      return '<button class="btn btn--secondary" style="flex:1" data-action="mark-review" data-id="' +
        esc(term.id) + '">' + UI.icon("rotate", 18) + "복습 목록에 넣기</button>";
    }
    if (status === Store.STATUS.LEARNED || status === Store.STATUS.REVIEW) {
      return '<button class="btn btn--primary" data-action="quiz-one" data-id="' + esc(term.id) + '">' +
        UI.icon("quiz", 18) + "퀴즈로 확인하기</button>";
    }
    /* 읽는 중일 때의 다음 걸음은 "학습 완료" 가 아니라 "떠올려 보기" 다.

       이 앱의 목표는 읽은 사람이 그 단어를 남에게 설명할 수 있게 되는 것인데,
       단추 하나로 학습 완료가 되면 끝까지 스크롤한 것과 아는 것이 같아진다.
       떠올리기는 그 사이에 있어야 할 한 걸음인데, 여기까지 들어오는 문이
       홈의 얇은 발판 하나뿐이라 대부분 이 자리에서 건너뛰었다.

       한 장짜리 판이 열리고, 거기서 "떠올랐다" 를 누르면 recall-got 이
       markLearned 를 부른다(js/recall.js). 그래서 도착점은 그대로다 —
       가는 길에 스스로 한 번 말해 보는 것이 끼어들 뿐이다.
       ✕ 로 나가면 읽던 자리로 되돌아온다(quit-recall 의 session.from). */
    return '<button class="btn btn--primary" data-action="recall-one" data-id="' + esc(term.id) + '">' +
      UI.icon("layers", 18) + "떠올려 보기</button>";
  }

  function neighbours(term) {
    var book = Store.bookById(term.bookId);
    var idx = book.terms.findIndex(function (t) { return t.id === term.id; });
    return {
      prev: idx > 0 ? book.terms[idx - 1] : null,
      next: idx < book.terms.length - 1 ? book.terms[idx + 1] : null,
      position: idx + 1,
      total: book.terms.length,
    };
  }

  /* 본문이 아직 안 온 사이에 내놓는 화면.

     빈 화면 대신 이미 아는 것(제목·한 줄 뜻)을 먼저 보여준다. 인덱스에 들어
     있으니 공짜다. 본문이 도착하면 App.refresh() 가 같은 주소를 제자리에서 갈아 끼운다.
     같은 권의 다음 단어는 청크가 이미 있어서 이 화면을 두 번 보지 않는다. */
  function termLoading(term) {
    return topbar({ back: true }) +
      '<main class="screen">' +
      '<h1 class="term__name" data-focus tabindex="-1">' + esc(term.term) + "</h1>" +
      (term.reading ? '<p class="term__reading">' + esc(term.reading) + "</p>" : "") +
      '<p class="term__gist">' + UI.markdown(term.summary || "") + "</p>" +
      '<p class="meta" role="status">본문을 불러오는 중…</p>' +
      "</main>";
  }

  /* 본문을 못 받았을 때. 저절로 다시 시도하지 않는다 — 되풀이해서 실패할 뿐이고,
     그 사이 화면은 아무 말도 안 한다. 무슨 일이 있었는지 말하고 사용자에게 맡긴다.
     제목과 한 줄 뜻은 인덱스에 있으니 그것만이라도 보여준다. */
  function termLoadFailed(term) {
    return topbar({ back: true }) +
      '<main class="screen">' +
      '<h1 class="term__name" data-focus tabindex="-1">' + esc(term.term) + "</h1>" +
      (term.reading ? '<p class="term__reading">' + esc(term.reading) + "</p>" : "") +
      '<p class="term__gist">' + UI.markdown(term.summary || "") + "</p>" +
      emptyState("inbox", "본문을 불러오지 못했습니다",
        "연결이 끊겼거나 파일을 받지 못했습니다. 한 줄 뜻은 위에 그대로 있습니다.") +
      '<div class="empty__act"><button class="btn btn--primary" data-action="retry-body" data-book="' +
      esc(term.bookId) + '" data-id="' + esc(term.id) + '">다시 시도</button></div>' +
      "</main>";
  }

  /* 다시 시도도 이동이 아니다 — 같은 단어의 같은 주소에 그대로 있다.
     기다리는 화면으로 한 번, 본문이 오면 또 한 번 갈아 끼운다. */
  App.on("retry-body", function (data) {
    Store.loadBody(data.book, function () {
      if (App.currentPath() === "/term/" + data.id) App.refresh();
    }, true);
    App.refresh();
  });

  App.register("/term/:termId", function (params) {
    var term = Store.termById(params.termId);
    if (!term) {
      /* 이 경로에서는 탭바가 숨는다. 빈 상태만 내놓으면 뒤로 갈 버튼도 탭도 없어서
         앱 안에서 빠져나갈 길이 사라진다. 상단바와 돌아가는 버튼을 같이 준다. */
      return topbar({ back: true }) +
        '<main class="screen">' +
        emptyState("inbox", "단어를 찾을 수 없습니다", "주소가 잘못됐거나 지워진 단어다.") +
        '<div class="empty__act"><button class="btn btn--primary" data-action="go" data-to="/books">' +
        "단어장으로 가기</button></div></main>";
    }

    /* 본문은 권 단위로 온다. 아직이면 기다리는 화면을 주고, 도착하면 다시 그린다.
       markOpened 는 본문을 실제로 보여줄 때만 — 안 그러면 로딩 화면을 스쳐도
       "읽는 중"으로 기록된다.

       실패는 반드시 성공과 갈라서 다뤄야 한다. 실패했는데 그냥 다시 그리면
       hasBody 가 여전히 false 라 또 요청하고, 또 실패하고, 또 그린다.
       처음에 ok 를 안 보고 무조건 다시 그렸다가 6초에 2만 번을 돌았다. */
    if (Store.bodyFailed(term.bookId)) return termLoadFailed(term);

    if (!Store.hasBody(term.bookId)) {
      Store.loadBody(term.bookId, function (ok) {
        if (!ok && !Store.bodyFailed(term.bookId)) return;
        // 기다리는 화면을 본문으로 바꾸는 것뿐이다. 주소는 그대로이므로 제자리 갱신.
        if (App.currentPath() === "/term/" + params.termId) App.refresh();
      });
      return termLoading(term);
    }

    Store.markOpened(term.id);
    var status = Store.statusOf(term.id);
    var near = neighbours(term);

    /* 조각을 미리 만들어 둔다. 확인 질문의 단추는 나머지 자리들이 등록해 둔 표를
       읽어야 하므로 반드시 마지막에 만들어져야 한다. 문자열을 이어 붙이는 자리에
       그냥 두면 평가 순서가 곧 등록 순서가 되어, 나중에 줄을 옮겼을 때
       단추만 조용히 사라진다. */
    TARGETS = {};
    aimAll(DEFINITION_NAMES, "p-정의");
    var figureHtml = figureSection(term);
    var pinned = pinnedParts(term);
    var pinnedHtml = pinnedSections(pinned);
    var panelsHtml = disclosureSections(term, pinned) + relatedSection(term);
    var recapHtml = recapBlock(term);
    var checkHtml = checkSection(term);
    var kidHtml = kidCard(term);

    var stepBtn = function (t, dir) {
      var label = dir === "prev" ? "이전 단어" : "다음 단어";
      if (!t) {
        return '<button class="step-btn" disabled aria-label="' + label + ' 없음">' +
          UI.icon(dir === "prev" ? "back" : "forward", 18) + "</button>";
      }
      return '<button class="step-btn" data-action="go" data-to="/term/' + esc(t.id) +
        '" aria-label="' + label + ': ' + esc(t.term) + '">' +
        UI.icon(dir === "prev" ? "back" : "forward", 18) + "</button>";
    };

    return '<div class="read-progress"><div class="read-progress__fill" id="read-fill"></div></div>' +
      topbar({
        back: true,
        right: '<span class="meta num" style="padding-right:4px">' + near.position + " / " + near.total + "</span>",
      }) +
      '<main class="screen screen--reading"><article class="detail">' +
      '<header class="detail__head">' +
      '<p class="detail__cat">' + esc(term.bookName) + "</p>" +
      '<h1 class="detail__term">' + esc(term.term) + "</h1>" +
      (term.reading ? '<p class="detail__reading">' + esc(term.reading) + "</p>" : "") +
      '<p class="detail__status">' + badge(status) + "</p>" +
      "</header>" +
      '<div class="gist" id="p-정의">' + UI.markdown(term.summary).replace(/^<p>|<\/p>$/g, "") + "</div>" +
      /* 한 줄 뜻 바로 밑이 장면 자리다. 글을 한 줄 읽고 그림을 한 번 보면
         그 뒤의 글이 걸릴 자리가 생긴다. 장면이 없는 편은 이 줄이 빈다. */
      Art.scene(term) +
      /* 이름 → 비유 → 예 → 직접. 이름은 외울 것을 줄이고, 비유는 "무엇과
         닮았나", 예는 "어디서 봤나", 직접은 "지금 어떻게 보나" 를 준다.
         비유가 배경 문단을 앞지른다 — 한 줄 뜻 다음에 배경 산문을 두면
         구체적인 앵커가 유래 설명 뒤로 밀린다. */
      nameBlock(term) +
      analogyBlock(term) +
      exampleBlock(term) +
      tryitBlock(term) +
      (term.definition
        ? '<div class="prose prose--def">' + UI.markdown(term.definition) + "</div>"
        : "") +
      figureHtml +
      /* 순서가 질문을 따라간다 — 무엇인가(정의·그림) → 어떻게 작동하나 →
         왜 필요한가 → 무엇으로 되어 있나 → 흔히 잘못 아는 것.
         그다음이 곁가지(접이식)다. */
      pinnedHtml +
      '<div class="panels">' +
      /* 접힌 칸 무더기 위에 한 줄.

         전에는 "몰라도 판은 읽히고, 궁금해지면 연다" 였는데, 그때는 이 밑에
         작동 원리와 흔한 오해가 들어 있었다. 확인 문제가 가장 많이 가리키는
         두 칸을 놓고 몰라도 된다고 말한 셈이다. 그 둘이 위로 올라간 지금은
         남은 것이 정말로 곁가지(사례·견주기·주의)이니 그대로 적는다.
         다만 확인 문제가 여기를 가리키기도 하므로 "안 열어도 된다" 로 끝내지
         않는다 — 가리키면 그 단추가 이 칸을 저절로 연다(land 참고). */
      (panelsHtml
        ? '<p class="panelhint">여기부터는 곁가지다 — 지금 안 열어도 되고, ' +
          "아래 확인 문제가 가리키면 그때 저절로 열린다</p>"
        : "") +
      panelsHtml + "</div>" +
      recapHtml +
      checkHtml +
      kidHtml +
      "</article></main>" +
      '<div class="action-bar">' + stepBtn(near.prev, "prev") +
      primaryAction(term, status) + stepBtn(near.next, "next") + "</div>";
  });

  /* 이 둘은 화면을 옮기지 않는다 — 방금 읽은 그 단어에 그대로 있다.
     그런데 App.render() 를 부르고 있어서, 긴 본문을 3,400px 내려 읽고 하단 바의
     "학습 완료" 를 누르면 맨 위로 튀고 펼쳐 둔 접이식이 전부 닫혔다.
     다 읽은 사람이 누르라고 만든 단추가 다 읽은 흔적을 지우고 있었다.
     바뀌는 것은 배지와 하단 단추 하나뿐이므로 제자리에서 갈아 끼운다. */
  /* 지금 이 이름을 부르는 단추는 없다. 단어 화면의 첫 단추가 떠올리기를 거치도록
     바뀌면서(primaryAction) 그 길로 옮겨 갔고, 표시 자체는 recall-got 이 단다.
     핸들러는 남겨 둔다 — "읽었다고 표시한다" 는 이 앱의 기본 동작이라,
     다시 필요해지는 자리가 생기면 여기서 이어 쓰면 된다. */
  App.on("mark-learned", function (data) {
    Store.markLearned(data.id);
    UI.toast("학습 완료로 표시했습니다", "check");
    App.refresh();
  });

  App.on("mark-review", function (data) {
    Store.markWrong(data.id);
    UI.toast("복습 목록에 넣었습니다", "rotate");
    App.refresh();
  });

  /* ---- 확인 질문에서 답이 있는 자리로 ----

     그 칸을 열고 거기로 데려간다. 열기만 하면 어디로 왔는지 모르므로 도착한 자리의
     이름을 잠깐 물들인다. 그 이름이 방금 누른 단추에 적혀 있던 말이라 둘이 이어진다.
     같은 칸을 다시 누를 수 있으니 앞 타이머를 지우고 시작한다 —
     안 지우면 먼저 걸린 타이머가 두 번째 착지 도중에 표시를 꺼버린다.

     화면은 통째로 다시 그려지므로 단추마다 리스너를 달지 않는다.
     다시 그릴 때마다 리스너도 같이 사라지고, 새 단추에는 아무것도 안 붙는다. */
  var LAND_MS = 1600;

  function land(target) {
    if (target.tagName === "DETAILS") target.open = true;
    clearTimeout(target.__land);
    target.classList.add("is-landed");
    target.__land = setTimeout(function () {
      target.classList.remove("is-landed");
    }, LAND_MS);
    /* 동작 축소를 켠 사람에게는 미끄러지지 않고 바로 옮긴다.
       CSS 의 전역 규칙(app.css scroll-behavior:auto)은 CSS 로 굴리는 스크롤만
       덮고, 스크립트가 behavior:"smooth" 로 시키면 그건 그대로 미끄러진다.
       앱의 다른 스크롤 두 곳(quiz-screens revealFeedback)은 이미 물어보고 있다. */
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".selfcheck__jump");
    if (!btn) return;
    var target = document.getElementById(btn.dataset.jump);
    if (target) land(target);
  });

  /* ---- 본문 안 [[링크]] ----

     선행 용어에 막힌 사람을 구할 장치가 화면 맨 아래 관련 용어뿐이었다.
     관련 용어에 안 오른 이름도 본문에는 나오므로, 갈 수 있는지는 Store 조회 하나로 정한다.
     못 찾으면 페이지를 옮기지 않는다 — 없는 주소로 보내면 "찾을 수 없다" 화면에서
     읽던 자리를 잃는다. */
  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".xref");
    if (!btn) return;
    var found = termByName(btn.dataset.term);
    if (!found) {
      UI.toast("아직 단어장에 없는 단어입니다");
      return;
    }
    // 본문 안에서 건너뛰는 것도 옆걸음이다. 위 go-term 주석 참고.
    App.navigateLateral("/term/" + found.id);
  });

  /* @ 난간이 마지막 마디의 원 중심에서 끝나게 한다.
     끝까지 내려오면 그림 바닥으로 삐져나가 길이 이어지는 것처럼 보인다.
     21 = 위 여백 8 + 원 반지름 13. 실측이라 글자 크기가 바뀌면 다시 재야 한다. */
  function fitLoopRails() {
    Array.prototype.forEach.call(document.querySelectorAll(".dia__steps--loop"), function (list) {
      var last = list.querySelector(".dia__loop");
      if (!last) return;
      /* 접힌 칸 안은 레이아웃이 없어 높이가 전부 0 으로 나온다. 그 값을 쓰면
         0px 가 인라인으로 박혀 CSS 기본값을 이기고, 재지 않는 것보다 나빠진다.
         못 잴 때는 손대지 않고 기본값에 맡긴다. */
      if (!list.clientHeight) return;
      var gap = list.clientHeight - last.offsetTop - 21;
      list.style.setProperty("--loop-gap", Math.max(gap, 0) + "px");
    });
  }

  /* ---- 읽기 장치 붙이기 ----

     화면은 문자열로 만들어지므로 점선 밑줄과 단계 보기는 DOM 이 선 다음에
     붙는다. js/reading.js 가 없어도 앱은 그대로 읽힌다 — 그래서 있는지
     확인하고 부른다. 순서: 장치를 먼저 붙이고 난간을 잰다.
     풀이 카드가 그림 높이를 바꾸므로 잰 값이 먼저면 어긋난다. */
  document.addEventListener("screen:rendered", function (event) {
    if (!window.Reading) return;
    var path = event.detail && event.detail.path;
    if (!path || path.indexOf("/term/") !== 0) return;
    var root = document.querySelector(".detail");
    var term = Store.termById(path.slice("/term/".length));
    if (root && term) window.Reading.enhance(root, term);
  });

  document.addEventListener("screen:rendered", fitLoopRails);
  /* 풀이 카드가 열리고 닫힐 때마다 그림 높이가 바뀐다. @ 난간은 실측값이라
     그때 다시 재야 한다. */
  document.addEventListener("dia:changed", fitLoopRails);
  window.addEventListener("resize", fitLoopRails);
  /* 접이식이 열리는 순간이 처음으로 잴 수 있게 되는 순간이다.
     details 의 toggle 은 버블하지 않으므로 캡처 단계에서 받는다. */
  document.addEventListener("toggle", fitLoopRails, true);

  /* 폰트가 늦게 오면 줄 높이가 바뀐다. 난간은 실측값이라 그때 다시 맞춰야 한다. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitLoopRails);
  }

  /* 읽기 진행 표시. 스크롤 이벤트 대신 IntersectionObserver 를 쓰고 싶지만
     연속 값이 필요하므로 rAF 로 눌러서 프레임당 한 번만 계산한다. */
  var rafPending = false;

  function updateReadProgress() {
    var fill = document.getElementById("read-fill");
    if (!fill) return;
    var max = document.body.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
    fill.style.width = pct + "%";
  }

  /* 아래 버튼 바 감추기.

     내려 읽으면 비켜주고 올리면 돌아온다. 방향만 보고 판단하되 두 군데서는
     방향을 무시하고 무조건 보여준다 — 맨 위(아직 안 읽었다)와 맨 아래
     (다 읽었으니 지금이 누를 때다). 바닥에서 감춰버리면 다 읽고 나서
     버튼을 찾으려고 위로 올려야 하는 이상한 일이 생긴다.

     THRESHOLD 는 손가락 떨림으로 바가 깜빡이는 것을 막는다. iOS 의 고무줄
     스크롤은 scrollY 를 음수나 최대치 너머로 보내므로 비교 전에 가둔다. */
  var THRESHOLD = 10;
  var BOTTOM_ZONE = 120;
  var lastY = 0;

  function updateActionBar() {
    var bar = document.querySelector(".action-bar");
    if (!bar) return;

    var max = Math.max(0, document.body.scrollHeight - window.innerHeight);
    var y = Math.min(Math.max(window.scrollY, 0), max);
    var moved = y - lastY;

    if (y <= 8 || y >= max - BOTTOM_ZONE) {
      bar.classList.remove("action-bar--tucked");
    } else if (Math.abs(moved) > THRESHOLD) {
      bar.classList.toggle("action-bar--tucked", moved > 0);
    }
    if (Math.abs(moved) > THRESHOLD) lastY = y;
  }

  /* 화면이 바뀌면 바는 새로 그려진다. 이전 화면에서 감춰둔 상태가 남아 있으면
     새 단어를 열자마자 버튼이 없다. 매번 처음부터 시작한다. */
  document.addEventListener("screen:rendered", function () {
    lastY = window.scrollY;
    var bar = document.querySelector(".action-bar");
    if (!bar) return;
    bar.classList.add("action-bar--instant");
    bar.classList.remove("action-bar--tucked");
    requestAnimationFrame(function () { bar.classList.remove("action-bar--instant"); });
  });

  window.addEventListener("scroll", function () {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      updateReadProgress();
      updateActionBar();
      var bar = document.querySelector(".topbar");
      if (bar) bar.classList.toggle("topbar--bordered", window.scrollY > 8);
    });
  }, { passive: true });

  /* ---------------------------------------------------------- 진도
     게임처럼 보이지 않게 한다. 불꽃도 배지도 레벨도 없다.
     숫자와 막대만으로 "어디까지 왔는지"를 말한다. */

  function statTile(value, label, iconName, tone) {
    return '<div class="stat"><div class="stat__value num"' +
      (tone ? ' style="color:var(--st-' + tone + ')"' : "") + ">" + value + "</div>" +
      '<div class="stat__label">' + UI.icon(iconName, 14) + esc(label) + "</div></div>";
  }

  App.register("/progress", function () {
    /* 색인을 못 받으면 통계가 전부 0 이라 "아직 아무것도 안 했다" 로 읽힌다.
       실제로는 앱이 파일을 못 받은 것이고 기록은 그대로 있다. 홈·단어장과
       같은 말을 하고 같은 복구 단추를 준다. */
    if (!Store.books().length) {
      return topbar({ title: "진도", right: themeButton() }) + indexFailed();
    }
    var s = Store.overallStats();
    var streak = Store.streak();
    /* 데이터를 인덱스와 본문으로 가를 때 window.VOCABULARY_DATA 가 없어졌는데
       여기만 남아 있었다. 늘 빈 배열이라 "단어장별 진행률" 이 제목만 뜨고
       아래가 통째로 비어 있었다. 전역을 직접 읽지 말고 Store 를 거친다. */
    var books = Store.books();
    var history = Store.history(8);

    // 읽기 시작도 기록에 남는다. 빠뜨리면 화면에 영문 키가 그대로 나온다.
    var ACTION_COPY = {
      reading: "읽기 시작",
      learned: "학습 완료",
      passed: "퀴즈 통과",
      review: "복습 표시",
    };

    return topbar({ title: "진도", right: themeButton() }) +
      '<main class="screen">' +
      /* 가장 큰 숫자 자리에 "전체 단어 36"이 있었다. 그건 내 성취가 아니라
         단어장의 크기다. 내가 한 일을 앞에 두고, 전체는 그 기준으로 뒤에 둔다. */
      '<div class="summary-grid" style="margin-top:8px">' +
      /* 여기만 everPassed 다. 이 자리는 "내가 해 둔 일" 을 세는 자리라
         복습이 돌아왔다고 줄면 안 된다. 아래 단어장별 막대는 passed 를 그대로
         쓴다 — 그건 "지금 어디까지 갔나" 를 그리는 것이라 줄어야 맞다.

         이름도 "퀴즈 통과" 가 아니라 "통과해 본 단어" 다. "퀴즈 통과" 는 상태
         이름이고, 단어 목록의 거르개(FILTERS)와 배지가 그 이름으로 지금 통과 중인
         것만 보여준다. 같은 이름에 다른 숫자를 달면 눌러 보고 어긋난 것을 본다. */
      statTile(s.everPassed, "통과해 본 단어", "check-double", "passed") +
      statTile(s.studied, "공부한 단어", "book") +
      statTile(s.review, "복습 필요", "rotate", "review") +
      statTile(s.total, "전체 단어", "layers") +
      "</div>" +

      '<section class="block"><h2 class="section-title" style="margin-bottom:12px">최근 7일</h2>' +
      '<div class="streak"><div>' +
      '<div style="font-size:var(--fs-20);font-weight:700;letter-spacing:-0.02em" class="num">' +
      streak.count + "일 연속</div>" +
      '<div class="meta">매일 조금씩이 오래 갑니다</div></div>' +
      '<div class="streak__days" role="img" aria-label="최근 7일 학습 여부">' +
      streak.week.map(function (d) {
        return '<span class="streak__day' + (d.on ? " streak__day--on" : "") +
          (d.today ? " streak__day--today" : "") + '"></span>';
      }).join("") + "</div></div></section>" +

      '<section class="block"><h2 class="section-title" style="margin-bottom:12px">단어장별 진행률</h2>' +
      /* 라벨은 "17%" 하나였는데 막대는 통과·학습·읽는 중을 쌓아서 그린다.
         그래서 막대가 절반쯤 차 있는데 옆에는 17% 라고 적혀 있었다.
         숫자가 무엇을 세는지 이름을 붙이고, 나머지 칸이 무엇인지는 범례로 밝힌다. */
      '<div class="stack">' + books.map(function (b) {
        var st = Store.bookStats(b);
        return '<button class="book" data-action="go" data-to="/books/' + esc(b.id) + '">' +
          '<div class="book__top"><div class="book__name" style="font-size:15px">' + esc(b.name) + "</div>" +
          '<div class="book__count num">통과 ' + st.done + " / " + st.total + "</div></div>" +
          '<div class="book__bar">' + stackedBar(st) + "</div>" +
          bookLegend(st) + "</button>";
      }).join("") + "</div></section>" +

      '<section class="block"><h2 class="section-title" style="margin-bottom:4px">학습 기록</h2>' +
      (history.length
        ? '<div>' + history.map(function (h) {
            return '<div class="history-row">' + statusDot(h.action) +
              "<span>" + esc(h.term) + "</span>" +
              '<span class="meta" style="font-size:12px">' + esc(ACTION_COPY[h.action] || h.action) + "</span>" +
              '<span class="history-row__when">' + esc(relativeTime(h.at)) + "</span></div>";
          }).join("") + "</div>"
        : emptyState("inbox", "아직 기록이 없습니다", "단어를 하나 읽으면 여기에 남습니다.")) +
      "</section>" +

      /* 진도는 보고서로 끝나면 막다른 길이다. 여기까지 스크롤한 사람은
         대개 "그래서 지금 뭘 하지"를 확인하러 온 것이므로 길을 하나 열어둔다. */
      nextStepBlock() +

      '<div style="margin-top:40px;text-align:center">' +
      '<button class="link-btn" data-action="reset-progress">데이터 초기화</button></div>' +
      "</main>";
  });

  function nextStepBlock() {
    var step = nextStep();
    if (!step) return "";
    return '<section class="block">' +
      '<h2 class="section-title" style="margin-bottom:8px">이어서 할 일</h2>' +
      '<div class="today" style="overflow:hidden">' + step + "</div></section>";
  }

  /* 초기화는 되돌릴 수 없다. 읽은 것 · 퀴즈 통과 · 복습 일정 · 학습 기록이
     한 번에 사라지고 돌려놓을 방법이 없다. 그런 단추가 한 번 눌러 끝나면 안 된다.

     브라우저 기본 confirm() 을 쓰지 않는다. 저건 앱 밖에서 뜨는 회색 상자라
     지금까지 만든 화면과 아무 관계가 없어 보이고, 무엇이 지워지는지 적을 자리도 없다.
     대신 무엇이 사라지는지를 숫자로 보여주고 고르게 한다.

     상자는 화면 문자열에 끼우지 않고 document.body 에 직접 붙인다. 두 가지 때문이다.

     하나, App.render() 로 열면 그때마다 화면 전체가 다시 그려진다. 그러면
     .screen-enter 가 다시 걸려 본문이 12px 옆에서 들어오고, 스크롤이 맨 위로 튄다
     (초기화 단추는 화면 맨 아래에 있어서 누른 자리가 통째로 사라진다).

     둘, 그 애니메이션이 도는 동안 main 에 transform 이 걸린다. transform 이 걸린
     요소는 그 안의 position: fixed 자식의 기준점이 되므로, 상자가 뷰포트 한가운데가
     아니라 main 안쪽 어딘가에 놓인다. 실측으로 화면 밖 1129px 자리에 그려졌다.
     css/app.css 의 화면 전환 주석이 .action-bar 에서 같은 일을 겪었다고 적어 둔
     바로 그 함정이다. body 에 붙이면 둘 다 애초에 생기지 않는다. */

  var resetBox = null;

  function closeReset() {
    if (!resetBox) return;
    resetBox.remove();
    resetBox = null;
  }

  function resetModalHtml() {
    var stats = Store.overallStats();
    var rows = [
      // 지우면 통과 기록이 통째로 사라진다. 지금 상태가 아니라 쌓인 것을 센다.
      { label: "통과해 본 단어", n: stats.everPassed },
      { label: "공부한 단어", n: stats.studied },
      { label: "복습 대기", n: stats.review },
      { label: "학습 기록", n: Store.history(999).length },
    ].filter(function (r) { return r.n; });

    /* 상자에도 data-action 을 단다. 위임이 event.target.closest("[data-action]") 로
       올라가기 때문에, 이게 없으면 상자 안의 글자를 눌러도 바깥의 reset-cancel 이
       걸려 상자가 닫힌다. 등록되지 않은 이름은 App.handleClick 이 조용히 넘긴다. */
    return '<div class="modal__box" data-action="modal-keep" role="dialog" aria-modal="true" aria-labelledby="reset-title">' +
      '<h2 class="modal__title" id="reset-title">기록을 전부 지울까요</h2>' +
      '<p class="modal__body">지우면 되돌릴 수 없습니다. 단어 자체는 그대로 있고, ' +
      "어디까지 공부했는지만 사라집니다.</p>" +
      (rows.length
        ? '<ul class="modal__list">' + rows.map(function (r) {
            return "<li><span>" + esc(r.label) + '</span><span class="num">' + r.n + "</span></li>";
          }).join("") + "</ul>"
        : '<p class="modal__body">지울 기록이 아직 없습니다.</p>') +
      '<div class="modal__actions">' +
      '<button class="btn btn--secondary" data-action="reset-cancel">그대로 두기</button>' +
      '<button class="btn btn--danger" data-action="reset-confirm">전부 지우기</button>' +
      "</div></div>";
  }

  App.on("reset-progress", function () {
    closeReset();
    resetBox = document.createElement("div");
    resetBox.className = "modal";
    resetBox.dataset.action = "reset-cancel"; // 바깥을 눌러도 닫힌다
    resetBox.innerHTML = resetModalHtml(); // security-ok: OWASP-A03-4 — 라벨은 이 파일 안의 상수, 숫자는 Store 가 센 정수다
    document.body.appendChild(resetBox);
    var first = resetBox.querySelector(".btn--secondary");
    if (first) first.focus();
  });

  App.on("reset-cancel", closeReset);

  /* 지우고 나서도 있던 자리는 진도 화면 그대로다. 초기화 단추는 화면 맨 아래에
     있어서, 화면 전환으로 다시 그리면 누른 자리가 통째로 사라지고 맨 위로 튄다.
     숫자만 0 으로 바뀌면 되는 일이다. */
  App.on("reset-confirm", function () {
    closeReset();
    Store.reset();
    UI.toast("전부 지웠습니다", "rotate");
    App.refresh();
  });

  // Esc 로도 닫는다. 상자를 띄워놓고 빠져나갈 길이 하나뿐이면 안 된다.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeReset();
  });

  /* 화면을 옮기면 열어둔 것을 닫는다. body 에 붙어 있어서 저절로 사라지지 않는다.

     여기 한 줄이 더 있었다 — 단추를 두 번 눌러 지우던 시절의 disarmReset() 을
     부르는 줄이다. 초기화가 모달로 바뀌면서 그 함수는 사라졌는데 부르는 쪽이
     남아, **화면을 옮길 때마다** ReferenceError 가 났다. 화면은 이미 그려진
     뒤라 눈에 띄는 고장이 없어서 아무도 못 봤다. 무장 해제할 상태가 이제 없고,
     닫을 것은 위 한 줄이 닫는다. */
  document.addEventListener("screen:rendered", closeReset);

  // 다른 화면에서 쓰는 조각들을 공개한다
  window.Parts = {
    topbar: topbar,
    themeButton: themeButton,
    badge: badge,
    statusDot: statusDot,
    progressBar: progressBar,
    emptyState: emptyState,
    relativeTime: relativeTime,
    /* 색인을 못 받았을 때 쓰는 화면. 홈·단어장은 이미 이걸 쓰는데
       퀴즈만 제 손으로 빈 화면을 만들고 있었다. 같은 사고에 앱이 두 가지
       말을 하면 안 된다. */
    indexFailed: indexFailed,
  };
})();
