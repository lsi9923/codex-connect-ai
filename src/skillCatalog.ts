import { AGENTS, AGENT_ORDER, AgentId } from './agents';

export type SkillSource = 'codex' | 'connect-ai' | 'hermes';

export interface LocalSkill {
  id: string;
  label: string;
  category: string;
  description: string;
  agents: AgentId[];
  keywords: string[];
  source: SkillSource;
}

export type SkillSettings = Partial<Record<AgentId, string[]>>;

export const localSkillCatalog: LocalSkill[] = [
  {
    id: 'youtube-content',
    label: 'YouTube 콘텐츠 리서치',
    category: 'Content',
    description: 'yt-dlp 기반 영상 조사, 자막, 채널 분석 흐름',
    agents: ['youtube', 'writer', 'researcher', 'secretary'],
    keywords: ['youtube', '유튜브', '영상', '채널', '자막', '조회수', '댓글'],
    source: 'codex',
  },
  {
    id: 'frontend-skill',
    label: '프론트엔드 화면 완성',
    category: 'Design',
    description: '앱 화면, 프로토타입, 모션, 레이아웃 완성도 개선',
    agents: ['designer', 'developer'],
    keywords: ['ui', '화면', '디자인', '앱', '프로토타입', '게임'],
    source: 'codex',
  },
  {
    id: 'impeccable',
    label: '고급 디자인 리뷰',
    category: 'Design',
    description: '완성도 높은 시각 위계, 여백, 톤 점검',
    agents: ['designer', 'developer', 'ceo'],
    keywords: ['디자인', '고급', '프로', '센스', '완성도', '예쁘게'],
    source: 'codex',
  },
  {
    id: 'develop-web-game',
    label: '웹 게임 루프',
    category: 'Motion',
    description: '움직임, 상태, 화면 검증을 게임처럼 반복 테스트',
    agents: ['developer', 'designer'],
    keywords: ['게임', '움직임', '캐릭터', '상태머신', '애니메이션'],
    source: 'codex',
  },
  {
    id: 'playwright',
    label: '브라우저 자동 검증',
    category: 'QA',
    description: '화면 클릭, 콘솔 에러, 반응형 검증',
    agents: ['developer', 'researcher'],
    keywords: ['검증', '브라우저', '테스트', '콘솔', '스크린샷'],
    source: 'codex',
  },
  {
    id: 'browser-use:browser',
    label: '브라우저 조작',
    category: 'QA',
    description: '로컬 브라우저에서 실제 UI를 열고 확인',
    agents: ['developer', 'secretary'],
    keywords: ['브라우저', 'localhost', '클릭', '확인'],
    source: 'codex',
  },
  {
    id: 'lazyweb-design-research',
    label: '실서비스 디자인 리서치',
    category: 'Research',
    description: '실제 앱/웹 화면을 참고해 디자인 방향 수집',
    agents: ['designer', 'researcher'],
    keywords: ['레퍼런스', '실서비스', '디자인', '리서치'],
    source: 'codex',
  },
  {
    id: 'imagegen',
    label: '이미지 생성',
    category: 'Creative',
    description: '썸네일, 무드보드, 시각 자산 생성',
    agents: ['designer', 'youtube', 'instagram'],
    keywords: ['이미지', '썸네일', '무드보드', '비주얼'],
    source: 'codex',
  },
  {
    id: 'sora',
    label: '영상 생성 브리프',
    category: 'Creative',
    description: '영상 컷, 장면, 모션 브리프 설계',
    agents: ['youtube', 'editor', 'designer'],
    keywords: ['영상', '컷', '모션', '장면', '스토리보드'],
    source: 'codex',
  },
  {
    id: 'speech',
    label: '음성/말투',
    category: 'Creative',
    description: '나레이션, 음성 톤, 보고 말투 설계',
    agents: ['editor', 'writer', 'secretary'],
    keywords: ['음성', '나레이션', '말투', '보고'],
    source: 'codex',
  },
  {
    id: 'openai-docs',
    label: 'OpenAI 문서 확인',
    category: 'Research',
    description: 'OpenAI API와 모델 사용법 공식 문서 확인',
    agents: ['developer', 'researcher', 'ceo'],
    keywords: ['openai', 'api', '모델', '문서'],
    source: 'codex',
  },
  {
    id: 'github',
    label: 'GitHub 작업',
    category: 'Ops',
    description: '저장소, 이슈, PR, 백업 흐름 처리',
    agents: ['developer', 'secretary'],
    keywords: ['git', 'github', '커밋', 'push', '저장소'],
    source: 'codex',
  },
  {
    id: 'code-review',
    label: '코드 리뷰',
    category: 'QA',
    description: '품질, 보안, 유지보수 관점 리뷰',
    agents: ['developer', 'ceo', 'researcher'],
    keywords: ['리뷰', '품질', '보안', '버그'],
    source: 'codex',
  },
  {
    id: 'ai-slop-cleaner',
    label: 'AI 코드 정리',
    category: 'QA',
    description: '임시 코드, 중복, 슬롭 제거',
    agents: ['developer', 'designer'],
    keywords: ['정리', '슬롭', '중복', '리팩터'],
    source: 'codex',
  },
  {
    id: 'hermes-skill',
    label: 'Hermes 스킬 연결',
    category: 'Agent',
    description: 'Hermes Agent 스킬 구조를 연결하는 흐름',
    agents: ['developer', 'ceo', 'researcher'],
    keywords: ['hermes', '스킬', '에이전트', '연결'],
    source: 'hermes',
  },
  {
    id: 'hermes-route',
    label: 'Hermes 라우팅',
    category: 'Agent',
    description: '명령을 적절한 에이전트와 도구로 라우팅',
    agents: ['ceo', 'developer', 'secretary'],
    keywords: ['라우팅', '명령', '분배', 'agent'],
    source: 'hermes',
  },
  {
    id: 'hermes-memory',
    label: 'Hermes 메모리',
    category: 'Agent',
    description: '작업 기억과 반복 학습 히스토리 관리',
    agents: ['ceo', 'secretary', 'researcher'],
    keywords: ['메모리', '기억', 'second brain', '기록'],
    source: 'hermes',
  },
  {
    id: 'hermes-search',
    label: 'Hermes 검색',
    category: 'Research',
    description: '자료 검색과 근거 수집',
    agents: ['researcher', 'youtube', 'business'],
    keywords: ['검색', '자료', '근거', '조사'],
    source: 'hermes',
  },
  {
    id: 'autoresearch',
    label: '자동 리서치',
    category: 'Research',
    description: '주제 조사, 비교, 근거 정리',
    agents: ['researcher', 'business', 'youtube'],
    keywords: ['리서치', '시장', '경쟁', '비교'],
    source: 'codex',
  },
  {
    id: 'product-detail-page',
    label: '상세페이지',
    category: 'Commerce',
    description: '상품 상세페이지 구조와 카피 설계',
    agents: ['writer', 'designer', 'business'],
    keywords: ['상세페이지', '상품', '판매', '커머스'],
    source: 'codex',
  },
  {
    id: 'fashion-trend',
    label: '패션 트렌드',
    category: 'Commerce',
    description: '패션/의류/트렌드 리서치',
    agents: ['instagram', 'designer', 'business'],
    keywords: ['패션', '트렌드', '의류', '인스타'],
    source: 'codex',
  },
  {
    id: 'telegram_setup',
    label: 'Telegram 연결 설정',
    category: 'Connect AI Tool',
    description: 'Secretary 도구 기반 Telegram 승인/보고 연결',
    agents: ['secretary', 'youtube', 'ceo'],
    keywords: ['telegram', '텔레그램', '보고', '승인'],
    source: 'connect-ai',
  },
  {
    id: 'channel_full_analysis',
    label: 'YouTube 채널 전체 분석',
    category: 'Connect AI Tool',
    description: 'Connect AI tool-seeds의 채널 분석 도구',
    agents: ['youtube', 'researcher'],
    keywords: ['youtube', '채널', '분석', '조회수'],
    source: 'connect-ai',
  },
  {
    id: 'competitor_brief',
    label: '경쟁 채널 브리프',
    category: 'Connect AI Tool',
    description: '경쟁 채널 영상과 지표를 다음 액션으로 변환',
    agents: ['youtube', 'business', 'researcher'],
    keywords: ['경쟁', '채널', '브리프', '벤치마크'],
    source: 'connect-ai',
  },
  {
    id: 'comment_harvester',
    label: '댓글 수집 메모리',
    category: 'Connect AI Tool',
    description: '시청자 댓글을 메모리에 누적해 후크에 반영',
    agents: ['youtube', 'writer', 'researcher'],
    keywords: ['댓글', '시청자', '후크', '메모리'],
    source: 'connect-ai',
  },
  {
    id: 'trend_sniper',
    label: '트렌드 스나이퍼',
    category: 'Connect AI Tool',
    description: '떡상 주제와 검색 트렌드 후보 추출',
    agents: ['youtube', 'instagram', 'researcher'],
    keywords: ['트렌드', '떡상', '검색', '쇼츠'],
    source: 'connect-ai',
  },
  {
    id: 'music_to_video',
    label: 'BGM 영상 합성',
    category: 'Connect AI Tool',
    description: '영상과 음악을 합치고 편집 큐를 맞춤',
    agents: ['editor', 'youtube', 'designer'],
    keywords: ['bgm', '음악', '영상', '편집'],
    source: 'connect-ai',
  },
  {
    id: 'paypal_revenue',
    label: 'PayPal 매출 확인',
    category: 'Connect AI Tool',
    description: '결제/매출 리포트를 비즈니스 판단에 반영',
    agents: ['business', 'secretary', 'ceo'],
    keywords: ['매출', 'paypal', '수익', '결제'],
    source: 'connect-ai',
  },
  {
    id: 'landing-copy',
    label: '랜딩 카피',
    category: 'Writing',
    description: '랜딩페이지 문구와 CTA 작성',
    agents: ['writer', 'business', 'designer'],
    keywords: ['랜딩', '카피', 'cta', '판매'],
    source: 'connect-ai',
  },
  {
    id: 'source-map',
    label: '근거 맵',
    category: 'Research',
    description: '참고 링크, 저장소, 문서 근거를 묶어 보고',
    agents: ['researcher', 'secretary', 'ceo'],
    keywords: ['출처', '근거', 'github', '문서'],
    source: 'connect-ai',
  },
];

export function normalizeSkillList(skills: string[], max = 12) {
  const cleaned = skills
    .map((skill) => skill.trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned)).slice(0, max);
}

export function buildDefaultSkillSettings(): SkillSettings {
  return Object.fromEntries(
    AGENT_ORDER.map((id) => [id, AGENTS[id].suggestedSkills]),
  ) as SkillSettings;
}

export function recommendSkillsForAgent(agentId: AgentId, prompt = '', limit = 8) {
  const lowerPrompt = prompt.toLowerCase();
  return localSkillCatalog
    .map((skill) => {
      const agentScore = skill.agents.includes(agentId) ? 8 : 0;
      const keywordScore = skill.keywords.reduce((score, keyword) => {
        return lowerPrompt.includes(keyword.toLowerCase()) ? score + 3 : score;
      }, 0);
      const ceoBoost = agentId === 'ceo' && skill.category === 'Agent' ? 2 : 0;
      return { skill, score: agentScore + keywordScore + ceoBoost };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.id.localeCompare(b.skill.id))
    .slice(0, limit)
    .map((item) => item.skill);
}

export function skillSourceLabel(source: SkillSource) {
  if (source === 'codex') return 'Codex Skill';
  if (source === 'hermes') return 'Hermes';
  return 'Connect AI Tool';
}
