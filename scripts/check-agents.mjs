import fs from 'node:fs';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const agentsTs = fs.readFileSync(new URL('../src/agents.ts', import.meta.url), 'utf8');
const simulatorTs = fs.readFileSync(new URL('../src/simulator.ts', import.meta.url), 'utf8');
const required = ['ceo', 'youtube', 'instagram', 'designer', 'developer', 'business', 'secretary', 'editor', 'writer', 'researcher'];
for (const id of required) {
  assert(new RegExp(`${id}:\\s*\\{`).test(agentsTs), `에이전트 정의 누락: ${id}`);
}
assert(/AGENT_ORDER:\s*AgentId\[\][\s\S]*'researcher'/.test(agentsTs), 'AGENT_ORDER에 10명 구조가 있어야 합니다.');
assert(/SPECIALIST_IDS:\s*AgentId\[\][\s\S]*'researcher'/.test(agentsTs), 'SPECIALIST_IDS에 전문가 9명이 있어야 합니다.');
assert(simulatorTs.includes('approvalItems'), '승인 대기함 안전장치가 필요합니다.');
assert(simulatorTs.includes('00_Raw') && simulatorTs.includes('10_Wiki') && simulatorTs.includes('20_Meta'), 'P-Reinforce 폴더 구조가 필요합니다.');
console.log('OK: Connect AI 10 agents + P-Reinforce + approval safety verified.');
