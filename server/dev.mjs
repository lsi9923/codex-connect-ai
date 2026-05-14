import { spawn } from 'node:child_process';
import process from 'node:process';

const env = { ...process.env, CONNECT_AI_BRIDGE_PORT: process.env.CONNECT_AI_BRIDGE_PORT || '5198' };

const bridge = spawn(process.execPath, ['server/bridge.mjs'], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  windowsHide: true,
});

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5199'], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  windowsHide: true,
});

function shutdown(code = 0) {
  if (!bridge.killed) bridge.kill();
  if (!vite.killed) vite.kill();
  process.exit(code);
}

bridge.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

vite.on('exit', (code) => {
  shutdown(code || 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
