/**
 * Test script to verify shared admin UI components exist and are properly exported
 */

console.log('🧪 Testing Shared Admin UI Components\n');

const fs = require('fs');
const path = require('path');

const testResults = [];

function test(name, fn) {
  try {
    fn();
    testResults.push({ name, status: '✅ PASS' });
  } catch (error) {
    testResults.push({ name, status: `❌ FAIL: ${error.message}` });
  }
}

// Check component files
const componentsDir = path.join(__dirname, '../../src/pages/admin/components/ui');

test('AdminLoadingState.tsx exists', () => {
  const file = path.join(componentsDir, 'AdminLoadingState.tsx');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('export const AdminLoadingState')) {
    throw new Error('AdminLoadingState component not exported');
  }
});

test('AdminEmptyState.tsx exists', () => {
  const file = path.join(componentsDir, 'AdminEmptyState.tsx');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('export const AdminEmptyState')) {
    throw new Error('AdminEmptyState component not exported');
  }
});

test('AdminErrorState.tsx exists', () => {
  const file = path.join(componentsDir, 'AdminErrorState.tsx');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('export const AdminErrorState')) {
    throw new Error('AdminErrorState component not exported');
  }
});

test('Components are exported from index.ts', () => {
  const indexFile = path.join(componentsDir, 'index.ts');
  if (!fs.existsSync(indexFile)) throw new Error('index.ts not found');
  const content = fs.readFileSync(indexFile, 'utf8');
  
  if (!content.includes('AdminLoadingState')) {
    throw new Error('AdminLoadingState not in index exports');
  }
  if (!content.includes('AdminEmptyState')) {
    throw new Error('AdminEmptyState not in index exports');
  }
  if (!content.includes('AdminErrorState')) {
    throw new Error('AdminErrorState not in index exports');
  }
});

// Check that admin pages are using the shared components
const pagesDir = path.join(__dirname, '../../src/pages/admin');

test('AdminProductsDirect.tsx uses shared components', () => {
  const file = path.join(pagesDir, 'AdminProductsDirect.tsx');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  
  const hasImport = content.includes('AdminLoadingState') || 
                    content.includes('AdminEmptyState') || 
                    content.includes('AdminErrorState');
  if (!hasImport) {
    throw new Error('Page does not import shared components');
  }
});

test('AdminOrdersV2.tsx uses shared components', () => {
  const file = path.join(pagesDir, 'AdminOrdersV2.tsx');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  
  const hasImport = content.includes('AdminLoadingState') || 
                    content.includes('AdminEmptyState') || 
                    content.includes('AdminErrorState');
  if (!hasImport) {
    throw new Error('Page does not import shared components');
  }
});

test('AdminUsersV2.tsx uses shared components', () => {
  const file = path.join(pagesDir, 'AdminUsersV2.tsx');
  if (!fs.existsSync(file)) throw new Error('File not found');
  const content = fs.readFileSync(file, 'utf8');
  
  const hasImport = content.includes('AdminLoadingState') || 
                    content.includes('AdminEmptyState') || 
                    content.includes('AdminErrorState');
  if (!hasImport) {
    throw new Error('Page does not import shared components');
  }
});

// Print results
console.log('='.repeat(60));
console.log('TEST RESULTS:');
console.log('='.repeat(60));

testResults.forEach(result => {
  console.log(`${result.status} ${result.name}`);
});

const passed = testResults.filter(r => r.status.includes('PASS')).length;
const failed = testResults.filter(r => r.status.includes('FAIL')).length;

console.log('='.repeat(60));
console.log(`📊 Summary: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Some tests failed. Please review the changes.');
  process.exit(1);
} else {
  console.log('✅ All tests passed! Shared UI components are properly integrated.');
  process.exit(0);
}
