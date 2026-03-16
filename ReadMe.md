# ShootingGame — ReadMe / Game Design Document

**경로**: `Antigravity/ShootingGame/ReadMe.md`

**버전**: 1.1

**작성일**: 2026-03-11

**담당**: 기획자 / 프로그래머

---

## 1. 개요 (Overview)

`ShootingGame`은 **콜 오브 듀티 스타일의 정교한 조준(aiming) 시스템**과 **전술적이면서 경량화된 FSM 기반 AI**를 핵심으로 하는 웹 기반 슈팅 샘플 프로젝트이다. 프로젝트는 **Antigravity (JavaScript / Three.js)** 환경을 우선 타깃으로 하며, 브라우저( WebGL )에서 즉시 실행 가능한 형태를 목표로 한다.

핵심 목표는 '정밀한 조준 감각'과 '반응성 높은 적 AI(FSM)'를 결합해 몰입감 있는 PvE 전투를 제공하는 것이다.

---

## 2. 목표 (Goals)

- 현실적이면서 반응성이 좋은 조준(ADS, hip-fire, recoil, smoothing) 구현 (JavaScript / Three.js)
- 초기 프로토타입은 **FSM(Idle, Chase, Attack, Cover)** 기반 AI로 빠르게 동작하는 적을 확보
- 로딩 → 로비(로그아웃, 설정, 상점, 모드 변경, 게임 시작) → 매치 흐름 완성
- 데이터 드리븐 튜닝(JSON)으로 무기, AI 파라미터, 밸런스 관리
- 배포: 정적 호스팅(Vercel/Netlify/S3) 및 필요 시 Node 기반 API 연동

---

## 3. 프로젝트 범위 (Scope)

- 페이즈 1: 조준(ADS)·히트스캔·리코일 + FSM AI(Idle/Chase/Attack/Cover) + 로비 UI
- 페이즈 2: AI 전술 패턴 라이브러리(모듈화), 무기/탄도 확장, 상점/진행 시스템
- 페이즈 3: 최적화 및 웹 특화 UX(로드 시간 최적화, 자산 스트리밍)

---

## 4. 핵심 기능 요약 (Key Features)

- **조준 시스템**: ADS, hip-fire, recoil & view-kick, aiming smoothing, aim-assist 옵션(컨트롤러)
- **무기 시스템**: 주로 히트스캔 기반, 필요 시 projectile 보완
- **AI**: 초기에는 FSM(Idle / Chase / Attack / Cover)로 구현, 필요 시 Utility 요소를 부분 추가
- **로비**: 로그인/로그아웃, 설정, 상점(스킨/무기), 모드 선택
- **모드**: Solo Skirmish, Team PvE, Objective, Wave Survival
- **데이터 드리븐**: JSON으로 무기·AI 파라미터 관리 (JavaScript로 로드/적용)

---

## 5. 게임 플레이 흐름 (Gameplay Flow & UI)

1. **로딩 화면**
   - 에셋 스트리밍(Three.js 로더), 초기 설정 로드

2. **로비**
   - 로그아웃, 설정, 상점, 모드 선택, 난이도/AI 수 조절

3. **매치 시작**
   - 스폰 로직, 안전 시간, 매치 루프(생존/목표/점수)

4. **포스트 매치**
   - 결과 화면(스코어, 보상), 로비 복귀

---

## 6. 게임 모드 제안 (Game Modes)

- **솔로 스커미시**: 플레이어 1 vs AI 팀
- **팀 데스매치 PvE**: 혼합 팀 전투(플레이어 + AI)
- **목표 점령**: 맵 지점 점령/방어
- **웨이브 서바이벌**: 점점 강해지는 AI 웨이브

---

## 7. 코어 시스템 설계 (Core Systems)

### 7.1 조준 시스템 (Aiming System)

**디자인 목표**: 빠른 입력 반응성 + 현실적 반동(리코일)과 ADS 안정성.

**구성 요소**:
- 입력 레이어: 마우스/컨트롤러 샘플링, 감도, 가속 옵션 (JavaScript 이벤트 기반)
- 카메라 레이어: FOV 전환(hip ↔ ADS), camera smoothing (interpolation)
- 사격 레이어: 발사 로직(hitscan / projectile), 발사 rate, 탄도 분산
- 반동 시스템: recoil per shot, recoilRecoveryCurve(t)

**기술 세부사항**:
- **Hitscan**: Three.js의 Raycaster로 즉시 데미지 판정. 로컬 PvE 환경에서는 클라이언트 권한 허용.
- **ADS 구현**: 카메라 FOV와 마우스 감도 보정으로 ADS 동작을 자연스럽게 보간.
- **Recoil**: 데이터 드리븐으로 `recoilPerShot`, `recoilRecoveryTime` 등을 JSON으로 관리.

### 7.2 무기 시스템

- 무기 카테고리(Assault, SMG, Sniper 등)과 속성(RPM, Damage, Range, Recoil, Magazine)
- 대부분 히트스캔, 필요 시 projectile 지원(물리 보정은 간단한 투사체 모델)
- JSON 파일로 무기 파라미터 관리

### 7.3 이동 & 물리

- 상태: 걷기, 달리기, 슬라이딩(옵션), 구르기, 웅크림
- ADS 시 이동 속도 감소, 무기별 이동 페널티
- 충돌은 Three.js의 간단한 충돌 검사 또는 경량 물리(필요 시 Ammo.js 연동)

### 7.4 데미지 & 히트 리액션

- 부위별 데미지 멀티플라이어(head, torso, limb)
- 즉시 데스/체력 감소/다운(선택적)

### 7.5 AI 아키텍처 (FSM 우선)

**목표**: 빠른 프로토타이핑과 예측 가능한 행동을 위해 FSM을 기본으로 설계한다.

**핵심 상태(권장 4단계)**:
- **Idle**: 경계/순찰
- **Chase**: 적 발견 시 추적
- **Attack**: 사격/교전
- **Cover**: 엄폐하여 재장전/회복/전술적 대기

**구성요소**:
- **Perception**: Raycast 기반 시야 검사, 소리 이벤트 트리거
- **State Machine**: 각 AI는 상태와 상태 전이 조건(감지, 거리, 체력)으로 동작
- **Tactics**: 엄폐 포인트 탐색(런타임 샘플링), 근거리/원거리 판별
- **Navigation**: 웨이포인트 또는 그리드 기반 A* + 간단한 local avoidance

**확장 계획**: 이후 필요 시 Utility 스코어링을 보완하여 더 동적인 우선순위 결정을 도입할 수 있음.

---

## 8. 로비 및 UI 상세 설계

- **로딩 페이지**: Three.js 로더 표시, 게임 팁
- **로비 화면**: 계정/프로필, 모드/맵/난이도 선택, 로그아웃, 설정, 상점
- **설정**: 그래픽(해상도, 텍스처 품질), 오디오, 컨트롤(키/컨트롤러 매핑), 감도
- **상점**: 스킨/무기 잠금 해제, 가상 화폐(옵션)

---

## 9. 데이터 드리븐 & 툴링

- 모든 밸런스 데이터(무기, AI 파라미터)는 JSON으로 관리
- 튜닝 파이프라인: 인게임 콘솔 또는 개발자 툴로 실시간 값 변경
- 레벨 디자인 툴: 커버 포인트 마킹, 스폰 포인트 에디터(간단한 JSON 에디터)

---

## 10. 아트/애니/사운드 가이드라인

- 아트: 텍스처 아틀라스, LOD 정책, WebGL 친화적 압축 사용
- 애니메이션: IK를 통한 상체 aim 블렌딩 권장
- 사운드: 3D 사운드(발사, 발걸음), 소리 이벤트로 AI 트리거
- **자산 제작**: 안티그래비티 내장 도구 **Nano Banana 2**를 사용하여 텍스처와 UI 아이콘을 생성하는 파이프라인을 권장한다. (Nano Banana 2로 생성한 에셋은 `Assets/`에 저장)

---

## 11. 네트워크 고려사항 (메모)

- 현재는 로컬 PvE 우선. 멀티는 추후 확장 메모로 보관.
- 멀티 도입 시 필요 항목: 서버 권한 모델, 히트 검증, 클라이언트 예측/보정

---

## 12. 프로젝트 구조(웹 최적화 권장)

```
ShootingGame/
├─ public/                # 정적 자원 (index.html, favicon, static assets)
├─ src/                   # 애플리케이션 소스(JavaScript / TypeScript)
│  ├─ client/             # Antigravity / Three.js 진입점, 렌더 루프
│  ├─ scripts/            # 게임 로직 (player, weapons, ai)
│  ├─ ui/                 # UI 컴포넌트(HTML/CSS/JS)
│  └─ config/             # JSON 설정(무기, AI 파라미터)
├─ assets/                # 원본 에셋(nano-banana 생성물 포함)
├─ tools/                 # 에디터/빌드 툴(맵 에디터, 튜닝 툴)
├─ builds/                # 번들 결과물
└─ docs/                  # 기획서, 튜닝 문서
```

### 에이전트(담당) 매핑(권장)
- `src/scripts/ai/` : FSM 구현과 상태 전이 로직 담당
- `src/scripts/weapons/` : 무기 발사/리코일/데이터 적용 담당
- `src/client/` : 렌더 루프, 씬 로드, 입력 파이프라인
- `assets/` : Nano Banana 2로 생성한 텍스처·아이콘 관리

---

## 13. 마일스톤 & 일정(예시)

- Week 0–3: 프로토타입(ADS, 히트스캔, 리코일, FSM AI 기본 4상태)
- Week 4–7: 로비 + 모드 선택, 매치 매니저(게임 상태 머신)
- Week 8–12: AI 전술 패턴, 무기 밸런싱, 튜닝 툴 완성
- 이후: 최적화 및 폴리싱

---

## 14. QA, 테스트 계획

- 단위 테스트: 무기 파라미터/데미지 검증
- 자동 플레이테스트: AI 상태 전이 시나리오 검증
- 성능 테스트: 브라우저별 프레임 측정(목표 60FPS)

---

## 15. 성능 목표 및 최적화 전략

- 목표: 데스크탑 브라우저에서 60FPS
- 전략: 자산 스트리밍, 오클루전 컬링, 동적 LOD, 애니메이션 최적화

---

## 16. 텔레메트리 & 밸런스 지표

- 무기별 정확도, AI 승률, 라운드 길이, 히트 위치 분포

---

## 17. 보안 & 법적 고려사항

- 플레이 데이터 최소 수집 원칙
- 로그인 도입 시 개인정보 보호정책 수립

---

## 18. 부록: 샘플 튜닝 테이블 (예)

| Weapon | RPM | Damage | Range | Recoil | Magazine |
|--------|-----:|------:|------:|-------:|--------:|
| Assault_A | 750 | 30 | 50m | medium | 30 |
| Sniper_B  | 50  | 250| 200m | high   | 5  |

---

### 다음 단계 제안
- **안티그래비티 에이전트에게 Phase 1 프롬프트 입력**: Phase 1은 "ADS + 히트스캔 + 리코일 + FSM(Idle, Chase, Attack, Cover) AI"의 최소 기능을 구현하라는 지시를 포함.
- 무기 파라미터 JSON 템플릿 생성
- 로비 UI 및 매치 매니저(게임 상태 머신) 설계

---

*문서 끝.*
