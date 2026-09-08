# 2026-09-08 · vocab-trend (최신 실무 용어)

추가 2편. 검증 통과 (`verify_new_terms.py --expect 2`), 두 편 다 `--strict` 에서 경고 0.

## 이번에 추가한 단어

| 단어 | 파일 | id |
|---|---|---|
| WebAssembly (웹어셈블리) | `content/웹개발/WebAssembly.md` | `web--webassembly` |
| Source Map (소스맵) | `content/개발도구/Source Map.md` | `tool--source-map` |

## 권별 단어 수 (1번 단계, `build.py --dry-run`)

시작 640개 → 642개.

```
컴퓨터과학 기초 43   프로그래밍 41   네트워크 76   웹 개발 34(→35)
데이터베이스 69      아키텍처 패턴 48   보안·인증 84   클라우드 61
인프라·운영 80       개발 도구 34(→35)  AI·LLM 42     제품 관리 28
```

상한(60) 초과는 지난 실행과 같은 다섯 권 — 네트워크 76, 데이터베이스 69,
보안 84, 클라우드 61, 인프라 80. 후보에서 아예 뺐다.
남은 일곱 권 중 얇은 순서는 제품 관리 28, 웹 개발 34, 개발 도구 34,
프로그래밍 41, AI 42, 컴퓨터과학 43, 아키텍처 48.
공동 2위인 웹 개발과 개발 도구에 한 편씩 들어갔다.

## egress 정책 — 이번 세션에서 닿은 것

- 닿음: `nodejs.org`, `pkg.go.dev`, `json-schema.org`, `pypi.org`,
  `registry.npmjs.org`, `cloud.google.com`(루트만)
- **이번에 새로 확인한 것**: `raw.githubusercontent.com`(200),
  `api.github.com`(세션에 붙은 저장소만 열린다 — 그 밖은 add_repo 안내가 온다)
- 막힘(CONNECT 403): MDN, `w3.org`, `web.dev`, WHATWG, `tc39.es`,
  `ecma-international.org`, `webassembly.org`, `wasi.dev`, `docs.anthropic.com`,
  `platform.openai.com`, `ai.google.dev`, `containers.dev`,
  `conventionalcommits.org`, `arxiv.org`, `kubernetes.io`, `opentelemetry.io`,
  `docs.github.com`, `kernel.org`, `unicode.org`, `sre.google`, `12factor.net`,
  `deno.com`, `bun.sh`, `go.dev`, `github.io` 계열 전부
- `cloud.google.com` 은 루트만 200 이고 문서 경로(`/vertex-ai/...`)는 403 이었다.
  허용 목록의 경고 그대로다.
- `github.com` 은 CONNECT 는 통과하는데 GitHub 이 403 을 준다(HTML 페이지).
  파일 본문은 `raw.githubusercontent.com` 으로만 읽혔다.

## 후보로 검토한 것과 고른 이유

전략이 trend 라 "공식 스펙이나 만든 조직의 공식 발표 문서가 있는 것" 으로 먼저
거르고, 그다음 **이번 세션에서 실제로 열리는 출처가 있는가**로 또 걸렀다.
두 번째 체가 훨씬 촘촘했다.

- **WebAssembly** — 선택. 12권 어디에도 없었다(`grep -ril WebAssembly content/` 0건).
  코어 규격 원문(WebAssembly/spec 저장소의 `document/core/intro/*.rst`)이 열렸고,
  브라우저 밖 이야기는 `nodejs.org/api/wasi.html` 과 `pkg.go.dev/syscall/js` 로
  받쳤다. 서로 다른 도메인 3개.
- **Source Map** — 선택. 지난 실행에서 넣은 Stack Trace 바로 옆자리인데 비어 있었다.
  ECMA-426 초안 원문(tc39/ecma426 의 `spec.emu`)과 `nodejs.org` 두 곳이 열렸다.
  "최근" 의 근거는 형식 자체가 아니라 **표준화** 다 — 2023~2024년에 Ecma 표준이
  됐고 Node.js 문서가 이제 "TC39 ECMA-426 Source Map format" 이라고 부른다.

## 버린 후보와 이유

- **Function Calling / Tool Use** (AI 권) — 공식 문서(`docs.anthropic.com`,
  `platform.openai.com`, Vertex AI 문서)가 전부 403. MCP 스펙으로 우회할 수는
  있었지만 그러면 기존 `content/네트워크/MCP.md` 와 내용이 크게 겹친다.
- **Structured Output** (AI 권) — 정의의 원본이 모델 공급자 문서인데 다 막혔다.
  `json-schema.org` 하나로는 "무엇인지" 를 못 세운다.
- **View Transitions · Container Queries · Import Maps** (웹 권) — CSS·HTML 쪽은
  이번 세션에서 두 번째 도메인을 만들 길이 없었다. MDN·w3.org·web.dev 가 다 막혀서
  스펙 저장소 하나만 남는데, 그러면 "서로 다른 도메인 2개" 를 못 채운다.
- **Dev Container** (개발 도구 권) — `containers.dev` 막힘. devcontainers/spec
  저장소 하나뿐이라 같은 이유로 탈락.
- **Conventional Commits** (개발 도구 권) — `conventionalcommits.org` 막힘. 같은 이유.
- **uv · ruff 같은 도구 이름** — 제품 하나를 단어로 세우는 것은 이 단어장의
  결이 아니다(이미 Package Manager · Lock File 이 있다).
- **제품 관리 권(28, 가장 얇다)** — trend 로 세울 만한 용어의 원전이 대개 기업
  블로그·단행본이라 허용 목록에서 이미 막혀 있다. 지난 실행들과 같은 결론.

## 인용한 출처

WebAssembly

- https://raw.githubusercontent.com/WebAssembly/spec/main/document/core/intro/introduction.rst
- https://raw.githubusercontent.com/WebAssembly/spec/main/document/core/intro/overview.rst
- https://nodejs.org/api/wasi.html
- https://pkg.go.dev/syscall/js

Source Map

- https://raw.githubusercontent.com/tc39/ecma426/main/spec.emu
- https://raw.githubusercontent.com/tc39/ecma426/main/README.md
- https://nodejs.org/api/module.html
- https://nodejs.org/api/cli.html

## 사실 재검사 (6단계 뒷부분)

쓰고 나서 인용한 원문을 다시 열어 문장 단위로 대조했다. 고친 것 셋.

1. 도해에 "`.wasm` 모듈로 낸다" 라고 썼는데, 코어 규격은 파일 확장자를 정하지
   않는다(모듈이라고만 한다). "웹어셈블리 모듈로 낸다" 로 바꿨다.
2. "`names` 는 원래 이름 목록" → 규격 문구는 "an optional list of symbol names
   which may be used by the mappings field" 다. "매핑이 가리킬 수 있는 이름 목록"
   으로 고쳤다.
3. 조각의 다섯째 값을 "이름" 이라고 썼는데 실제로는 names 목록의 색인이다.
   "몇 번째 이름" 으로 고쳤다.

## 이 문서·도구가 틀렸다고 느낀 점

**허용 목록에 "공식 스펙 저장소" 자리가 없다.** 이번 실행의 핵심 판단이라 길게 적는다.

`tools/sources.allowlist.md` 는 도메인으로 허용을 정하는데, 요즘 표준 문서의
**원본**은 도메인이 아니라 그 조직의 GitHub 저장소에 산다. ECMA-426 의 초안 원문은
`tc39/ecma426` 의 `spec.emu` 이고(`tc39.es/ecma426/` 는 그것을 렌더한 것),
WebAssembly 코어 규격의 원문도 `WebAssembly/spec` 의 `.rst` 파일들이다.
이번 세션에서는 렌더된 쪽(`tc39.es`, `w3.org`, `webassembly.org`)이 전부 막히고
`raw.githubusercontent.com` 만 열렸다.

허용 목록의 마지막 항목("그 밖의 프로젝트도 **그 기술을 만든 조직이 직접 운영하는
문서**라면 같은 자격으로 허용한다")을 근거로 통과시켰다 — 저장소를 운영하는 주체가
TC39·WebAssembly CG 본인이고, 파일이 곧 규격 원문이기 때문이다. 다만 도메인만 보면
`raw.githubusercontent.com` 은 목록에 없는 이름이라, **사람이 한 번 정해 주면 좋겠다.**
제안: "조직의 공식 GitHub 조직 아래 스펙 저장소는 그 조직의 문서로 본다.
단 개인 저장소·포크·이슈·위키는 아니다" 를 목록에 한 줄로 적는 것.
지금 두 편의 출처 여덟 줄 중 넷이 여기에 걸려 있다.

곁가지 둘.

- 허용 목록의 "닿은 것 / 막힌 것" 목록은 실행마다 달라진다. 지난 실행(09-06)에서
  닿았던 `developer.apple.com`·`swift.org`·`rubygems.org` 를 이번에는 확인하지
  않았고, 대신 `raw.githubusercontent.com` 이 새로 열렸다. 목록을 사실로 믿지 말고
  매번 찔러 보라는 문서의 지시가 맞다.
- `api.github.com` 은 응답이 오지만 세션에 붙은 저장소(itstudyu/it-roadmap)만
  열린다. 다른 저장소는 `add_repo` 안내 메시지를 200 처럼 돌려주므로, 파일 목록을
  얻으려고 여기를 쓰면 조용히 실패한다. 파일은 raw 로 직접 받는 편이 낫다.

프롬프트와 검사기 쪽은 이번 실행에서 어긋난 데가 없었다. 두 편 다 첫 검사에서
실패·경고 0으로 통과했다.
