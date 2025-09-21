import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, FormControl, InputLabel, Select, Box, Typography } from '@mui/material';
import { loadTariffs } from '../../tariffs-store';

// Lightweight rule-based assistant (no external API). It asks a few guided questions
// and then searches `tariffs` to suggest relevant charges. Returns an array of charge objects
// compatible with quotation `charges` shape: { id, name, basis, qty, sell, margin, notes }

export default function AIChatbox({ open, onClose, onApply, defaultMode }){
  const [step, setStep] = React.useState(0);
  const [service, setService] = React.useState(defaultMode || 'Sea FCL');
  const [needsCustoms, setNeedsCustoms] = React.useState('no');
  const [origin, setOrigin] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [results, setResults] = React.useState([]);

  React.useEffect(()=>{ if(!open){ setStep(0); setService(defaultMode||'Sea FCL'); setNeedsCustoms('no'); setOrigin(''); setDestination(''); setResults([]); } }, [open, defaultMode]);

  function searchTariffs(){
    const tariffs = loadTariffs();
    const qOrigin = (origin||'').toUpperCase();
    const qDest = (destination||'').toUpperCase();
    const matches = [];
    for(const t of tariffs){
      try{
        const lane = (t.tradelane||'').toUpperCase();
        // match simple patterns: tradelane contains origin or destination or 'ALL'
        const laneMatch = !lane || lane==='ALL/ALL' || lane.includes(qDest) || lane.includes(qOrigin) || lane.includes('ALL');
        if(!laneMatch) continue;
        // if user asked about customs, prefer AMS/AMS-like charges or doc fees
        if(needsCustoms==='yes' && /AMS|DOC|BL|B\/L|CUSTOMS|IMPORT|EXPORT/i.test(t.charge||t.notes||'')){
          matches.push(t);
        }
        // For general service, include common surcharges
        if(needsCustoms!=='yes' && /(BAF|SURCHARGE|PEAK|PSS|LSS|BAF|FUEL|DOC|BL|B\/L|AMS|DO|HANDLING)/i.test(t.charge||t.notes||'')){
          matches.push(t);
        }
  }catch{/* ignore */}
    }
    // Deduplicate by id and map into charge shape
    const byId = new Map();
    matches.forEach(m=>{ if(!m || !m.id) return; if(!byId.has(m.id)) byId.set(m.id, m); });
    const out = Array.from(byId.values()).slice(0,12).map(m=> ({ id:`C-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, name: m.charge||m.notes||m.id, basis: m.basis||m.basis||'Per Shipment', qty:1, sell: Number(m.amount||m.sell||0), margin:0, notes:`Suggested from tariff ${m.id}` }));
    setResults(out);
    setStep(3);
  }

  function applySelected(){
    if(onApply && results && results.length) onApply(results);
    onClose();
  }

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Assistant: Help create this quotation</DialogTitle>
      <DialogContent dividers>
        {step===0 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="body2">I can suggest tariffs and charges based on simple questions. Shall we begin?</Typography>
            <Box display="flex" gap={1}>
              <Button variant="contained" onClick={()=>setStep(1)}>Yes, start</Button>
              <Button variant="outlined" onClick={onClose}>Cancel</Button>
            </Box>
          </Box>
        )}
        {step===1 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <FormControl size="small">
              <InputLabel>Service</InputLabel>
              <Select label="Service" value={service} onChange={e=>setService(e.target.value)}>
                {['Sea FCL','Sea LCL','Air','Transport','Customs'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Customs required?</InputLabel>
              <Select label="Customs required?" value={needsCustoms} onChange={e=>setNeedsCustoms(e.target.value)}>
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Origin (code or city)" value={origin} onChange={e=>setOrigin(e.target.value)} />
            <TextField size="small" label="Destination (code or city)" value={destination} onChange={e=>setDestination(e.target.value)} />
            <Box display="flex" gap={1}>
              <Button variant="contained" onClick={searchTariffs}>Find suggested charges</Button>
              <Button variant="outlined" onClick={()=>setStep(0)}>Back</Button>
            </Box>
          </Box>
        )}
        {step===3 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="subtitle2">Suggestions</Typography>
            {results.length===0 && <Typography variant="body2" color="text.secondary">No matches found. Try broader origin/destination or change service/customs option.</Typography>}
            {results.map((r)=> (
              <Box key={r.id} border={1} borderColor="divider" p={1} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" fontWeight={500}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.notes}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2">{r.basis}</Typography>
                  <Typography variant="caption">Sell: {Number(r.sell||0).toFixed(2)}</Typography>
                </Box>
              </Box>
            ))}
            <Box display="flex" gap={1}>
              <Button variant="contained" onClick={applySelected} disabled={!results.length}>Apply all</Button>
              <Button variant="outlined" onClick={()=>setStep(1)}>Refine</Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
