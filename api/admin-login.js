export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const password = String(req.body?.password || '');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).json({ ok: false, error: 'Admin password is not configured on Vercel.' });
  if (password !== expected) return res.status(401).json({ ok: false, error: 'Falsches Passwort.' });
  // The password itself is never returned to the browser.
  const token = Buffer.from(`${Date.now()}:${process.env.ADMIN_SESSION_SECRET || expected}`).toString('base64url');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, token });
}

