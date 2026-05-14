import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AgentId } from './agents';
import type { OfficePlan } from './simulator';

type SimAgentState = 'idle' | 'thinking' | 'walking_to_ceo' | 'reporting' | 'walking_home' | 'working';
type SimReportMode = 'sequential' | 'parallel';
type SimDirection = 'down' | 'left' | 'right' | 'up';

type SimAgentDef = {
  id: AgentId;
  name: string;
  role: string;
  badge: string;
  emoji: string;
  color: string;
  specialty: string;
  tagline: string;
  sprite: string;
  idleDir: SimDirection;
};

type SimAgentStatus = SimAgentDef & {
  state: SimAgentState;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  walkProgress: number;
  isWalking: boolean;
  direction: SimDirection;
  task: string;
  thought: string;
  bubble: string;
  bubbleVisible: boolean;
  arrivedAt: 'ceo' | 'desk' | null;
  idleDirIdx: number;
};

type SimLogEntry = {
  id: string;
  emoji: string;
  name: string;
  msg: string;
  ts: number;
};

type CompletedTask = {
  task: string;
  completedAt: number;
  durationMs: number;
};

type SimState = {
  agents: SimAgentStatus[];
  activeAgentId: AgentId | null;
  reportingAgentIds: AgentId[];
  ceoCommand: string;
  isRunning: boolean;
  reportMode: SimReportMode;
  day: number;
  time: string;
  log: SimLogEntry[];
  completedTasks: Partial<Record<AgentId, CompletedTask[]>>;
};

type StageDims = {
  w: number;
  h: number;
};

declare global {
  interface Window {
    render_game_to_text?: () => string;
  }
}

const CONNECT_AI_SOURCE_REPO = 'https://github.com/lsi9923/connect-ai';
const SIM_SOURCE_REPO = 'https://github.com/lsi9923/sang-ai-office-simulator';
const MANUS_PUBLIC_PROJECT = 'https://connectai-7gxqex9s.manus.space/';
const MANUS_PROJECT_ID = '7GXqEX9S442FPxx7zqYqED';
const OFFICE_MAP = '/connect-ai/assets/map.jpeg';
const SPRITE_BASE = '/connect-ai/pixel/characters';
const WALK_DURATION = 1.1;

const SPRITE_CONFIG = {
  TILE: 48,
  CHAR_HEIGHT: 96,
  FRAMES_PER_DIR: 6,
  IDLE_ROW: 1,
  WALK_ROW: 2,
  DIRS: { down: 0, left: 6, right: 12, up: 18 } as const,
  IDLE_SPEED: 16,
  WALK_SPEED: 6,
  SCALE: 1.55,
};

const { TILE, CHAR_HEIGHT, FRAMES_PER_DIR, IDLE_ROW, WALK_ROW, DIRS, IDLE_SPEED, WALK_SPEED, SCALE } = SPRITE_CONFIG;
const RENDERED_W = TILE * SCALE;
const RENDERED_H = CHAR_HEIGHT * SCALE;

const STATE_LABELS: Record<SimAgentState, string> = {
  idle: 'IDLE',
  thinking: 'THINKING',
  walking_to_ceo: '→ CEO',
  reporting: 'REPORT',
  walking_home: 'RETURN',
  working: 'WORKING',
};

const SIM_AGENTS: SimAgentDef[] = [
  {
    id: 'ceo',
    name: 'CEO',
    role: 'Chief Executive',
    badge: 'CEO',
    emoji: '◈',
    color: '#f8fafc',
    specialty: '오케스트레이션, 작업 분해, 종합 판단',
    tagline: '회사 전체 의사결정과 작업 분배를 맡습니다',
    sprite: `${SPRITE_BASE}/ceo.png`,
    idleDir: 'down',
  },
  {
    id: 'youtube',
    name: '레오',
    role: 'Head of YouTube',
    badge: 'YT',
    emoji: '📺',
    color: '#ff4444',
    specialty: '유튜브 채널 운영, 영상 기획서, 트렌드 분석',
    tagline: '유튜브 채널 기획·운영 전반을 책임집니다',
    sprite: `${SPRITE_BASE}/youtube.png`,
    idleDir: 'right',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    role: 'Head of Instagram',
    badge: 'IG',
    emoji: '📷',
    color: '#e1306c',
    specialty: '인스타그램 릴스/피드 콘셉트, 캡션, 해시태그 전략',
    tagline: '인스타 콘텐츠 기획과 인게이지먼트를 끌어올립니다',
    sprite: `${SPRITE_BASE}/instagram.png`,
    idleDir: 'down',
  },
  {
    id: 'designer',
    name: 'Designer',
    role: 'Lead Designer',
    badge: 'DSN',
    emoji: '🎨',
    color: '#a78bfa',
    specialty: '브랜드 디자인 브리프, 썸네일 컨셉, 비주얼 시스템',
    tagline: '브랜드와 시각 자산 디자인을 담당합니다',
    sprite: `${SPRITE_BASE}/designer.png`,
    idleDir: 'left',
  },
  {
    id: 'developer',
    name: '코다리',
    role: '풀스택 엔지니어',
    badge: 'DEV',
    emoji: '💻',
    color: '#22d3ee',
    specialty: '코드 작성·편집·디버깅, 자동화 스크립트, API 통합',
    tagline: '읽고·생각하고·짜고·검증한다',
    sprite: `${SPRITE_BASE}/developer.png`,
    idleDir: 'right',
  },
  {
    id: 'business',
    name: '현빈',
    role: '비즈니스 전략가',
    badge: 'BIZ',
    emoji: '💼',
    color: '#f5c518',
    specialty: '수익화 모델, 가격 전략, 시장·경쟁 분석',
    tagline: '수익화·가격·전략 의사결정을 같이 봅니다',
    sprite: `${SPRITE_BASE}/business.png`,
    idleDir: 'down',
  },
  {
    id: 'secretary',
    name: '영숙',
    role: 'Personal Assistant',
    badge: 'SEC',
    emoji: '📱',
    color: '#84cc16',
    specialty: '일정·할 일 관리, 에이전트 작업 요약·텔레그램 보고',
    tagline: '당신의 일정·할 일·연락을 챙기고 회사 소통을 정리합니다',
    sprite: `${SPRITE_BASE}/secretary.png`,
    idleDir: 'left',
  },
];

const DESK_POSITIONS: Partial<Record<AgentId, { x: number; y: number }>> = {
  youtube: { x: 26, y: 32 },
  instagram: { x: 40, y: 32 },
  designer: { x: 54, y: 32 },
  business: { x: 68, y: 32 },
  developer: { x: 26, y: 56 },
  secretary: { x: 68, y: 56 },
  ceo: { x: 47, y: 78 },
};

const CEO_POS = { x: 47, y: 78 };

const CEO_OFFSETS: Partial<Record<AgentId, { dx: number; dy: number }>> = {
  youtube: { dx: -14, dy: -7 },
  instagram: { dx: -7, dy: -10 },
  designer: { dx: 0, dy: -12 },
  business: { dx: 7, dy: -10 },
  developer: { dx: 14, dy: -7 },
  secretary: { dx: 0, dy: 5 },
};

const AGENT_THOUGHTS: Record<string, string[]> = {
  ceo: ['이번 분기 목표가...', '회사 비전 정리해야', '다음 큰 그림은?', '팀 잘 굴러가나', 'KPI 다시 봐야겠다'],
  youtube: ['다음 썸네일 뭐로?', '오프닝 5초가 핵심', '트렌드 봐야지', '편집 컷 좀 줄이자', '구독자 반응 어떨까'],
  instagram: ['릴스 트렌드 체크', '해시태그 뭘로?', '커버 이미지가 약해', '댓글 톤이 좋네', '피드 구성 다시'],
  designer: ['색감이 뭔가 부족한데', '여백을 더...', '폰트 다시 골라야', '레퍼런스 찾자', '톤앤매너가 안 맞아'],
  developer: ['이거 캐시해야', '버그 어디서 났지', '리팩터 해야 하는데', '...아 그게 그구나', '테스트 돌려야지'],
  business: ['ROI 계산 다시', '단가 협상해야', '월 마감 보자', '현금흐름은 OK', '채널별 수익 분리'],
  secretary: ['일정 정리하자', '메일 답장 보내야', 'CEO 미팅 30분 후', '텔레그램 승인 대기', '회의록 다시 보자'],
};

const ROLE_WORK_MESSAGES: Record<string, string[]> = {
  ceo: ['전략 수립 중...', '팀 조율 중...', '보고서 검토 중...', '다음 방향 결정 중...'],
  youtube: ['영상 기획서 작성 중...', '썸네일 브리프 작성 중...', '트렌드 분석 중...', '스크립트 검토 중...'],
  instagram: ['릴스 콘셉트 기획 중...', '캡션 작성 중...', '해시태그 전략 수립 중...', '피드 구성 중...'],
  designer: ['디자인 시안 제작 중...', '컬러 팔레트 구성 중...', '레이아웃 작업 중...', '비주얼 가이드 작성 중...'],
  developer: ['코드 작성 중...', '버그 수정 중...', 'API 연동 중...', '테스트 실행 중...', '리팩터링 중...'],
  business: ['수익 분석 중...', '경쟁사 조사 중...', 'KPI 설계 중...', '가격 전략 수립 중...'],
  secretary: ['일정 정리 중...', '보고서 요약 중...', '텔레그램 발송 준비 중...', '회의록 작성 중...'],
};

const IDLE_DIR_CYCLE: Record<string, SimDirection[]> = {
  ceo: ['down', 'right', 'down', 'left', 'down'],
  youtube: ['right', 'down', 'right', 'up', 'right'],
  instagram: ['down', 'left', 'down', 'right', 'down'],
  designer: ['left', 'down', 'left', 'up', 'left'],
  developer: ['right', 'down', 'right', 'down', 'right'],
  business: ['down', 'right', 'down', 'left', 'down'],
  secretary: ['left', 'down', 'right', 'down', 'left'],
};

const QUICK_CMDS = [
  { label: '📺 유튜브 전략', cmd: '유튜브 채널 성장 전략 수립 + 이번 주 콘텐츠 캘린더 작성' },
  { label: '📷 인스타 기획', cmd: '인스타그램 릴스 3개 기획 + 디자인 시안 제작' },
  { label: '💻 웹사이트 개발', cmd: '포트폴리오 웹사이트 개발 + 배포' },
  { label: '💼 수익 분석', cmd: '이번 달 수익 분석 보고서 작성 + 텔레그램 보고' },
  { label: '🎨 브랜드 가이드', cmd: '브랜드 아이덴티티 가이드라인 제작' },
];

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function directionFrom(fromX: number, fromY: number, toX: number, toY: number): SimDirection {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function initialAgent(agent: SimAgentDef): SimAgentStatus {
  const pos = DESK_POSITIONS[agent.id] || { x: 50, y: 50 };
  const thought = pickRandom(AGENT_THOUGHTS[agent.id] || ['...']);
  return {
    ...agent,
    state: 'idle',
    x: pos.x,
    y: pos.y,
    fromX: pos.x,
    fromY: pos.y,
    targetX: pos.x,
    targetY: pos.y,
    walkProgress: 1,
    isWalking: false,
    direction: agent.idleDir,
    task: '',
    thought,
    bubble: thought,
    bubbleVisible: true,
    arrivedAt: null,
    idleDirIdx: 0,
  };
}

function getSpritePosition(direction: SimDirection, isWalking: boolean, isWorking: boolean, frame: number) {
  const colOffset = DIRS[direction];
  const row = isWalking || isWorking ? WALK_ROW : IDLE_ROW;
  const speed = isWalking || isWorking ? WALK_SPEED : IDLE_SPEED;
  const frameIndex = Math.floor(frame / speed) % FRAMES_PER_DIR;
  return `-${(colOffset + frameIndex) * TILE}px -${row * CHAR_HEIGHT}px`;
}

function useSangSimulation(plan: OfficePlan) {
  const agentsRef = useRef<SimAgentStatus[]>(SIM_AGENTS.map(initialAgent));
  const [renderState, setRenderState] = useState<SimState>({
    agents: agentsRef.current,
    activeAgentId: null,
    reportingAgentIds: [],
    ceoCommand: '',
    isRunning: false,
    reportMode: 'sequential',
    day: 1,
    time: '09:00',
    log: [],
    completedTasks: {},
  });

  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const processingRef = useRef(false);
  const queueRef = useRef<AgentId[]>([]);
  const activeRef = useRef<AgentId | null>(null);
  const reportingRef = useRef<AgentId[]>([]);
  const isRunRef = useRef(false);
  const commandRef = useRef('');
  const modeRef = useRef<SimReportMode>('sequential');
  const logRef = useRef<SimLogEntry[]>([]);
  const completedTasksRef = useRef<Partial<Record<AgentId, CompletedTask[]>>>({});

  const syncState = useCallback(() => {
    setRenderState((prev) => ({
      ...prev,
      agents: [...agentsRef.current],
      activeAgentId: activeRef.current,
      reportingAgentIds: [...reportingRef.current],
      isRunning: isRunRef.current,
      ceoCommand: commandRef.current,
      reportMode: modeRef.current,
      log: [...logRef.current],
      completedTasks: { ...completedTasksRef.current },
    }));
  }, []);

  const updateAgent = useCallback((id: AgentId, patch: Partial<SimAgentStatus>) => {
    agentsRef.current = agentsRef.current.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent));
  }, []);

  const addLog = useCallback((id: AgentId, msg: string) => {
    const agent = SIM_AGENTS.find((item) => item.id === id);
    if (!agent) return;
    logRef.current = [{ id, emoji: agent.emoji, name: agent.name, msg, ts: Date.now() }, ...logRef.current.slice(0, 49)];
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRenderState((prev) => {
        const [h, m] = prev.time.split(':').map(Number);
        const nextMinute = (m + 1) % 60;
        const nextHour = nextMinute === 0 ? (h + 1) % 24 : h;
        return { ...prev, time: `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}` };
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      agentsRef.current = agentsRef.current.map((agent) => {
        if (agent.state !== 'idle') return agent;
        const cycle = IDLE_DIR_CYCLE[agent.id] || ['down'];
        const nextIdx = (agent.idleDirIdx + 1) % cycle.length;
        const thought = pickRandom(AGENT_THOUGHTS[agent.id] || ['...']);
        return { ...agent, thought, bubble: thought, bubbleVisible: true, direction: cycle[nextIdx], idleDirIdx: nextIdx };
      });
      syncState();
    }, 3800);
    return () => window.clearInterval(timer);
  }, [syncState]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;
      let changed = false;

      agentsRef.current = agentsRef.current.map((agent) => {
        if (!agent.isWalking) return agent;
        const nextProgress = Math.min(agent.walkProgress + dt / WALK_DURATION, 1);
        const amount = easeOut(nextProgress);
        changed = true;
        if (nextProgress >= 1) {
          return { ...agent, x: agent.targetX, y: agent.targetY, walkProgress: 1, isWalking: false };
        }
        return {
          ...agent,
          x: agent.fromX + (agent.targetX - agent.fromX) * amount,
          y: agent.fromY + (agent.targetY - agent.fromY) * amount,
          walkProgress: nextProgress,
        };
      });

      if (changed) syncState();
      rafRef.current = window.requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [syncState]);

  const startWalk = useCallback((id: AgentId, toX: number, toY: number) => {
    return new Promise<void>((resolve) => {
      const agent = agentsRef.current.find((item) => item.id === id);
      if (!agent) {
        resolve();
        return;
      }
      updateAgent(id, {
        fromX: agent.x,
        fromY: agent.y,
        targetX: toX,
        targetY: toY,
        walkProgress: 0,
        isWalking: true,
        direction: directionFrom(agent.x, agent.y, toX, toY),
        arrivedAt: null,
      });
      syncState();
      window.setTimeout(resolve, Math.round(WALK_DURATION * 1000) + 120);
    });
  }, [syncState, updateAgent]);

  const runAgentCycle = useCallback(async (id: AgentId, task: string) => {
    const home = DESK_POSITIONS[id] || { x: 50, y: 50 };
    const offset = CEO_OFFSETS[id] || { dx: 0, dy: 0 };
    const ceoX = CEO_POS.x + offset.dx;
    const ceoY = CEO_POS.y + offset.dy;
    const def = SIM_AGENTS.find((agent) => agent.id === id);
    const cycleStartMs = Date.now();

    updateAgent(id, {
      state: 'thinking',
      bubble: `${task.slice(0, 26)}...`,
      bubbleVisible: true,
      task,
      direction: def?.idleDir || 'down',
    });
    addLog(id, `작업 시작: ${task}`);
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 1100));

    updateAgent(id, { state: 'walking_to_ceo', bubble: 'CEO에게 이동 중...', bubbleVisible: true });
    syncState();
    await startWalk(id, ceoX, ceoY);

    reportingRef.current = [...reportingRef.current, id];
    updateAgent(id, {
      state: 'reporting',
      bubble: `보고: ${task.slice(0, 22)}...`,
      bubbleVisible: true,
      direction: 'up',
      isWalking: false,
      arrivedAt: 'ceo',
    });
    addLog(id, 'CEO에게 보고 중');
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 160));
    updateAgent(id, { arrivedAt: null });
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 1850));

    reportingRef.current = reportingRef.current.filter((agentId) => agentId !== id);
    updateAgent(id, { state: 'walking_home', bubble: '자리로 복귀 중...', bubbleVisible: true });
    syncState();
    await startWalk(id, home.x, home.y);

    updateAgent(id, { arrivedAt: 'desk' });
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 160));
    updateAgent(id, { arrivedAt: null });

    const workMsg = pickRandom(ROLE_WORK_MESSAGES[id] || ['작업 중...']);
    updateAgent(id, {
      state: 'working',
      bubble: workMsg,
      bubbleVisible: true,
      task: workMsg,
      direction: def?.idleDir || 'down',
      isWalking: false,
    });
    addLog(id, `완료: ${task}`);
    completedTasksRef.current = {
      ...completedTasksRef.current,
      [id]: [
        { task, completedAt: Date.now(), durationMs: Date.now() - cycleStartMs },
        ...(completedTasksRef.current[id] || []),
      ].slice(0, 20),
    };
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 2300));

    const thought = pickRandom(AGENT_THOUGHTS[id] || ['...']);
    updateAgent(id, {
      state: 'idle',
      thought,
      bubble: thought,
      bubbleVisible: true,
      task: '',
      direction: def?.idleDir || 'down',
    });
    syncState();
  }, [addLog, startWalk, syncState, updateAgent]);

  const processSequential = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const id = queueRef.current.shift();
      if (!id) break;
      activeRef.current = id;
      const task = pickRandom(ROLE_WORK_MESSAGES[id] || ['업무 처리 중...']);
      await runAgentCycle(id, task);
      activeRef.current = null;
      syncState();
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    }
    isRunRef.current = false;
    processingRef.current = false;
    syncState();
  }, [runAgentCycle, syncState]);

  const processParallel = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    const ids = [...queueRef.current];
    queueRef.current = [];
    updateAgent('ceo', { state: 'working', bubble: '전원 동시 출동!', bubbleVisible: true });
    syncState();
    await Promise.all(ids.map(async (id, idx) => {
      const task = pickRandom(ROLE_WORK_MESSAGES[id] || ['업무 처리 중...']);
      await new Promise((resolve) => window.setTimeout(resolve, idx * 300));
      await runAgentCycle(id, task);
    }));
    updateAgent('ceo', { state: 'idle', bubble: pickRandom(AGENT_THOUGHTS.ceo), task: '' });
    isRunRef.current = false;
    processingRef.current = false;
    activeRef.current = null;
    syncState();
  }, [runAgentCycle, syncState, updateAgent]);

  const issueCommand = useCallback((command: string) => {
    if (!command.trim() || processingRef.current) return;
    commandRef.current = command;
    isRunRef.current = true;
    addLog('ceo', `명령: ${command}`);
    updateAgent('ceo', { state: 'thinking', bubble: '명령 분배 중...', bubbleVisible: true });
    syncState();
    window.setTimeout(() => {
      updateAgent('ceo', { state: 'working', bubble: modeRef.current === 'parallel' ? '전원 동시 출동!' : '팀 조율 중...' });
      syncState();
    }, 700);

    queueRef.current = SIM_AGENTS.filter((agent) => agent.id !== 'ceo').map((agent) => agent.id);
    window.setTimeout(() => {
      if (modeRef.current === 'parallel') void processParallel();
      else void processSequential();
    }, 900);
  }, [addLog, processParallel, processSequential, syncState, updateAgent]);

  const issueRandomCommand = useCallback(() => issueCommand(pickRandom(QUICK_CMDS).cmd), [issueCommand]);

  const toggleReportMode = useCallback(() => {
    if (processingRef.current) return;
    modeRef.current = modeRef.current === 'sequential' ? 'parallel' : 'sequential';
    syncState();
  }, [syncState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      issueCommand(plan.brief || '이번 달 운영 목표를 AI 직원들에게 분배해줘');
    }, 650);
    return () => window.clearTimeout(timer);
  }, [issueCommand, plan.runId, plan.brief]);

  useEffect(() => {
    const renderer = () => JSON.stringify({
      mode: 'manus-dashboard-parity',
      dashboardParity: true,
      sourceRepo: SIM_SOURCE_REPO,
      sourceRepos: [SIM_SOURCE_REPO, CONNECT_AI_SOURCE_REPO],
      projectUrl: MANUS_PUBLIC_PROJECT,
      manusProject: MANUS_PROJECT_ID,
      sourceAssets: {
        map: OFFICE_MAP,
        sprites: `${SPRITE_BASE}/{ceo,youtube,instagram,designer,developer,business,secretary}.png`,
      },
      reportMode: modeRef.current,
      activeAgent: activeRef.current,
      reportingAgentIds: reportingRef.current,
      completedTasks: completedTasksRef.current,
      spriteConfig: SPRITE_CONFIG,
      agents: agentsRef.current.map((agent) => ({
        id: agent.id,
        name: agent.name,
        state: agent.state,
        direction: agent.direction,
        x: Number(agent.x.toFixed(2)),
        y: Number(agent.y.toFixed(2)),
        sprite: agent.sprite,
        bubble: agent.bubble,
      })),
      command: commandRef.current,
      time: renderState.time,
    });
    window.render_game_to_text = renderer;
    return () => {
      if (window.render_game_to_text === renderer) delete window.render_game_to_text;
    };
  }, [renderState.time]);

  return { state: renderState, issueCommand, issueRandomCommand, toggleReportMode };
}

function computeBubbleOffsets(agents: SimAgentStatus[], dims: StageDims) {
  const offsets: Record<string, number> = {};
  const bubbleW = 154;
  const bubbleH = 54;
  const gap = 7;
  const slots: Array<{ x: number; y: number; stackY: number }> = [];

  agents.filter((agent) => agent.bubbleVisible && agent.bubble).forEach((agent) => {
    const x = (agent.x / 100) * dims.w;
    const y = (agent.y / 100) * dims.h - RENDERED_H;
    let stackY = 0;
    slots.forEach((slot) => {
      if (Math.abs(x - slot.x) < bubbleW && Math.abs(y - slot.y) < bubbleH * 1.7) {
        stackY = Math.min(stackY, slot.stackY - bubbleH - gap);
      }
    });
    slots.push({ x, y, stackY });
    offsets[agent.id] = stackY;
  });
  return offsets;
}

function useStageDims() {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<StageDims>({ w: 900, h: 620 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const update = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setDims({ w: rect.width, h: rect.height });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);

  return { ref, dims };
}

function PixelAgent({
  agent,
  dims,
  frame,
  bubbleOffsetY,
  onClick,
}: {
  agent: SimAgentStatus;
  dims: StageDims;
  frame: number;
  bubbleOffsetY: number;
  onClick: (id: AgentId) => void;
}) {
  const isWorking = agent.state === 'working' || agent.state === 'thinking' || agent.state === 'reporting';
  const isActive = agent.state !== 'idle';
  const left = (agent.x / 100) * dims.w - RENDERED_W / 2;
  const top = (agent.y / 100) * dims.h - RENDERED_H;
  const zIndex = 20 + Math.round(agent.y);
  const spritePos = getSpritePosition(agent.direction, agent.isWalking, isWorking, frame);
  const progress = Math.max(8, Math.round((agent.isWalking ? agent.walkProgress : isWorking ? 0.68 : 0.12) * 100));
  const bubbleStyle = {
    '--bubble-offset': `${bubbleOffsetY}px`,
    '--agent-color': agent.color,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`sang-pixel-agent ${isActive ? 'active' : ''} ${agent.state}`}
      style={{
        left,
        top,
        width: RENDERED_W,
        height: RENDERED_H + 34,
        zIndex,
        '--agent-color': agent.color,
      } as CSSProperties}
      onClick={() => onClick(agent.id)}
      aria-label={`${agent.name} ${STATE_LABELS[agent.state]} ${agent.bubble}`}
      data-agent-id={agent.id}
      data-agent-state={agent.state}
      data-direction={agent.direction}
    >
      <span className="sang-agent-shadow" />
      <span
        className="sang-pixel-sprite"
        style={{
          width: TILE,
          height: CHAR_HEIGHT,
          backgroundImage: `url(${agent.sprite})`,
          backgroundPosition: spritePos,
          transform: `scale(${SCALE})`,
          transformOrigin: 'left top',
        }}
      />
      <span className="sang-status-led" />
      {(isWorking || agent.isWalking) && (
        <span className="sang-work-progress">
          <i style={{ width: `${progress}%` }} />
        </span>
      )}
      <span className="sang-nameplate">
        <b>{agent.name}</b>
        <small>{agent.badge}</small>
      </span>
      {agent.bubbleVisible && agent.bubble && (
        <span className="sang-speech-bubble" style={bubbleStyle}>
          <em>{agent.emoji}</em>
          {agent.bubble}
        </span>
      )}
      {agent.arrivedAt && Array.from({ length: agent.arrivedAt === 'ceo' ? 14 : 8 }).map((_, idx) => (
        <span
          key={`${agent.arrivedAt}-${idx}`}
          className="sang-arrival-particle"
          style={{
            '--angle': `${(idx / (agent.arrivedAt === 'ceo' ? 14 : 8)) * 360}deg`,
            '--dist': `${agent.arrivedAt === 'ceo' ? 52 : 32}px`,
            '--agent-color': agent.color,
          } as CSSProperties}
        />
      ))}
    </button>
  );
}

function SangOfficeStage({
  agents,
  activeAgentId,
  reportingAgentIds,
  isParallel,
  onAgentClick,
}: {
  agents: SimAgentStatus[];
  activeAgentId: AgentId | null;
  reportingAgentIds: AgentId[];
  isParallel: boolean;
  onAgentClick: (id: AgentId) => void;
}) {
  const { ref, dims } = useStageDims();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      setFrame((prev) => prev + 1);
      id = window.requestAnimationFrame(tick);
    };
    id = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(id);
  }, []);

  const bubbleOffsets = useMemo(() => computeBubbleOffsets(agents, dims), [agents, dims]);
  const beamAgents = isParallel
    ? agents.filter((agent) => agent.state === 'walking_to_ceo' || agent.state === 'reporting')
    : agents.filter((agent) => agent.id === activeAgentId && (agent.state === 'walking_to_ceo' || agent.state === 'reporting'));

  return (
    <div ref={ref} className="sang-stage" data-source-repo={SIM_SOURCE_REPO} data-project-url={MANUS_PUBLIC_PROJECT}>
      <img className="sang-office-map" src={OFFICE_MAP} alt="" draggable={false} />
      <div className="sang-map-tint" />
      <div className="sang-grid" />
      <div className="sang-vignette" />
      <span className="sang-wall-sign">24H OPS CTRL</span>
      {SIM_AGENTS.map((agent) => {
        const pos = DESK_POSITIONS[agent.id] || { x: 50, y: 50 };
        const active = agents.find((item) => item.id === agent.id)?.state !== 'idle';
        return (
          <span
            key={`desk-${agent.id}`}
            className={`sang-desk-light ${active ? 'active' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--agent-color': agent.color } as CSSProperties}
          />
        );
      })}
      <div className="sang-ceo-zone" style={{ left: `${CEO_POS.x}%`, top: `${CEO_POS.y}%` }}>
        <b>CEO TABLE</b>
        <small>{reportingAgentIds.length ? `${reportingAgentIds.length}명 보고 중` : '명령 대기'}</small>
      </div>
      <svg className="sang-beams" viewBox={`0 0 ${dims.w} ${dims.h}`} preserveAspectRatio="none">
        {beamAgents.map((agent) => (
          <line
            key={`beam-${agent.id}`}
            x1={(agent.x / 100) * dims.w}
            y1={(agent.y / 100) * dims.h - RENDERED_H / 2}
            x2={(CEO_POS.x / 100) * dims.w}
            y2={(CEO_POS.y / 100) * dims.h - RENDERED_H / 2}
            stroke={agent.color}
          />
        ))}
      </svg>
      {agents.map((agent) => (
        <PixelAgent
          key={agent.id}
          agent={agent}
          dims={dims}
          frame={frame}
          bubbleOffsetY={bubbleOffsets[agent.id] || 0}
          onClick={onAgentClick}
        />
      ))}
    </div>
  );
}

function AgentStatusCard({ agent }: { agent: SimAgentStatus }) {
  const active = agent.state !== 'idle';
  const miniPos = getSpritePosition(agent.direction, agent.isWalking, active, 0);
  return (
    <button
      type="button"
      className={`sang-agent-card ${active ? 'active' : ''}`}
      style={{ '--agent-color': agent.color } as CSSProperties}
      aria-label={`${agent.name} 상태 ${STATE_LABELS[agent.state]}`}
    >
      <span className="sang-mini-sprite-wrap">
        <i
          className="sang-mini-sprite"
          style={{ backgroundImage: `url(${agent.sprite})`, backgroundPosition: miniPos }}
        />
      </span>
      <b>{agent.name}</b>
      <small>{STATE_LABELS[agent.state]}</small>
      {agent.task && <em>{agent.task}</em>}
    </button>
  );
}

export function SangOfficeSimulator({
  plan,
  selectAgent,
}: {
  plan: OfficePlan;
  selectAgent: (id: AgentId) => void;
}) {
  const { state, issueCommand, issueRandomCommand, toggleReportMode } = useSangSimulation(plan);
  const [draft, setDraft] = useState(plan.brief);
  const activeCount = state.agents.filter((agent) => agent.state !== 'idle').length;
  const reportingAgents = state.agents.filter((agent) => agent.state === 'reporting' || agent.state === 'walking_to_ceo');
  const activeAgent = state.agents.find((agent) => agent.id === state.activeAgentId);
  const isParallel = state.reportMode === 'parallel';

  useEffect(() => {
    setDraft(plan.brief);
  }, [plan.brief]);

  return (
    <div className="sang-sim-root" data-source-repo={SIM_SOURCE_REPO} data-connect-ai-repo={CONNECT_AI_SOURCE_REPO}>
      <header className="sang-sim-header">
        <div className="sang-brand">
          <span className="sang-brand-pixel">◈</span>
          <strong>CONNECT AI</strong>
          <span>OFFICE SIMULATOR</span>
        </div>
        <div className="sang-hud">
          <span className="sang-hud-item"><small>DAY</small><b>{String(state.day).padStart(3, '0')}</b></span>
          <span className="sang-hud-item"><small>TIME</small><b>{state.time}</b></span>
          <span className="sang-hud-item active"><small>ACTIVE</small><b>{activeCount}/{state.agents.length}</b></span>
          <button className="sang-mode-button" type="button" onClick={toggleReportMode} disabled={state.isRunning}>
            {isParallel ? '⧈ PARALLEL' : '▶ SEQUENTIAL'}
          </button>
          <span className={`sang-run-status ${state.isRunning ? 'running' : ''}`}>
            <i />
            {state.isRunning ? 'RUNNING' : 'STANDBY'}
          </span>
        </div>
      </header>
      <main className="sang-sim-main">
        <section className="sang-stage-panel">
          <div className="sang-stage-label">
            <div>
              <span>◈ OFFICE FLOOR</span>
              {isParallel && <b>⧈ PARALLEL</b>}
            </div>
            {reportingAgents.length > 0 ? (
              <em>
                {reportingAgents.map((agent) => agent.emoji).join(' ')} {reportingAgents.length > 1 ? `${reportingAgents.length}명 동시 보고` : STATE_LABELS[reportingAgents[0].state]}
              </em>
            ) : !isParallel && activeAgent ? (
              <em style={{ color: activeAgent.color }}>{activeAgent.emoji} {activeAgent.name} - {STATE_LABELS[activeAgent.state]}</em>
            ) : (
              <em>CEO 명령 대기</em>
            )}
          </div>
          <div className="sang-stage-frame">
            <SangOfficeStage
              agents={state.agents}
              activeAgentId={state.activeAgentId}
              reportingAgentIds={state.reportingAgentIds}
              isParallel={isParallel}
              onAgentClick={selectAgent}
            />
          </div>
        </section>
        <aside className="sang-control-panel">
          <section>
            <strong><span>◈</span> CEO COMMAND</strong>
            <textarea
              id="sang-ceo-command"
              name="sang-ceo-command"
              aria-label="CEO command"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  issueCommand(draft);
                }
              }}
            />
            <div className="sang-command-actions">
              <button type="button" onClick={() => issueCommand(draft)} disabled={!draft.trim() || state.isRunning}>▶ DISPATCH</button>
              <button type="button" onClick={issueRandomCommand} disabled={state.isRunning}>⚡ AUTO</button>
            </div>
            <div className="sang-quick-cmds">
              {QUICK_CMDS.map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  className="sang-quick-command"
                  onClick={() => issueCommand(cmd.cmd)}
                  disabled={state.isRunning}
                >
                  {cmd.label}
                </button>
              ))}
            </div>
            {state.ceoCommand && (
              <div className="sang-current-command">
                <small>현재 명령</small>
                <p>{state.ceoCommand}</p>
              </div>
            )}
          </section>
          <section>
            <strong><span>▣</span> AGENT STATUS <em>{activeCount}/{state.agents.length}</em></strong>
            <div className="sang-agent-cards">
              {state.agents.map((agent) => <AgentStatusCard key={agent.id} agent={agent} />)}
            </div>
          </section>
          <section className="sang-log-section">
            <strong><span>▸</span> ACTIVITY LOG <em>{state.log.length}</em></strong>
            <div>
              {state.log.length === 0 ? <p>명령을 내리면 로그가 쌓입니다...</p> : state.log.map((entry, idx) => (
                <p key={`${entry.ts}-${idx}`}><span>{entry.emoji} {entry.name}</span>{entry.msg}</p>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default SangOfficeSimulator;
