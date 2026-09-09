/* ============================================================
   떠올리기 — 읽기와 퀴즈 사이에 빠져 있던 단계

   읽고 나서 바로 객관식으로 가면 "보니까 알겠다"는 착각을 준다.
   보기 네 개를 주는 순간 그건 재인(recognition)이지 회상(recall)이 아니다.
   Anki 도, 클래스카드도, Quizlet Learn 도 그 사이에 한 단계를 둔다.

     Anki        답을 가리고 스스로 떠올린 뒤 Again/Hard/Good/Easy 로 자가 평가
     클래스카드   암기 -> 리콜 -> 스펠 세 단계
     Quizlet     객관식으로 시작해 잘하면 서술형으로 승급

   여기서는 가장 단순한 형태만 가져온다. 용어를 보여주고, 뜻을 가리고,
   스스로 떠올린 다음 확인한다. 자가 평가는 두 갈래로만 둔다 —
   네 갈래는 고르는 데 시간이 걸리고, 목업에서 그 차이를 쓸 데가 없다.

   카드에는 이름과 함께 저자가 노트에 적어둔 확인 질문 하나가 같이 나온다.
   이름만 보고 떠올릴 수 있는 건 뜻 한 줄인데, 노트는 그것보다 두껍다.
   채점은 여전히 안 한다 — 질문을 내밀고 답이 어디 있는지 알려주는 데서 멈춘다.

   이 단계는 간격 반복 일정을 건드리지 않는다. 예약은 퀴즈가 한다.
   읽기 -> 떠올리기(학습 완료) -> 퀴즈(통과 + 다음 복습 예약) -> 복습
   ============================================================ */

(function () {
  "use strict";

  var UI = window.UI;
  var Store = window.Store;
  var App = window.App;
  var Parts = window.Parts;
  var esc = UI.esc;

  var session = null;

  /* 떠올릴 만한 단어. 읽던 것과 복습 대기 중인 것이 대상이다.
     아직 안 읽은 단어는 떠올릴 근거가 없으므로 넣지 않는다. */
  function candidates() {
    return Store.allTerms().filter(function (t) {
      var s = Store.statusOf(t.id);
      return s === Store.STATUS.READING || s === Store.STATUS.REVIEW;
    });
  }

  /* 한 판의 길이. 홈의 발판이 "읽은 단어 512개, 뜻을 떠올려볼까요" 라고 적으면서
     실제로는 12장만 주었다. 숫자를 두 곳이 따로 알고 있어서 생긴 어긋남이라,
     퀴즈가 SESSION_MAX 를 내보내는 방식(js/quiz-screens.js)을 그대로 따른다. */
  var SESSION_MAX = 12;

  function start(terms, label) {
    var queue = (terms || []).slice(0, SESSION_MAX);
    if (!queue.length) {
      UI.toast("떠올릴 단어가 아직 없습니다", "inbox");
      return;
    }
    session = {
      queue: queue,
      label: label || "떠올리기",
      /* 시작한 자리. ✕ 로 아무것도 안 하고 나갈 때 돌아갈 곳이다.
         한 장짜리 판은 단어를 읽다가 여는 것이라, 그냥 홈으로 보내면
         3,000px 을 내려가며 읽던 자리를 통째로 잃는다. */
      from: App.currentPath(),
      total: queue.length,
      seen: 0,       // 보여준 카드 수 (같은 단어를 다시 보면 또 센다)
      done: [],      // 떠올린 단어
      again: [],     // 다시 볼 단어 (중복 없이 센다)
      shown: false,  // 답을 폈는가
      rot: {},       // 단어별로 몇 번째 확인 질문을 낼 차례인가
    };
    turnTo(queue[0]);
    // 첫 카드의 본문을 지금 부른다. navigate 는 hashchange 를 한 박자 뒤에 부르는데,
    // 그때 시작하면 첫 질문만 늦게 끼어들어 이미 읽던 화면이 눈앞에서 바뀐다.
    ensureBody(queue[0]);
    App.navigate("/recall/run");
  }

  App.on("start-recall", function () {
    start(candidates(), "떠올리기");
  });

  App.on("recall-one", function (data) {
    var term = Store.termById(data.id);
    if (term) start([term], term.term);
  });

  /* ---------------------------------------------------------- 저자의 확인 질문

     노트마다 저자가 "이 셋에 답할 수 있으면 이해한 것이다" 라며 질문을 셋씩 적어뒀다
     (229편 · 687문항). 상세 화면은 이미 그걸 쓰는데 여기는 안 썼다 — 단어 이름만
     보여주고 "떠올랐나" 를 물었다. 이름만 보고 떠올릴 수 있는 건 뜻 한 줄이지만
     저자의 질문은 "왜 그런가" 를 묻는다. 같은 카드에서 더 깊은 걸 물을 수 있는데
     안 쓸 이유가 없었다.

     기계가 답을 채점하지는 않는다. 스스로 답하고 스스로 확인하는 게 회상이고,
     서술형을 채점하려 드는 순간 맞는 답도 틀렸다고 하기 시작한다.
     여기서 하는 일은 질문을 내밀고, 답이 어디 있는지 알려주는 것까지다. */

  /* 질문 한 줄을 { q, at } 로 세운다. at 은 답이 적힌 칸의 이름이다.
     빌드가 "→ 뒤" 를 떼어내기 전에 구워둔 데이터에는 질문 문자열만 들어 있어서
     두 모양을 다 받는다. js/screens.js 의 asked() 와 같은 판정을 여기서도 한다 —
     같은 데이터를 두 화면이 다르게 읽으면 한쪽만 조용히 비어 보인다. */
  function asked(item) {
    if (typeof item === "string") return { q: item, at: "" };
    return { q: (item && item.q) || "", at: (item && item.at) || "" };
  }

  /* 카드에 들어설 때 몇 번째 질문을 낼지 정해 둔다. 그리는 동안에는 바뀌지 않아야 한다 —
     답을 펴거나 본문이 늦게 도착해서 다시 그릴 때마다 질문이 갈리면 읽던 사람이 길을 잃는다.

     시작 자리는 판마다 새로 뽑고, 같은 단어가 "아직" 으로 되돌아오면 다음 것으로 넘긴다.
     늘 첫 번째만 내면 셋 중 하나만 외우게 되고, 그건 저자가 셋을 적어둔 뜻을 버리는 것이다. */
  function turnTo(term) {
    if (!session || !term) return;
    if (typeof session.rot[term.id] === "number") {
      session.rot[term.id] += 1;
      return;
    }
    // security-ok: OWASP-A02-2 — 셋 중 몇 번째 질문부터 낼지 고르는 값이다. 비밀이 아니다.
    session.rot[term.id] = Math.floor(Math.random() * ((term.check && term.check.length) || 3));
  }

  /* 이번 카드에 낼 질문. 확인 질문이 없는 단어는 null 이고, 그러면 화면은
     예전처럼 이름과 뜻만 다룬다. 없는 게 깨짐이 아니라 그냥 덜 물어보는 것이다. */
  function askOf(term) {
    var list = (term && term.check) || [];
    if (!list.length) return null;
    var rot = (session && session.rot) || {};
    var turn = typeof rot[term.id] === "number" ? rot[term.id] : 0;
    var ask = asked(list[turn % list.length]);
    return ask.q ? ask : null;
  }

  /* 확인 질문은 본문 파일(data/terms/<권>.js)에 실려 있고 본문은 권 단위로 따로 온다.
     회상 큐는 여러 권에 걸칠 수 있으니 카드가 바뀔 때마다 그 권을 챙긴다.
     못 받아도 카드는 그대로 돈다 — 질문은 덤이고 단어가 본체다.

     실패했을 때 다시 그리지 않는 것이 중요하다. 다시 그리면 본문이 여전히 없으니
     또 부르고 또 실패한다. screens.js 가 이 고리로 6초에 2만 번을 돌았다. */
  function ensureBody(term) {
    if (!term || Store.hasBody(term.bookId) || Store.bodyFailed(term.bookId)) return;
    Store.loadBody(term.bookId, function (ok) {
      if (!ok) return;
      // 뒤늦게 도착한 본문으로 질문 한 줄이 붙을 뿐이다. 카드는 그대로 둔다.
      if (App.currentPath() === "/recall/run") App.refresh();
    });
  }

  /* 다음 카드의 권은 미리 받아둔다. 안 그러면 카드를 넘길 때마다 질문이 한 박자 늦게
     끼어들어, 이미 읽기 시작한 화면이 눈앞에서 바뀐다.
     콜백을 걸지 않는 건 지금 보고 있는 화면과 상관없는 일이기 때문이다. */
  function prefetchNext() {
    var next = session && session.queue[1];
    if (!next || Store.hasBody(next.bookId) || Store.bodyFailed(next.bookId)) return;
    Store.loadBody(next.bookId);
  }

  /* 답을 편 자리에서 "답이 어디 있는지" 를 알려주는 칸.
     한 줄 뜻은 저자의 질문에 대한 답이 아니다. 답은 본문 어느 칸에 흩어져 있고,
     그 자리를 안 알려주면 "떠올랐다" 를 누를 근거가 없다.

     상세 화면에는 그 칸으로 바로 뛰는 단추가 있지만(screens.js 의 selfcheck__jump)
     여기엔 뛸 칸이 화면에 없다. 어디인지 글로 말하고, 가겠다면 상세 화면으로 보낸다. */
  function whereBlock(term, ask) {
    if (!ask) return "";
    return '<p class="recall__where">' +
      (ask.at
        ? "이 질문의 답은 〈" + esc(ask.at) + "〉에 있습니다"
        : "이 질문의 답은 본문에 있습니다") + "</p>" +
      '<button class="link-btn recall__reread" data-action="recall-reread" data-to="/term/' +
      esc(term.id) + '">다시 읽기</button>';
  }

  /* 여기서 나가는 길은 "위" 가 아니라 "옆" 이다. 흔한 go 를 쓰면 도착한 단어의 ←
     가 그 단어의 단어장 목록으로 나가 버려서, 답을 확인하러 잠깐 들른 사람이
     떠올리던 카드를 잃었다 — 돌아올 길이 브라우저 뒤로가기밖에 없었다.
     옆걸음으로 가면 ← 가 아까 그 카드로 돌아온다. */
  App.on("recall-reread", function (data) {
    App.navigateLateral(data.to);
  });

  /* ---------------------------------------------------------- 카드 */

  App.register("/recall/run", function () {
    if (!session || !session.queue.length) {
      App.navigate(session ? "/recall/done" : "/home", true);
      return "";
    }

    var card = session.queue[0];
    ensureBody(card);
    prefetchNext();

    // 큐에 담긴 건 인덱스뿐이다. 본문이 와 있으면 확인 질문이 딸려 온다.
    // 아직이면 인덱스만 쓴다 — 이름과 한 줄 뜻은 거기 다 있다.
    var term = Store.termById(card.id) || card;
    var ask = askOf(term);

    // 진행률은 "떠올린 개수"로 잰다. 카드를 몇 장 넘겼는지가 아니라
    // 얼마나 남았는지를 알고 싶은 것이기 때문이다.
    var percent = session.total ? Math.round((session.done.length / session.total) * 100) : 0;

    return '<div class="quiz-head">' +
      '<div class="quiz-head__row">' +
      '<button class="icon-btn" data-action="quit-recall" aria-label="떠올리기 그만두기">' +
      UI.icon("close", 20) + "</button>" +
      '<span class="quiz-head__count num">' + Math.min(session.done.length + 1, session.total) +
      " / " + session.total + "</span>" +
      '<span class="quiz-head__score num">' + UI.icon("check", 14) + session.done.length + "</span>" +
      "</div>" +
      Parts.progressBar(percent) +
      "</div>" +

      '<main class="screen recall">' +
      '<p class="recall__book">' + esc(term.bookName) + "</p>" +
      '<h1 class="recall__term">' + esc(term.term) + "</h1>" +
      (term.reading ? '<p class="recall__reading">' + esc(term.reading) + "</p>" : "") +

      // 질문은 답을 편 뒤에도 자리에 남는다. 무엇을 물었는지 보면서 확인해야
      // 자기 답과 견줄 수 있다. 질문이 사라지면 견줄 대상이 없다.
      // 확인 질문에는 `/24` 같은 인라인 코드가 들어 있다. screens.js 와 같은 판정.
      (ask ? '<p class="recall__ask">' + UI.inline(ask.q) + "</p>" : "") +

      (session.shown
        ? '<div class="recall__answer prose">' + UI.markdown(term.summary) + "</div>" +
          whereBlock(term, ask)
        : '<p class="recall__cue">' +
          (ask ? "뜻을 말해 보고<br>이 질문에도 답해 보세요"
               : "이 말이 무슨 뜻인지<br>머릿속으로 먼저 말해 보세요") + "</p>") +
      "</main>" +

      '<div class="action-bar">' +
      (session.shown
        ? '<button class="btn btn--secondary" style="flex:1" data-action="recall-again">' +
          UI.icon("rotate", 18) + "아직</button>" +
          '<button class="btn btn--primary" style="flex:1" data-action="recall-got">' +
          UI.icon("check", 18) + "떠올랐다</button>"
        : '<button class="btn btn--primary btn--block" data-action="recall-show">' +
          // 질문이 붙은 카드에서 "뜻 확인하기" 는 절반만 말한다. 펴는 쪽에는
          // 한 줄 뜻과 "답이 어디 있는지" 가 같이 있으므로 이름을 넓게 잡는다.
          (ask ? "확인하기" : "뜻 확인하기") + "</button>") +
      "</div>";
  });

  App.on("recall-show", function () {
    if (!session) return;
    session.shown = true;
    /* 같은 카드가 펴지는 것이다. 다음 카드로 넘어가는 것(282행)과 달리
       화면이 바뀌지 않으므로 제자리 갱신으로 연다. */
    App.refresh();
  });

  /* 떠올렸으면 학습 완료로 올린다. 이제 퀴즈에서 확인할 자격이 생긴다. */
  App.on("recall-got", function () {
    if (!session) return;
    var term = session.queue.shift();
    if (term) {
      // 앞서 "아직"이었다가 두 번째에 떠올린 단어는 다시 볼 목록에서 뺀다.
      // 안 그러면 마무리 화면의 두 목록에 같은 단어가 같이 올라온다.
      var pending = session.again.indexOf(term.id);
      if (pending !== -1) session.again.splice(pending, 1);

      if (session.done.indexOf(term.id) === -1) session.done.push(term.id);
      if (Store.statusOf(term.id) !== Store.STATUS.PASSED) Store.markLearned(term.id);
    }
    advance();
  });

  /* 못 떠올렸으면 이번 판 끝으로 보낸다. 상태는 건드리지 않는다 —
     "아직"은 실패가 아니라 아직 익지 않았다는 뜻이고, 벌을 줄 일이 아니다. */
  App.on("recall-again", function () {
    if (!session) return;
    var term = session.queue.shift();
    if (term) {
      if (session.again.indexOf(term.id) === -1) session.again.push(term.id);
      session.queue.push(term);
    }
    advance();
  });

  /* "아직"이면 카드가 판 끝으로 돌아가므로 큐가 저절로 비지 않는다.
     Anki 도 같은 판에서 다시 물어보지만, 여기엔 끝이 있어야 한다 —
     떠올릴 때까지 붙잡아두면 그만두는 것 말고는 빠져나갈 길이 없다.
     한 단어당 두 번까지만 보여주고 끊는다. */
  function advance() {
    session.shown = false;
    session.seen = (session.seen || 0) + 1;

    if (!session.queue.length || session.seen >= session.total * 2) {
      App.navigate("/recall/done");
      return;
    }
    // 다음 카드로 들어서는 지점. 여기서만 질문을 넘긴다 —
    // 되돌아온 단어는 아까와 다른 질문을 받는다.
    turnTo(session.queue[0]);
    App.render();
  }

  App.on("quit-recall", function () {
    var had = session && (session.done.length || session.again.length);
    if (!had) {
      var from = session && session.from;
      session = null;
      // 아무것도 안 한 판이면 열기 전 자리로 돌려보낸다.
      App.navigate(from && from !== "/recall/run" ? from : "/home");
      return;
    }
    App.navigate("/recall/done");
  });

  /* ---------------------------------------------------------- 마무리
     점수를 매기지 않는다. 떠올리기는 시험이 아니라 준비 운동이다.
     여기서 할 일은 다음 걸음을 가리키는 것뿐이다. */

  App.register("/recall/done", function () {
    if (!session) {
      App.navigate("/home", true);
      return "";
    }

    var got = session.done.length;
    var again = session.again.length;
    /* 이번 판에서 떠올린 것 가운데 퀴즈에 낼 수 있는 것을 센다.

       예전에는 앱 전체에서 LEARNED 인 것을 셌다. 그래서 복습 단어만 떠올린 판은
       마무리가 "이제 퀴즈로 확인할 차례입니다" 라고 말해 놓고 그 단추를 안 줬다 —
       복습 단어는 statusOf 가 REVIEW 라서 한 개도 안 세어졌기 때문이다.
       /quiz 에는 "복습" 범위 카드가 이미 있으므로 갈 곳은 있다. */
    var readyForQuiz = session.done.filter(function (id) {
      var st = Store.statusOf(id);
      return st === Store.STATUS.LEARNED || st === Store.STATUS.REVIEW;
    }).length;

    var rows = function (ids) {
      return ids.map(function (id) {
        var t = Store.termById(id);
        if (!t) return "";
        // 퀴즈 결과와 같은 판정 — 여기서 단어로 가는 것도 옆걸음이다.
        return '<button class="result-row" data-action="go-side" data-to="/term/' + esc(t.id) + '">' +
          Parts.statusDot(Store.statusOf(t.id)) +
          '<span class="result-row__term">' + esc(t.term) + "</span>" +
          '<span class="meta">' + esc(t.bookName) + "</span>" +
          UI.icon("right", 16) + "</button>";
      }).join("");
    };

    return Parts.topbar({ right: Parts.themeButton() }) +
      '<main class="screen"><div class="result">' +
      '<p class="result__score">' + got + '<span class="result__of"> / ' + session.total + "</span></p>" +
      '<h1 class="result__title">' + (got ? "떠올린 만큼 남습니다" : "다시 읽고 오면 됩니다") + "</h1>" +
      '<p class="result__note">' +
      (again
        ? "아직 흐릿한 " + again + "개는 정의부터 다시 읽어보세요."
        : "이제 퀴즈로 확인할 차례입니다.") +
      "</p></div>" +

      '<div class="stack" style="margin-top:36px">' +
      (readyForQuiz
        ? '<button class="btn btn--primary btn--block" data-action="go" data-to="/quiz">' +
          UI.icon("quiz", 18) + "퀴즈로 확인하기</button>"
        : "") +
      '<button class="btn btn--secondary btn--block" data-action="go" data-to="/home">홈으로</button>' +
      "</div>" +

      (again
        ? '<section class="block"><h2 class="section-title" style="margin-bottom:4px">다시 읽을 단어</h2>' +
          '<div class="result__list" style="margin-top:8px">' + rows(session.again) + "</div></section>"
        : "") +
      (got
        ? '<section class="block"><h2 class="section-title" style="margin-bottom:4px">떠올린 단어</h2>' +
          '<div class="result__list" style="margin-top:8px">' + rows(session.done) + "</div></section>"
        : "") +
      "</main>";
  });

  // 홈의 발판이 한 판 길이를 여기서 읽는다. 두 곳이 따로 알면 또 어긋난다.
  window.Recall = { candidates: candidates, SESSION_MAX: SESSION_MAX };
})();
