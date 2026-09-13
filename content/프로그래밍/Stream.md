# Stream (스트림)

## 📝 정의

스트림은 데이터를 **다 모으지 않고 조각으로 흘려 다루는 통로**다.

읽히기만 하는 것, 쓰이기만 하는 것, 둘 다 되는 것, 지나가는 조각을 바꾸는 것 네 가지가 기본형이다. 파일도, 망으로 오가는 연결도, 터미널로 나가는 출력도 이 한 가지 모양으로 다룬다. 어떤 표준 라이브러리는 "읽어 가는 자리" 와 "써 넣는 자리" 두 약속만 둔다.

### 이름
= 물줄기를 뜻하는 말이다. 데이터를 쌓인 덩어리가 아니라 지나가는 물줄기로 보는 것이 이 이름이 가리키는 전부다

### 비유
수도꼭지. 물통에 다 받아 두고 쓰는 게 아니라, 틀어 놓고 나오는 만큼 바로 쓴다.

### 예
큰 파일을 올릴 때 진행률이 0%에서 100%로 한 번에 뛰지 않고 조금씩 차오르는 그 화면이다.

## 🖼️ 그림으로 보기

```도해
흐름: 큰 파일 하나가 스트림으로 어떻게 지나가나
읽는 쪽 :: 조각 하나만 읽어 온다. 전체가 아니다
안쪽 버퍼 :: 읽어 온 조각을 잠깐 담아 둔다
바꾸는 쪽 :: 지나가는 조각을 압축하거나 고친다
쓰는 쪽 :: 받은 조각을 내보내고 그 자리를 비운다
@ 다시 읽기로 :: 끝 표시가 나올 때까지 조각마다 되풀이한다
= 전체가 한 번에 손에 들리는 순간이 없다. 늘 조각 하나씩만 있다
```

## ⚠️ 해결하는 문제

```도해
대조: 파일을 통째로 읽어 들이면 무엇이 곤란한가
통째로 읽으면 || 흘려 읽으면
쓰는 메모리 :: 파일 크기만큼 || 조각 하나만큼
첫 결과 :: 다 읽어야 나온다 || 첫 조각부터 나온다
아주 큰 파일 :: 메모리가 바닥난다 || 크기와 상관없다
= 손에 드는 양을 조각 하나로 묶어 두는 것이 스트림이다
```

통째로 읽는 길도 있다. 끝까지 다 읽어서 한 덩어리로 돌려주는 함수가 어느 언어에나 있고, 크기가 작으면 그게 가장 짧은 코드다. 문제는 크기를 내가 못 정할 때다. 사용자가 올린 파일, 상대가 보내는 응답, 언제 끝날지 모르는 로그는 얼마든 커질 수 있는데, 통째로 읽는 코드는 그 크기만큼 [[Memory]] 를 잡는다.

스트림은 읽는 쪽과 쓰는 쪽을 관으로 이어 붙여 **손에 드는 양을 조각 하나로 고정**한다. 빠른 쪽과 느린 쪽을 이어 붙여도 쓸 수 있는 메모리를 다 잡아먹지 않게 담기는 양을 적당한 선에서 묶어 두는 것이, 이어 붙이는 장치가 노리는 바로 그 목표다.

## ⚙️ 작동 원리

스트림 안에는 버퍼가 하나 있고, 거기 담아 둘 양의 문턱이 미리 정해져 있다. 읽는 쪽에서 담긴 양이 그 문턱에 닿으면 밑바닥 자원에서 더 끌어오는 일을 잠시 멈춘다. 쓰는 쪽에서는 쓰기 함수가 참을 돌려주다가 문턱에 닿는 순간 거짓을 돌려주는데, 그 거짓이 "지금은 그만 부어라" 는 신호다. 버퍼가 빠지면 다시 부어도 된다는 신호가 온다. 이것이 [[Back Pressure]] 가 붙는 자리다.

주의할 것이 하나 있다. 그 값은 **상한이 아니라 문턱**이다. 거기 닿으면 더 달라고 하기를 멈출 뿐, 메모리를 그 이상 못 쓰게 막아 주지는 않는다. 더 엄하게 막을지 말지는 만드는 쪽이 정한다.

읽고 쓰는 양쪽이 다 되는 스트림은 버퍼를 두 개 따로 가진다. 망 연결처럼 받는 속도와 보내는 속도가 서로 다른 자리에서, 한쪽이 다른 쪽을 붙잡고 서 있지 않게 하려는 것이다.

## 💡 실제 사례

- **큰 파일을 압축해 저장할 때** — 읽기·압축·쓰기를 관으로 이어 붙이면 파일이 몇 GB 든 손에 드는 양은 조각 몇 개분이다.
- **웹 서버가 요청을 받을 때** — 들어오는 요청 자체가 읽는 스트림이라, 본문이 다 도착하기 전에 앞부분부터 다룰 수 있다.
- **터미널에 찍히는 출력** — 표준 출력도 쓰는 스트림이다. 프로그램이 끝나기를 기다리지 않고 찍히는 대로 한 줄씩 나온다.

## 🚫 흔한 오해

- **스트림이면 메모리를 안 쓴다** — 안쪽에 버퍼가 있다. 문턱은 "여기까지 담기면 그만 달라고 한다" 는 선이지 메모리 상한이 아니다.
- **무조건 스트림으로 읽는 게 낫다** — 몇 KB 짜리 설정 파일까지 조각으로 다루면 코드만 길어진다. 크기가 손에 들어오는 것이 확실하면 통째로 읽는 편이 짧고 안전하다.
- **스트림은 파일 읽을 때 쓰는 것이다** — 망 연결도, 압축도, 터미널 출력도 같은 모양이다. 그래서 파일에서 읽어 망으로 보내는 코드가 한 줄이 된다.

## 📝 정리

**"조각으로 흘려 보내는 그 통로"** 라고 읽으면 된다. 크기를 내가 못 정하는 것을 다룰 때 먼저 떠올리면 된다. 안쪽 버퍼의 문턱이 빠른 쪽과 느린 쪽 사이의 속도를 맞춰 주지만, 그 문턱은 상한이 아니다.

## 🧒 열 살에게

목욕물을 커다란 통에 다 받아서 들고 오면 무겁지? 수도꼭지를 틀어 놓고 나오는 만큼 바로 쓰면 손에는 한 컵씩만 있으면 돼. 그래서 물이 아무리 많아도 하나도 안 무거워.

## ❓ 이해했는지

- 크기를 모르는 파일을 다뤄야 한다. 통째로 읽으면 무엇이 문제인가 → 해결하는 문제
- 받는 쪽이 느린데 보내는 쪽이 계속 부으면 무슨 일이 일어나나 → 작동 원리
- 조각 하나를 내보내고 나면 그 자리는 어떻게 되나 → 그림

## 🔗 관련 용어

- [[Back Pressure]] — 받는 쪽이 느릴 때 스트림이 스스로 속도를 늦추는 장치
- [[Pipeline]] — 스트림 여럿을 한 줄로 이어 붙이는 모양
- [[Iterator]] — 하나씩 내주는 같은 생각을 모아 둔 것에 적용한 자리
- [[Memory]] — 스트림이 아끼려는 바로 그 자원

---

**출처**

- https://nodejs.org/api/stream.html (Node.js Docs — Stream. "A stream is an abstract interface for working with streaming data in Node.js."; "There are many stream objects provided by Node.js. For instance, a request to an HTTP server and `process.stdout` are both stream instances."; 네 기본형 — "Writable: streams to which data can be written", "Readable: streams from which data can be read", "Duplex: streams that are both Readable and Writable", "Transform: Duplex streams that can modify or transform the data as it is written and read (for example, `zlib.createDeflate()`)"; Buffering 절 — "Both Writable and Readable streams will store data in an internal buffer. The amount of data potentially buffered depends on the `highWaterMark` option"; "Once the total size of the internal read buffer reaches the threshold specified by `highWaterMark`, the stream will temporarily stop reading data from the underlying resource"; "While the total size of the internal write buffer is below the threshold set by `highWaterMark`, calls to `writable.write()` will return `true`. Once the size of the internal buffer reaches or exceeds the `highWaterMark`, `false` will be returned."; "A key goal of the stream API, particularly the `stream.pipe()` method, is to limit the buffering of data to acceptable levels such that sources and destinations of differing speeds will not overwhelm the available memory."; "The `highWaterMark` option is a threshold, not a limit: it dictates the amount of data that a stream buffers before it stops asking for more data. It does not enforce a strict memory limitation in general. Specific stream implementations may choose to enforce stricter limits but doing so is optional."; "Because Duplex and Transform streams are both Readable and Writable, each maintains two separate internal buffers used for reading and writing, allowing each side to operate independently of the other"; `pipeline()` 예가 `createReadStream` → `createGzip` → `createWriteStream` 을 이어 붙인다; Event: 'drain' — "If a call to `stream.write(chunk)` returns `false`, the 'drain' event will be emitted when it is appropriate to resume writing data to the stream.", 그 예제 주석이 "Be attentive to back-pressure.")
- https://pkg.go.dev/io (Go — io 패키지. "Package io provides basic interfaces to I/O primitives. Its primary job is to wrap existing implementations of such primitives, such as those in package os, into shared public interfaces that abstract the functionality"; `Reader` — "the interface that wraps the basic Read method. Read reads up to len(p) bytes into p."; "If some data is available but not len(p) bytes, Read conventionally returns what is available instead of waiting for more."; `Copy` — "Copy copies from src to dst until either EOF is reached on src or an error occurs."; `CopyBuffer`; `ReadAll` — "ReadAll reads from r until an error or EOF and returns the data it read." 통째로 읽는 쪽의 대비; `LimitReader` — "returns a Reader that reads from r but stops with EOF after n bytes")
