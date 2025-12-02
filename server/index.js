import express from 'express';
import { Client } from 'pg';
import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { 
  getUserByAuthId, 
  requirePermission, 
  requireAnyPermission,
  logAction 
} from './rbac-middleware.js';

dotenv.config();

// Validate essential environment variables at startup (fail-fast).
const REQUIRED_ENVS = [
  'DATABASE_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];
const missing = REQUIRED_ENVS.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('Please add them to your .env (see .env.example) and restart the server.');
  // Exit with failure so deploys/containers don't run in a broken state.
  process.exit(1);
}

// Warn about optional but useful environment variables.
const OPTIONAL_ENVS = {
  'GOOGLE_DRIVE_API_KEY': 'Google Drive image loader (optional)',
  'VITE_GOOGLE_DRIVE_API_KEY': 'Frontend Google Drive API key (optional)',
  'NODE_ENV': 'Deployment environment (default: development)'
};
const optionalWarnings = [];
Object.entries(OPTIONAL_ENVS).forEach(([key, desc]) => {
  if (!process.env[key]) {
    optionalWarnings.push(`  ⚠ ${key}: ${desc}`);
  }
});
if (optionalWarnings.length > 0) {
  console.log('ℹ Optional environment variables not set (features disabled):');
  optionalWarnings.forEach(msg => console.log(msg));
}

// Log startup config summary.
console.log('\n✅ Environment validation complete.');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Port: ${process.env.PORT || 3001}`);

const app = express();
app.use(express.json({ limit: '50mb' }));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.warn('⚠ DATABASE_URL not set — /api/query will return 500 until configured.');
} else {
  console.log('✓ DATABASE_URL configured (Supabase PostgreSQL)');
}

function getClient() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL not configured');
  return new Client({ connectionString: DATABASE_URL });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Fetch page content by type (login, admin)
app.get('/api/page', async (req, res) => {
  const { type } = req.query;
  if (!type) {
    return res.status(400).json({ error: 'Missing `type` query parameter' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT id, type, title, content FROM pages WHERE type = $1', [type]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Page type "${type}" not found` });
    }

    const page = result.rows[0];
    res.json({ success: true, page });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Page fetch error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update page content by type
app.put('/api/page/:type', requirePermission('manage_pages'), async (req, res) => {
  const { type } = req.params;
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Missing `title` or `content` in request body' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'UPDATE pages SET title = $1, content = $2, updated_at = NOW() WHERE type = $3 RETURNING *',
      [title, content, type]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Page type "${type}" not found` });
    }

    res.json({ success: true, page: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get all pages
app.get('/api/pages', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT id, type, title, created_at, updated_at FROM pages ORDER BY type');
    await client.end();
    res.json({ success: true, pages: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List pages error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get database info
app.get('/api/db-info', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const versionResult = await client.query('SELECT version()');
    const tablesResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    await client.end();

    const version = versionResult.rows[0].version.split(' ')[0];
    const tables = tablesResult.rows.map(r => r.table_name);

    res.json({
      success: true,
      version,
      tables,
      tableCount: tables.length
    });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('DB info error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// =====================
// MAP PAGES ENDPOINTS
// =====================

// Get all map pages
app.get('/api/map-pages', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'SELECT * FROM map_pages ORDER BY created_at DESC'
    );
    await client.end();
    res.json({ success: true, pages: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List map pages error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get single map page
app.get('/api/map-pages/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM map_pages WHERE id = $1', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map page not found' });
    }
    res.json({ success: true, page: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get map page error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Create map page
app.post('/api/map-pages', async (req, res) => {
  const { slug, title, description, is_published, layers, center_lat, center_lng, zoom_level } = req.body;
  if (!slug || !title) {
    return res.status(400).json({ error: 'Missing required fields: slug, title' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `INSERT INTO map_pages (slug, title, description, is_published, layers, center_lat, center_lng, zoom_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [slug, title, description || '', is_published || false, layers || [], center_lat || 13.0, center_lng || 123.5, zoom_level || 12]
    );
    await client.end();
    res.json({ success: true, page: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create map page error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update map page
app.put('/api/map-pages/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  const { slug, title, description, is_published, layers, center_lat, center_lng, zoom_level } = req.body;

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `UPDATE map_pages SET 
        slug = COALESCE($1, slug),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        is_published = COALESCE($4, is_published),
        layers = COALESCE($5, layers),
        center_lat = COALESCE($6, center_lat),
        center_lng = COALESCE($7, center_lng),
        zoom_level = COALESCE($8, zoom_level),
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [slug, title, description, is_published, layers, center_lat, center_lng, zoom_level, id]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map page not found' });
    }
    res.json({ success: true, page: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update map page error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete map page
app.delete('/api/map-pages/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('DELETE FROM map_pages WHERE id = $1 RETURNING id', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map page not found' });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Delete map page error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// =====================
// SPATIAL FILES ENDPOINTS
// =====================

// Get all spatial files
app.get('/api/spatial-files', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'SELECT id, filename, original_name, file_type, category, description, file_size, is_active, created_at, updated_at FROM spatial_files ORDER BY created_at DESC'
    );
    await client.end();
    res.json({ success: true, files: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List spatial files error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get single spatial file with GeoJSON data
app.get('/api/spatial-files/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM spatial_files WHERE id = $1', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spatial file not found' });
    }
    res.json({ success: true, file: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get spatial file error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Upload/Create spatial file
app.post('/api/spatial-files', async (req, res) => {
  const { filename, original_name, file_type, category, description, file_size, geojson_data } = req.body;
  if (!filename || !original_name || !file_type || !category) {
    return res.status(400).json({ error: 'Missing required fields: filename, original_name, file_type, category' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `INSERT INTO spatial_files (filename, original_name, file_type, category, description, file_size, geojson_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [filename, original_name, file_type, category, description || '', file_size || 0, geojson_data || null]
    );
    await client.end();
    res.json({ success: true, file: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create spatial file error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update spatial file
app.put('/api/spatial-files/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  const { category, description, is_active } = req.body;

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `UPDATE spatial_files SET 
        category = COALESCE($1, category),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [category, description, is_active, id]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spatial file not found' });
    }
    res.json({ success: true, file: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update spatial file error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete spatial file
app.delete('/api/spatial-files/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('DELETE FROM spatial_files WHERE id = $1 RETURNING id', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spatial file not found' });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Delete spatial file error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// =====================
// SETTINGS ENDPOINTS
// =====================

// Get all settings
app.get('/api/settings', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM user_settings ORDER BY setting_key');
    await client.end();

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({ success: true, settings });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get settings error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get single setting
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM user_settings WHERE setting_key = $1', [key]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ success: true, setting: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get setting error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update or create setting
app.put('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ error: 'Missing value in request body' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `INSERT INTO user_settings (setting_key, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = $2, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value)]
    );
    await client.end();
    res.json({ success: true, setting: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update setting error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Simple SQL query endpoint. POST preferred for longer queries.
app.post('/api/query', async (req, res) => {
  const { sql, params } = req.body || {};
  if (!sql) return res.status(400).json({ error: 'Missing `sql` in request body' });

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(sql, params || []);
    await client.end();
    res.json({ rows: result.rows, rowCount: result.rowCount });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Query error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// =====================
// SIDEBAR BUTTONS ENDPOINTS
// =====================

// Get all sidebar buttons
app.get('/api/sidebar-buttons', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'SELECT * FROM sidebar_buttons ORDER BY order_index, created_at'
    );
    await client.end();
    res.json({ success: true, buttons: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List sidebar buttons error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Create sidebar button
app.post('/api/sidebar-buttons', async (req, res) => {
  const { button_id, label, folder_id, source_type, is_enabled, order_index } = req.body;
  if (!button_id || !label || !folder_id) {
    return res.status(400).json({ error: 'Missing required fields: button_id, label, folder_id' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `INSERT INTO sidebar_buttons (button_id, label, folder_id, source_type, is_enabled, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [button_id, label, folder_id, source_type || 'drive', is_enabled !== false, order_index || 0]
    );
    await client.end();
    res.json({ success: true, button: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create sidebar button error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update sidebar button
app.put('/api/sidebar-buttons/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  const { button_id, label, folder_id, source_type, is_enabled, order_index } = req.body;

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `UPDATE sidebar_buttons SET 
        button_id = COALESCE($1, button_id),
        label = COALESCE($2, label),
        folder_id = COALESCE($3, folder_id),
        source_type = COALESCE($4, source_type),
        is_enabled = COALESCE($5, is_enabled),
        order_index = COALESCE($6, order_index),
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [button_id, label, folder_id, source_type, is_enabled, order_index, id]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sidebar button not found' });
    }
    res.json({ success: true, button: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update sidebar button error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete sidebar button
app.delete('/api/sidebar-buttons/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('DELETE FROM sidebar_buttons WHERE id = $1 RETURNING id', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sidebar button not found' });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Delete sidebar button error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// =====================
// PANORAMA ENDPOINTS
// =====================

// Get all panoramas
app.get('/api/panoramas', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'SELECT * FROM panoramas WHERE is_active = true ORDER BY order_index, created_at DESC'
    );
    await client.end();
    res.json({ success: true, panoramas: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List panoramas error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get all panoramas (admin - includes inactive)
app.get('/api/panoramas/admin', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'SELECT * FROM panoramas ORDER BY order_index, created_at DESC'
    );
    await client.end();
    res.json({ success: true, panoramas: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List panoramas (admin) error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get single panorama
app.get('/api/panoramas/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM panoramas WHERE id = $1', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panorama not found' });
    }
    res.json({ success: true, panorama: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get panorama error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Create panorama
app.post('/api/panoramas', async (req, res) => {
  const { name, description, image_url, thumbnail_url, is_active, order_index } = req.body;
  if (!name || !image_url) {
    return res.status(400).json({ error: 'Missing required fields: name, image_url' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `INSERT INTO panoramas (name, description, image_url, thumbnail_url, is_active, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description || '', image_url, thumbnail_url || image_url, is_active !== false, order_index || 0]
    );
    await client.end();
    res.json({ success: true, panorama: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create panorama error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update panorama
app.put('/api/panoramas/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  const { name, description, image_url, thumbnail_url, is_active, order_index } = req.body;

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `UPDATE panoramas SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        thumbnail_url = COALESCE($4, thumbnail_url),
        is_active = COALESCE($5, is_active),
        order_index = COALESCE($6, order_index),
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, image_url, thumbnail_url, is_active, order_index, id]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panorama not found' });
    }
    res.json({ success: true, panorama: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update panorama error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete panorama
app.delete('/api/panoramas/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('DELETE FROM panoramas WHERE id = $1 RETURNING id', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panorama not found' });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Delete panorama error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// If a production build exists in `dist/`, serve it as static files.
const distPath = path.join(process.cwd(), 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));

  // Serve index.html for non-API routes (SPA fallback).
  // Use a regex to avoid route parser issues with '*' patterns.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend API server listening on port ${port}`);
  if (existsSync(distPath)) {
    console.log(`Serving static frontend from ${distPath}`);
  }
});


// =====================
// INTERACTIVE MAP CONFIG ENDPOINTS
// =====================

// Get all map configs
app.get('/api/map-configs', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'SELECT * FROM interactive_map_configs ORDER BY created_at DESC'
    );
    await client.end();
    res.json({ success: true, configs: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List map configs error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get active map config
app.get('/api/map-configs/active', async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'SELECT * FROM interactive_map_configs WHERE is_active = true LIMIT 1'
    );
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active map config found' });
    }
    res.json({ success: true, config: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get active map config error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get single map config
app.get('/api/map-configs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM interactive_map_configs WHERE id = $1', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map config not found' });
    }
    res.json({ success: true, config: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get map config error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Create map config
app.post('/api/map-configs', async (req, res) => {
  const {
    config_name,
    description,
    default_center_lat,
    default_center_lng,
    default_zoom,
    max_zoom,
    min_zoom,
    tile_layer_url,
    tile_layer_attribution,
    enable_location_marker,
    enable_reference_circle,
    reference_circle_radius,
    reference_circle_color,
    allowed_file_types,
    max_file_size_mb,
    is_active
  } = req.body;

  if (!config_name) {
    return res.status(400).json({ error: 'Missing required field: config_name' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    
    // If setting as active, deactivate others
    if (is_active) {
      await client.query('UPDATE interactive_map_configs SET is_active = false');
    }
    
    const result = await client.query(
      `INSERT INTO interactive_map_configs (
        config_name, description, default_center_lat, default_center_lng,
        default_zoom, max_zoom, min_zoom, tile_layer_url, tile_layer_attribution,
        enable_location_marker, enable_reference_circle, reference_circle_radius,
        reference_circle_color, allowed_file_types, max_file_size_mb, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        config_name, description, default_center_lat, default_center_lng,
        default_zoom, max_zoom, min_zoom, tile_layer_url, tile_layer_attribution,
        enable_location_marker, enable_reference_circle, reference_circle_radius,
        reference_circle_color, allowed_file_types, max_file_size_mb, is_active
      ]
    );
    await client.end();
    res.json({ success: true, config: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create map config error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update map config
app.put('/api/map-configs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  
  const {
    config_name,
    description,
    default_center_lat,
    default_center_lng,
    default_zoom,
    max_zoom,
    min_zoom,
    tile_layer_url,
    tile_layer_attribution,
    enable_location_marker,
    enable_reference_circle,
    reference_circle_radius,
    reference_circle_color,
    allowed_file_types,
    max_file_size_mb,
    is_active
  } = req.body;

  let client;
  try {
    client = getClient();
    await client.connect();
    
    // If setting as active, deactivate others
    if (is_active) {
      await client.query('UPDATE interactive_map_configs SET is_active = false WHERE id != $1', [id]);
    }
    
    const result = await client.query(
      `UPDATE interactive_map_configs SET 
        config_name = COALESCE($1, config_name),
        description = COALESCE($2, description),
        default_center_lat = COALESCE($3, default_center_lat),
        default_center_lng = COALESCE($4, default_center_lng),
        default_zoom = COALESCE($5, default_zoom),
        max_zoom = COALESCE($6, max_zoom),
        min_zoom = COALESCE($7, min_zoom),
        tile_layer_url = COALESCE($8, tile_layer_url),
        tile_layer_attribution = COALESCE($9, tile_layer_attribution),
        enable_location_marker = COALESCE($10, enable_location_marker),
        enable_reference_circle = COALESCE($11, enable_reference_circle),
        reference_circle_radius = COALESCE($12, reference_circle_radius),
        reference_circle_color = COALESCE($13, reference_circle_color),
        allowed_file_types = COALESCE($14, allowed_file_types),
        max_file_size_mb = COALESCE($15, max_file_size_mb),
        is_active = COALESCE($16, is_active),
        updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        config_name, description, default_center_lat, default_center_lng,
        default_zoom, max_zoom, min_zoom, tile_layer_url, tile_layer_attribution,
        enable_location_marker, enable_reference_circle, reference_circle_radius,
        reference_circle_color, allowed_file_types, max_file_size_mb, is_active, id
      ]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map config not found' });
    }
    res.json({ success: true, config: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update map config error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete map config
app.delete('/api/map-configs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('DELETE FROM interactive_map_configs WHERE id = $1 RETURNING id', [id]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map config not found' });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Delete map config error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// =====================
// RBAC ENDPOINTS
// =====================

// Get current user info
app.get('/api/rbac/me', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await getUserByAuthId(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ success: true, user });
});

// Get all roles
app.get('/api/rbac/roles', requirePermission('manage_roles'), async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM roles ORDER BY name');
    await client.end();
    res.json({ success: true, roles: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List roles error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Create role
app.post('/api/rbac/roles', requirePermission('manage_roles'), async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name || !permissions) {
    return res.status(400).json({ error: 'Missing required fields: name, permissions' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', JSON.stringify(permissions)]
    );
    await client.end();

    await logAction(req.user.id, 'create_role', 'roles', { roleId: result.rows[0].id }, req.ip);
    res.json({ success: true, role: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create role error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update role
app.put('/api/rbac/roles/:id', requirePermission('manage_roles'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, description, permissions } = req.body;

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `UPDATE roles SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        permissions = COALESCE($3, permissions),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, description, permissions ? JSON.stringify(permissions) : null, id]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await logAction(req.user.id, 'update_role', 'roles', { roleId: id }, req.ip);
    res.json({ success: true, role: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update role error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get all users
app.get('/api/rbac/users', requirePermission('manage_users'), async (req, res) => {
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `SELECT u.*, r.name as role_name 
       FROM rbac_users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       ORDER BY u.created_at DESC`
    );
    await client.end();
    res.json({ success: true, users: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List users error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Create user
app.post('/api/rbac/users', requirePermission('manage_users'), async (req, res) => {
  const { email, name, role_id } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Missing required fields: email, name' });
  }

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      'INSERT INTO rbac_users (email, name, role_id) VALUES ($1, $2, $3) RETURNING *',
      [email, name, role_id || null]
    );
    await client.end();

    await logAction(req.user.id, 'create_user', 'rbac_users', { userId: result.rows[0].id }, req.ip);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create user error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update user
app.put('/api/rbac/users/:id', requirePermission('manage_users'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, role_id, is_active } = req.body;

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `UPDATE rbac_users SET 
        name = COALESCE($1, name),
        role_id = COALESCE($2, role_id),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, role_id, is_active, id]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAction(req.user.id, 'update_user', 'rbac_users', { userId: id }, req.ip);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update user error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get audit logs
app.get('/api/rbac/audit-logs', requirePermission('view_audit_logs'), async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `SELECT a.*, u.name as user_name, u.email as user_email 
       FROM audit_logs a 
       LEFT JOIN rbac_users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    await client.end();
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get audit logs error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// =====================
// MAP LAYERS ENDPOINTS
// =====================

// Get all map layers
app.get('/api/map-layers', async (req, res) => {
  const config_id = req.query.config_id ? parseInt(req.query.config_id) : null;
  
  let client;
  try {
    client = getClient();
    await client.connect();
    
    let query = 'SELECT * FROM map_layers';
    let params = [];
    
    if (config_id) {
      query += ' WHERE config_id = $1';
      params.push(config_id);
    }
    
    query += ' ORDER BY display_order ASC, created_at DESC';
    
    const result = await client.query(query, params);
    await client.end();
    res.json({ success: true, layers: result.rows });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('List map layers error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Get single map layer
app.get('/api/map-layers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('SELECT * FROM map_layers WHERE id = $1', [id]);
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    res.json({ success: true, layer: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Get map layer error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Create map layer
app.post('/api/map-layers', async (req, res) => {
  const {
    layer_name,
    description,
    file_type,
    file_data,
    original_filename,
    file_size,
    layer_color,
    is_visible,
    is_active,
    display_order,
    config_id
  } = req.body;
  
  if (!layer_name || !file_type || !file_data || !original_filename) {
    return res.status(400).json({ 
      error: 'Missing required fields: layer_name, file_type, file_data, original_filename' 
    });
  }
  
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query(
      `INSERT INTO map_layers (
        layer_name, description, file_type, file_data, original_filename,
        file_size, layer_color, is_visible, is_active, display_order, config_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        layer_name,
        description || '',
        file_type,
        JSON.stringify(file_data),
        original_filename,
        file_size || 0,
        layer_color || '#3b82f6',
        is_visible !== undefined ? is_visible : true,
        is_active !== undefined ? is_active : true,
        display_order || 0,
        config_id || null
      ]
    );
    await client.end();
    res.json({ success: true, layer: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Create map layer error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Update map layer
app.put('/api/map-layers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  
  const {
    layer_name,
    description,
    file_type,
    file_data,
    layer_color,
    is_visible,
    is_active,
    display_order,
    config_id
  } = req.body;
  
  let client;
  try {
    client = getClient();
    await client.connect();
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (layer_name !== undefined) {
      updates.push(`layer_name = $${paramCount++}`);
      values.push(layer_name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (file_type !== undefined) {
      updates.push(`file_type = $${paramCount++}`);
      values.push(file_type);
    }
    if (file_data !== undefined) {
      updates.push(`file_data = $${paramCount++}`);
      values.push(JSON.stringify(file_data));
    }
    if (layer_color !== undefined) {
      updates.push(`layer_color = $${paramCount++}`);
      values.push(layer_color);
    }
    if (is_visible !== undefined) {
      updates.push(`is_visible = $${paramCount++}`);
      values.push(is_visible);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramCount++}`);
      values.push(display_order);
    }
    if (config_id !== undefined) {
      updates.push(`config_id = $${paramCount++}`);
      values.push(config_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `UPDATE map_layers SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await client.query(query, values);
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    res.json({ success: true, layer: result.rows[0] });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Update map layer error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete map layer
app.delete('/api/map-layers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  
  let client;
  try {
    client = getClient();
    await client.connect();
    const result = await client.query('DELETE FROM map_layers WHERE id = $1 RETURNING id', [id]);
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }
    
    res.json({ success: true, message: 'Layer deleted' });
  } catch (err) {
    if (client) try { await client.end(); } catch {}
    console.error('Delete map layer error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
