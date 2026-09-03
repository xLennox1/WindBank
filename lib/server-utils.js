// Gemeinsame Server-Hilfsfunktionen für alle api/*.js-Routen.
// WICHTIG: liegt bewusst AUSSERHALB von /api, damit Vercel diese Datei
// nicht selbst als eigene Route/Function einliest.

export function getSupabase(){
  return {
    url: process.env.SUPABASE_URL || 'https://laawaphkfqkshftiyqqy.supabase.co',
    key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

// Fetch-Wrapper gegen die Supabase REST-API mit dem geheimen Server-Key
// (umgeht Row-Level-Security -- deshalb NIE im Browser verwenden).
export async function sb(path, options = {}){
  const { url, key } = getSupabase();
  if (!key) throw new Error('SUPABASE_SECRET_KEY fehlt in Vercel.');
  const r = await fetch(url + '/rest/v1/' + path, {
    ...options,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text || ('Supabase ' + r.status));
  return text ? JSON.parse(text) : null;
}

// Text säubern: in String umwandeln, trimmen, auf max. Länge kappen.
export function cleanText(value, max = 200){
  return String(value ?? '').trim().slice(0, max);
}

// Nur leere Strings oder echte http(s)-URLs durchlassen (keine javascript:/data:-Tricks).
export function cleanUrl(value, max = 500){
  const v = cleanText(value, max);
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : '';
}

// Anti-Spam-Honeypot: dieses Feld darf im echten Formular nie ausgefüllt sein.
// Bots, die automatisch alle Felder befüllen, tappen hinein.
export function isHoneypotTripped(body){
  return !!cleanText(body?.website, 200);
}

export function getClientIp(req){
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Einfaches, persistentes Rate-Limiting über eine Supabase-Tabelle (login_attempts-Tabelle
// funktioniert nicht bei Serverless-Functions, da kein gemeinsamer Arbeitsspeicher garantiert ist).
// bucket = z.B. 'admin-login' oder 'submit'; identifier = z.B. IP-Adresse.
export async function checkRateLimit({ bucket, identifier, maxAttempts, windowMs }){
  const since = new Date(Date.now() - windowMs).toISOString();
  const rows = await sb(
    `rate_limits?select=id&bucket=eq.${encodeURIComponent(bucket)}&identifier=eq.${encodeURIComponent(identifier)}&created_at=gte.${encodeURIComponent(since)}`
  );
  return (rows?.length || 0) < maxAttempts;
}

export async function recordAttempt({ bucket, identifier }){
  await sb('rate_limits', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ bucket, identifier })
  });
  // Opportunistisches Aufräumen alter Einträge, kein Cron-Job nötig.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  sb(`rate_limits?created_at=lt.${encodeURIComponent(hourAgo)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' }
  }).catch(() => {});
}
