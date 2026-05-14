import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const agentsTs = fs.readFileSync(new URL('../src/agents.ts', import.meta.url), 'utf8');
const simulatorTs = fs.readFileSync(new URL('../src/simulator.ts', import.meta.url), 'utf8');
const appTsx = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const runtimeTs = fs.readFileSync(new URL('../src/runtime.ts', import.meta.url), 'utf8');
const skillCatalogTs = fs.readFileSync(new URL('../src/skillCatalog.ts', import.meta.url), 'utf8');
const officeStageTsx = fs.readFileSync(new URL('../src/OfficeStage3D.tsx', import.meta.url), 'utf8');
const sangSimTsx = fs.readFileSync(new URL('../src/SangOfficeSimulator.tsx', import.meta.url), 'utf8');
const stylesCss = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const bridgeMjs = fs.readFileSync(new URL('../server/bridge.mjs', import.meta.url), 'utf8');
const packageJson = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const viteConfig = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const required = ['ceo', 'youtube', 'instagram', 'designer', 'developer', 'business', 'secretary', 'editor', 'writer', 'researcher'];
for (const id of required) {
  assert(new RegExp(`${id}:\\s*\\{`).test(agentsTs), `에이전트 정의 누락: ${id}`);
}
assert(/AGENT_ORDER:\s*AgentId\[\][\s\S]*'researcher'/.test(agentsTs), 'AGENT_ORDER에 10명 구조가 있어야 합니다.');
assert(/SPECIALIST_IDS:\s*AgentId\[\][\s\S]*'researcher'/.test(agentsTs), 'SPECIALIST_IDS에 전문가 9명이 있어야 합니다.');
assert(simulatorTs.includes('approvalItems'), '승인 대기함 안전장치가 필요합니다.');
assert(simulatorTs.includes('00_Raw') && simulatorTs.includes('10_Wiki') && simulatorTs.includes('20_Meta'), 'P-Reinforce 폴더 구조가 필요합니다.');
assert(skillCatalogTs.includes('localSkillCatalog') && skillCatalogTs.includes('recommendSkillsForAgent'), '로컬 스킬 추천 카탈로그가 필요합니다.');
assert(skillCatalogTs.includes('pixel-agent-office-simulator') && skillCatalogTs.includes('Local Skill') && agentsTs.includes('pixel-agent-office-simulator'), 'pixel-agent-office-simulator 스킬이 추천 카탈로그와 기본 직원 스킬에 연결되어야 합니다.');
assert(appTsx.includes('SkillEditor') && appTsx.includes('전 직원 추천 스킬 붙이기'), '직원별 스킬 편집/추천 UI가 필요합니다.');
assert(appTsx.includes('PROFILE_STORAGE_KEY') && appTsx.includes('profileOverrides') && appTsx.includes('profile-edit-grid'), '직원 프로필 이름/사진 편집값은 저장되고 화면 전체에 연결되어야 합니다.');
assert(appTsx.includes('task-agent-profile') && appTsx.includes('task-avatar') && stylesCss.includes('task-agent-profile'), '직원별 작업 카드에는 프로필 사진과 표시 이름이 보여야 합니다.');
assert(appTsx.includes('taskOpsRows') && appTsx.includes('업무 관찰') && appTsx.includes('장기 기억 저장') && appTsx.includes('스킬 개선 제안') && appTsx.includes('예약 실행 대기') && stylesCss.includes('task-ops-panel'), '직원별 작업 카드는 클릭한 직원의 업무 관찰/장기 기억/스킬 개선/예약 실행 상태를 보여야 합니다.');

const forbiddenDummyRevenue = [
  'monthlyRevenueTarget',
  'baseRevenueByAgent',
  'taskRevenueValue',
  'planRevenueSnapshot',
  'YouTube Studio 수익 확인',
  '완료 산출물 기반 확정',
  '승인 대기 수익',
  '수익 기여',
  '이번 루프 확인 금액',
];
for (const marker of forbiddenDummyRevenue) {
  assert(!appTsx.includes(marker) && !simulatorTs.includes(marker), `더미 수익 마커가 남아 있습니다: ${marker}`);
}
assert(appTsx.includes('RevenueBoard') && appTsx.includes('수익/번돈 확인') && appTsx.includes('실제 API 확인 금액') && runtimeTs.includes('fallbackRevenueConnectors') && stylesCss.includes('revenue-board'), '수익/번돈 확인 패널은 실제 커넥터 상태 기반이어야 합니다.');
assert(appTsx.includes('RuntimeStatus') && appTsx.includes("fetchRuntimeJson<RuntimeStatus>('/api/runtime/status')"), '프론트는 로컬 브릿지 runtime status를 읽어야 합니다.');
assert(appTsx.includes("fetchRuntimeJson<RuntimeTaskResponse>('/api/tasks/dispatch'") && appTsx.includes('/api/tasks/${encodeURIComponent(id)}/approve'), '작업 분배와 승인은 실제 브릿지 API로 연결되어야 합니다.');
assert(bridgeMjs.includes('/api/runtime/status') && bridgeMjs.includes('/api/models') && bridgeMjs.includes('/api/telegram/status') && bridgeMjs.includes('/api/revenue/status'), '브릿지 서버 핵심 API가 필요합니다.');
assert(bridgeMjs.includes('TELEGRAM_BOT_TOKEN') && bridgeMjs.includes('sendMessage') && bridgeMjs.includes('getMe'), 'Telegram은 실제 getMe/sendMessage 흐름이어야 합니다.');
assert(bridgeMjs.includes('127.0.0.1:1234/v1/models') && bridgeMjs.includes('/v1/chat/completions'), 'LM Studio 실제 모델 감지와 chat completions 호출이 필요합니다.');
assert(bridgeMjs.includes('PAYPAL_CLIENT_ID') && bridgeMjs.includes('YOUTUBE_REFRESH_TOKEN'), '수익 패널은 PayPal/YouTube 실제 권한 여부를 검사해야 합니다.');
assert(bridgeMjs.includes('memory-proposals') && bridgeMjs.includes('skill-proposals') && bridgeMjs.includes('writeRuntimeProposals'), '장기 기억/스킬 개선은 실제 후보 파일로 기록되어야 합니다.');
assert(packageJson.includes('"dev":"node server/dev.mjs"') && packageJson.includes('"bridge":"node server/bridge.mjs"'), 'npm run dev는 브릿지를 함께 띄울 수 있어야 합니다.');
assert(viteConfig.includes("'/api'") && viteConfig.includes('127.0.0.1:5198'), 'Vite dev server는 /api를 브릿지로 프록시해야 합니다.');

assert(appTsx.includes('task-agent-ops-grid') && appTsx.includes('mini-profile-card') && appTsx.includes('mini-learning-card') && appTsx.includes('mini-gateway-card') && appTsx.includes('Revenue Check') && appTsx.includes('task-money'), '작업 카드 클릭 시 선택 직원 전용 Profiles/Closed Learning Loop/Gateways/Revenue 미니 패널이 필요합니다.');
assert(appTsx.includes('후보 파일:') && appTsx.includes('아직 MEMORY.md에 적용하지 않음'), '직원 카드는 승인 전 기억/스킬 후보 상태를 명확히 표시해야 합니다.');
assert(sangSimTsx.includes('agentProfiles') && sangSimTsx.includes('profileImage: resolveAgentProfile'), '시뮬레이션 디버그 payload도 편집된 직원 이름과 사진을 노출해야 합니다.');
assert(appTsx.includes('ConnectAiOpsPanel') && appTsx.includes('Closed Learning Loop'), 'Connect AI/Hermes 운영 레이어가 필요합니다.');
assert(appTsx.includes('defaultConnectAiOpsSettings') && appTsx.includes('autoCycleEnabled: false'), '24시간 업무는 사용자가 켜기 전 대기 상태여야 합니다.');
assert(appTsx.includes('24시간 시작') && appTsx.includes('24시간 중지') && appTsx.includes('connectAiLab.autoCycleEnabled'), '24시간 업무 시작/중지 제어가 필요합니다.');
assert(appTsx.includes('type="time"') && appTsx.includes('ops-secretary-bridge-mode') && appTsx.includes('ops-auto-git-sync'), '운영자가 브리핑 시간, 비서 브릿지, Auto-Git Sync를 조정할 수 있어야 합니다.');
assert(appTsx.includes('TelegramIdentity') && appTsx.includes('Telegram 연결 대상'), '텔레그램 봇/대상 이름을 운영 화면에서 확인할 수 있어야 합니다.');
assert(appTsx.includes('https://github.com/lsi9923/connect-ai'), 'lsi9923/connect-ai 원본 참고 링크가 필요합니다.');
assert(appTsx.includes('workbench-grid') && appTsx.includes('agent-inspector'), '메인 무대 아래 작업/로그/참고 정렬과 오른쪽 에이전트 편집 전용 레이아웃이 필요합니다.');
assert(!appTsx.includes('title={`${agent.name}'), '브라우저 기본 title 툴팁 팝업은 제거되어야 합니다.');
assert(appTsx.includes('speechBubbleLayouts') && appTsx.includes('taskSpeechLine') && appTsx.includes('desk-terminal-output'), '각 직원별 업무 말풍선에는 업무명, 현재 상태, 보고 문장이 보여야 합니다.');
assert(appTsx.includes('movingSpeechBubblePosition') && appTsx.includes('motionPhaseProgress') && appTsx.includes('requestAnimationFrame') && appTsx.includes('moving-speech-bubble'), '활성 직원 말풍선은 애니메이션 좌표를 따라 위쪽에서 같이 움직여야 합니다.');
assert(appTsx.includes('motionAgent={engine.agent}') && officeStageTsx.includes('motionRef') && officeStageTsx.includes('motionPhase') && officeStageTsx.includes('motionProgress'), '3D 캐릭터와 HTML 말풍선은 같은 직원/단계/진행률 상태를 공유해야 합니다.');
assert(appTsx.includes('SangOfficeSimulator') && sangSimTsx.includes('https://github.com/lsi9923/sang-ai-office-simulator') && sangSimTsx.includes('processParallel') && sangSimTsx.includes('computeBubbleOffsets') && stylesCss.includes('sang-sim-cover'), 'sang-ai-office-simulator 기반 시뮬레이션을 현재 무대 크기에 맞춰 포함해야 합니다.');
assert(sangSimTsx.includes('https://connectai-7gxqex9s.manus.space/') && sangSimTsx.includes('7GXqEX9S442FPxx7zqYqED'), 'Manus 공개 프로젝트 식별자와 기준 URL이 시뮬레이션 payload에 있어야 합니다.');
assert(sangSimTsx.includes('/connect-ai/assets/office_design_2_ceo_room.gif') && stylesCss.includes('aspect-ratio: 512 / 544') && sangSimTsx.includes('/connect-ai/pixel/characters') && sangSimTsx.includes('SPRITE_CONFIG'), 'CEO 방이 분리된 Office_Design_2 픽셀 맵과 스프라이트 자산을 로컬 시뮬레이션에 사용해야 합니다.');
assert(sangSimTsx.includes("writer: { x: 78, y: 43 }") && sangSimTsx.includes("researcher: { x: 88, y: 31 }"), 'Writer와 Researcher 기본 자리는 CEO 방 밖 일반 업무 구역에 있어야 합니다.');
assert(sangSimTsx.includes("id: 'editor'") && sangSimTsx.includes("id: 'writer'") && sangSimTsx.includes("id: 'researcher'"), '시뮬레이션 무대도 메인 직원 목록처럼 루나, Writer, Researcher를 포함해야 합니다.');
assert(sangSimTsx.includes('SCALE: 1.4') && sangSimTsx.includes('IDLE_SPEED: 14') && sangSimTsx.includes('WALK_SPEED: 7') && sangSimTsx.includes('10 + Math.floor(agent.y * 0.1)'), '픽셀 스킬/깃허브 기준 스프라이트 스케일, 프레임 속도, z-index 계산을 따라야 합니다.');
assert(sangSimTsx.includes('QUICK_CMDS') && sangSimTsx.includes('sang-quick-command') && sangSimTsx.includes('AGENT STATUS') && sangSimTsx.includes('ACTIVITY LOG'), 'Manus형 우측 운영 패널에는 빠른 명령, 직원 상태, 활동 로그가 있어야 합니다.');
assert(sangSimTsx.includes('sang-speech-bubble') && sangSimTsx.includes('sang-pixel-agent') && sangSimTsx.includes('backgroundPosition'), '직원별 말풍선은 스프라이트 캐릭터 컨테이너 안에서 함께 움직여야 합니다.');
assert(sangSimTsx.includes('AgentDetailModal') && sangSimTsx.includes('formatDuration') && stylesCss.includes('sang-agent-modal'), '직원 클릭 시 스킬 레퍼런스 기준 상세 모달과 완료 이력이 떠야 합니다.');
assert(appTsx.includes('통합 업무 말풍선') && !appTsx.includes('className="route-director"'), '직원 이동 상태와 업무 상태는 별도 중앙 말풍선이 아니라 직원별 통합 말풍선 하나로 보여야 합니다.');
assert(!appTsx.includes('work-packet') && !appTsx.includes('packet-a'), '전략/분석/보고 같은 떠다니는 보조 라벨은 직원 통합 말풍선과 중복되므로 없어야 합니다.');
assert(appTsx.includes('OfficeStage3D'), 'Three.js 3D 사무실 무대가 앱에 연결되어야 합니다.');
assert(officeStageTsx.includes("from 'three'") && officeStageTsx.includes('render_game_to_text') && officeStageTsx.includes('advanceTime'), '3D 게임 무대는 Three.js와 테스트 훅을 제공해야 합니다.');
assert(officeStageTsx.includes('makeSystemTower') && officeStageTsx.includes('hermesSystems'), '3D 무대에는 Hermes memory/skill/gateway/scheduler 시스템 오브젝트가 필요합니다.');
assert(officeStageTsx.includes('yawToward') && officeStageTsx.includes('facingYaw') && !officeStageTsx.includes('current.group.lookAt'), '이동 중 에이전트는 lookAt 대신 yaw 기반 방향 계산을 써야 합니다.');
assert(officeStageTsx.includes('opsSettingsRef') && officeStageTsx.includes('autoCycle') && officeStageTsx.includes('sourceRepos') && officeStageTsx.includes('connectAiLab.autoCycleEnabled'), '3D stage payload에 사용자가 조정한 운영 상태와 원본 저장소 정보가 필요합니다.');
assert(!officeStageTsx.includes('makeSpeechBubbleTexture') && officeStageTsx.includes('speechBubbles') && officeStageTsx.includes('single-html-overlay'), '3D 텍스처 말풍선은 제거하고 단일 HTML 말풍선 상태만 payload로 유지해야 합니다.');

await smokeBridge();

async function smokeBridge() {
  const child = spawn(process.execPath, ['server/bridge.mjs'], {
    cwd: appRoot,
    env: { ...process.env, CONNECT_AI_BRIDGE_PORT: '0' },
    windowsHide: true,
  });
  let output = '';
  let readyPort = 0;
  try {
    readyPort = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('bridge ready timeout')), 12000);
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        const match = output.match(/CONNECT_AI_BRIDGE_READY\s+(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve(Number(match[1]));
        }
      });
      child.stderr.on('data', (chunk) => { output += chunk.toString(); });
      child.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`bridge exited early ${code}: ${output}`));
      });
    });
    const status = await fetch(`http://127.0.0.1:${readyPort}/api/runtime/status`).then((response) => response.json());
    assert(status.bridge?.status === 'connected', '브릿지 runtime status가 connected여야 합니다.');
    assert(Array.isArray(status.models?.providers), '브릿지 모델 공급자 상태가 필요합니다.');
    assert(Array.isArray(status.revenue?.connectors), '브릿지 수익 커넥터 상태가 필요합니다.');
    assert(status.revenue.connectors.every((item) => typeof item.amount === 'number'), '수익 커넥터 금액은 실제 숫자만 내려와야 합니다.');
    assertNoSecretLeak(status);
  } finally {
    if (!child.killed) child.kill();
  }
}

function assertNoSecretLeak(status) {
  const envPath = path.join(os.homedir(), '.hermes', '.env');
  if (!fs.existsSync(envPath)) return;
  const body = JSON.stringify(status);
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^[A-Z0-9_]+=(.+)$/);
    if (!match) continue;
    const value = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (value.length >= 12) assert(!body.includes(value), '브릿지 응답에 비밀키 원문이 노출되면 안 됩니다.');
  }
}

console.log('OK: real Connect AI bridge + no dummy revenue + runtime task/Telegram/model status verified.');
