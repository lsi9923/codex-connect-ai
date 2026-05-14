import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const SIM_SOURCE_REPO = 'https://github.com/lsi9923/sang-ai-office-simulator';
const WALK_DURATION = 1.1;
const AGENT_W = 46;
const AGENT_H = 70;

const SIM_AGENTS: SimAgentDef[] = [
  { id: 'ceo', name: 'CEO', role: 'Chief Executive', badge: 'CEO', emoji: '🧭', color: '#f8fafc', idleDir: 'down' },
  { id: 'youtube', name: '레오', role: 'Head of YouTube', badge: 'YT', emoji: '📺', color: '#ff4444', idleDir: 'right' },
  { id: 'instagram', name: 'Instagram', role: 'Head of Instagram', badge: 'IG', emoji: '📷', color: '#e1306c', idleDir: 'down' },
  { id: 'designer', name: 'Designer', role: 'Lead Designer', badge: 'DSN', emoji: '🎨', color: '#a78bfa', idleDir: 'left' },
  { id: 'developer', name: '코다리', role: '풀스택 엔지니어', badge: 'DEV', emoji: '💻', color: '#22d3ee', idleDir: 'right' },
  { id: 'business', name: '현빈', role: '비즈니스 전략가', badge: 'BIZ', emoji: '💼', color: '#f5c518', idleDir: 'down' },
  { id: 'secretary', name: '영숙', role: 'Personal Assistant', badge: 'SEC', emoji: '📱', color: '#84cc16', idleDir: 'left' },
];

const DESK_POSITIONS: Record<AgentId, { x: number; y: number }> = {
  ceo: { x: 47, y: 78 },
  youtube: { x: 26, y: 32 },
  instagram: { x: 40, y: 32 },
  designer: { x: 54, y: 32 },
  business: { x: 68, y: 32 },
  developer: { x: 26, y: 56 },
  secretary: { x: 68, y: 56 },
  editor: { x: 42, y: 62 },
  writer: { x: 55, y: 60 },
  researcher: { x: 74, y: 52 },
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
  ceo: ['이번 분기 목표가...', '팀 잘 굴러가나', '다음 큰 그림은?', 'KPI 다시 봐야겠다'],
  youtube: ['다음 썸네일 뭐로?', '오프닝 5초가 핵심', '트렌드 봐야지', '구독자 반응 어떨까'],
  instagram: ['릴스 트렌드 체크', '해시태그 뭘로?', '커버 이미지가 약해', '피드 구성 다시'],
  designer: ['색감이 뭔가 부족한데', '여백을 더...', '폰트 다시 골라야', '톤앤매너가 안 맞아'],
  developer: ['이거 캐시해야', '버그 어디서 났지', '리팩터 해야 하는데', '테스트 돌려야지'],
  business: ['ROI 계산 다시', '월 마감 보자', '현금흐름은 OK', '채널별 수익 분리'],
  secretary: ['일정 정리하자', 'CEO 미팅 30분 후', '보고서 요약해야', '텔레그램 승인 대기'],
};

const ROLE_WORK_MESSAGES: Record<string, string[]> = {
  ceo: ['전략 수립 중...', '팀 조율 중...', '보고서 검토 중...'],
  youtube: ['영상 기획서 작성 중...', '썸네일 브리프 작성 중...', '트렌드 분석 중...'],
  instagram: ['릴스 콘셉트 기획 중...', '캡션 작성 중...', '해시태그 전략 수립 중...'],
  designer: ['디자인 시안 제작 중...', '컬러 팔레트 구성 중...', '비주얼 가이드 작성 중...'],
  developer: ['코드 작성 중...', 'API 연동 중...', '테스트 실행 중...'],
  business: ['수익 분석 중...', 'KPI 설계 중...', '가격 전략 수립 중...'],
  secretary: ['보고서 요약 중...', '텔레그램 발송 준비 중...', '회의록 작성 중...'],
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

const QUICK_COMMANDS = [
  '유튜브 채널 성장 전략 수립 + 이번 주 콘텐츠 캘린더 작성',
  '인스타그램 릴스 3개 기획 + 디자인 시안 제작',
  '포트폴리오 웹사이트 개발 + 배포',
  '이번 달 수익 분석 보고서 작성 + 텔레그램 보고',
  '브랜드 아이덴티티 가이드라인 제작',
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
    bubble: thought,
    bubbleVisible: true,
    arrivedAt: null,
    idleDirIdx: 0,
  };
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
    }));
  }, []);

  const updateAgent = useCallback((id: AgentId, patch: Partial<SimAgentStatus>) => {
    agentsRef.current = agentsRef.current.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent));
  }, []);

  const addLog = useCallback((id: AgentId, msg: string) => {
    const agent = SIM_AGENTS.find((item) => item.id === id);
    if (!agent) return;
    logRef.current = [{ id, emoji: agent.emoji, name: agent.name, msg, ts: Date.now() }, ...logRef.current.slice(0, 39)];
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
        return { ...agent, bubble: thought, bubbleVisible: true, direction: cycle[nextIdx], idleDirIdx: nextIdx };
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

    updateAgent(id, {
      state: 'thinking',
      bubble: `${task.slice(0, 28)}...`,
      bubbleVisible: true,
      task,
      direction: def?.idleDir || 'down',
    });
    addLog(id, `작업 시작: ${task}`);
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    updateAgent(id, { state: 'walking_to_ceo', bubble: 'CEO에게 이동 중...', bubbleVisible: true });
    syncState();
    await startWalk(id, ceoX, ceoY);

    reportingRef.current = [...reportingRef.current, id];
    updateAgent(id, {
      state: 'reporting',
      bubble: `보고: ${task.slice(0, 24)}...`,
      bubbleVisible: true,
      direction: 'up',
      isWalking: false,
      arrivedAt: 'ceo',
    });
    addLog(id, 'CEO에게 보고 중');
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    updateAgent(id, { arrivedAt: null });
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 1500));

    reportingRef.current = reportingRef.current.filter((agentId) => agentId !== id);
    updateAgent(id, { state: 'walking_home', bubble: '자리로 복귀 중...', bubbleVisible: true });
    syncState();
    await startWalk(id, home.x, home.y);

    updateAgent(id, { arrivedAt: 'desk' });
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 140));
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
    syncState();
    await new Promise((resolve) => window.setTimeout(resolve, 1700));

    const thought = pickRandom(AGENT_THOUGHTS[id] || ['...']);
    updateAgent(id, {
      state: 'idle',
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
      await new Promise((resolve) => window.setTimeout(resolve, 250));
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
    }, 650);

    queueRef.current = SIM_AGENTS.filter((agent) => agent.id !== 'ceo').map((agent) => agent.id);
    window.setTimeout(() => {
      if (modeRef.current === 'parallel') void processParallel();
      else void processSequential();
    }, 850);
  }, [addLog, processParallel, processSequential, syncState, updateAgent]);

  const issueRandomCommand = useCallback(() => issueCommand(pickRandom(QUICK_COMMANDS)), [issueCommand]);

  const toggleReportMode = useCallback(() => {
    if (processingRef.current) return;
    modeRef.current = modeRef.current === 'sequential' ? 'parallel' : 'sequential';
    syncState();
  }, [syncState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      issueCommand(plan.brief || '이번 달 운영 목표를 AI 직원들에게 분배해줘');
    }, 550);
    return () => window.clearTimeout(timer);
  }, [issueCommand, plan.runId]);

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify({
      mode: 'sang-ai-office-simulator',
      sourceRepo: SIM_SOURCE_REPO,
      reportMode: modeRef.current,
      activeAgent: activeRef.current,
      reportingAgentIds: reportingRef.current,
      agents: agentsRef.current.map((agent) => ({
        id: agent.id,
        state: agent.state,
        x: Number(agent.x.toFixed(2)),
        y: Number(agent.y.toFixed(2)),
        bubble: agent.bubble,
      })),
      command: commandRef.current,
      time: renderState.time,
    });
    return () => {
      if (window.render_game_to_text?.().includes('sang-ai-office-simulator')) delete window.render_game_to_text;
    };
  }, [renderState.time]);

  return { state: renderState, issueCommand, issueRandomCommand, toggleReportMode };
}

function computeBubbleOffsets(agents: SimAgentStatus[], dims: StageDims) {
  const offsets: Record<string, number> = {};
  const bubbleW = 170;
  const bubbleH = 58;
  const gap = 8;
  const slots: Array<{ x: number; y: number; stackY: number }> = [];

  agents.filter((agent) => agent.bubbleVisible && agent.bubble).forEach((agent) => {
    const x = (agent.x / 100) * dims.w;
    const y = (agent.y / 100) * dims.h - AGENT_H;
    let stackY = 0;
    slots.forEach((slot) => {
      if (Math.abs(x - slot.x) < bubbleW && Math.abs(y - slot.y) < bubbleH * 2) {
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

function PixelWorker({
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
  const isActive = agent.state !== 'idle';
  const left = (agent.x / 100) * dims.w - AGENT_W / 2;
  const top = (agent.y / 100) * dims.h - AGENT_H;
  const zIndex = 12 + Math.round(agent.y);
  const stepClass = agent.isWalking ? ` walking ${agent.direction}` : '';
  const bodyTilt = agent.direction === 'left' ? -4 : agent.direction === 'right' ? 4 : 0;

  return (
    <button
      type="button"
      className={`sang-agent ${isActive ? 'active' : ''}${stepClass}`}
      style={{
        left,
        top,
        zIndex,
        ['--agent-color' as string]: agent.color,
        ['--agent-tilt' as string]: `${bodyTilt}deg`,
      }}
      onClick={() => onClick(agent.id)}
      aria-label={`${agent.name} ${agent.state} ${agent.bubble}`}
    >
      <span className="sang-agent-shadow" />
      <span className="sang-agent-body">
        <span className="sang-agent-head"><em>{agent.emoji}</em></span>
        <span className="sang-agent-torso" />
        <span className="sang-agent-leg left" />
        <span className="sang-agent-leg right" />
      </span>
      <span className="sang-agent-name">
        <b>{agent.name}</b>
        <small>{agent.badge}</small>
      </span>
      {agent.bubbleVisible && agent.bubble && (
        <span className="sang-bubble" style={{ ['--bubble-offset' as string]: `${bubbleOffsetY}px` }}>
          <em>{agent.emoji}</em>
          {agent.bubble}
        </span>
      )}
      {agent.arrivedAt && Array.from({ length: agent.arrivedAt === 'ceo' ? 10 : 6 }).map((_, idx) => (
        <span
          key={`${agent.arrivedAt}-${idx}`}
          className="sang-arrival-particle"
          style={{
            ['--angle' as string]: `${(idx / (agent.arrivedAt === 'ceo' ? 10 : 6)) * 360}deg`,
            ['--dist' as string]: `${agent.arrivedAt === 'ceo' ? 46 : 28}px`,
          }}
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
    <div ref={ref} className="sang-stage" data-source-repo={SIM_SOURCE_REPO}>
      <div className="sang-office-bg">
        <span className="wall-sign">24H OPS CTRL</span>
        <span className="window w1" />
        <span className="window w2" />
        <span className="window w3" />
        <span className="window w4" />
      </div>
      <div className="sang-grid" />
      {SIM_AGENTS.map((agent) => {
        const pos = DESK_POSITIONS[agent.id];
        return (
          <span
            key={`desk-${agent.id}`}
            className={`sang-desk-marker ${agents.find((item) => item.id === agent.id)?.state !== 'idle' ? 'active' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, ['--agent-color' as string]: agent.color }}
          >
            {agent.emoji}
          </span>
        );
      })}
      <div className="sang-ceo-table" style={{ left: `${CEO_POS.x}%`, top: `${CEO_POS.y}%` }}>
        <b>CEO</b>
        <small>{reportingAgentIds.length ? `${reportingAgentIds.length}명 보고` : '명령 대기'}</small>
      </div>
      <svg className="sang-beams" viewBox={`0 0 ${dims.w} ${dims.h}`} preserveAspectRatio="none">
        {beamAgents.map((agent) => (
          <line
            key={`beam-${agent.id}`}
            x1={(agent.x / 100) * dims.w}
            y1={(agent.y / 100) * dims.h - AGENT_H / 2}
            x2={(CEO_POS.x / 100) * dims.w}
            y2={(CEO_POS.y / 100) * dims.h - AGENT_H / 2}
            stroke={agent.color}
          />
        ))}
      </svg>
      {agents.map((agent) => (
        <PixelWorker
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
  return (
    <button
      type="button"
      className={`sang-agent-card ${active ? 'active' : ''}`}
      style={{ ['--agent-color' as string]: agent.color }}
      aria-label={`${agent.name} 상태 ${agent.state}`}
    >
      <span>{agent.emoji}</span>
      <b>{agent.name}</b>
      <small>{agent.state.toUpperCase()}</small>
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
  const isParallel = state.reportMode === 'parallel';

  useEffect(() => {
    setDraft(plan.brief);
  }, [plan.brief]);

  return (
    <div className="sang-sim-root" data-source-repo={SIM_SOURCE_REPO}>
      <header className="sang-sim-header">
        <div>
          <b>CONNECT AI PIXEL OFFICE</b>
          <span>{SIM_SOURCE_REPO}</span>
        </div>
        <div className="sang-hud">
          <span>DAY {String(state.day).padStart(3, '0')}</span>
          <span>{state.time}</span>
          <span className={state.isRunning ? 'running' : ''}>{state.isRunning ? 'RUNNING' : 'STANDBY'}</span>
          <button type="button" onClick={toggleReportMode} disabled={state.isRunning}>
            {isParallel ? 'PARALLEL' : 'SEQUENTIAL'}
          </button>
        </div>
      </header>
      <main className="sang-sim-main">
        <section className="sang-stage-panel">
          <div className="sang-stage-label">
            <span>OFFICE FLOOR · {activeCount}/{state.agents.length} ACTIVE</span>
            <em>{isParallel ? `${state.reportingAgentIds.length}명 동시 보고 가능` : state.activeAgentId ? `${state.activeAgentId} 순차 보고` : '순차 보고 대기'}</em>
          </div>
          <SangOfficeStage
            agents={state.agents}
            activeAgentId={state.activeAgentId}
            reportingAgentIds={state.reportingAgentIds}
            isParallel={isParallel}
            onAgentClick={selectAgent}
          />
        </section>
        <aside className="sang-control-panel">
          <section>
            <strong>CEO COMMAND</strong>
            <textarea
              id="sang-ceo-command"
              name="sang-ceo-command"
              aria-label="CEO command"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="sang-command-actions">
              <button type="button" onClick={() => issueCommand(draft)} disabled={!draft.trim() || state.isRunning}>DISPATCH</button>
              <button type="button" onClick={issueRandomCommand} disabled={state.isRunning}>AUTO</button>
            </div>
            {state.ceoCommand && <p className="sang-current-command">{state.ceoCommand}</p>}
          </section>
          <section>
            <strong>AGENT STATUS</strong>
            <div className="sang-agent-cards">
              {state.agents.map((agent) => <AgentStatusCard key={agent.id} agent={agent} />)}
            </div>
          </section>
          <section className="sang-log-section">
            <strong>ACTIVITY LOG</strong>
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
