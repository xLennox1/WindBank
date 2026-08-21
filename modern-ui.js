(()=>{
const style=`:root{--wb-green:#63c96b;--wb-dark:#080b09;--wb-line:#2c3b2e}body{background:radial-gradient(800px 400px at 50% -120px,#315b3455,transparent 70%),var(--wb-dark)!important}.stat,.card,.loan-card,.review{border-color:var(--wb-line)!important;background:linear-gradient(180deg,#151d17,#0e130f)!important;border-radius:7px!important}.btn.primary,.tab.active{background:var(--wb-green)!important;border-color:#91dc8d!important;color:#081009!important}.links{display:none!important}.wb-mobile-bottom{display:none}body.wb-cat-mode .hero,body.wb-cat-mode footer{display:none!important}body.wb-cat-mode main>.section.wb-hide{display:none!important}body.wb-cat-mode main>.section.wb-show{display:block!important}@media(max-width:720px){.wb-mobile-bottom{position:fixed;display:flex;left:8px;right:8px;bottom:8px;z-index:999;background:#0c120df5;border:1px solid #344a35;border-radius:7px;padding:5px;gap:4px;box-shadow:0 8px 35px #000b;backdrop-filter:blur(14px)}.wb-mobile-bottom a{flex:1;text-align:center;text-decoration:none;color:#91a091;font-size:10px;font-weight:900;padding:8px 3px;border-radius:4px}.wb-mobile-bottom a.active{background:#264329;color:#f1ffef}.wb-mobile-bottom .ico{display:block;font-size:16px;margin-bottom:2px}}`;
function addStyle(){if(document.getElementById('wb-final-style'))return;const s=document.createElement('style');s.id='wb-final-style';s.textContent=style;document.head.appendChild(s)}
function sections(){return [...document.querySelectorAll('main>.section')].filter(s=>!s.classList.contains('modal'))}
function find(type){
 if(type==='shop')return document.getElementById('grid')?.closest('.section');
 if(type==='reviews')return document.getElementById('reviewsGrid')?.closest('.section');
 if(type==='versicherung')return document.getElementById('wb-base-insurance')?.closest('.section')||document.getElementById('wb-base-insurance');
 if(type==='kredit'){
   const exact=document.querySelector('#kredit');
   if(exact)return exact.closest('.section')||exact;
   const loan=document.querySelector('.loan');
   if(loan)return loan.closest('.section');
   return sections().find(s=>/kredit|darlehen|zins/i.test(s.innerText||''));
 }
}
function show(type,push=true){const target=find(type);if(!target){if(type==='versicherung'&&typeof wbInstallBaseInsurance==='function')wbInstallBaseInsurance();return setTimeout(()=>show(type,push),250)}document.body.classList.add('wb-cat-mode');sections().forEach(s=>{s.classList.remove('wb-show');s.classList.add('wb-hide')});target.classList.remove('wb-hide');target.classList.add('wb-show');document.querySelectorAll('.wb-mobile-bottom a').forEach(a=>a.classList.toggle('active',a.dataset.target===type));if(push)history.pushState({cat:type},'',`#${type}`);window.scrollTo(0,0)}
function nav(){if(document.querySelector('.wb-mobile-bottom'))return;const n=document.createElement('nav');n.className='wb-mobile-bottom';n.innerHTML='<a href="#shop" data-target="shop"><span class="ico">⛏️</span>Shop</a><a href="#versicherung" data-target="versicherung"><span class="ico">🛡️</span>Versicherung</a><a href="#kredit" data-target="kredit"><span class="ico">💰</span>Kredit</a><a href="#reviews" data-target="reviews"><span class="ico">⭐</span>Reviews</a>';n.addEventListener('click',e=>{const a=e.target.closest('a');if(a){e.preventDefault();show(a.dataset.target)}});document.body.appendChild(n)}
function init(){addStyle();nav();if(typeof wbInstallBaseInsurance==='function')wbInstallBaseInsurance();const apply=()=>show(['shop','versicherung','kredit','reviews'].includes(location.hash.slice(1))?location.hash.slice(1):'shop',false);setTimeout(apply,800);setTimeout(apply,1800);window.addEventListener('popstate',apply);window.addEventListener('hashchange',apply)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();