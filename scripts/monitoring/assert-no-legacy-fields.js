// Script to ensure no product literals contain deprecated fields (gameTitle, tier)
// Run with: node scripts/assert-no-legacy-fields.js
// Exits with code 1 if any occurrences detected.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_EXT = new Set(['.ts', '.tsx', '.js']);

// Only flag usages tied to product objects, not filter option structures or variable names.
const LEGACY_PATTERNS = [
  /(product|p)\.gameTitle\b/,
  /\bgameTitle\s*:/, // object literal property likely defining legacy field
  /(product|p)\.tier\b/,
  /\btier\s*:/ // object literal property (legacy fallback)
];

// Paths to ignore (filter components, scripts, tests, migrations)
const IGNORE_PATH_SUBSTRINGS = [
  'scripts/assert-no-legacy-fields.js',
  'ProductsTierFilter.tsx',
  'api/_utils/optimizedQueries.ts', // filter layer allowed to use filter names
  'migrations',
  'supabase/migrations',
  'test-',
  '.test.',
];

let violations = [];

function scan(file) {
  const rel = path.relative(ROOT, file);
  if (IGNORE_PATH_SUBSTRINGS.some(s => rel.includes(s))) return; // skip ignored files
  const content = fs.readFileSync(file, 'utf8');
  LEGACY_PATTERNS.forEach(rx => {
    if (rx.test(content)) {
      violations.push({ file: rel, pattern: rx.toString() });
    }
  });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'build' || entry === 'dist') continue;
      walk(full);
    } else {
      const ext = path.extname(entry);
      if (TARGET_EXT.has(ext)) {
        scan(full);
      }
    }
  }
}

walk(ROOT);

if (violations.length) {
  console.error('\n❌ Legacy field usage detected (should be removed):');
  violations.forEach(v => console.error(` - ${v.file} matches ${v.pattern}`));
  process.exit(1);
}

console.log('✅ No legacy gameTitle/tier string fields found.');
