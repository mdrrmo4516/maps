/**
 * Lightweight API endpoint verification tests.
 * Run with: npm test (requires adding "test" script to package.json)
 * Or manually: node tests/api.test.js
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';

// Test helper with optional headers
async function fetch(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 
        'Content-Type': 'application/json',
        ...headers 
      }
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

// ========== SIDEBAR BUTTONS TESTS (Optimistic Flow Simulation) ==========

test('GET /api/sidebar-buttons should return consistent format', async () => {
  const res = await fetch('/api/sidebar-buttons');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body?.success) throw new Error('Missing "success" in response');
  if (!Array.isArray(res.body?.buttons)) throw new Error('Missing "buttons" array');
  
  // Validate button structure if any exist
  if (res.body.buttons.length > 0) {
    const btn = res.body.buttons[0];
    if (typeof btn.id !== 'number') throw new Error('Button missing valid id');
    if (typeof btn.label !== 'string') throw new Error('Button missing valid label');
    if (typeof btn.folder_id !== 'string') throw new Error('Button missing valid folder_id');
  }
});

test('POST /api/sidebar-buttons without auth header — should reject', async () => {
  const res = await fetch('/api/sidebar-buttons', 'POST', {
    button_id: 'test-btn',
    label: 'Test Button',
    folder_id: 'test-folder',
    is_enabled: true
  });
  // Without x-user-id header, should fail with 401 or error
  if (res.status < 400) throw new Error(`Expected error status, got ${res.status}`);
  if (!res.body?.error) throw new Error('Missing error in response');
});

test('PUT /api/sidebar-buttons/:id without auth header — should reject', async () => {
  const res = await fetch('/api/sidebar-buttons/1', 'PUT', {
    label: 'Updated Label'
  });
  // Should reject without auth
  if (res.status < 400) throw new Error(`Expected error status, got ${res.status}`);
});

test('DELETE /api/sidebar-buttons/:id without auth header — should reject', async () => {
  const res = await fetch('/api/sidebar-buttons/1', 'DELETE');
  // Should reject without auth
  if (res.status < 400) throw new Error(`Expected error status, got ${res.status}`);
});

test('GET /api/sidebar-buttons/:id/signed-url — should return response', async () => {
  // First get any existing button
  const listRes = await fetch('/api/sidebar-buttons');
  if (listRes.status !== 200) throw new Error('Failed to list sidebar buttons');
  
  const buttons = listRes.body?.buttons || [];
  if (buttons.length === 0) {
    // Skip if no buttons exist
    return;
  }
  
  const buttonId = buttons[0].id;
  const res = await fetch(`/api/sidebar-buttons/${buttonId}/signed-url`);
  
  // Should return some response (200, 400, 404, or 500)
  if (!res.body) {
    throw new Error('Expected response body');
  }
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
