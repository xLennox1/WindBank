import { sb, cleanText, isHoneypotTripped, checkRateLimit, recordAttempt, getClientIp } from '../lib/server-utils.js';

const BUCKET = 'claim';
const MAX_ATTEMPTS = 20;
const WINDOW_MS = 10 * 60 * 1000; // 10 Minuten

export default async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const ip = getClientIp(req);
  const body = req.body || {};

  if (isHoneypotTripped(body)){
    return res.status(200).json({ ok: true });
  }

  try{
    const allowed = await checkRateLimit({ bucket: BUCKET, identifier: ip, maxAttempts: MAX_ATTEMPTS, windowMs: WINDOW_MS });
    if (!allowed){
      return res.status(429).json({ ok: false, error: 'Zu viele Anfragen von dir. Bitte später erneut versuchen.' });
    }
  }catch(e){
    console.error('WindBank rate limit check:', e.message);
  }

  try{
    const id = cleanText(body.id, 64);
    const helper_name = cleanText(body.helper_name, 40);
    const helper_discord = cleanText(body.helper_discord, 40);
    if (!id || !helper_name || !helper_discord){
      return res.status(400).json({ ok: false, error: 'Minecraft-Name und Discord prüfen.' });
    }

    // Nur aktualisieren, wenn die Anfrage noch offen ist -- verhindert, dass zwei Leute
    // gleichzeitig denselben Auftrag annehmen (Prefer: return=representation zeigt uns,
    // ob wirklich eine Zeile getroffen wurde).
    const updated = await sb(`base_requests?id=eq.${encodeURIComponent(id)}&status=eq.open`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'claimed', helper_name, helper_discord })
    });

    if (!updated || !updated.length){
      return res.status(409).json({ ok: false, error: 'Dieser Auftrag wurde gerade schon von jemand anderem angenommen oder existiert nicht mehr.' });
    }

    await recordAttempt({ bucket: BUCKET, identifier: ip }).catch(() => {});
    return res.status(200).json({ ok: true });
  }catch(e){
    console.error('WindBank claim:', e);
    return res.status(500).json({ ok: false, error: e.message || 'Serverfehler' });
  }
}
