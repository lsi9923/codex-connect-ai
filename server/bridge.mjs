import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const HOST = '127.0.0.1';
const PORT = Number(process.env.CONNECT_AI_BRIDGE_PORT || 5198);
const BRIDGE_FILE = fileURLToPath(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(BRIDGE_FILE), '..');
const HERMES_ROOT = path.join(os.homedir(), '.hermes');
const CODEX_ROOT = path.join(os.homedir(), '.codex');
const ENV_FILE = path.join(HERMES_ROOT, '.env');
const RUNTIME_ROOT = path.join(HERMES_ROOT, 'connect-ai-office-runtime');
const OUTPUT_ROOT = path.join(RUNTIME_ROOT, 'outputs');
const MEMORY_PROPOSAL_ROOT = path.join(RUNTIME_ROOT, 'memory-proposals');
const SKILL_PROPOSAL_ROOT = path.join(RUNTIME_ROOT, 'skill-proposals');
const STATE_FILE = path.join(RUNTIME_ROOT, 'state.json');

const SPECIALIST_IDS = ['youtube', 'instagram', 'designer', 'developer', 'business', 'secretary', 'editor', 'writer', 'researcher'];

const TASK_TEMPLATES = {
  youtube: {
    title: 'YouTube 채널 성장 분석',
    brief: '영상 메시지, 제목, 후크, 유지율 전략을 실제 모델 호출로 정리합니다.',
    priority: 'P0',
  },
  instagram: {
    title: '숏폼/릴스 확장',
    brief: '유튜브 핵심 내용을 릴스, 피드, 스토리 포맷으로 실제 재가공합니다.',
    priority: 'P1',
  },
  designer: {
    title: '썸네일·브랜드 무드',
    brief: '썸네일 방향과 브랜드 무드보드를 실제 모델 응답으로 정리합니다.',
    priority: 'P1',
  },
  developer: {
    title: '웹앱/자동화 구현',
    brief: 'Connect AI 운영 화면과 승인 게이트의 실제 구현 메모를 작성합니다.',
    priority: 'P0',
  },
  business: {
    title: '수익화 경로 설계',
    brief: '실제 입력 목표를 기준으로 수익 모델과 KPI 후보를 계산이 아닌 보고서로 정리합니다.',
    priority: 'P1',
  },
  secretary: {
    title: 'Telegram 보고서 초안',
    brief: '대표 승인 전송용 Telegram 보고서를 실제 모델 응답으로 작성합니다.',
    priority: 'P0',
  },
  editor: {
    title: '영상 사운드/BGM 방향',
    brief: '콘텐츠에 맞는 BGM, 전환음, 자막 리듬 제안을 실제 모델 응답으로 작성합니다.',
    priority: 'P2',
  },
  writer: {
    title: '카피/스크립트 작성',
    brief: '랜딩페이지 카피와 영상 스크립트 후크를 실제 모델 응답으로 작성합니다.',
    priority: 'P1',
  },
  researcher: {
    title: '시장·경쟁 리서치',
    brief: '로컬 AI, 1인 기업 자동화, 오픈소스 도구 포지션을 실제 모델 응답으로 정리합니다.',
    priority: 'P1',
  },
};

const DEFAULT_SKILLS = {
  youtube: ['youtube-research', 'trend-scan', 'title-hook'],
  instagram: ['short-form', 'hashtag-map', 'caption-lab'],
  designer: ['thumbnail-brief', 'brand-system', 'visual-review', 'pixel-agent-office-simulator'],
  developer: ['code-edit', 'browser-test', 'deployment', 'pixel-agent-office-simulator'],
  business: ['pricing', 'market-map', 'unit-economics'],
  secretary: ['telegram-briefing', 'schedule', 'approval-routing', 'pixel-agent-office-simulator'],
  editor: ['bgm-plan', 'caption-rhythm', 'audio-notes'],
  writer: ['copywriting', 'script-hook', 'landing-copy'],
  researcher: ['web-research', 'fact-check', 'source-map'],
};

const DEFAULT_MODELS = {
  youtube: 'lmstudio/qwen2.5-coder-14b',
  instagram: 'openrouter/qwen3-max',
  designer: 'anthropic/claude-sonnet-4.6',
  developer: 'openai/gpt-5.4',
  business: 'openrouter/kimi-k2',
  secretary: 'lmstudio/gemma-3-12b',
  editor: 'ollama/gemma3:latest',
  writer: 'anthropic/claude-sonnet-4.6',
  researcher: 'openrouter/deepseek-v3.2',
};

const AGENT_NAMES = {
  youtube: '레오',
  instagram: 'Instagram',
  designer: 'Designer',
  developer: '코다리',
  business: '현빈',
  secretary: '영숙',
  editor: '루나',
  writer: 'Writer',
  researcher: 'Researcher',
};

function ensureRuntime() {
  fs.mkdirSync(RUNTIME_ROOT, { recursive: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  fs.mkdirSync(MEMORY_PROPOSAL_ROOT, { recursive: true });
  fs.mkdirSync(SKILL_PROPOSAL_ROOT, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    writeState({ runSeq: 0, currentRunId: null, runs: [] });
  }
}

function readState() {
  ensureRuntime();
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { runSeq: 0, currentRunId: null, runs: [] };
  }
}

function writeState(state) {
  fs.mkdirSync(RUNTIME_ROOT, { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function readEnvFile(file = ENV_FILE) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    env[match[1]] = value;
  }
  return env;
}

function publicEnvFlags(env) {
  return Object.fromEntries(Object.keys(env).sort().map((key) => [key, Boolean(env[key])]));
}

async function fetchJson(url, options = {}, timeoutMs = 1800) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text.slice(0, 500) };
    }
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson(url, body, headers = {}, timeoutMs = 60000) {
  return fetchJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }, timeoutMs);
}

async function detectModels(env = readEnvFile()) {
  const providers = [];
  const options = [];

  try {
    const payload = await fetchJson('http://127.0.0.1:1234/v1/models', {}, 1800);
    const models = Array.isArray(payload?.data) ? payload.data.map((model) => model.id).filter(Boolean) : [];
    providers.push({ id: 'lmstudio', label: 'LM Studio', endpoint: '127.0.0.1:1234/v1/models', status: 'connected', models });
    for (const model of models) options.push({ id: `lmstudio/${model}`, label: model, provider: 'LM Studio', available: true });
  } catch (error) {
    providers.push({ id: 'lmstudio', label: 'LM Studio', endpoint: '127.0.0.1:1234/v1/models', status: 'disconnected', message: error.message, models: [] });
  }

  try {
    const payload = await fetchJson('http://127.0.0.1:11434/api/tags', {}, 1800);
    const models = Array.isArray(payload?.models) ? payload.models.map((model) => model.name).filter(Boolean) : [];
    providers.push({ id: 'ollama', label: 'Ollama', endpoint: '127.0.0.1:11434/api/tags', status: 'connected', models });
    for (const model of models) options.push({ id: `ollama/${model}`, label: model, provider: 'Ollama', available: true });
  } catch (error) {
    providers.push({ id: 'ollama', label: 'Ollama', endpoint: '127.0.0.1:11434/api/tags', status: 'disconnected', message: error.message, models: [] });
  }

  providers.push({
    id: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    status: env.OPENROUTER_API_KEY ? 'configured' : 'missing',
    models: [],
  });
  providers.push({
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    status: env.OPENAI_API_KEY ? 'configured' : 'missing',
    models: [],
  });

  return { providers, options };
}

async function detectLocalApis() {
  const probes = [
    ['connectAi4825', 'http://127.0.0.1:4825/health'],
    ['legacy8642', 'http://127.0.0.1:8642/health'],
  ];
  const result = {};
  for (const [id, url] of probes) {
    try {
      await fetchJson(url, {}, 900);
      result[id] = { status: 'connected', endpoint: url };
    } catch (error) {
      result[id] = { status: 'disconnected', endpoint: url, message: error.message };
    }
  }
  return result;
}

async function getTelegramStatus(env = readEnvFile()) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const target = env.TELEGRAM_HOME_CHANNEL || (env.TELEGRAM_ALLOWED_USERS || '').split(',').map((item) => item.trim()).filter(Boolean)[0] || '';
  const base = {
    configured: Boolean(token),
    connected: false,
    canSend: Boolean(token && target),
    botName: '미연결',
    botUsername: 'not-connected',
    targetType: target ? 'configured' : 'missing',
    targetName: target ? maskTarget(target) : 'TELEGRAM_HOME_CHANNEL 또는 TELEGRAM_ALLOWED_USERS 필요',
    targetUsername: null,
    source: ENV_FILE,
    status: token ? 'checking' : 'missing',
  };
  if (!token) return base;
  try {
    const payload = await fetchJson(`https://api.telegram.org/bot${token}/getMe`, {}, 5000);
    const user = payload?.result || {};
    return {
      ...base,
      connected: Boolean(payload?.ok),
      botName: user.first_name || user.username || 'Telegram Bot',
      botUsername: user.username || 'unknown',
      status: payload?.ok ? 'connected' : 'error',
    };
  } catch (error) {
    return { ...base, status: 'error', message: error.message };
  }
}

function maskTarget(value) {
  if (!value) return '';
  if (value.startsWith('@')) return value;
  if (value.length <= 5) return value;
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

async function sendTelegramMessage(text, env = readEnvFile()) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_HOME_CHANNEL || (env.TELEGRAM_ALLOWED_USERS || '').split(',').map((item) => item.trim()).filter(Boolean)[0];
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');
  if (!chatId) throw new Error('TELEGRAM_HOME_CHANNEL or TELEGRAM_ALLOWED_USERS missing');
  const payload = await postJson(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  }, {}, 10000);
  return {
    ok: Boolean(payload?.ok),
    messageId: payload?.result?.message_id ?? null,
    date: payload?.result?.date ?? null,
    chat: payload?.result?.chat?.title || payload?.result?.chat?.username || maskTarget(String(chatId)),
  };
}

function getRevenueStatus(env = readEnvFile()) {
  const paypalReady = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
  const youtubeReady = Boolean((env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.YOUTUBE_REFRESH_TOKEN) || env.YOUTUBE_OAUTH_TOKEN);
  const connectors = [
    {
      id: 'paypal',
      label: 'PayPal',
      status: paypalReady ? 'configured' : 'missing',
      amount: 0,
      currency: 'KRW',
      source: paypalReady ? 'PayPal API credentials configured; fetch not run in browser render' : 'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET 없음',
      detail: paypalReady ? '실제 결제 집계는 서버 커넥터에서만 실행합니다.' : '키가 없으므로 0원으로 표시합니다.',
    },
    {
      id: 'youtube',
      label: 'YouTube Analytics',
      status: youtubeReady ? 'configured' : 'missing',
      amount: 0,
      currency: 'KRW',
      source: youtubeReady ? 'YouTube OAuth configured; analytics fetch ready' : 'YouTube OAuth 토큰 없음',
      detail: youtubeReady ? '실제 Analytics 권한으로 조회해야 금액을 표시합니다.' : '토큰이 없으므로 0원으로 표시합니다.',
    },
  ];
  return {
    total: connectors.reduce((sum, item) => sum + (item.status === 'connected' ? item.amount : 0), 0),
    currency: 'KRW',
    connectedCount: connectors.filter((item) => item.status === 'connected').length,
    configuredCount: connectors.filter((item) => item.status === 'configured').length,
    connectors,
    note: '실제 API에서 확인된 금액만 합산합니다. 키가 없거나 권한이 없으면 0원입니다.',
  };
}

function getMemoryStatus() {
  const hermesMemory = path.join(HERMES_ROOT, 'memories', 'MEMORY.md');
  const hermesSkills = path.join(HERMES_ROOT, 'skills');
  const codexSkills = path.join(CODEX_ROOT, 'skills');
  const stats = fs.existsSync(hermesMemory) ? fs.statSync(hermesMemory) : null;
  const memoryProposalCount = countJsonEntries(MEMORY_PROPOSAL_ROOT);
  const skillProposalCount = countJsonEntries(SKILL_PROPOSAL_ROOT);
  return {
    status: stats ? 'connected' : 'missing',
    path: hermesMemory,
    bytes: stats?.size || 0,
    updatedAt: stats?.mtime?.toISOString() || null,
    hermesSkillCount: countSkillEntries(hermesSkills),
    codexSkillCount: countSkillEntries(codexSkills),
    appliedSkill: fs.existsSync(path.join(APP_ROOT, 'skills', 'pixel-agent-office-simulator.skill')),
    proposalDir: MEMORY_PROPOSAL_ROOT,
    memoryProposalCount,
    skillProposalDir: SKILL_PROPOSAL_ROOT,
    skillProposalCount,
  };
}

function countSkillEntries(dir) {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() || entry.name.endsWith('.skill')).length;
  } catch {
    return 0;
  }
}

function countJsonEntries(dir) {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

function execGit(args, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd: APP_ROOT, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      resolve({ ok: false, stdout, stderr: `${stderr}\ntimeout`.trim() });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim(), code });
    });
  });
}

async function getGitStatus() {
  const status = await execGit(['status', '--short', '--branch']);
  const remote = await execGit(['remote', '-v']);
  const lines = status.stdout ? status.stdout.split(/\r?\n/) : [];
  const branch = lines[0] || 'unknown';
  const dirtyCount = lines.slice(1).filter(Boolean).length;
  return {
    status: status.ok ? 'connected' : 'error',
    branch,
    dirtyCount,
    remote: remote.stdout.split(/\r?\n/)[0] || '',
    message: status.stderr || '',
  };
}

async function runtimeStatus() {
  const env = readEnvFile();
  const [models, telegram, localApis, git] = await Promise.all([
    detectModels(env),
    getTelegramStatus(env),
    detectLocalApis(),
    getGitStatus(),
  ]);
  const memory = getMemoryStatus();
  const revenue = getRevenueStatus(env);
  const skillsTotal = memory.hermesSkillCount + memory.codexSkillCount + (memory.appliedSkill ? 1 : 0);
  const lmStudio = models.providers.find((provider) => provider.id === 'lmstudio');
  const gateways = [
    { name: 'Telegram', status: telegram.connected ? 'connected' : telegram.configured ? 'error' : 'missing', detail: telegram.connected ? `@${telegram.botUsername}` : telegram.targetName },
    { name: 'GitHub', status: env.GITHUB_TOKEN ? 'configured' : 'missing', detail: git.branch },
    { name: 'OpenRouter', status: env.OPENROUTER_API_KEY ? 'configured' : 'missing', detail: 'OPENROUTER_API_KEY' },
    { name: 'LM Studio', status: lmStudio?.status || 'missing', detail: lmStudio?.endpoint || '127.0.0.1:1234' },
    { name: 'PayPal', status: revenue.connectors[0].status, detail: revenue.connectors[0].source },
    { name: 'YouTube Analytics', status: revenue.connectors[1].status, detail: revenue.connectors[1].source },
  ];
  return {
    bridge: { status: 'connected', host: HOST, port: PORT, runtimeDir: RUNTIME_ROOT, updatedAt: new Date().toISOString() },
    env: publicEnvFlags(env),
    localApis,
    models,
    telegram,
    revenue,
    memory,
    skills: {
      total: skillsTotal,
      hermes: memory.hermesSkillCount,
      codex: memory.codexSkillCount,
      appliedPixelSkill: memory.appliedSkill,
    },
    gateways,
    git,
  };
}

function getCurrentRun() {
  const state = readState();
  return state.runs.find((run) => run.id === state.currentRunId) || state.runs.at(-1) || null;
}

function saveRun(run) {
  const state = readState();
  const idx = state.runs.findIndex((item) => item.id === run.id);
  if (idx >= 0) state.runs[idx] = run;
  else state.runs.push(run);
  state.currentRunId = run.id;
  state.runSeq = Math.max(state.runSeq || 0, run.runNumber || 0);
  state.runs = state.runs.slice(-20);
  writeState(state);
}

function officePlanFromRun(run) {
  if (!run) return null;
  const tasks = run.tasks || [];
  const runningCount = tasks.filter((task) => task.status === 'running').length;
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const failedCount = tasks.filter((task) => task.status === 'failed').length;
  const approvalCount = tasks.filter((task) => task.status === 'approval').length;
  const avgProgress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length) : 0;
  return {
    runId: run.runNumber,
    bridgeRunId: run.id,
    brief: `CEO가 실제 브릿지에 목표를 보냈습니다: "${shortText(run.prompt, 72)}" · 결과는 ${run.outputDir}`,
    headline: `${doneCount}/9 완료 · ${runningCount}명 실행 중 · ${approvalCount}건 승인 대기 · ${failedCount}건 실패`,
    tasks,
    reports: run.reports || [],
    approvals: run.approvals || [],
    activeAgents: tasks.filter((task) => task.status !== 'queued').map((task) => task.agent),
    telegramDigest: run.telegramDigest || 'Telegram 보고서는 실제 승인 전송 전입니다.',
    pipeline: [
      { label: 'CEO 입력', value: 100, state: 'done' },
      { label: '업무 분해', value: 100, state: 'done' },
      { label: '직원 실행', value: avgProgress, state: runningCount > 0 ? 'running' : doneCount > 0 ? 'done' : 'waiting' },
      { label: '보고 정리', value: approvalCount > 0 || doneCount > 0 ? Math.max(avgProgress, 40) : 0, state: approvalCount > 0 ? 'waiting' : runningCount > 0 ? 'running' : 'waiting' },
      { label: 'Telegram 승인', value: approvalCount > 0 ? 70 : 0, state: approvalCount > 0 ? 'waiting' : 'waiting' },
    ],
  };
}

function shortText(text, length) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '입력 없음';
  return clean.length > length ? `${clean.slice(0, length)}...` : clean;
}

async function dispatchTasks(body) {
  ensureRuntime();
  const state = readState();
  const runNumber = Number(state.runSeq || 0) + 1;
  const id = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const prompt = String(body?.prompt || '').trim() || 'CEO 목표 입력 없음';
  const modelSettings = body?.modelSettings || {};
  const skillSettings = body?.skillSettings || {};
  const outputDir = path.join(OUTPUT_ROOT, id);
  fs.mkdirSync(outputDir, { recursive: true });
  const tasks = SPECIALIST_IDS.map((agent) => {
    const template = TASK_TEMPLATES[agent];
    return {
      id: `${agent}-${id}`,
      agent,
      title: template.title,
      brief: `${template.brief} 입력 목표: ${shortText(prompt, 90)}`,
      status: 'queued',
      progress: 0,
      model: modelSettings[agent] || DEFAULT_MODELS[agent],
      executionModel: null,
      skills: Array.isArray(skillSettings[agent]) && skillSettings[agent].length ? skillSettings[agent] : DEFAULT_SKILLS[agent],
      output: '실제 모델 실행 대기 중입니다.',
      artifact: path.join(outputDir, `${agent}.md`),
      approvalRequired: agent === 'secretary',
      priority: template.priority,
      updatedAt: new Date().toISOString(),
    };
  });
  const run = {
    id,
    runNumber,
    prompt,
    outputDir,
    tasks,
    approvals: [],
    reports: [{
      agent: 'ceo',
      kind: 'dispatch',
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      text: `CEO: 실제 브릿지 run ${runNumber} 생성. ${tasks.length}명에게 작업을 큐에 올렸습니다.`,
    }],
    telegramDigest: 'Secretary 작업 완료 후 실제 Telegram 승인 대기열에 올라갑니다.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveRun(run);
  processRun(id).catch((error) => {
    const latest = getRunById(id);
    if (!latest) return;
    latest.reports.push(reportLine('developer', 'progress', `브릿지 실행 오류: ${error.message}`));
    latest.updatedAt = new Date().toISOString();
    saveRun(latest);
  });
  return { run, plan: officePlanFromRun(run) };
}

function getRunById(id) {
  const state = readState();
  return state.runs.find((run) => run.id === id) || null;
}

function reportLine(agent, kind, text) {
  return {
    agent,
    kind,
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    text,
  };
}

function writeJsonArtifact(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeRuntimeProposals(run, task, state) {
  const base = `${run.id}-${task.agent}`;
  const createdAt = new Date().toISOString();
  const memoryProposal = path.join(MEMORY_PROPOSAL_ROOT, `${base}.json`);
  const skillProposal = path.join(SKILL_PROPOSAL_ROOT, `${base}.json`);
  writeJsonArtifact(memoryProposal, {
    status: 'candidate',
    approvalRequired: true,
    runId: run.id,
    agent: task.agent,
    title: task.title,
    taskStatus: task.status,
    artifact: task.artifact,
    summary: task.output,
    error: task.error || null,
    source: 'connect-ai-office-bridge',
    createdAt,
    note: state === 'failed'
      ? '실패 로그 보존 후보입니다. 장기 기억에 적용하려면 사람이 확인해야 합니다.'
      : '장기 기억 후보 파일입니다. 승인 전에는 MEMORY.md에 적용되지 않습니다.',
  });
  writeJsonArtifact(skillProposal, {
    status: 'candidate',
    approvalRequired: true,
    runId: run.id,
    agent: task.agent,
    title: `${task.skills[0] || task.agent}-improvement`,
    basedOnSkills: task.skills,
    taskStatus: task.status,
    artifact: task.artifact,
    source: 'connect-ai-office-bridge',
    createdAt,
    recommendation: state === 'failed'
      ? '실패 원인을 반영해 모델 라우팅/타임아웃/도구 전제조건을 보강하는 스킬 후보로 검토합니다.'
      : '완료 산출물을 기준으로 반복 가능한 작업 절차를 새 스킬 후보로 검토합니다.',
  });
  task.memoryProposal = memoryProposal;
  task.skillProposal = skillProposal;
}

async function processRun(runId) {
  for (const agent of SPECIALIST_IDS) {
    const run = getRunById(runId);
    if (!run) return;
    const task = run.tasks.find((item) => item.agent === agent);
    if (!task || task.status !== 'queued') continue;
    await processTask(runId, task.id);
  }
}

async function processTask(runId, taskId) {
  let run = getRunById(runId);
  if (!run) return;
  let task = run.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.status = 'running';
  task.progress = 25;
  task.output = '실제 모델 호출 중입니다.';
  task.updatedAt = new Date().toISOString();
  run.reports.push(reportLine(task.agent, 'progress', `${AGENT_NAMES[task.agent]}: ${task.title} 실제 실행 시작 · ${task.model}`));
  run.updatedAt = new Date().toISOString();
  saveRun(run);

  try {
    const execution = await runAgentModel(task, run.prompt);
    run = getRunById(runId);
    if (!run) return;
    task = run.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.executionModel = execution.model;
    task.output = execution.text;
    task.progress = task.agent === 'secretary' ? 92 : 100;
    task.status = task.agent === 'secretary' ? 'approval' : 'done';
    task.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(task.artifact), { recursive: true });
    fs.writeFileSync(task.artifact, artifactBody(task, run.prompt, execution), 'utf8');
    writeRuntimeProposals(run, task, 'completed');
    run.reports.push(reportLine(task.agent, task.status === 'approval' ? 'approval' : 'artifact', `${AGENT_NAMES[task.agent]}: 실제 산출물 저장 · ${task.artifact}`));
    if (task.agent === 'secretary') {
      const approvalId = `telegram-${run.id}`;
      if (!run.approvals.some((item) => item.id === approvalId)) {
        run.approvals.push({
          id: approvalId,
          agent: 'secretary',
          title: 'Telegram 실제 전송',
          risk: '승인하면 실제 Telegram API sendMessage가 호출됩니다.',
          command: `/api/tasks/${approvalId}/approve`,
          status: '승인 대기',
        });
      }
      run.telegramDigest = task.output;
    }
    run.updatedAt = new Date().toISOString();
    saveRun(run);
  } catch (error) {
    run = getRunById(runId);
    if (!run) return;
    task = run.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.status = 'failed';
    task.progress = 100;
    task.output = `실제 실행 실패: ${error.message}`;
    task.error = error.message;
    task.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(task.artifact), { recursive: true });
    fs.writeFileSync(task.artifact, failureArtifactBody(task, run.prompt, error), 'utf8');
    writeRuntimeProposals(run, task, 'failed');
    run.reports.push(reportLine(task.agent, 'progress', `${AGENT_NAMES[task.agent]}: 실제 실행 실패 · ${error.message}`));
    run.updatedAt = new Date().toISOString();
    saveRun(run);
  }
}

function artifactBody(task, prompt, execution) {
  return [
    `# ${task.title}`,
    '',
    `- Agent: ${task.agent}`,
    `- Selected model: ${task.model}`,
    `- Execution model: ${execution.model}`,
    `- Skills: ${task.skills.join(', ')}`,
    `- Created: ${new Date().toISOString()}`,
    '',
    '## CEO Prompt',
    prompt,
    '',
    '## Output',
    execution.text,
    '',
  ].join('\n');
}

function failureArtifactBody(task, prompt, error) {
  return [
    `# ${task.title}`,
    '',
    `- Agent: ${task.agent}`,
    `- Selected model: ${task.model}`,
    `- Status: failed`,
    `- Created: ${new Date().toISOString()}`,
    '',
    '## CEO Prompt',
    prompt,
    '',
    '## Error',
    error?.stack || error?.message || String(error),
    '',
    '## Note',
    '이 파일은 실패를 숨기지 않기 위한 실제 실행 로그입니다. 완료 산출물로 처리하지 않습니다.',
    '',
  ].join('\n');
}

async function runAgentModel(task, prompt) {
  const env = readEnvFile();
  const models = await detectModels(env);
  const preferred = String(task.model || '');
  if (preferred.startsWith('lmstudio/')) {
    return runLmStudio(task, prompt, pickLmStudioModel(preferred.replace(/^lmstudio\//, ''), models));
  }
  if (preferred.startsWith('openrouter/') && env.OPENROUTER_API_KEY) {
    return runOpenRouter(task, prompt, preferred.replace(/^openrouter\//, ''), env.OPENROUTER_API_KEY);
  }
  if (preferred.startsWith('openai/') && env.OPENAI_API_KEY) {
    return runOpenAI(task, prompt, preferred.replace(/^openai\//, ''), env.OPENAI_API_KEY);
  }
  const lmStudioModel = pickLmStudioModel('', models);
  if (lmStudioModel) {
    const output = await runLmStudio(task, prompt, lmStudioModel);
    output.text = `[선택 모델 ${preferred}은 현재 직접 연결되지 않아 LM Studio ${lmStudioModel}로 실제 실행했습니다.]\n\n${output.text}`;
    return output;
  }
  throw new Error(`실행 가능한 모델 공급자가 없습니다. 선택 모델: ${preferred}`);
}

function pickLmStudioModel(preferred, models) {
  const provider = models.providers.find((item) => item.id === 'lmstudio');
  const available = provider?.models || [];
  if (!available.length) return '';
  const exact = available.find((model) => model === preferred);
  if (exact) return exact;
  const loose = available.find((model) => preferred && model.toLowerCase().includes(preferred.toLowerCase().split('/').pop()));
  return loose || available[0];
}

function agentMessages(task, prompt) {
  return [
    {
      role: 'system',
      content: [
        '너는 Connect AI 오피스의 실제 직원 에이전트다.',
        '가짜 완료나 가짜 수익을 만들지 말고, 입력된 목표에 대해 지금 수행 가능한 산출물만 한국어로 작성한다.',
        '결과는 바로 저장될 업무 보고서이므로 짧은 제목, 실행 내용, 다음 확인 필요 항목을 포함한다.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `CEO 목표: ${prompt}`,
        `직원: ${AGENT_NAMES[task.agent]} (${task.agent})`,
        `업무: ${task.title}`,
        `브리프: ${task.brief}`,
        `스킬: ${task.skills.join(', ')}`,
        '실제 실행 결과를 8줄 이내로 보고해줘.',
      ].join('\n'),
    },
  ];
}

async function runLmStudio(task, prompt, model) {
  if (!model) throw new Error('LM Studio model missing');
  const payload = await postJson('http://127.0.0.1:1234/v1/chat/completions', {
    model,
    messages: agentMessages(task, prompt),
    temperature: 0.3,
    max_tokens: 700,
  }, {}, 60000);
  return { model: `lmstudio/${model}`, text: extractChatText(payload) };
}

async function runOpenRouter(task, prompt, model, token) {
  const payload = await postJson('https://openrouter.ai/api/v1/chat/completions', {
    model,
    messages: agentMessages(task, prompt),
    temperature: 0.3,
    max_tokens: 700,
  }, { authorization: `Bearer ${token}` }, 60000);
  return { model: `openrouter/${model}`, text: extractChatText(payload) };
}

async function runOpenAI(task, prompt, model, token) {
  const payload = await postJson('https://api.openai.com/v1/chat/completions', {
    model,
    messages: agentMessages(task, prompt),
    temperature: 0.3,
    max_tokens: 700,
  }, { authorization: `Bearer ${token}` }, 60000);
  return { model: `openai/${model}`, text: extractChatText(payload) };
}

function extractChatText(payload) {
  const text = payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text || '';
  if (!text.trim()) throw new Error('model returned empty content');
  return text.trim();
}

async function approveItem(approvalId) {
  const run = getCurrentRun();
  if (!run) throw new Error('No active run');
  const approval = run.approvals.find((item) => item.id === approvalId);
  if (!approval) throw new Error(`Approval not found: ${approvalId}`);
  if (approvalId.startsWith('telegram-')) {
    const secretary = run.tasks.find((task) => task.agent === 'secretary');
    const result = await sendTelegramMessage(secretary?.output || run.telegramDigest || 'Connect AI 보고서');
    approval.status = result.ok ? '전송됨' : '실패';
    approval.result = result;
    run.reports.push(reportLine('secretary', 'telegram', result.ok ? `Telegram 실제 전송 완료 · message_id ${result.messageId}` : 'Telegram 전송 실패'));
  } else {
    approval.status = '이번 세션 승인';
    run.reports.push(reportLine(approval.agent, 'approval', `${approval.title} 승인 기록 완료`));
  }
  run.updatedAt = new Date().toISOString();
  saveRun(run);
  return { run, plan: officePlanFromRun(run), approval };
}

async function route(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/health') return json(res, { ok: true, port: PORT });
  if (req.method === 'GET' && url.pathname === '/api/runtime/status') return json(res, await runtimeStatus());
  if (req.method === 'GET' && url.pathname === '/api/models') return json(res, await detectModels(readEnvFile()));
  if (req.method === 'GET' && url.pathname === '/api/telegram/status') return json(res, await getTelegramStatus(readEnvFile()));
  if (req.method === 'POST' && url.pathname === '/api/telegram/send') {
    const body = await readBody(req);
    return json(res, await sendTelegramMessage(String(body?.text || 'Connect AI 보고서')));
  }
  if (req.method === 'GET' && url.pathname === '/api/revenue/status') return json(res, getRevenueStatus(readEnvFile()));
  if (req.method === 'GET' && url.pathname === '/api/memory/status') return json(res, getMemoryStatus());
  if (req.method === 'GET' && url.pathname === '/api/skills') {
    const memory = getMemoryStatus();
    return json(res, { total: memory.hermesSkillCount + memory.codexSkillCount + (memory.appliedSkill ? 1 : 0), memory });
  }
  if (req.method === 'GET' && url.pathname === '/api/gateways') {
    const status = await runtimeStatus();
    return json(res, status.gateways);
  }
  if (req.method === 'GET' && url.pathname === '/api/connect-ai/config') {
    const env = readEnvFile();
    return json(res, {
      source: ENV_FILE,
      connectAiLab: {
        autoCycleEnabled: false,
        dailyBriefingTime: '09:00',
        secretaryBridgeMode: 'output_only',
        assetsPath: path.join(APP_ROOT, 'public', 'connect-ai'),
      },
      env: publicEnvFlags(env),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/tasks') {
    const run = getCurrentRun();
    return json(res, { run, plan: officePlanFromRun(run) });
  }
  if (req.method === 'POST' && url.pathname === '/api/tasks/dispatch') {
    const body = await readBody(req);
    return json(res, await dispatchTasks(body));
  }
  const approveMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/approve$/);
  if (req.method === 'POST' && approveMatch) return json(res, await approveItem(decodeURIComponent(approveMatch[1])));
  return notFound(res);
}

function json(res, payload, status = 200) {
  const body = `${JSON.stringify(payload)}\n`;
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function notFound(res) {
  json(res, { error: 'not found' }, 404);
}

function errorResponse(res, error) {
  json(res, { error: error.message }, error.status || 500);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk.toString(); });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function createBridgeServer() {
  ensureRuntime();
  return http.createServer((req, res) => {
    route(req, res).catch((error) => errorResponse(res, error));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === BRIDGE_FILE) {
  const server = createBridgeServer();
  server.listen(PORT, HOST, () => {
    const address = server.address();
    const readyPort = typeof address === 'object' && address ? address.port : PORT;
    console.log(`CONNECT_AI_BRIDGE_READY ${readyPort}`);
  });
}
