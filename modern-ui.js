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

  // ---------- Status ----------
  let items = [];
  let reviews = [];
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
        status: row.status
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
          <img src="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
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

  // ---------- Marktplatz-Interaktion ----------
  function setFilter(filter, btn){
    activeFilter = filter;
    els.tabs.forEach((t) => t.classList.toggle('active', t === btn));
    render();
  }

  function openContact({ name, price }){
    els.contactContent.innerHTML = `
      <div class="modal-head">
        <h2>Anfrage über Discord</h2>
        <button class="icon-btn" type="button" data-close-contact aria-label="Schließen">${ICON_CLOSE}</button>
      </div>
      <p class="modal-copy">Du möchtest <strong>${esc(name)}</strong>${price ? ` für <strong>${fmt(price)}</strong>` : ''} anfragen.
      Die Abwicklung läuft persönlich über unseren Discord — schreib dort einfach, worum es geht.</p>
      <div class="modal-actions">
        <a class="btn primary" href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">${ICON_CHAT} Auf Discord schreiben</a>
        <button class="btn" type="button" data-close-contact>Abbrechen</button>
      </div>`;
    els.contactModal.classList.add('open');
  }
  function closeContact(){ els.contactModal.classList.remove('open'); }

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
    const image_url = els.listingImg.value.trim();
    const description = els.listingDesc.value.trim();
    if (!seller || !name || !Number.isFinite(price) || price < 1 || !Number.isInteger(stock) || stock < 1){
      toast('Bitte Name, Item, Preis und Stock korrekt ausfüllen.');
      return;
    }
    try{
      await apiSubmit({ type: 'listing', seller, name, price, stock, image_url, description });
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
      await apiSubmit({ type: 'review', player_name: name, rating: stars, text });
      toast('✓ Rezension wurde gesendet und wartet auf Freigabe.');
      els.reviewForm.reset();
    }catch(err){
      toast(err.message || 'Rezension konnte nicht gespeichert werden.');
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
      els.adminContent.innerHTML = `
        <div class="modal-head">
          <h2>WindBank Admin</h2>
          <button class="icon-btn" type="button" data-close-admin aria-label="Schließen">${ICON_CLOSE}</button>
        </div>
        <div class="admin-tabs">
          <button class="tab active" data-admin-tab="players" type="button">Spieler-Anfragen <b>${pending.length}</b></button>
          <button class="tab" data-admin-tab="shop" type="button">Shop <b>${main.length}</b></button>
          <button class="tab" data-admin-tab="reviews" type="button">Rezensionen <b>${rv.length}</b></button>
        </div>
        <section class="admin-pane" data-pane="players">
          <h3>Spieler-Angebote</h3>
          <div class="admin-list">${pending.length ? pending.map(playerRowHTML).join('') : emptyAdminHTML('Keine offenen Spieler-Anfragen.')}</div>
        </section>
        <section class="admin-pane" data-pane="shop" hidden>
          <h3>Shop-Angebote</h3>
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
      <div><b>${esc(x.name)}</b><div class="meta">${esc(x.seller)} · ${fmt(x.price)} · Stock ${x.stock}${x.description ? ` · ${esc(x.description)}` : ''}</div></div>
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
  }

  async function handleAdminAction(action, id){
    if (action === 'delete' && !confirm('Angebot löschen?')) return;
    try{
      await adminRequest({ action, id });
      toast('✓ Erledigt.');
      await loadMarketData();
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

  // ---------- Verdrahtung ----------
  function init(){
    Object.assign(els, {
      grid: $('grid'), search: $('searchInput'),
      tabs: Array.from(document.querySelectorAll('.tab[data-filter]')),
      offerCount: $('offerCount'), stockCount: $('stockCount'), reviewCount: $('reviewCount'),
      reviewsGrid: $('reviewsGrid'), toast: $('toast'),
      listingForm: $('listingForm'), seller: $('seller'), listingItem: $('listingItem'),
      listingPrice: $('listingPrice'), listingStock: $('listingStock'), listingImg: $('listingImg'), listingDesc: $('listingDesc'),
      reviewForm: $('reviewForm'), reviewName: $('reviewName'), reviewStars: $('reviewStars'), reviewText: $('reviewText'),
      contactModal: $('contactModal'), contactContent: $('contactContent'),
      adminModal: $('adminModal'), adminContent: $('adminContent')
    });

    els.tabs.forEach((btn) => btn.addEventListener('click', () => setFilter(btn.dataset.filter, btn)));
    els.search.addEventListener('input', render);
    els.grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-buy]');
      if (!btn) return;
      const item = items.find((i) => i.id === btn.dataset.buy);
      if (item) openContact({ name: item.name, price: item.price });
    });

    els.listingForm.addEventListener('submit', handleListingSubmit);
    els.reviewForm.addEventListener('submit', handleReviewSubmit);

    $('loanRequestBtn').addEventListener('click', () => openContact({ name: 'einen WindBank-Kredit', price: null }));
    $('adminOpenBtn').addEventListener('click', openAdmin);

    els.contactModal.addEventListener('click', (e) => {
      if (e.target === els.contactModal || e.target.closest('[data-close-contact]')) closeContact();
    });
    els.adminModal.addEventListener('click', (e) => {
      if (e.target === els.adminModal || e.target.closest('[data-close-admin]')) closeAdmin();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (els.contactModal.classList.contains('open')) closeContact();
      if (els.adminModal.classList.contains('open')) closeAdmin();
    });

    loadMarketData();
    setInterval(loadMarketData, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadMarketData();
    });
  }

  // Skript liegt mit `defer` im HTML — DOM ist beim Ausführen bereits vollständig geparst.
  init();
})();
