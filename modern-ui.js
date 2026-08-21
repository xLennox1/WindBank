(()=>{
const style=`:root{--wb-green:#63c96b;--wb-dark:#080b09;--wb-line:#2c3b2e}body{background:radial-gradient(800px 400px at 50% -120px,#315b3455,transparent 70%),var(--wb-dark)!important}.stat,.card,.loan-card,.review{border-color:var(--wb-line)!important;background:linear-gradient(180deg,#151d17,#0e130f)!important;border-radius:7px!important}.btn.primary,.tab.active{background:var(--wb-green)!important;border-color:#91dc8d!important;color:#081009!important}.wb-top-cats,.wb-mobile-bottom{display:none!important}body.wb-cat-mode .hero,body.wb-cat-mode footer{display:none!important}body.wb-cat-mode main>.section.wb-hide{display:none!important}body.wb-cat-mode main>.section.wb-show{display:block!important}`;
function addStyle(){if(document.getElementById('wb-nav-style'))return;const s=document.createElement('style');s.id='wb-nav-style';s.textContent=style;document.head.appendChild(s)}
function cleanup(){document.querySelectorAll('.wb-top-cats,.wb-mobile-bottom').forEach(el=>el.remove())}
function init(){addStyle();cleanup();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();