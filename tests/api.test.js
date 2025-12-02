/**
 * Lightweight API endpoint verification tests.
 * Run with: npm test (requires adding "test" script to package.json)
 * Or manually: node tests/api.test.js
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';

// Test helper
async function fetch(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test suites
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// Tests
test('GET /api/health — should return 200', async () => {
  const res = await fetch('/api/health');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.ok) throw new Error('Missing "ok" in response');
});

test('GET /api/db-info — should return database tables', async () => {
  const res = await fetch('/api/db-info');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!Array.isArray(res.body?.tables)) throw new Error('Missing "tables" array');
});

test('GET /api/pages — should return pages list', async () => {
  const res = await fetch('/api/pages');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!Array.isArray(res.body?.pages)) throw new Error('Missing "pages" array');
});

test('GET /api/panoramas — should return panoramas list', async () => {
  const res = await fetch('/api/panoramas');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!Array.isArray(res.body?.panoramas)) throw new Error('Missing "panoramas" array');
});

test('GET /api/map-pages — should return map pages list', async () => {
  const res = await fetch('/api/map-pages');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!Array.isArray(res.body?.pages)) throw new Error('Missing "pages" array');
});

test('GET /api/spatial-files — should return spatial files list', async () => {
  const res = await fetch('/api/spatial-files');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!Array.isArray(res.body?.files)) throw new Error('Missing "files" array');
});

test('GET /api/settings — should return settings', async () => {
  const res = await fetch('/api/settings');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (typeof res.body?.settings !== 'object') throw new Error('Missing "settings" object');
});

test('GET /api/sidebar-buttons — should return sidebar buttons', async () => {
  const res = await fetch('/api/sidebar-buttons');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!Array.isArray(res.body?.buttons)) throw new Error('Missing "buttons" array');
});

test('POST /api/panoramas — should create a panorama', async () => {
  const res = await fetch('/api/panoramas', 'POST', {
    name: 'Test Panorama',
    image_url: '/test.jpg',
    description: 'Test description'
  });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!res.body?.panorama?.id) throw new Error('Missing panorama ID in response');
});

test('POST /api/map-pages — should create a map page', async () => {
  const res = await fetch('/api/map-pages', 'POST', {
    slug: 'test-map-' + Date.now(),
    title: 'Test Map Page',
    description: 'Test description',
    is_published: false
  });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!res.body?.page?.id) throw new Error('Missing page ID in response');
});

// Runner
async function runTests() {
  console.log(`Running ${tests.length} API tests...\n`);
  
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${err.message}`);
      failed++;
      failures.push({ name, error: err.message });
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`);
  if (failed > 0) {
    console.error(`\n${failed} test(s) failed:`);
    failures.forEach(({ name, error }) => {
      console.error(`  - ${name}: ${error}`);
    });
    process.exit(1);
  }
}

// Run if invoked directly
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
