import React from 'react';
import { Tooltip, Typography } from '@mui/material';

// Given a code string, look up the name in localStorage's chargeCodes and render "CODE — Name".
export default function ChargeCodeLabel({ code, fallback='-' , variant='body2' }){
  const [label, setLabel] = React.useState(() => {
    if(!code) return fallback;
    try{ const raw = localStorage.getItem('chargeCodes'); if(!raw) return String(code).toUpperCase(); const parsed = JSON.parse(raw); if(Array.isArray(parsed)){ const found = parsed.find(c=> String(c.code).toUpperCase() === String(code).toUpperCase()); return found ? `${found.code} — ${found.name}` : String(code).toUpperCase(); } }catch(e){ console.debug('charge-code-label: initial parse failed', e); }
    return String(code).toUpperCase();
  });

  React.useEffect(()=>{
    function reload(){
      if(!code) return setLabel(fallback);
      try{ const raw = localStorage.getItem('chargeCodes'); if(!raw) return setLabel(String(code).toUpperCase()); const parsed = JSON.parse(raw); if(Array.isArray(parsed)){ const found = parsed.find(c=> String(c.code).toUpperCase() === String(code).toUpperCase()); setLabel(found ? `${found.code} — ${found.name}` : String(code).toUpperCase()); return; } }
      catch(e){ console.debug('charge-code-label: reload parse failed', e); }
      setLabel(String(code).toUpperCase());
    }
    window.addEventListener('storage', reload);
    window.addEventListener('chargeCodesUpdated', reload);
    window.addEventListener('focus', reload);
    reload();
    return ()=>{ window.removeEventListener('storage', reload); window.removeEventListener('chargeCodesUpdated', reload); window.removeEventListener('focus', reload); };
  }, [code, fallback]);

  return (
    <Tooltip title={label}>
      <Typography variant={variant} sx={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</Typography>
    </Tooltip>
  );
}
