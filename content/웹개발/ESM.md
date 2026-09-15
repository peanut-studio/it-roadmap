# ESM (ECMAScript Module)

## 📝 정의

ESM 은 **import 와 export 로 코드를 나눠 쓰는 자바스크립트 표준 모듈 형식**이다.

웹 플랫폼은 이 형식을 기본 모듈 형식으로 받아들였고, 그 앞에 쓰이던 CommonJS 를 밀어냈다. Node.js 는 지금도 두 형식을 다 돌리지만, 새로 만드는 패키지와 새 자바스크립트 실행 환경은 이쪽을 기준으로 잡는다.

### 이름
ECMAScript :: 자바스크립트 표준
Module :: 갈아 끼우는 한 칸
= 붙여 읽으면 "표준이 정한 한 칸". 도구가 정한 관행이 아니라 언어 규격 안에 들어간 형식이라는 뜻이다

### 비유
부품 상자. 상자마다 밖에 내놓을 부품에만 이름표를 달아 두고, 필요한 쪽은 상자를 뒤지지 않고 그 이름표만 부른다.

### 예
새 프로젝트의 `package.json` 맨 위에 `"type": "module"` 한 줄이 들어 있는 걸 본 적 있다면, 그게 이 형식으로 읽으라는 표시다.

## 🖼️ 그림으로 보기

```도해
흐름: import 한 줄은 코드가 돌기 전에 무엇을 거치나
읽기 :: 파일에서 import·export 목록부터 뽑아 둔다
찾기 :: 가져올 파일의 주소를 주소 규칙으로 정한다
잇기 :: 내보낸 이름과 가져온 이름을 서로 맞춰 건다
돌리기 :: 다 이어진 뒤에야 파일 안의 코드가 돈다
= 코드를 돌려 보기 전에 주고받을 이름부터 잇는 형식이다
```

## ⚠️ 해결하는 문제

```도해
대조: 모듈 형식이 없으면 남의 코드를 어떻게 불러 쓰나
스크립트 나열 || ESM 으로
이름 :: 전역에 다 섞인다 || 파일 안에 갇힌다
가져오기 :: 끼운 순서로 맞춘다 || 이름을 집어 온다
빠진 이름 :: 돌려 봐야 안다 || 돌기 전에 걸린다
= 파일마다 문을 좁게 내고, 그 문끼리만 잇는다
```

파일을 차례로 끼워 넣기만 하던 시절에는 모든 이름이 한 자리에 섞였다. 뒤에 끼운 파일이 앞 파일의 이름을 덮어써도 아무도 막지 않고, 순서를 한 칸 바꾸면 멀쩡하던 화면이 깨졌다.

ESM 은 파일 하나를 그 자체로 한 칸으로 만든다. 안에서 선언한 이름은 그 파일 것이고, `export` 라고 적은 것만 밖에서 보인다. 가져오는 쪽도 `import` 로 이름을 집어 오기 때문에, 이름이 겹치거나 없는 이름을 가져오라고 적으면 코드가 돌기 전 이어 붙이는 단계에서 걸린다. 그렇게 걸린 파일은 아예 실행되지 않는다.

## ⚙️ 작동 원리

`import` 뒤의 문자열을 명세자라고 부르고, 세 가지가 있다. `'./setup.js'` 같은 상대 경로, `'react'` 처럼 패키지 이름만 적는 맨 이름, 그리고 절대 주소다. 상대 경로에는 확장자를 반드시 적어야 하고, 폴더 이름만 적어 놓고 그 안의 `index.js` 로 가 주기를 바랄 수도 없다. 브라우저에서 `import` 가 동작하는 방식을 그대로 따른 결과다.

ESM 은 파일을 경로가 아니라 주소(URL)로 보고 그 주소 단위로 한 번만 읽어 둔다. `file:`·`node:`·`data:` 로 시작하는 주소를 쓸 수 있고, 같은 파일이라도 주소 뒤에 붙은 물음표가 다르면 다른 것으로 친다.

CommonJS 와 섞어 쓰는 길도 열어 뒀다. ESM 안에서 CommonJS 를 `import` 하면 그쪽의 `module.exports` 가 기본 내보내기 자리로 들어온다. 반대로 CommonJS 의 `require` 로 ESM 을 부르는 것은 맨 위에서 `await` 를 쓰지 않은 파일에만 된다.

## 📊 비교: CommonJS 와 ESM

```도해
대조: CommonJS 와 ESM 은 무엇이 다른가
CommonJS |=| ESM
부르는 말 :: require 로 부른다 || import 로 부른다
읽는 때 :: 돌다가 그 줄에서 || 돌기 전에 먼저
파일 표시 :: 확장자는 .cjs || 확장자는 .mjs
= 한 프로젝트 안에서 어느 쪽으로 읽을지는 확장자와 type 한 줄이 정한다
```

## 💡 실제 사례

- **한 줄로 폴더 전체 바꾸기** — `package.json` 의 `"type": "module"` 하나가 그 파일을 가장 가까운 상위로 두는 `.js` 파일을 전부 이 형식으로 읽게 만든다.
- **오래된 패키지 불러오기** — ESM 안에서 CommonJS 패키지를 `import` 하면 그쪽의 `module.exports` 가 기본 내보내기로 들어온다.
- **설정을 받아 온 뒤에 시작하기** — 함수 밖 맨 윗줄에서도 `await` 를 쓸 수 있어서, 먼저 받아 올 것을 받고 나머지를 돌린다.

## 🚫 흔한 오해

- **이제 ESM 만 쓰면 된다** — Node.js 는 두 형식을 다 돌린다. `require` 로 부를 수 있는 ESM 은 맨 위에 `await` 가 없는 것뿐이라, 통째로 옮기면 그 자리에서 막히는 코드가 생긴다.
- **확장자는 생략해도 알아서 찾아 준다** — `import` 로 상대 경로를 부를 때는 확장자를 적어야 한다. 폴더 이름만 적고 `index.js` 로 들어가 주기를 바라는 것도 안 된다.
- **`__dirname` 은 어디서나 쓸 수 있다** — ESM 에는 없다. `import.meta.dirname` 과 `import.meta.filename` 이 그 자리를 대신한다.

## 📝 정리

**"코드를 돌리기 전에 주고받을 이름부터 잇는 그 표준 형식"** 이라고 읽으면 된다. 파일 하나가 곧 한 칸이고, 내보낸다고 적은 이름만 밖으로 나간다. 옆에 남아 있는 CommonJS 와 섞어 쓸 길은 열려 있지만, 어느 쪽으로 읽을지는 확장자나 `type` 한 줄이 먼저 정한다.

## 🧒 열 살에게

블록으로 집을 지을 때 상자마다 밖에 내놓을 블록만 이름표를 달아 두면 좋지? 필요한 사람은 상자를 다 뒤지지 않고 이름표만 부르면 돼. 없는 이름표를 부르면 집을 짓기 전에 바로 알 수 있어서 다 지어 놓고 무너지는 일이 없어.

## ❓ 이해했는지

- 없는 이름을 가져오라고 적으면 그 잘못은 언제 드러나나 → 그림
- 상대 경로를 부를 때 확장자를 빠뜨리면 왜 못 찾나 → 흔한 오해
- 한 폴더의 `.js` 를 통째로 이 형식으로 읽게 하려면 어디에 무엇을 적나 → 실제 사례

## 🔗 관련 용어

- [[JavaScript]] — 이 형식이 규격 안에 들어간 언어
- [[Package]] — `import` 로 맨 이름만 적었을 때 찾아가는 단위
- [[Package Manager]] — 그 맨 이름을 실제 파일로 내려받아 두는 도구
- [[Code Splitting]] — 가져오는 자리를 갈라 나중에 받게 만드는 기법
- [[WebAssembly]] — 자바스크립트 밖의 모듈도 같은 `import` 로 불러 쓴다

---

**출처**

- https://nodejs.org/api/esm.html (Modules: ECMAScript modules — Introduction: "ECMAScript modules are the official standard format to package JavaScript code for reuse", import/export 로 정의 / Enabling: .mjs·package.json "type": "module"·--input-type, 반대쪽은 .cjs·"commonjs", 표시가 없으면 소스를 살펴 판정 / import Specifiers: 상대·맨 이름·절대 세 가지 / Mandatory file extensions: 상대·절대 명세자는 확장자 필수, 디렉터리 인덱스도 전부 적어야 하며 브라우저의 import 동작을 따른 것 / URLs: 모듈은 URL 로 해석·캐시되고 file:·node:·data: 지원, 질의 문자열이 다르면 다시 읽음 / Interoperability with CommonJS: CommonJS 를 import 하면 module.exports 가 default 로 들어옴, require 는 top-level await 이 없는 동기 ESM 만 적재 / Differences: require·exports·module.exports 없음, __filename·__dirname 없음 → import.meta.filename·import.meta.dirname / Top-level await: 모듈 최상위에서 await 사용 가능)
- https://nodejs.org/api/modules.html (Modules: CommonJS modules — require 로 부르는 원래 형식, module.exports)
- https://jsr.io/docs/why (Why JSR? — "ECMAScript modules have arrived as a standard. The web platform has now adopted ESM as the module format of choice, superseding CommonJS")
- https://raw.githubusercontent.com/tc39/ecma262/main/spec.html (ECMA-262 초안 — 15.2 Modules: ModuleItem 은 ImportDeclaration·ExportDeclaration·StatementListItem / Static Semantics Early Errors: ExportedNames 중복은 Syntax Error, "Additional error conditions relating to conflicting or duplicate declarations are checked during module linking prior to evaluation of a Module. If any such errors are detected the Module is not evaluated." / Source Text Module Records: import·export 한 이름을 미리 간추려 두고 그것으로 link·evaluate 한다)
