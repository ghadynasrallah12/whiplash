// Shared helpers for the dashboard's server functions (files starting with _ are not routes).
const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;       // anon / publishable key
const SERVICE = process.env.SUPABASE_SERVICE_KEY; // service_role / secret key — never sent to the browser

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function admin(path, init = {}) {
  return fetch(URL_ + path, {
    ...init,
    headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

// Checks the caller is signed in AND listed in the editors table. Returns { id, email, role } or null (response already sent).
async function requireEditor(req, res, { owner = false } = {}) {
  if (!URL_ || !ANON || !SERVICE) { send(res, 500, { error: 'Server is missing its Supabase settings (see admin/SETUP.md, step 4).' }); return null; }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { send(res, 401, { error: 'Sign in first.' }); return null; }
  const u = await fetch(URL_ + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
  if (!u.ok) { send(res, 401, { error: 'Your session ended. Sign in again.' }); return null; }
  const user = await u.json();
  const r = await admin('/rest/v1/editors?select=role,email&user_id=eq.' + encodeURIComponent(user.id));
  const rows = r.ok ? await r.json() : [];
  if (!rows.length) { send(res, 403, { error: 'This account has no access to the dashboard.' }); return null; }
  if (owner && rows[0].role !== 'owner') { send(res, 403, { error: 'Only an owner can manage people.' }); return null; }
  return { id: user.id, email: rows[0].email, role: rows[0].role };
}

module.exports = { send, admin, requireEditor };
