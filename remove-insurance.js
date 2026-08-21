(()=>{
  // Final cleanup: Versicherung vollständig aus der Oberfläche entfernen.
  const removeInsurance=()=>{
    document.querySelectorAll('#insurance,.wb-insurance,.wb-insurance-grid,.wb-ins-card').forEach(el=>el.remove());
    document.querySelectorAll('a,button').forEach(el=>{
      if(el.closest('#adminContent')) return;
      const t=(el.textContent||'').trim().toLowerCase();
      if(t==='versicherung'||t==='base-versicherung') el.remove();
    });
    document.querySelectorAll('#adminContent .wb-staff-tab,#adminContent [data-section]').forEach(el=>{
      const t=((el.textContent||'')+' '+(el.getAttribute('data-section')||'')).toLowerCase();
      if(t.includes('versicherung')||t.includes('insurance')) el.remove();
    });
  };
  removeInsurance();
  new MutationObserver(removeInsurance).observe(document.body,{childList:true,subtree:true});
})();
