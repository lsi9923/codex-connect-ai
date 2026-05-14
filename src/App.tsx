import { useEffect, useMemo, useRef, useState } from 'react';
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
  Layers3,
  Lock,
  MapPinned,
  MessageSquareText,
  Play,
  Plus,
  Radio,
  Route,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Workflow,
  Wand2,
  X,
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
import {
  SkillSettings,
  buildDefaultSkillSettings,
  localSkillCatalog,
  normalizeSkillList,
  recommendSkillsForAgent,
  skillSourceLabel,
} from './skillCatalog';
import { OfficeStage3D } from './OfficeStage3D';
import './styles.css';

const videos = [
  { id: 'YBp_PXBbe80', title: 'Hermes Desktop 3D 에이전트 UI 참고', tag: 'Hermes Desktop · 3D agent' },
  { id: 'qDKHEXZ8p6w', title: 'AI 직원 10명이 24시간 일하는 완전 무료 프로그램', tag: '1강 · AI 1인 기업 자동화' },
  { id: '5KJ_cuwMcNY', title: '무료 AI 직원이 내 유튜브 채널 분석해서 Telegram으로 보고', tag: '2강 · YouTube + Telegram' },
  { id: 'jpd7gYchCbQ', title: '월급 0원 AI 직원 5명 고용 + 코드 무료 공유', tag: '3강 · 코딩/경영/수익성 웹사이트' },
];

const referenceLinks = [
  { href: 'https://github.com/fathah/hermes-desktop', tag: 'GitHub Repo', title: 'Hermes Desktop · profiles, memory, skills, schedules, gateways, Claw3d' },
  { href: 'https://hermes-agent.nousresearch.com/docs', tag: 'Hermes Docs', title: 'Hermes Agent documentation' },
  { href: 'https://hermes-agent.nousresearch.com/docs/user-stories', tag: 'Use Cases', title: 'Hermes Agent user stories' },
];

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

const hermesSlashCommands = ['/memory', '/skills', '/tools', '/status', '/usage', '/model', '/browse', '/code', '/schedule'];
const hermesGateways = ['Telegram', 'Discord', 'Slack', 'Webhooks', 'Email', 'Home Assistant'];
const hermesLoopLabels = ['업무 관찰', '장기 기억 저장', '스킬 개선 제안', '예약 실행 대기'];

function modelLabel(modelId: string) {
  return modelOptions.find((item) => item.id === modelId)?.label || modelId.split('/').pop() || modelId;
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
        <OfficeStage3D plan={plan} activeAgent={activeAgent} selectAgent={selectAgent} />
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
        {plan.tasks.map((task) => {
          const agent = AGENTS[task.agent];
          return (
            <button
              type="button"
              key={`terminal-${task.id}`}
              className={`desk-terminal ${task.status}`}
              style={{
                left: `${agent.desk.x}%`,
                top: `${agent.desk.y}%`,
                ['--agent-color' as string]: agent.color,
              }}
              onClick={() => selectAgent(task.agent)}
            >
              <b>{agent.emoji} {agent.name}</b>
              <span>{taskStatusLabel[task.status]} · {task.progress}%</span>
              <i style={{ width: `${task.progress}%` }} />
            </button>
          );
        })}
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
          <b><MapPinned size={13} /> State Machine</b>
          <span>직원: {currentAgent.emoji} {currentAgent.name}</span>
          <span>단계: {phaseLabels[engine.phase]}</span>
          <span>업무: {currentTask?.title || 'CEO 운영'}</span>
          <span>모델: {modelLabel(currentTask?.model || currentAgent.defaultModel)}</span>
          <span>동선: 책상 → 복도 → CEO 방 → 자리</span>
        </div>
        <div className="route-director">
          <Route size={15} />
          <strong>{currentAgent.name}</strong>
          <span>{phaseLabels[engine.phase]}</span>
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

      </div>
    </section>
  );
}

function SkillEditor({
  agent,
  prompt,
  skills,
  onSkillsChange,
  onRecommendSkills,
}: {
  agent: AgentDef;
  prompt: string;
  skills: string[];
  onSkillsChange: (id: AgentId, skills: string[]) => void;
  onRecommendSkills: (id: AgentId) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const recommendations = useMemo(() => {
    return recommendSkillsForAgent(agent.id, prompt, 9).filter((skill) => !skills.includes(skill.id));
  }, [agent.id, prompt, skills]);

  const addSkill = (skill: string) => {
    onSkillsChange(agent.id, normalizeSkillList([...skills, skill]));
  };

  const removeSkill = (skill: string) => {
    onSkillsChange(agent.id, skills.filter((item) => item !== skill));
  };

  const addDraft = () => {
    const value = inputRef.current?.value.trim() || '';
    if (value) {
      addSkill(value);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="skill-editor">
      <div className="skill-editor-head">
        <span><Layers3 size={14} /> 스킬 편집</span>
        <button type="button" onClick={() => onRecommendSkills(agent.id)}><Wand2 size={14} /> 추천 자동 부착</button>
      </div>
      <div className="editable-skills">
        {skills.map((skill) => (
          <button type="button" key={skill} onClick={() => removeSkill(skill)}>
            {skill}<X size={12} />
          </button>
        ))}
      </div>
      <div className="skill-add-row">
        <input
          id={`skill-input-${agent.id}`}
          name={`skill-input-${agent.id}`}
          ref={inputRef}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder="직접 스킬 이름 입력"
        />
        <button type="button" onClick={addDraft}><Plus size={14} /> 추가</button>
      </div>
      <div className="skill-suggestions">
        <strong>추천 후보 · 로컬 {localSkillCatalog.length}개 스킬/도구에서 매칭</strong>
        {recommendations.map((skill) => (
          <button type="button" key={skill.id} onClick={() => addSkill(skill.id)}>
            <span>{skill.label}</span>
            <small>{skillSourceLabel(skill.source)} · {skill.category}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfilePanel({
  agent,
  model,
  onModelChange,
  prompt,
  skills,
  onSkillsChange,
  onRecommendSkills,
}: {
  agent: AgentDef;
  model: string;
  onModelChange: (id: AgentId, model: string) => void;
  prompt: string;
  skills: string[];
  onSkillsChange: (id: AgentId, skills: string[]) => void;
  onRecommendSkills: (id: AgentId) => void;
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
        <select
          id={`profile-model-${agent.id}`}
          name={`profile-model-${agent.id}`}
          value={model}
          onChange={(event) => onModelChange(agent.id, event.target.value)}
        >
          {modelOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.provider} · {option.label}</option>
          ))}
        </select>
      </label>
      <SkillEditor
        agent={agent}
        prompt={prompt}
        skills={skills}
        onSkillsChange={onSkillsChange}
        onRecommendSkills={onRecommendSkills}
      />
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
  applyRecommendedToAll,
}: {
  prompt: string;
  plan: OfficePlan;
  setPrompt: (v: string) => void;
  runPlan: () => void;
  applyRecommendedToAll: () => void;
}) {
  return (
    <section className="command-center glass">
      <div className="section-title"><Sparkles size={18} /><span>CEO 명령창</span></div>
      <div className="command-grid">
        <textarea
          id="ceo-command-prompt"
          name="ceo-command-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
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
        <button className="ghost-btn" onClick={applyRecommendedToAll}><Wand2 size={16} /> 전 직원 추천 스킬 붙이기</button>
        <span className="safe-note"><Lock size={14} /> Telegram, 파일 쓰기, GitHub push는 승인 대기 흐름으로 표시</span>
      </div>
    </section>
  );
}

function HermesDesktopOpsPanel({
  plan,
  skillSettings,
  activeAgent,
  selectAgent,
}: {
  plan: OfficePlan;
  skillSettings: SkillSettings;
  activeAgent: AgentId;
  selectAgent: (id: AgentId) => void;
}) {
  const totalSkills = AGENT_ORDER.reduce((sum, id) => sum + (skillSettings[id] || AGENTS[id].suggestedSkills).length, 0);
  const runningCount = plan.tasks.filter((task) => task.status === 'running').length;
  const approvalCount = plan.approvals.filter((item) => item.status === '승인 대기').length;
  const activeTask = plan.tasks.find((task) => task.agent === activeAgent);
  const activeSkillCount = (skillSettings[activeAgent] || AGENTS[activeAgent].suggestedSkills).length;
  const memoryPressure = Math.min(96, 42 + plan.reports.length * 4 + runningCount * 5);
  const learningRows = hermesLoopLabels.map((label, idx) => ({
    label,
    value: Math.min(98, memoryPressure - idx * 9 + (idx === 2 ? activeSkillCount : 0)),
    state: idx === 2 && activeSkillCount > 5 ? 'improving' : idx === 3 && approvalCount > 0 ? 'waiting' : 'live',
  }));
  const profiles = [
    { id: 'default', label: 'CEO 운영실', agent: 'ceo' as AgentId, provider: 'OpenAI', status: 'active' },
    { id: 'growth', label: '콘텐츠 성장팀', agent: 'youtube' as AgentId, provider: 'LM Studio', status: 'running' },
    { id: 'build', label: '개발 자동화팀', agent: 'developer' as AgentId, provider: 'OpenRouter', status: 'running' },
    { id: 'telegram', label: '보고/승인팀', agent: 'secretary' as AgentId, provider: 'Ollama', status: approvalCount ? 'approval' : 'standby' },
  ];

  return (
    <section className="hermes-desktop-panel glass">
      <div className="section-title">
        <Workflow size={18} />
        <span>Hermes Desktop 운영 레이어</span>
      </div>
      <div className="hermes-ops-strip">
        <span><Cpu size={14} /> Local API 127.0.0.1:8642</span>
        <span><Brain size={14} /> Memory {memoryPressure}%</span>
        <span><Layers3 size={14} /> Skills {totalSkills}개</span>
        <span><Send size={14} /> Gateways {hermesGateways.length}/16 표시</span>
      </div>

      <div className="hermes-ops-grid">
        <div className="hermes-profile-stack">
          <strong><Settings2 size={14} /> Profiles</strong>
          {profiles.map((profile) => {
            const agent = AGENTS[profile.agent];
            const skills = skillSettings[profile.agent] || agent.suggestedSkills;
            return (
              <button type="button" className={activeAgent === profile.agent ? 'active' : ''} key={profile.id} onClick={() => selectAgent(profile.agent)}>
                <span>{agent.emoji}</span>
                <b>{profile.label}</b>
                <small>{profile.provider} · {modelLabel(agent.defaultModel)} · {skills.length} skills</small>
                <em>{profile.status}</em>
              </button>
            );
          })}
        </div>

        <div className="learning-loop">
          <strong><Brain size={14} /> Closed Learning Loop</strong>
          {learningRows.map((row) => (
            <div className={`loop-row ${row.state}`} key={row.label}>
              <span>{row.label}</span>
              <i><b style={{ width: `${row.value}%` }} /></i>
              <em>{row.value}%</em>
            </div>
          ))}
          <p>{activeTask ? `${AGENTS[activeTask.agent].name} 작업 결과가 MEMORY.md와 새 스킬 후보로 들어가는 흐름입니다.` : 'CEO 지시가 장기 기억과 스킬 후보로 정리됩니다.'}</p>
        </div>

        <div className="gateway-schedule">
          <strong><Radio size={14} /> Gateways & Schedules</strong>
          <div className="gateway-grid">
            {hermesGateways.map((gateway, idx) => (
              <span className={gateway === 'Telegram' && approvalCount ? 'waiting' : 'live'} key={gateway}>
                {gateway}<em>{idx === 0 ? `${approvalCount} approval` : 'armed'}</em>
              </span>
            ))}
          </div>
          <div className="cron-queue">
            <span><Clock size={13} /> 매일 09:00 보고서</span>
            <span><Clock size={13} /> 2시간마다 유튜브 분석</span>
            <span><Clock size={13} /> 승인 후 Telegram 전송</span>
          </div>
        </div>
      </div>

      <div className="slash-rail">
        {hermesSlashCommands.map((command) => <code key={command}>{command}</code>)}
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
            <span className="task-skills"><Zap size={13} /> {task.skills.slice(0, 4).join(' · ')}</span>
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
  skillSettings,
  selectAgent,
  onModelChange,
  onRecommendSkills,
}: {
  activeAgent: AgentId;
  modelSettings: ModelSettings;
  skillSettings: SkillSettings;
  selectAgent: (id: AgentId) => void;
  onModelChange: (id: AgentId, model: string) => void;
  onRecommendSkills: (id: AgentId) => void;
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
              <select
                id={`routing-model-${id}`}
                name={`routing-model-${id}`}
                value={modelSettings[id]}
                onChange={(event) => onModelChange(id, event.target.value)}
              >
                {modelOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <small>{(skillSettings[id] || agent.suggestedSkills).slice(0, 4).join(' · ')}</small>
              <button type="button" className="route-skill-btn" onClick={() => onRecommendSkills(id)}><Wand2 size={13} /> 추천</button>
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
      <div className="section-title"><Smartphone size={18} /><span>반영 기준 영상/문서</span></div>
      {videos.map((video) => (
        <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
          <span>{video.tag}</span>
          <strong>{video.title}</strong>
        </a>
      ))}
      {referenceLinks.map((link) => (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
          <span>{link.tag}</span>
          <strong>{link.title}</strong>
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
  const [skillSettings, setSkillSettings] = useState<SkillSettings>(() => buildDefaultSkillSettings());
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, ApprovalStatus>>({});
  const plan = useMemo(() => makePlan(prompt, seed, modelSettings, skillSettings), [modelSettings, prompt, seed, skillSettings]);
  const selected = AGENTS[activeAgent];
  const selectedSkills = skillSettings[activeAgent] || selected.suggestedSkills;

  const updateModel = (id: AgentId, model: string) => {
    setModelSettings((prev) => ({ ...prev, [id]: model }));
  };

  const updateSkills = (id: AgentId, skills: string[]) => {
    setSkillSettings((prev) => ({ ...prev, [id]: normalizeSkillList(skills) }));
  };

  const applyRecommendedSkills = (id: AgentId) => {
    setSkillSettings((prev) => {
      const base = prev[id] || AGENTS[id].suggestedSkills;
      const recommended = recommendSkillsForAgent(id, prompt, 6).map((skill) => skill.id);
      return { ...prev, [id]: normalizeSkillList([...base, ...recommended]) };
    });
  };

  const applyRecommendedToAll = () => {
    setSkillSettings((prev) => {
      const next: SkillSettings = { ...prev };
      AGENT_ORDER.forEach((id) => {
        const base = next[id] || AGENTS[id].suggestedSkills;
        const recommended = recommendSkillsForAgent(id, prompt, 5).map((skill) => skill.id);
        next[id] = normalizeSkillList([...base, ...recommended]);
      });
      return next;
    });
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
          <CommandCenter prompt={prompt} plan={plan} setPrompt={setPrompt} runPlan={runPlan} applyRecommendedToAll={applyRecommendedToAll} />
          <HermesDesktopOpsPanel plan={plan} skillSettings={skillSettings} activeAgent={activeAgent} selectAgent={setActiveAgent} />
          <TaskBoard plan={plan} selectAgent={setActiveAgent} />
        </div>
        <div className="right-col">
          <ProfilePanel
            agent={selected}
            model={modelSettings[activeAgent]}
            onModelChange={updateModel}
            prompt={prompt}
            skills={selectedSkills}
            onSkillsChange={updateSkills}
            onRecommendSkills={applyRecommendedSkills}
          />
          <ModelRoutingPanel
            activeAgent={activeAgent}
            modelSettings={modelSettings}
            skillSettings={skillSettings}
            selectAgent={setActiveAgent}
            onModelChange={updateModel}
            onRecommendSkills={applyRecommendedSkills}
          />
          <ApprovalPanel approvals={plan.approvals} decisions={approvalDecisions} respondApproval={(id, status) => setApprovalDecisions((prev) => ({ ...prev, [id]: status }))} />
          <BrainPanel plan={plan} />
          <VideoPanel />
          <Reports plan={plan} />
        </div>
      </main>
    </div>
  );
}
