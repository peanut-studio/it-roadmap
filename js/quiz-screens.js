/* ============================================================
   퀴즈 화면 — 범위 고르기, 문제 풀기, 결과

   단어를 읽었다고 이해한 것은 아니다. 그래서 퀴즈는 부가 기능이 아니라
   학습 루프를 닫는 자리다. 읽기 -> 학습 완료 -> 퀴즈 -> 복습.
   ============================================================ */

(function () {
  "use strict";

  var UI = window.UI;
  var Store = window.Store;
  var App = window.App;
  var Parts = window.Parts;
  var esc = UI.esc;

  /* 진행 중인 퀴즈 한 판.

     저장소에 얹혀 있어서 앱을 껐다 켜도 이어서 푼다. 스무 문제는 7~10분이라
     그 사이 화면이 잠기거나 다른 앱을 보다 오면 탭이 회수되는데, 예전에는
     그때 푼 것이 통째로 사라졌다. 하루가 지난 판은 Store 가 알아서 버린다. */
  var session = Store.loadQuiz();

  function startSession(questions, scopeLabel, fromTermId) {
    if (!questions.length) {
      UI.toast("출제할 단어가 아직 부족합니다", "inbox");
      return;
    }
    /* 새 판을 열기 전에 풀던 판을 닫는다. 이 저장소의 원칙이 "그만둔 판도 푼
       만큼은 성적이다" 이므로(settle 주석), 다른 범위를 골랐다는 이유로 이미
       답한 것을 버릴 이유가 없다. settle 은 한 판에 한 번만 듣는다. */
    settle();
    session = {
      questions: questions,
      scopeLabel: scopeLabel,
      /* 어느 단어를 읽다가 들어왔나. 상세 화면의 "퀴즈로 확인하기" 로 시작한 판은
         결과에서 읽던 자리로 돌아갈 길이 있어야 한다. 그 자리를 적어두는 칸이다. */
      fromTermId: fromTermId || null,
      index: 0,
      correct: 0,
      answers: [],
      picked: null,
      /* 이 판의 성적을 Store 에 반영했나. 결과 화면은 뒤로 왔다 갔다 하면서
         여러 번 그려지는데, 그때마다 상자가 또 움직이면 안 된다. */
      settled: false,
    };
    Store.saveQuiz(session);
    App.navigate("/quiz/run");
  }

  /* ---------------------------------------------------------- 본문 미리 받기

     새 유형이 쓰는 재료(흔한 오해 · 실제 사례 · 대표 도해 · 비유)는 인덱스가 아니라
     본문(data/terms/<권>.js)에 실린다. js/quiz.js 는 본문이 없으면 그 유형을 조용히
     건너뛰므로, 본문을 안 받아두면 화면은 "30문제" 라 적어 놓고 12문제를 내게 된다.
     세는 쪽과 내는 쪽이 같은 재료를 봐야 그 어긋남이 없다. 받아두는 일은 화면 몫이다 —
     build() 를 기다리게 만들면 문제 만들기가 비동기가 되고 계약이 통째로 바뀐다.

     서비스워커가 설치할 때 12권을 이미 받아 두므로 대개 디스크에서 바로 온다. */

  function loadBooks(ids, done) {
    if (!ids.length) { done(); return; }
    var left = ids.length;
    ids.forEach(function (id) {
      // 실패해도 콜백은 온다(Store 가 실패를 기억한다). 못 받은 권은 유형이 줄어든 채로 낸다.
      Store.loadBody(id, function () {
        left--;
        if (left === 0) done();
      });
    });
  }

  /* 지금 본문을 받는 중인가. 범위 화면이 숫자를 확정해서 적어도 되는지를 가른다.
     받는 동안에도 셀 수는 있지만 그 수는 곧 뒤집힌다 — 실측으로 네트워크 228 -> 821,
     컴퓨터과학 123 -> 437 로 3~4배 뛴다. 중간값을 확정된 것처럼 적어두면
     화면이 잠시 뒤에 스스로 뒤집을 말을 하는 셈이다. */
  var warming = false;

  /* 범위 화면에 들어오면 12권을 통째로 받아둔다. 여기서 세는 숫자가 12권 전부에
     걸쳐 있기 때문이다(복습 · 학습 완료는 권을 가리지 않는다).

     받을 게 없으면 아무것도 부르지 않고 돌아간다. 여기서 done 을 부르면 다시 그리기가
     또 이 함수를 부르고 그게 또 다시 그리기를 불러서 스택이 넘친다. 실제로 넘겨봤다.
     한 바퀴 돌고 나면 받은 권과 실패한 권만 남으므로 missing 이 비어 고리도 끝난다. */
  function warmBodies(done) {
    var missing = Store.books().filter(function (b) {
      return !Store.hasBody(b.id) && !Store.bodyFailed(b.id);
    });
    warming = missing.length > 0;
    if (!missing.length) return;

    loadBooks(missing.map(function (b) { return b.id; }), function () {
      warming = false;
      done();
    });
  }

  /* 못 받은 권. 실패는 앱이 살아 있는 내내 남으므로(Store 의 failed) 한 번 끊기면
     그 뒤로는 계속 문제가 줄어든 채로 나온다 — 실측으로 보안 902->252, 인프라 854->240,
     프로젝트 305->84. 화면이 그걸 말하지 않으면 사용자는 원래 그만큼인 줄 안다. */
  function failedBooks() {
    return Store.books().filter(function (b) { return Store.bodyFailed(b.id); });
  }

  /* 실패 기록만 지우고 다시 그린다. 실제로 받는 일은 warmBodies 가 한다 —
     받는 자리를 둘로 두면 "불러오는 중" 표시와 실제 진행이 어긋난다. */
  App.on("retry-bodies", function () {
    failedBooks().forEach(function (b) { Store.loadBody(b.id, null, true); });
    App.refresh();
  });

  /* 한 판을 시작하기 전에는 그 범위가 걸친 권만 받는다. 홈의 복습 알림처럼
     범위 화면을 거치지 않고 바로 들어오는 길이 있어서, 여기서 한 번 더 확인한다. */
  function withBodies(targets, done) {
    var need = [];
    targets.forEach(function (t) {
      if (!Store.hasBody(t.bookId) && need.indexOf(t.bookId) === -1) need.push(t.bookId);
    });
    loadBooks(need, done);
  }

  /* ---------------------------------------------------------- 한 판 길이

     상한을 두지 않았었다. "그만두면 그 자리까지가 한 판" 이라는 생각이었는데,
     그러려면 그만두기가 멀쩡한 출구여야 한다. 실제로는 ✕ 가 푼 것을 지우고 있었고
     (아래 quit-quiz), 재고를 세어보니 권 하나가 305~902문제였다 —
     보안 902 · 인프라 854 · 네트워크 821 … 프로젝트 305. 끝이 없는 판이었다.

     20문제로 끊는다. 한 문제에 20~30초니 7~10분, 앉은자리에서 닫히는 길이다.
     상자는 판이 끝날 때 단어마다 한 번씩 움직이므로(settle), 판이 닫혀야 복습
     일정도 잡힌다. 900문제짜리 판은 그 일정을 영영 안 만든다.

     재고와 판 길이는 다른 값이다. 재고는 "이 범위에 문제가 몇 개 있나" 이고,
     화면에는 둘 다 적는다. 902문제라고만 적어 놓고 20문제를 내면 그게 예전의
     "30문제라 적고 12문제를 내던" 어긋남과 같은 거짓말이 된다. */
  var SESSION_MAX = 20;

  /* 홈 화면도 이 길이를 적는다(js/screens.js 의 sessionMax). 그쪽이 제 숫자를
     따로 들고 있으면 여기서 20을 고치는 날 홈만 옛 숫자를 광고하게 된다 —
     두 문이 같은 판을 두 가지로 말하던 그 병이 그대로 돌아온다.
     그래서 값이 사는 곳을 한 군데로 두고 여기서 내보낸다. */
  window.QuizScreens = window.QuizScreens || {};
  window.QuizScreens.SESSION_MAX = SESSION_MAX;

  // 재고를 셀 때만 쓴다. countQuestions 는 재고보다 큰 상한을 주면 전부 센다.
  var NO_LIMIT = 100000;

  /* 카드에 적히는 길이. 재고가 상한보다 크면 둘을 같이 적는다 —
     앞의 수는 지금 누르면 벌어지는 일이고, 뒤의 수는 이 범위가 얼마나 큰가다. */
  function runLabel(run, stock) {
    return stock > run ? run + "문제 · 전체 " + stock + "문제 중" : run + "문제";
  }

  /* 범위마다 재고와 이번 판 길이를 미리 센다. 눌러보고 나서야 몇 문제짜리인지
     알게 되면 안 된다. 재고는 권마다 305~902문제로 크게 다르고, 그 차이가
     어느 단어장을 고를지 정하는 정보가 된다. */
  function scopeOptions() {
    var pool = Store.allTerms();
    var review = Store.reviewQueue();
    var learned = pool.filter(function (t) {
      var s = Store.statusOf(t.id);
      return s === Store.STATUS.LEARNED || s === Store.STATUS.PASSED;
    });

    /* 이 범위에 필요한 권이 다 왔는가. 예전에는 전역 warming 하나로 판정해서
       열두 권 중 가장 느린 한 권이 화면의 카드 열넷을 통째로 잠갔다.
       기다릴 이유가 있는 것은 그 범위에 걸린 권뿐이다 — 시작하는 쪽에는
       이미 withBodies 가 필요한 권만 기다리는 장치가 있다. */
    var scopeWaiting = function (targets) {
      var books = {};
      (targets || []).forEach(function (t) { books[t.bookId] = true; });
      return Object.keys(books).some(function (id) {
        return !Store.hasBody(id) && !Store.bodyFailed(id);
      });
    };

    var entry = function (key, name, icon, targets, emptyNote) {
      // 재고는 상한 없이 세고, 이번 판은 상한에서 끊는다. 화면이 코드가 하지 않는
      // 말을 하지 않게 하려면 눌렀을 때 나오는 수(run)가 카드에 적혀 있어야 한다.
      var stock = window.Quiz.countQuestions(targets, pool, NO_LIMIT);
      var run = Math.min(stock, SESSION_MAX);
      /* 복습·학습 완료는 대상이 비어 있어도 "권을 안 가린다" 는 뜻이 아니라
         정말로 셀 것이 없다는 뜻이다. 그때까지 기다릴 이유는 없다. */
      var waiting = targets && targets.length ? scopeWaiting(targets) : warming;
      return {
        key: key,
        name: name,
        icon: icon,
        stock: stock,
        run: run,
        // 본문이 오는 중이면 숫자를 적지 않는다. 곧 뒤집힐 수다.
        ready: !waiting && stock > 0,
        meta: waiting ? "내용을 불러오는 중…" : stock ? runLabel(run, stock) : emptyNote,
        short: waiting ? "…" : stock ? run + "문제 · 총 " + stock : "—",
      };
    };

    var list = [
      entry("review", "복습이 필요한 단어", "rotate", review, "지금은 없습니다"),
      entry("learned", "학습 완료한 단어", "check", learned, "먼저 단어를 읽어주세요"),
    ];

    Store.books().forEach(function (b) {
      var targets = pool.filter(function (t) { return t.bookId === b.id; });
      list.push(entry("book:" + b.id, b.name, "book", targets, "출제할 단어 없음"));
    });

    return list;
  }

  /* 다 받기 전에는 누를 수 없게 둔다. 눌러도 되긴 하지만(withBodies 가 기다린다)
     그 사이 화면이 아무 말도 안 해서 먹통으로 보인다. 못 누르는 이유를 적는 편이 낫다. */
  function scopeCard(o) {
    return '<button class="scope" data-action="start-scope" data-key="' + esc(o.key) + '"' +
      (o.ready ? "" : " disabled") + ">" +
      UI.icon(o.icon, 20) +
      '<span class="scope__body">' +
      '<span class="scope__name">' + esc(o.name) + "</span>" +
      '<span class="scope__meta">' + esc(o.meta) + "</span></span>" +
      '<span class="scope__check">' + UI.icon("right", 18) + "</span></button>";
  }

  function scopeRow(o) {
    return '<button class="scope-row" data-action="start-scope" data-key="' + esc(o.key) + '"' +
      // .scope 와 달리 이 줄에는 :disabled 모양이 CSS 에 없다. 못 누르는 줄이
      // 멀쩡해 보이면 눌러보고 나서야 알게 되므로, 카드와 같은 흐림을 여기서 준다.
      (o.ready ? "" : ' disabled style="opacity:.45"') + ">" +
      '<span class="scope-row__name">' + esc(o.name) + "</span>" +
      '<span class="scope-row__count num">' + esc(o.short) + "</span>" +
      '<span class="row__chevron">' + UI.icon("right", 16) + "</span></button>";
  }

  App.register("/quiz", function () {
    /* 색인이 없으면 범위 카드가 전부 "지금은 없습니다" 로 떠서, 파일을 못 받은
       것을 "네가 아직 안 읽었다" 로 말하게 된다. 홈·단어장·진도와 같은 화면을 쓴다. */
    if (!Store.books().length) {
      return Parts.topbar({ title: "퀴즈", right: Parts.themeButton() }) + Parts.indexFailed();
    }

    /* 본문이 도착하면 문항 수를 다시 센다. 다시 그리는 건 한 번뿐이다 —
       두 번째부터는 받을 게 없어서 여기서 그냥 돌아간다.
       보던 자리는 refresh 가 지켜준다. 숫자가 바뀌었다고 목록이 맨 위로 튀면 안 된다. */
    warmBodies(function () {
      if (App.currentPath() !== "/quiz") return;
      App.refresh();
    });

    var stuck = failedBooks().length;
    var all = scopeOptions();
    // 상태로 고르는 두 가지가 대부분의 경우 정답이므로 앞에 크게 둔다.
    // 단어장 목록은 그 다음이라 가벼운 줄로 내린다.
    // 같은 크기 카드를 여덟 개 늘어놓으면 무엇을 먼저 눌러야 할지 알 수 없다.
    var suggested = all.slice(0, 2);
    var books = all.slice(2);

    return Parts.topbar({ title: "퀴즈", right: Parts.themeButton() }) +
      '<main class="screen"><div class="quiz-intro">' +
      '<h1 class="screen-title">무엇을 확인할까요</h1>' +
      '<p class="quiz-intro__lead">뜻을 외웠는지가 아니라 개념을 구분할 수 있는지 묻습니다. ' +
      "선택지는 같은 분야에서 뽑기 때문에 대충 찍기는 어렵습니다.</p>" +

      /* 세는 중이라는 말과 못 받았다는 말은 같이 낼 일이 없다 — 받는 중에는
         아직 실패가 아니고, 다 받고 나서야 못 받은 권이 확정된다. */
      (warming
        ? '<p class="meta" role="status" style="margin-top:16px">단어장 내용을 불러오는 중입니다. ' +
          "다 받은 뒤에 문제 수를 알려드립니다.</p>"
        : stuck
          ? '<p class="meta" role="status" style="margin-top:16px">단어장 ' + stuck +
            "권의 내용을 못 받아 낼 수 있는 문제가 줄었습니다. " +
            '<button class="link-btn" data-action="retry-bodies">다시 시도</button></p>'
          : "") +

      /* 풀다 만 판이 있으면 그 손잡이를 맨 앞에 준다. 없으면 저장해 둔
         뜻이 없다 — 여기서 새 범위를 고르는 순간 아까 풀던 판을 덮어쓴다. */
      resumeCall() +

      '<div class="stack" style="margin-top:28px">' + suggested.map(scopeCard).join("") + "</div>" +
      '<section class="block"><h2 class="section-title" style="margin-bottom:4px">단어장에서 고르기</h2>' +
      '<div class="scope-rows">' + books.map(scopeRow).join("") + "</div></section>" +
      "</div></main>";
  });


  /* 풀다 만 판을 이어 푸는 손잡이. 몇 문제를 풀었고 몇 개가 남았는지를
     같이 적는다 — "이어서 풀기" 만으로는 다시 들어갈 만한지 알 수 없다. */
  function resumeCall() {
    if (!session || session.settled || !session.answers.length) return "";
    var left = session.questions.length - session.index;
    if (left <= 0) return "";
    return '<button class="review-call" data-action="resume-quiz" style="margin-top:24px">' +
      '<span class="review-call__icon">' + UI.icon("rotate", 22) + "</span>" +
      '<span style="flex:1;min-width:0">' +
      '<span class="review-call__title">풀던 판이 남아 있습니다 · ' + left + "문제</span>" +
      '<span class="review-call__sub">' + esc(session.scopeLabel || "퀴즈") + " · " +
      session.answers.length + "문제까지 풀었습니다</span></span>" +
      UI.icon("right", 18) + "</button>";
  }

  App.on("resume-quiz", function () {
    if (!session) return;
    App.navigate("/quiz/run");
  });

  App.on("start-scope", function (data) {
    var pool = Store.allTerms();
    var targets;
    var label;

    if (data.key === "review") {
      targets = Store.reviewQueue();
      label = "복습";
    } else if (data.key === "learned") {
      targets = pool.filter(function (t) {
        var s = Store.statusOf(t.id);
        return s === Store.STATUS.LEARNED || s === Store.STATUS.PASSED;
      });
      label = "학습 완료한 단어";
    } else {
      var bookId = data.key.replace("book:", "");
      var book = Store.bookById(bookId);
      targets = pool.filter(function (t) { return t.bookId === bookId; });
      label = book ? book.name : "단어장";
    }

    withBodies(targets, function () {
      startSession(window.Quiz.build(targets, pool, SESSION_MAX), label);
    });
  });

  // 홈의 복습 알림에서 바로 들어오는 길
  App.on("start-review", function () {
    var pool = Store.allTerms();
    var targets = Store.reviewQueue();
    withBodies(targets, function () {
      startSession(window.Quiz.build(targets, pool, SESSION_MAX), "복습");
    });
  });

  // 단어 상세에서 그 단어 하나만 확인하고 싶을 때
  App.on("quiz-one", function (data) {
    var pool = Store.allTerms();
    var term = Store.termById(data.id);
    if (!term) return;
    /* 여기서는 길이를 따르지 않는다. 읽던 단어 하나를 짚고 넘어가는 자리라
       스무 문제가 나오면 읽기가 끊긴다. 한 판은 범위 화면에서 시작한다.
       대신 어디서 왔는지를 적어 둔다 — 결과에서 읽던 자리로 돌려보내야 한다. */
    withBodies([term], function () {
      startSession(window.Quiz.build([term], pool, 1), term.term, term.id);
    });
  });

  /* ---------------------------------------------------------- 문제 풀기 */

  var UNSURE = "__unsure__";

  function renderOptions(question, picked) {
    var keys = ["A", "B", "C", "D"];

    return question.options.map(function (opt, i) {
      var cls = "option";
      var mark = "";

      if (picked) {
        // 답을 고른 뒤에는 정답을 항상 같이 보여준다.
        // 틀렸을 때 뭐가 맞는지 모르면 배우지 못한다.
        if (opt.correct) {
          cls += " option--correct";
          mark = UI.icon("check", 20, "option__mark");
        } else if (opt.id === picked) {
          cls += " option--wrong";
          mark = UI.icon("close", 20, "option__mark");
        } else {
          cls += " option--muted";
        }
      }

      // --i 는 물러나는 순서를 매기는 데 쓴다
      return '<button class="' + cls + '" style="--i:' + i + '" data-action="answer" data-id="' +
        esc(opt.id) + '"' + (picked ? " disabled" : "") + ">" +
        // 계약은 보기 넷이지만 그 약속은 이 파일 밖에서 지켜진다.
        // 다섯 번째가 오면 글자 자리에 undefined 가 찍히므로 숫자로 받아둔다.
        '<span class="option__key">' + (keys[i] || i + 1) + "</span>" +
        '<span class="option__text">' + esc(opt.text) + "</span>" +
        (mark || '<span class="option__mark"></span>') + "</button>";
    }).join("");
  }

  /* 유형마다 "고른 것" 의 정체가 다르다. 용어 이름을 고른 문제에서는 "고른 답" 이면
     충분하지만, 보기가 문장인 문제에서는 그 문장이 무엇이었는지를 말해줘야 한다.
     여기 없는 유형은 마지막 줄로 떨어진다 — 유형이 늘어도 이 화면은 깨지지 않는다.

     조사 병기("은(는)")를 만들지 않는 문장으로 쓴다. 영문 용어 뒤에 붙는 조사는
     한글 읽기의 받침을 알아야 정해지는데, 그 정보가 노트에 없다. */
  function contrastLead(kind, name) {
    var K = window.Quiz.KINDS;
    if (kind === K.DEFINE) return "고른 설명은 " + name + "의 것입니다";
    if (kind === K.MYTH_PICK) return "고른 문장은 " + name + " 쪽 이야기입니다";
    return "고른 답: " + name;
  }

  /* 틀렸을 때 정답 설명만 다시 보여주는 건 도움이 안 된다 —
     방금 지문에서 읽은 문장을 한 번 더 읽게 될 뿐이다.
     배우는 지점은 "내가 고른 게 사실은 무엇이었나"에 있다.
     보기마다 출처 단어를 달아둔 이유가 이것이다. */
  function contrast(question, chosen) {
    if (!chosen || chosen.correct || !chosen.sourceId) return "";
    var source = Store.termById(chosen.sourceId);
    if (!source || source.id === question.termId) return "";

    var line = contrastLead(question.kind, source.term);

    return '<div class="feedback__contrast">' +
      '<p class="feedback__contrast-head">' + esc(line) + "</p>" +
      '<p class="feedback__contrast-body">' + esc(UI.plain(source.summary)) + "</p></div>";
  }

  var HEAD_COPY = {
    ok: { tone: "ok", icon: "check", text: "맞았습니다" },
    no: { tone: "no", icon: "close", text: "다시 볼 단어입니다" },
    unsure: { tone: "unsure", icon: "rotate", text: "모르는 게 확인됐습니다" },
  };

  function renderFeedback(question, picked) {
    var chosen = question.options.find(function (o) { return o.id === picked; });
    var right = chosen && chosen.correct;
    var isLast = session.index >= session.questions.length - 1;
    var head = HEAD_COPY[picked === UNSURE ? "unsure" : right ? "ok" : "no"];

    return '<div class="feedback" role="status">' +
      '<p class="feedback__head feedback__head--' + head.tone + '">' +
      UI.icon(head.icon, 20) + head.text + "</p>" +
      contrast(question, chosen) +
      '<div class="feedback__body">' + UI.markdown(question.explain) + "</div>" +
      '<div class="feedback__actions">' +
      // 아이콘만 있는 버튼은 무슨 일이 일어날지 알기 어렵다. 글자를 같이 둔다.
      '<button class="btn btn--secondary" data-action="open-term" data-id="' + esc(question.termId) + '">' +
      UI.icon("book", 18) + "다시 읽기</button>" +
      '<button class="btn btn--primary" data-action="next-question">' +
      (isLast ? "결과 보기" : "다음 문제") + UI.icon("forward", 18) + "</button>" +
      "</div></div>";
  }

  App.register("/quiz/run", function () {
    if (!session) {
      App.navigate("/quiz", true);
      return "";
    }
    /* 마지막 문제를 풀면 index 가 문제 수와 같아진 채로 결과 화면으로 넘어간다.
       거기서 뒤로가기를 누르면 이 자리로 돌아오는데, 그때 questions[index] 가
       undefined 라 아래에서 터진다. 예외가 나면 render 가 innerHTML 을 대입하지
       못해서 주소는 /quiz/run 인데 화면은 결과 화면인 채로 어긋난다.

       그만두고 나온 판도 같이 막는다. 그쪽은 남은 문제가 멀쩡히 떠 있어서 더 풀 수
       있는데, 성적은 이미 반영된 뒤라 거기서 푼 것은 아무 데도 안 남는다.
       판이 닫혔으면 결과가 그 판의 끝이다. */
    if (session.settled || session.index >= session.questions.length) {
      App.navigate("/quiz/result", true);
      return "";
    }

    var q = session.questions[session.index];
    var total = session.questions.length;
    var percent = Math.round((session.index / total) * 100);

    return '<div class="quiz-head">' +
      '<div class="quiz-head__row">' +
      '<button class="icon-btn" data-action="quit-quiz" aria-label="퀴즈 그만두기">' +
      UI.icon("close", 20) + "</button>" +
      '<span class="quiz-head__count num">' + (session.index + 1) + " / " + total + "</span>" +
      '<span class="quiz-head__score num">' + UI.icon("check", 14) + session.correct + "</span>" +
      "</div>" +
      Parts.progressBar(percent) +
      "</div>" +

      '<main class="screen quiz-run">' +
      '<div class="question">' +
      '<p class="question__kind">' + esc(q.kind) + "</p>" +
      '<h1 class="question__text">' + esc(q.prompt) + "</h1>" +
      (q.quote ? '<div class="question__quote">' + UI.markdown(q.quote) + "</div>" : "") +
      "</div>" +
      '<div class="options">' + renderOptions(q, session.picked) + "</div>" +
      /* 찍기를 강요하지 않는다. 모르는 걸 모른다고 말할 수 있어야
         복습 목록이 실제 실력과 맞아떨어진다. 네 개 중 하나를 찍어서 맞으면
         아는 것으로 기록되고, 그 단어는 한 달 뒤에나 다시 나온다. */
      (session.picked
        ? ""
        : '<div class="unsure"><button class="unsure__btn" data-action="answer" data-id="' +
          UNSURE + '">모르겠어요</button></div>') +
      "</main>" +
      (session.picked ? renderFeedback(q, session.picked) : "");
  });

  App.on("answer", function (data) {
    if (!session || session.picked) return;

    var q = session.questions[session.index];
    var chosen = q.options.find(function (o) { return o.id === data.id; });
    var right = !!(chosen && chosen.correct);

    session.picked = data.id;
    // 유형을 같이 적어 둔다. 스무 문제쯤 되면 결과 화면에서 "어디서 틀렸나" 를
    // 물을 수 있어야 하는데, 그 답이 여기 없으면 셀 수가 없다.
    session.answers.push({
      termId: q.termId,
      kind: q.kind,
      correct: right,
      unsure: data.id === UNSURE,
    });
    if (right) session.correct++;

    /* 푼 자리는 저장한다. 성적이 아니라 "어디까지 왔나" 다 — 아래 주석이
       말하는 "저장하지 않는다" 는 상자(markPassed/markWrong) 이야기고,
       이건 앱이 꺼져도 이 판을 이어 풀 수 있게 하는 것이다. */
    Store.saveQuiz(session);

    /* 여기서는 상태를 저장하지 않는다.

       예전에는 문제 하나마다 markPassed/markWrong 을 불렀다. 그런데 Quiz.build 는
       단어 하나에서 최대 열한 문제를 뽑고 markPassed 는 부를 때마다 상자를 한 칸
       올리므로, 같은 판 안에서 답한 차례가 복습 일정을 정해 버렸다 — 앞에서 틀리고
       뒤에서 맞히면 통과, 순서가 반대면 복습. 단어 하나의 성적은 그 단어에 나온
       문제를 다 맞혔는가로 정해져야 하고, 그건 판이 닫혀야 알 수 있다(settle).

       화면에 바로 뜨는 맞았다/틀렸다는 이 판 안의 값이라 저장과 상관없다.
       "모르겠어요"도 오답과 같이 다룬다 — 결과는 같지만 말투는 다르게 한다.
       모른다고 인정한 사람에게 틀렸다고 할 이유가 없다. */

    /* 문제는 그대로 있고 그 위에 판정과 해설만 얹힌다. 화면이 바뀐 게 아니므로
       제자리 갱신이다. render() 로 그리면 방금 누른 보기가 통째로 사라졌다가
       미끄러져 들어오고, 스크롤도 맨 위로 되감긴다 —
       고른 자리를 보면서 왜 틀렸는지 읽어야 하는데 그 자리를 뺏는다. */
    App.refresh();
    revealFeedback();
  });

  /* 판이 닫힐 때 딱 한 번, 단어마다 한 번씩 반영한다.
     단어에 나온 문제를 다 맞혀야 통과다. 하나라도 틀렸으면 복습으로 간다 —
     열한 문제 중 하나를 틀린 단어를 "안다" 고 적어두면 그 단어는 한 달 뒤에나 돌아온다.

     끝까지 푼 판만 반영하는 것이 아니다. 그만둔 판도 푼 만큼은 성적이다.
     한 번도 안 나온 단어는 넘기지 않는다 — 물어본 적이 없으니 판정할 근거도 없다. */
  function settle() {
    if (!session || session.settled) {
      // 판이 이미 닫혔으면 저장해 둔 것도 지운다. 새로고침하면 범위 화면으로 나간다.
      Store.clearQuiz();
      return;
    }
    if (!session.answers.length) {
      Store.clearQuiz();
      return;
    }
    session.settled = true;
    Store.clearQuiz();

    var order = [];
    var byTerm = {};
    session.answers.forEach(function (a) {
      if (!byTerm[a.termId]) {
        byTerm[a.termId] = { termId: a.termId, correct: true };
        order.push(a.termId);
      }
      if (!a.correct) byTerm[a.termId].correct = false;
    });

    Store.settleQuiz(order.map(function (id) { return byTerm[id]; }));
  }

  App.on("next-question", function () {
    if (!session) return;
    session.picked = null;
    session.index++;
    Store.saveQuiz(session);

    if (session.index >= session.questions.length) {
      // 판이 여기서 닫힌다. 결과 화면에 닿기 전에 반영해야 목록의 점과 제목이 맞는다.
      settle();
      App.navigate("/quiz/result");
      return;
    }
    App.render();
  });

  /* 그만두기는 지우기가 아니다.

     예전에는 묻지도 않고 session 을 버리고 /quiz 로 나갔다. 그런데 /quiz/result 는
     session 이 없으면 못 들어가므로, 한 자리에서 끝까지 풀지 않는 한 결과를 볼 길이
     아예 없었다. 게다가 이 화면은 탭바가 숨어서 눈에 보이는 출구가 ✕ 하나뿐인데,
     그게 푼 것을 지우는 단추였다.

     푼 만큼은 성적이다. 반영하고 결과로 보낸다 — js/recall.js 의 quit-recall 과 같은
     모양이다. 한 문제도 안 풀었으면 보여줄 것이 없으니 그냥 범위 화면으로 나간다. */
  App.on("quit-quiz", function () {
    if (!session || !session.answers.length) {
      session = null;
      App.navigate("/quiz");
      return;
    }
    settle();
    App.navigate("/quiz/result");
  });

  /* 해설이 나타나면 그 자리까지 내려준다.

     해설은 흐름 안에 있으면서 sticky 로 바닥에 붙는데, 스크롤이 맨 위에 있으면
     붙어 있는 동안 마지막 보기를 25px 쯤 덮는다. 스크롤을 끝까지 내리면
     제자리로 돌아가 겹치지 않는다. 답을 고른 뒤 읽어야 할 것은 아래에 있으니
     시선을 따라가게 하는 편이 맞다.

     App.refresh() 뒤에 불러야 한다. refresh 는 마지막에 읽던 자리로 한 번 더
     스크롤을 되돌리므로(js/app.js draw 끝), 순서가 뒤바뀌면 그 되돌림이
     여기서 내린 것을 도로 감는다. */
  function revealFeedback() {
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: reduce ? "auto" : "smooth",
    });
  }

  /* 해설의 "다시 읽기" 는 판을 떠나는 것이 아니라 잠깐 옆으로 새는 것이다.
     흔한 navigate 로 가면 도착한 단어의 ← 가 그 단어의 단어장으로 나가서,
     확인만 하고 오려던 사람이 풀던 20문제를 잃는다.
     js/recall.js 의 recall-reread 는 같은 판정을 이미 하고 있었다. */
  App.on("open-term", function (data) {
    App.navigateLateral("/term/" + data.id);
  });

  /* ---------------------------------------------------------- 결과
     점수만 보여주고 끝내지 않는다. 틀린 단어를 바로 다시 읽을 수 있어야
     퀴즈가 학습으로 이어진다. */

  function resultCopy(score, total) {
    var ratio = total ? score / total : 0;
    if (ratio === 1) return { title: "전부 맞혔습니다", note: "이 범위는 당분간 넘어가도 됩니다. 며칠 뒤 복습에 다시 올라옵니다." };
    if (ratio >= 0.7) return { title: "대체로 이해했습니다", note: "틀린 단어만 복습 목록에 넣었습니다. 그것만 다시 보면 됩니다." };
    if (ratio >= 0.4) return { title: "절반쯤 왔습니다", note: "헷갈린 단어들을 복습 목록에 넣었습니다. 정의부터 다시 읽어보세요." };
    return { title: "다시 읽을 때입니다", note: "틀린 단어를 복습 목록에 넣었습니다. 급하지 않습니다, 하나씩 보면 됩니다." };
  }

  /* 스무 문제짜리 한 판에서 "12 / 20" 만으로는 무엇을 다시 읽어야 할지 알 수 없다.
     틀린 문제가 어느 유형에 몰렸는지가 그 답이다 — 뜻 고르기에서 몰렸으면 정의를,
     순서에서 몰렸으면 도해를 다시 볼 일이다.

     표로 펼치지 않는다. 유형별 정답률표는 성적표이지 다음에 할 일이 아니고,
     이 화면이 하려는 말은 "다음에 무엇을 하라" 하나다. 그래서 한 줄로 둔다. */
  function missedByKind(answers) {
    var groups = [];
    answers.forEach(function (a) {
      if (a.correct || !a.kind) return;
      var hit = groups.find(function (g) { return g.kind === a.kind; });
      if (hit) hit.n++;
      else groups.push({ kind: a.kind, n: 1 });
    });
    if (!groups.length) return "";

    groups.sort(function (x, y) { return y.n - x.n; });
    // 세 가지까지만 적는다. 여섯 유형을 다 늘어놓으면 한 줄이 세 줄이 된다.
    var head = groups.slice(0, 3).map(function (g) { return g.kind + " " + g.n; }).join(" · ");
    var rest = groups.length - 3;
    return "틀린 곳 — " + head + (rest > 0 ? " 외 " + rest + "가지" : "");
  }

  /* 이번 판에서 한 번이라도 틀린 단어. 처음 나온 차례를 그대로 지킨다 —
     결과 목록과 "다시 풀기" 가 같은 순서를 써야 두 화면이 같은 이야기를 한다. */
  function missedIds(answers) {
    var bad = {};
    var out = [];
    answers.forEach(function (a) { if (!a.correct) bad[a.termId] = true; });
    answers.forEach(function (a) {
      if (bad[a.termId] && out.indexOf(a.termId) === -1) out.push(a.termId);
    });
    return out;
  }

  /* 한 단어를 여러 각도로 물으면 같은 이름이 답안에 여러 번 들어온다.
     목록에 같은 이름이 두 번 뜨면 왜 두 번인지부터 생각하게 되므로 한 번만 싣는다.

     나누는 자는 이 판의 답안이 아니라 Store 가 매긴 상태다. 예전에는 "한 번이라도
     틀렸나" 로 갈랐는데, 그때 Store 는 문제 단위로 반영되고 있어서 마지막에 맞힌
     단어의 최종 상태가 통과였다 — "복습 목록에 넣었습니다" 라는 제목 밑에
     "퀴즈 통과" 점이 찍혔다. 줄에 찍히는 점과 그 줄이 실린 칸은 같은 것을 봐야 한다. */
  function splitTerms(answers) {
    var seen = {};
    var out = { wrong: [], right: [] };
    answers.forEach(function (a) {
      if (seen[a.termId]) return;
      seen[a.termId] = true;
      var passed = Store.statusOf(a.termId) === Store.STATUS.PASSED;
      out[passed ? "right" : "wrong"].push(a.termId);
    });
    return out;
  }

  /* 이름이 "다시 읽기" 인데 하는 일이 퀴즈 시작이었다. 게다가 Store.reviewQueue()
     전체를 쓰는 start-review 로 보내서, 방금 틀린 단어가 아니라 예전에 쌓인 복습
     대기열이 나왔다 — 방금 본 단어가 안 나오는 "다시" 였다. 하는 일에 이름을 맞추고,
     대상도 이번 판의 오답으로 좁힌다. 읽으러 가는 길은 아래 목록에 그대로 있다. */
  App.on("retry-wrong", function () {
    if (!session) return;
    var pool = Store.allTerms();
    var targets = missedIds(session.answers)
      .map(function (id) { return Store.termById(id); })
      .filter(Boolean);
    if (!targets.length) return;

    withBodies(targets, function () {
      startSession(window.Quiz.build(targets, pool, SESSION_MAX), "틀린 단어");
    });
  });

  App.register("/quiz/result", function () {
    if (!session) {
      App.navigate("/quiz", true);
      return "";
    }
    /* 한 문제도 안 푼 판에는 보여줄 결과가 없다. 주소를 직접 쳐서 들어온 경우다 —
       판은 아직 열려 있으니 풀던 자리로 되돌린다. */
    if (!session.answers.length) {
      App.navigate("/quiz/run", true);
      return "";
    }

    /* 다 풀고 왔든 그만두고 왔든, 여기 닿았으면 반영은 끝나 있어야 한다.
       settle 은 한 판에 한 번만 듣는다 — 뒤로 갔다 다시 와도 상자는 안 움직인다. */
    settle();

    /* 점수의 분모는 낸 문제가 아니라 푼 문제다. 그만두고 온 사람에게
       "3 / 20" 을 보여주면 열일곱 문제를 틀린 것처럼 읽힌다. */
    var answered = session.answers.length;
    var planned = session.questions.length;
    var copy = resultCopy(session.correct, answered);
    var missed = missedByKind(session.answers);

    var split = splitTerms(session.answers);
    var wrong = split.wrong;
    var right = split.right;

    // 상세 화면에서 한 문제만 확인하러 들어온 사람. 읽던 자리로 돌아갈 길이 필요하다.
    var from = session.fromTermId ? Store.termById(session.fromTermId) : null;

    /* withDays 는 통과 목록에서만 켠다.

       상자[1,3,7,16,35]가 단어마다 "며칠 뒤에 다시 물어볼지" 를 정해 두는데,
       그 날짜가 화면 어디에도 안 나왔다. 결과 문구는 "며칠 뒤 복습에 다시
       올라옵니다" 라고만 말하고 며칠인지는 안 말한다 — 정작 값은 이미 서 있다.
       settle() 이 위에서 끝났으므로 dueAt 이 서 있는 상태다.

       틀린 목록에는 붙이지 않는다. markWrong 이 dueAt 을 지금으로 두어
       늘 "0일 뒤" 가 나오고, 그건 알려주는 게 아니라 헷갈리게 한다. */
    var rowsFor = function (list, iconName, withDays) {
      return list.map(function (termId) {
        var t = Store.termById(termId);
        if (!t) return "";
        var days = withDays ? Store.dueInDays(t.id) : null;
        // 결과에서 단어로 가는 것도 옆걸음이다. ← 로 이 목록에 돌아와야
        // 나머지 틀린 단어를 마저 볼 수 있다.
        return '<button class="result-row" data-action="go-side" data-to="/term/' + esc(t.id) + '">' +
          Parts.statusDot(Store.statusOf(t.id)) +
          '<span class="result-row__term">' + esc(t.term) + "</span>" +
          '<span class="meta">' +
          esc(days ? days + "일 뒤 복습" : t.bookName) + "</span>" +
          UI.icon(iconName, 16) + "</button>";
      }).join("");
    };

    // 이 화면에도 ← 를 준다. 없을 때는 나가는 길이 탭바뿐이라, 단어를 읽다가
    // 들어온 사람은 읽던 흐름으로 돌아갈 손잡이가 하나도 없었다.
    return Parts.topbar({ back: true, right: Parts.themeButton() }) +
      '<main class="screen"><div class="result">' +
      '<p class="result__score">' + session.correct +
      '<span class="result__of"> / ' + answered + "</span></p>" +
      '<h1 class="result__title">' + esc(copy.title) + "</h1>" +
      '<p class="result__note">' + esc(copy.note) + "</p>" +
      // 그만두고 온 판에서는 이 판이 몇 문제짜리였는지를 같이 적는다.
      (answered < planned
        ? '<p class="result__missed">' + esc(planned + "문제 가운데 " + answered + "문제를 풀었습니다") +
          "</p>"
        : "") +
      (missed ? '<p class="result__missed">' + esc(missed) + "</p>" : "") +
      "</div>" +

      '<div class="stack" style="margin-top:36px">' +
      (from
        ? '<button class="btn btn--primary btn--block" data-action="go" data-to="/term/' +
          esc(from.id) + '">' + UI.icon("book", 18) + "읽던 단어로 돌아가기</button>"
        : "") +
      '<button class="btn btn--' + (from ? "secondary" : "primary") +
      ' btn--block" data-action="go" data-to="/quiz">다른 범위로 한 번 더</button>' +
      (wrong.length
        ? '<button class="btn btn--secondary btn--block" data-action="retry-wrong">' +
          UI.icon("rotate", 18) + "틀린 단어 다시 풀기</button>"
        : "") +
      "</div>" +

      (wrong.length
        ? '<section class="block"><h2 class="section-title" style="margin-bottom:4px">복습 목록에 넣은 단어</h2>' +
          '<div class="result__list" style="margin-top:8px">' + rowsFor(wrong, "right") + "</div></section>"
        : "") +

      (right.length
        ? '<section class="block"><h2 class="section-title" style="margin-bottom:4px">통과한 단어</h2>' +
          '<div class="result__list" style="margin-top:8px">' + rowsFor(right, "right", true) + "</div></section>"
        : "") +
      "</main>";
  });
})();
