/**
 * Test script to verify adminService works after refactoring
 * Tests that all critical methods are available and properly structured
 */

console.log('🧪 Testing Admin Service After Refactoring\n');

// Simulate importing the service (we'll check structure, not actually run queries)
const testResults = [];

function test(name, fn) {
  try {
    fn();
    testResults.push({ name, status: '✅ PASS' });
  } catch (error) {
    testResults.push({ name, status: `❌ FAIL: ${error.message}` });
  }
}

// Read the adminService.ts file to verify structure
const fs = require('fs');
const path = require('path');
const serviceFile = path.join(__dirname, '../../src/services/adminService.ts');
const content = fs.readFileSync(serviceFile, 'utf8');

test('File exists and is readable', () => {
  if (!content) throw new Error('Could not read file');
});

test('Single export const adminService declaration', () => {
  const matches = content.match(/export const adminService\s*=/g);
  if (!matches || matches.length !== 1) {
    throw new Error(`Found ${matches ? matches.length : 0} exports, expected 1`);
  }
});

test('No AdminService class present', () => {
  if (content.match(/class AdminService\s*{/)) {
    throw new Error('AdminService class should have been removed');
  }
});

test('updateProductFields method exists', () => {
  if (!content.includes('async updateProductFields')) {
    throw new Error('updateProductFields method not found');
  }
});

test('toggleProductActive method exists', () => {
  if (!content.includes('async toggleProductActive')) {
    throw new Error('toggleProductActive method not found');
  }
});

test('deleteProduct method exists', () => {
  if (!content.includes('async deleteProduct')) {
    throw new Error('deleteProduct method not found');
  }
});

test('completeOrder method exists', () => {
  if (!content.includes('async completeOrder')) {
    throw new Error('completeOrder method not found');
  }
});

test('getAdminStats method exists', () => {
  if (!content.includes('async getAdminStats')) {
    throw new Error('getAdminStats method not found');
  }
});

test('getOrders method exists', () => {
  if (!content.includes('async getOrders')) {
    throw new Error('getOrders method not found');
  }
});

test('getUsers method exists', () => {
  if (!content.includes('async getUsers')) {
    throw new Error('getUsers method not found');
  }
});

test('getProducts method exists', () => {
  if (!content.includes('async getProducts')) {
    throw new Error('getProducts method not found');
  }
});

test('File size reduction (should be ~2,100-2,200 lines)', () => {
  const lines = content.split('\n').length;
  if (lines > 2300 || lines < 2000) {
    throw new Error(`File has ${lines} lines, expected ~2,100-2,200 after cleanup`);
  }
  console.log(`   📊 File has ${lines} lines`);
});

// Print results
console.log('\n' + '='.repeat(60));
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
  console.log('✅ All tests passed! Admin service refactoring is successful.');
  process.exit(0);
}
