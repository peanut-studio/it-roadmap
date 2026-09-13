# Timeout (제한 시간)

## 📝 정의

타임아웃은 **기다림을 언제 그만둘지 미리 정해 두는 값**이다.

부르는 쪽은 상대가 언제 답할지 모른다. 상대가 바쁜 것일 수도, 회선이 끊긴 것일 수도, 답이 영영 안 오는 것일 수도 있는데 기다리는 쪽에서는 셋이 똑같이 보인다. 그래서 "여기까지" 를 숫자로 적어 두고, 그 선을 넘으면 성공도 실패도 아닌 세 번째 결말로 끝낸다.

### 이름
Time :: 정해 둔 시간
out :: 다 써 버렸다
= 붙여 읽으면 "시간을 다 썼다". 다 쓴 다음에 무엇을 할지가 이 값의 나머지 절반이다

### 비유
약속 장소에서 "30분까지만 기다리고 간다" 고 나가기 전에 미리 정해 두는 일과 같다.

### 예
화면의 동그라미가 한참 돌다가 "요청 시간이 초과되었습니다" 로 끝나는 그 순간이다.

## 🖼️ 그림으로 보기

```도해
흐름: 제한 시간을 건 기다림은 어떻게 끝나나
부르는 쪽 :: 요청을 보내면서 시계를 함께 건다
받는 쪽 :: 일을 한다. 얼마나 걸릴지는 아무도 모른다
시계 :: 정해 둔 시간을 센다. 남은 시간이 줄어든다
끝나는 자리 :: 답이 먼저면 그 답으로, 시계가 먼저면 오류로 끝난다
= 기다림의 끝을 상대가 아니라 내가 미리 정해 두는 것이다
```

## ⚠️ 해결하는 문제

```도해
대조: 기다림에 상한이 없으면 무엇이 곤란한가
상한 없이 || 상한을 두고
느린 상대 :: 끝까지 붙잡힌다 || 정한 데서 끊는다
붙잡힌 자원 :: 계속 쌓인다 || 제때 풀린다
막힌 곳 하나 :: 앞단까지 멈춘다 || 여기서 멈춘다
= 끝을 안 정하면 남의 느림이 그대로 내 고장이 된다
```

기본이 "무한" 인 자리가 생각보다 많다. 널리 쓰는 HTTP 클라이언트 중에는 제한 시간 값이 0이면 상한 없이 도는 것이 있고, 서버 쪽도 연결이 조용히 놀고 있을 때의 상한이 기본 0인 경우가 있다. 값을 안 적었다는 것은 "얼마든 기다린다" 고 적은 것과 같다.

이게 그대로 공격 통로가 된다. 요청 앞머리를 아주 천천히 보내면서 연결만 붙잡고 있으면 상한 없는 서버는 그 연결을 놓지 못하고, 그런 연결이 쌓이면 멀쩡한 손님을 받을 자리가 없어진다. 그래서 요청 전체를 받는 시간과 앞머리를 받는 시간에 각각 0 아닌 값을 두라고 권하고, 한 서버 런타임은 아예 기본값을 "없음" 에서 5분으로 바꿨다. 넘기면 요청을 안쪽으로 넘기지 않고 408을 돌려준 뒤 연결을 닫는다.

## ⚙️ 작동 원리

```도해
층: 같은 기다림에 상한이 어디부터 걸리나
부르는 쪽 :: 이 일 전체가 몇 초 안에 끝나야 하는지 정한다
그 아래 호출 :: 남은 시간을 물려받는다. 더 길게는 못 잡는다
맨 아래 연결 :: 실제로 회선을 붙잡고 앉아 있는 자리
= 위에서 정한 끝이 아래로 내려간다. 위가 끝나면 아래도 같이 끝난다
```

제한 시간은 보통 "지금부터 몇 초" 라는 상대 값으로 적지만, 안에서는 "몇 시 몇 분까지" 라는 마감 시각으로 바뀐다. 그 편이 아래로 물려주기 쉽기 때문이다. 위에서 3초를 걸고 1초를 쓴 뒤 아래를 부르면, 아래가 받는 것은 다시 3초가 아니라 남은 2초다. 아래에서 더 넉넉하게 잡으려 해도 위의 마감이 더 이르면 그쪽이 이긴다.

마감이 지나면 그 일과 거기서 갈라져 나온 일이 한꺼번에 취소 신호를 받는다. 그래서 위에서 한 번 끊으면 아래에 흩어져 있던 일이 각자 멈춘다. 반대로 일이 제때 끝났는데 걸어 둔 시계를 꺼 주지 않으면, 그 시계와 딸린 자리가 부모가 끝날 때까지 남아 쌓인다.

## 💡 실제 사례

- **결제 요청이 응답 없이 멈출 때** — 상한이 없으면 사용자는 돌아가는 동그라미만 본다. 상한이 있으면 몇 초 만에 "다시 시도" 를 띄울 수 있다.
- **연결을 천천히 붙잡는 공격** — 요청 앞머리를 한 글자씩 보내며 자리만 차지하는 수법이다. 앞머리 받는 시간에 상한을 두면 그 자리에서 끊긴다.
- **느린 뒷단 하나가 앞단을 잡아먹을 때** — 상한 없이 기다리면 앞단의 처리 자리가 하나씩 줄다가, 결국 전부 그 뒷단만 바라보고 서 있게 된다.

## 🚫 흔한 오해

- **넉넉히 길게 잡아 두면 안전하다** — 30초짜리 상한은 사용자가 이미 포기한 뒤에야 끊는다. 상한은 "여기까지는 기다릴 값어치가 있다" 는 선이지 보험이 아니다.
- **시간이 지났으면 상대도 그만뒀을 것이다** — 부르는 쪽이 기다림을 접었을 뿐이다. 취소가 아래까지 전해지지 않으면 받는 쪽은 아무도 안 받아 갈 답을 끝까지 만든다.
- **상한에 걸리면 바로 다시 보내면 된다** — 이미 느려진 상대에게 요청이 더 몰린다. 얼마나 기다렸다 다시 보낼지는 [[Retry & Exponential Backoff]] 가 따로 다루는 문제다.

## 📝 정리

**"여기까지만 기다린다고 미리 정해 둔 값"** 이라고 읽으면 된다. 안 적어 두면 기본이 "무한" 인 자리가 많다는 것, 그리고 위에서 정한 마감이 아래로 내려간다는 것 둘을 기억하면 된다. 끊는 것은 내 기다림이지 상대가 하던 일이 아니다.

## 🧒 열 살에게

친구랑 놀이터에서 만나기로 했는데 친구가 안 오면 언제까지 기다릴래? 아무것도 안 정해 두면 해가 질 때까지 거기 서 있게 돼. 그래서 나가기 전에 "30분만 기다리고 집에 간다" 고 미리 정해 두는 거야.

## ❓ 이해했는지

- 값을 안 적어 두면 그 기다림은 언제 끝나나 → 해결하는 문제
- 위에서 3초를 걸었는데 아래에서 5초를 잡으면 어느 쪽이 이기나 → 작동 원리
- 시간이 다 됐을 때 부르는 쪽과 받는 쪽은 각각 어떻게 되나 → 흔한 오해

## 🔗 관련 용어

- [[Retry & Exponential Backoff]] — 상한에 걸린 다음 무엇을 할지 정하는 자리
- [[Circuit Breaker]] — 상한에 자꾸 걸리는 상대를 아예 부르지 않게 막는 장치
- [[Latency]] — 상한을 몇 초로 잡을지 정할 때 근거가 되는 값
- [[Fallback]] — 상한에 걸렸을 때 대신 내놓을 답

---

**출처**

- https://nodejs.org/api/http.html (Node.js Docs — HTTP. `server.requestTimeout` — "Sets the timeout value in milliseconds for receiving the entire request from the client. If the timeout expires, the server responds with status 408 without forwarding the request to the request listener and then closes the connection."; "It must be set to a non-zero value (e.g. 120 seconds) to protect against potential Denial-of-Service attacks in case the server is deployed without a reverse proxy in front."; 기본값 이력 — "v18.0.0 The default request timeout changed from no timeout to 300s (5 minutes)."; `server.headersTimeout` — "Limit the amount of time the parser will wait to receive the complete HTTP headers", 기본값은 `requestTimeout` 과 60000 중 작은 쪽, 같은 DoS 경고가 붙는다; `server.timeout` — "The number of milliseconds of inactivity before a socket is presumed to have timed out. A value of 0 will disable the timeout behavior on incoming connections.", 기본 0, "v13.0.0 The default timeout changed from 120s to 0 (no timeout)."; `server.keepAliveTimeout` 기본 5000)
- https://pkg.go.dev/context (Go — context 패키지. "Package context defines the Context type, which carries deadlines, cancellation signals, and other request-scoped values across API boundaries and between processes."; "The chain of function calls between them must propagate the Context, optionally replacing it with a derived Context created using WithCancel, WithDeadline, WithTimeout, or WithValue."; "A Context with a deadline is canceled after the deadline passes. When a Context is canceled, all Contexts derived from it are also canceled."; `WithTimeout` — "returns WithDeadline(parent, time.Now().Add(timeout))", 즉 상대 시간이 마감 시각으로 바뀐다; `WithDeadline` — "has the deadline adjusted to be no later than d. If the parent's deadline is already earlier than d, WithDeadline(parent, d) is semantically equivalent to parent."; "Failing to call the CancelFunc leaks the child and its children until the parent is canceled."; `DeadlineExceeded` — "the error returned by Context.Err when the context is canceled due to its deadline passing.")
- https://pkg.go.dev/net/http (Go — net/http. `Client.Timeout` — "Timeout specifies a time limit for requests made by this Client. The timeout includes connection time, any redirects, and reading the response body. The timer remains running after Get, Head, Post, or Do return and will interrupt reading of the Response.Body."; "A Timeout of zero means no timeout."; "The Client cancels requests to the underlying Transport as if the Request's Context ended.")
