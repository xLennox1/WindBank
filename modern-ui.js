(function(){
  'use strict';
  var DISCORD='https://discord.gg/dD8rJR7h4A';

  function css(){
    if(document.getElementById('wb-modern-fix-style')) return;
    var s=document.createElement('style');s.id='wb-modern-fix-style';s.textContent=`
      #startup{display:grid!important;opacity:1;visibility:visible;pointer-events:auto;transition:opacity .65s ease,visibility .65s ease,transform .65s ease}
      #startup.wb-start-hide{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:scale(1.025)}
      #startup .progress i{animation-duration:3.1s,.9s!important}
      #startup .vault{animation:wbVault 1.35s cubic-bezier(.16,1,.3,1) both}
      #startup .orbit{animation-duration:6s!important}
      #startup .orbit.o2{animation-duration:9s!important}
      .wb-admin-create{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
      .wb-admin-create button{font-weight:900}
      .wb-create-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;margin-bottom:14px;border:1px solid #285337;border-radius:14px;background:#081009}
      .wb-create-form .full{grid-column:1/-1}
      .wb-create-form input,.wb-create-form textarea{width:100%;background:#060c07;border:1px solid #24432b;color:#fff;border-radius:9px;padding:10px;outline:none}
      .wb-create-form textarea{min-height:72px;resize:vertical}
      .wb-create-actions{display:flex;gap:8px;justify-content:flex-end;grid-column:1/-1}
      .wb-status{font-size:11px;color:#8ea093;margin-top:5px}
      @media(max-width:650px){.wb-create-form{grid-template-columns:1fr}.wb-create-form .full,.wb-create-actions{grid-column:auto}}
      #adminModal.wb-admin-closing{display:grid!important;opacity:0;pointer-events:none;transition:opacity .28s ease}
      #adminModal.wb-admin-closing .modal-card{transform:translateY(12px) scale(.97);transition:transform .28s ease}
      #adminModal.wb-admin-ready{animation:wbAdminIn .3s ease both}
      @keyframes wbAdminIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
      .wb-discord-link{border:1px solid #5865f2!important;background:#15152a!important;color:#cfd3ff!important;font-weight:900!important}
      .wb-discord-link:hover{background:#5865f2!important;color:#fff!important}
    `;(document.head||document.documentElement).appendChild(s);
  }

  function hideStartup(){
    var el=document.getElementById('startup');if(!el)return;
    el.classList.add('wb-start-hide');
    setTimeout(function(){el.classList.add('hide');},700);
  }
  function startup(){
    var el=document.getElementById('startup');if(!el)return;
    el.classList.remove('hide','wb-start-hide');
    if(window.__wbStartupTimer)clearTimeout(window.__wbStartupTimer);
    // Always finish the startup animation after exactly 4 seconds.
    window.__wbStartupTimer=setTimeout(hideStartup,4000);
  }

  function fixTopNav(){
    var nav=document.querySelector('header .links');if(!nav)return;
    if(!nav.querySelector('.wb-discord-link')){var a=document.createElement('a');a.className='wb-discord-link';a.href=DISCORD;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Discord';nav.appendChild(a)}
  }

  function fixMarketplaceTabs(){
    var shop=document.getElementById('shop');if(!shop)return;var tabs=shop.querySelector('.tabs');if(!tabs)return;
    tabs.querySelectorAll('button').forEach(function(b){if((b.textContent||'').trim().toLowerCase()==='kredite')b.remove()});
  }

  function fixAdmin(){
    var modal=document.getElementById('adminModal');if(!modal)return;
    if(!modal.dataset.wbBound){modal.dataset.wbBound='1';modal.addEventListener('click',function(e){if(e.target===modal&&typeof window.closeAdmin==='function')window.closeAdmin()})}
    if(!window.__wbCloseWrapped&&typeof window.closeAdmin==='function'){
      window.__wbCloseWrapped=true;var oldClose=window.closeAdmin;
      window.closeAdmin=function(){var m=document.getElementById('adminModal');if(!m)return;m.classList.add('wb-admin-closing');document.body.style.overflow='';document.body.style.pointerEvents='';document.documentElement.style.overflow='';setTimeout(function(){m.classList.remove('open','wb-admin-closing','wb-admin-ready');m.style.display='';document.body.style.overflow='';document.body.style.pointerEvents='';document.documentElement.style.overflow=''},300);return oldClose.apply(this,arguments)}
    }
    if(!window.__wbOpenWrapped&&typeof window.openAdmin==='function'){
      window.__wbOpenWrapped=true;var oldOpen=window.openAdmin;
      window.openAdmin=function(){var m=document.getElementById('adminModal');if(m){m.classList.remove('wb-admin-closing');m.classList.add('open','wb-admin-ready')}return oldOpen.apply(this,arguments)}
    }
  }

  function cleanupLegacy(){
    document.querySelectorAll('a,button').forEach(function(el){if(/versicherung von basen|basen-schutz|windbank schutz/i.test(el.textContent||'')){var nav=el.closest('nav,.links,.tabs,.tabbar,.bottom-nav,.wb-bottom,.navigation,.navbar');if(nav)el.remove()}})
  }

  function fixStartupSound(){
    var btn=document.getElementById('startupSound');
    if(!btn||btn.dataset.wbSoundFixed==='1')return;
    btn.dataset.wbSoundFixed='1';
    var clean=btn.cloneNode(true);btn.replaceWith(clean);
    clean.addEventListener('click',function(){
      var AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx){clean.textContent='✓ Sound nicht verfügbar';hideStartup();return}
      var ctx=new AudioCtx();if(ctx.resume)ctx.resume();var t=ctx.currentTime;
      function tone(freq,start,duration,type,gain){var o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(Math.max(1,freq*1.8),start+duration);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(gain||.035,start+.03);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(ctx.destination);o.start(start);o.stop(start+duration+.02)}
      tone(90,t,.45,'sine',.06);tone(180,t+.35,.55,'triangle',.04);tone(360,t+.7,.7,'sine',.025);
      clean.textContent='✓ Sound aktiviert';
      if(window.__wbStartupTimer)clearTimeout(window.__wbStartupTimer);
      setTimeout(hideStartup,900);setTimeout(function(){try{ctx.close()}catch(e){}},1600);
    });
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function toastSafe(msg){if(typeof window.toast==='function')window.toast(msg);else{var t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2500)}}}
  function fmtSafe(n){return Number(n||0).toLocaleString('de-DE')+' $'}

  // Make the public player forms reliable even if the legacy script loads later.
  function installPublicForms(){
    if(typeof window.wbLoad!=='function')return;
    var oldListing=window.submitListing;
    if(oldListing&&!oldListing.__wbWrapped){
      var fn=oldListing;function wrappedListing(){var r=fn.apply(this,arguments);return Promise.resolve(r).then(function(){return window.wbLoad()}).catch(function(e){throw e})}
      wrappedListing.__wbWrapped=true;window.submitListing=wrappedListing;
    }
    var oldReview=window.submitReview;
    if(oldReview&&!oldReview.__wbWrapped){
      var fr=oldReview;function wrappedReview(){var r=fr.apply(this,arguments);return Promise.resolve(r).then(function(){return window.wbLoad()}).catch(function(e){throw e})}
      wrappedReview.__wbWrapped=true;window.submitReview=wrappedReview;
    }
    // Refresh the public data once on startup and after returning to the tab.
    try{window.wbLoad()}catch(e){}
    if(!window.__wbVisibilityBound){window.__wbVisibilityBound=true;document.addEventListener('visibilitychange',function(){if(!document.hidden&&typeof window.wbLoad==='function')window.wbLoad()})}
  }

  // Replace the old prompt-based admin creation with a proper form/button.
  function wbNewMainForm(){
    var host=document.querySelector('#wb-admin-live');if(!host)return;
    if(host.querySelector('.wb-create-form'))return;
    var wrap=document.createElement('div');wrap.className='wb-create-form';wrap.innerHTML=`
      <div><label class="meta">Item-Name</label><input id="wbNewName" placeholder="z. B. Netherite Ingots"></div>
      <div><label class="meta">Preis in $</label><input id="wbNewPrice" type="number" min="0" placeholder="250000"></div>
      <div><label class="meta">Stock</label><input id="wbNewStock" type="number" min="0" step="1" placeholder="32"></div>
      <div><label class="meta">Bild-URL (optional)</label><input id="wbNewImage" placeholder="https://..."></div>
      <div class="full"><label class="meta">Beschreibung (optional)</label><textarea id="wbNewDesc" placeholder="Beschreibung des Angebots"></textarea></div>
      <div class="wb-create-actions"><button class="btn" type="button" id="wbNewCancel">Abbrechen</button><button class="btn primary" type="button" id="wbNewSave">✓ Angebot erstellen</button></div>`;
    var pane=host.querySelector('[data-pane="shop"]');if(!pane)return;pane.insertBefore(wrap,pane.querySelector('.alist'));
    wrap.querySelector('#wbNewCancel').onclick=function(){wrap.remove()};
    wrap.querySelector('#wbNewSave').onclick=async function(){
      var name=wrap.querySelector('#wbNewName').value.trim(),price=Number(wrap.querySelector('#wbNewPrice').value),stock=Number(wrap.querySelector('#wbNewStock').value),image_url=wrap.querySelector('#wbNewImage').value.trim(),description=wrap.querySelector('#wbNewDesc').value.trim();
      if(!name||!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0){toastSafe('Bitte Item, Preis und Stock korrekt ausfüllen.');return}
      try{await window.wbAdminRequest({action:'createMain',name,price,stock,image_url,description});toastSafe('✓ Shop-Angebot erstellt.');wrap.remove();await window.wbLoad();await window.wbRefreshAdmin()}catch(e){toastSafe(e.message||'Angebot konnte nicht erstellt werden.')}
    };
    wrap.querySelector('#wbNewName').focus();
  }

  function patchAdminCreateButton(){
    var host=document.querySelector('#wb-admin-live');if(!host)return;
    var shopPane=host.querySelector('[data-pane="shop"]');if(!shopPane)return;
    var head=shopPane.querySelector('.panehead');if(!head)return;
    var buttons=[...head.querySelectorAll('button')];
    var create=buttons.find(function(b){return /shop-angebot hinzufügen/i.test(b.textContent||'')});
    if(create&&!create.dataset.wbFormBound){
      create.dataset.wbFormBound='1';create.textContent='＋ Angebot erstellen';
      create.onclick=function(){wbNewMainForm()};
    }
  }

  function patchAdminRefresh(){
    if(typeof window.wbRefreshAdmin!=='function'||window.wbRefreshAdmin.__wbWrapped)return;
    var original=window.wbRefreshAdmin;
    async function wrapped(){var r=await original.apply(this,arguments);setTimeout(patchAdminCreateButton,0);return r}
    wrapped.__wbWrapped=true;window.wbRefreshAdmin=wrapped;
  }

  function installAdmin(){
    patchAdminRefresh();
    patchAdminCreateButton();
    if(typeof window.wbInstallAdmin==='function'&&!window.__wbAdminInstalled){try{window.wbInstallAdmin();window.__wbAdminInstalled=true}catch(e){}}
  }

  function run(){
    css();startup();fixTopNav();fixMarketplaceTabs();fixAdmin();cleanupLegacy();fixStartupSound();installPublicForms();installAdmin();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',run);
  [150,500,1000,1800,3000].forEach(function(ms){setTimeout(run,ms)});
  if(window.MutationObserver&&document.documentElement){var last=0;new MutationObserver(function(){var now=Date.now();if(now-last<100)return;last=now;fixTopNav();fixMarketplaceTabs();fixAdmin();cleanupLegacy();fixStartupSound();installPublicForms();installAdmin()}).observe(document.documentElement,{childList:true,subtree:true})}
})();
