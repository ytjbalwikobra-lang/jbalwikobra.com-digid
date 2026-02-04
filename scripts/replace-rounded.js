const fs = require('fs');
const path = require('path');

const srcDir = '/workspaces/jbalwikobra.com-digid/src';

function findTsxFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findTsxFiles(fullPath, files);
    } else if (item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

let totalFiles = 0;
let totalReplacements = 0;
const modifiedFiles = [];

const files = findTsxFiles(srcDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const matches = (content.match(/rounded-lg/g) || []).length;
  
  if (matches > 0) {
    const newContent = content.replace(/rounded-lg/g, 'rounded-xl');
    fs.writeFileSync(file, newContent, 'utf8');
    totalFiles++;
    totalReplacements += matches;
    modifiedFiles.push({ file: file.replace(srcDir, 'src'), count: matches });
  }
}

console.log('=== Design System Consistency Fix ===');
console.log(`Replaced 'rounded-lg' with 'rounded-xl'\n`);
console.log(`Total files modified: ${totalFiles}`);
console.log(`Total replacements: ${totalReplacements}\n`);
console.log('Modified files:');
modifiedFiles.forEach(f => {
  console.log(`  ${f.file}: ${f.count} replacement(s)`);
});
