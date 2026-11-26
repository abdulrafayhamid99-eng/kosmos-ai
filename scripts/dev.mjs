import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const args = process.argv.slice(2)
  .filter((arg) => arg !== '--strictPort')
  .map((arg) => arg === '--host' ? '--hostname' : arg);
const server = spawn(process.execPath, [next, 'dev', '--webpack', ...args], { stdio: 'inherit' });

server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
