/* ============================================================
   퀴즈 생성
   목표는 암기 확인이 아니라 이해 확인이다.
   그래서 문제를 아홉 종류로 섞는다.

     1) 설명 -> 용어   : 뜻을 읽고 이름을 떠올릴 수 있는가
     2) 용어 -> 설명   : 이름을 보고 뜻을 고를 수 있는가 (오답이 그럴듯해야 한다)
     3) 관계          : 이 개념과 같이 다니는 개념을 아는가
     4) 오해 가리기    : 넷 중 사실이 아닌 말을 짚어낼 수 있는가
     5) 사실 고르기    : 넷 중 사실인 말을 짚어낼 수 있는가
     6) 비유          : 빗댄 이야기를 듣고 무슨 개념인지 아는가
     7) 그림          : 이 그림이 무엇을 설명하는지 아는가
     8) 순서          : 일이 어떤 차례로 벌어지는지 아는가
     9) 사례          : 이 상황이 어떤 개념의 일인지 아는가

   4~9 는 노트의 흔한 오해 · 비유 · 대표 도해 · 실제 사례에서 나온다.
   전부 저자가 직접 쓴 것이라 답의 근거가 노트 안에 있다. 없는 재료를 상상해서
   문제를 찍어내지는 않는다 — "아는데 틀리는" 문제가 생기면 학습이 망가진다.

   오답 선택지는 같은 단어장 안에서 뽑는다. 전혀 다른 분야에서 뽑으면
   내용을 몰라도 소거법으로 맞힐 수 있어서 이해를 확인하지 못한다.
   ============================================================ */

window.Quiz = (function () {
  "use strict";

  var KINDS = {
    MEANING: "설명에서 용어 찾기",
    DEFINE: "용어의 뜻 고르기",
    RELATED: "같이 쓰이는 개념",
    /* 이 둘의 이름이 서로 뒤바뀌어 있었다. MYTH 는 "사실이 아닌 것" 을
       고르게 하고(671행) MYTH_PICK 은 "사실인 것" 을 고르게 하는데(713행),
       이름은 정반대로 달려 있었다. 이름은 문제 위에 눈썹으로 뜨고 결과
       화면의 "틀린 곳" 집계에도 그대로 쓰이므로, 읽는 사람은 시키는 말과
       반대되는 안내를 먼저 본다. */
    MYTH: "틀린 설명 고르기",
    MYTH_PICK: "사실인 설명 고르기",
    ANALOGY: "비유에서 용어 찾기",
    FIGURE: "그림이 답하는 질문",
    ORDER: "일이 벌어지는 순서",
    CASE: "사례에서 용어 찾기",
  };

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function hasId(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return true;
    }
    return false;
  }

  /* 노트의 한 줄 뜻은 거의 항상 "<용어>는 ..." 으로 시작한다.
     이 앞머리를 찾아낸다. 용어명 필드에 기대지 않는 이유는,
     노트마다 제목은 영문인데 본문은 한글 이름으로 쓰는 경우가 있기 때문이다.
     ("# Load Balancer" 인데 본문은 "로드 밸런서는 ...") */
  var LEAD = /^\s*(?:\*\*)?(.{1,40}?)(는|은|이란|란|이라는)(\s|\*)/;

  function stripEmphasis(text) {
    return String(text || "").replace(/^\s*\*\*/, "").replace(/\*\*\s*$/, "");
  }

  /* 선택지는 버튼 한 줄이라 마크다운을 렌더하지 않는다.
     굵게 표시가 하나만 남으면 그것 자체가 정답 힌트가 되기도 한다. */
  function plainText(text) {
    return String(text || "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      // 노트끼리 거는 [[링크]]. 상세 화면에서는 누를 수 있는 단추가 되지만
      // 보기는 UI.esc 로 그려서 대괄호가 글자로 찍힌다. 셋은 산문인데 하나만
      // 대괄호를 달고 있으면 내용과 상관없이 그것만 눈에 띈다.
      // js/ui.js 88행과 같은 정규식이라 표시 이름 쪽을 남긴다.
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* 용어를 "이것" 으로 바꾸면 뒤따르는 조사가 틀어진다.
     "DNS가" -> "이것가" 가 되어버린다. "이것" 은 받침이 있으므로 조사를 맞춰준다. */
  var PARTICLE_FIX = { "가": "이", "는": "은", "를": "을", "와": "과", "로": "으로" };

  function fixParticles(text, after) {
    return text.replace(new RegExp(after + "([가는를와로])", "g"), function (_, p) {
      return after + (PARTICLE_FIX[p] || p);
    });
  }

  function escapeRe(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* 별명까지 함께 지운다. 노트가 본문에서 제목과 다른 이름으로 부르는 일이 있다 —
     제목이 "Package / Module" 인데 본문은 "Package는 …" 으로 쓴다. 제목·읽기만
     지우면 그 이름이 지문에 남아, 보기와 글자만 맞춰도 답이 나온다. */
  function replaceName(text, term, replacement) {
    var out = String(text || "");
    [term.term, term.reading].concat(term.aliases || []).forEach(function (p) {
      if (!p) return;
      var safe = escapeRe(p);
      out = out.replace(new RegExp("\\s*\\(" + safe + "[^)]*\\)", "gi"), "");
      out = out.replace(new RegExp(safe, "gi"), replacement);
    });
    return replacement === "이것" ? fixParticles(out, "이것") : out;
  }

  /* 지문에 정답 이름이 들어 있는지 본다. 들어 있으면 그 문제는 내지 않는다 —
     비유나 사례가 이름을 그대로 부르면 문제가 아니라 받아쓰기가 된다.
     한 글자짜리 이름(힙·큐)도 본다. 우연히 걸려 문제 하나를 못 내는 쪽이,
     답이 지문에 적힌 문제를 내는 쪽보다 낫다. */
  function mentionsName(text, term) {
    var hay = String(text || "").toLowerCase();
    var names = [term.term, term.reading].concat(term.aliases || []);
    for (var i = 0; i < names.length; i++) {
      var name = String(names[i] || "").trim().toLowerCase();
      if (name && hay.indexOf(name) !== -1) return true;
    }
    return false;
  }

  /* 빈칸 뒤 조사를 원문 그대로 두면 정답의 받침이 새어 나간다.
     "____은" 이면 받침 있는 말, "____는" 이면 없는 말로 좁혀진다.
     CDN(씨디엔)만 "은" 을 받는 식이라 실제로 답이 찍힌다.
     시험지에서 쓰는 병기 표기로 눕혀서 단서를 없앤다. */
  var NEUTRAL_PARTICLE = { "는": "은(는)", "은": "은(는)", "이란": "(이)란", "란": "(이)란", "이라는": "(이)라는" };

  /* 앞머리가 아니라 문장 가운데를 가릴 때도 같은 일이 벌어진다.
     거기는 조사가 무엇이든 올 수 있어서 표를 하나 더 둔다.
     긴 조사를 먼저 봐야 "으로" 가 "로" 로 잘리지 않는다. */
  var BLANK_TAIL = /(____)(으로|이란|이라는|라는|은|는|이|가|을|를|과|와|로)(?![가-힣])/g;
  var BLANK_PAIR = {
    "은": "은(는)", "는": "은(는)", "이": "이(가)", "가": "이(가)",
    "을": "을(를)", "를": "을(를)", "과": "과(와)", "와": "과(와)",
    "로": "(으)로", "으로": "(으)로", "이란": "(이)란", "라는": "(이)라는", "이라는": "(이)라는",
  };

  function neutralizeBlanks(text) {
    return String(text || "").replace(BLANK_TAIL, function (_, blank, particle) {
      return blank + (BLANK_PAIR[particle] || particle);
    });
  }

  /* 지문에서 정답 이름을 지운다. 별명까지 지우는 이유는, 노트가 본문에서
     제목과 다른 이름으로 부르는 일이 흔하기 때문이다(Heap 을 "힙" 으로). */
  function maskName(text, term) {
    var out = replaceName(stripEmphasis(text), term, "____");
    (term.aliases || []).forEach(function (alias) {
      var name = String(alias || "").trim();
      if (!name) return;
      out = out.replace(new RegExp(escapeRe(name), "gi"), "____");
    });
    return neutralizeBlanks(out.replace(/(____[\s,·]*){2,}/g, "____ ")).trim();
  }

  /* 설명에서 용어 찾기용. 앞머리를 빈칸으로 바꾼다.
     빈칸 형태가 모든 보기에서 같아야 모양만 보고 답을 고르지 못한다. */
  function blankSubject(text, term) {
    var out = stripEmphasis(text);
    var lead = out.match(LEAD);
    if (lead) {
      out = "____" + (NEUTRAL_PARTICLE[lead[2]] || lead[2]) + out.slice(lead[0].length - lead[3].length);
    }
    out = replaceName(out, term, "____");
    return out.replace(/(____[\s,·]*){2,}/g, "____ ").trim();
  }

  /* 뜻 고르기용. 앞머리를 빈칸으로 두지 않고 통째로 들어낸다.
     보기 네 개가 모두 "____는 ..." 이면 읽기 괴롭고,
     하나만 빈칸이 없으면 그게 곧 정답 표시가 된다. */
  function stripSubject(text, term) {
    var out = stripEmphasis(text);
    var lead = out.match(LEAD);
    if (lead) out = out.slice(lead[0].length).trim();
    out = replaceName(out, term, "이것").replace(/(이것[\s,·]*){2,}/g, "이것 ");
    return out.trim();
  }

  /* 보기 길이를 고르게 맞춘다.
     한 보기만 유난히 길면 그것만 눈에 띄고, 읽는 부담도 커진다.
     문장 경계에서 끊어서 "..." 로 잘리는 일이 없게 한다. */
  function firstSentence(text, maxLen, minLen) {
    var s = String(text || "").replace(/\s+/g, " ").trim();
    var limit = maxLen || 110;
    var floor = minLen || 18;

    // 문장 끝 위치를 모은다
    var ends = [];
    var re = /(?:다|요)\.\s|[.!?。]\s/g;
    var m;
    while ((m = re.exec(s)) !== null) ends.push(m.index + m[0].trimEnd().length);

    /* 뜻이 통하는 최소 길이(기본 18자)를 넘기는 첫 문장에서 끊는다.

       한도를 넘을 때만 자르면 안 된다. 어떤 뜻풀이는 두 문장이 합쳐서 95자라
       한도(110자) 안에 들어오는데, 그러면 그 보기만 두 문장이 되어 혼자 길어진다.
       내용을 몰라도 길이만 보고 고를 수 있게 되는 지점이 여기다.
       길이와 상관없이 항상 첫 문장에서 끊어야 보기가 고르게 보인다. */
    for (var i = 0; i < ends.length; i++) {
      if (ends[i] >= floor) return s.slice(0, ends[i]).trim();
    }

    if (s.length <= limit) return s;
    // 문장 경계가 없으면 중간에서 자르지 않고 한도까지만 보여준다.
    return ends.length ? s.slice(0, ends[ends.length - 1]).trim() : s.slice(0, limit).trim() + "...";
  }

  /* ---------------------------------------------------------- 본문 재료

     새 유형이 쓰는 재료(흔한 오해 · 실제 사례 · 대표 도해 · 비유)는 인덱스가
     아니라 본문(data/terms/<권>.js)에 실린다. 본문은 그 권을 펼칠 때만 읽히므로
     퀴즈를 시작하는 시점에 아직 안 와 있을 수 있다.

     없으면 그 유형만 조용히 건너뛴다. 여기서 기다리게 만들면 build() 가
     비동기가 되고 화면 계약이 통째로 바뀐다. 본문을 미리 받아두는 일은
     화면 쪽에서 Store.loadBody(bookId) 로 한다 — 본문이 없으면 낼 수 있는
     문제도 그만큼 줄어들고, countQuestions 가 그 줄어든 수를 그대로 답한다. */

  function bodyOf(term) {
    var book = (window.VOCAB_TERMS || {})[term.bookId];
    if (book && book[term.id]) return book[term.id];
    // 단어 상세에서 넘어온 단어는 Store.termById 가 본문을 이미 얹어서 준다
    return term.myths || term.cases || term.dia || term.analogy ? term : null;
  }

  /* 정정문이 "아니다." 로 시작할 때가 있다. 그대로 보기에 실으면 정정문인지
     아닌지가 글투로 드러나서, 내용을 몰라도 부정으로 시작하는 것만 피하면 맞는다.
     또 정정문은 틀린 말보다 훨씬 길다(실측 중간값 56자 대 18자). 길이가 그대로면
     내용을 몰라도 긴 쪽만 세면 답이 나온다. 앞머리를 걷고 첫 문장에서 끊는다. */
  var NEGATION_LEAD = /^\s*(?:아니다|아니라|틀렸다|그렇지 않다|사실이 아니다|반대다)\s*[.,·—–-]*\s*/;

  function claimText(text) {
    var out = String(text || "").replace(NEGATION_LEAD, "");
    if (!out.trim()) out = String(text || "");
    /* 끝의 마침표를 뗀다. 원문에서 틀린 말 687개는 마침표가 없고 정정문 687개는
       전부 있다(예외 0). 그대로 두면 보기 넷 중 마침표가 혼자 다른 하나가 늘
       정답이라, 내용을 하나도 몰라도 916문항을 전부 맞힌다.
       NEGATION_LEAD 로 "아니다." 앞머리를 걷고 길이를 눕힌 것과 같은 갈래의 손질이다. */
    return plainText(firstSentence(out, 70, 10)).replace(/[.。]+$/, "");
  }

  /* 흐름 도해에서 "이어 붙은 네 마디" 를 모은다. 띄엄띄엄 뽑으면 사이가 빠진
     채로 차례를 묻게 되므로 붙어 있는 넷만 본다. 같은 이름이 두 번 들어간 창은
     버린다 — "A → B → C → A" 는 늘어놓는 답이 하나로 정해지지 않는다. */
  function windowsOf(names) {
    var out = [];
    for (var i = 0; i + 4 <= names.length; i++) {
      var win = names.slice(i, i + 4);
      var seen = {};
      var ok = true;
      for (var j = 0; j < 4; j++) {
        if (!win[j] || seen[win[j]]) { ok = false; break; }
        seen[win[j]] = true;
      }
      if (ok) out.push(win);
    }
    return out;
  }

  /* 마디 이름이 길면 네 개를 이어 붙인 보기가 한 화면을 넘는다.
     네 보기가 같은 글자를 차례만 바꿔 담으므로, 자른 자국은 어느 보기에나
     똑같이 남는다. 그래서 여기서 자르는 것은 힌트가 되지 않는다. */
  function clipNode(text) {
    var s = plainText(text);
    if (s.length <= 20) return s;
    var cut = s.slice(0, 20);
    var space = cut.lastIndexOf(" ");
    return (space >= 10 ? cut.slice(0, space) : cut) + "…";
  }

  /* 마디 이름은 도해의 "누가" 다. 그런데 흐름 도해는 같은 사람이 여러 번
     나오는 일이 흔하다 (사용자 → Agent → 도구 → Agent → Agent).
     이름으로는 네 마디가 서지 않는 도해가 229편 중 66편이라,
     그런 도해에서는 이름 대신 "무엇을 하는지" 를 짧게 잘라 마디로 쓴다. */
  function flowWindows(dia) {
    if (!dia || dia.shape !== "흐름") return [];
    var byName = windowsOf(dia.rows.map(function (row) { return plainText(row.who); }));
    if (byName.length) return byName;
    return windowsOf(dia.rows.map(function (row) { return clipNode(row.what || row.who); }));
  }

  /* 퀴즈 화면은 도해를 그리지 않는다. 그래서 ```도해 원문을 그대로 지문에 넣으면
     코드블록 한 덩어리가 떨어진다. 마디 이름만 이어 한 줄로 눕힌다.
     흐름은 화살표로, 대조와 층은 나열로 잇는다 — 층을 화살표로 이으면
     차례가 있는 것처럼 읽혀서 그림이 하는 말이 달라진다. */
  var DIA_LINK = { "흐름": " → ", "대조": " · ", "층": " · " };

  function isBlank(text) {
    return !String(text).replace(/[_\s]/g, "").length;
  }

  function diaLine(dia, term) {
    if (!dia) return "";
    var parts = [];
    dia.rows.forEach(function (row) {
      /* 대조 도해의 첫 마디는 데이터가 아니라 칸 이름 줄이다(who 가 비고 right 가 있다).
         js/ui.js 의 diaCompare 가 쓰는 판정과 같게 맞춘다. 안 걸러내면 표의 머리글이
         그림의 한 마디인 척 지문에 실린다. */
      if (!row.who && row.right) return;
      /* 대조 마디의 what 에는 "왼쪽 || 오른쪽" 이 원문 그대로 남아 있다.
         "||" 는 노트의 문법 기호지 사람이 읽는 글자가 아니다. */
      var raw = row.left && row.right ? row.left + " 대 " + row.right : (row.who || row.what);
      // 지문에 이 단어 이름이 마디로 들어 있으면, 보기의 제목과 이름만 맞춰도 답이 나온다
      var node = maskName(plainText(raw), term);
      // 마디 이름이 곧 이 단어 이름이면 빈칸만 남는다. 그 줄은 하는 일로 대신한다.
      if (isBlank(node)) node = maskName(clipNode(row.what), term);
      if (!isBlank(node)) parts.push(node);
    });
    // 살아남은 마디가 하나뿐이면 그림이 아무 말도 하지 않는다. 그 문제는 내지 않는다.
    return parts.length >= 2 ? parts.join(DIA_LINK[dia.shape] || " · ") : "";
  }

  /* 단어 하나에서 뽑아낸 재료를 한 번만 다듬어 들고 있는다.
     본문이 아직 없는 단어는 담아두지 않는다. 나중에 도착하기 때문이다. */
  var EMPTY_FACTS = { claims: [], cases: [], dia: null, orders: [], figureLine: "", analogyAsk: "" };
  var facts = {};

  /* 틀린 말은 이름을 대놓고 부르고("Apache 가 웹사이트를 만들어준다"), 정정문은
     주어를 생략하는 일이 많다 — 실측으로 25% 대 6% 다. 그대로 두면 넷 중
     "이름이 든 것" 만 골라도 꽤 맞는 문제가 된다. 어느 쪽인지 표시해 두고,
     오답도 같은 쪽에서 먼저 찾는다. */
  var PROPER_NAME = /[A-Z][A-Za-z0-9./+-]{2,}/;

  function claimsOf(body) {
    var out = [];
    (body.myths || []).forEach(function (myth) {
      if (!myth || !myth.wrong || !myth.right) return;
      var wrong = claimText(myth.wrong);
      var right = claimText(myth.right);
      if (!wrong || !right) return;
      out.push({
        // full 은 자르지 않은 정정문이다. 되짚어 설명할 때는 원문을 보여준다.
        wrong: wrong, right: right, full: plainText(myth.right),
        wrongNamed: PROPER_NAME.test(wrong), rightNamed: PROPER_NAME.test(right),
      });
    });
    return out;
  }

  function caseTexts(body, term) {
    var out = [];
    (body.cases || []).forEach(function (item) {
      if (!item || !item.note) return;
      var text = maskName(plainText(item.note), term);
      if (text) out.push(text);
    });
    return out;
  }

  function factsOf(term) {
    if (facts[term.id]) return facts[term.id];
    var body = bodyOf(term);
    if (!body) return EMPTY_FACTS;

    var dia = body.dia && body.dia.rows && body.dia.rows.length ? body.dia : null;
    var analogy = plainText(body.analogy);

    facts[term.id] = {
      claims: claimsOf(body),
      cases: caseTexts(body, term),
      dia: dia,
      orders: flowWindows(dia),
      figureLine: diaLine(dia, term),
      analogyAsk: analogy && !mentionsName(analogy, term) ? analogy : "",
    };
    return facts[term.id];
  }

  /* ---------------------------------------------------------- 권 단위 후보

     오답은 같은 권 안에서 뽑는다(맨 위 규칙). 그런데 "이 권에서 오해를 적어둔
     단어가 셋 이상인가" 같은 물음은 단어마다 답이 같다. 범위 화면은
     countQuestions 를 열네 번 부르는데 그때마다 권 전체를 다시 훑으면
     229편 × 아홉 유형이 그만큼 곱해진다. 권 단위로 한 번만 세어 들고 있는다.

     본문은 나중에 도착하므로, 실린 권이 달라지면 세어둔 것을 버리고 다시 센다. */
  var groups = { pool: null, stamp: "", byBook: {} };

  function groupOf(term, pool) {
    var stamp = Object.keys(window.VOCAB_TERMS || {}).sort().join(",");
    if (groups.pool !== pool || groups.stamp !== stamp) {
      groups = { pool: pool, stamp: stamp, byBook: {} };
      facts = {};
    }
    if (groups.byBook[term.bookId]) return groups.byBook[term.bookId];

    var members = pool.filter(function (x) { return x.bookId === term.bookId; });
    // 같은 단어장에 후보가 모자라면 전체에서 보충한다
    if (members.length < 4) members = pool;

    var group = { terms: members, myth: [], dia: [] };
    members.forEach(function (t) {
      var f = factsOf(t);
      if (f.claims.length) group.myth.push(t);
      if (f.dia && f.dia.title) group.dia.push(t);
    });
    groups.byBook[term.bookId] = group;
    return group;
  }

  function otherCount(group, target) {
    return group.terms.length - (hasId(group.terms, target.id) ? 1 : 0);
  }

  /* ---------------------------------------------------------- 보기 조립

     sourceId 는 이 보기가 어느 단어에서 왔는지다. 틀렸을 때
     "고른 게 뭐였는지"를 되짚어 설명하려면 이 연결이 있어야 한다.

     보기 넷을 세우고 마지막에 스스로 점검한다. 정답이 하나가 아니거나 글이
     겹치는 보기가 있으면 그 문제를 통째로 버린다. 겹친 보기는 그 자체로 힌트가
     되고, 어느 쪽을 눌러도 맞는 문제는 학습을 망친다. 유형이 아홉이 되면서
     이 점검을 유형마다 손으로 하기는 어려워졌다 — 한 자리에서 한다. */
  function assemble(key, answer, wrongs) {
    if (!answer || !answer.text || !wrongs || wrongs.length < 3) return null;

    var raw = [answer].concat(wrongs.slice(0, 3));
    var picked = [];
    var seen = {};
    for (var i = 0; i < raw.length; i++) {
      var text = plainText(raw[i].text);
      var norm = text.toLowerCase();
      if (!text || seen[norm]) return null;
      seen[norm] = true;
      picked.push({ sourceId: raw[i].sourceId || null, text: text, correct: i === 0 });
    }

    return shuffle(picked).map(function (o, i) {
      return { id: key + "-" + i, sourceId: o.sourceId, text: o.text, correct: o.correct };
    });
  }

  /* 같은 글이 두 번 실릴 후보를 미리 걸러둔다.

     거르는 기준은 글자다. id 로만 걸러서는 모자란다 — Store.allTerms() 는 부를
     때마다 Object.assign 으로 새 객체를 만들기 때문에, 정답과 후보를 서로 다른
     호출에서 얻으면 같은 단어인데도 다른 객체가 되어 필터를 통과한다. 그러면
     보기 둘이 같은 글이 되고, 중복 자체가 정답을 알려주는 힌트가 된다.

     또 고른 뒤에 assemble 이 버리면 그 문제가 통째로 사라져서, 미리 센 문항 수와
     실제로 나온 수가 어긋난다. 화면이 "10문제" 라 해놓고 9문제를 내는 자리가
     여기다. 고르기 전에 거르면 그 어긋남이 생기지 않는다. */
  function uniqueTexts(candidates, answerText) {
    var seen = {};
    if (answerText) seen[plainText(answerText).toLowerCase()] = true;
    return candidates.filter(function (c) {
      var key = plainText(c.text).toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  /* 길이가 비슷한 오답을 고른다.
     정답만 유난히 길거나 짧으면 내용을 몰라도 그것만 보고 고를 수 있다.
     보기가 고르게 보이는 건 덤이다. */
  function nearestByLength(candidates, answerText, n) {
    var length = plainText(answerText).length;
    var gap = function (c) { return Math.abs(c.text.length - length) + (c.penalty || 0); };
    var ranked = uniqueTexts(candidates, answerText).sort(function (a, b) {
      return gap(a) - gap(b);
    });
    // 가장 가까운 후보들 안에서 무작위로 뽑는다. 매번 같은 오답이 나오면 외워버린다.
    return shuffle(ranked.slice(0, Math.max(n * 2, 6))).slice(0, n);
  }

  // 보기가 용어 이름인 유형(설명·비유·사례)이 함께 쓴다
  function nameOptions(group, target, n) {
    var candidates = group.terms
      .filter(function (t) { return t.id !== target.id; })
      .map(function (t) { return { text: t.term, sourceId: t.id }; });
    return shuffle(uniqueTexts(candidates, target.term)).slice(0, n);
  }

  /* ---------------------------------------------------------- 1) 설명 -> 용어 */

  function canMeaning(target, group) {
    return target.summary && otherCount(group, target) >= 3 ? 1 : 0;
  }

  function makeMeaningQuestion(target, group) {
    var options = assemble(target.id + ":meaning",
      { text: target.term, sourceId: target.id },
      nameOptions(group, target, 3));
    if (!options) return null;

    return {
      kind: KINDS.MEANING,
      termId: target.id,
      prompt: "다음 설명에 해당하는 용어는?",
      quote: blankSubject(target.summary, target),
      options: options,
      explain: target.summary,
    };
  }

  /* ---------------------------------------------------------- 2) 용어 -> 설명 */

  function optionText(term) {
    return plainText(firstSentence(stripSubject(term.summary, term), 110));
  }

  function canDefine(target, group) {
    return target.summary && otherCount(group, target) >= 3 ? 1 : 0;
  }

  function makeDefineQuestion(target, group) {
    var mine = optionText(target);
    var candidates = group.terms
      .filter(function (t) { return t.id !== target.id && t.summary; })
      .map(function (t) { return { text: optionText(t), sourceId: t.id }; });

    var options = assemble(target.id + ":define",
      { text: mine, sourceId: target.id },
      nearestByLength(candidates, mine, 3));
    if (!options) return null;

    return {
      kind: KINDS.DEFINE,
      termId: target.id,
      prompt: target.term + "의 설명으로 맞는 것은?",
      quote: null,
      options: options,
      explain: target.summary,
    };
  }

  /* ---------------------------------------------------------- 3) 관계

     노트의 "관련 용어"를 정답으로 쓴다.
     내가 직접 연결해둔 개념이라 정답 근거가 노트 안에 있다. */

  /* 이름이 서로를 품는 관련 용어는 정답에서 뺀다.
     "HTTPS 하면 같이 나오는 개념은?" 의 답이 HTTP 면, 내용을 몰라도 물음에 든
     글자와 겹치는 보기를 고르면 맞는다. 물음 안에 답이 적힌 셈이다. */
  function relatedAnswers(target) {
    var name = String(target.term || "").toLowerCase();
    return (target.related || []).filter(function (r) {
      var other = String(r.term || "").toLowerCase();
      return other && name.indexOf(other) === -1 && other.indexOf(name) === -1;
    });
  }

  function relatedPool(target, group) {
    if (!relatedAnswers(target).length) return null;

    var linked = {};
    target.related.forEach(function (r) { linked[r.term.toLowerCase()] = true; });

    var unrelated = group.terms.filter(function (t) {
      return t.id !== target.id && !linked[t.term.toLowerCase()];
    });
    return unrelated.length >= 3 ? unrelated : null;
  }

  function canRelated(target, group) {
    return relatedPool(target, group) ? 1 : 0;
  }

  function makeRelatedQuestion(target, group) {
    var unrelated = relatedPool(target, group);
    if (!unrelated) return null;

    var answers = relatedAnswers(target);
    var answer = answers[Math.floor(Math.random() * answers.length)];
    // 정답은 노트의 "관련 용어"라서 이 목업에 단어로 없을 수 있다. sourceId 는 null 이 된다.
    var options = assemble(target.id + ":related",
      { text: answer.term, sourceId: null },
      shuffle(uniqueTexts(unrelated.map(function (t) {
        return { text: t.term, sourceId: t.id };
      }), answer.term)).slice(0, 3));
    if (!options) return null;

    return {
      kind: KINDS.RELATED,
      termId: target.id,
      /* "X 와(과)" 는 조사를 고르지 못해 병기한 흔적이라 서비스에서 바로 티가 난다.
         영문 약어는 한글 읽기의 받침을 알아야 와/과가 정해지는데 그 정보가 없다.
         조사가 필요 없는 문장으로 바꾼다. */
      prompt: target.term + " 하면 같이 나오는 개념은?",
      quote: null,
      options: options,
      explain: answer.note ? answer.term + ": " + answer.note : target.summary,
    };
  }

  /* ---------------------------------------------------------- 4) 오해 가리기

     노트의 흔한 오해는 "틀린 말 + 정정문" 쌍이다. 반쯤 이해한 사람이 실제로
     걸려 넘어지는 지점을 저자가 골라 적어둔 자리라, 물을 값어치가 가장 크다.

     O/X 로 내지 않는다. 보기가 둘이면 찍어서 절반을 맞고, 맞은 절반이
     "안다" 로 기록되어 복습 목록이 실력과 어긋난다. 넷 중 하나로 낸다. */

  function mythSourceCount(target, group) {
    return group.myth.length - (hasId(group.myth, target.id) ? 1 : 0);
  }

  /* 오답 후보 하나가 얼마나 어울리지 않는지. 작을수록 좋은 오답이다.
     길이 차이를 그대로 쓰되, 이름을 부르는지가 정답과 다르면 벌점을 얹는다.
     벌점 12 는 "열두 자쯤 길이가 어긋난 것보다는 나쁘다" 는 뜻이다 —
     길이 맞추기를 완전히 밀어내지 않으면서 이름 유무를 먼저 보게 하는 값이다. */
  var NAME_PENALTY = 12;

  function claimGap(claim, field, length, wantNamed) {
    var gap = Math.abs(claim[field].length - length);
    return claim[field + "Named"] === wantNamed ? gap : gap + NAME_PENALTY;
  }

  // 같은 권 다른 단어에서 문장을 하나씩만 받는다. 한 단어가 보기를 둘 채우면
  // 그 둘은 답이 아니라는 게 내용이 아니라 모양으로 드러난다.
  function claimsFrom(group, target, field, length, wantNamed) {
    var out = [];
    group.myth.forEach(function (t) {
      if (t.id === target.id) return;
      var theirs = factsOf(t).claims;
      var best = theirs[0];
      for (var i = 1; i < theirs.length; i++) {
        if (claimGap(theirs[i], field, length, wantNamed) < claimGap(best, field, length, wantNamed)) {
          best = theirs[i];
        }
      }
      if (!best) return;
      out.push({
        text: best[field],
        sourceId: t.id,
        penalty: best[field + "Named"] === wantNamed ? 0 : NAME_PENALTY,
      });
    });
    return out;
  }

  /* 같은 권의 문장 길이가 어디쯤에 몰려 있는지 자리값 하나로 돌려준다.
     ratio 0.6 이면 "열에 여섯보다는 긴" 길이다. */
  function claimLengthMark(group, target, field, ratio) {
    var lens = [];
    group.myth.forEach(function (t) {
      if (t.id === target.id) return;
      factsOf(t).claims.forEach(function (claim) { lens.push(claim[field].length); });
    });
    if (!lens.length) return 0;
    lens.sort(function (a, b) { return a - b; });
    return lens[Math.min(lens.length - 1, Math.floor(lens.length * ratio))];
  }

  function canMyth(target, group) {
    var mine = factsOf(target).claims;
    return mine.length && mythSourceCount(target, group) >= 3 ? mine.length : 0;
  }

  function makeMythQuestion(target, group, variant) {
    var mine = factsOf(target).claims;
    if (!mine.length) return null;
    var pick = mine[variant % mine.length];

    /* 오답은 같은 권 다른 단어의 정정문이다. 정정문은 참인 문장이라
       "사실이 아닌 것" 을 고르는 문제의 오답으로 알맞다. */
    var options = assemble(target.id + ":myth" + variant,
      { text: pick.wrong, sourceId: target.id },
      nearestByLength(claimsFrom(group, target, "right", pick.wrong.length, pick.wrongNamed), pick.wrong, 3));
    if (!options) return null;

    return {
      kind: KINDS.MYTH,
      termId: target.id,
      /* "이 단어에 대해 틀린 것" 으로 좁히면 안 된다. 오답으로 쓴 정정문은
         다른 단어를 두고 한 말이라 이 단어에 대해서는 참도 거짓도 아니다.
         물음을 넓게 내야 네 보기가 같은 자격으로 놓인다. */
      prompt: "다음 중 사실이 아닌 것은?",
      quote: null,
      options: options,
      explain: pick.full,
    };
  }

  /* ---------------------------------------------------------- 5) 사실 고르기

     4 와 정반대다. 정정문이 정답이고 다른 단어의 틀린 말이 오답이다.
     같은 재료를 뒤집어 물어야 "틀린 것 고르기" 요령만 익히는 일이 없다. */

  function canMythPick(target, group) {
    return factsOf(target).claims.length && mythSourceCount(target, group) >= 3 ? 1 : 0;
  }

  function makeMythPickQuestion(target, group) {
    var mine = factsOf(target).claims;
    if (!mine.length) return null;

    /* 어느 오해를 물을지는 무작위로 고르지 않는다. 정정문은 틀린 말보다 길다
       (실측 중간값 25자 대 18자). 아무 정정문이나 물으면 정답이 넷 중 혼자
       길어져서, 내용을 몰라도 가장 긴 것만 골라 절반 가까이 맞는다(실측 46%).

       그래서 같은 권의 틀린 말들이 어느 길이에 몰려 있는지를 먼저 보고,
       그 언저리에 있는 정정문을 고른다. 오답이 정답보다 길기도 짧기도 해야
       길이가 아무것도 알려주지 않는다. */
    var mark = claimLengthMark(group, target, "wrong", 0.6);
    var pick = shuffle(mine)[0];
    mine.forEach(function (claim) {
      if (Math.abs(claim.right.length - mark) < Math.abs(pick.right.length - mark)) pick = claim;
    });

    // 물을 것이 정해졌으니, 단어마다 그 길이에 가장 가까운 틀린 말로 다시 받는다
    var options = assemble(target.id + ":mythpick",
      { text: pick.right, sourceId: target.id },
      nearestByLength(claimsFrom(group, target, "wrong", pick.right.length, pick.rightNamed), pick.right, 3));
    if (!options) return null;

    return {
      kind: KINDS.MYTH_PICK,
      termId: target.id,
      prompt: "다음 중 사실인 것은?",
      quote: null,
      options: options,
      // 고른 문장이 어느 단어 이야기였는지를 알려주는 게 이 유형의 배울 거리다
      explain: target.summary,
    };
  }

  /* ---------------------------------------------------------- 6) 비유 */

  function canAnalogy(target, group) {
    return factsOf(target).analogyAsk && otherCount(group, target) >= 3 ? 1 : 0;
  }

  function makeAnalogyQuestion(target, group) {
    var quote = factsOf(target).analogyAsk;
    if (!quote) return null;

    var options = assemble(target.id + ":analogy",
      { text: target.term, sourceId: target.id },
      nameOptions(group, target, 3));
    if (!options) return null;

    return {
      kind: KINDS.ANALOGY,
      termId: target.id,
      prompt: "이 비유가 가리키는 개념은?",
      quote: quote,
      options: options,
      explain: target.summary,
    };
  }

  /* ---------------------------------------------------------- 7) 그림

     지문은 도해를 글로 눕힌 한 줄이다(diaLine). 보기는 도해가 답하는 질문 넷. */

  /* 지문은 마디 이름을 이은 한 줄인데, 한 단어장 안에서는 등장인물이 몇 안 된다 —
     보안·네트워크 권은 브라우저·서버·사용자·클라이언트가 거의 전부다. 그래서 서로
     다른 도해가 같은 한 줄이 되는 일이 생기고, 그때 오답으로 뽑힌 단어의 제목도
     그 지문에 똑같이 들어맞는다. 학습자는 동전을 던지게 된다.
     마디를 낱말 집합으로 보고 같으면 오답 후보에서 뺀다. */
  function nodeKey(term) {
    var line = factsOf(term).figureLine;
    if (!line) return "";
    return line.split(/\s*(?:→|·|대)\s*/).map(function (x) { return x.trim(); })
      .filter(Boolean).sort().join("|");
  }

  function figureRivals(target, group) {
    var mineKey = nodeKey(target);
    return group.dia.filter(function (t) {
      if (t.id === target.id) return false;
      var data = factsOf(t);
      if (!data.dia || !data.dia.title) return false;
      // 지문이 같아지는 것은 오답이 아니라 또 하나의 정답이다
      return !mineKey || nodeKey(t) !== mineKey;
    });
  }

  function canFigure(target, group) {
    var data = factsOf(target);
    if (!data.dia || !data.dia.title || !data.figureLine) return 0;
    return figureRivals(target, group).length >= 3 ? 1 : 0;
  }

  function makeFigureQuestion(target, group) {
    var data = factsOf(target);
    var dia = data.dia;
    if (!dia || !dia.title || !data.figureLine) return null;

    var mine = plainText(dia.title);
    var candidates = figureRivals(target, group)
      .map(function (t) { return { text: plainText(factsOf(t).dia.title), sourceId: t.id }; });

    var options = assemble(target.id + ":figure",
      { text: mine, sourceId: target.id },
      nearestByLength(candidates, mine, 3));
    if (!options) return null;

    return {
      kind: KINDS.FIGURE,
      termId: target.id,
      prompt: "이 그림이 답하는 질문은?",
      quote: data.figureLine,
      options: options,
      explain: dia.sum || target.summary,
    };
  }

  /* ---------------------------------------------------------- 8) 순서

     흐름 도해에서만 낸다. 끌어다 놓기를 만들지 않는다 —
     390px 화면에서 드래그는 스크롤과 싸우고, 그걸 피하려면 화면 장치가 늘어난다.
     대신 늘어놓은 것 넷 중 하나를 고르게 한다. */

  /* 오답 셋을 만드는 법.

     예전에는 정답에서 두 마디를 맞바꾼 것 셋이었다. 그러면 정답이 넷 중
     한가운데에 서고, 도해를 한 번도 안 본 사람이 "나머지 셋과 가장 덜
     다른 것" 하나만 골라 **100%** 맞힌다(20만 번 모의). 자리별 다수결로도
     85% 였다. 찍기가 25% 인 문제에서 이건 이해를 재는 게 아니다.

     그래서 자리 넷을 한 고리로 도는 순열(4-순환)만 쓴다. 정답에 그것을
     한 번, 두 번, 세 번 먹인 것이 오답 셋이다. 그러면 넷 중 어느 둘을
     집어도 네 자리가 전부 다르므로, 구조에서 새어 나오는 정보가 0 이 된다.
     같은 모의에서 다수결 25.0%(=찍기), 중심·변두리 공격은 아예 못 고른다.

     푸는 쪽에서 보면 "어느 마디가 먼저 오는가" 하나로 셋이 걸러진다.
     그건 도해를 읽었어야 아는 것이다. */
  var ROTORS = [
    [1, 2, 3, 0], [1, 3, 0, 2], [2, 0, 3, 1],
    [2, 3, 1, 0], [3, 0, 1, 2], [3, 2, 0, 1],
  ];

  function canOrder(target) {
    return factsOf(target).orders.length ? 1 : 0;
  }

  function makeOrderQuestion(target) {
    var data = factsOf(target);
    if (!data.orders.length) return null;
    var right = data.orders[Math.floor(Math.random() * data.orders.length)];
    if (right.length !== 4) return null;

    // security-ok: OWASP-A02-2 — 보기 넷을 어느 방향으로 돌릴지 고르는 값이다. 비밀이 아니다.
    var rotor = ROTORS[Math.floor(Math.random() * ROTORS.length)];
    var wrongs = [];
    var cur = right;
    for (var w = 0; w < 3; w++) {
      cur = [cur[rotor[0]], cur[rotor[1]], cur[rotor[2]], cur[rotor[3]]];
      wrongs.push({ text: cur.join(" → "), sourceId: null });
    }

    var options = assemble(target.id + ":order",
      { text: right.join(" → "), sourceId: target.id }, wrongs);
    if (!options) return null;

    return {
      kind: KINDS.ORDER,
      termId: target.id,
      prompt: "네 마디를 바르게 늘어놓은 것은?",
      // 무엇의 차례인지는 도해가 답하는 질문이 알려준다
      quote: data.dia && data.dia.title ? plainText(data.dia.title) : target.term,
      options: options,
      explain: (data.dia && data.dia.sum) || target.summary,
    };
  }

  /* ---------------------------------------------------------- 9) 사례 */

  function canCase(target, group) {
    return factsOf(target).cases.length && otherCount(group, target) >= 3 ? 1 : 0;
  }

  function makeCaseQuestion(target, group) {
    var list = factsOf(target).cases;
    if (!list.length) return null;

    var options = assemble(target.id + ":case",
      { text: target.term, sourceId: target.id },
      nameOptions(group, target, 3));
    if (!options) return null;

    return {
      kind: KINDS.CASE,
      termId: target.id,
      prompt: "이 상황에 해당하는 개념은?",
      // 이름은 factsOf 가 이미 빈칸으로 덮어두었다
      quote: list[Math.floor(Math.random() * list.length)],
      options: options,
      explain: target.summary,
    };
  }

  /* ----------------------------------------------------------

     유형 목록. can() 은 "이 단어로 몇 문제를 낼 수 있나" 를 세기만 하고
     문제를 만들지 않는다 — 범위 화면이 열네 번 세는데 그때마다 229편 ×
     아홉 유형을 실제로 구우면 화면 전환에서 눈에 띄게 걸린다.
     흔한 오해만 단어당 셋까지 나오고 나머지는 하나씩이다. */
  var TYPES = [
    { kind: KINDS.MEANING, can: canMeaning, make: makeMeaningQuestion },
    { kind: KINDS.DEFINE, can: canDefine, make: makeDefineQuestion },
    { kind: KINDS.RELATED, can: canRelated, make: makeRelatedQuestion },
    { kind: KINDS.MYTH, can: canMyth, make: makeMythQuestion },
    { kind: KINDS.MYTH_PICK, can: canMythPick, make: makeMythPickQuestion },
    { kind: KINDS.ANALOGY, can: canAnalogy, make: makeAnalogyQuestion },
    { kind: KINDS.FIGURE, can: canFigure, make: makeFigureQuestion },
    { kind: KINDS.ORDER, can: canOrder, make: makeOrderQuestion },
    { kind: KINDS.CASE, can: canCase, make: makeCaseQuestion },
  ];

  /* 한 바퀴 안에서 유형을 번갈아 뽑는다.
     그냥 섞으면 앞쪽 여덟 문제가 같은 유형으로 몰리는 판이 실제로 나온다.
     유형별 줄을 세워 한 개씩 돌아가며 꺼내면 한 판이 고르게 섞인다. */
  function byKindTurns(slots) {
    var lanes = {};
    var order = [];
    slots.forEach(function (slot) {
      if (!lanes[slot.type.kind]) {
        lanes[slot.type.kind] = [];
        order.push(slot.type.kind);
      }
      lanes[slot.type.kind].push(slot);
    });

    order = shuffle(order);
    var out = [];
    var moved = true;
    while (moved) {
      moved = false;
      for (var i = 0; i < order.length; i++) {
        var lane = lanes[order[i]];
        if (lane.length) {
          out.push(lane.shift());
          moved = true;
        }
      }
    }
    return out;
  }

  /* 낼 문제의 차례를 정한다. 여기서는 아직 만들지 않는다 —
     한 판에 쓰는 건 여덟에서 서른 개인데 229편 × 아홉 유형을 다 구우면 느리다.

     단어 하나에서 여러 문제를 낼 수 있게 됐지만, 한 판에 같은 단어가 몰리면
     그 판은 한 단어 시험이 된다. 그래서 바퀴를 나눠 돈다 —
     먼저 단어마다 한 문제씩 돌고(첫 바퀴), 그래도 모자라면 두 바퀴째로 넘어간다. */
  function planSlots(targets, pool) {
    var waves = [];
    /* 유형별로 지금까지 몇 자리를 앞바퀴에 넣었는지. 무작위로 섞으면 안 된다 —
       "맞는 말인지 가리기" 는 단어당 슬롯이 세 개(오해 세 항목)라 뽑힐 확률이
       세 배다. 권 하나(30편)로 30문제를 내면 한 판의 절반 이상이 그 유형이 되고
       끝은 통째로 그것만 남는다. 덜 쓰인 유형을 먼저 집어 앞바퀴를 고르게 한다. */
    var used = {};

    shuffle(targets).forEach(function (target) {
      var group = groupOf(target, pool);
      var slots = [];
      TYPES.forEach(function (type) {
        var n = type.can(target, group);
        for (var i = 0; i < n; i++) {
          slots.push({ target: target, group: group, type: type, variant: i });
        }
      });

      // 같은 값끼리는 순서가 갈리지 않게 먼저 섞고, 그 위에서 안정 정렬한다.
      shuffle(slots)
        .map(function (slot, i) { return { slot: slot, i: i }; })
        .sort(function (a, b) {
          var ka = used[a.slot.type.kind] || 0;
          var kb = used[b.slot.type.kind] || 0;
          return ka - kb || a.i - b.i;
        })
        .forEach(function (item, wave) {
          var slot = item.slot;
          // 앞바퀴일수록 무겁게 센다. 뒷바퀴는 어차피 짧은 판에서 안 쓰인다.
          used[slot.type.kind] = (used[slot.type.kind] || 0) + (wave === 0 ? 1 : 0.25);
          if (!waves[wave]) waves[wave] = [];
          waves[wave].push(slot);
        });
    });

    var out = [];
    waves.forEach(function (wave) { out = out.concat(byKindTurns(wave)); });
    return out;
  }

  /* 출제 범위를 받아서 문제 묶음을 만든다.
     targets 가 부족하면 있는 만큼만 낸다. 억지로 채우지 않는다. */
  function build(targets, pool, limit) {
    var cap = limit || 8;
    if (!targets || !targets.length || cap < 1) return [];

    var slots = planSlots(targets, pool);
    var questions = [];
    for (var i = 0; i < slots.length && questions.length < cap; i++) {
      var slot = slots[i];
      var q = slot.type.make(slot.target, slot.group, slot.variant);
      // 보기가 겹쳐서 버려진 문제는 건너뛰고 다음 차례로 넘어간다
      if (q) questions.push(q);
    }
    return questions;
  }

  /* 범위를 고르기 전에 "몇 문제인지" 알려주기 위한 셈.

     build() 를 미리 돌려서 세면 안 된다 — 그 안에서 섞기 때문에 미리 본 개수와
     실제로 나오는 개수가 달라질 수 있다. 화면이 코드가 하지 않는 말을 하게 된다.
     그래서 섞지도, 문제를 만들지도 않고 "낼 수 있는 문제 수" 만 더한다.
     단어 하나가 여러 문제를 내게 됐으므로 단어 수가 아니라 문제 수를 센다. */
  function capacityOf(target, pool) {
    var group = groupOf(target, pool);
    var n = 0;
    TYPES.forEach(function (type) { n += type.can(target, group); });
    return n;
  }

  function countQuestions(targets, pool, limit) {
    var cap = limit || 8;
    var n = 0;
    if (!targets || cap < 1) return 0;
    for (var i = 0; i < targets.length && n < cap; i++) {
      n += capacityOf(targets[i], pool);
    }
    return Math.min(n, cap);
  }

  return { build: build, countQuestions: countQuestions, KINDS: KINDS };
})();
