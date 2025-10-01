import React from 'react';
import { Autocomplete, TextField } from '@mui/material';

// Reusable Autocomplete that provides charge code suggestions (code + name)
// - valueCode: currently selected code string
// - onChange: called with new code string (uppercase)
// - label: optional label for the text field
export default function ChargeCodeAutocomplete({ valueCode, onChange, label='Code', size='small', helperText, error }){
  const [codes, setCodes] = React.useState(()=>{
    try{ const raw = localStorage.getItem('chargeCodes'); if(!raw) return []; const parsed = JSON.parse(raw); if(Array.isArray(parsed)) return parsed; }catch(e){ console.debug('charge-code-autocomplete: parse chargeCodes failed', e); }
    return [];
  });

  React.useEffect(()=>{
    function reload(){
      try{ const raw = localStorage.getItem('chargeCodes'); if(!raw){ setCodes([]); return; } const parsed = JSON.parse(raw); if(Array.isArray(parsed)) setCodes(parsed); }
      catch(e){ console.debug('charge-code-autocomplete: reload parse failed', e); }
    }
    // listen to storage events (other tabs) and custom event for same-tab updates
    window.addEventListener('storage', reload);
    window.addEventListener('chargeCodesUpdated', reload);
    // Also reload on focus in case manager changed data
    window.addEventListener('focus', reload);
    return ()=>{ window.removeEventListener('storage', reload); window.removeEventListener('chargeCodesUpdated', reload); window.removeEventListener('focus', reload); };
  }, []);

  const options = React.useMemo(()=> (codes||[]).filter(c=> c && c.code).map(c=> ({ code: String(c.code).toUpperCase(), name: c.name || '' })), [codes]);

  const selected = React.useMemo(()=> {
    if(!valueCode) return '';
    const found = options.find(o => o.code === String(valueCode).toUpperCase());
    return found || String(valueCode).toUpperCase();
  }, [options, valueCode]);

  function getLabel(opt){
    if(!opt) return '';
    if(typeof opt === 'string') return opt;
    return `${opt.code}${opt.name? ` — ${opt.name}` : ''}`;
  }

  return (
    <Autocomplete
      size={size}
      options={options}
      getOptionLabel={getLabel}
      // Do not allow free text selection — force choosing from options
      freeSolo={false}
      value={selected}
      onChange={(_e, val) => {
        if(!val) return onChange('');
        // If an object option selected, return its code; otherwise clear
        if(typeof val === 'object' && val && val.code) return onChange(String(val.code||'').trim().toUpperCase());
        return onChange('');
      }}
      // Prevent typing from directly changing the bound value; only allow selection
      onInputChange={(_e, val, reason) => {
        if(reason === 'clear') onChange('');
      }}
      renderInput={(params)=> (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  );
}
