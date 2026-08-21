(() => {
  const css = `
  :root{--wb-bg:#070b08;--wb-panel:#101710;--wb-panel2:#182218;--wb-line:#304330;--wb-green:#63c56b;--wb-green2:#b6ecaa}
  body{background:radial-gradient(900px 500px at 50% -180px,#284c2d55,transparent 68%),repeating-linear-gradient(0deg,#0000 0 31px,#ffffff03 31px 32px),var(--wb-bg)!important}
  body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.11;background-image:linear-gradient(45deg,#fff 1px,transparent 1px),linear-gradient(-45deg,#fff 1px,transparent 1px);background-size:32px 32px;z-index:-1}
  header{background:#080c09ee!important;border-bottom:2px solid #263a27!important;box-shadow:0 4px 0 #0008}
  .mark{border-radius:4px!important;background:linear-gradient(135deg,#8fdf82,#3e8d45)!important;border:2px solid #2d5c31;box-shadow:inset 0 -4px #2f7437,0 3px 0 #0008!important}
  .links{display:none!important}.eyebrow{color:#a9eaa0!important}.hero h1{text-shadow:0 5px 0 #0b160d,0 12px 35px #000!important}
  .stat,.card,.loan-card,.review{border-radius:6px!important;border-color:#304330!important;box-shadow:0 4px 0 #050805,0 12px 30px #0005!important}.stat,.card{background:linear-gradient(180deg,#172219,#0d120e)!important}.pic{background:repeating-linear-gradient(0deg,#121b13 0 15px,#172319 15px 30px),repeating-linear-gradient(90deg,#0000 0 15px,#ffffff03 15px 30px)!important}
  .btn,.tab,.admin-btn{border-radius:4px!important;font-weight:900!important;box-shadow:inset 0 -3px #0004}.btn.primary,.tab.active{background:#58b85f!important;border-color:#7cdb82!important;color:#071008!important}.pill{border-radius:4px!important;background:#18251a!important;border-color:#3b603e!important;color:#b7e9b0!important}.field input,.field textarea,.field select,.search{border-radius:4px!important;border-color:#354535!important;background:#0a0f0b!important}
  .section{scroll-margin-top:20px!important}.section-head{border-left:4px solid #5ebf65;padding-left:12px}.wb-category-shell{display:none!important}.wb-mobile-bottom{display:none}
  body.wb-category-mode .hero,body.wb-category-mode footer{display:none!important}body.wb-category-mode .section{display:none!important}body.wb-category-mode.wb-show-shop #shop,body.wb-category-mode.wb-show-versicherung #basis-versicherung,body.wb-category-mode.wb-show-kredit #kredit,body.wb-category-mode.wb-show-reviews #reviews{display:block!important;padding-top:35px!important;min-height:calc(100vh - 80px)}
  @media(max-width:720px){
    .wrap{width:calc(100% - 20px)!important}.nav{height:60px!important}.admin-btn{padding:8px 9px!important;font-size:11px}.brand{font-size:17px}.mark{width:34px;height:34px}.hero{padding:36px 0 20px!important}.hero h1{font-size:clamp(39px,12vw,58px)!important}.hero p{font-size:15px!important;line-height:1.55}.stats{display:grid!important;grid-template-columns:1fr 1fr;gap:8px}.stat{min-width:0!important;padding:12px!important}.section{padding:25px 0 45px!important}.section h2{font-size:24px!important}.section-head{align-items:stretch!important}.grid{grid-template-columns:1fr 1fr!important;gap:9px!important}.pic{height:145px!important}.body{padding:12px!important}.title{font-size:14px!important}.price{font-size:18px!important}.loan{grid-template-columns:1fr!important}.reviews{grid-template-columns:1fr!important}.listing-form,.review-form{grid-template-columns:1fr!important}.field.full{grid-column:auto!important}.admin-item{grid-template-columns:1fr!important}.modal-card{border-radius:8px!important;padding:16px!important}
    .wb-mobile-bottom{position:fixed;display:flex;left:8px;right:8px;bottom:8px;z-index:90;background:#0c120df5;border:1px solid #344a35;border-radius:6px;padding:5px;gap:4px;box-shadow:0 8px 35px #000b;backdrop-filter:blur(14px)}
    .wb-mobile-bottom a{flex:1;text-align:center;text-decoration:none;color:#91a091;font-size:10px;font-weight:900;padding:8px 3px;border-radius:4px}.wb-mobile-bottom a.active{background:#264329;color:#f1ffef}.wb-mobile-bottom .ico{display:block;font-size:16px;margin-bottom:2px}.wb-mobile-space{height:72px}
  }
  @media(min-width:721px){.wb-mobile-bottom,.wb-mobile-space{display:none!important}}
  @media(max-width:390px){.grid{grid-template-columns:1fr!important}.stats{grid-template-columns:1fr!important}}
  `;
  function addStyle(){if(document.getElementById('wb-modern-ui-style'))return;const s=document.createElement('style');s.id='wb-modern-ui-style';s.textContent=css;document.head.appendChild(s)}
  function showCategory(id){
    document.body.classList.add('wb-category-mode');
    document.body.classList.remove('wb-show-shop','wb-show-versicherung','wb-show-kredit','wb-show-reviews');
    document.body.classList.add('wb-show-'+id);
    document.querySelectorAll('.wb-mobile-bottom a').forEach(a=>a.classList.toggle('active',a.dataset.target===id));
    const section=document.getElementById(id==='versicherung'?'basis-versicherung':id);
    if(section)window.scrollTo({top:0,behavior:'smooth'});
  }
  function setup(){
    addStyle();
    document.querySelectorAll('.wb-category-shell').forEach(el=>el.remove());
    if(!document.querySelector('.wb-mobile-bottom')){
      const bottom=document.createElement('nav');bottom.className='wb-mobile-bottom';bottom.setAttribute('aria-label','Mobile Kategorien');
      bottom.innerHTML='<a data-target="shop" href="#shop"><span class="ico">⛏️</span>Shop</a><a data-target="versicherung" href="#basis-versicherung"><span class="ico">🛡️</span>Versicherung</a><a data-target="kredit" href="#kredit"><span class="ico">💰</span>Kredit</a><a data-target="reviews" href="#reviews"><span class="ico">⭐</span>Reviews</a>';
      document.body.appendChild(bottom);const spacer=document.createElement('div');spacer.className='wb-mobile-space';document.body.appendChild(spacer);
    }
    document.querySelectorAll('.wb-mobile-bottom a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showCategory(a.dataset.target)}));
    if(typeof wbInstallBaseInsurance==='function')wbInstallBaseInsurance();
    showCategory(location.hash==='#kredit'?'kredit':location.hash==='#reviews'?'reviews':location.hash==='#basis-versicherung'?'versicherung':'shop');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
