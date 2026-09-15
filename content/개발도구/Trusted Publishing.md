# Trusted Publishing (믿는 곳에만 맡기는 게시)

## 📝 정의

Trusted Publishing 은 **긴 토큰 대신 빌드 작업의 신원으로 패키지를 올리는 방식**이다.

PyPI 가 붙인 이름인데, 지금은 npm 과 RubyGems 도 같은 방식을 쓴다. OpenSSF 가 규정한 업계 표준으로 정리되어, 주요 레지스트리들이 같은 방식을 따른다.

### 이름
Trusted :: 믿기로 정해 둔
Publishing :: 올려 내놓는 일
= 붙여 읽으면 "믿기로 정해 둔 데서만 올리는 일". 믿는 대상이 사람이 아니라 특정 빌드 작업이다

### 비유
예약자 명단만 보는 문. 이름을 대면 그 자리에서 15분짜리 임시 출입증을 내주고, 그 시간이 지나면 저절로 못 쓰게 된다.

### 예
패키지를 올리려고 [[CI/CD]] 설정에 넣어 둔 긴 토큰을 몇 년째 그대로 두고 있다면, 그 자리를 아예 없애는 방법이다.

## 🖼️ 그림으로 보기

```도해
흐름: 토큰을 두지 않고 어떻게 패키지가 올라가나
작업 :: 이 빌드가 누구인지 적힌 증표를 발급받는다
레지스트리 :: 증표의 서명을 만든 쪽 열쇠로 확인한다
맞춰보기 :: 미리 등록해 둔 저장소·워크플로와 대조한다
< 작업 :: 맞으면 15분짜리 임시 토큰을 받는다
올리기 :: 그 임시 토큰으로 패키지를 올린다
= 오래 사는 비밀을 두는 대신, 올리는 그 순간에만 권한이 생긴다
```

## ⚠️ 해결하는 문제

```도해
대조: 오래 사는 토큰을 빌드 설정에 두면 무엇이 문제인가
긴 토큰 || 신뢰 게시
수명 :: 지울 때까지 산다 || 15분이면 끝난다
새어 나가면 :: 계속 쓸 수 있다 || 곧 만료된다
관리 :: 사람이 갈아 준다 || 갈 것이 없다
= 비밀을 더 잘 숨기는 대신, 숨길 비밀 자체를 없앤다
```

한 번 만들어 둔 게시용 토큰은 지우기 전까지 살아 있다. 빌드 기록이나 설정 파일에 실수로 찍혀 나가기 쉽고, 필요한 것보다 넓은 권한을 갖고 있는 경우도 많다. 새어 나간 것을 아무도 못 알아채면 공격자는 그 토큰으로 계속 새 판을 올릴 수 있다.

신뢰 게시는 그 비밀을 없앤다. 패키지 쪽에 "이 저장소의 이 워크플로만 믿는다" 고 적어 두면, 빌드가 돌 때 받아 온 증표가 그 조건과 정확히 맞을 때만 올리기가 통한다. 그 대가로 받는 토큰도 그 패키지에만 통하고 15분이면 끝난다.

## ⚙️ 작동 원리

증표는 [[OpenID Connect]] 라는 규격으로 오간다. 깃허브 액션 같은 빌드 서비스가 자기 열쇠로 서명한 증표를 만들어 주는데, 그 안에는 저장소 이름·워크플로 파일 이름·환경 이름처럼 이 작업이 무엇인지 말해 주는 값들이 들어 있다.

레지스트리가 하는 일은 둘이다. 먼저 증표의 서명을 발급한 쪽의 공개 열쇠로 확인해서 정말 그 서비스가 준 것인지 본다. 그다음 증표 안의 값들을 패키지마다 등록해 둔 조건과 맞춰 본다. 워크플로 파일 이름 하나만 달라도 맞지 않는다.

계정 이름은 지웠다가 남이 다시 만들 수 있기 때문에, 이름만 믿지 않고 바뀌지 않는 숫자 식별자까지 함께 본다. 다 맞으면 그제야 짧게 사는 토큰을 만들어 돌려주고, 올리기는 그 토큰으로 진행된다.

## 💡 실제 사례

- **빌드에서 바로 올리기** — 워크플로에 증표를 받을 권한 한 줄을 주면, 명령줄 도구가 그 환경을 알아보고 토큰 없이 올린다.
- **출처 증명이 따라붙는다** — npm 은 공개 저장소의 공개 패키지를 깃허브 액션에서 이 방식으로 올리면, 어디서 어떻게 만들어졌는지 증명하는 기록을 따로 시키지 않아도 붙인다.
- **레지스트리를 옮겨도 같은 모양** — 파이썬 쪽과 자바스크립트 쪽이 같은 규격을 쓰기 때문에, 설정하는 자리만 다르고 하는 일은 같다.

## 🚫 흔한 오해

- **이걸 켜면 공급망 공격은 끝난다** — 증명되는 것은 "누가 어디서 올렸나" 까지다. 그 안에 들어간 코드가 안전하다는 뜻은 아니다.
- **이제 토큰은 하나도 필요 없다** — 갈음되는 것은 올리는 일뿐이다. 비공개 의존성을 내려받는 데는 읽기 권한 토큰이 여전히 필요하다.
- **아무 빌드 환경에서나 된다** — 레지스트리가 미리 등록해 둔 제공자의 클라우드 러너만 된다. 직접 세운 러너는 아직 지원되지 않는다.

## 📝 정리

**"올리는 그 순간에만 권한을 내주는 게시 방식"** 이라고 읽으면 된다. 믿는 대상이 토큰을 가진 사람이 아니라 정해 둔 저장소의 정해 둔 작업이라서, 훔쳐 갈 비밀이 애초에 남지 않는다. 대신 워크플로 이름 한 글자만 달라져도 올리기가 막히므로, 설정을 바꿀 때는 등록해 둔 조건도 같이 고쳐야 한다.

## 🧒 열 살에게

학교 열쇠를 가방에 늘 넣고 다니면 잃어버리기 쉽지? 그래서 열쇠는 아예 안 주고, 문 앞에서 얼굴을 확인한 다음 십오 분만 쓸 수 있는 종이표를 내주는 거야. 시간이 지나면 그 표는 저절로 못 쓰게 돼서, 누가 주워도 소용이 없어.

## ❓ 이해했는지

- 올리는 쪽에 아무 비밀도 저장해 두지 않는데 레지스트리는 상대가 누구인지 어떻게 아나 → 작동 원리
- 새어 나간 증표로 한참 뒤에 다시 올릴 수 없는 이유는 무엇인가 → 그림
- 이 방식으로 바꾼 뒤에도 토큰이 남아 있어야 하는 경우는 언제인가 → 흔한 오해

## 🔗 관련 용어

- [[Supply Chain Attack]] — 게시 권한을 빼앗는 것이 이 공격의 흔한 첫 단추다
- [[OpenID Connect]] — 증표를 주고받는 데 쓰는 그 규격
- [[CI/CD]] — 이 방식으로 올리는 일이 실제로 벌어지는 자리
- [[Environment Variable]] — 전에는 긴 토큰이 놓여 있던 자리
- [[Package Manager]] — 이렇게 올라간 패키지를 내려받는 쪽 도구

---

**출처**

- https://pypi.org/help/ (PyPI Help — "How can I use Trusted Publishers to publish to PyPI?": "PyPI users and projects can use Trusted Publishers to delegate publishing authority for a PyPI package to a trusted third party service, eliminating the need to use API tokens." / API 토큰 항목: CI 제공자가 지원하면 Trusted Publishing 을 강력히 권장)
- https://raw.githubusercontent.com/pypi/warehouse/main/docs/user/trusted-publishers/index.md (Publishing to PyPI with a Trusted Publisher — "Trusted Publishing" 은 OIDC 로 짧게 사는 신원 토큰을 교환하는 것에 붙인 PyPI 의 이름 / CI 가 OIDC 제공자로서 증표를 발급하고, 프로젝트가 특정 설정을 신뢰하도록 등록하며, 일치하면 15분짜리 프로젝트 범위 API 토큰을 발급 / 긴 수명 토큰은 탈취되면 사용자가 알아채고 폐기할 때까지 쓰인다는 보안 이점 비교 / API 토큰을 보완하는 방식)
- https://raw.githubusercontent.com/pypi/warehouse/main/docs/user/trusted-publishers/internals.md (Internals and Technical Details — OIDC 토큰의 claims(repo·workflow·environment)와 Trusted Publisher 설정의 정확한 일치, 서명 검증 후 토큰 교환 / account resurrection 방지를 위해 repository_owner_id 같은 불변 숫자 식별자 확인 / IdP 는 OpenID Connect Discovery 의 jwks_uri·claims_supported 를 제공해야 함)
- https://raw.githubusercontent.com/npm/documentation/main/content/packages-and-modules/securing-your-code/trusted-publishers.mdx (Trusted publishing for npm packages — OIDC 로 CI/CD 에서 직접 게시, 긴 npm 토큰 불필요 / OpenSSF 가 규정한 trusted publishers 업계 표준 구현이며 PyPI·RubyGems 가 같은 대열 / npm CLI 가 OIDC 환경을 자동 감지 / 지원 제공자는 GitHub Actions·GitLab CI/CD·CircleCI 의 클라우드 러너, self-hosted runner 미지원 / 공개 저장소·공개 패키지를 이 방식으로 올리면 provenance 를 자동 생성 / 긴 토큰의 위험: 로그·설정 노출, 수동 교체, 탈취 시 지속적 접근, 과도한 권한 / 비공개 의존성 설치에는 여전히 읽기 전용 토큰 필요 / 워크플로 파일 이름은 대소문자까지 정확히 일치해야 함)
- https://raw.githubusercontent.com/npm/documentation/main/content/packages-and-modules/securing-your-code/generating-provenance-statements.mdx (Generating provenance statements — provenance 는 어디서 어떻게 빌드됐는지를 공개적으로 잇는 증명이며, 있다고 해서 악성 코드가 없다는 보장은 아니다)
