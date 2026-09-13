# 루틴 실행 기록 — 2026-09-13 (roadmap)

전략: `vocab-roadmap` (표준 로드맵 빈칸 채우기). 추가한 단어 2개.

## 권별 단어 수 (시작 시점, `build.py --dry-run`)

전체 12권 650개.

| 권 | 개수 | | 권 | 개수 |
|---|---|---|---|---|
| 컴퓨터과학 기초 | 43 | | 인프라 · 운영 | 80 |
| 프로그래밍 | 41 | | 개발 도구 | 35 |
| 네트워크 | 76 | | AI · LLM | 50 |
| 웹 개발 | 35 | | 제품 관리 | 28 |
| 데이터베이스 | 69 | | 보안 · 인증 | 84 |
| 아키텍처 패턴 | 48 | | 클라우드 | 61 |

상한(60개)에 닿아 이번 후보에서 제외한 권 — 네트워크(76), 데이터베이스(69),
보안(84), 클라우드(61), 인프라(80).

## 이번 실행의 실제 제약 — 열리는 출처가 네 도메인뿐이었다

`sources.allowlist.md` 가 경고한 대로 클라우드 세션 egress 가 허용 목록의
대부분을 막았다. 실제로 열어 본 결과는 이렇다.

**열림(200)** — `nodejs.org`(하위 문서 전부), `pkg.go.dev`(표준 라이브러리 전부),
`json-schema.org`, `pypi.org`, `registry.npmjs.org`, `cloud.google.com`(루트만)

**막힘(연결 실패)** — MDN, rfc-editor.org, datatracker.ietf.org, w3.org, owasp.org,
kubernetes.io, docs.docker.com, git-scm.com, docs.github.com, postgresql.org, redis.io,
prometheus.io, opentelemetry.io, arxiv.org, huggingface.co, docs.anthropic.com,
modelcontextprotocol.io, ecma-international.org, iana.org, kernel.org,
pubs.opengroup.org, gnu.org, web.dev, sre.google, 12factor.net, openfeature.dev,
scrumguides.org, kanbanguides.org, agilemanifesto.org,
`cloud.google.com/docs` 이하 문서 경로 전부

`cloud.google.com` 은 루트만 200이고 문서 경로는 전부 막혀 인용에 쓸 수 없었다.

그래서 후보 선정이 "가장 얇은 권을 채운다" 로만 굴러가지 않았다. 가장 얇은 권인
제품 관리(28)는 규범 문서가 전부 `scrumguides.org` · `kanbanguides.org` ·
`agilemanifesto.org` · `sre.google` 에 있고 넷 다 막혀서, 이번 실행에서는 근거를
세울 방법이 없었다. 개발 도구(35)도 `git-scm.com` · `docs.github.com` 이
막혀 Git · GitHub 계열 빈칸을 전부 버려야 했다. 남은 네 도메인으로 1차 근거를
세울 수 있는 권은 사실상 프로그래밍(41)과 아키텍처(49)였다.

## 고른 단어

### 1. Stream (스트림) — `lang--stream`

`content/프로그래밍/Stream.md`

로드맵 계열 커리큘럼의 언어·백엔드 기초에 늘 들어 있는데 단어장에 없었다.
`Batch vs Stream Processing`(데이터 흐름 처리)만 있고, 입출력을 조각으로 다루는
쪽의 스트림은 없다. 노드의 stream 문서와 고의 io 패키지가 같은 개념을 서로 다른
크기로 정의해 둬서 도메인 두 개로 정면 대조가 됐다.

출처:
- https://nodejs.org/api/stream.html
- https://pkg.go.dev/io

### 2. Timeout (제한 시간) — `arch--timeout`

`content/아키텍처/Timeout.md`

아키텍처 권에 `Circuit Breaker` · `Retry & Exponential Backoff` · `Bulkhead` ·
`Back Pressure` · `Fallback` 이 다 있는데 정작 그 모두가 딛고 선 제한 시간이
없었다. 복원력 묶음의 빠진 바닥이라 로드맵 빈칸으로는 가장 선명했다.
노드 HTTP 서버의 요청·헤더 상한(기본값 이력과 DoS 경고 포함)과 고의 context
마감 전파가 각각 "왜 필요한가" 와 "어떻게 작동하나" 를 그대로 덮었다.

출처:
- https://nodejs.org/api/http.html
- https://pkg.go.dev/context
- https://pkg.go.dev/net/http

## 검토했다가 버린 후보

| 후보 | 버린 이유 |
|---|---|
| Daily Scrum · Sprint Review · WIP Limit · Cycle Time (제품 관리) | 가장 얇은 권이라 1순위였으나 `scrumguides.org` · `kanbanguides.org` 가 막혔다. 2차 출처로 쓰지 않고 버렸다 |
| NPS | `netpromotersystem.com` 미도달. 둘째 도메인도 세울 수 없었다 |
| Squash Merge · Git Submodule · Fork (개발 도구) | `git-scm.com` · `docs.github.com` 둘 다 막혔다 |
| Bundler · Tree Shaking (개발 도구) | `webpack.js.org` · `vite.dev` 막힘 |
| JSON Schema | `json-schema.org` 는 열렸으나 **이미 있는 단어였다** (`content/데이터_형식/JSON Schema.md`) |
| Promise | `ecma-international.org` 막힘. `nodejs.org` 한 도메인만으로는 최소 2개를 못 채운다. 게다가 `Async/Await` 와 겹친다 |
| UUID | `nodejs.org/api/crypto`(randomUUID)는 열리지만 둘째 도메인이 `pkg.go.dev/github.com/google/uuid` — Go 공식 문서 호스트이지 Go 가 만든 패키지가 아니라 1차 출처로 애매해서 버렸다 |
| Buffer | 출처는 세울 수 있었으나(`pkg.go.dev/bufio` + 노드 stream 의 Buffering 절) Stream 과 한 회차에 같이 넣기에 너무 붙어 있고, 기존 `Protocol Buffers` 와 이름이 스쳐 헷갈릴 여지가 있었다 |
| 표준 입출력 (stdin/stdout/stderr) | 개발 도구 권을 채울 수 있었으나 리다이렉션·파이프의 근거가 `gnu.org/software/bash` · `pubs.opengroup.org` 에 있고 둘 다 막혔다 |

## 중복 검사

세 축(파일명 · H1 제목 · 괄호 안 원어)을 전부 대조했다. `Stream` 은 기존
`Batch vs Stream Processing`(db) · `Protocol Buffers`(lang) 과 제목·slug 가
겹치지 않고, `Timeout` 은 본문에 단어가 나오는 편은 여럿이나(Health Check,
HTTP Keep-Alive 등) 표제어로 선 편이 없었다. slug 충돌 없음 — `lang--stream`,
`arch--timeout` 둘 다 새 id 다.

655개 H1 을 정렬해 훑을 때 `head -300` + `tail -350` 으로 잘라 보다가 가운데
구간을 빠뜨려 `JSON Schema` 가 없는 줄 알고 후보로 잡았다. 전수 목록은 반드시
끊김 없이 봐야 한다. (아래 남길 점 참조)

## 검증

    python3 tools/check_template.py --strict  → 2편 실패 0 · 경고 0
    python3 tools/build.py                    → 650 → 652
    python3 tools/verify_new_terms.py --expect 2
      ok 빌드 제외 0건 / ok 단어 수 650 -> 652 (+2) / ok 템플릿 2/2 통과

사실 재검사: 인용한 다섯 URL 을 다시 열어 문장 단위로 대조했다. 특히
"쓰기가 거짓을 돌려준 뒤 다시 부어도 된다는 신호가 온다"(노드 'drain' 이벤트),
"아래에서 더 넉넉히 잡아도 위 마감이 이르면 그쪽이 이긴다"(고 `WithDeadline` 의
"no later than d"), "기본값을 없음에서 5분으로 바꿨다"(노드 v18.0.0 이력),
"넘기면 408을 돌려주고 닫는다" 넷을 원문에서 다시 확인했다. 버린 문장은 없다.

## 이 문서나 도구가 틀렸다고 느낀 점

1. **`ROUTINE-PROMPT.md` 3번(중복 배제)에 "전수 목록을 끊지 말고 보라" 가 없다.**
   문서는 "권 이름만 보고 판단하지 말고 grep 해라" 까지만 말한다. 이번에 실제로
   난 사고는 grep 을 안 해서가 아니라 **grep 결과를 `head`/`tail` 로 잘라 보다가
   가운데를 빠뜨린 것**이었다. 단어가 650개를 넘었으니 앞으로 이 사고는 계속 난다.
   3번에 한 줄 있으면 좋겠다 — "목록을 잘라 보지 마라. 후보 이름으로 직접 grep 해라."

2. **`sources.allowlist.md` 의 도달 목록이 이번 실행과 어긋난다.**
   그 문서는 "닿은 것" 에 `cloud.google.com`(문서 서브도메인으로 넘어가면 막힘)
   을 올려 두었는데, 이번에는 `cloud.google.com/docs`·`/architecture/...` 같은
   **같은 도메인의 문서 경로**도 전부 막혔다. 루트만 200이라 인용에 쓸 수 없다.
   문서가 "실행마다 달라질 수 있다" 고 적어 둔 대로이니 틀린 것은 아니지만,
   `cloud.google.com` 은 사실상 죽은 출처로 보고 세는 편이 맞다.

3. **방법론 규범 문서 전부가 클라우드에서 막힌다 — 제품 관리 권이 구조적으로 못 는다.**
   `2026-08-17` 에 제품 관리·운영 용어를 쓸 근거가 없어서 `scrumguides.org` 등
   일곱 도메인을 허용 목록에 넣었는데, 클라우드 루틴에서는 그 일곱이 전부 막힌다.
   그래서 가장 얇은 권(28개)이 이 루틴으로는 영영 안 는다. roadmap 전략의
   "단어 수가 가장 적은 권을 우선한다" 가 이 권에 대해서는 실행 불가능한 지시다.
   사람이 로컬에서 한 번 채우거나, 아니면 이 전략 문단에 "출처를 열 수 있는 권
   중에서 가장 얇은 권" 이라고 고쳐 적는 편이 정직하다.

4. **`check_template.py` 의 `CITE_VOICE` 규칙이 본보기와 어긋난다.**
   검사기는 "문서는 …고 적는다" 말투를 경고로 잡는다(절당 3번까지, 열 살에게는 0).
   그런데 `content/프로그래밍/Iterator.md` 는 본문 거의 전부가 그 말투다
   (`코틀린 문서는 …`, `고 문서는 … 고 못 박는다`). 새로 쓰는 사람이 본보기로
   삼기 좋은 편인데 지금 규칙과는 반대 방향이다. `ROUTINE-PROMPT.md` 5번의
   "특히 주의할 것" 목록에 이 규칙이 없어서, 검사기를 돌려 보기 전에는 알 수 없다.
   한 줄 추가를 제안한다 — "본문에서 출처를 주어로 올리지 마라(`문서는 …고 적는다`).
   근거는 맨 아래 출처 줄이 맡는다."

5. (작은 것) `ROUTINE-PROMPT.md` 는 "12권이 다 상한에 닿으면 사람이 상한을 다시
   본다" 고 적었는데, 실제로 먼저 오는 막다른 길은 상한이 아니라 **출처 도달성**이다.
   이번에 얇은 권 셋(제품 관리·개발 도구·웹 개발)이 전부 출처 때문에 막혔다.
   빈손 조항 옆에 이 경우도 적어 두면 다음 실행이 덜 헤맨다.
