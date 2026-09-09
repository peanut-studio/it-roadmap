# Iterator (반복자)

## 📝 정의

반복자는 **속을 안 열고 원소를 하나씩 내주는** 물건이다.

코틀린 문서는 이것을 "컬렉션의 속 구조를 드러내지 않고 원소에 차례로 닿게 해 주는 객체" 로 적는다. 고(Go) 문서는 같은 일을 다른 모양으로 정의한다 — "이터레이터는 열의 원소를 차례로 콜백 함수에 건네는 함수다". 앞의 것은 쓰는 쪽이 하나씩 꺼내 가는 모양이고, 뒤의 것은 모아 둔 쪽이 하나씩 밀어 주는 모양이다.

### 이름
Iterate :: 하나씩 훑다
-or :: 그 일을 맡은 것
= 붙여 읽으면 "하나씩 훑어 주는 것". 어디까지 갔는지 기억하는 것이 그 일이다

### 비유
책갈피. 어디까지 읽었는지만 기억하니 책이 얼마나 두꺼운지, 어떻게 묶였는지는 알 필요가 없다.

### 예
목록을 처음부터 끝까지 도는 반복문을 쓸 때, 뒤에서 조용히 만들어져 도는 것이 이것이다.

## 🖼️ 그림으로 보기

```도해
흐름: 반복자는 원소를 어떻게 하나씩 내주나
모음 :: 훑을 자리를 하나 내준다. 첫 원소에 놓인 채로
물음 :: 다음이 남았나 확인한다. 없으면 여기서 끝난다
꺼내기 :: 지금 원소를 내주고 자리를 한 칸 옮긴다
쓰는 쪽 :: 받은 원소로 할 일을 한다
@ 다시 물음으로 :: 남았으면 한 바퀴 더 돈다
= 속을 열지 않아도 원소가 하나씩 나온다. 밖에 남는 것은 자리 하나뿐이다
```

## ⚠️ 해결하는 문제

```도해
대조: 원소를 꺼내려고 속 구조를 알아야 하면 무엇이 곤란한가
속을 알고 꺼내면 || 반복자로 꺼내면
쓰는 쪽이 아는 것 :: 속 구조까지 안다 || 다음이 있나뿐이다
담는 방식이 여럿 :: 종류마다 다르게 || 한 방법으로 훑는다
담는 것을 바꾸면 :: 도는 코드도 고친다 || 그대로 둔다
= 훑는 길 하나만 밖에 내주면, 안이 무엇이든 쓰는 쪽은 같은 코드로 돈다
```

모아 둔 것은 종류마다 속이 다르다. 번호로 집는 것도 있고, 번호가 아예 없는 것도 있고, 파일처럼 앞에서부터 흘러나오기만 하는 것도 있다. 꺼내는 쪽이 그 속을 알아야 한다면 담는 방식마다 도는 코드를 따로 써야 하고, 나중에 담는 방식을 바꾸면 그 코드를 전부 다시 손봐야 한다.

반복자는 "다음이 남았나" 와 "그럼 하나 줘" 두 가지만 밖에 내준다. 코틀린 문서가 `Set` 과 `List` 를 포함해 `Iterable` 을 상속한 것이면 무엇이든 `iterator()` 하나로 같은 물건을 얻는다고 적는 것이 이 말이다. 안이 무엇이든 쓰는 쪽은 같은 두 마디만 알면 된다.

## ⚙️ 작동 원리

```도해
대조: 원소를 옮기는 일을 누가 주도하나
꺼내 가는 쪽 |=| 밀어 주는 쪽
누가 부르나 :: 쓰는 쪽이 부른다 || 모음이 부른다
멈추는 법 :: 그만 부르면 된다 || 아니라고 답한다
다시 훑으려면 :: 새로 하나 받는다 || 함수를 다시 부른다
= 코틀린의 반복자는 앞의 모양, 고의 이터레이터는 뒤의 모양이다
```

꺼내 가는 모양에서는 쓰는 쪽이 "다음이 있나" 를 묻고 "하나 줘" 를 부른다. 코틀린 문서는 얻은 반복자가 처음에 첫 원소를 가리키고, `next()` 를 부르면 그 원소를 돌려주면서 자리를 다음으로 옮긴다고 적는다. 마지막을 지나면 그 반복자는 더 못 쓰고 앞으로 되감을 수도 없어서, 다시 돌려면 새로 하나 만들어야 한다.

밀어 주는 모양에서는 반대로 모아 둔 쪽이 원소마다 콜백(넘겨받은 함수)을 부른다. 고 문서는 그 콜백이 참을 답하면 다음 원소로 가고 거짓을 답하면 거기서 멈춘다고 적고, 거짓을 답한 뒤에 또 부르면 그 자리에서 프로그램이 멈춘다고 못 박는다. 한 칸씩 꺼내 쓰고 싶으면 `Pull` 이 이 모양을 꺼내 가는 모양으로 바꿔 `next` 와 `stop` 두 개를 내주는데, 끝까지 안 받고 그만둘 거면 `stop` 을 반드시 불러야 반복자 쪽이 뒷정리를 하고 끝난다.

훑으면서 고치는 일은 언어마다 갈린다. 코틀린은 그러라고 `remove()` 가 달린 반복자를 따로 두고, 고 문서는 이터레이터가 값만 줄 뿐 고치는 길은 주지 않는다고 적는다.

## 💡 실제 사례

- **목록 하나를 `for` 로 도는 코드** — 반복자가 한 줄도 안 보이지만 이미 만들어져 돌고 있다. 손으로 만들어 도는 코드와 결과가 같다.
- **로그 파일을 한 줄씩 읽을 때** — 되감을 수 없는 흐름이라 두 번 돌면 두 번째는 빈손이다. 한 번만 쓸 수 있는 반복자는 그 사실을 이름에 적어 둔다.
- **맵을 정해진 차례로 돌아야 할 때** — 맵이 내주는 반복자에는 차례가 없다. 열쇠를 먼저 모아 정렬한 뒤 그 목록을 도는 것이 흔한 수다.

## 🚫 흔한 오해

- **반복자는 반복문의 다른 이름이다** — 반복문은 도는 문법이고 이것은 다음 원소를 내주는 물건이다. 코틀린 문서는 `for` 를 쓰면 이 물건이 안 보이게 만들어질 뿐이라고 적는다.
- **한 번 만든 반복자로 몇 번이든 훑는다** — 코틀린 문서는 마지막 원소를 지나면 더 못 쓰고 되감을 수도 없으니, 다시 돌려면 새로 만들라고 적는다. 앞뒤로 다니는 목록 전용 반복자만 예외다.
- **무엇이든 반복자로 돌면 된다** — 순서대로 하나씩 볼 때 쓰는 물건이다. 몇 번째 것을 바로 집어야 하는 일에는 이 물건이 답하는 물음 자체가 다르다.

## 📝 정리

**"속을 안 열고 하나씩 내주는 그 물건"** 이라고 읽으면 된다. 쓰는 쪽은 "다음이 남았나, 그럼 하나 줘" 만 알면 되고 안이 배열이든 집합이든 한 줄씩 읽는 파일이든 같은 코드로 돈다. 끝까지 간 반복자는 되감기지 않으니 다시 돌려면 새로 받는다.

## 🧒 열 살에게

책 읽다가 어디까지 봤는지 표시해 두는 책갈피 있지? 책갈피만 있으면 그 책이 얼마나 두꺼운지 몰라도 다음 쪽을 계속 넘길 수 있어. 누가 대신 책갈피를 옮겨 주면 너는 다음 이야기만 받아 보면 돼.

## ❓ 이해했는지

- 담는 방식을 바꿨는데도 도는 코드를 안 고쳐도 되는 이유는 무엇인가 → 해결하는 문제
- 끝까지 간 반복자로 처음부터 다시 돌 수 없는 이유는 무엇인가 → 흔한 오해
- 원소를 밀어 주는 쪽이 주도할 때 그만 받고 싶으면 어떻게 하나 → 작동 원리

## 🔗 관련 용어

- [[Loop]] — 반복문. 반복자를 안 보이게 감싸서 도는 문법이다
- [[Array]] — 번호로 바로 집는 모음. 반복자는 번호 없이도 도는 길을 준다
- [[Interface]] — "다음이 있나 / 하나 줘" 만 약속으로 내주는 자리
- [[Generic]] — 원소 타입이 무엇이든 같은 반복자로 다루게 하는 장치

---

**출처**

- https://kotlinlang.org/docs/iterators.html (Kotlin Docs — Iterators. "objects that provide access to the elements sequentially without exposing the underlying structure of the collection"; "Iterators can be obtained for inheritors of the `Iterable<T>` interface, including `Set` and `List`, by calling the `iterator()` function"; "calling the `next()` function returns this element and moves the iterator position to the following element"; "Once the iterator passes through the last element, it can no longer be used for retrieving elements; neither can it be reset to any previous position. To iterate through the collection again, create a new iterator."; "When using `for` on a collection, you obtain the iterator implicitly."; `ListIterator` 는 `hasPrevious()`·`previous()` 로 양방향이라 "can still be used after it reaches the last element"; `MutableIterator` 는 `remove()` 로 훑으면서 지운다)
- https://pkg.go.dev/iter (Go — iter 패키지. "An iterator is a function that passes successive elements of a sequence to a callback function, conventionally named yield."; "Yield returns true if the iterator should continue with the next element in the sequence, false if it should stop."; "Yield panics if called after it returns false."; "Calling the iterator again walks the sequence again."; 단일 사용 이터레이터 — "typically report values from a data stream that cannot be rewound to start over … should document this fact"; `Pull` 이 "push-style" 을 "pull-style" 로 바꿔 next·stop 을 준다 — "If clients do not consume the sequence to completion, they must call stop"; "Iterators provide only the values of the sequence, not any direct way to modify it."; `maps.Keys` 와 `slices.Sorted` 로 정렬해 도는 예)
