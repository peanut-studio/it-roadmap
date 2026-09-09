/* ============================================================
   UI 기본 도구 — 이스케이프, 아이콘, 마크다운 렌더러
   ============================================================ */

window.UI = (function () {
  "use strict";

  /* ---------------------------------------------------------- 아이콘
     Lucide(ISC) 의 24x24 스트로크 지오메트리. 굵기와 크기를 통일한다.
     이모지를 아이콘으로 쓰지 않는다. 플랫폼마다 모양이 달라진다. */
  var PATHS = {
    home:
      '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>' +
      '<path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    book:
      '<path d="M12 7v14"/>' +
      '<path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    quiz: '<path d="M21.8 10A10 10 0 1 1 17 3.34"/><path d="m9 11 3 3L22 4"/>',
    chart:
      '<path d="M3 3v16a2 2 0 0 0 2 2h16"/>' +
      '<path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    forward: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    circle: '<circle cx="12" cy="12" r="9"/>',
    "check-double": '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    sun:
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>' +
      '<path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/>' +
      '<path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"/>',
    layers:
      '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>' +
      '<path d="M2 12.18a1 1 0 0 0 .6.9l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 .6-.91"/>' +
      '<path d="M2 17.18a1 1 0 0 0 .6.9l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 .6-.91"/>',
    inbox:
      '<path d="M22 12h-6l-2 3h-4l-2-3H2"/>' +
      '<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  };

  /* 화면에 들어가는 모든 문자열은 반드시 여기를 통과한다.
     Obsidian 노트는 내 파일이라 신뢰할 수 있지만, 그렇다고
     원문을 그대로 innerHTML 에 넣는 습관을 들이면 안 된다. */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name, size, className) {
    var px = size || 20;
    return (
      '<svg class="' + esc(className || "") + '" width="' + px + '" height="' + px +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (PATHS[name] || "") + "</svg>"
    );
  }

  /* ---------------------------------------------------------- 마크다운
     Obsidian 노트의 일부 문법만 다룬다. 전체 파서가 아니다.
     순서가 중요하다: 먼저 전부 이스케이프하고 그 다음에 서식을 입힌다.
     그래서 원문에 태그가 들어 있어도 태그로 해석되지 않는다. */

  // 인라인 코드 자리표시자. 본문에 나올 수 없는 private-use 문자를 쓴다.
  // 숫자만으로 표시하면 "최대 3 개" 같은 문구와 충돌한다.
  var OPEN = "\uE000";
  var CLOSE = "\uE001";
  var CODE_SLOT = new RegExp(OPEN + "(\\d+)" + CLOSE, "g");

  function inline(text) {
    var out = esc(text);
    // 코드를 먼저 빼둔다. 코드 안의 별표가 굵게로 해석되면 안 된다.
    var codes = [];
    out = out.replace(/`([^`]+)`/g, function (_, code) {
      codes.push(code);
      return OPEN + (codes.length - 1) + CLOSE;
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    /* 노트끼리 거는 [[링크]] 는 누를 수 있어야 한다. 기울임으로 눕혀 두면
       선행 용어에 막힌 사람이 화면 맨 아래 관련 용어까지 내려가야 빠져나간다.
       이름은 이미 위에서 esc 를 통과했으므로 여기서 또 씌우지 않는다 —
       한 번 더 씌우면 & 가 &amp;amp; 로 굳어 글자와 data 값이 같이 망가진다.
       [[표시|별칭]] 이면 앞의 표시를 쓴다. 누르는 일은 화면 쪽이 위임으로 받는다. */
    out = out.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, function (_, name) {
      return '<button class="xref" type="button" data-term="' + name + '">' + name +
        '<span class="xref__arrow" aria-hidden="true"> ↗</span></button>';
    });
    return out.replace(CODE_SLOT, function (_, i) {
      return "<code>" + codes[Number(i)] + "</code>";
    });
  }

  var BLOCK_START = /^\s*([-*]\s|\d+\.\s|>|#{3,6}\s|\||```)/;

  // 한 종류의 블록을 통째로 집어서 HTML 과 다음 줄 위치를 돌려준다.
  function takeWhile(lines, from, test) {
    var i = from;
    var got = [];
    while (i < lines.length && test(lines[i])) {
      got.push(lines[i]);
      i++;
    }
    return { lines: got, next: i };
  }

  function renderTable(rawLines) {
    var rows = rawLines.map(function (l) {
      return l.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
    });
    // 두 번째 줄이 --- 구분선이면 첫 줄은 머리글이다
    var hasHead = rows.length > 1 && /^:?-{2,}/.test(rows[1][0] || "");
    var html = "<table>";
    if (hasHead) {
      html += "<thead><tr>" + rows[0].map(function (c) {
        return "<th>" + inline(c) + "</th>";
      }).join("") + "</tr></thead>";
    }
    html += "<tbody>" + (hasHead ? rows.slice(2) : rows).map(function (r) {
      return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody>";
    return html + "</table>";
  }

  function renderList(rawLines, ordered) {
    var strip = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
    return "<ul>" + rawLines.map(function (l, n) {
      var text = inline(l.replace(strip, ""));
      return "<li>" + (ordered ? n + 1 + ". " : "") + text + "</li>";
    }).join("") + "</ul>";
  }

  /* ---------------------------------------------------------- 코드펜스
     노트의 ``` 블록 167개 중 113개는 코드가 아니다. 언어 태그가 없고,
     이모지와 화살표로 개념의 흐름을 그린 "도해"이거나 자리를 맞춘 표다.
     이걸 <pre><code> 로 내보내면 차분하게 짜놓은 화면을 콘텐츠가 뚫고 나온다.
     원본 Markdown 은 그대로 두고, 읽는 쪽에서 세 종류로 갈라 조판한다.

       언어 태그 있음        -> 진짜 코드. 고정폭 유지
       화살표/이모지 있음     -> 개념 도해. 본문 폰트로 눕힌다
       두 칸 이상 띄운 2열    -> 정렬 표. dt/dd 로 세운다  */

  // 노트에서 실제로 쓰인 것만 다룬다. 추측해서 넓히지 않는다.
  var TONES = [
    { chars: "😱❌✗", tone: "bad" },
    { chars: "⚠", tone: "warn" },
    { chars: "✅✓", tone: "good" },
  ];
  var TONE_CHARS = /[😱❌✗⚠✅✓]️?/gu;

  function toneOf(text) {
    var first = String(text).match(TONE_CHARS);
    if (!first) return null;
    var ch = first[0].replace(/️/g, "");
    for (var i = 0; i < TONES.length; i++) {
      if (TONES[i].chars.indexOf(ch) !== -1) return TONES[i].tone;
    }
    return null;
  }

  /* 블록 전체의 톤은 줄들의 톤이 한 방향일 때만 인정한다.
     한 블록 안에서 ✅ 와 ❌ 를 섞어 대조하는 노트가 많은데,
     "첫 이모지가 이긴다"로 하면 한계를 설명하는 블록이 초록색이 되어버린다.
     의견이 갈리면 블록은 중립으로 두고 톤은 줄에만 남긴다. */
  function agreedTone(tones) {
    var seen = tones.filter(Boolean);
    if (!seen.length) return null;
    for (var i = 1; i < seen.length; i++) {
      if (seen[i] !== seen[0]) return null;
    }
    return seen[0];
  }

  function stripTone(text) {
    return String(text).replace(TONE_CHARS, "").replace(/\s{2,}/g, " ").trim();
  }

  var HANGUL = /[가-힣]/;
  var ARROW = /[→⇒➜↓]/;
  var KV_ROW = /^(\S.*?)\s{2,}(\S.*)$/;

  /* 언어 태그를 안 붙이고 쓴 코드가 있다. 특히 SQL 은 한글 주석을 달아두는 일이 많아서
     "한글이 있으면 코드가 아니다" 규칙만으로는 도해로 새어 나간다.
     줄 첫머리의 키워드로 잡는다. 문장 중간의 단어는 보지 않는다 —
     "이 서비스는 UPDATE 가 잦다" 같은 설명문까지 코드로 끌고 가면 안 된다. */
  var CODE_LEAD = /^\s*(SELECT\s|INSERT\s+INTO\s|UPDATE\s+\w+\s+SET\s|DELETE\s+FROM\s|CREATE\s+(TABLE|INDEX)\s|ALTER\s+TABLE\s|WHERE\s|FROM\s+\w|def\s+\w+\s*\(|class\s+\w+|function\s+\w*\s*\(|import\s+\w|const\s+\w+\s*=|let\s+\w+\s*=|return\s|\$\s+\w|npm\s|pip\s+install|docker\s|curl\s+-)/im;

  function looksLikeCode(text) {
    if (CODE_LEAD.test(text)) return true;
    if (HANGUL.test(text)) return false;
    return /[{};()=<>]/.test(text) && (text.match(/[{};()=<>]/g) || []).length >= 3;
  }

  function renderCode(body, lang) {
    var tag = lang ? '<span class="code__lang">' + esc(lang) + "</span>" : "";
    return '<div class="code">' + tag + "<pre><code>" + esc(body) + "</code></pre></div>";
  }

  /* 자리를 맞춘 2열 블록. 왼쪽은 코드 토큰이라 고정폭, 오른쪽은 한글이라 본문 폰트.
     고정폭 안에 한글을 두면 글리프가 없어 자간이 들쭉날쭉해진다. */
  function renderKeyTable(rows) {
    return '<dl class="keytable">' + rows.map(function (r) {
      return '<div class="keytable__row"><dt>' + inline(r[1]) + "</dt><dd>" + inline(r[2]) + "</dd></div>";
    }).join("") + "</dl>";
  }

  function diagramLine(raw, blockTone) {
    var text = raw.trim();
    // 블록 전체가 한 방향이면 테두리와 배경이 이미 말하고 있다.
    // 거기에 줄마다 ✕ 를 또 찍으면 같은 말을 두 번 하는 셈이다.
    var tone = blockTone ? null : toneOf(text);
    var from = ARROW.test(text.charAt(0));            // "→ 결과" — 앞 줄에서 이어진다
    if (from) text = text.replace(/^[→⇒➜↓]\s*/, "");
    var bullet = /^[-*]\s+/.test(text);
    if (bullet) text = text.replace(/^[-*]\s+/, "");
    var head = !from && !bullet && /:$/.test(stripTone(text)); // "시나리오:" — 그룹 제목

    var cls = "diagram__line";
    if (from) cls += " diagram__line--from";
    if (bullet) cls += " diagram__line--item";
    if (head) cls += " diagram__line--head";
    if (tone) cls += " diagram__line--" + tone;

    // 줄 가운데의 화살표는 글자가 아니라 기호다. 따로 감싸서 색과 크기를 준다.
    var body = inline(stripTone(text)).replace(/\s*[→⇒➜]\s*/g,
      ' <span class="diagram__to" aria-hidden="true">→</span> ');

    return "<li class=\"" + cls + "\">" + body + "</li>";
  }

  function renderDiagram(body) {
    var lines = body.split("\n").filter(function (l) { return l.trim(); });
    var tone = agreedTone(lines.map(toneOf));
    var body = lines.map(function (l) { return diagramLine(l, tone); }).join("");
    return '<figure class="diagram' + (tone ? " diagram--" + tone : "") + '">' +
      '<ol class="diagram__flow">' + body + "</ol></figure>";
  }

  /* ------------------------------------------------------------
     도해 — ```도해 블록을 그림으로 바꾼다

     원문이 먼저다. Obsidian 에서 그냥 열어도 읽히는 평문이어야 해서
     표기는 다섯 개뿐이고, 렌더링 없이도 뜻이 통한다.
     모양은 셋 — 흐름 / 대조 / 층. 노트에서 반복되는 설명 형태가 이 셋이다.
     mermaid 를 쓰지 않는 이유: graph 는 가로로 넓어져 390px 에서 못 읽는다.
     문법은 docs/TERM-TEMPLATE.md 에 있다.
     ------------------------------------------------------------ */

  var DIA_SHAPES = { "흐름": "flow", "대조": "compare", "층": "layer" };
  var DIA_MAX_DEPTH = 5; // 층 배경 단계

  function diaRow(raw) {
    var text = raw.trim();
    var back = /^<\s/.test(text) || text === "<";
    if (back) text = text.replace(/^<\s*/, "");

    var who = "";
    var cut = text.indexOf("::");
    if (cut !== -1) {
      who = text.slice(0, cut).trim();
      text = text.slice(cut + 2).trim();
    }

    /* 중립 대조의 "A |=| B". 구분자가 다르니 그대로 "||" 로 가르면 한 칸도 갈라지지
       않는다. 판정을 뗄지 여부만 플래그로 남기고 구분자는 "||" 로 되돌린다 —
       두 칸을 나누는 길이 하나여야 기존 229블록이 지금 모양 그대로 남는다. */
    var even = text.indexOf("|=|") !== -1;
    if (even) text = text.replace(/\|=\|/g, "||");

    var halves = text.split("||"); // 대조에서만 뜻이 있다
    return {
      back: back, who: who, what: text, even: even,
      left: halves[0].trim(), right: (halves[1] || "").trim(),
    };
  }

  function diaParse(source) {
    var lines = String(source).split("\n").filter(function (l) { return l.trim(); });
    if (!lines.length) return null;

    var head = lines[0].match(/^\s*(흐름|대조|층)\s*:\s*(.*)$/);
    if (!head) return null; // 모양 선언이 없으면 도해가 아니다

    var dia = { shape: DIA_SHAPES[head[1]], title: head[2].trim(), rows: [], sum: "", loop: null };
    for (var i = 1; i < lines.length; i++) {
      var line = lines[i].trim();
      var end = line.match(/^=\s*(.+)$/);
      if (end) { dia.sum = end[1].trim(); continue; }
      /* @ 는 마디가 아니라 흐름 전체에 붙는 말이다 — "여기까지 오면 다시 처음으로".
         그래서 = 요약과 같은 방식으로 줄 목록에서 빼내 따로 든다.
         여러 줄이면 마지막 것만 남긴다. 되돌아가는 길이 둘이면 그림은 길로 안 읽힌다.
         자리(마지막 줄)를 강요하는 일은 검사기가 한다. 여기서는 관대하게 받는다. */
      var mark = line.match(/^@\s+(.+)$/);
      if (mark) {
        var it = diaRow(mark[1]);
        dia.loop = { who: it.who, what: it.what };
        continue;
      }
      dia.rows.push(diaRow(line));
    }
    return dia.rows.length ? dia : null;
  }

  var DIA_BACK_ICON =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>';

  var DIA_LOOP_ICON = "↻";
  var DIA_EVEN_SIGN = "◆"; // 판정 없는 대조. ✕ / ✓ 자리에 우열 없이 놓인다

  /* 흐름. 왼쪽 척추선을 따라 번호가 내려간다.
     응답 구간(<)은 척추 색이 바뀌고 한 번 접힌 표시가 들어간다.
     화살표를 위로 돌리지 않는다 — 목록은 어차피 아래로 읽히고,
     방향을 거스르는 화살표는 그림을 설명이 필요한 물건으로 만든다.

     한 바퀴 도는 흐름(@)은 마지막에 번호 없는 마디가 하나 붙고, 왼쪽 바깥에
     난간이 선다. 되돌아가는 길에 번호를 주지 않는 이유는 그게 새 단계가 아니라
     이미 지나온 첫 마디로 돌아간다는 표시이기 때문이다.
     난간과 화살촉은 CSS 가 그린다 — 화살촉은 ol 의 직계 자식이 li 뿐이어야 해서
     첫 마디 안에 얹는다. */
  function diaFlow(dia) {
    var out = "", step = 0, turned = false;
    for (var i = 0; i < dia.rows.length; i++) {
      var row = dia.rows[i];
      if (row.back && !turned) {
        turned = true;
        out += '<li class="dia__turn"><span class="dia__turnmark" aria-hidden="true">' +
          DIA_BACK_ICON + "</span><span>여기서부터 돌아오는 길</span></li>";
      }
      step++;
      out += '<li class="dia__step' + (row.back ? " is-back" : "") + '">' +
        (dia.loop && step === 1 ? '<span class="dia__loopcap" aria-hidden="true"></span>' : "") +
        '<span class="dia__mark" aria-hidden="true">' + step + "</span>" +
        '<span class="dia__body">' +
        (row.who ? '<b class="dia__who">' + inline(row.who) + "</b>" : "") +
        '<span class="dia__what">' + inline(row.what) + "</span></span></li>";
    }
    if (dia.loop) {
      out += '<li class="dia__loop"><span class="dia__loopmark" aria-hidden="true">' +
        DIA_LOOP_ICON + "</span>" +
        '<span class="dia__body">' +
        (dia.loop.who ? '<b class="dia__who">' + inline(dia.loop.who) + "</b>" : "") +
        '<span class="dia__what">' + inline(dia.loop.what) + "</span></span></li>";
    }
    return '<ol class="dia__steps' + (dia.loop ? " dia__steps--loop" : "") + '">' + out + "</ol>";
  }

  /* 대조. 두 칸을 항상 나란히 둔다. 위아래로 쌓으면 각 칸은 편해지지만
     비교가 기억력 문제가 되어버린다. 값어치는 눈이 좌우로 한 번 움직이는 데 있다. */
  function diaCompare(dia) {
    var rows = dia.rows.slice();
    var left = "이전", right = "이후", even = false;
    // 첫 줄이 이름 없이 두 칸만 가지고 있으면 그게 칸 이름이다
    if (rows.length > 1 && !rows[0].who && rows[0].right) {
      left = rows[0].left; right = rows[0].right; even = rows[0].even; rows.shift();
    }

    /* 판정은 칸 이름 줄이 정한다. |=| 면 둘 다 정당한 선택이라는 뜻이라
       색도 기호도 한쪽 편을 들지 않는다 — 세션과 JWT 처럼 거래를 설명하는
       그림에 ✕ 를 찍으면 그림이 본문과 반대되는 말을 한다.
       기존 대조는 왼쪽이 문제, 오른쪽이 해결이라는 전제가 그대로 남는다. */
    var leftCol = even ? "dia__col--even" : "dia__col--bad";
    var rightCol = even ? "dia__col--even" : "dia__col--good";
    var leftCell = even ? "dia__cell--even" : "dia__cell--bad";
    var rightCell = even ? "dia__cell--even" : "dia__cell--good";
    var leftSign = even ? DIA_EVEN_SIGN : "✕";
    var rightSign = even ? DIA_EVEN_SIGN : "✓";

    var head = '<div class="dia__vshead">' +
      '<span class="dia__col ' + leftCol + '"><span class="dia__sign" aria-hidden="true">' + leftSign + "</span>" +
      esc(left) + "</span>" +
      '<span class="dia__col ' + rightCol + '"><span class="dia__sign" aria-hidden="true">' + rightSign + "</span>" +
      esc(right) + "</span></div>";

    var body = rows.map(function (row) {
      return '<div class="dia__vsrow">' +
        (row.who ? '<b class="dia__k">' + inline(row.who) + "</b>" : "") +
        '<span class="dia__cell ' + leftCell + '">' + inline(row.left) + "</span>" +
        '<span class="dia__cell ' + rightCell + '">' + inline(row.right) + "</span></div>";
    }).join("");

    return '<div class="dia__vs">' + head + body + "</div>";
  }

  /* 층. 위에서 아래로 깊어진다. 깊이는 배경 농도로만 말한다 —
     계단처럼 들여쓰면 아래층일수록 폭이 깎여 정작 설명이 긴 층이 가장 좁아진다. */
  function diaLayer(dia) {
    var body = dia.rows.map(function (row, i) {
      return '<li class="dia__layer dia__layer--d' + Math.min(i, DIA_MAX_DEPTH) + '">' +
        '<b class="dia__who">' + inline(row.who || String(i + 1)) + "</b>" +
        '<span class="dia__what">' + inline(row.what) + "</span></li>";
    }).join("");
    return '<ol class="dia__layers">' + body + "</ol>";
  }

  var DIA_DRAW = { flow: diaFlow, compare: diaCompare, layer: diaLayer };

  function renderDohae(source) {
    var dia = diaParse(source);
    if (!dia) return null;
    return '<figure class="dia dia--' + dia.shape + '">' +
      (dia.title ? '<figcaption class="dia__cap">' + inline(dia.title) + "</figcaption>" : "") +
      DIA_DRAW[dia.shape](dia) +
      (dia.sum ? '<p class="dia__sum">' + inline(dia.sum) + "</p>" : "") +
      "</figure>";
  }

  function takeFence(lines, i) {
    /* 한글도 받는다. 언어 태그를 ascii 로만 읽으면 ```도해 의 태그가 빈 문자열이 되어
       도해가 아니라 일반 블록으로 떨어진다. */
    var lang = (lines[i].match(/^\s*```\s*([a-zA-Z0-9_+\-가-힣]*)/) || [])[1] || "";
    var block = takeWhile(lines, i + 1, function (l) { return !/^\s*```/.test(l); });
    var body = block.lines.join("\n");
    var next = block.next + 1;

    /* 문법이 틀린 도해는 코드블록으로 떨어뜨린다. 원문이 사라지는 것보다는 낫다. */
    if (lang === "도해") {
      var drawn = renderDohae(body);
      return { html: drawn || renderCode(body, ""), next: next };
    }

    if (lang || looksLikeCode(body)) return { html: renderCode(body, lang), next: next };

    var rows = block.lines.filter(function (l) { return l.trim(); });
    var kv = rows.map(function (l) { return l.match(KV_ROW); }).filter(Boolean);
    if (rows.length >= 2 && kv.length >= Math.ceil(rows.length * 0.7)) {
      return { html: renderKeyTable(kv), next: next };
    }

    return { html: renderDiagram(body), next: next };
  }

  function takeTable(lines, i) {
    var body = takeWhile(lines, i, function (l) { return /^\s*\|/.test(l); });
    return { html: renderTable(body.lines), next: body.next };
  }

  function takeBullets(lines, i) {
    var body = takeWhile(lines, i, function (l) { return /^\s*[-*]\s+/.test(l); });
    return { html: renderList(body.lines, false), next: body.next };
  }

  function takeNumbers(lines, i) {
    var body = takeWhile(lines, i, function (l) { return /^\s*\d+\.\s+/.test(l); });
    return { html: renderList(body.lines, true), next: body.next };
  }

  // 노트 안의 h3~h6 은 화면에서 같은 급으로 눕힌다. 계층을 더 만들지 않는다.
  function takeHeading(lines, i) {
    return { html: "<h3>" + inline(lines[i].replace(/^\s*#{3,6}\s+/, "")) + "</h3>", next: i + 1 };
  }

  function takeQuote(lines, i) {
    var body = takeWhile(lines, i, function (l) { return /^\s*>\s?/.test(l); });
    var text = body.lines.map(function (l) { return l.replace(/^\s*>\s?/, ""); }).join(" ");
    return { html: "<p>" + inline(text) + "</p>", next: body.next };
  }

  var BLOCKS = [
    { match: /^\s*```/, take: takeFence },
    { match: /^\s*\|/, take: takeTable },
    { match: /^\s*[-*]\s+/, take: takeBullets },
    { match: /^\s*\d+\.\s+/, take: takeNumbers },
    { match: /^\s*#{3,6}\s+/, take: takeHeading },
    { match: /^\s*>\s?/, take: takeQuote },
  ];

  function markdown(src) {
    if (!src) return "";
    var lines = String(src).split("\n");
    var html = "";
    var i = 0;

    while (i < lines.length) {
      if (!lines[i].trim()) {
        i++;
        continue;
      }

      var handler = null;
      for (var b = 0; b < BLOCKS.length; b++) {
        if (BLOCKS[b].match.test(lines[i])) {
          handler = BLOCKS[b];
          break;
        }
      }

      if (handler) {
        var result = handler.take(lines, i);
        html += result.html;
        i = result.next;
        continue;
      }

      // 남은 것은 문단. 다음 빈 줄이나 블록 시작 전까지 이어 붙인다.
      var para = takeWhile(lines, i, function (l) {
        return l.trim() && !BLOCK_START.test(l);
      });
      html += "<p>" + inline(para.lines.join(" ").trim()) + "</p>";
      i = para.next;
    }

    return html;
  }

  /* 목록의 한 줄 미리보기용. 마크다운을 렌더하지 않는 자리이므로
     기호만 걷어낸다. 그대로 두면 "**웹에서" 같은 별표가 그대로 보인다. */
  function plain(text) {
    return String(text || "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* 검색어 강조.

     찾기는 원문에서 하고, 이스케이프는 조각마다 따로 한다.
     이스케이프한 결과 위에서 찾으면 실체 참조 한가운데가 잘린다 —
     "amp" 를 검색하면 `&amp;` 가 `&<mark>amp</mark>;` 가 되어 `&` 가 글자로
     풀리지 못하고 화면에 그대로 드러난다. 조각마다 esc 를 거치므로
     원문에 태그가 있어도 살아나지 않는다. */
  function highlight(text, query) {
    var src = plain(text);
    if (!query) return esc(src);

    var needle = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp(needle, "ig");
    var out = "", last = 0, m;
    while ((m = re.exec(src)) !== null) {
      if (m.index === re.lastIndex) re.lastIndex++; // 빈 매치가 제자리를 맴돌지 않게
      out += esc(src.slice(last, m.index)) + "<mark>" + esc(m[0]) + "</mark>";
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  var toastTimer = null;

  function toast(message, iconName) {
    var old = document.querySelector(".toast");
    if (old) old.remove();
    clearTimeout(toastTimer);

    var el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");

    if (iconName) {
      var holder = document.createElement("span");
      // security-ok: OWASP-A03-4 — icon() 은 하드코딩된 PATHS 표로만 만들어진다. 외부 입력이 닿지 않는다.
      holder.innerHTML = icon(iconName, 16);
      if (holder.firstChild) el.appendChild(holder.firstChild);
    }

    var label = document.createElement("span");
    label.textContent = message; // 문자열은 파싱하지 않고 텍스트로 넣는다
    el.appendChild(label);

    document.body.appendChild(el);
    toastTimer = setTimeout(function () { el.remove(); }, 2600);
  }

  return {
    esc: esc,
    plain: plain,
    icon: icon,
    /* 한 줄짜리 글에 쓴다. markdown() 은 문단·목록·표를 만드는 블록 조립기라
       제목 옆이나 카드 한 줄에 넣으면 <p> 가 딸려 나온다. inline 은 서식만
       입히고 태그를 새로 열지 않으므로 <span> 안에 그대로 들어간다. */
    inline: inline,
    markdown: markdown,
    dohae: renderDohae,
    highlight: highlight,
    toast: toast,
  };
})();
