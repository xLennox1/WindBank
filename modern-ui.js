(function(){
  'use strict';
  var DISCORD='https://discord.gg/dD8rJR7h4A';
  function css(){
    if(document.getElementById('wb-modern-fix-style')) return;
    var s=document.createElement('style');s.id='wb-modern-fix-style';s.textContent=`
      #startup{display:grid!important;opacity:1;visibility:visible;pointer-events:auto;transition:opacity .9s ease,visibility .9s ease,transform .9s ease}
      #startup.wb-start-hide{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:scale(1.035)}
      #startup .vault{animation:wbVault 1.55s cubic-bezier(.16,1,.3,1) both}
      #startup .orbit{animation-duration:7s}
      #startup .orbit.o2{animation-duration:10s}
      #startup .progress i{animation-duration:5.8s,.9s}
      #adminModal.wb-admin-closing{display:grid!important;opacity:0;pointer-events:none;transition:opacity .28s ease}
      #adminModal.wb-admin-closing .modal-card{transform:translateY(12px) scale(.97);transition:transform .28s ease}
      #adminModal.wb-admin-ready{animation:wbAdminIn .3s ease both}
      @keyframes wbAdminIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
      .wb-discord-link{border:1px solid #5865f2!important;background:#15152a!important;color:#cfd3ff!important;font-weight:900!important}
      .wb-discord-link:hover{background:#5865f2!important;color:#fff!important}
    `;(document.head||document.documentElement).appendChild(s);
  }
  function startup(){
    var el=document.getElementById('startup');if(!el)return;
    el.classList.remove('hide','wb-start-hide');
    if(window.__wbStartupTimer)clearTimeout(window.__wbStartupTimer);
    window.__wbStartupTimer=setTimeout(function(){el.classList.add('wb-start-hide');setTimeout(function(){el.classList.add('hide');},950);},7000);
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
    /* Replace the button node so any duplicated legacy click handlers are removed. */
    var clean=btn.cloneNode(true);
    btn.replaceWith(clean);
    clean.addEventListener('click',function(){
      var AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx){clean.textContent='✓ Sound nicht verfügbar';return}
      var ctx=new AudioCtx();
      if(ctx.resume)ctx.resume();
      var t=ctx.currentTime;
      function tone(freq,start,duration,type,gain){
        var o=ctx.createOscillator(),g=ctx.createGain();
        o.type=type||'sine';
        o.frequency.setValueAtTime(freq,start);
        o.frequency.exponentialRampToValueAtTime(Math.max(1,freq*1.8),start+duration);
        g.gain.setValueAtTime(.0001,start);
        g.gain.exponentialRampToValueAtTime(gain||.035,start+.03);
        g.gain.exponentialRampToValueAtTime(.0001,start+duration);
        o.connect(g).connect(ctx.destination);
        o.start(start);o.stop(start+duration+.02);
      }
      tone(90,t,.45,'sine',.06);
      tone(180,t+.35,.55,'triangle',.04);
      tone(360,t+.7,.7,'sine',.025);
      clean.textContent='✓ Sound aktiviert';
      var el=document.getElementById('startup');
      if(window.__wbStartupTimer)clearTimeout(window.__wbStartupTimer);
      setTimeout(function(){if(el){el.classList.add('wb-start-hide');setTimeout(function(){el.classList.add('hide')},950)}},900);
      setTimeout(function(){try{ctx.close()}catch(e){}},1600);
    });
  }
  function run(){css();startup();fixTopNav();fixMarketplaceTabs();fixAdmin();cleanupLegacy();fixStartupSound()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',run);[150,500,1200,2500].forEach(function(ms){setTimeout(run,ms)});
  if(window.MutationObserver&&document.documentElement){var last=0;new MutationObserver(function(){var now=Date.now();if(now-last<100)return;last=now;fixTopNav();fixMarketplaceTabs();fixAdmin();cleanupLegacy();fixStartupSound()}).observe(document.documentElement,{childList:true,subtree:true})}
})();
