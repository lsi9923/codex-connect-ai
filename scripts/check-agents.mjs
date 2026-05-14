import fs from 'node:fs';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const agentsTs = fs.readFileSync(new URL('../src/agents.ts', import.meta.url), 'utf8');
const simulatorTs = fs.readFileSync(new URL('../src/simulator.ts', import.meta.url), 'utf8');
const appTsx = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const skillCatalogTs = fs.readFileSync(new URL('../src/skillCatalog.ts', import.meta.url), 'utf8');
const officeStageTsx = fs.readFileSync(new URL('../src/OfficeStage3D.tsx', import.meta.url), 'utf8');
const required = ['ceo', 'youtube', 'instagram', 'designer', 'developer', 'business', 'secretary', 'editor', 'writer', 'researcher'];
for (const id of required) {
  assert(new RegExp(`${id}:\\s*\\{`).test(agentsTs), `에이전트 정의 누락: ${id}`);
}
assert(/AGENT_ORDER:\s*AgentId\[\][\s\S]*'researcher'/.test(agentsTs), 'AGENT_ORDER에 10명 구조가 있어야 합니다.');
assert(/SPECIALIST_IDS:\s*AgentId\[\][\s\S]*'researcher'/.test(agentsTs), 'SPECIALIST_IDS에 전문가 9명이 있어야 합니다.');
assert(simulatorTs.includes('approvalItems'), '승인 대기함 안전장치가 필요합니다.');
assert(simulatorTs.includes('00_Raw') && simulatorTs.includes('10_Wiki') && simulatorTs.includes('20_Meta'), 'P-Reinforce 폴더 구조가 필요합니다.');
assert(skillCatalogTs.includes('localSkillCatalog') && skillCatalogTs.includes('recommendSkillsForAgent'), '로컬 스킬 추천 카탈로그가 필요합니다.');
assert(appTsx.includes('SkillEditor') && appTsx.includes('전 직원 추천 스킬 붙이기'), '직원별 스킬 편집/추천 UI가 필요합니다.');
assert(appTsx.includes('ConnectAiOpsPanel') && appTsx.includes('Closed Learning Loop'), 'Connect AI/Hermes 운영 레이어가 필요합니다.');
assert(appTsx.includes('defaultConnectAiOpsSettings') && appTsx.includes('autoCycleEnabled: false'), '24시간 업무는 사용자가 켜기 전 대기 상태여야 합니다.');
assert(appTsx.includes('24시간 시작') && appTsx.includes('24시간 중지') && appTsx.includes('connectAiLab.autoCycleEnabled'), '24시간 업무 시작/중지 제어가 필요합니다.');
assert(appTsx.includes('type="time"') && appTsx.includes('ops-secretary-bridge-mode') && appTsx.includes('ops-auto-git-sync'), '운영자가 브리핑 시간, 비서 브릿지, Auto-Git Sync를 조정할 수 있어야 합니다.');
assert(appTsx.includes('TelegramIdentity') && appTsx.includes('telegram-status.local.json') && appTsx.includes('Telegram 연결 대상'), '텔레그램 봇/대상 이름을 운영 화면에서 확인할 수 있어야 합니다.');
assert(appTsx.includes('https://github.com/lsi9923/connect-ai'), 'lsi9923/connect-ai 원본 참고 링크가 필요합니다.');
assert(appTsx.includes('workbench-grid') && appTsx.includes('agent-inspector'), '메인 무대 아래 작업/로그/참고 정렬과 오른쪽 에이전트 편집 전용 레이아웃이 필요합니다.');
assert(!appTsx.includes('title={`${agent.name}'), '브라우저 기본 title 툴팁 팝업은 제거되어야 합니다.');
assert(appTsx.includes('speechBubbleLayouts') && appTsx.includes('taskSpeechLine') && appTsx.includes('desk-terminal-output'), '각 직원별 업무 말풍선에는 업무명, 현재 상태, 보고 문장이 보여야 합니다.');
assert(appTsx.includes('movingSpeechBubblePosition') && appTsx.includes('motionPhaseProgress') && appTsx.includes('requestAnimationFrame') && appTsx.includes('moving-speech-bubble'), '활성 직원 말풍선은 애니메이션 좌표를 따라 위쪽에서 같이 움직여야 합니다.');
assert(appTsx.includes('motionAgent={engine.agent}') && officeStageTsx.includes('motionRef') && officeStageTsx.includes('motionPhase') && officeStageTsx.includes('motionProgress'), '3D 캐릭터와 HTML 말풍선은 같은 직원/단계/진행률 상태를 공유해야 합니다.');
assert(appTsx.includes('통합 업무 말풍선') && !appTsx.includes('className="route-director"'), '직원 이동 상태와 업무 상태는 별도 중앙 말풍선이 아니라 직원별 통합 말풍선 하나로 보여야 합니다.');
assert(!appTsx.includes('work-packet') && !appTsx.includes('packet-a'), '전략/분석/보고 같은 떠다니는 보조 라벨은 직원 통합 말풍선과 중복되므로 없어야 합니다.');
assert(appTsx.includes('OfficeStage3D'), 'Three.js 3D 사무실 무대가 앱에 연결되어야 합니다.');
assert(officeStageTsx.includes("from 'three'") && officeStageTsx.includes('render_game_to_text') && officeStageTsx.includes('advanceTime'), '3D 게임 무대는 Three.js와 테스트 훅을 제공해야 합니다.');
assert(officeStageTsx.includes('makeSystemTower') && officeStageTsx.includes('hermesSystems'), '3D 무대에는 Hermes memory/skill/gateway/scheduler 시스템 오브젝트가 필요합니다.');
assert(officeStageTsx.includes('yawToward') && officeStageTsx.includes('facingYaw') && !officeStageTsx.includes('current.group.lookAt'), '이동 중 에이전트는 lookAt 대신 yaw 기반 방향 계산을 써야 합니다.');
assert(officeStageTsx.includes('opsSettingsRef') && officeStageTsx.includes('autoCycle') && officeStageTsx.includes('sourceRepos') && officeStageTsx.includes('connectAiLab.autoCycleEnabled'), '3D stage payload에 사용자가 조정한 운영 상태와 원본 저장소 정보가 필요합니다.');
assert(!officeStageTsx.includes('makeSpeechBubbleTexture') && officeStageTsx.includes('speechBubbles') && officeStageTsx.includes('single-html-overlay'), '3D 텍스처 말풍선은 제거하고 단일 HTML 말풍선 상태만 payload로 유지해야 합니다.');
console.log('OK: Connect AI 10 agents + P-Reinforce + user-controlled ops + Telegram identity + unified agent speech bubbles + 3D yaw movement verified.');
