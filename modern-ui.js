(function(){
  function cleanup(){
    var style=document.getElementById('wb-cleanup-style');
    if(!style){
      style=document.createElement('style');
      style.id='wb-cleanup-style';
      style.textContent='#startup{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}.wb-green-startup{display:none!important}';
      document.head.appendChild(style);
    }
    ['#startup','.wb-green-startup','.loading-screen','.loader-screen','.splash-screen','#loading','#loader','#wb-base-insurance'].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){el.remove();});
    });
    document.querySelectorAll('section,article').forEach(function(el){
      var text=el.textContent||'';
      if(/versicherung von basen|wähle deinen basen-schutz|basis-schutz.*2%|windbank schutz/i.test(text)) el.remove();
    });
    document.querySelectorAll('a,button').forEach(function(el){
      if(/versicherung/i.test(el.textContent||'')){
        var nav=el.closest('nav,.links,.tabs,.tabbar,.bottom-nav,.wb-bottom,.navigation,.navbar');
        if(nav) el.remove();
      }
    });
    document.querySelectorAll('.wb-cat-nav,.wb-bottom').forEach(function(nav){
      nav.querySelectorAll('a,button').forEach(function(el){
        if(/versicherung/i.test(el.textContent||'')) el.remove();
      });
    });
    document.querySelectorAll('.admin-btn').forEach(function(btn){
      btn.textContent='Staff';
      btn.style.background='linear-gradient(180deg,#75dc7d,#3e9c47)';
      btn.style.color='#061007';
      btn.style.fontWeight='900';
    });
  }
  function run(){cleanup();setTimeout(cleanup,50);setTimeout(cleanup,500);setTimeout(cleanup,1500);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  new MutationObserver(function(){cleanup();}).observe(document.documentElement,{childList:true,subtree:true});
})();
