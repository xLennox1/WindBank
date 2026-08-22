(function(){
  // HARD FIX: the startup overlay must never be able to trap the user.
  function killStartup(){
    try{
      var sels=['#startup','.wb-green-startup','.loading-screen','.loader-screen','.splash-screen','#loading','#loader'];
      for(var i=0;i<sels.length;i++){
        var nodes=document.querySelectorAll(sels[i]);
        for(var j=0;j<nodes.length;j++) nodes[j].remove();
      }
      if(document.body){document.body.style.overflow='';document.body.style.pointerEvents='';}
      if(document.documentElement){document.documentElement.style.overflow='';}
    }catch(e){}
  }
  // Run immediately, repeatedly, and on every DOM change because the old app
  // can recreate #startup after page load.
  killStartup();
  var started=Date.now();
  var timer=setInterval(function(){
    killStartup();
    if(Date.now()-started>15000) clearInterval(timer);
  },50);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',killStartup,{once:false});
  window.addEventListener('load',killStartup,{once:false});
  if(window.MutationObserver && document.documentElement){
    new MutationObserver(function(){killStartup();}).observe(document.documentElement,{childList:true,subtree:true});
  }
  // Keep the rest of the existing cleanup behavior.
  function cleanup(){
    killStartup();
    var style=document.getElementById('wb-cleanup-style');
    if(!style){
      style=document.createElement('style');style.id='wb-cleanup-style';
      style.textContent='#startup{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}';
      (document.head||document.documentElement).appendChild(style);
    }
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
      nav.querySelectorAll('a,button').forEach(function(el){if(/versicherung/i.test(el.textContent||'')) el.remove();});
    });
    document.querySelectorAll('.admin-btn').forEach(function(btn){
      btn.textContent='Staff';btn.style.background='linear-gradient(180deg,#75dc7d,#3e9c47)';btn.style.color='#061007';btn.style.fontWeight='900';
    });
  }
  cleanup();
  setTimeout(cleanup,100);setTimeout(cleanup,500);setTimeout(cleanup,1500);setTimeout(cleanup,3000);
})();
