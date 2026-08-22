(function(){
  // WindBank cleanup: this script intentionally runs synchronously at the end of index.html.
  var style=document.createElement('style');
  style.id='wb-cleanup-style';
  style.textContent='#startup{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}.wb-green-startup{display:none!important}';
  document.head.appendChild(style);

  var startup=document.getElementById('startup');
  if(startup) startup.remove();
  document.querySelectorAll('.wb-green-startup,.loading-screen,.loader-screen,.splash-screen,#loading,#loader').forEach(function(el){el.remove();});

  // Remove the old insurance UI wherever it is injected.
  document.querySelectorAll('section,article').forEach(function(el){
    var text=(el.textContent||'');
    if(/versicherung von basen|wähle deinen basen-schutz|basis-schutz.*2%/is.test(text)) el.remove();
  });
  document.querySelectorAll('a,button').forEach(function(el){
    if(/versicherung/i.test((el.textContent||''))){
      var nav=el.closest('nav,.links,.tabs,.tabbar,.bottom-nav,.wb-bottom,.navigation,.navbar');
      if(nav) el.remove();
    }
  });

  // Keep the Staff button green.
  document.querySelectorAll('.admin-btn').forEach(function(btn){
    btn.textContent='Staff';
    btn.style.background='linear-gradient(180deg,#75dc7d,#3e9c47)';
    btn.style.color='#061007';
    btn.style.fontWeight='900';
  });
})();
