import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  ['src/App.tsx', 'command-sidebar'],
  ['src/App.tsx', 'command-main'],
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
  console.error('Missing gym dashboard layout hooks:');
  for (const [file, token] of failures) console.error(`- ${file}: ${token}`);
  process.exit(1);
}

const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8');

function declarationValuesFor(selector, property) {
  const values = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = rulePattern.exec(styles)) !== null) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (!selectors.includes(selector)) continue;

    const declarations = match[2].split(';');
    for (const declaration of declarations) {
      const [name, ...valueParts] = declaration.split(':');
      if (name?.trim() === property) values.push(valueParts.join(':').trim());
    }
  }

  return values;
}

function selectorHasDeclaration(selector, property, predicate) {
  return declarationValuesFor(selector, property).some(predicate);
}

const usesFiraCode = (value) => value.includes('"Fira Code"');
const isZeroRadius = (value) => /^0(?:\s*!important)?$/.test(value);
const tacticalStyleChecks = [
  ['nav chrome should not use black command surfaces', ['.landing-nav', '.top-navbar'].some((selector) => selectorHasDeclaration(selector, 'background', (value) => value === '#030303'))],
  ['cards should not be squared off by legacy overrides', ['.auth-card', '.role-card', '.feature-card', '.workflow-panel', '.inline-field', '.quick-login', '.auth-proof-grid span', '.auth-hero-panel', '.dashboard-tabs', '.top-navbar'].some((selector) => selectorHasDeclaration(selector, 'border-radius', isZeroRadius))],
  ['forms and tables should not use Fira Code tactical styling', ['select', 'input', 'textarea', 'th', 'td'].some((selector) => selectorHasDeclaration(selector, 'font-family', usesFiraCode))],
  ['tabs should not use Fira Code tactical styling', ['.top-nav-tabs a', '.tabs button'].some((selector) => selectorHasDeclaration(selector, 'font-family', usesFiraCode))],
  ['pills should not use Fira Code tactical styling', selectorHasDeclaration('.pill', 'font-family', usesFiraCode)],
  ['admin overview rows should not use Fira Code tactical styling', ['.command-list-row div > span', '.system-log-line'].some((selector) => selectorHasDeclaration(selector, 'font-family', usesFiraCode))],
  ['admin overview labels should not use uppercase tactical styling', ['.command-list-row div > span', '.command-alert span', '.command-alert p'].some((selector) => selectorHasDeclaration(selector, 'text-transform', (value) => value === 'uppercase'))]
];
const tacticalStyleFailures = tacticalStyleChecks.filter(([, failed]) => failed);

if (tacticalStyleFailures.length > 0) {
  console.error('Legacy tactical dashboard styling remains:');
  for (const [message] of tacticalStyleFailures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Gym dashboard layout hooks found.');
