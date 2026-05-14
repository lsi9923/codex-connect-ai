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
assert(!appTsx.includes('title={`${agent.name}'), '브라우저 기본 title 툴팁 팝업은 제거되어야 합니다.');
console.log('OK: Connect AI 10 agents + P-Reinforce + approval safety verified.');
