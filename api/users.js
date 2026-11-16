// People who can use the dashboard. Owners only.
//   POST   /api/users          { email, name, role, password }  → creates the login + gives access
//   DELETE /api/users?id=<uid>                                   → removes the login
const { send, admin, requireEditor } = require('./_lib');

module.exports = async (req, res) => {
  const me = await requireEditor(req, res, { owner: true });
  if (!me) return;

  if (req.method === 'POST') {
    const { email, name = '', role = 'editor', password } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return send(res, 400, { error: 'Enter a valid email.' });
    if (!password || password.length < 8) return send(res, 400, { error: 'The password needs at least 8 characters.' });
    if (!['owner', 'editor'].includes(role)) return send(res, 400, { error: 'Unknown role.' });

    const c = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) });
    const created = await c.json().catch(() => ({}));
    if (!c.ok) return send(res, 400, { error: created.msg || created.message || created.error_description || 'Could not create this login. The email may already be in use.' });

    const e = await admin('/rest/v1/editors', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: created.id, email, name, role }) });
    const rows = await e.json().catch(() => []);
    if (!e.ok) { await admin('/auth/v1/admin/users/' + created.id, { method: 'DELETE' }); return send(res, 500, { error: 'Could not give this person access.' }); }
    return send(res, 200, rows[0]);
  }

  if (req.method === 'DELETE') {
    const id = (req.query && req.query.id) || '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: 'Missing person.' });
    if (id === me.id) return send(res, 400, { error: 'You cannot remove yourself.' });
    const d = await admin('/auth/v1/admin/users/' + id, { method: 'DELETE' });   // the editors row goes with it
    if (!d.ok) return send(res, 500, { error: 'Could not remove this person.' });
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: 'POST or DELETE only' });
};
