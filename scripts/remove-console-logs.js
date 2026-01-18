/**
 * Script to remove debug console statements from codebase
 * Removes: console.log, console.info, console.debug
 * Preserves: console.error, console.warn (for production monitoring)
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Patterns to remove
const REMOVE_PATTERNS = [
  // console.log statements
  /console\.log\([^)]*\);?\s*/g,
  // console.info statements
  /console\.info\([^)]*\);?\s*/g,
  // console.debug statements
  /console\.debug\([^)]*\);?\s*/g,
];

// Patterns to KEEP (for reference, not used in replacement)
const KEEP_PATTERNS = [
  'console.error',
  'console.warn',
];

let totalFiles = 0;
let totalLines = 0;

async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let linesRemoved = 0;

    const originalLines = content.split('\n').length;

    // Apply each removal pattern
    for (const pattern of REMOVE_PATTERNS) {
      const before = content;
      content = content.replace(pattern, '');
      if (content !== before) {
        modified = true;
      }
    }

    // Count lines removed
    const newLines = content.split('\n').length;
    linesRemoved = originalLines - newLines;

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFiles++;
      totalLines += linesRemoved;
      console.log(`✓ ${filePath.replace(process.cwd(), '.')}: ${linesRemoved} lines removed`);
    }

    return { modified, linesRemoved };
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return { modified: false, linesRemoved: 0 };
  }
}

async function main() {
  console.log('🧹 Removing debug console statements...\n');

  // Process src files
  const srcFiles = await glob('src/**/*.{ts,tsx}', { ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.test.tsx'] });
  console.log(`Found ${srcFiles.length} source files`);

  for (const file of srcFiles) {
    await processFile(file);
  }

  // Process API files
  const apiFiles = await glob('api/**/*.ts', { ignore: ['**/node_modules/**', '**/*.test.ts'] });
  console.log(`\nFound ${apiFiles.length} API files`);

  for (const file of apiFiles) {
    await processFile(file);
  }

  console.log(`\n✅ Complete! Modified ${totalFiles} files, removed ${totalLines} lines`);
}

main().catch(console.error);
