# Connect AI Office Simulator Web UI

React + Vite 기반의 Connect AI 운영 화면입니다. CEO가 목표를 내리면 AI 직원들이 각자 자리에서 작업하고, CEO 방으로 이동해 보고하고, Telegram 승인 대기와 스킬/모델 편집 흐름까지 한 화면에서 볼 수 있게 만든 웹 시뮬레이터입니다.

## 핵심 기능

- AI 1인 기업 사무실 화면
- 10명 구성 표시: CEO + 9명 직원
- 픽셀 오피스 시뮬레이터: 직원별 자리, 말풍선, CEO 보고 이동, 복귀 흐름
- CEO 방이 하단에 분리된 `Office_Design_2` 픽셀 배경 맵 적용
- 직원별 작업 카드와 실시간 보고 로그
- 작업 카드 클릭 시 업무 관찰, 장기 기억 저장, 스킬 개선 제안, 예약 실행 대기 상태 표시
- 수익/번돈 확인 패널: YouTube/웹사이트/자동화/Telegram 상품별 확인 금액과 월 목표 대비 진행률 표시
- 작업 카드 클릭 시 선택 직원 전용 `Profiles / Closed Learning Loop / Gateways & Schedules / Revenue Check` 미니 패널 표시
- 직원별 모델 선택과 스킬 직접 편집
- 직원 프로필 이름/사진 URL 편집, 작업 카드와 시뮬레이션 이름표 동기화
- `pixel-agent-office-simulator` 로컬 스킬 연동 및 `skills/pixel-agent-office-simulator.skill` 패키지 포함
- 24시간 자율 사이클은 사용자가 켜야 시작되는 운영 제어 UI
- 데일리 브리핑 시간, 비서 브릿지 모드, Auto-Git Sync 승인 큐, Dynamic Model Detection 표시
- Telegram 연결 대상 표시와 승인 대기 UI
- Connect AI 원본 신호: P-Reinforce, Agent University, Auto-Git Sync, Dynamic Model Detection

## 실행

PowerShell에서 이 폴더로 이동한 뒤 실행합니다.

```powershell
npm install
npm run dev
```

기본 로컬 주소:

```text
http://127.0.0.1:5199/
```

## 검증

```powershell
npm test
npm run build
```

현재 검증된 항목:

- 10명 에이전트 구조 유지
- 3D/픽셀 무대 payload 확인
- 직원별 말풍선과 이동 상태 동기화
- 수익/번돈 확인 패널과 직원별 Revenue Check 표시
- 선택 직원 전용 Profiles/Closed Learning Loop/Gateways 미니 패널 표시
- `24시간 업무` 사용자 제어 상태 유지
- Telegram 대상 표시
- `pixel-agent-office-simulator` 추천/기본 스킬 연결
- `npm test`, `npm run build` 통과

## 참고 원본

- Connect AI: https://github.com/lsi9923/connect-ai
- Sang AI Office Simulator: https://github.com/lsi9923/sang-ai-office-simulator
- Hermes Desktop: https://github.com/fathah/hermes-desktop
- Hermes Agent Docs: https://hermes-agent.nousresearch.com/docs
