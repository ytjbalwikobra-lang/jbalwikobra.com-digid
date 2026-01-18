// Script to remove unused AdminService class from adminService.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'services', 'adminService.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Original file: ${lines.length} lines`);

// Find the start of the class (line with "class AdminService {")
let classStartLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'class AdminService {') {
    classStartLine = i;
    break;
  }
}

if (classStartLine === -1) {
  console.log('❌ Could not find "class AdminService {" - class may already be removed');
  process.exit(0);
}

console.log(`✅ Found class start at line ${classStartLine + 1}`);

// Find the closing brace of the class by counting braces
let braceCount = 0;
let classEndLine = -1;
let foundOpenBrace = false;

for (let i = classStartLine; i < lines.length; i++) {
  const line = lines[i];
  
  // Count opening and closing braces
  for (const char of line) {
    if (char === '{') {
      braceCount++;
      foundOpenBrace = true;
    } else if (char === '}') {
      braceCount--;
      
      // If we've found the opening brace and count returns to 0, we've found the closing brace
      if (foundOpenBrace && braceCount === 0) {
        classEndLine = i;
        break;
      }
    }
  }
  
  if (classEndLine !== -1) break;
}

if (classEndLine === -1) {
  console.log('❌ Could not find closing brace for class');
  process.exit(1);
}

console.log(`✅ Found class end at line ${classEndLine + 1}`);
console.log(`📦 Class spans ${classEndLine - classStartLine + 1} lines`);

// Remove the class
const newLines = [
  ...lines.slice(0, classStartLine),
  ...lines.slice(classEndLine + 1)
];

console.log(`✂️  Removed lines ${classStartLine + 1}-${classEndLine + 1}`);
console.log(`📄 New file: ${newLines.length} lines (removed ${lines.length - newLines.length} lines)`);

// Write the modified content back
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');

console.log('✅ Successfully removed AdminService class!');
