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
const HERMES_CONFIG_FILE = path.join(HERMES_ROOT, 'config.yaml');
const HERMES_WEB_HEALTH_URL = 'http://127.0.0.1:8788/health';
const HERMES_WEB_SETTINGS_URL = 'http://127.0.0.1:8788/api/settings';
const MODEL_CALL_TIMEOUT_MS = Number(process.env.CONNECT_AI_MODEL_TIMEOUT_MS || 240000);
const HERMES_CALL_TIMEOUT_MS = Number(process.env.CONNECT_AI_HERMES_TIMEOUT_MS || 600000);
const WIKI_VAULT_PATH = process.env.CONNECT_AI_WIKI_VAULT
  || path.join(os.homedir(), 'Desktop', '커서 ai 폴더', '옵시디언 뇌', '위키에이전트');
const WIKI_GIT_REMOTE_URL = 'https://github.com/lsi9923/llm-wiki-opcidian.git';
const WIKI_GUIDE_FILE = path.join(HERMES_ROOT, 'webui', 'workspace', '올인원_요청_가이드.md');
const WIKI_DRAFT_ROOT = path.join(RUNTIME_ROOT, 'wiki-drafts');
const HERMES_CODEX_MODELS = [
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.3-codex',
  'gpt-5.3-codex-spark',
  'gpt-5.2',
];

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
  youtube: 'hermes/gpt-5.5',
  instagram: 'hermes/gpt-5.5',
  designer: 'hermes/gpt-5.5',
  developer: 'hermes/gpt-5.5',
  business: 'hermes/gpt-5.5',
  secretary: 'hermes/gpt-5.5',
  editor: 'hermes/gpt-5.5',
  writer: 'hermes/gpt-5.5',
  researcher: 'hermes/gpt-5.5',
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
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
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
  } catch (error) {
    if (timedOut) {
      throw new Error(`timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
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

function readHermesModelConfig() {
  const config = {
    defaultModel: 'gpt-5.5',
    provider: 'openai-codex',
    source: HERMES_CONFIG_FILE,
  };
  if (!fs.existsSync(HERMES_CONFIG_FILE)) return config;
  const text = fs.readFileSync(HERMES_CONFIG_FILE, 'utf8');
  const modelBlock = text.match(/(?:^|\r?\n)model:\s*\r?\n((?:\s{2,}.+\r?\n?)*)/);
  const scope = modelBlock?.[1] || text;
  const defaultMatch = scope.match(/default:\s*['"]?([A-Za-z0-9_.:/-]+)/);
  const providerMatch = scope.match(/provider:\s*['"]?([A-Za-z0-9_.:/-]+)/);
  if (defaultMatch) config.defaultModel = defaultMatch[1];
  if (providerMatch) config.provider = providerMatch[1];
  return config;
}

function findHermesExe() {
  const candidates = [
    process.env.HERMES_EXE,
    path.join(os.homedir(), 'Desktop', '커서 ai 폴더', 'hermes-agent', 'venv', 'Scripts', 'hermes.exe'),
    path.join(os.homedir(), '.local', 'bin', 'hermes.exe'),
  ].filter(Boolean);
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  return match || 'hermes';
}

function isKnownHermesExe(exe) {
  return exe !== 'hermes' && fs.existsSync(exe);
}

async function detectHermes() {
  const config = readHermesModelConfig();
  const exe = findHermesExe();
  let webHealth = 'disconnected';
  let webDefaultModel = '';
  let webMessage = '';
  try {
    await fetchJson(HERMES_WEB_HEALTH_URL, {}, 1200);
    webHealth = 'connected';
  } catch (error) {
    webMessage = error.message;
  }
  try {
    const settings = await fetchJson(HERMES_WEB_SETTINGS_URL, {}, 1200);
    webDefaultModel = settings?.default_model || '';
  } catch {
    // Hermes CLI can still run without the Web UI process.
  }

  const defaultModel = webDefaultModel || config.defaultModel;
  const modelSet = new Set([defaultModel, ...HERMES_CODEX_MODELS].filter(Boolean));
  const models = [...modelSet];
  const status = isKnownHermesExe(exe) ? 'connected' : 'missing';
  return {
    provider: {
      id: 'hermes',
      label: 'Hermes Codex',
      endpoint: isKnownHermesExe(exe) ? exe : 'hermes CLI not found',
      status,
      message: status === 'connected' ? `provider=${config.provider}; web=${webHealth}` : webMessage || 'hermes.exe를 찾지 못했습니다.',
      defaultModel,
      hermesProvider: config.provider,
      webHealth,
      models,
    },
    options: models.map((model) => ({ id: `hermes/${model}`, label: model, provider: 'Hermes Codex', available: status === 'connected' })),
  };
}

async function detectModels(env = readEnvFile()) {
  const providers = [];
  const options = [];

  const hermes = await detectHermes();
  providers.push(hermes.provider);
  options.push(...hermes.options);

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

function execGit(args, timeoutMs = 4000, cwd = APP_ROOT) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, windowsHide: true });
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

async function getGitStatus(cwd = APP_ROOT, expectedRemote = '') {
  if (!fs.existsSync(cwd)) {
    return {
      status: 'missing',
      path: cwd,
      branch: 'missing',
      dirtyCount: 0,
      remote: '',
      expectedRemote,
      targetMatched: false,
      changes: [],
      message: 'Git working directory not found',
    };
  }
  const status = await execGit(['status', '--short', '--branch'], 4000, cwd);
  const remote = await execGit(['remote', '-v'], 4000, cwd);
  const lines = status.stdout ? status.stdout.split(/\r?\n/) : [];
  const branch = lines[0] || 'unknown';
  const changes = lines.slice(1).filter(Boolean);
  const firstRemote = remote.stdout.split(/\r?\n/)[0] || '';
  const targetMatched = expectedRemote ? remote.stdout.includes(expectedRemote) : true;
  return {
    status: status.ok ? 'connected' : 'error',
    path: cwd,
    branch,
    dirtyCount: changes.length,
    remote: firstRemote,
    expectedRemote,
    targetMatched,
    changes: changes.slice(0, 12),
    message: status.stderr || '',
  };
}

async function runtimeStatus() {
  const env = readEnvFile();
  const [models, telegram, localApis, git, wikiGit] = await Promise.all([
    detectModels(env),
    getTelegramStatus(env),
    detectLocalApis(),
    getGitStatus(),
    getGitStatus(WIKI_VAULT_PATH, WIKI_GIT_REMOTE_URL),
  ]);
  const memory = getMemoryStatus();
  const revenue = getRevenueStatus(env);
  const skillsTotal = memory.hermesSkillCount + memory.codexSkillCount + (memory.appliedSkill ? 1 : 0);
  const lmStudio = models.providers.find((provider) => provider.id === 'lmstudio');
  const hermes = models.providers.find((provider) => provider.id === 'hermes');
  const gateways = [
    { name: 'Telegram', status: telegram.connected ? 'connected' : telegram.configured ? 'error' : 'missing', detail: telegram.connected ? `@${telegram.botUsername}` : telegram.targetName },
    {
      name: 'GitHub',
      status: wikiGit.status === 'connected' && wikiGit.targetMatched ? 'configured' : wikiGit.status,
      detail: wikiGit.targetMatched ? `LLM Wiki · ${wikiGit.dirtyCount} changes` : 'remote 확인 필요',
    },
    { name: 'Hermes Codex', status: hermes?.status || 'missing', detail: hermes?.defaultModel || 'gpt-5.5' },
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
    wikiGit,
  };
}

function getCurrentRun() {
  const state = readState();
  return state.runs.find((run) => run.id === state.currentRunId) || state.runs.at(-1) || null;
}

async function getCurrentRunForDisplay() {
  const run = getCurrentRun();
  if (!run) return null;
  if (needsWikiSaveApprovalBackfill(run)) {
    await queueWikiSaveApproval(run.id);
    return getRunById(run.id) || run;
  }
  return run;
}

function needsWikiSaveApprovalBackfill(run) {
  if (!run || run.wikiDraft?.status === 'saved') return false;
  const approvals = run.approvals || [];
  if (approvals.some((item) => String(item.id || '').startsWith(`wiki-save-${run.id}`))) return false;
  const tasks = run.tasks || [];
  if (tasks.some((task) => task.status === 'queued' || task.status === 'running')) return false;
  return tasks.some((task) => task.status === 'done' || task.status === 'approval');
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeNoteName(value) {
  return String(value || 'connect-ai-run')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90) || 'connect-ai-run';
}

function redactSecrets(value) {
  return String(value || '')
    .replace(/(sk-[A-Za-z0-9_-]{12,})/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(gh[pousr]_[A-Za-z0-9_]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(\b\d{8,12}:[A-Za-z0-9_-]{20,}\b)/g, '[REDACTED_TELEGRAM_TOKEN]')
    .replace(/((?:OPENAI|OPENROUTER|GITHUB|TELEGRAM|PAYPAL|YOUTUBE)[A-Z0-9_]*\s*=\s*)[^\s]+/gi, '$1[REDACTED]');
}

function appendUniqueLine(filePath, line) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (current.includes(line)) return false;
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(filePath, `${prefix}${line}\n`, 'utf8');
  return true;
}

function appendSection(filePath, heading, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const prefix = current && !current.endsWith('\n') ? '\n\n' : current ? '\n' : '';
  fs.appendFileSync(filePath, `${prefix}${heading}\n\n${body.trim()}\n`, 'utf8');
}

function summarizeTasksForWiki(run) {
  return (run.tasks || []).map((task) => {
    const status = task.status === 'approval' ? '승인 대기' : task.status;
    return `- [[${AGENT_NAMES[task.agent]}]] · ${task.title} · ${status} · ${task.executionModel || task.model}\n  - ${redactSecrets(task.output).replace(/\s+/g, ' ').slice(0, 240)}`;
  }).join('\n');
}

function wikiArtifactsForRun(run) {
  const date = todayIsoDate();
  const title = `Connect AI Run ${run.runNumber} LLM Wiki`;
  const noteName = safeNoteName(title);
  const rawRel = path.join('00_Raw', date, `connect_ai_run_${run.runNumber}_${run.id}.md`);
  const wikiRel = path.join('10_Wiki', '💡 Topics', 'AI_Knowledge_Base', `${noteName}.md`);
  const postingRel = path.join('30_Output', date, `connect_ai_run_${run.runNumber}_posting_brief.md`);
  const telegramRel = path.join('30_Output', date, `connect_ai_run_${run.runNumber}_telegram_handoff.md`);
  return {
    date,
    title,
    noteName,
    rawRel,
    wikiRel,
    indexRel: path.join('20_Meta', 'Index.md'),
    graphRel: path.join('20_Meta', 'Graph.md'),
    logRel: path.join('20_Meta', 'Log.md'),
    postingRel,
    telegramRel,
  };
}

function buildWikiDraft(run) {
  const files = wikiArtifactsForRun(run);
  const completed = (run.tasks || []).filter((task) => task.status === 'done' || task.status === 'approval');
  const links = ['[[Connect AI]]', '[[P-Reinforce]]', '[[LLM-Wiki]]', '[[Hermes Agent]]', '[[Obsidian]]', '[[Telegram handoff]]'];
  const preview = [
    '# Obsidian LLM-Wiki 저장 초안',
    '',
    '> [!warning] 승인 전에는 vault에 저장하지 않습니다.',
    `> 기준 문서: ${WIKI_GUIDE_FILE}`,
    '',
    '## 원문 요약',
    `- CEO 입력: ${redactSecrets(run.prompt)}`,
    `- 실행 run: ${run.runNumber}`,
    `- 완료 직원: ${completed.length}/${(run.tasks || []).length}`,
    '',
    '## 분류 후보',
    '- 10_Wiki/💡 Topics/AI_Knowledge_Base',
    '- 주제: Connect AI 운영, P-Reinforce, Hermes Codex, 직원 작업 산출물',
    '',
    '## 새 노트/업데이트 후보',
    `- Raw 보존: ${files.rawRel}`,
    `- Wiki 노트: ${files.wikiRel}`,
    `- Index 업데이트: ${files.indexRel}`,
    `- Graph 업데이트: ${files.graphRel}`,
    `- Log 업데이트: ${files.logRel}`,
    `- Posting brief: ${files.postingRel}`,
    `- Telegram handoff: ${files.telegramRel}`,
    '',
    '## Wikilink 후보',
    links.join(' · '),
    '',
    '## 20_Meta 변경안',
    `- Index.md에 [[${files.noteName}]] 링크 추가`,
    `- Graph.md에 [[Connect AI]] -> [[${files.noteName}]] 연결 추가`,
    `- Log.md에 ${files.date} 저장 로그 append`,
    '',
    '## 직원 산출물 요약',
    summarizeTasksForWiki(run),
    '',
    '## Posting brief 초안',
    `Connect AI run ${run.runNumber}에서 ${completed.length}개 직원 산출물을 LLM-Wiki 지식으로 정리합니다. 핵심 연결은 ${links.join(', ')} 입니다.`,
    '',
    '## Telegram handoff 초안',
    `Connect AI run ${run.runNumber} Obsidian 저장 승인 대기. 승인 시 Raw/Wiki/Meta/posting/handoff 파일을 생성하고, GitHub push는 별도 승인 카드에서 처리합니다.`,
    '',
  ].join('\n');
  return { ...files, links, preview };
}

function writeWikiDraftFile(run, draft) {
  fs.mkdirSync(WIKI_DRAFT_ROOT, { recursive: true });
  const draftFile = path.join(WIKI_DRAFT_ROOT, `${run.id}.md`);
  fs.writeFileSync(draftFile, draft.preview, 'utf8');
  return draftFile;
}

function writeRuntimeProposals(run, task, state) {
  if (state !== 'completed') return;
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
    note: '장기 기억 후보 파일입니다. 승인 전에는 MEMORY.md에 적용되지 않습니다.',
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
    recommendation: '완료 산출물을 기준으로 반복 가능한 작업 절차를 새 스킬 후보로 검토합니다.',
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
  await queueWikiSaveApproval(runId);
}

async function queueWikiSaveApproval(runId) {
  const run = getRunById(runId);
  if (!run) return;
  const completed = (run.tasks || []).filter((task) => task.status === 'done' || task.status === 'approval');
  if (!completed.length) {
    run.reports.push(reportLine('developer', 'approval', 'Obsidian LLM-Wiki 초안 생략 · 완료 산출물 없음'));
    run.updatedAt = new Date().toISOString();
    saveRun(run);
    return;
  }
  const draft = buildWikiDraft(run);
  const draftFile = writeWikiDraftFile(run, draft);
  run.wikiDraft = { ...draft, draftFile, status: 'draft' };

  const approvalId = `wiki-save-${run.id}`;
  if (!run.approvals.some((item) => item.id === approvalId)) {
    run.approvals.push({
      id: approvalId,
      agent: 'developer',
      title: 'Obsidian LLM-Wiki 저장',
      risk: '승인하면 00_Raw, 10_Wiki, 20_Meta, posting brief, Telegram handoff를 실제 vault에 씁니다.',
      command: `write ${draft.rawRel} + ${draft.wikiRel} + 20_Meta/Index.md/Graph.md/Log.md`,
      status: '승인 대기',
      preview: draft.preview,
    });
    run.reports.push(reportLine('developer', 'approval', `Obsidian LLM-Wiki 저장 초안 생성 · ${draftFile}`));
  }
  run.updatedAt = new Date().toISOString();
  saveRun(run);
}

function saveWikiDraftToVault(run) {
  const draft = run.wikiDraft?.preview ? run.wikiDraft : buildWikiDraft(run);
  if (!fs.existsSync(WIKI_VAULT_PATH)) throw new Error(`Obsidian vault not found: ${WIKI_VAULT_PATH}`);

  const rawPath = path.join(WIKI_VAULT_PATH, draft.rawRel);
  const wikiPath = path.join(WIKI_VAULT_PATH, draft.wikiRel);
  const indexPath = path.join(WIKI_VAULT_PATH, draft.indexRel);
  const graphPath = path.join(WIKI_VAULT_PATH, draft.graphRel);
  const logPath = path.join(WIKI_VAULT_PATH, draft.logRel);
  const postingPath = path.join(WIKI_VAULT_PATH, draft.postingRel);
  const telegramPath = path.join(WIKI_VAULT_PATH, draft.telegramRel);

  const created = new Date().toISOString();
  const taskSummary = summarizeTasksForWiki(run);
  const rawBody = [
    '---',
    `title: Raw Connect AI Run ${run.runNumber}`,
    `date: ${draft.date}`,
    'tags:',
    '  - raw/connect-ai',
    '  - p-reinforce',
    '---',
    '',
    `# Raw Connect AI Run ${run.runNumber}`,
    '',
    '## Original CEO Input',
    redactSecrets(run.prompt),
    '',
    '## Runtime Output Directory',
    run.outputDir,
    '',
    '## Agent Outputs',
    taskSummary,
    '',
  ].join('\n');

  const wikiBody = [
    '---',
    `title: ${draft.title}`,
    `date: ${draft.date}`,
    'tags:',
    '  - connect-ai',
    '  - p-reinforce',
    '  - llm-wiki',
    'aliases:',
    `  - Connect AI Run ${run.runNumber}`,
    '---',
    '',
    `# ${draft.title}`,
    '',
    '> [!summary]',
    `> [[Connect AI]] 작업 run ${run.runNumber}의 직원 산출물을 [[LLM-Wiki]] 방식으로 정리한 노트입니다.`,
    '',
    '## 연결',
    draft.links.join(' · '),
    '',
    '## 입력 목표',
    redactSecrets(run.prompt),
    '',
    '## 직원별 산출물',
    taskSummary,
    '',
    '## 다음 액션',
    '- [[Telegram handoff]] 승인 여부 확인',
    '- 반복 가능한 절차는 [[P-Reinforce]] 스킬 후보로 검토',
    '- GitHub 저장은 별도 승인 카드에서 실행',
    '',
  ].join('\n');

  const postingBody = [
    '---',
    `title: Posting Brief Connect AI Run ${run.runNumber}`,
    `date: ${draft.date}`,
    'tags:',
    '  - output/posting-brief',
    '  - connect-ai',
    '---',
    '',
    `# Posting Brief · Connect AI Run ${run.runNumber}`,
    '',
    `- Source note: [[${draft.noteName}]]`,
    `- Summary: Connect AI run ${run.runNumber}에서 ${(run.tasks || []).length}명 직원 산출물을 장기 지식으로 정리했습니다.`,
    '- Reuse angle: AI 직원 회사 운영, Hermes Codex, Obsidian LLM-Wiki 누적',
    '',
  ].join('\n');

  const telegramBody = [
    '---',
    `title: Telegram Handoff Connect AI Run ${run.runNumber}`,
    `date: ${draft.date}`,
    'tags:',
    '  - output/telegram-handoff',
    '  - connect-ai',
    '---',
    '',
    `# Telegram Handoff · Connect AI Run ${run.runNumber}`,
    '',
    `[[${draft.noteName}]] 저장 완료 후보입니다.`,
    '',
    '- 저장 위치: 위키에이전트 Obsidian vault',
    '- Raw/Wiki/Meta/posting/handoff 파일 생성',
    '- GitHub push는 별도 승인 필요',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  fs.mkdirSync(path.dirname(wikiPath), { recursive: true });
  fs.mkdirSync(path.dirname(postingPath), { recursive: true });
  fs.mkdirSync(path.dirname(telegramPath), { recursive: true });

  fs.writeFileSync(rawPath, rawBody, 'utf8');
  fs.writeFileSync(wikiPath, wikiBody, 'utf8');
  fs.writeFileSync(postingPath, postingBody, 'utf8');
  fs.writeFileSync(telegramPath, telegramBody, 'utf8');

  appendUniqueLine(indexPath, `- [[${draft.noteName}]] · Connect AI run ${run.runNumber} · ${draft.date}`);
  appendUniqueLine(graphPath, `- [[Connect AI]] -> [[${draft.noteName}]] -> [[P-Reinforce]] -> [[LLM-Wiki]]`);
  appendSection(logPath, `## ${created} · Connect AI run ${run.runNumber}`, [
    `- Raw: ${draft.rawRel}`,
    `- Wiki: [[${draft.noteName}]]`,
    `- Posting brief: ${draft.postingRel}`,
    `- Telegram handoff: ${draft.telegramRel}`,
    '- GitHub push: 별도 승인 필요',
  ].join('\n'));

  run.wikiDraft = {
    ...draft,
    status: 'saved',
    savedAt: created,
    files: [rawPath, wikiPath, indexPath, graphPath, logPath, postingPath, telegramPath],
  };

  return run.wikiDraft;
}

async function queueWikiGitApproval(runId) {
  const run = getRunById(runId);
  if (!run) return;
  const wikiGit = await getGitStatus(WIKI_VAULT_PATH, WIKI_GIT_REMOTE_URL);
  if (wikiGit.status !== 'connected') {
    run.reports.push(reportLine('developer', 'approval', `Obsidian Git 상태 확인 실패 · ${wikiGit.message || wikiGit.branch}`));
    run.updatedAt = new Date().toISOString();
    saveRun(run);
    return;
  }
  if (!wikiGit.targetMatched) {
    run.reports.push(reportLine('developer', 'approval', `Obsidian GitHub remote 불일치 · ${wikiGit.remote || 'remote 없음'}`));
    run.updatedAt = new Date().toISOString();
    saveRun(run);
    return;
  }
  if (!wikiGit.dirtyCount) {
    run.reports.push(reportLine('developer', 'approval', 'Obsidian vault 변경 없음 · GitHub 저장 승인 카드 생략'));
    run.updatedAt = new Date().toISOString();
    saveRun(run);
    return;
  }
  const approvalId = `wiki-github-${run.id}`;
  if (!run.approvals.some((item) => item.id === approvalId)) {
    run.approvals.push({
      id: approvalId,
      agent: 'developer',
      title: 'Obsidian GitHub 저장',
      risk: `${wikiGit.dirtyCount}개 vault 변경을 ${WIKI_GIT_REMOTE_URL} main에 commit/push합니다.`,
      command: `git -C "${WIKI_VAULT_PATH}" add -A && git commit -m "Update LLM wiki from Connect AI run ${run.runNumber}" && git push origin main`,
      status: '승인 대기',
    });
    run.reports.push(reportLine('developer', 'approval', `Obsidian GitHub 저장 승인 대기 · ${wikiGit.dirtyCount}개 변경`));
  }
  run.updatedAt = new Date().toISOString();
  saveRun(run);
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
  if (preferred.startsWith('hermes/')) {
    return runHermes(task, prompt, preferred.replace(/^hermes\//, '') || readHermesModelConfig().defaultModel);
  }
  if (preferred.startsWith('lmstudio/')) {
    return runLmStudio(task, prompt, pickLmStudioModel(preferred.replace(/^lmstudio\//, ''), models));
  }
  if (preferred.startsWith('openrouter/') && env.OPENROUTER_API_KEY) {
    return runOpenRouter(task, prompt, preferred.replace(/^openrouter\//, ''), env.OPENROUTER_API_KEY);
  }
  if (preferred.startsWith('openai/') && env.OPENAI_API_KEY) {
    return runOpenAI(task, prompt, preferred.replace(/^openai\//, ''), env.OPENAI_API_KEY);
  }
  if (preferred.startsWith('openrouter/')) {
    throw new Error(`OPENROUTER_API_KEY가 없어 ${preferred}를 실행하지 않았습니다.`);
  }
  if (preferred.startsWith('openai/')) {
    throw new Error(`OPENAI_API_KEY가 없어 ${preferred}를 실행하지 않았습니다. Hermes Codex 모델은 hermes/gpt-5.5 형식으로 선택하세요.`);
  }
  if (preferred.startsWith('anthropic/')) {
    throw new Error(`ANTHROPIC_API_KEY 연결이 없어 ${preferred}를 실행하지 않았습니다.`);
  }
  if (preferred.startsWith('ollama/')) {
    throw new Error(`Ollama 실행 브릿지가 아직 연결되지 않아 ${preferred}를 실행하지 않았습니다.`);
  }
  throw new Error(`선택 모델 공급자가 실제 연결되지 않았습니다: ${preferred || 'empty'}`);
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

function hermesPrompt(task, prompt) {
  const [system, user] = agentMessages(task, prompt);
  return [
    system.content,
    '',
    '중요:',
    '- 이 호출은 Hermes CLI openai-codex provider를 통한 실제 실행입니다.',
    '- 모르면 모른다고 쓰고, 실제 확인하지 않은 수익/완료/전송 결과는 만들지 마세요.',
    '- 답변은 바로 파일로 저장되므로 한국어 업무 보고서 형태로 작성하세요.',
    '',
    user.content,
  ].join('\n');
}

function runProcess(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const child = spawn(command, args, {
      cwd: APP_ROOT,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', HERMES_NO_COLOR: '1' },
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      if (stdout.length > 2_000_000) stdout = stdout.slice(-2_000_000);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
      if (stderr.length > 1_000_000) stderr = stderr.slice(-1_000_000);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`Hermes CLI timeout after ${timeoutMs}ms`));
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

async function runHermes(task, prompt, model) {
  const exe = findHermesExe();
  if (!isKnownHermesExe(exe)) {
    throw new Error('hermes.exe를 찾지 못해 Hermes Codex 모델을 실행하지 않았습니다.');
  }
  const hermesModel = model || readHermesModelConfig().defaultModel || 'gpt-5.5';
  const result = await runProcess(exe, ['-z', hermesPrompt(task, prompt), '-m', hermesModel, '--provider', 'openai-codex'], HERMES_CALL_TIMEOUT_MS);
  const stderr = result.stderr.trim();
  if (result.code !== 0) {
    throw new Error(stderr || `Hermes CLI exited with code ${result.code}`);
  }
  const text = result.stdout
    .replace(/\r?\nsession_id:\s*\S+\s*$/i, '')
    .trim();
  if (!text) {
    throw new Error(stderr || 'Hermes CLI가 빈 응답을 반환했습니다.');
  }
  return { model: `hermes/${hermesModel}`, text };
}

async function runLmStudio(task, prompt, model) {
  if (!model) throw new Error('LM Studio model missing');
  const payload = await postJson('http://127.0.0.1:1234/v1/chat/completions', {
    model,
    messages: agentMessages(task, prompt),
    temperature: 0.3,
    max_tokens: 700,
  }, {}, MODEL_CALL_TIMEOUT_MS);
  return { model: `lmstudio/${model}`, text: extractChatText(payload) };
}

async function runOpenRouter(task, prompt, model, token) {
  const payload = await postJson('https://openrouter.ai/api/v1/chat/completions', {
    model,
    messages: agentMessages(task, prompt),
    temperature: 0.3,
    max_tokens: 700,
  }, { authorization: `Bearer ${token}` }, MODEL_CALL_TIMEOUT_MS);
  return { model: `openrouter/${model}`, text: extractChatText(payload) };
}

async function runOpenAI(task, prompt, model, token) {
  const payload = await postJson('https://api.openai.com/v1/chat/completions', {
    model,
    messages: agentMessages(task, prompt),
    temperature: 0.3,
    max_tokens: 700,
  }, { authorization: `Bearer ${token}` }, MODEL_CALL_TIMEOUT_MS);
  return { model: `openai/${model}`, text: extractChatText(payload) };
}

async function commitAndPushWikiVault(run) {
  const before = await getGitStatus(WIKI_VAULT_PATH, WIKI_GIT_REMOTE_URL);
  if (before.status !== 'connected') throw new Error(before.message || 'Obsidian vault git status failed');
  if (!before.targetMatched) throw new Error(`Obsidian vault remote mismatch: ${before.remote || 'remote 없음'}`);
  if (!before.dirtyCount) return { ok: true, skipped: true, message: '변경 없음', before };

  const add = await execGit(['add', '-A'], 60000, WIKI_VAULT_PATH);
  if (!add.ok) throw new Error(`git add 실패: ${add.stderr || add.stdout}`);

  const message = `Update LLM wiki from Connect AI run ${run.runNumber}`;
  const commit = await execGit(['commit', '-m', message], 120000, WIKI_VAULT_PATH);
  const nothingToCommit = /nothing to commit|no changes added/i.test(`${commit.stdout}\n${commit.stderr}`);
  if (!commit.ok && !nothingToCommit) throw new Error(`git commit 실패: ${commit.stderr || commit.stdout}`);

  const push = await execGit(['push', 'origin', 'main'], 180000, WIKI_VAULT_PATH);
  if (!push.ok) throw new Error(`git push 실패: ${push.stderr || push.stdout}`);

  const after = await getGitStatus(WIKI_VAULT_PATH, WIKI_GIT_REMOTE_URL);
  return {
    ok: true,
    skipped: false,
    message,
    before,
    after,
    commit: commit.stdout || commit.stderr,
    push: push.stdout || push.stderr,
  };
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
  if (approval.status === '전송됨' || approval.status === '이번 세션 승인') {
    return { run, plan: officePlanFromRun(run), approval, skipped: true };
  }
  if (approvalId.startsWith('telegram-')) {
    const secretary = run.tasks.find((task) => task.agent === 'secretary');
    const result = await sendTelegramMessage(secretary?.output || run.telegramDigest || 'Connect AI 보고서');
    approval.status = result.ok ? '전송됨' : '실패';
    approval.result = result;
    run.reports.push(reportLine('secretary', 'telegram', result.ok ? `Telegram 실제 전송 완료 · message_id ${result.messageId}` : 'Telegram 전송 실패'));
  } else if (approvalId.startsWith('wiki-save-')) {
    const result = saveWikiDraftToVault(run);
    approval.status = '이번 세션 승인';
    approval.result = {
      ok: true,
      savedAt: result.savedAt,
      files: result.files,
    };
    run.reports.push(reportLine('developer', 'approval', `Obsidian LLM-Wiki 저장 완료 · ${result.files.length}개 파일 반영`));
    run.updatedAt = new Date().toISOString();
    saveRun(run);
    await queueWikiGitApproval(run.id);
    const latest = getRunById(run.id) || run;
    const latestApproval = latest.approvals.find((item) => item.id === approvalId) || approval;
    return { run: latest, plan: officePlanFromRun(latest), approval: latestApproval };
  } else if (approvalId.startsWith('wiki-github-')) {
    const result = await commitAndPushWikiVault(run);
    approval.status = result.ok ? '전송됨' : '실패';
    approval.result = {
      ok: result.ok,
      skipped: result.skipped,
      message: result.message,
      beforeDirtyCount: result.before?.dirtyCount,
      afterDirtyCount: result.after?.dirtyCount,
    };
    run.reports.push(reportLine(
      'developer',
      'approval',
      result.skipped ? 'Obsidian GitHub 저장 생략 · 변경 없음' : `Obsidian GitHub push 완료 · ${WIKI_GIT_REMOTE_URL}`,
    ));
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
  if (req.method === 'GET' && url.pathname === '/api/wiki-git/status') {
    return json(res, await getGitStatus(WIKI_VAULT_PATH, WIKI_GIT_REMOTE_URL));
  }
  if (req.method === 'POST' && url.pathname === '/api/wiki-git/push') {
    return json(res, await commitAndPushWikiVault(getCurrentRun() || { runNumber: 'manual' }));
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
    const run = await getCurrentRunForDisplay();
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
