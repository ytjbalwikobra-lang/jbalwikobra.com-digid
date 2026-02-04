// replace-rounded.js - Run with: node scripts/replace-rounded.js

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
let totalFiles = 0;
let totalReplacements = 0;
const modifiedFiles = [];

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const matches = (content.match(/rounded-lg/g) || []).length;
      
      if (matches > 0) {
        const newContent = content.replace(/rounded-lg/g, 'rounded-xl');
        fs.writeFileSync(fullPath, newContent, 'utf8');
        totalFiles++;
        totalReplacements += matches;
        modifiedFiles.push({
          file: fullPath.replace(srcDir, 'src'),
          count: matches
        });
      }
    }
  }
}

console.log('=== Design System Consistency Fix ===');
console.log('Replacing all "rounded-lg" with "rounded-xl" in src/*.tsx files\n');

processDirectory(srcDir);

console.log(`\nSummary:`);
console.log(`- Total files modified: ${totalFiles}`);
console.log(`- Total replacements made: ${totalReplacements}`);
console.log(`\nModified files:`);
modifiedFiles.forEach(f => {
  console.log(`  ${f.file}: ${f.count} replacement(s)`);
});
