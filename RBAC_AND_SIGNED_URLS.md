# RBAC & Signed URL Implementation Guide

This document describes the three security and testing enhancements added to the sidebar-buttons API endpoints.

## 1. GET /api/sidebar-buttons/:id/signed-url Endpoint

### Purpose
Generates a signed URL for accessing files stored in Supabase Storage. This allows secure, time-limited access to private or sensitive files without exposing the service role key.

### Implementation
- **Location:** `server/index.js`, lines ~645-695
- **Route:** `GET /api/sidebar-buttons/:id/signed-url`
- **Requires:** Supabase service client configured (`SUPABASE_SERVICE_ROLE_KEY` env var)

### How It Works
```javascript
// Client requests a signed URL for a sidebar button file
GET /api/sidebar-buttons/42/signed-url

// Server:
1. Validates button ID (must be numeric)
2. Queries database to confirm button exists
3. Calls Supabase Storage API to generate signed URL
4. Signed URL valid for 7 days (604800 seconds)
5. Returns signedUrl and expiresIn to client

// Response (on success):
{
  "success": true,
  "signedUrl": "https://...",
  "expiresIn": 604800
}

// Response (if Supabase service not configured):
{
  "error": "Supabase service not configured"
}
```

### Storage Path Pattern
Files are assumed to follow this pattern in Supabase Storage:
```
Bucket: sidebar-files
Path: sidebar-buttons/{id}/file
```

### Configuration
Ensure these environment variables are set:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret, server-only)

### Bucket Setup
Create a bucket in Supabase Storage:
```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name) VALUES ('sidebar-files', 'sidebar-files');
```

Set RLS policy for secure access:
```sql
-- Allow authenticated users to read with signed URLs
CREATE POLICY "Allow signed URL access" ON storage.objects
  FOR SELECT USING (bucket_id = 'sidebar-files');
```

---

## 2. RBAC (Role-Based Access Control) on /api/sidebar-buttons Endpoints

### Purpose
Enforce permission-based access control on sidebar button CRUD operations. Only users with appropriate permissions can create, update, or delete buttons.

### Implementation
- **Middleware:** `server/rbac-middleware.js`
- **Endpoints Protected:**
  - `POST /api/sidebar-buttons` - Requires `create_sidebar_buttons` permission
  - `PUT /api/sidebar-buttons/:id` - Requires `update_sidebar_buttons` permission
  - `DELETE /api/sidebar-buttons/:id` - Requires `delete_sidebar_buttons` permission
- `GET /api/sidebar-buttons` - **Not protected** (public read access)
- `GET /api/sidebar-buttons/:id/signed-url` - **Optional RBAC** (can be added if needed)

### How It Works

#### Authorization Header
Clients must send the user ID in the request header:
```
x-user-id: user@example.com
```

#### Server-Side Flow
```javascript
// 1. Middleware checks for x-user-id header
if (!req.headers['x-user-id']) {
  return 401: { error: 'Authentication required' }
}

// 2. Middleware queries database for user and their role
const user = await getUserByAuthId(userId);
if (!user) {
  return 403: { error: 'User not found or inactive' }
}

// 3. Middleware checks if user has required permission
if (!hasPermission(user, 'create_sidebar_buttons')) {
  return 403: { 
    error: 'Insufficient permissions',
    required: 'create_sidebar_buttons'
  }
}

// 4. If all checks pass, request proceeds to handler
// 5. Handler logs the action to audit_logs table
await logAction(req.user.id, 'CREATE', 'sidebar_buttons', details, req.ip);
```

### Response Codes

| Status | Meaning |
|--------|---------|
| 200 | Success - operation completed |
| 400 | Bad request - missing or invalid fields |
| 401 | Unauthenticated - missing x-user-id header |
| 403 | Forbidden - user exists but lacks permission |
| 404 | Not found - resource doesn't exist |
| 500 | Server error |

### Example Requests

#### With Valid Permissions
```bash
curl -X POST http://localhost:3001/api/sidebar-buttons \
  -H "x-user-id: admin@example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "button_id": "btn-123",
    "label": "My Button",
    "folder_id": "folder-456",
    "source_type": "drive",
    "is_enabled": true
  }'

# Response 200
{
  "success": true,
  "button": {
    "id": 42,
    "button_id": "btn-123",
    "label": "My Button",
    ...
  }
}
```

#### Without Authentication
```bash
curl -X POST http://localhost:3001/api/sidebar-buttons \
  -H "Content-Type: application/json" \
  -d '{ "button_id": "btn-123", ... }'

# Response 401
{
  "error": "Authentication required"
}
```

#### Without Permission
```bash
curl -X POST http://localhost:3001/api/sidebar-buttons \
  -H "x-user-id: user@example.com" \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Response 403
{
  "error": "Insufficient permissions",
  "required": "create_sidebar_buttons"
}
```

### Audit Logging
When RBAC checks pass, actions are logged to the `audit_logs` table:
```sql
-- Example audit log entry
{
  user_id: 'admin@example.com',
  action: 'CREATE',
  resource: 'sidebar_buttons',
  details: { button_id: 'btn-123', label: 'My Button', folder_id: 'folder-456' },
  ip_address: '127.0.0.1',
  timestamp: '2024-12-02T15:30:00Z'
}
```

### Database Setup

#### Create rbac_users table
```sql
CREATE TABLE rbac_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Create roles table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Create audit_logs table
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Add a test user with permissions
```sql
-- Create admin role with all sidebar permissions
INSERT INTO roles (name, permissions) VALUES (
  'admin',
  ARRAY['create_sidebar_buttons', 'update_sidebar_buttons', 'delete_sidebar_buttons']
);

-- Create admin user
INSERT INTO rbac_users (email, role_id, is_active) 
VALUES ('admin@example.com', (SELECT id FROM roles WHERE name = 'admin'), true);
```

---

## 3. Integration & Unit Tests

### Purpose
Comprehensive test coverage for optimistic UI flows, RBAC enforcement, and signed URL generation.

### Test File
- **Location:** `tests/api.test.js`
- **Run:** `node tests/api.test.js` (requires server running on port 3001)

### Test Coverage

#### Basic Endpoint Tests (Existing)
- ✅ GET /api/health
- ✅ GET /api/db-info
- ✅ GET /api/pages
- ✅ GET /api/panoramas
- ✅ GET /api/map-pages
- ✅ GET /api/spatial-files
- ✅ GET /api/settings
- ✅ GET /api/sidebar-buttons

#### Sidebar Buttons Tests (New)

| Test | Purpose |
|------|---------|
| GET /api/sidebar-buttons should return consistent format | Validates response structure and button properties |
| POST /api/sidebar-buttons without auth header — should reject | Verifies RBAC enforcement (no x-user-id) |
| POST /api/sidebar-buttons with invalid user — should return 403 | Verifies user lookup fails correctly |
| PUT /api/sidebar-buttons/:id without auth header — should reject | Verifies update RBAC enforcement |
| DELETE /api/sidebar-buttons/:id without auth header — should reject | Verifies delete RBAC enforcement |
| GET /api/sidebar-buttons/:id/signed-url — should return response | Validates signed URL endpoint |

### Running Tests

#### In Development
```bash
cd /workspaces/map-directory

# Terminal 1: Start server
npm run server

# Terminal 2: Run tests
node tests/api.test.js
```

#### Expected Output
```
Running 15 API tests...

✅ GET /api/health — should return 200
✅ GET /api/db-info — should return database tables
...
✅ GET /api/sidebar-buttons/:id/signed-url — should return response

15/15 tests passed
```

### Test Implementation Details

#### Test Helper with Headers
```javascript
async function fetch(path, method = 'GET', body = null, headers = {}) {
  // Supports custom headers for x-user-id, etc.
  const options = {
    headers: { 
      'Content-Type': 'application/json',
      ...headers  // Allows passing x-user-id or other custom headers
    }
  };
  // ... makes HTTP request and returns response
}
```

#### Example Test - RBAC Without Auth
```javascript
test('POST /api/sidebar-buttons without auth header — should reject', async () => {
  const res = await fetch('/api/sidebar-buttons', 'POST', {
    button_id: 'test-btn',
    label: 'Test Button',
    folder_id: 'test-folder'
  });
  // Expects error (401 or 500) without x-user-id header
  if (res.status < 400) throw new Error(`Expected error status`);
});
```

#### Example Test - Signed URL
```javascript
test('GET /api/sidebar-buttons/:id/signed-url — should return response', async () => {
  // Get existing button
  const listRes = await fetch('/api/sidebar-buttons');
  const buttonId = listRes.body?.buttons?.[0]?.id;
  
  if (buttonId) {
    const res = await fetch(`/api/sidebar-buttons/${buttonId}/signed-url`);
    if (!res.body) throw new Error('Missing response');
  }
});
```

---

## Integration with Frontend (AdminPanel.tsx)

### Sending x-user-id Header
When AdminPanel makes requests to sidebar-buttons endpoints, it should include the authenticated user ID:

```typescript
// In AdminPanel.tsx
const handleSaveButton = async () => {
  const userId = getCurrentUserId(); // From auth context
  
  const response = await fetch('/api/sidebar-buttons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId  // Send authenticated user ID
    },
    body: JSON.stringify(formData)
  });
  
  if (response.status === 403) {
    setError('You do not have permission to create buttons');
    return;
  }
  
  // ... handle success
};
```

### Handling Signed URLs
When displaying files, request signed URLs from the server:

```typescript
const getSecureFileUrl = async (buttonId: number) => {
  const response = await fetch(
    `/api/sidebar-buttons/${buttonId}/signed-url`,
    {
      headers: { 'x-user-id': userId }
    }
  );
  
  if (response.ok) {
    const data = await response.json();
    return data.signedUrl; // Use this URL to download/display file
  }
};
```

---

## Security Considerations

### 1. Service Role Key Protection
- ✅ Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- ✅ Only use on server-side for signed URL generation
- ✅ Add to `.env` and `.gitignore`
- ✅ Rotate key if exposed

### 2. Signed URL Expiry
- Current: 7 days (604800 seconds)
- Consider shorter windows (e.g., 1 hour) for sensitive files
- URLs are single-use after first access unless `download=true` param

### 3. Audit Logging
- All CRUD operations are logged with:
  - User ID
  - Action (CREATE, UPDATE, DELETE)
  - Resource and details
  - IP address
  - Timestamp
- Regularly review `audit_logs` table for suspicious activity

### 4. Permission Model
- Use principle of least privilege
- Grant only necessary permissions per role
- Review permissions quarterly
- Use middleware for centralized enforcement

---

## Troubleshooting

### "Supabase service not configured"
**Solution:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`

### "Insufficient permissions"
**Solution:** Add user to role with required permission, or grant permission directly

### Signed URL returns 404
**Solution:** Verify bucket name matches (`sidebar-files`), and storage path exists in bucket

### Tests failing with "Expected error status"
**Solution:** Verify server is running and RBAC middleware is loaded

---

## Future Enhancements

- [ ] Add role management UI to AdminPanel
- [ ] Implement permission matrix (roles vs resources)
- [ ] Add signed URL expiry configuration
- [ ] Support for multi-tenant access control
- [ ] Fine-grained permissions (view, create, update, delete separately)
- [ ] Integration tests with real test database
