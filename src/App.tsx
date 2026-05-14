import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Brain,
  CheckCircle2,
  CircleDot,
  Clock,
  CloudOff,
  Cpu,
  Database,
  DoorOpen,
  FileText,
  FolderKanban,
  GitBranch,
  Lock,
  MessageSquareText,
  Play,
  Radio,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import { AGENTS, AGENT_ORDER, AgentDef, AgentId, SPECIALIST_IDS } from './agents';
import {
  AgentTask,
  ApprovalItem,
  ApprovalStatus,
  ModelSettings,
  OfficePlan,
  brainFolders,
  defaultModelSettings,
  makePlan,
  modelOptions,
} from './simulator';
import './styles.css';

const videos = [
  { id: 'qDKHEXZ8p6w', title: 'AI 직원 10명이 24시간 일하는 완전 무료 프로그램', tag: '1강 · AI 1인 기업 자동화' },
  { id: '5KJ_cuwMcNY', title: '무료 AI 직원이 내 유튜브 채널 분석해서 Telegram으로 보고', tag: '2강 · YouTube + Telegram' },
  { id: 'jpd7gYchCbQ', title: '월급 0원 AI 직원 5명 고용 + 코드 무료 공유', tag: '3강 · 코딩/경영/수익성 웹사이트' },
];

const activityLabels: Record<AgentId, string> = {
  ceo: '업무 분배 중',
  youtube: '채널 분석',
  instagram: '릴스 기획',
  designer: '썸네일 제작',
  developer: '코드 구현',
  business: '수익 계산',
  secretary: 'Telegram 보고',
  editor: 'BGM 편집',
  writer: '후크 작성',
  researcher: '자료 검증',
};

const rooms = [
  { name: 'CEO 전략실', desc: '목표를 쪼개고 승인 기준을 정함', pos: 'top' },
  { name: '콘텐츠 스튜디오', desc: 'YouTube, Instagram, Writer가 소재 생산', pos: 'left' },
  { name: '개발/자동화 랩', desc: 'Developer가 Hermes Web과 도구를 연결', pos: 'right' },
  { name: 'Telegram 관제실', desc: 'Secretary가 보고서와 승인 대기를 관리', pos: 'bottom' },
];

type MotionPhase = 'walkingToCeo' | 'reporting' | 'walkingBack' | 'idle';

const phaseLabels: Record<MotionPhase, string> = {
  walkingToCeo: 'CEO 방으로 이동 중',
  reporting: 'CEO에게 보고 중',
  walkingBack: '자리로 복귀 중',
  idle: '다음 직원 대기',
};

const phaseDurations: Record<MotionPhase, number> = {
  walkingToCeo: 2400,
  reporting: 1900,
  walkingBack: 2100,
  idle: 800,
};

const phaseOrder: MotionPhase[] = ['walkingToCeo', 'reporting', 'walkingBack', 'idle'];

const walkVectors: Record<AgentId, { x: number; y: number; routeX: number; routeY: number; delay: string; duration: string }> = {
  ceo: { x: 0, y: -10, routeX: 0, routeY: 0, delay: '0s', duration: '8s' },
  youtube: { x: 12, y: 10, routeX: 255, routeY: 190, delay: '-.2s', duration: '13s' },
  instagram: { x: 10, y: 12, routeX: 128, routeY: 216, delay: '-2.1s', duration: '14.5s' },
  designer: { x: -10, y: 12, routeX: -128, routeY: 216, delay: '-4.4s', duration: '15s' },
  developer: { x: -12, y: 10, routeX: -255, routeY: 190, delay: '-6.2s', duration: '13.8s' },
  business: { x: 14, y: -10, routeX: 288, routeY: -140, delay: '-1.3s', duration: '16s' },
  secretary: { x: 10, y: -14, routeX: 144, routeY: -215, delay: '-5.1s', duration: '14s' },
  editor: { x: 0, y: -14, routeX: 0, routeY: -250, delay: '-7.6s', duration: '15.5s' },
  writer: { x: -10, y: -14, routeX: -144, routeY: -215, delay: '-3.3s', duration: '14.8s' },
  researcher: { x: -14, y: -10, routeX: -288, routeY: -140, delay: '-8.7s', duration: '16.5s' },
};

const taskStatusLabel: Record<AgentTask['status'], string> = {
  queued: '대기',
  running: '작업 중',
  done: '완료',
  approval: '승인 대기',
};

const approvalChoices: { label: ApprovalStatus; short: string }[] = [
  { label: '1회 승인됨', short: '1회 승인' },
  { label: '이번 세션 승인', short: '세션 승인' },
  { label: '거절됨', short: '거절' },
];

function modelLabel(modelId: string) {
  return modelOptions.find((item) => item.id === modelId)?.label || modelId.split('/').pop() || modelId;
}

function AgentAvatar({
  agent,
  active,
  motionPhase,
  task,
  onClick,
}: {
  agent: AgentDef;
  active: boolean;
  motionPhase: MotionPhase;
  task?: AgentTask;
  onClick: () => void;
}) {
  const walk = walkVectors[agent.id];
  const motionClass = agent.id === 'ceo' ? 'ceo-node' : motionPhase;
  const speech = motionPhase === 'walkingToCeo'
    ? '보고하러 이동'
    : motionPhase === 'reporting'
      ? `${task ? taskStatusLabel[task.status] : '보고 중'} ${task?.progress ?? ''}%`
      : motionPhase === 'walkingBack'
        ? '자리 복귀'
        : task
          ? `${taskStatusLabel[task.status]} ${task.progress}%`
          : activityLabels[agent.id];

  return (
    <button
      className={`agent-node ${motionClass} ${active ? 'active' : ''} ${task?.status || 'idle-task'}`}
      style={{
        left: `${agent.desk.x}%`,
        top: `${agent.desk.y}%`,
        ['--agent-color' as string]: agent.color,
        ['--walk-x' as string]: `${walk.x}px`,
        ['--walk-y' as string]: `${walk.y}px`,
        ['--route-x' as string]: `${walk.routeX}px`,
        ['--route-y' as string]: `${walk.routeY}px`,
        ['--walk-delay' as string]: walk.delay,
        ['--route-duration' as string]: walk.duration,
      }}
      onClick={onClick}
      title={`${agent.name} · ${agent.role}`}
    >
      <span className="pulse-ring" />
      <span className="agent-shadow" />
      <span className="agent-body">
        <span className="talk-bubble">{speech}</span>
        {agent.profileImage ? <img src={agent.profileImage} alt={agent.name} /> : <span className="emoji-face">{agent.emoji}</span>}
        <span className="agent-name">{agent.name}</span>
        <span className="agent-role">{task ? task.title : agent.role}</span>
      </span>
    </button>
  );
}

function Office({ activeAgent, plan, selectAgent }: { activeAgent: AgentId; plan: OfficePlan; selectAgent: (id: AgentId) => void }) {
  const activeRoster = plan.activeAgents.length ? plan.activeAgents : SPECIALIST_IDS;
  const tasksByAgent = useMemo(() => new Map(plan.tasks.map((task) => [task.agent, task])), [plan.tasks]);
  const [engine, setEngine] = useState<{ agent: AgentId; phase: MotionPhase; cycle: number }>({
    agent: activeRoster[0],
    phase: 'walkingToCeo',
    cycle: 0,
  });
  const phaseIndex = phaseOrder.indexOf(engine.phase);
  const currentAgent = AGENTS[engine.agent];
  const currentTask = tasksByAgent.get(engine.agent);

  useEffect(() => {
    setEngine({ agent: activeRoster[0], phase: 'walkingToCeo', cycle: plan.runId });
  }, [activeRoster, plan.runId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEngine((prev) => {
        const currentPhaseIndex = phaseOrder.indexOf(prev.phase);
        const nextPhase = phaseOrder[(currentPhaseIndex + 1) % phaseOrder.length];
        if (prev.phase === 'idle') {
          const currentAgentIndex = Math.max(0, activeRoster.indexOf(prev.agent));
          const nextAgentIndex = (currentAgentIndex + 1) % activeRoster.length;
          return { agent: activeRoster[nextAgentIndex], phase: 'walkingToCeo', cycle: prev.cycle + 1 };
        }
        return { ...prev, phase: nextPhase };
      });
    }, phaseDurations[engine.phase]);
    return () => window.clearTimeout(timer);
  }, [activeRoster, engine]);

  return (
    <section className="office-card">
      <div className="office-topbar">
        <div>
          <p className="eyebrow">Hermes Agent + Connect AI + Telegram Flow</p>
          <h2>AI 직원 회사 운영 화면 <span className="version-badge">Office Simulator v3</span></h2>
        </div>
        <div className="status-stack">
          <div className="status-pill live"><Radio size={15} /> Game Engine ON · {currentAgent.name} {phaseLabels[engine.phase]}</div>
          <div className="mini-clock"><Clock size={14} /> Run #{plan.runId + 1} · 단계 {phaseIndex + 1}/4 · {plan.headline}</div>
        </div>
      </div>

      <div className="office-floor">
        <div className="office-room-shell">
          <div className="back-wall">
            <div className="window window-a"><span /></div>
            <div className="window window-b"><span /></div>
            <div className="wall-logo">AI COMPANY FLOOR</div>
            <div className="wall-shelf shelf-a"><i>Docs</i><i>CRM</i><i>KPI</i></div>
            <div className="wall-shelf shelf-b"><i>LLM</i><i>API</i><i>Bot</i></div>
          </div>
          <div className="side-wall side-left" />
          <div className="side-wall side-right" />
          <div className="wood-floor" />
          <div className="floor-perspective-lines" />
          <div className="plant plant-left">Office</div>
          <div className="plant plant-right">Local</div>
          <div className="sofa"><span>라운지</span></div>
        </div>
        <div className="carpet" />
        <div className="room-map">
          {rooms.map((room) => (
            <div key={room.name} className={`room-card room-${room.pos}`}>
              <DoorOpen size={14} />
              <strong>{room.name}</strong>
              <span>{room.desc}</span>
            </div>
          ))}
        </div>
        <div className="office-wall wall-top">전략 회의실</div>
        <div className="office-wall wall-left">콘텐츠 스튜디오</div>
        <div className="office-wall wall-right">개발/자동화 랩</div>
        <div className="office-wall wall-bottom">보고·승인 데스크</div>
        <div className="meeting-table">
          <span>CEO</span>
          <strong>명령 분배 테이블</strong>
          <em>{currentAgent.emoji} {currentAgent.name} 보고 중</em>
        </div>
        <div className="whiteboard">
          <b>현재 지시</b>
          <span>{plan.brief}</span>
        </div>
        <div className="coffee-machine"><span>휴게존</span></div>
        <div className="telegram-station"><Send size={21} /><span>Telegram 승인 대기</span></div>
        <div className="desk desk-a">YT</div>
        <div className="desk desk-b">DES</div>
        <div className="desk desk-c">DEV</div>
        <div className="desk desk-d">BIZ</div>
        <div className="desk desk-e">TXT</div>
        <div className="walking-lane lane-a" />
        <div className="walking-lane lane-b" />
        <div className="grid-lines" />
        <svg className="beams" viewBox="0 0 100 100" preserveAspectRatio="none">
          {plan.tasks.map((task, idx) => (
            <line key={task.agent} x1="50" y1="50" x2={AGENTS[task.agent].desk.x} y2={AGENTS[task.agent].desk.y} className={`beam beam-${idx % 5} ${task.status}`} />
          ))}
        </svg>
        <svg className="route-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1={currentAgent.desk.x} y1={currentAgent.desk.y} x2="50" y2="50" className={`active-route ${engine.phase}`} />
          <circle cx={currentAgent.desk.x} cy={currentAgent.desk.y} r="1.2" className="route-dot desk-dot" />
          <circle cx="50" cy="50" r="1.6" className="route-dot ceo-dot" />
        </svg>

        <div className="game-state-panel">
          <b>State Machine</b>
          <span>직원: {currentAgent.emoji} {currentAgent.name}</span>
          <span>단계: {phaseLabels[engine.phase]}</span>
          <span>업무: {currentTask?.title || 'CEO 운영'}</span>
          <span>모델: {modelLabel(currentTask?.model || currentAgent.defaultModel)}</span>
        </div>

        <div className="work-packet packet-a">전략</div>
        <div className="work-packet packet-b">분석</div>
        <div className="work-packet packet-c">보고</div>
        <div className="work-packet packet-d">코드</div>
        <div className="work-packet packet-e">승인</div>

        <div className="office-progress">
          <div className="progress-title"><Workflow size={14} /> 업무 파이프라인</div>
          {plan.pipeline.map((step) => (
            <div className={`progress-row ${step.state}`} key={step.label}>
              <span>{step.label}</span>
              <div><i style={{ width: `${step.value}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="live-status-panel">
          <b>Live Ops</b>
          <span>{plan.tasks.filter((task) => task.status === 'running').length}명 작업 중</span>
          <span>{plan.tasks.filter((task) => task.status === 'approval').length}건 승인 대기</span>
          <span>모델 선택 가능</span>
        </div>

        {AGENT_ORDER.map((id) => (
          <AgentAvatar
            key={id}
            agent={AGENTS[id]}
            active={activeAgent === id || engine.agent === id}
            motionPhase={id === engine.agent ? engine.phase : 'idle'}
            task={tasksByAgent.get(id)}
            onClick={() => selectAgent(id)}
          />
        ))}
      </div>
    </section>
  );
}

function ProfilePanel({
  agent,
  model,
  onModelChange,
}: {
  agent: AgentDef;
  model: string;
  onModelChange: (id: AgentId, model: string) => void;
}) {
  return (
    <aside className="profile-panel glass">
      <div className="profile-head">
        <div className="profile-photo" style={{ borderColor: agent.color }}>
          {agent.profileImage ? <img src={agent.profileImage} alt={agent.name} /> : agent.emoji}
        </div>
        <div>
          <p className="eyebrow">{agent.id}</p>
          <h2>{agent.emoji} {agent.name}</h2>
          <p>{agent.role}</p>
        </div>
      </div>
      <div className="quote">"{agent.tagline}"</div>
      <label className="field-label">
        <span><Cpu size={14} /> 담당 모델</span>
        <select value={model} onChange={(event) => onModelChange(agent.id, event.target.value)}>
          {modelOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.provider} · {option.label}</option>
          ))}
        </select>
      </label>
      <h3>스킬 묶음</h3>
      <div className="skill-tags">
        {agent.suggestedSkills.map((skill) => <span key={skill}>{skill}</span>)}
      </div>
      <h3>권한</h3>
      <div className="permission-list">
        {agent.permissions.map((permission) => <span key={permission}><ShieldCheck size={13} /> {permission}</span>)}
      </div>
      <h3>전문성</h3>
      <p>{agent.specialty}</p>
      <h3>말투/페르소나</h3>
      <p>{agent.persona || '원본 Connect AI의 부서형 전문가 톤을 유지합니다.'}</p>
    </aside>
  );
}

function CommandCenter({
  prompt,
  plan,
  setPrompt,
  runPlan,
}: {
  prompt: string;
  plan: OfficePlan;
  setPrompt: (v: string) => void;
  runPlan: () => void;
}) {
  return (
    <section className="command-center glass">
      <div className="section-title"><Sparkles size={18} /><span>CEO 명령창</span></div>
      <div className="command-grid">
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <div className="command-summary">
          <strong>{plan.headline}</strong>
          <span>{plan.telegramDigest}</span>
          <div className="ops-metrics">
            <em><BadgeCheck size={14} /> {plan.tasks.filter((task) => task.status === 'done').length} 완료</em>
            <em><CircleDot size={14} /> {plan.tasks.filter((task) => task.status === 'running').length} 작업</em>
            <em><Lock size={14} /> {plan.approvals.filter((item) => item.status === '승인 대기').length} 승인</em>
          </div>
        </div>
      </div>
      <div className="command-actions">
        <button className="primary-btn" onClick={runPlan}><Play size={16} /> CEO에게 작업 분배</button>
        <span className="safe-note"><Lock size={14} /> Telegram, 파일 쓰기, GitHub push는 승인 대기 흐름으로 표시</span>
      </div>
    </section>
  );
}

function TaskBoard({ plan, selectAgent }: { plan: OfficePlan; selectAgent: (id: AgentId) => void }) {
  return (
    <section className="task-board glass">
      <div className="section-title"><FolderKanban size={18} /><span>직원별 작업 카드</span></div>
      <p className="ceo-brief">{plan.brief}</p>
      <div className="task-grid">
        {plan.tasks.map((task) => (
          <button key={task.id} className={`task-card ${task.status}`} onClick={() => selectAgent(task.agent)} style={{ borderColor: AGENTS[task.agent].color }}>
            <span className="task-agent">{AGENTS[task.agent].emoji} {AGENTS[task.agent].name} · {task.priority}</span>
            <strong>{task.title}</strong>
            <small>{task.brief}</small>
            <div className="task-progress"><i style={{ width: `${task.progress}%` }} /></div>
            <span className="task-model"><Cpu size={13} /> {modelLabel(task.model)}</span>
            <span className="task-output"><FileText size={13} /> {task.output}</span>
            <em>{taskStatusLabel[task.status]}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function ModelRoutingPanel({
  activeAgent,
  modelSettings,
  selectAgent,
  onModelChange,
}: {
  activeAgent: AgentId;
  modelSettings: ModelSettings;
  selectAgent: (id: AgentId) => void;
  onModelChange: (id: AgentId, model: string) => void;
}) {
  return (
    <section className="routing-panel glass">
      <div className="section-title"><SlidersHorizontal size={18} /><span>모델·스킬 라우팅</span></div>
      <div className="routing-list">
        {AGENT_ORDER.filter((id) => id !== 'ceo').map((id) => {
          const agent = AGENTS[id];
          return (
            <div className={`routing-row ${activeAgent === id ? 'active' : ''}`} key={id}>
              <button type="button" onClick={() => selectAgent(id)}>
                <span>{agent.emoji}</span>
                <strong>{agent.name}</strong>
              </button>
              <select value={modelSettings[id]} onChange={(event) => onModelChange(id, event.target.value)}>
                {modelOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <small>{agent.suggestedSkills.join(' · ')}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BrainPanel({ plan }: { plan: OfficePlan }) {
  return (
    <section className="brain-panel glass">
      <div className="section-title"><Brain size={18} /><span>Second Brain / P-Reinforce</span></div>
      <div className="folder-list">
        {brainFolders.map((folder) => <div key={folder}><CheckCircle2 size={15} /> {folder}</div>)}
      </div>
      <div className="artifact-stack">
        {plan.tasks.slice(0, 4).map((task) => (
          <span key={task.artifact}><Database size={13} /> {task.artifact}</span>
        ))}
      </div>
    </section>
  );
}

function ApprovalPanel({
  approvals,
  decisions,
  respondApproval,
}: {
  approvals: ApprovalItem[];
  decisions: Record<string, ApprovalStatus>;
  respondApproval: (id: string, status: ApprovalStatus) => void;
}) {
  return (
    <section className="approval-panel glass">
      <div className="section-title"><Lock size={18} /><span>Telegram/승인 대기함</span></div>
      {approvals.map((item) => {
        const status = decisions[item.id] || item.status;
        return (
          <div className={`approval-item ${status === '승인 대기' ? 'waiting' : 'resolved'}`} key={item.id}>
            <strong>{AGENTS[item.agent].emoji} {item.title}</strong>
            <span>{item.risk}</span>
            <code>{item.command}</code>
            <em>{status}</em>
            <div className="approval-btns">
              {approvalChoices.map((choice) => (
                <button key={choice.label} onClick={() => respondApproval(item.id, choice.label)}>{choice.short}</button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function VideoPanel() {
  return (
    <section className="video-panel glass">
      <div className="section-title"><Smartphone size={18} /><span>반영 기준 영상 3개</span></div>
      {videos.map((video) => (
        <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
          <span>{video.tag}</span>
          <strong>{video.title}</strong>
        </a>
      ))}
    </section>
  );
}

function Reports({ plan }: { plan: OfficePlan }) {
  return (
    <section className="reports glass">
      <div className="section-title"><MessageSquareText size={18} /><span>직원 실시간 보고 로그</span></div>
      <div className="terminal-feed">
        {plan.reports.map((line, idx) => (
          <p className={line.kind} key={`${line.agent}-${idx}`}>
            <span>{line.time}</span> {line.text}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [activeAgent, setActiveAgent] = useState<AgentId>('ceo');
  const [prompt, setPrompt] = useState('이번 달 월수익 1천만 원을 목표로 유튜브 콘텐츠, 수익성 웹사이트, Telegram 보고 자동화를 같이 운영해줘.');
  const [seed, setSeed] = useState(0);
  const [modelSettings, setModelSettings] = useState<ModelSettings>(defaultModelSettings);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, ApprovalStatus>>({});
  const plan = useMemo(() => makePlan(prompt, seed, modelSettings), [modelSettings, prompt, seed]);
  const selected = AGENTS[activeAgent];

  const updateModel = (id: AgentId, model: string) => {
    setModelSettings((prev) => ({ ...prev, [id]: model }));
  };

  const runPlan = () => {
    setSeed((next) => next + 1);
    setApprovalDecisions({});
    setActiveAgent('ceo');
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Based on Connect AI · Hermes Agent · Hermes for Web</p>
          <h1>Connect AI Office</h1>
          <p>CEO가 명령하면 AI 직원들이 자리에서 일하고, CEO 방으로 이동해 보고하고, Telegram 승인을 기다리는 1인 기업 운영 화면입니다.</p>
        </div>
        <div className="hero-actions">
          <span><CloudOff size={16} /> Local-first sandbox</span>
          <span><GitBranch size={16} /> 승인 전 push 잠금</span>
          <span><Settings2 size={16} /> 직원별 모델 선택</span>
        </div>
      </header>

      <main className="layout">
        <div className="left-col">
          <Office activeAgent={activeAgent} plan={plan} selectAgent={setActiveAgent} />
          <CommandCenter prompt={prompt} plan={plan} setPrompt={setPrompt} runPlan={runPlan} />
          <TaskBoard plan={plan} selectAgent={setActiveAgent} />
        </div>
        <div className="right-col">
          <ProfilePanel agent={selected} model={modelSettings[activeAgent]} onModelChange={updateModel} />
          <ModelRoutingPanel activeAgent={activeAgent} modelSettings={modelSettings} selectAgent={setActiveAgent} onModelChange={updateModel} />
          <ApprovalPanel approvals={plan.approvals} decisions={approvalDecisions} respondApproval={(id, status) => setApprovalDecisions((prev) => ({ ...prev, [id]: status }))} />
          <BrainPanel plan={plan} />
          <VideoPanel />
          <Reports plan={plan} />
        </div>
      </main>
    </div>
  );
}
