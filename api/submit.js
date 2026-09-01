function getSupabase(){
  return {
    url: process.env.SUPABASE_URL || 'https://laawaphkfqkshftiyqqy.supabase.co',
    key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

async function sb(path, options = {}){
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

export default async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try{
    const body = req.body || {};
    const type = String(body.type || '').trim();

    if (type === 'listing'){
      const name = String(body.name || '').trim();
      const seller = String(body.seller || '').trim();
      const price = Number(body.price);
      const stock = Number(body.stock);
      if (!name || !seller || !Number.isFinite(price) || price < 1 || !Number.isInteger(stock) || stock < 1){
        return res.status(400).json({ ok: false, error: 'Name, Verkäufer, Preis und Stock prüfen.' });
      }
      const row = {
        name,
        category: 'item',
        price,
        stock,
        seller,
        description: String(body.description || '').trim(),
        image_url: String(body.image_url || '').trim(),
        status: 'pending'
      };
      const created = await sb('listings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return res.status(201).json({ ok: true, item: created?.[0] || created });
    }

    if (type === 'review'){
      const player_name = String(body.player_name || '').trim();
      const rating = Number(body.rating);
      const text = String(body.text || '').trim();
      if (!player_name || !text || !Number.isInteger(rating) || rating < 1 || rating > 5){
        return res.status(400).json({ ok: false, error: 'Name, Bewertung und Text prüfen.' });
      }
      const row = { player_name, rating, text, status: 'pending' };
      const created = await sb('reviews', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return res.status(201).json({ ok: true, review: created?.[0] || created });
    }

    return res.status(400).json({ ok: false, error: 'Unbekannter Anfrage-Typ.' });
  }catch(e){
    console.error('WindBank submit:', e);
    return res.status(500).json({ ok: false, error: e.message || 'Serverfehler' });
  }
}

