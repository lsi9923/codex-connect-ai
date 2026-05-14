# Performance Evaluator: connect-ai-unified-agent-bubbles

## Objective
Unify duplicated agent speech bubbles into one visible bubble per employee and reduce 3D overlay texture churn

## Evaluator Command
```sh
npm test && npm run build
```

## Pass/Fail Contract
PASS when tests/build pass, browser shows 9 unified employee speech bubbles, 3D payload reports 9 speech bubble states, and no console errors

This evaluator must exist and produce concrete pass/fail evidence before the performance goal can be completed.
