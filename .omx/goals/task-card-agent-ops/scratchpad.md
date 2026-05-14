# Scratchpad

## Scope
- `src/App.tsx`
- `src/SangOfficeSimulator.tsx`
- `src/styles.css`
- `scripts/check-agents.mjs`
- `README.md`

## Notes
- 사용자가 붙여준 HTML은 현재 `TaskBoard`의 DOM 구조와 일치한다.
- 작업 카드 클릭은 이미 `selectAgent(task.agent)`를 호출하므로, 선택 상태와 상세 루프 UI를 확장하면 된다.
- 하단 CEO 방은 `y` 70 이상 영역으로 보고 Writer/Researcher 기본 좌표를 그 위쪽 업무 구역으로 이동한다.
- 적용 좌표: Writer `{ x: 78, y: 43 }`, Researcher `{ x: 88, y: 31 }`.
- 작업 카드 운영 루프 라벨: 업무 관찰, 장기 기억 저장, 스킬 개선 제안, 예약 실행 대기.
