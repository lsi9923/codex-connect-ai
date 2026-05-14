import { AGENTS, AgentId, SPECIALIST_IDS } from './agents';
import type { SkillSettings } from './skillCatalog';

export type TaskStatus = 'queued' | 'running' | 'done' | 'approval';
export type ReportKind = 'dispatch' | 'progress' | 'telegram' | 'approval' | 'artifact';
export type ApprovalStatus = '승인 대기' | '1회 승인됨' | '이번 세션 승인' | '거절됨';

export interface AgentTask {
  id: string;
  agent: AgentId;
  title: string;
  brief: string;
  status: TaskStatus;
  progress: number;
  model: string;
  skills: string[];
  output: string;
  artifact: string;
  approvalRequired: boolean;
  priority: 'P0' | 'P1' | 'P2';
}

export interface ReportLine {
  agent: AgentId;
  text: string;
  time: string;
  kind: ReportKind;
}

export interface ApprovalItem {
  id: string;
  agent: AgentId;
  title: string;
  risk: string;
  command: string;
  status: ApprovalStatus;
}

export interface PipelineStep {
  label: string;
  value: number;
  state: 'done' | 'running' | 'waiting';
}

export interface OfficePlan {
  runId: number;
  brief: string;
  headline: string;
  tasks: AgentTask[];
  reports: ReportLine[];
  approvals: ApprovalItem[];
  pipeline: PipelineStep[];
  activeAgents: AgentId[];
  telegramDigest: string;
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

export type ModelSettings = Record<AgentId, string>;

const defaultPrompt = '이번 달 월수익 1천만 원을 목표로 유튜브 콘텐츠, 수익성 웹사이트, Telegram 보고 자동화를 같이 운영해줘.';

export const modelOptions: ModelOption[] = [
  { id: 'openai/gpt-5.4', label: 'GPT-5.4', provider: 'OpenAI' },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', provider: 'Anthropic' },
  { id: 'openrouter/qwen3-max', label: 'Qwen3 Max', provider: 'OpenRouter' },
  { id: 'openrouter/kimi-k2', label: 'Kimi K2', provider: 'OpenRouter' },
  { id: 'openrouter/deepseek-v3.2', label: 'DeepSeek V3.2', provider: 'OpenRouter' },
  { id: 'lmstudio/qwen2.5-coder-14b', label: 'Qwen Coder 14B', provider: 'LM Studio' },
  { id: 'lmstudio/gemma-3-12b', label: 'Gemma 3 12B', provider: 'LM Studio' },
  { id: 'ollama/gemma3:latest', label: 'Gemma 3', provider: 'Ollama' },
];

export const defaultModelSettings: ModelSettings = Object.fromEntries(
  Object.entries(AGENTS).map(([id, agent]) => [id, agent.defaultModel]),
) as ModelSettings;

const taskTemplates: Record<AgentId, { title: string; brief: string; output: string; artifact: string; priority: AgentTask['priority'] }> = {
  ceo: { title: '', brief: '', output: '', artifact: '', priority: 'P0' },
  youtube: {
    title: 'YouTube 채널 성장 분석',
    brief: '영상 3개 강의의 메시지를 바탕으로 제목, 후크, 시청자 유지율 전략을 정리합니다.',
    output: '다음 영상 5개 제목과 썸네일 문구를 정리했습니다.',
    artifact: 'handoff/outputs/youtube-growth-brief.md',
    priority: 'P0',
  },
  instagram: {
    title: '숏폼/릴스 확장',
    brief: '유튜브 강의 핵심을 릴스, 피드, 스토리 포맷으로 재가공합니다.',
    output: '릴스 7개 캡션과 해시태그 묶음을 만들었습니다.',
    artifact: 'handoff/outputs/instagram-reels-pack.md',
    priority: 'P1',
  },
  designer: {
    title: '썸네일·브랜드 무드',
    brief: 'AI 1인 기업, 무료 로컬 AI, 직원 10명 콘셉트를 시각 시스템으로 잡습니다.',
    output: '썸네일 3안과 사무실 UI 무드보드를 생성했습니다.',
    artifact: 'handoff/outputs/thumbnail-style-board.md',
    priority: 'P1',
  },
  developer: {
    title: '웹앱/자동화 구현',
    brief: 'Connect AI 원본 UX를 웹으로 옮기고 Hermes 승인 게이트를 화면에 연결합니다.',
    output: '상태 머신, 모델 선택, 승인 대기 UI를 구현했습니다.',
    artifact: 'handoff/outputs/dev-implementation-notes.md',
    priority: 'P0',
  },
  business: {
    title: '수익화 경로 설계',
    brief: '월수익 목표를 상품, 콘텐츠, 서비스, 자동화로 쪼개 KPI를 만듭니다.',
    output: '월 1천만 원 목표를 4개 매출원과 주간 KPI로 나눴습니다.',
    artifact: 'handoff/outputs/revenue-kpi-map.md',
    priority: 'P1',
  },
  secretary: {
    title: 'Telegram 보고서 초안',
    brief: '대표가 밖에서도 볼 수 있게 오늘 실행 결과를 짧은 보고서로 정리합니다.',
    output: 'Telegram 전송 전 승인용 요약 메시지를 준비했습니다.',
    artifact: 'handoff/outputs/telegram-daily-brief.md',
    priority: 'P0',
  },
  editor: {
    title: '영상 사운드/BGM 방향',
    brief: '강의형 콘텐츠에 맞는 BGM, 인트로, 전환음, 자막 리듬을 제안합니다.',
    output: '인트로 5초, 본문 루프, CTA 사운드 큐를 정했습니다.',
    artifact: 'handoff/outputs/bgm-direction.md',
    priority: 'P2',
  },
  writer: {
    title: '카피/스크립트 작성',
    brief: '랜딩페이지 카피, 유튜브 스크립트 후크, 공지 문구를 만듭니다.',
    output: '첫 15초 후크와 랜딩 문구 4블록을 작성했습니다.',
    artifact: 'handoff/outputs/copy-script-pack.md',
    priority: 'P1',
  },
  researcher: {
    title: '시장·경쟁 리서치',
    brief: '로컬 AI 에이전트, 1인 기업 자동화, 무료 오픈소스 도구 포지션을 정리합니다.',
    output: 'Connect AI, Hermes Agent, Hermes for Web 비교 포인트를 묶었습니다.',
    artifact: 'handoff/outputs/research-source-map.md',
    priority: 'P1',
  },
};

const runStatuses: TaskStatus[][] = [
  ['running', 'queued', 'queued', 'running', 'queued', 'approval', 'queued', 'queued', 'running'],
  ['done', 'running', 'running', 'approval', 'queued', 'approval', 'queued', 'running', 'done'],
  ['done', 'done', 'running', 'running', 'running', 'approval', 'running', 'running', 'done'],
  ['done', 'done', 'done', 'done', 'done', 'approval', 'running', 'done', 'done'],
];

const statusText: Record<TaskStatus, string> = {
  queued: '대기',
  running: '작업 중',
  done: '완료',
  approval: '승인 대기',
};

function getKeyword(prompt: string) {
  const cleaned = prompt.replace(/#[0-9]+/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}...` : cleaned || defaultPrompt;
}

function progressFor(status: TaskStatus, index: number, runId: number) {
  if (status === 'done') return 100;
  if (status === 'approval') return 82 + ((runId + index) % 10);
  if (status === 'running') return 38 + ((runId * 13 + index * 9) % 42);
  return 8 + ((runId + index * 4) % 18);
}

function makeTime(index: number, runId: number) {
  return `T+${String(runId * 3 + index + 1).padStart(2, '0')}m`;
}

export function makePlan(
  prompt = defaultPrompt,
  runId = 0,
  modelSettings: ModelSettings = defaultModelSettings,
  skillSettings: SkillSettings = {},
): OfficePlan {
  const keyword = getKeyword(prompt);
  const statusSet = runStatuses[runId % runStatuses.length];
  const tasks = SPECIALIST_IDS.map((agent, index) => {
    const template = taskTemplates[agent];
    const status = statusSet[index];
    return {
      ...template,
      id: `${agent}-${runId}`,
      agent,
      status,
      progress: progressFor(status, index, runId),
      model: modelSettings[agent] || AGENTS[agent].defaultModel,
      skills: skillSettings[agent]?.length ? skillSettings[agent] : AGENTS[agent].suggestedSkills,
      approvalRequired: status === 'approval' || agent === 'secretary',
      brief: `${template.brief} 입력 목표: ${keyword}`,
    };
  });

  const runningCount = tasks.filter((task) => task.status === 'running').length;
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const approvalCount = tasks.filter((task) => task.status === 'approval').length;
  const avgProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
  const secretaryTask = tasks.find((task) => task.agent === 'secretary')!;

  const approvals: ApprovalItem[] = [
    {
      id: `telegram-${runId}`,
      agent: 'secretary',
      title: 'Telegram 실제 전송',
      risk: '대표 휴대폰으로 나가기 전 최종 확인이 필요합니다.',
      command: `/telegram send "${secretaryTask.output}"`,
      status: '승인 대기',
    },
    {
      id: `github-${runId}`,
      agent: 'developer',
      title: 'GitHub push',
      risk: '코드 변경을 외부 저장소에 올리기 전 확인합니다.',
      command: 'git push origin main',
      status: approvalCount > 0 ? '승인 대기' : '이번 세션 승인',
    },
    {
      id: `brain-${runId}`,
      agent: 'ceo',
      title: 'Second Brain 쓰기',
      risk: '실제 vault 대신 sandbox-brain에 먼저 기록합니다.',
      command: 'write handoff/outputs/*.md',
      status: '승인 대기',
    },
  ];

  const reports: ReportLine[] = [
    {
      agent: 'ceo',
      kind: 'dispatch',
      time: makeTime(0, runId),
      text: `CEO: "${keyword}" 목표를 9명 직원에게 분해했습니다. 실행 ${runningCount}건, 완료 ${doneCount}건, 승인 대기 ${approvalCount}건입니다.`,
    },
    ...tasks.map((task, index): ReportLine => ({
      agent: task.agent,
      kind: task.status === 'approval' ? 'approval' : task.status === 'done' ? 'artifact' : 'progress',
      time: makeTime(index + 1, runId),
      text: `${AGENTS[task.agent].emoji} ${AGENTS[task.agent].name}: ${task.title} ${statusText[task.status]} ${task.progress}% · ${task.skills.slice(0, 3).join(', ')} 사용 · ${task.output}`,
    })),
    {
      agent: 'secretary',
      kind: 'telegram',
      time: makeTime(tasks.length + 1, runId),
      text: `영숙: Telegram 보고는 아직 실제 전송 전입니다. 승인되면 "${secretaryTask.artifact}" 내용을 대표에게 보냅니다.`,
    },
  ];

  return {
    runId,
    headline: `${doneCount}/9 완료 · ${runningCount}명 작업 중 · ${approvalCount}건 승인 대기`,
    brief: `CEO가 목표를 받았습니다: "${keyword}" · 모델 선택과 스킬 묶음을 직원별로 붙여 작업을 배정했습니다.`,
    tasks,
    reports,
    approvals,
    activeAgents: tasks.filter((task) => task.status !== 'queued').map((task) => task.agent),
    telegramDigest: `사장님, 오늘은 ${tasks[0].title}, ${tasks[3].title}, ${secretaryTask.title}가 핵심입니다. 평균 진행률 ${avgProgress}%이고 Telegram 전송은 승인 대기입니다.`,
    pipeline: [
      { label: 'CEO 입력', value: 100, state: 'done' },
      { label: '업무 분해', value: 100, state: 'done' },
      { label: '직원 실행', value: avgProgress, state: runningCount > 0 ? 'running' : 'done' },
      { label: '보고 정리', value: Math.min(92, avgProgress + 12), state: 'running' },
      { label: 'Telegram 승인', value: approvalCount > 0 ? 62 : 100, state: approvalCount > 0 ? 'waiting' : 'done' },
    ],
  };
}

export const brainFolders = ['00_Raw', '10_Wiki', '20_Meta', '90_Skills', 'Decisions', '_company/_agents', 'handoff/outputs'];

export const approvalItems = [
  { title: 'Telegram 실제 전송', risk: '대표 휴대폰으로 나가기 전 확인', status: '승인 대기' },
  { title: 'Second Brain 쓰기', risk: '실제 vault 대신 sandbox-brain 먼저 사용', status: '승인 대기' },
  { title: 'GitHub push', risk: '외부 저장소 반영 전 확인', status: '승인 대기' },
  { title: '파일 삭제/터미널 명령', risk: '위험 명령은 Hermes 승인 게이트 통과', status: '잠금' },
];
