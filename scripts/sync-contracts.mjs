// Copies the shared contracts from the server repo (single source of truth, spec §5.3).
// Usage: npm run contracts:sync [-- ../path/to/music-room-server]
import { cpSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const server = resolve(process.argv[2] ?? '../music-room-server');
const from = join(server, 'src', 'contracts');
const to = resolve('src', 'contracts');

rmSync(to, { recursive: true, force: true });
cpSync(from, to, {
  recursive: true,
  filter: (src) => !src.endsWith('.spec.ts'),
});
console.log(`contracts synced from ${from}:`, readdirSync(to).join(', '));
