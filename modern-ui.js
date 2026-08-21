(()=>{
const style=`:root{--wb-green:#63c96b;--wb-blue:#4da3ff;--wb-blue2:#9ed0ff;--wb-dark:#080b09;--wb-line:#2c3b2e}body{background:radial-gradient(800px 400px at 50% -120px,#315b3455,transparent 70%),var(--wb-dark)!important}.mark{background:linear-gradient(145deg,#b9f2b2 0,#70cf76 35%,#3d8f46 70%,#245b2b 100%)!important;color:#061007!important;border:1px solid #8ee28c!important;box-shadow:0 0 24px #63c96b55,inset 0 1px #ffffff66!important}.brand{color:#eaffea!important}.wb-top-cats,.wb-mobile-bottom{display:none!important}
#startup .space{background:radial-gradient(circle at 50% 50%,#2377d52b 0,#10294a22 28%,#020711 68%)!important}
#startup .stars{background-image:radial-gradient(circle,#fff 1px,transparent 1.7px),radial-gradient(circle,#8fc9ff 1px,transparent 1.7px)!important}
#startup .pulse{border-color:#4da3ff35!important;box-shadow:0 0 120px #4da3ff20 inset!important}
#startup .orbit{border-color:#9ed0ff55!important}#startup .orbit.o2{border-color:#4da3ff35!important}#startup .orbit.o3{border-color:#9ed0ff18!important}
#startup .orbit i{background:#e5f3ff!important;box-shadow:0 0 25px 7px #4da3ff!important}
#startup .vault{background:linear-gradient(145deg,#dff1ff 0,#7dc1ff 27%,#3186d9 58%,#17477e 100%)!important;box-shadow:0 0 55px #4da3ff99,0 0 180px #2d82e533,0 35px 100px #000!important}
#startup .vmark{color:#fff!important;text-shadow:0 4px 30px #17477e!important}
#startup .vault:after{box-shadow:0 0 28px 10px #8dccff!important}
#startup .shard{background:linear-gradient(#fff,#4da3ff)!important;box-shadow:0 0 15px #4da3ff!important}
#startup .shock{border-color:#9ed0ff!important}
#startup .start-name{color:#eaf5ff!important}#startup .start-sub{color:#a9c9e8!important}
#startup .progress{background:#17283a!important}.progress i,#startup .progress i{background:linear-gradient(90deg,#1769b0,#dff1ff,#4da3ff,#1769b0)!important;background-size:220% 100%!important}
#startup .sound-btn{border-color:#315b86!important;background:#0b1a2bdd!important;color:#dceeff!important}
`;
function addStyle(){if(document.getElementById('wb-blue-startup'))return;const s=document.createElement('style');s.id='wb-blue-startup';s.textContent=style;document.head.appendChild(s)}
function init(){addStyle()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();