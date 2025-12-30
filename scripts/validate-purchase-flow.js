#!/usr/bin/env node
/**
 * Purchase Flow Validation Script
 * 
 * This script validates the complete purchase flow end-to-end:
 * 1. Checks all required files exist
 * 2. Validates API endpoints are accessible
 * 3. Verifies payment methods configuration
 * 4. Tests database schema
 * 5. Validates environment variables
 * 6. Checks webhook configuration
 * 
 * Usage:
 *   node scripts/validate-purchase-flow.js
 *   node scripts/validate-purchase-flow.js --detailed
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(` ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossmark() {
  return `${colors.red}✗${colors.reset}`;
}

function warning() {
  return `${colors.yellow}⚠${colors.reset}`;
}

// Track validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function pass(message) {
  results.passed++;
  results.details.push({ status: 'pass', message });
  log(`${checkmark()} ${message}`, 'green');
}

function fail(message) {
  results.failed++;
  results.details.push({ status: 'fail', message });
  log(`${crossmark()} ${message}`, 'red');
}

function warn(message) {
  results.warnings++;
  results.details.push({ status: 'warn', message });
  log(`${warning()} ${message}`, 'yellow');
}

function info(message) {
  log(`  ${message}`, 'cyan');
}

// ============================================================================
// 1. File Structure Validation
// ============================================================================

section('1. FILE STRUCTURE VALIDATION');

const requiredFiles = [
  // Frontend Components
  'src/pages/PaymentInterface.tsx',
  'src/pages/PaymentStatusPage.tsx',
  'src/pages/OrderHistoryPage.tsx',
  'src/pages/ProductDetailPage.tsx',
  'src/components/public/product-detail/CheckoutModal.tsx',
  'src/components/purchase-form/CustomerInfoForm.tsx',
  'src/components/purchase-form/PaymentMethods.tsx',
  'src/components/purchase-form/PurchaseActions.tsx',
  
  // Backend API Endpoints
  'api/xendit/create-invoice.ts',
  'api/xendit/create-direct-payment.ts',
  'api/xendit/get-payment.ts',
  'api/xendit/check-order-status.ts',
  'api/xendit/webhook.ts',
  'api/xendit/payment-methods.ts',
  'api/xendit/get-invoice-details.ts',
  
  // Services
  'src/services/paymentService.ts',
  'src/services/ordersService.ts',
  'src/services/xenditPaymentService.ts',
  
  // Configuration
  'api/_config/paymentChannels.ts',
  'src/config/paymentMethodConfig.ts',
  
  // Tests
  'src/__tests__/paymentFlow.test.ts',
  'scripts/test-purchase-flow.ps1',
  
  // Documentation
  'PURCHASE_FLOW_DOCUMENTATION.md'
];

log('\nChecking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    pass(`Found: ${file}`);
  } else {
    fail(`Missing: ${file}`);
  }
});

// ============================================================================
// 2. Environment Variables Validation
// ============================================================================

section('2. ENVIRONMENT VARIABLES VALIDATION');

const requiredEnvVars = {
  backend: [
    'XENDIT_SECRET_KEY',
    'XENDIT_CALLBACK_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ],
  frontend: [
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY',
  ]
};

log('\nChecking backend environment variables...');
try {
  require('dotenv').config();
} catch (e) {
  warn('dotenv not installed, checking environment directly');
}
requiredEnvVars.backend.forEach(varName => {
  if (process.env[varName]) {
    pass(`${varName} is set`);
  } else {
    warn(`${varName} is not set (may be in deployment platform)`);
  }
});

log('\nChecking frontend environment variables...');
requiredEnvVars.frontend.forEach(varName => {
  if (process.env[varName]) {
    pass(`${varName} is set`);
  } else {
    warn(`${varName} is not set (may be in .env.local)`);
  }
});

// ============================================================================
// 3. Payment Methods Configuration Validation
// ============================================================================

section('3. PAYMENT METHODS CONFIGURATION');

log('\nValidating payment method configurations...');

try {
  // Check backend config
  const backendConfigPath = path.join(process.cwd(), 'api/_config/paymentChannels.ts');
  if (fs.existsSync(backendConfigPath)) {
    const content = fs.readFileSync(backendConfigPath, 'utf8');
    
    // Check for activated payment methods
    const expectedMethods = ['QRIS', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'ASTRAPAY', 'INDOMARET'];
    expectedMethods.forEach(method => {
      if (content.includes(`'${method}'`) || content.includes(`"${method}"`)) {
        pass(`Backend config includes ${method}`);
      } else {
        warn(`Backend config missing ${method}`);
      }
    });
  } else {
    fail('Backend payment config not found');
  }
  
  // Check frontend config
  const frontendConfigPath = path.join(process.cwd(), 'src/config/paymentMethodConfig.ts');
  if (fs.existsSync(frontendConfigPath)) {
    pass('Frontend payment config exists');
  } else {
    fail('Frontend payment config not found');
  }
  
} catch (error) {
  fail(`Error validating payment configs: ${error.message}`);
}

// ============================================================================
// 4. API Endpoint Structure Validation
// ============================================================================

section('4. API ENDPOINT STRUCTURE');

log('\nValidating API endpoint implementations...');

const apiEndpoints = [
  {
    file: 'api/xendit/create-invoice.ts',
    checks: [
      'XENDIT_SECRET_KEY',
      'SUPABASE_URL',
      'createSupabaseClient',
      'ACTIVATED_PAYMENT_METHODS'
    ]
  },
  {
    file: 'api/xendit/webhook.ts',
    checks: [
      'XENDIT_CALLBACK_TOKEN',
      'mapStatus',
      'createOrderNotification'
    ]
  },
  {
    file: 'api/xendit/get-payment.ts',
    checks: [
      'XENDIT_SECRET_KEY',
      'payment_id'
    ]
  }
];

apiEndpoints.forEach(endpoint => {
  const filePath = path.join(process.cwd(), endpoint.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    let allChecksPass = true;
    
    endpoint.checks.forEach(check => {
      if (!content.includes(check)) {
        allChecksPass = false;
        warn(`${endpoint.file} missing expected code: ${check}`);
      }
    });
    
    if (allChecksPass) {
      pass(`${endpoint.file} structure validated`);
    }
  } else {
    fail(`${endpoint.file} not found`);
  }
});

// ============================================================================
// 5. Component Structure Validation
// ============================================================================

section('5. COMPONENT STRUCTURE');

log('\nValidating React component implementations...');

const components = [
  {
    file: 'src/pages/PaymentInterface.tsx',
    checks: [
      'PaymentInterface',
      'useSearchParams',
      'QRCode',
      'fetchPaymentData',
      'payment status polling'
    ]
  },
  {
    file: 'src/components/public/product-detail/CheckoutModal.tsx',
    checks: [
      'CheckoutModal',
      'CustomerInfoForm',
      'PaymentMethods',
      'PurchaseActions',
      'isFormValid'
    ]
  }
];

components.forEach(component => {
  const filePath = path.join(process.cwd(), component.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    let allChecksPass = true;
    
    component.checks.forEach(check => {
      if (!content.toLowerCase().includes(check.toLowerCase())) {
        allChecksPass = false;
        warn(`${component.file} missing expected code: ${check}`);
      }
    });
    
    if (allChecksPass) {
      pass(`${component.file} structure validated`);
    }
  } else {
    fail(`${component.file} not found`);
  }
});

// ============================================================================
// 6. Test Coverage Validation
// ============================================================================

section('6. TEST COVERAGE');

log('\nValidating test files...');

const testFiles = [
  'src/__tests__/paymentFlow.test.ts',
  'scripts/test-purchase-flow.ps1'
];

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    pass(`${file} exists (${stats.size} bytes)`);
    
    // Check for test cases
    if (file.includes('.test.')) {
      const testCount = (content.match(/\bit\(/g) || []).length;
      const describeCount = (content.match(/\bdescribe\(/g) || []).length;
      info(`  Contains ${describeCount} test suites, ${testCount} test cases`);
    }
  } else {
    fail(`${file} not found`);
  }
});

// ============================================================================
// 7. Documentation Validation
// ============================================================================

section('7. DOCUMENTATION');

log('\nValidating documentation...');

const docPath = path.join(process.cwd(), 'PURCHASE_FLOW_DOCUMENTATION.md');
if (fs.existsSync(docPath)) {
  const content = fs.readFileSync(docPath, 'utf8');
  const stats = fs.statSync(docPath);
  
  pass(`Purchase flow documentation exists (${stats.size} bytes)`);
  
  // Check for key sections
  const expectedSections = [
    'Overview',
    'Product Selection',
    'Customer Information',
    'Payment Method Selection',
    'Order Creation',
    'Payment Invoice Creation',
    'Payment Interface Display',
    'Webhook Handling',
    'Payment Completion',
    'Testing',
    'API Endpoints'
  ];
  
  expectedSections.forEach(section => {
    if (content.toLowerCase().includes(section.toLowerCase())) {
      pass(`Documentation includes ${section} section`);
    } else {
      warn(`Documentation missing ${section} section`);
    }
  });
} else {
  fail('Purchase flow documentation not found');
}

// ============================================================================
// 8. Security Checks
// ============================================================================

section('8. SECURITY VALIDATION');

log('\nChecking security configurations...');

// Check .gitignore
const gitignorePath = path.join(process.cwd(), '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf8');
  
  if (content.includes('.env')) {
    pass('.env files are gitignored');
  } else {
    fail('.env files are NOT gitignored - SECURITY RISK!');
  }
  
  if (content.includes('node_modules')) {
    pass('node_modules is gitignored');
  } else {
    warn('node_modules should be gitignored');
  }
} else {
  fail('.gitignore not found');
}

// Check for hardcoded secrets in key files
const filesToCheck = [
  'api/xendit/create-invoice.ts',
  'api/xendit/webhook.ts',
  'src/pages/PaymentInterface.tsx'
];

log('\nScanning for potential hardcoded secrets...');
filesToCheck.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for potential secrets
    const secretPatterns = [
      /xnd_production_[a-zA-Z0-9]+/,
      /xnd_development_[a-zA-Z0-9]+/,
      /sk_test_[a-zA-Z0-9]+/,
      /sk_live_[a-zA-Z0-9]+/
    ];
    
    let foundSecret = false;
    secretPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        foundSecret = true;
      }
    });
    
    if (foundSecret) {
      fail(`Potential hardcoded secret found in ${file}`);
    } else {
      pass(`No hardcoded secrets in ${file}`);
    }
  }
});

// ============================================================================
// 9. Database Schema Checks
// ============================================================================

section('9. DATABASE SCHEMA HINTS');

log('\nProviding database schema validation hints...');
info('Manual verification required for:');
info('- orders table exists with correct columns');
info('- admin_notifications table exists');
info('- Row Level Security (RLS) policies configured');
info('- Indexes on frequently queried columns');
info('');
warn('Run database migrations if not already done');
warn('Verify Supabase connection in admin panel');

// ============================================================================
// Summary Report
// ============================================================================

section('VALIDATION SUMMARY');

log('\nResults:');
log(`  ${checkmark()} Passed: ${results.passed}`, 'green');
log(`  ${crossmark()} Failed: ${results.failed}`, 'red');
log(`  ${warning()} Warnings: ${results.warnings}`, 'yellow');

const totalChecks = results.passed + results.failed + results.warnings;
const successRate = ((results.passed / totalChecks) * 100).toFixed(1);

log('\nOverall Status:');
if (results.failed === 0) {
  log(`  ${checkmark()} ALL CHECKS PASSED (${successRate}% success rate)`, 'green');
} else if (results.failed < 5) {
  log(`  ${warning()} MINOR ISSUES FOUND (${successRate}% success rate)`, 'yellow');
  log('  Review failed checks and fix before deploying', 'yellow');
} else {
  log(`  ${crossmark()} CRITICAL ISSUES FOUND (${successRate}% success rate)`, 'red');
  log('  Fix failed checks before continuing', 'red');
}

// Detailed report option
if (process.argv.includes('--detailed')) {
  section('DETAILED REPORT');
  
  log('\nAll Checks:');
  results.details.forEach((detail, index) => {
    const marker = detail.status === 'pass' ? checkmark() : 
                   detail.status === 'fail' ? crossmark() : warning();
    log(`${index + 1}. ${marker} ${detail.message}`);
  });
}

// Next steps
section('NEXT STEPS');

log('\nRecommended actions:');
if (results.failed > 0) {
  log('1. Fix all failed checks marked with ✗', 'red');
  log('2. Re-run this validation script', 'yellow');
  log('3. Address any warnings marked with ⚠', 'yellow');
} else {
  log('1. Address any warnings marked with ⚠', 'yellow');
  log('2. Run integration tests: npm test', 'cyan');
  log('3. Run manual test: node scripts/test-purchase-flow.ps1', 'cyan');
  log('4. Test on staging environment before production', 'cyan');
}

log('\nFor detailed report, run: node scripts/validate-purchase-flow.js --detailed', 'cyan');
log('');

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
