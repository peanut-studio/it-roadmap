# 2026-09-15 · vocab-trend (최신 실무 용어)

추가 2편. 검증 통과 (`verify_new_terms.py --expect 2`), 두 편 다 `--strict` 에서 경고 0.

## 이번에 추가한 단어

| 단어 | 파일 | id |
|---|---|---|
| ESM (ECMAScript Module) | `content/웹개발/ESM.md` | `web--esm` |
| Trusted Publishing (믿는 곳에만 맡기는 게시) | `content/개발도구/Trusted Publishing.md` | `tool--trusted-publishing` |

## 권별 단어 수 (1번 단계, `build.py --dry-run`)

시작 652개 → 654개.

```
컴퓨터과학 기초 43   프로그래밍 42   네트워크 76   웹 개발 35(→36)
데이터베이스 69      아키텍처 패턴 49   보안·인증 84   클라우드 61
인프라·운영 80       개발 도구 35(→36)  AI·LLM 50    제품 관리 28
```

상한(60) 초과는 지난 실행과 같은 다섯 권 — 네트워크 76, 데이터베이스 69,
보안 84, 클라우드 61, 인프라 80. 후보에서 뺐다.
남은 일곱 권 중 얇은 순서는 제품 관리 28, 웹 개발 35, 개발 도구 35,
프로그래밍 42, 컴퓨터과학 43, 아키텍처 49, AI 50.
공동 2위인 웹 개발과 개발 도구에 한 편씩 넣었다 — 지난 trend 실행과 같은 자리다.

## egress 정책 — 이번 세션에서 찔러 본 것

지난 실행의 목록을 사실로 믿지 말라는 지시대로 처음부터 다시 쟀다.

- **닿음**: `nodejs.org`, `pkg.go.dev`, `json-schema.org`, `pypi.org`,
  `registry.npmjs.org`, `raw.githubusercontent.com`, `jsr.io`,
  `kotlinlang.org`, `www.swift.org`, `developer.apple.com`, `rubygems.org`,
  `hex.pm`, `packagist.org`, `hub.docker.com`, `gradle.org`,
  `repo1.maven.org`, `proxy.golang.org`, `index.crates.io`,
  `files.pythonhosted.org`, `yarnpkg.com`, `www.rust-lang.org`(리다이렉트)
- **막힘(CONNECT 403 / 응답 없음)**: MDN, `w3.org`, WHATWG(`spec.whatwg.org`·
  `html.spec.whatwg.org`), `tc39.es`, `docs.python.org`, `doc.rust-lang.org`,
  `docs.rs`, `openjdk.org`, `dev.java`, `docs.oracle.com`, `kubernetes.io`,
  `opentelemetry.io`, `grpc.io`, `graphql.org`, `openapis.org`, `eslint.org`,
  `prettier.io`, `biomejs.dev`, `sre.google`, `12factor.net`, `docs.github.com`,
  `sigstore.dev`, `slsa.dev`, `spdx.dev`, `cyclonedx.org`, `repos.openssf.org`,
  `deno.com`·`docs.deno.com`, `developer.chrome.com`, `pnpm.io`, `vitejs.dev`,
  `nixos.org`, `rollupjs.org`, `webpack.js.org`, `esbuild.github.io`,
  `astro.build`, `nextjs.org`, `svelte.dev`, `vuejs.org`, `angular.dev`,
  `bazel.build`, `nx.dev`, `turbo.build`, `learn.microsoft.com`,
  `registry.terraform.io`, AI 계열 전부(`pytorch.org`, `docs.vllm.ai`,
  `huggingface.co`, `ollama.com`, `scikit-learn.org`, `mlflow.org`)
- 새로 확인한 것: `docs.pypi.org` 는 403 인데 `pypi.org` 본체는 200 이다.
  PyPI 문서의 원문은 `pypi/warehouse` 저장소의 `docs/user/` 아래에 있어서
  raw 로 받았다. npm 문서도 마찬가지로 `npm/documentation` 저장소가 원문이다.
  (`docs.npmjs.com` 은 막힘.)
- `jsr.io` 는 curl 로는 200 인데 파이썬 `urllib` 기본 User-Agent 로는 403 이다.
  같은 세션 안에서도 도구에 따라 갈리므로, "막혔다" 를 한 번에 단정하지 말 것.

## 후보로 검토한 것과 고른 이유

trend 전략의 두 체 — ① 공식 스펙·공식 발표 문서가 있는가 ② 이번 세션에서
그 문서를 **서로 다른 도메인 둘 이상**으로 실제로 열 수 있는가. 이번에도 ②가
후보를 거의 다 잘라냈다.

- **ESM** — 선택. 12권 어디에도 없었다(제목 657개에 `Module` 은
  `Package / Module` 하나뿐, 본문 `grep -ril ESM content/` 0건).
  "최근" 의 근거는 문법이 아니라 **자리잡음** 이다. JSR 문서가 "웹 플랫폼이
  ESM 을 기본 모듈 형식으로 채택해 CommonJS 를 밀어냈다" 고 적고, Node.js 는
  이제 `require()` 로 동기 ESM 을 적재한다. 정의는 Node.js 공식 문서, 링크
  단계 규칙은 ECMA-262 초안 원문, 생태계 판정은 jsr.io — 서로 다른 도메인 셋.
- **Trusted Publishing** — 선택. 개발 도구 권에 Package Manager·Lock File·
  Semantic Versioning 은 있는데 "올리는 쪽" 이 통째로 비어 있었다.
  2023년 PyPI 에서 시작해 npm·RubyGems 로 퍼졌고 OpenSSF 표준으로 정리된,
  가장 최근에 실무로 내려온 공급망 용어다. pypi.org 의 한 문장 정의 + PyPI
  warehouse 문서 원문 + npm 문서 원문으로 받쳤다.

## 버린 후보와 이유

- **Structured Concurrency · Coroutine · Actor** (cs 권) — `content/컴퓨터과학/` 에
  Structured Concurrency·Coroutine 이 이미 있다. 권 이름만 보고 판단하지
  말라는 지시 그대로, 목록을 찍어 보고서야 알았다.
- **Speculative Decoding · KV Cache · MoE** (AI 권, 50편) — 1차 출처가
  vLLM·transformers·llama.cpp 문서인데 전부 `raw.githubusercontent.com`
  한 도메인에 몰린다. "서로 다른 도메인 2개" 를 못 채운다.
- **Import Maps · View Transitions · Container Queries** (웹 권) — 지난 실행과
  같은 이유. MDN·W3C·WHATWG·developer.chrome.com 이 전부 막혀서 스펙 저장소
  하나만 남는다.
- **Type Stripping(네이티브 타입스크립트 실행)** — nodejs.org 는 열리지만
  둘째 도메인이 TypeScript 저장소(raw)뿐이라 애매했다. ESM 쪽이 같은 권에서
  더 근본적인 빈칸이라 그쪽을 먼저 넣었다. 다음 실행 후보로 남겨 둔다.
- **Dev Container · Conventional Commits** — `containers.dev`·
  `conventionalcommits.org` 여전히 막힘.
- **Provenance / Attestation** — 근거는 충분했지만(PyPI PEP 740 문서,
  npm provenance 문서) Trusted Publishing 과 같은 실행에 넣으면 내용이 겹친다.
  다음 실행에 독립 단어로 넣을 만하다.
- **제품 관리 권(28, 가장 얇다)** — 세 번째 실행 연속 같은 결론. trend 로 세울
  용어의 원전이 기업 블로그·단행본이라 허용 목록에서 이미 막혀 있다.

## 인용한 출처

ESM

- https://nodejs.org/api/esm.html
- https://nodejs.org/api/modules.html
- https://nodejs.org/api/packages.html
- https://jsr.io/docs/why
- https://raw.githubusercontent.com/tc39/ecma262/main/spec.html

Trusted Publishing

- https://pypi.org/help/
- https://raw.githubusercontent.com/pypi/warehouse/main/docs/user/trusted-publishers/index.md
- https://raw.githubusercontent.com/pypi/warehouse/main/docs/user/trusted-publishers/internals.md
- https://raw.githubusercontent.com/npm/documentation/main/content/packages-and-modules/securing-your-code/trusted-publishers.mdx
- https://raw.githubusercontent.com/npm/documentation/main/content/packages-and-modules/securing-your-code/generating-provenance-statements.mdx

## 사실 재검사 (6단계 뒷부분)

쓰고 나서 인용한 원문을 다시 열어 문장 단위로 대조했다. 고친 것 넷.

1. ESM 실제 사례에 `"type": "module"` 이 "그 아래 `.js` 파일 전부" 를 바꾼다고
   썼는데, 규칙은 **가장 가까운 상위 package.json** 기준이다(중간에 다른
   package.json 이 있으면 거기서 끊긴다). "그 파일을 가장 가까운 상위로 두는
   `.js` 파일" 로 고쳤다.
2. ESM 해결하는 문제의 마지막 문장이 "규격은 …고 못 박아 둔다" 였다. 근거를
   본문 주어로 끌어올린 말투라(검사기의 `CITE_VOICE` 가 겨누는 자리다)
   "그렇게 걸린 파일은 아예 실행되지 않는다" 로 바꿨다.
3. Trusted Publishing 사례의 provenance 자동 생성을 "공개 저장소에서 이
   방식으로 올리면" 이라고 넓게 썼는데, npm 문서는 CircleCI 에서는 생성되지
   않는다고 예외를 단다. "공개 저장소의 공개 패키지를 깃허브 액션에서" 로 좁혔다.
4. 같은 편 배경 문단의 "npm 쪽은 …라고 밝힌다" 도 같은 이유로 사실 문장으로 고쳤다.

도해 마디 이름 하나도 바꿨다 — 레지스트리를 "저장소" 라고 적어 두었는데, 바로
다음 줄의 "등록해 둔 저장소·워크플로"(코드 저장소)와 같은 낱말이 되어 그림이
두 가지를 같은 이름으로 부르고 있었다.

## 이 문서·도구가 틀렸다고 느낀 점

**1. 지난 실행이 남긴 숙제가 그대로다 — 허용 목록에 "공식 스펙 저장소" 자리가 없다.**

09-08 기록이 제안한 한 줄("조직의 공식 GitHub 조직 아래 스펙·문서 저장소는 그
조직의 문서로 본다")이 아직 `tools/sources.allowlist.md` 에 없다. 이번 실행은
그 제안이 없으면 성립하지 않았다. 출처 열 줄 중 다섯이 raw 다:

- `tc39/ecma262` 의 `spec.html` — ECMA-262 초안 **원문**. 렌더된 `tc39.es` 는 막힘
- `pypi/warehouse` 의 `docs/user/` — `docs.pypi.org` 의 **원본 소스**. 그쪽은 403
- `npm/documentation` 의 `content/` — `docs.npmjs.com` 의 **원본 소스**. 그쪽은 막힘

허용 목록에는 `docs.pypi.org` 도 `docs.npmjs.com` 도 이름이 없지만
"그 기술을 만든 조직이 직접 운영하는 문서" 라는 판단 기준에는 셋 다 들어맞는다.
**사람이 한 줄만 적어 주면 매주 하는 이 판단이 사라진다.**

**2. 더 근본적인 것 — 이 세션에서 열리는 도메인이 언어 생태계 몇 개로 굳어 간다.**

세 번째 trend 실행인데 고를 수 있는 근거가 매번 같은 자리에서 나온다
(nodejs.org · 패키지 레지스트리 · 스펙 저장소 raw). 그래서 trend 루틴의
결과가 "요즘 중요한 용어" 가 아니라 **"이 세션에서 근거를 열 수 있는 용어"**
쪽으로 기울고 있다. 웹 권(MDN·W3C 전면 차단)과 AI 권(제공자 문서 전면 차단)이
특히 그렇다 — AI 권은 50편인데 trend 로는 한 편도 못 넣고 있다.

제약 자체는 옳다(근거 없는 단어를 넣는 것보다 낫다). 다만 사람이 볼 선택지는
둘이다. ① egress 정책에 문서 도메인 몇 개를 열어 주거나,
② AI·웹 권은 로컬 세션에서 채우고 클라우드 trend 루틴은 지금 열리는 생태계
(자바스크립트 런타임 · 패키지 공급망 · Go/Kotlin/Swift 표준 라이브러리)에
집중한다고 프롬프트에 명시하거나.

**3. 곁가지 — "막힘" 판정은 도구에 따라 갈린다.**

`jsr.io` 가 curl 200 / `urllib` 403 이었다. 후보를 버리기 전에 도구를 한 번
바꿔 보는 것이 맞다. 이 사실을 프롬프트 4번 단계에 한 줄로 적어 두면
다음 실행이 멀쩡한 출처를 잘못 버리는 일을 줄일 수 있다.

프롬프트와 검사기 쪽은 이번에도 어긋난 데가 없었다. 두 편 다 첫 검사에서
실패·경고 0으로 통과했다.
