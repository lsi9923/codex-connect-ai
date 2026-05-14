# Connect AI Office Simulator Web UI

React + Vite 기반의 Connect AI 운영 화면입니다. CEO가 목표를 내리면 로컬 브릿지가 실제 LM Studio/OpenRouter 같은 모델 공급자와 Telegram 상태를 확인하고, 직원별 작업 상태를 화면에 반영합니다.

## 핵심 기능

- AI 1인 기업 사무실 화면
- 10명 구성 표시: CEO + 9명 직원
- 픽셀 오피스 시뮬레이터: 직원별 자리, 말풍선, CEO 보고 이동, 복귀 흐름
- CEO 방이 하단에 분리된 `Office_Design_2` 픽셀 배경 맵 적용
- 직원별 작업 카드와 실시간 보고 로그
- 작업 카드 클릭 시 업무 관찰, 장기 기억 후보 파일, 스킬 개선 후보 파일, 예약 실행 대기 상태 표시
- 수익/번돈 확인 패널: PayPal/YouTube 실제 API 키나 OAuth 토큰이 없으면 `0원 / 미연결`로 표시
- 작업 카드 클릭 시 선택 직원 전용 `Profiles / Closed Learning Loop / Gateways & Schedules / Revenue Check` 미니 패널 표시
- 직원별 모델 선택과 스킬 직접 편집
- 직원 프로필 이름/사진 URL 편집, 작업 카드와 시뮬레이션 이름표 동기화
- `pixel-agent-office-simulator` 로컬 스킬 연동 및 `skills/pixel-agent-office-simulator.skill` 패키지 포함
- 24시간 자율 사이클은 사용자가 켜야 시작되는 운영 제어 UI
- 데일리 브리핑 시간, 비서 브릿지 모드, Auto-Git Sync 승인 큐, Dynamic Model Detection 표시
- Telegram `getMe` 기반 봇 이름 확인, 승인 버튼 클릭 시에만 실제 `sendMessage` 실행
- 로컬 브릿지 서버: `.hermes\.env`, 모델 공급자, 메모리, 스킬, 게이트웨이, git 상태 확인
- Connect AI 원본 신호: P-Reinforce, Agent University, Auto-Git Sync, Dynamic Model Detection

## 실행

PowerShell에서 이 폴더로 이동한 뒤 실행합니다.

```powershell
npm install
npm run dev
```

`npm run dev`는 브릿지와 Vite를 같이 실행합니다.

```text
브릿지: http://127.0.0.1:5198/
웹 UI:  http://127.0.0.1:5199/
```

웹 UI의 `/api/*` 요청은 Vite proxy를 통해 브릿지로 전달됩니다.

## 실제 연동 기준

- LM Studio: `http://127.0.0.1:1234/v1/models`와 `/v1/chat/completions`를 실제 호출합니다.
- Telegram: `.hermes\.env`의 `TELEGRAM_BOT_TOKEN`으로 `getMe`를 확인하고, 승인 시 `sendMessage`를 호출합니다.
- PayPal/YouTube: 키나 OAuth 토큰이 없으면 금액을 만들지 않습니다. 실제 조회 권한이 생기기 전까지 `0원`이 정상입니다.
- 장기 기억/스킬 개선: 작업 완료나 실패 후 `C:\Users\imda0\.hermes\connect-ai-office-runtime\memory-proposals`, `skill-proposals`에 후보 JSON을 저장합니다. 승인 전에는 `MEMORY.md`나 실제 스킬로 적용된 것처럼 표시하지 않습니다.
- 비밀키: 브릿지 응답에는 키 원문을 내보내지 않고 설정 여부만 표시합니다.

## 검증

```powershell
npm test
npm run build
```

현재 검증된 항목:

- 10명 에이전트 구조 유지
- 3D/픽셀 무대 payload 확인
- 직원별 말풍선과 이동 상태 동기화
- 수익/번돈 확인 패널이 더미 금액 없이 실제 커넥터 상태 기반으로 표시
- 선택 직원 전용 Profiles/Closed Learning Loop/Gateways 미니 패널 표시
- `24시간 업무` 사용자 제어 상태 유지
- Telegram 대상 표시와 브릿지 API smoke test
- 브릿지 응답 비밀키 노출 방지
- `pixel-agent-office-simulator` 추천/기본 스킬 연결
- `npm test`, `npm run build` 통과

## 참고 원본

- Connect AI: https://github.com/lsi9923/connect-ai
- Sang AI Office Simulator: https://github.com/lsi9923/sang-ai-office-simulator
- Hermes Desktop: https://github.com/fathah/hermes-desktop
- Hermes Agent Docs: https://hermes-agent.nousresearch.com/docs
