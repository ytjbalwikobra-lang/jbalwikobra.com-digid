#!/usr/bin/env node

/**
 * Cache Egress Monitoring Script
 * 
 * This script helps monitor the effectiveness of cache optimizations
 * by checking response headers and providing recommendations.
 * 
 * Usage:
 *   node scripts/monitor-cache-egress.js <base-url>
 * 
 * Example:
 *   node scripts/monitor-cache-egress.js https://jbalwikobra.com
 */

const https = require('https');
const http = require('http');

// API endpoints to check
const ENDPOINTS = [
  { path: '/api/admin?action=dashboard-stats', expectedCache: 60, name: 'Dashboard Stats' },
  { path: '/api/admin?action=products&page=1&limit=20', expectedCache: 300, name: 'Products List' },
  { path: '/api/admin?action=orders&page=1&limit=20', expectedCache: 60, name: 'Orders List' },
  { path: '/api/admin?action=users&page=1&limit=20', expectedCache: 120, name: 'Users List' },
  { path: '/api/admin?action=settings', expectedCache: 600, name: 'Settings' },
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEndpoint(baseUrl, endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(url, (res) => {
      const cacheControl = res.headers['cache-control'];
      const contentLength = res.headers['content-length'];
      const etag = res.headers['etag'];

      // Parse max-age from cache-control
      let maxAge = null;
      if (cacheControl) {
        const match = cacheControl.match(/max-age=(\d+)/);
        if (match) {
          maxAge = parseInt(match[1], 10);
        }
      }

      const result = {
        name: endpoint.name,
        path: endpoint.path,
        statusCode: res.statusCode,
        cacheControl,
        maxAge,
        expectedCache: endpoint.expectedCache,
        contentLength: contentLength ? parseInt(contentLength, 10) : null,
        hasETag: !!etag,
      };

      // Consume response to free up memory
      res.on('data', () => {});
      res.on('end', () => resolve(result));
    });

    req.on('error', (error) => {
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        error: error.message,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        error: 'Request timeout',
      });
    });
  });
}

async function analyzeResults(results) {
  log('\n📊 Cache Optimization Analysis', 'bright');
  log('═'.repeat(70), 'blue');

  let totalIssues = 0;
  let totalSuccess = 0;

  for (const result of results) {
    log(`\n${result.name}`, 'bright');
    log(`  Path: ${result.path}`);

    if (result.error) {
      log(`  ❌ Error: ${result.error}`, 'red');
      totalIssues++;
      continue;
    }

    log(`  Status: ${result.statusCode}`);

    // Check cache headers
    if (!result.cacheControl) {
      log('  ❌ No Cache-Control header found', 'red');
      totalIssues++;
    } else if (result.maxAge === null) {
      log(`  ⚠️  Cache-Control present but no max-age: ${result.cacheControl}`, 'yellow');
      totalIssues++;
    } else if (result.maxAge === 0) {
      log('  ℹ️  No caching (expected for sensitive data)', 'blue');
    } else if (result.maxAge !== result.expectedCache) {
      log(`  ⚠️  Cache duration: ${result.maxAge}s (expected: ${result.expectedCache}s)`, 'yellow');
      totalIssues++;
    } else {
      log(`  ✅ Cache duration: ${result.maxAge}s`, 'green');
      totalSuccess++;
    }

    // Check response size
    if (result.contentLength) {
      const sizeKB = (result.contentLength / 1024).toFixed(2);
      log(`  📦 Response size: ${sizeKB} KB`);
      
      if (result.contentLength > 100 * 1024) {
        log('  ⚠️  Large response size (>100KB) - consider pagination', 'yellow');
      }
    }

    // Check ETag
    if (result.hasETag) {
      log('  ✅ ETag present for conditional requests', 'green');
    }
  }

  // Summary
  log('\n' + '═'.repeat(70), 'blue');
  log('Summary:', 'bright');
  log(`  ✅ Optimized endpoints: ${totalSuccess}/${results.length}`, 'green');
  
  if (totalIssues > 0) {
    log(`  ⚠️  Issues found: ${totalIssues}`, 'yellow');
  } else {
    log('  🎉 All endpoints properly optimized!', 'green');
  }

  // Recommendations
  log('\n💡 Recommendations:', 'bright');
  
  const issueEndpoints = results.filter(r => !r.cacheControl || r.maxAge !== r.expectedCache);
  if (issueEndpoints.length > 0) {
    log('  • Review cache headers for the following endpoints:');
    issueEndpoints.forEach(e => log(`    - ${e.name}`));
  }

  const largeResponses = results.filter(r => r.contentLength && r.contentLength > 100 * 1024);
  if (largeResponses.length > 0) {
    log('  • Consider optimizing these large responses:');
    largeResponses.forEach(e => log(`    - ${e.name} (${(e.contentLength / 1024).toFixed(2)} KB)`));
  }

  if (totalIssues === 0) {
    log('  • Continue monitoring egress metrics in Supabase dashboard');
    log('  • Set up alerts for egress increases >10%');
  }
}

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';

  log('🔍 Cache Egress Monitoring Tool', 'bright');
  log(`Testing endpoints at: ${baseUrl}\n`);

  log('Checking endpoints...', 'blue');
  
  const results = await Promise.all(
    ENDPOINTS.map(endpoint => checkEndpoint(baseUrl, endpoint))
  );

  await analyzeResults(results);

  log('\n✨ Done!\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { checkEndpoint, analyzeResults };
