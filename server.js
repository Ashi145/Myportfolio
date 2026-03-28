// ─────────────────────────────────────────────────────────────
//  KYEYUNE ASHIRAF PORTFOLIO — Backend Server
//  Node.js · No external dependencies (built-ins only)
//  Run:  node server.js
//  Default port: 3000  (override with PORT env variable)
// ─────────────────────────────────────────────────────────────

const http     = require('http');
const fs       = require('fs');
const fsp      = fs.promises;
const path     = require('path');
const url      = require('url');
const crypto   = require('crypto');

const PORT     = process.env.PORT || 3000;
const DB_FILE  = path.join(__dirname, 'data', 'db.json');
const CV_FILE  = path.join(__dirname, 'Kyeyune_Ashiraf_CV.pdf');
const LOG_FILE = path.join(__dirname, 'data', 'access.log');

// ─── MIME TYPES ───────────────────────────────────────────────
const MIME = {
  '.html'  : 'text/html; charset=utf-8',
  '.css'   : 'text/css',
  '.js'    : 'application/javascript',
  '.json'  : 'application/json',
  '.pdf'   : 'application/pdf',
  '.png'   : 'image/png',
  '.jpg'   : 'image/jpeg',
  '.jpeg'  : 'image/jpeg',
  '.svg'   : 'image/svg+xml',
  '.ico'   : 'image/x-icon',
  '.woff'  : 'font/woff',
  '.woff2' : 'font/woff2',
  '.ttf'   : 'font/ttf',
  '.otf'   : 'font/otf',
  '.txt'   : 'text/plain; charset=utf-8',
};

// ─── BOOTSTRAP DATA FILES ─────────────────────────────────────
async function bootstrap() {
  const dirs = ['data', 'assets'];
  for (const d of dirs) {
    const p = path.join(__dirname, d);
    try {
      if (!fs.existsSync(p)) await fsp.mkdir(p, { recursive: true });
    } catch (err) {
      console.error(`Error creating directory ${p}:`, err);
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      stats: {
        totalVisits   : 0,
        uniqueVisitors: 0,
        contactForms  : 0,
        cvDownloads   : 0,
      },
      visitors: {},          // ip hash → last seen ISO string
      messages: [],          // contact form submissions
      projectViews: {        // project id → view count
        p1: 0, p2: 0, p3: 0, p4: 0, p5: 0
      },
      lastUpdated: new Date().toISOString()
    };
    await saveDB(initial);
    console.log('✔  Created fresh database at', DB_FILE);
  }

  // Create placeholder CV if none exists
  if (!fs.existsSync(CV_FILE)) {
    try {
      await fsp.writeFile(CV_FILE, '%PDF-1.4 placeholder — replace with real CV');
      console.log('✔  Placeholder CV created at', CV_FILE);
    } catch (err) {
      console.error('Error creating placeholder CV:', err);
    }
  }
}

// ─── DB HELPERS ───────────────────────────────────────────────
async function loadDB() {
  try {
    const data = await fsp.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('DB Load Error:', err.message);
    return null;
  }
}

async function saveDB(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    await fsp.writeFile(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('DB Save Error:', err.message);
  }
}

// ─── LOGGING ─────────────────────────────────────────────────
async function logAccess(req, statusCode) {
  const line = `[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.url} — ${req.headers['user-agent'] || '-'}\n`;
  try {
    await fsp.appendFile(LOG_FILE, line);
  } catch (err) {
    // Ignore logging errors to prevent server crash
  }
}

// ─── BODY PARSER ─────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 100000) { // Increased limit for larger messages if needed
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ─── RESPONSE HELPERS ────────────────────────────────────────
function send(res, status, data, contentType = 'application/json') {
  const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin' : '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  });
  res.end(body);
}

async function sendHTML(res, filePath) {
  try {
    const data = await fsp.readFile(filePath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  } catch (err) {
    send(res, 404, { error: 'Not found' });
  }
}

// ─── VALIDATION ──────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

function sanitize(str, maxLen = 500) {
  return String(str || '').trim().slice(0, maxLen)
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── ADMIN AUTH ───────────────────────────────────────────────
// Set ADMIN_TOKEN env variable to secure the /admin/* routes.
// Default token shown in console on start — CHANGE IN PRODUCTION.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(16).toString('hex');

function isAdmin(req) {
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

// ─── VISIT TRACKING ───────────────────────────────────────────
async function trackVisit(req) {
  const db = await loadDB();
  if (!db) return;

  const ipRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ipHash = crypto.createHash('sha256').update(ipRaw).digest('hex').slice(0, 16);

  db.stats.totalVisits++;

  const now = new Date();
  const prev = db.visitors[ipHash];
  if (!prev) {
    db.stats.uniqueVisitors++;
    db.visitors[ipHash] = now.toISOString();
  } else {
    // Count as unique again if last visit was >24 h ago
    if ((now - new Date(prev)) > 86400000) {
      db.stats.uniqueVisitors++;
      db.visitors[ipHash] = now.toISOString();
    }
  }

  await saveDB(db);
}

// ─── ROUTES ───────────────────────────────────────────────────
const ROUTES = {

  // ── GET /admin — Serve the admin dashboard ────────────
  'GET /admin': async (req, res) => {
    const adminPath = path.join(__dirname, 'admin.html');
    await sendHTML(res, adminPath);
  },

  // ── GET / — Serve the portfolio HTML ──────────────────────
  'GET /': async (req, res) => {
    await trackVisit(req);
    const htmlPath = path.join(__dirname, 'index.html');
    await sendHTML(res, htmlPath);
  },

  // ── POST /api/contact — Contact form submission ───────────
  'POST /api/contact': async (req, res) => {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (err) {
      return send(res, 400, { error: 'Invalid JSON body' });
    }

    const { name, email, subject, message, budget, timeline } = body;

    // Validate required fields
    const errors = [];
    if (!name || String(name).trim().length < 2) errors.push('name: must be at least 2 characters');
    if (!email || !validateEmail(email)) errors.push('email: invalid email address');
    if (!message || String(message).trim().length < 10) errors.push('message: must be at least 10 characters');

    if (errors.length) return send(res, 422, { error: 'Validation failed', details: errors });

    const db = await loadDB();
    if (!db) return send(res, 500, { error: 'Database unavailable' });

    const entry = {
      id         : crypto.randomBytes(8).toString('hex'),
      name       : sanitize(name, 100),
      email      : sanitize(email, 200),
      subject    : sanitize(subject, 200) || 'No subject',
      message    : sanitize(message, 5000), // Increased slightly for comfort
      budget     : sanitize(budget, 100) || null,
      timeline   : sanitize(timeline, 100) || null,
      ip_hash    : crypto.createHash('sha256')
                     .update(req.socket.remoteAddress || '')
                     .digest('hex').slice(0, 16),
      received_at: new Date().toISOString(),
      read       : false,
    };

    db.messages.push(entry);
    db.stats.contactForms++;
    await saveDB(db);

    console.log(`📩  New message from ${entry.name} <${entry.email}>`);

    send(res, 201, {
      success: true,
      message: 'Your message has been received. Ashiraf will be in touch shortly.',
      ref: entry.id,
    });
  },

  // ── GET /api/cv — Download CV ─────────────────────────────
  'GET /api/cv': async (req, res) => {
    if (!fs.existsSync(CV_FILE)) {
      return send(res, 404, { error: 'CV not available yet' });
    }
    const db = await loadDB();
    if (db) {
      db.stats.cvDownloads++;
      await saveDB(db);
    }

    try {
      const stat = await fsp.stat(CV_FILE);
      res.writeHead(200, {
        'Content-Type'       : 'application/pdf',
        'Content-Disposition': 'attachment; filename="Kyeyune_Ashiraf_CV.pdf"',
        'Content-Length'     : stat.size,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(CV_FILE).pipe(res);
    } catch (err) {
      send(res, 500, { error: 'Error reading file' });
    }
  },

  // ── POST /api/project-view — Track project panel opens ───
  'POST /api/project-view': async (req, res) => {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (err) {
      return send(res, 400, { error: 'Bad request' });
    }

    const { projectId } = body;
    const valid = ['p1', 'p2', 'p3', 'p4', 'p5'];
    if (!valid.includes(projectId)) return send(res, 400, { error: 'Invalid projectId' });

    const db = await loadDB();
    if (!db) return send(res, 500, { error: 'DB error' });
    db.projectViews[projectId] = (db.projectViews[projectId] || 0) + 1;
    await saveDB(db);

    send(res, 200, { success: true, views: db.projectViews[projectId] });
  },

  // ── GET /api/stats — Public stats (for the counter section) ─
  'GET /api/stats': async (req, res) => {
    const db = await loadDB();
    if (!db) return send(res, 500, { error: 'DB error' });
    send(res, 200, {
      visits        : db.stats.totalVisits,
      uniqueVisitors: db.stats.uniqueVisitors,
      cvDownloads   : db.stats.cvDownloads,
      projectViews  : db.projectViews,
    });
  },

  // ── GET /admin/dashboard — Admin overview (token required) ─
  'GET /admin/dashboard': async (req, res) => {
    if (!isAdmin(req)) return send(res, 401, { error: 'Unauthorized' });

    const db = await loadDB();
    if (!db) return send(res, 500, { error: 'DB error' });

    send(res, 200, {
      stats         : db.stats,
      projectViews  : db.projectViews,
      messageCount  : db.messages.length,
      unreadMessages: db.messages.filter(m => !m.read).length,
      lastUpdated   : db.lastUpdated,
    });
  },

  // ── GET /admin/messages — View all messages (token required) ─
  'GET /admin/messages': async (req, res) => {
    if (!isAdmin(req)) return send(res, 401, { error: 'Unauthorized' });

    const db = await loadDB();
    if (!db) return send(res, 500, { error: 'DB error' });

    // Mark all as read
    let changed = false;
    db.messages.forEach(m => { if (!m.read) { m.read = true; changed = true; } });
    if (changed) await saveDB(db);

    send(res, 200, { count: db.messages.length, messages: db.messages });
  },

  // ── DELETE /admin/messages — Delete a message ────────
  'DELETE /admin/messages': async (req, res, query) => {
    if (!isAdmin(req)) return send(res, 401, { error: 'Unauthorized' });

    const id = query.id;
    if (!id) return send(res, 400, { error: 'Provide ?id=<message_id>' });

    const db = await loadDB();
    if (!db) return send(res, 500, { error: 'DB error' });

    const before = db.messages.length;
    db.messages = db.messages.filter(m => m.id !== id);

    if (db.messages.length === before) return send(res, 404, { error: 'Message not found' });

    await saveDB(db);
    send(res, 200, { success: true, message: `Message ${id} deleted.` });
  },

  // ── POST /admin/reset-stats — Reset visit counters ────────
  'POST /admin/reset-stats': async (req, res) => {
    if (!isAdmin(req)) return send(res, 401, { error: 'Unauthorized' });

    const db = await loadDB();
    if (!db) return send(res, 500, { error: 'DB error' });

    db.stats.totalVisits    = 0;
    db.stats.uniqueVisitors = 0;
    db.stats.cvDownloads    = 0;
    db.stats.contactForms   = 0;
    db.projectViews = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 };
    db.visitors = {};
    await saveDB(db);

    send(res, 200, { success: true, message: 'Stats reset.' });
  },
};

// ─── STATIC FILE SERVER ───────────────────────────────────────
async function serveStatic(req, res, pathname) {
  // Security: prevent directory traversal and access to sensitive files
  const relativePath = pathname.replace(/^\//, '');
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  // Block sensitive files
  const blocked = ['server.js', 'package.json', 'package-lock.json', '.git', 'data/db.json', 'data/access.log'];
  if (blocked.some(b => safePath.includes(b)) || safePath.startsWith('.')) {
    return send(res, 403, { error: 'Forbidden' });
  }

  try {
    const data = await fsp.readFile(filePath);
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type' : mime,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (err) {
    send(res, 404, { error: 'Not found' });
  }
}

// ─── MAIN REQUEST HANDLER ─────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';
  const method   = req.method.toUpperCase();
  const query    = parsed.query;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin' : '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    });
    return res.end();
  }

  // Match and execute route
  const routeKey = `${method} ${pathname}`;
  const handler  = ROUTES[routeKey];

  try {
    if (handler) {
      await handler(req, res, query);
    } else if (method === 'GET' && !pathname.startsWith('/api') && !pathname.startsWith('/admin')) {
      // Fallback to static files for GET requests not targeting API/Admin
      await serveStatic(req, res, pathname);
    } else {
      send(res, 404, { error: `Route not found: ${method} ${pathname}` });
    }
    await logAccess(req, res.statusCode);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Server Error:`, err);
    if (!res.writableEnded) {
      send(res, 500, { error: 'Internal server error' });
    }
  }
});

// ─── START ────────────────────────────────────────────────────
(async () => {
  await bootstrap();
  server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   KYEYUNE ASHIRAF PORTFOLIO — Backend Server         ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`\n🚀  Server running at  http://localhost:${PORT}`);
    console.log(`🔑  Admin token:       ${ADMIN_TOKEN}`);
    console.log(`     Set ADMIN_TOKEN env var to use a fixed secret.\n`);
  });
})();

// Graceful Shutdown
const shutdown = () => {
  console.log('\n🛑  Shutting down server...');
  server.close(() => {
    console.log('✔  Server closed.');
    process.exit(0);
  });
  // Force close after 5s
  setTimeout(() => process.exit(1), 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use. Set a different PORT env variable.\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
