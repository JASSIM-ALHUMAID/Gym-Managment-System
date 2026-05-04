import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  ['src/App.tsx', 'command-sidebar'],
  ['src/App.tsx', 'command-main'],
  ['src/App.tsx', 'command-search'],
  ['src/App.tsx', 'system-log-button'],
  ['src/pages/AdminDashboard.tsx', 'command-overview-grid'],
  ['src/pages/AdminDashboard.tsx', 'command-registry'],
  ['src/pages/AdminDashboard.tsx', 'command-alert-panel'],
  ['src/pages/AdminDashboard.tsx', 'system-log-panel'],
  ['src/pages/TrainerDashboard.tsx', 'trainer-command-grid'],
  ['src/pages/MemberDashboard.tsx', 'member-command-grid'],
  ['src/styles.css', '.command-sidebar'],
  ['src/styles.css', '.command-overview-grid'],
  ['src/styles.css', '.trainer-command-grid'],
  ['src/styles.css', '.member-command-grid']
];

const failures = checks.filter(([file, token]) => !readFileSync(resolve(root, file), 'utf8').includes(token));

if (failures.length > 0) {
  console.error('Missing command layout hooks:');
  for (const [file, token] of failures) console.error(`- ${file}: ${token}`);
  process.exit(1);
}

console.log('Command layout hooks found.');
