/* =========================================================
   WindBank — App
   Ein Skript für Rendering, Live-Daten (Supabase) und Admin.
   Kein Monkey-Patching, kein MutationObserver, keine Timer-Batterie —
   ein klarer Ablauf: laden -> rendern -> auf Aktionen reagieren.
   ========================================================= */
(() => {
  'use strict';

  // ---------- Konfiguration ----------
  const DISCORD_URL = 'https://discord.gg/dD8rJR7h4A';
  const SUPABASE_URL = 'https://laawaphkfqkshftiyqqy.supabase.co';
  // Öffentlicher "publishable" Key: absichtlich clientseitig sichtbar,
  // Zugriff wird ausschließlich über Row-Level-Security in Supabase begrenzt
  // (siehe supabase/schema.sql). Schreibender Zugriff läuft über /api/*.
  const SUPABASE_KEY = 'sb_publishable_jY73SSA6foPKJoQ2SFYEGQ_bBqMTReB';
  const SUPABASE_HEADERS = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  const LOW_STOCK_THRESHOLD = 3;
  const POLL_INTERVAL_MS = 30000;

  const ICON_CLOSE = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const ICON_CHAT = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5.5C3 4.67 3.67 4 4.5 4h11c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5H9l-3.5 3v-3H4.5C3.67 13 3 12.33 3 11.5v-6Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const ICON_COPY = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="7" width="9" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v7A1.5 1.5 0 0 0 5.5 14H7" stroke="currentColor" stroke-width="1.4"/></svg>';
  const ICON_SHIELD = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2 3 5.5v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9v-5L10 2Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.5 10 9 11.5 12.7 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- Status ----------
  let items = [];
  let reviews = [];
  let baseRequests = [];
  let activeFilter = 'all';
  let toastTimer = null;

  const els = {};
  const $ = (id) => document.getElementById(id);

  // ---------- Helfer ----------
  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function fmt(n){ return `${Number(n || 0).toLocaleString('de-DE')} $`; }

  function toast(msg){
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2800);
  }

  // ---------- Supabase (nur Lesen/Insert; Schreiben läuft über /api) ----------
  async function sbGet(path){
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: SUPABASE_HEADERS, cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function loadMarketData(){
    try{
      const [listingRows, reviewRows] = await Promise.all([
        sbGet('listings?select=*&status=in.(approved,sold_out)&order=created_at.desc'),
        sbGet('reviews?select=*&status=eq.approved&order=created_at.desc')
      ]);
      items = listingRows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.seller === 'WindBank' ? 'item' : 'player',
        price: Number(row.price),
        stock: Number(row.stock),
        seller: row.seller,
        img: row.image_url || '',
        status: row.status,
        discord: row.discord || ''
      }));
      reviews = reviewRows.map((row) => ({
        id: row.id,
        name: row.player_name,
        stars: Number(row.rating),
        text: row.text
      }));
      render();
    }catch(err){
      console.warn('WindBank Marktdaten:', err);
      renderLoadError();
    }
  }

  async function loadBaseRequests(){
    try{
      const rows = await sbGet('base_requests?select=*&status=eq.open&order=created_at.desc');
      baseRequests = rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        name: row.requester_name,
        discord: row.requester_discord,
        description: row.description || ''
      }));
      renderBaseList();
    }catch(err){
      console.warn('WindBank Basen/Farmen:', err);
      els.baseList.innerHTML = emptyHTML('Aufträge konnten gerade nicht geladen werden.');
    }
  }

  async function loadActivity(){
    try{
      const rows = await sbGet('activity?select=*&order=created_at.desc&limit=15');
      renderTicker(rows);
    }catch(err){
      console.warn('WindBank Aktivität:', err);
      els.ticker.classList.add('empty');
    }
  }

  function renderTicker(rows){
    if (!rows.length){ els.ticker.classList.add('empty'); return; }
    els.ticker.classList.remove('empty');
    const html = rows.map(tickerItemHTML).join('');
    els.tickerTrack.innerHTML = html + html; // doppelt für eine nahtlose Endlos-Schleife
  }

  function tickerItemHTML(row){
    const label = row.kind === 'kredit' ? 'Kredit' : 'Kauf';
    return `<span class="ticker-item"><span class="dot"></span><b>${esc(row.player_name)}</b> · ${label}${row.note ? ` (${esc(row.note)})` : ''} · <span class="amt">${fmt(row.amount)}</span></span>`;
  }

  // ---------- Rendering: Marktplatz ----------
  function render(){
    const query = els.search.value.trim().toLowerCase();
    const list = items.filter((it) =>
      (activeFilter === 'all' || it.type === activeFilter) &&
      `${it.name} ${it.seller || ''}`.toLowerCase().includes(query)
    );
    els.grid.innerHTML = list.length ? list.map(cardHTML).join('') : emptyHTML('Keine passenden Angebote gefunden.');
    els.offerCount.textContent = items.length;
    els.stockCount.textContent = items.reduce((sum, it) => sum + Number(it.stock || 0), 0).toLocaleString('de-DE');
    els.reviewCount.textContent = reviews.length;
    renderReviews();
  }

  function cardHTML(it){
    const soldOut = it.status === 'sold_out' || Number(it.stock) <= 0;
    const low = !soldOut && Number(it.stock) <= LOW_STOCK_THRESHOLD;
    const stateClass = soldOut ? 'sold' : low ? 'low' : '';
    const badgeText = soldOut ? 'Ausverkauft' : low ? 'Wenig Bestand' : 'Verfügbar';
    return `
      <article class="card ${stateClass}">
        <div class="pic">
          <span class="badge"><span class="dot"></span>${badgeText}</span>
          <img src="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy">
          <div class="fallback">▣</div>
        </div>
        <div class="body">
          <div class="title">${esc(it.name)}</div>
          <div class="meta">${it.type === 'player' ? `von ${esc(it.seller)}` : 'WindBank'}</div>
          <div class="price">${fmt(it.price)}</div>
          <div class="stock"><span>Bestand</span><b>${it.stock}</b></div>
          ${soldOut
            ? '<button class="btn" disabled>Ausverkauft</button>'
            : `<button class="btn primary" data-buy="${it.id}">Angebot ansehen</button>`}
        </div>
      </article>`;
  }

  function emptyHTML(message, showRetry){
    return `<div class="empty${showRetry ? ' error' : ''}">
      <p>${esc(message)}</p>
      ${showRetry ? '<button class="btn primary" id="retryLoadBtn" type="button">Erneut versuchen</button>' : ''}
    </div>`;
  }

  function renderLoadError(){
    els.grid.innerHTML = emptyHTML('Angebote konnten gerade nicht geladen werden.', true);
    $('retryLoadBtn')?.addEventListener('click', loadMarketData);
  }

  function renderReviews(){
    els.reviewsGrid.innerHTML = reviews.length ? reviews.map((r) => `
      <article class="review">
        <div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
        <p>${esc(r.text)}</p>
        <small>${esc(r.name)} · <span class="verified">✓ bestätigt</span></small>
      </article>`).join('') : '<div class="empty">Noch keine Rezensionen.</div>';
  }

  // ---------- Rendering: Basen/Farmen ----------
  function renderBaseList(){
    els.baseList.innerHTML = baseRequests.length
      ? baseRequests.map(baseCardHTML).join('')
      : '<div class="empty">Aktuell keine offenen Aufträge.</div>';
  }

  function baseCardHTML(req){
    return `
      <article class="base-card">
        <span class="pill">${req.kind === 'farm' ? 'Farm' : 'Base / Stash'}</span>
        <div class="title">${esc(req.name)}</div>
        <p class="base-desc">${esc(req.description) || 'Keine weitere Beschreibung angegeben.'}</p>
        <button class="btn primary" data-claim="${req.id}" type="button">Auftrag annehmen</button>
      </article>`;
  }

  // ---------- Marktplatz-Interaktion ----------
  function setFilter(filter, btn){
    activeFilter = filter;
    els.tabs.forEach((t) => t.classList.toggle('active', t === btn));
    render();
  }

  function openContact({ name, price, discord }){
    els.contactContent.innerHTML = `
      <div class="modal-head">
        <h2>Anfrage über Discord</h2>
        <button class="icon-btn" type="button" data-close-contact aria-label="Schließen">${ICON_CLOSE}</button>
      </div>
      <p class="modal-copy">Du möchtest <strong>${esc(name)}</strong>${price ? ` für <strong>${fmt(price)}</strong>` : ''} anfragen.</p>
      ${discord ? `
      <div class="seller-discord">
        <span class="seller-discord-label">Discord des Verkäufers</span>
        <div class="seller-discord-row">
          <code>${esc(discord)}</code>
          <button class="icon-btn" type="button" data-copy-discord aria-label="Discord-Namen kopieren">${ICON_COPY}</button>
        </div>
      </div>
      <p class="modal-copy small">Schreib diesen Namen direkt auf Discord an. Meldet er sich nicht, kannst du dich alternativ über unseren Server melden:</p>
      ` : `
      <p class="modal-copy">Die Abwicklung läuft persönlich über unseren Discord — schreib dort einfach, worum es geht.</p>
      `}
      <div class="modal-actions">
        <a class="btn primary" href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">${ICON_CHAT} Auf Discord schreiben</a>
        <button class="btn" type="button" data-close-contact>Abbrechen</button>
      </div>`;
    els.contactModal.classList.add('open');
    els.contactContent.querySelector('[data-copy-discord]')?.addEventListener('click', () => copyDiscordTag(discord));
  }
  function closeContact(){ els.contactModal.classList.remove('open'); }

  async function copyDiscordTag(tag){
    try{
      await navigator.clipboard.writeText(tag);
      toast('✓ Discord-Name kopiert.');
    }catch{
      toast('Kopieren nicht möglich — bitte manuell markieren.');
    }
  }

  function openClaim(req){
    els.claimContent.innerHTML = `
      <div class="modal-head">
        <h2>Auftrag annehmen</h2>
        <button class="icon-btn" type="button" data-close-claim aria-label="Schließen">${ICON_CLOSE}</button>
      </div>
      <p class="modal-copy"><strong>${esc(req.name)}</strong> sucht: <strong>${req.kind === 'farm' ? 'eine Farm' : 'eine Base / Stash'}</strong></p>
      ${req.description ? `<p class="modal-copy small">${esc(req.description)}</p>` : ''}
      <div class="seller-discord">
        <span class="seller-discord-label">Discord von ${esc(req.name)}</span>
        <div class="seller-discord-row">
          <code>${esc(req.discord)}</code>
          <button class="icon-btn" type="button" data-copy-discord aria-label="Discord-Namen kopieren">${ICON_COPY}</button>
        </div>
      </div>
      <div class="discord-notice">
        ${ICON_SHIELD}
        <p>Du musst Mitglied unseres <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">Discord-Servers</a> sein, um Aufträge anzunehmen. Trag deine Daten ein, um den Auftrag verbindlich zu bestätigen:</p>
      </div>
      <form id="claimForm" class="field-grid" novalidate>
        <input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="field full"><label for="claimName">Dein Minecraft-Name</label><input id="claimName" required placeholder="Dein Name"></div>
        <div class="field full"><label for="claimDiscord">Dein Discord</label><input id="claimDiscord" required placeholder="z. B. deinname"></div>
        <div class="field full"><button class="btn primary" type="submit">Auftrag bestätigen</button></div>
      </form>`;
    els.claimModal.classList.add('open');
    els.claimContent.querySelector('[data-copy-discord]')?.addEventListener('click', () => copyDiscordTag(req.discord));
    $('claimForm').addEventListener('submit', (e) => handleClaimSubmit(e, req.id));
  }
  function closeClaim(){ els.claimModal.classList.remove('open'); }

  async function handleClaimSubmit(e, id){
    e.preventDefault();
    const helper_name = $('claimName').value.trim();
    const helper_discord = $('claimDiscord').value.trim();
    const website = e.target.website.value;
    if (!helper_name || !helper_discord){
      toast('Bitte Minecraft-Name und Discord eintragen.');
      return;
    }
    if (!confirm('Auftrag wirklich annehmen? Du gehst damit eine Verpflichtung gegenüber dem Ersteller ein.')) return;
    try{
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, helper_name, helper_discord, website })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Auftrag konnte nicht angenommen werden.');
      toast('✓ Auftrag angenommen — WindBank prüft die Übergabe.');
      closeClaim();
      await loadBaseRequests();
    }catch(err){
      toast(err.message || 'Auftrag konnte nicht angenommen werden.');
    }
  }


  // ---------- Öffentliche Formulare ----------
  async function apiSubmit(payload){
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Speichern fehlgeschlagen.');
    return data;
  }

  async function handleListingSubmit(e){
    e.preventDefault();
    const seller = els.seller.value.trim();
    const name = els.listingItem.value.trim();
    const price = Number(els.listingPrice.value);
    const stock = Number(els.listingStock.value);
    const discord = els.listingDiscord.value.trim();
    const image_url = els.listingImg.value.trim();
    const description = els.listingDesc.value.trim();
    if (!seller || !name || !Number.isFinite(price) || price < 1 || !Number.isInteger(stock) || stock < 1){
      toast('Bitte Name, Item, Preis und Stock korrekt ausfüllen.');
      return;
    }
    try{
      await apiSubmit({ type: 'listing', seller, name, price, stock, discord, image_url, description, website: els.listingForm.website.value });
      toast('✓ Angebot wurde gesendet und wartet auf Freigabe.');
      els.listingForm.reset();
    }catch(err){
      toast(err.message || 'Angebot konnte nicht gespeichert werden.');
    }
  }

  async function handleReviewSubmit(e){
    e.preventDefault();
    const name = els.reviewName.value.trim();
    const stars = Number(els.reviewStars.value);
    const text = els.reviewText.value.trim();
    if (!name || !text){
      toast('Bitte Name und Erlebnis eintragen.');
      return;
    }
    try{
      await apiSubmit({ type: 'review', player_name: name, rating: stars, text, website: els.reviewForm.website.value });
      toast('✓ Rezension wurde gesendet und wartet auf Freigabe.');
      els.reviewForm.reset();
    }catch(err){
      toast(err.message || 'Rezension konnte nicht gespeichert werden.');
    }
  }

  async function handleBaseRequestSubmit(e){
    e.preventDefault();
    const kind = els.baseKind.value;
    const requester_name = els.baseRequesterName.value.trim();
    const requester_discord = els.baseRequesterDiscord.value.trim();
    const description = els.baseDescription.value.trim();
    if (!requester_name || !requester_discord){
      toast('Bitte Minecraft-Name und Discord eintragen.');
      return;
    }
    try{
      await apiSubmit({ type: 'baseRequest', kind, requester_name, requester_discord, description, website: els.baseRequestForm.website.value });
      toast('✓ Anfrage wurde gesendet und wartet auf Freigabe.');
      els.baseRequestForm.reset();
    }catch(err){
      toast(err.message || 'Anfrage konnte nicht gespeichert werden.');
    }
  }

  // ---------- Admin ----------
  function adminToken(){ return sessionStorage.getItem('wb_admin_token') || ''; }

  async function adminRequest(body){
    const res = await fetch('/api/admin-db', {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(adminToken() ? { Authorization: `Bearer ${adminToken()}` } : {}),
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401){
      sessionStorage.removeItem('wb_admin_token');
      const err = new Error(data.error || 'Sitzung abgelaufen, bitte erneut einloggen.');
      err.unauthorized = true;
      throw err;
    }
    if (!res.ok) throw new Error(data.error || 'Admin-Fehler');
    return data;
  }

  function handleAdminError(err){
    if (err.unauthorized) renderAdminLogin();
    else toast(err.message);
  }

  function openAdmin(){
    els.adminModal.classList.add('open');
    if (adminToken()){
      els.adminContent.innerHTML = '<p class="section-sub">Admin-Daten werden geladen…</p>';
      renderAdminDashboard();
    }else{
      renderAdminLogin();
    }
  }
  function closeAdmin(){ els.adminModal.classList.remove('open'); }

  function renderAdminLogin(){
    els.adminContent.innerHTML = `
      <div class="modal-head">
        <h2>WindBank Admin</h2>
        <button class="icon-btn" type="button" data-close-admin aria-label="Schließen">${ICON_CLOSE}</button>
      </div>
      <div class="login-pane">
        <p>Melde dich mit dem Admin-Passwort an.</p>
        <form id="adminLoginForm" class="field-grid" novalidate>
          <div class="field full">
            <label for="adminPass">Passwort</label>
            <input id="adminPass" type="password" required autocomplete="current-password">
          </div>
          <div class="field full"><button class="btn primary" type="submit">Einloggen</button></div>
        </form>
        <div id="adminError"></div>
      </div>`;
    $('adminLoginForm').addEventListener('submit', handleAdminLogin);
  }

  async function handleAdminLogin(e){
    e.preventDefault();
    const pass = $('adminPass').value;
    const errBox = $('adminError');
    const btn = e.target.querySelector('button[type="submit"]');
    errBox.innerHTML = '';
    if (!pass){ errBox.innerHTML = '<p class="error-text">Bitte Passwort eingeben.</p>'; return; }
    btn.disabled = true;
    try{
      const res = await fetch('/api/admin-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }), cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Falsches Passwort.');
      sessionStorage.setItem('wb_admin_token', data.token || '');
      await renderAdminDashboard();
    }catch(err){
      errBox.innerHTML = `<p class="error-text">${esc(err.message)}</p>`;
    }finally{
      btn.disabled = false;
    }
  }

  async function renderAdminDashboard(){
    try{
      const data = await adminRequest();
      const pending = data.pending || [];
      const main = data.main || [];
      const rv = data.reviews || [];
      const basePending = data.basePending || [];
      const baseClaimed = data.baseClaimed || [];
      const activity = data.activity || [];
      els.adminContent.innerHTML = `
        <div class="modal-head">
          <h2>WindBank Admin</h2>
          <button class="icon-btn" type="button" data-close-admin aria-label="Schließen">${ICON_CLOSE}</button>
        </div>
        <div class="admin-tabs">
          <button class="tab active" data-admin-tab="players" type="button">Spieler-Anfragen <b>${pending.length}</b></button>
          <button class="tab" data-admin-tab="shop" type="button">Shop <b>${main.length}</b></button>
          <button class="tab" data-admin-tab="reviews" type="button">Rezensionen <b>${rv.length}</b></button>
          <button class="tab" data-admin-tab="base" type="button">Basen/Farmen <b>${basePending.length + baseClaimed.length}</b></button>
          <button class="tab" data-admin-tab="activity" type="button">Aktivität <b>${activity.length}</b></button>
        </div>
        <section class="admin-pane" data-pane="players">
          <h3>Spieler-Angebote</h3>
          <div class="admin-list">${pending.length ? pending.map(playerRowHTML).join('') : emptyAdminHTML('Keine offenen Spieler-Anfragen.')}</div>
        </section>
        <section class="admin-pane" data-pane="shop" hidden>
          <div class="pane-head">
            <h3>Shop-Angebote</h3>
            ${main.length ? '<button class="btn danger" id="clearShopBtn" type="button">Alle Shop-Angebote löschen</button>' : ''}
          </div>
          <form class="admin-create-form" id="adminCreateForm" novalidate>
            <input id="newItemName" placeholder="Item-Name" required>
            <input id="newItemPrice" type="number" min="0" placeholder="Preis in $" required>
            <input id="newItemStock" type="number" min="0" step="1" placeholder="Stock" required>
            <input id="newItemImage" placeholder="Bild-URL (optional)">
            <textarea id="newItemDesc" class="full" placeholder="Beschreibung (optional)"></textarea>
            <button class="btn primary full" type="submit">＋ Angebot erstellen</button>
          </form>
          <div class="admin-list">${main.length ? main.map(shopRowHTML).join('') : emptyAdminHTML('Noch keine Shop-Angebote.')}</div>
        </section>
        <section class="admin-pane" data-pane="reviews" hidden>
          <h3>Rezensionen</h3>
          <div class="admin-list">${rv.length ? rv.map(reviewRowHTML).join('') : emptyAdminHTML('Keine Rezensionen vorhanden.')}</div>
        </section>
        <section class="admin-pane" data-pane="base" hidden>
          <h3>Neue Anfragen</h3>
          <div class="admin-list">${basePending.length ? basePending.map(baseRequestRowHTML).join('') : emptyAdminHTML('Keine neuen Basen/Farmen-Anfragen.')}</div>
          <h3 class="pane-subhead">Angenommene Aufträge — warten auf Bestätigung</h3>
          <div class="admin-list">${baseClaimed.length ? baseClaimed.map(baseClaimedRowHTML).join('') : emptyAdminHTML('Nichts zur Prüfung.')}</div>
        </section>
        <section class="admin-pane" data-pane="activity" hidden>
          <h3>Aktivitäten-Leiste</h3>
          <form class="admin-create-form" id="adminActivityForm" novalidate>
            <input id="activityName" placeholder="Minecraft-Name" required>
            <select id="activityKind">
              <option value="kauf">Kauf</option>
              <option value="kredit">Kredit</option>
            </select>
            <input id="activityAmount" type="number" min="0" placeholder="Betrag in $" required>
            <input id="activityNote" placeholder="Notiz (optional)">
            <button class="btn primary full" type="submit">＋ Eintrag hinzufügen</button>
          </form>
          <div class="admin-list">${activity.length ? activity.map(activityRowHTML).join('') : emptyAdminHTML('Noch keine Einträge.')}</div>
        </section>`;
      bindAdminDashboardEvents();
    }catch(err){
      if (err.unauthorized){ renderAdminLogin(); return; }
      els.adminContent.innerHTML = `
        <div class="modal-head">
          <h2>WindBank Admin</h2>
          <button class="icon-btn" type="button" data-close-admin aria-label="Schließen">${ICON_CLOSE}</button>
        </div>
        <p class="error-text">${esc(err.message)}</p>`;
    }
  }

  function emptyAdminHTML(msg){ return `<p class="section-sub">${esc(msg)}</p>`; }

  function playerRowHTML(x){
    return `<div class="admin-item">
      <div><b>${esc(x.name)}</b><div class="meta">${esc(x.seller)} · ${fmt(x.price)} · Stock ${x.stock}${x.discord ? ` · Discord: ${esc(x.discord)}` : ''}${x.description ? ` · ${esc(x.description)}` : ''}</div></div>
      <div class="actions">
        <button class="btn primary" data-admin-action="approve" data-id="${x.id}" type="button">Freigeben</button>
        <button class="btn" data-admin-action="reject" data-id="${x.id}" type="button">Ablehnen</button>
        <button class="btn danger" data-admin-action="delete" data-id="${x.id}" type="button">Löschen</button>
      </div>
    </div>`;
  }

  function shopRowHTML(x){
    const soldOut = x.status === 'sold_out';
    return `<div class="admin-item">
      <div><b>${esc(x.name)}</b><div class="meta">${fmt(x.price)} · Stock ${x.stock} · ${soldOut ? 'Ausverkauft' : 'Verfügbar'}</div></div>
      <div class="actions">
        <button class="btn" data-admin-action="${soldOut ? 'markAvailable' : 'markSold'}" data-id="${x.id}" type="button">${soldOut ? 'Als verfügbar markieren' : 'Als ausverkauft markieren'}</button>
        <button class="btn danger" data-admin-action="delete" data-id="${x.id}" type="button">Löschen</button>
      </div>
    </div>`;
  }

  function reviewRowHTML(x){
    const statusLabel = x.status === 'approved' ? 'Freigegeben' : x.status === 'rejected' ? 'Abgelehnt' : 'Wartet auf Freigabe';
    return `<div class="admin-item">
      <div><b>${esc(x.player_name)}</b><div class="meta">${'★'.repeat(Number(x.rating))}${'☆'.repeat(5 - Number(x.rating))} · ${esc(x.text)}</div></div>
      <div class="actions">
        <span class="pill">${statusLabel}</span>
        <button class="btn primary" data-admin-review="approve" data-id="${x.id}" type="button">Freigeben</button>
        <button class="btn" data-admin-review="reject" data-id="${x.id}" type="button">Ablehnen</button>
        <button class="btn danger" data-admin-review="delete" data-id="${x.id}" type="button">Löschen</button>
      </div>
    </div>`;
  }

  function baseRequestRowHTML(x){
    return `<div class="admin-item">
      <div><b>${esc(x.requester_name)}</b><div class="meta">${x.kind === 'farm' ? 'Farm' : 'Base / Stash'} · Discord: ${esc(x.requester_discord)}${x.description ? ` · ${esc(x.description)}` : ''}</div></div>
      <div class="actions">
        <button class="btn primary" data-admin-action="approveBase" data-id="${x.id}" type="button">Freigeben</button>
        <button class="btn" data-admin-action="rejectBase" data-id="${x.id}" type="button">Ablehnen</button>
        <button class="btn danger" data-admin-action="deleteBase" data-id="${x.id}" type="button">Löschen</button>
      </div>
    </div>`;
  }

  function baseClaimedRowHTML(x){
    return `<div class="admin-item">
      <div><b>${esc(x.requester_name)}</b> → <b>${esc(x.helper_name)}</b>
        <div class="meta">${x.kind === 'farm' ? 'Farm' : 'Base / Stash'} · ${esc(x.requester_name)}: ${esc(x.requester_discord)} · ${esc(x.helper_name)}: ${esc(x.helper_discord)}${x.description ? ` · ${esc(x.description)}` : ''}</div>
      </div>
      <div class="actions">
        <button class="btn primary" data-admin-action="matchBase" data-id="${x.id}" type="button">Erneut freigeben</button>
        <button class="btn danger" data-admin-action="deleteBase" data-id="${x.id}" type="button">Löschen</button>
      </div>
    </div>`;
  }

  function activityRowHTML(x){
    return `<div class="admin-item">
      <div><b>${esc(x.player_name)}</b><div class="meta">${x.kind === 'kredit' ? 'Kredit' : 'Kauf'} · ${fmt(x.amount)}${x.note ? ` · ${esc(x.note)}` : ''}</div></div>
      <div class="actions">
        <button class="btn danger" data-admin-action="deleteActivity" data-id="${x.id}" type="button">Löschen</button>
      </div>
    </div>`;
  }

  function bindAdminDashboardEvents(){
    const tabs = els.adminContent.querySelectorAll('[data-admin-tab]');
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      els.adminContent.querySelectorAll('[data-pane]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== tab.dataset.adminTab;
      });
    }));
    els.adminContent.querySelectorAll('[data-admin-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleAdminAction(btn.dataset.adminAction, btn.dataset.id));
    });
    els.adminContent.querySelectorAll('[data-admin-review]').forEach((btn) => {
      btn.addEventListener('click', () => handleAdminReview(btn.dataset.adminReview, btn.dataset.id));
    });
    $('adminCreateForm')?.addEventListener('submit', handleAdminCreate);
    $('clearShopBtn')?.addEventListener('click', handleClearShop);
    $('adminActivityForm')?.addEventListener('submit', handleAdminActivityCreate);
  }

  async function handleClearShop(){
    if (!confirm('Wirklich ALLE Shop-Angebote löschen? Das kann nicht rückgängig gemacht werden.')) return;
    try{
      await adminRequest({ action: 'clearMain' });
      toast('✓ Alle Shop-Angebote gelöscht.');
      await loadMarketData();
      await renderAdminDashboard();
    }catch(err){ handleAdminError(err); }
  }

  const DESTRUCTIVE_ACTIONS = ['delete', 'deleteBase', 'deleteActivity'];
  async function handleAdminAction(action, id){
    if (DESTRUCTIVE_ACTIONS.includes(action) && !confirm('Wirklich löschen?')) return;
    try{
      await adminRequest({ action, id });
      toast('✓ Erledigt.');
      await Promise.all([loadMarketData(), loadBaseRequests(), loadActivity()]);
      await renderAdminDashboard();
    }catch(err){ handleAdminError(err); }
  }

  async function handleAdminReview(action, id){
    const map = { approve: 'reviewApprove', reject: 'reviewReject', delete: 'reviewDelete' };
    if (action === 'delete' && !confirm('Rezension löschen?')) return;
    try{
      await adminRequest({ action: map[action], id });
      toast('✓ Erledigt.');
      await loadMarketData();
      await renderAdminDashboard();
    }catch(err){ handleAdminError(err); }
  }

  async function handleAdminCreate(e){
    e.preventDefault();
    const name = $('newItemName').value.trim();
    const price = Number($('newItemPrice').value);
    const stock = Number($('newItemStock').value);
    const image_url = $('newItemImage').value.trim();
    const description = $('newItemDesc').value.trim();
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0){
      toast('Bitte Name, Preis und Stock prüfen.');
      return;
    }
    try{
      await adminRequest({ action: 'createMain', name, price, stock, image_url, description });
      toast('✓ Shop-Angebot erstellt.');
      await loadMarketData();
      await renderAdminDashboard();
    }catch(err){ handleAdminError(err); }
  }

  async function handleAdminActivityCreate(e){
    e.preventDefault();
    const player_name = $('activityName').value.trim();
    const kind = $('activityKind').value;
    const amount = Number($('activityAmount').value);
    const note = $('activityNote').value.trim();
    if (!player_name || !Number.isFinite(amount) || amount < 0){
      toast('Bitte Name und Betrag prüfen.');
      return;
    }
    try{
      await adminRequest({ action: 'addActivity', player_name, kind, amount, note });
      toast('✓ Eintrag hinzugefügt.');
      await loadActivity();
      await renderAdminDashboard();
    }catch(err){ handleAdminError(err); }
  }

  // ---------- Verdrahtung ----------
  function init(){
    Object.assign(els, {
      grid: $('grid'), search: $('searchInput'),
      tabs: Array.from(document.querySelectorAll('.tab[data-filter]')),
      offerCount: $('offerCount'), stockCount: $('stockCount'), reviewCount: $('reviewCount'),
      reviewsGrid: $('reviewsGrid'), toast: $('toast'),
      listingForm: $('listingForm'), seller: $('seller'), listingItem: $('listingItem'),
      listingPrice: $('listingPrice'), listingStock: $('listingStock'), listingImg: $('listingImg'), listingDesc: $('listingDesc'),
      listingDiscord: $('listingDiscord'),
      reviewForm: $('reviewForm'), reviewName: $('reviewName'), reviewStars: $('reviewStars'), reviewText: $('reviewText'),
      baseList: $('baseList'), baseRequestForm: $('baseRequestForm'), baseKind: $('baseKind'),
      baseRequesterName: $('baseRequesterName'), baseRequesterDiscord: $('baseRequesterDiscord'), baseDescription: $('baseDescription'),
      ticker: $('activityTicker'), tickerTrack: $('tickerTrack'),
      contactModal: $('contactModal'), contactContent: $('contactContent'),
      claimModal: $('claimModal'), claimContent: $('claimContent'),
      adminModal: $('adminModal'), adminContent: $('adminContent')
    });

    els.tabs.forEach((btn) => btn.addEventListener('click', () => setFilter(btn.dataset.filter, btn)));
    els.search.addEventListener('input', render);
    els.grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-buy]');
      if (!btn) return;
      const item = items.find((i) => i.id === btn.dataset.buy);
      if (item) openContact({ name: item.name, price: item.price, discord: item.discord });
    });
    // 'error' bubbelt bei <img> nicht -- Capture-Phase fängt es trotzdem ab,
    // ganz ohne Inline-onerror (das würde eine strikte CSP verbieten).
    els.grid.addEventListener('error', (e) => {
      if (e.target.tagName !== 'IMG') return;
      e.target.style.display = 'none';
      e.target.nextElementSibling?.style.setProperty('display', 'grid');
    }, true);

    els.listingForm.addEventListener('submit', handleListingSubmit);
    els.reviewForm.addEventListener('submit', handleReviewSubmit);
    els.baseRequestForm.addEventListener('submit', handleBaseRequestSubmit);
    els.baseList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-claim]');
      if (!btn) return;
      const req = baseRequests.find((r) => r.id === btn.dataset.claim);
      if (req) openClaim(req);
    });

    $('loanRequestBtn').addEventListener('click', () => openContact({ name: 'einen WindBank-Kredit', price: null }));
    $('adminOpenBtn').addEventListener('click', openAdmin);

    els.contactModal.addEventListener('click', (e) => {
      if (e.target === els.contactModal || e.target.closest('[data-close-contact]')) closeContact();
    });
    els.claimModal.addEventListener('click', (e) => {
      if (e.target === els.claimModal || e.target.closest('[data-close-claim]')) closeClaim();
    });
    els.adminModal.addEventListener('click', (e) => {
      if (e.target === els.adminModal || e.target.closest('[data-close-admin]')) closeAdmin();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (els.contactModal.classList.contains('open')) closeContact();
      if (els.claimModal.classList.contains('open')) closeClaim();
      if (els.adminModal.classList.contains('open')) closeAdmin();
    });

    loadMarketData();
    loadBaseRequests();
    loadActivity();
    setInterval(() => { loadMarketData(); loadBaseRequests(); loadActivity(); }, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden){ loadMarketData(); loadBaseRequests(); loadActivity(); }
    });

    // Startanimation: einmal abspielen lassen, danach sauber aus dem DOM entfernen.
    // Blockiert nichts (pointer-events:none) und respektiert reduzierte Bewegung.
    const startup = $('startup');
    if (startup){
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => startup.remove(), reduceMotion ? 0 : 2000);
    }
  }

  // Skript liegt mit `defer` im HTML — DOM ist beim Ausführen bereits vollständig geparst.
  init();
})();
