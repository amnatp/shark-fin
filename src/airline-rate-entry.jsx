// airline-rate-entry.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardHeader, CardContent, Typography, TextField, Button, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert,
  FormControl, InputLabel, Select, MenuItem, Divider, Chip, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const DEFAULT_BREAKS = [45, 100, 300, 500, 1000];
const CURRENCIES = ['USD','THB','SGD','CNY','EUR'];
const uid = (p='AIR') => `${p}-${Date.now()}-${Math.random().toString(16).slice(2,7)}`;
const money = (n, cur) => `${(Number(n)||0).toFixed(2)} ${cur||''}`.trim();

function sortBreaks(arr){ return [...arr].sort((a,b)=> Number(a.thresholdKg) - Number(b.thresholdKg)); }
function blankBreak(th=45, rate=0){ return { id: uid('BRK'), thresholdKg: Number(th)||0, ratePerKg: Number(rate)||0 }; }
function blankCommodity(copyFrom){ // optional copy of breaks from general
  return {
    id: uid('COM'),
    code: '',
    description: '',
    minCharge: 0,
    breaks: copyFrom ? copyFrom.map(b => ({ ...blankBreak(b.thresholdKg, b.ratePerKg) })) : []
  };
}
function blankSheet(){
  return {
    id: uid('SHEET'),
    airline: { name:'', iata:'' },
    route: { origin:'', destination:'', via:'' },
    flightInfo: { flightNo:'', serviceType:'Airport/Airport' },
    currency: 'USD',
    validFrom: '', validTo: '',
    general: { minCharge: 0, breaks: DEFAULT_BREAKS.map(th => blankBreak(th, 0)) },
    commodities: [], // array of { code, description, minCharge, breaks[] }
  };
}

// compute stepped charge for weight with min
function priceByBreaks(weightKg, minCharge, breaks){
  const w = Number(weightKg)||0;
  const list = sortBreaks(breaks||[]);
  // pick the highest threshold <= weight; if weight < smallest threshold, use the smallest threshold’s rate
  let chosen = list[0] || { thresholdKg: 0, ratePerKg: 0 };
  for(const b of list){ if(w >= Number(b.thresholdKg)) chosen = b; else break; }
  const base = w * (Number(chosen.ratePerKg)||0);
  const charge = Math.max(base, Number(minCharge)||0);
  return {
    appliedBreakKg: Number(chosen.thresholdKg)||0,
    perKgRate: Number(chosen.ratePerKg)||0,
    baseAmount: base,
    minCharge: Number(minCharge)||0,
    finalCharge: charge,
    appliedMinimum: charge > base
  };
}

function BreaksTable({ title, currency, data, onAdd, onUpd, onDel, minCharge, onMinChange }){
  return (
    <Card variant="outlined">
      <CardHeader
        title={title}
        action={<Button size="small" startIcon={<AddIcon/>} onClick={onAdd}>Add Break</Button>}
      />
      <CardContent sx={{ pt:0 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={1.5}>
          <TextField
            size="small" type="number" label="Minimum Charge"
            value={minCharge} onChange={e=>onMinChange(Number(e.target.value||0))}
            sx={{ width:200 }} inputProps={{ min:0, step:0.01 }}
          />
          <Chip size="small" label={`Currency: ${currency}`} />
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={140}>Weight Break (≥ kg)</TableCell>
              <TableCell width={160} align="right">Rate / kg ({currency})</TableCell>
              <TableCell align="center" width={64}>Del</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length===0 && (
              <TableRow><TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary">No breaks yet. Click “Add Break”.</Typography>
              </TableCell></TableRow>
            )}
            {sortBreaks(data).map((b,ix)=>(
              <TableRow key={b.id} hover>
                <TableCell>
                  <TextField size="small" type="number" value={b.thresholdKg}
                    onChange={e=>onUpd(b.id,{ thresholdKg:Number(e.target.value||0) })}
                    inputProps={{ min:0, step:1 }} sx={{ width:140 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={b.ratePerKg}
                    onChange={e=>onUpd(b.id,{ ratePerKg:Number(e.target.value||0) })}
                    inputProps={{ min:0, step:0.01 }} sx={{ width:160 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={()=>onDel(b.id)}><DeleteIcon fontSize="inherit" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" color="text.secondary">
          Tip: Typical breaks are {DEFAULT_BREAKS.join(', ')} kg. Higher break ⇒ lower rate/kg.
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function AirlineRateEntry(){
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = React.useState(()=> {
    // try load draft from localStorage
    try{ return JSON.parse(localStorage.getItem('airlineRateDraft')||'null') || blankSheet(); }catch{ return blankSheet(); }
  });
  const [sheetsList, setSheetsList] = React.useState(()=> {
    try { return JSON.parse(localStorage.getItem('airlineRateSheets')||'[]'); } catch { return []; }
  });
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });

  // tester
  const [test, setTest] = React.useState({ weightKg: 120, useCommodityId: 'NONE' });

  React.useEffect(()=>{
    try{ localStorage.setItem('airlineRateDraft', JSON.stringify(sheet)); }catch{}
  }, [sheet]);

  // If a route param is present, load that sheet when list or param changes
  React.useEffect(()=>{
    if(!routeId) return;
    const found = sheetsList.find(s=> s.id===routeId);
    if(found) setSheet(found);
  }, [routeId, sheetsList]);

  // Listen for external changes (other tabs)
  React.useEffect(()=>{
    function reload(){ try { setSheetsList(JSON.parse(localStorage.getItem('airlineRateSheets')||'[]')); } catch{/* ignore */} }
    window.addEventListener('storage', reload);
    window.addEventListener('focus', reload);
    return ()=>{ window.removeEventListener('storage', reload); window.removeEventListener('focus', reload); };
  }, []);

  function refreshSheets(){ try { setSheetsList(JSON.parse(localStorage.getItem('airlineRateSheets')||'[]')); } catch { /* ignore */ } }

  function setHdr(p){ setSheet(s=> ({ ...s, ...p })); }
  function setAirline(p){ setSheet(s=> ({ ...s, airline:{ ...s.airline, ...p } })); }
  function setRoute(p){ setSheet(s=> ({ ...s, route:{ ...s.route, ...p } })); }
  function setFlight(p){ setSheet(s=> ({ ...s, flightInfo:{ ...s.flightInfo, ...p } })); }

  // GENERAL breaks ops
  function addBreakGeneral(){ setSheet(s=> ({ ...s, general:{ ...s.general, breaks:[...s.general.breaks, blankBreak()] } })); }
  function updBreakGeneral(id, patch){ setSheet(s=> ({ ...s, general:{ ...s.general, breaks: s.general.breaks.map(b=> b.id===id? { ...b, ...patch }: b) } })); }
  function delBreakGeneral(id){ setSheet(s=> ({ ...s, general:{ ...s.general, breaks: s.general.breaks.filter(b=> b.id!==id) } })); }

  // COMMODITIES ops
  function addCommodity(copy=false){ setSheet(s=> ({ ...s, commodities:[...s.commodities, blankCommodity(copy ? s.general.breaks : null)] })); }
  function updCommodity(id, patch){ setSheet(s=> ({ ...s, commodities: s.commodities.map(c=> c.id===id? { ...c, ...patch } : c) })); }
  function delCommodity(id){ setSheet(s=> ({ ...s, commodities: s.commodities.filter(c=> c.id!==id) })); }
  function addBreakCommodity(cid){ setSheet(s=> ({ ...s, commodities: s.commodities.map(c=> c.id===cid? { ...c, breaks:[...c.breaks, blankBreak()] } : c) })); }
  function updBreakCommodity(cid, bid, patch){ setSheet(s=> ({ ...s, commodities: s.commodities.map(c=> c.id===cid? { ...c, breaks: c.breaks.map(b=> b.id===bid? { ...b, ...patch }: b) } : c) })); }
  function delBreakCommodity(cid, bid){ setSheet(s=> ({ ...s, commodities: s.commodities.map(c=> c.id===cid? { ...c, breaks: c.breaks.filter(b=> b.id!==bid) } : c) })); }

  // export/save
  function saveToStorage(){
    try{
      const list = JSON.parse(localStorage.getItem('airlineRateSheets')||'[]');
      const next = [sheet, ...list.filter(x=>x.id!==sheet.id)];
      localStorage.setItem('airlineRateSheets', JSON.stringify(next));
      refreshSheets();
  deriveAndPersistSimpleAirRates(next);
      setSnack({ open:true, ok:true, msg:`Saved sheet ${sheet.id}` });
    }catch(e){ console.error(e); setSnack({ open:true, ok:false, msg:'Save failed' }); }
  }
  function saveAsCopy(){
    try {
      const copy = deepCloneSheetWithNewIds(sheet);
      const list = JSON.parse(localStorage.getItem('airlineRateSheets')||'[]');
      const next = [copy, ...list];
      localStorage.setItem('airlineRateSheets', JSON.stringify(next));
      setSheet(copy);
      refreshSheets();
  deriveAndPersistSimpleAirRates(next);
      setSnack({ open:true, ok:true, msg:`Saved copy as ${copy.id}` });
    } catch(e){ console.error(e); setSnack({ open:true, ok:false, msg:'Copy failed' }); }
  }
  function deleteSheet(){
    if(!window.confirm('Delete this sheet?')) return;
    try {
      const list = JSON.parse(localStorage.getItem('airlineRateSheets')||'[]');
      const next = list.filter(s=> s.id!==sheet.id);
      localStorage.setItem('airlineRateSheets', JSON.stringify(next));
      localStorage.removeItem('airlineRateDraft');
      setSheet(blankSheet());
      refreshSheets();
  deriveAndPersistSimpleAirRates(next);
      setSnack({ open:true, ok:true, msg:'Deleted.' });
    } catch(e){ console.error(e); setSnack({ open:true, ok:false, msg:'Delete failed' }); }
  }

  function loadExisting(id){
    const found = sheetsList.find(s=> s.id===id);
    if(found){ setSheet(found); }
  }

  function deepCloneSheetWithNewIds(orig){
    const mapBreak = (b)=> ({ ...b, id: uid('BRK') });
    const mapCommodity = (c)=> ({ ...c, id: uid('COM'), breaks: (c.breaks||[]).map(mapBreak) });
    return {
      ...orig,
      id: uid('SHEET'),
      general: { ...orig.general, breaks:(orig.general?.breaks||[]).map(mapBreak) },
      commodities: (orig.commodities||[]).map(mapCommodity)
    };
  }
  function exportJSON(){
    const blob = new Blob([JSON.stringify(sheet, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `airline_rate_${sheet.id}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  // Derive simplified Air rows (cost/sell) from sheets for linkage with legacy sample Air data
  function deriveAndPersistSimpleAirRates(allSheets){
    try {
      const rows = (allSheets||[]).map(s=>{
        const lane = `${s.route?.origin||''} → ${s.route?.destination||''}`.trim();
        const vendor = s.airline?.iata || s.airline?.name || '-';
        const breaks = (s.general?.breaks||[]);
        if(!breaks.length) return null;
        // pick break 100 if available else the lowest threshold
        const prefer = breaks.find(b=> Number(b.thresholdKg)===100) || breaks.slice().sort((a,b)=>a.thresholdKg-b.thresholdKg)[0];
        const baseRate = Number(prefer.ratePerKg)||0;
        const costRate = +(baseRate*0.85).toFixed(4); // assume 15% margin
        const sellRate = baseRate;
        const minCharge = Number(s.general?.minCharge)||0;
        const minCost = +(minCharge*0.85).toFixed(2);
        const minSell = minCharge;
        const ros = sellRate? Math.round(((sellRate - costRate)/sellRate)*100) : 0;
        return {
          lane,
          vendor,
            // retain id link for reverse lookup
          sheetId: s.id,
          ratePerKgCost: costRate,
          ratePerKgSell: sellRate,
          minChargeCost: minCost,
          minChargeSell: minSell,
          ros,
          chargeCode: 'FRT-A'
        };
      }).filter(Boolean);
      localStorage.setItem('derivedAirRates', JSON.stringify(rows));
    } catch(e){ /* ignore */ }
  }

  // tester calculation
  const testerResult = React.useMemo(()=>{
    const w = Number(test.weightKg)||0;
    if(test.useCommodityId && test.useCommodityId!=='NONE'){
      const c = sheet.commodities.find(x=>x.id===test.useCommodityId);
      if(!c) return null;
      return { scope:`Commodity: ${c.code||'(unnamed)'}`, ...priceByBreaks(w, c.minCharge, c.breaks) };
    }
    return { scope:'General Tariff', ...priceByBreaks(w, sheet.general.minCharge, sheet.general.breaks) };
  }, [test, sheet]);

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      {/* Top meta section removed per requirement: title + sheet id + load existing */}
      <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
        <Button size="small" startIcon={<ContentCopyIcon/>} onClick={()=>setSheet(blankSheet())}>New</Button>
        <Button size="small" onClick={saveAsCopy}>Save Copy</Button>
        <Button size="small" startIcon={<DownloadIcon/>} onClick={exportJSON}>Export</Button>
        <Button size="small" color="error" onClick={deleteSheet}>Delete</Button>
        <Button size="small" variant="contained" startIcon={<SaveIcon/>} onClick={saveToStorage}>Save</Button>
      </Box>

      {/* Header */}
      <Card variant="outlined">
        <CardHeader title="Header" />
        <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField size="small" label="Airline Name" value={sheet.airline.name} onChange={e=>setAirline({ name:e.target.value })} sx={{ minWidth:220 }} />
            <TextField size="small" label="IATA" value={sheet.airline.iata} onChange={e=>setAirline({ iata:e.target.value.toUpperCase() })} sx={{ width:100 }} />
            <TextField size="small" label="Origin (IATA)" value={sheet.route.origin} onChange={e=>setRoute({ origin:e.target.value.toUpperCase() })} sx={{ width:140 }} />
            <TextField size="small" label="Destination (IATA)" value={sheet.route.destination} onChange={e=>setRoute({ destination:e.target.value.toUpperCase() })} sx={{ width:160 }} />
            <TextField size="small" label="Via (optional)" value={sheet.route.via} onChange={e=>setRoute({ via:e.target.value.toUpperCase() })} sx={{ width:160 }} />
            <FormControl size="small" sx={{ minWidth:120 }}>
              <InputLabel>Currency</InputLabel>
              <Select label="Currency" value={sheet.currency} onChange={e=>setHdr({ currency:e.target.value })}>
                {CURRENCIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Valid From" InputLabelProps={{ shrink:true }}
              value={sheet.validFrom} onChange={e=>setHdr({ validFrom:e.target.value })} sx={{ width:160 }} />
            <TextField size="small" type="date" label="Valid To" InputLabelProps={{ shrink:true }}
              value={sheet.validTo} onChange={e=>setHdr({ validTo:e.target.value })} sx={{ width:160 }} />
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField size="small" label="Flight No." value={sheet.flightInfo.flightNo} onChange={e=>setFlight({ flightNo:e.target.value.toUpperCase() })} sx={{ width:160 }} />
            <FormControl size="small" sx={{ minWidth:200 }}>
              <InputLabel>Service Type</InputLabel>
              <Select label="Service Type" value={sheet.flightInfo.serviceType} onChange={e=>setFlight({ serviceType:e.target.value })}>
                {['Airport/Airport','Door/Airport','Airport/Door','Door/Door'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* General (MIN + Breaks) */}
      <BreaksTable
        title="General Tariff"
        currency={sheet.currency}
        data={sheet.general.breaks}
        minCharge={sheet.general.minCharge}
        onMinChange={(v)=>setSheet(s=> ({ ...s, general:{ ...s.general, minCharge:v } }))}
        onAdd={addBreakGeneral}
        onUpd={updBreakGeneral}
        onDel={delBreakGeneral}
      />

      {/* Commodities */}
      <Card variant="outlined">
        <CardHeader
          title="Commodity Rates"
          action={
            <Box display="flex" gap={1}>
              <Tooltip title="Copy general breaks into new commodity">
                <Button size="small" startIcon={<ContentCopyIcon/>} onClick={()=>addCommodity(true)}>New from General</Button>
              </Tooltip>
              <Button size="small" startIcon={<AddIcon/>} onClick={()=>addCommodity(false)}>Add Commodity</Button>
            </Box>
          }
        />
        <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          {sheet.commodities.length===0 && (
            <Typography variant="body2" color="text.secondary">No commodity rates yet. Add one to override the general tariff for eligible cargo.</Typography>
          )}
          {sheet.commodities.map((c)=>(
            <Card key={c.id} variant="outlined">
              <CardHeader
                titleTypographyProps={{ variant:'subtitle2' }}
                title={c.code ? `${c.code} — ${c.description||''}` : '(Unnamed commodity)'}
                action={<IconButton size="small" onClick={()=>delCommodity(c.id)}><DeleteIcon fontSize="inherit" /></IconButton>}
              />
              <CardContent sx={{ pt:0, display:'flex', flexDirection:'column', gap:2 }}>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <TextField size="small" label="Commodity Code" value={c.code} onChange={e=>updCommodity(c.id,{ code:e.target.value.toUpperCase() })} sx={{ width:180 }} />
                  <TextField size="small" label="Description" value={c.description} onChange={e=>updCommodity(c.id,{ description:e.target.value })} sx={{ minWidth:260 }} />
                  <TextField size="small" type="number" label="Minimum Charge" value={c.minCharge}
                    onChange={e=>updCommodity(c.id, { minCharge:Number(e.target.value||0) })} sx={{ width:200 }} inputProps={{ min:0, step:0.01 }} />
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={140}>Weight Break (≥ kg)</TableCell>
                      <TableCell width={160} align="right">Rate / kg ({sheet.currency})</TableCell>
                      <TableCell align="center" width={64}>
                        <Button size="small" startIcon={<AddIcon/>} onClick={()=>addBreakCommodity(c.id)}>Add</Button>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortBreaks(c.breaks).map(b=>(
                      <TableRow key={b.id} hover>
                        <TableCell>
                          <TextField size="small" type="number" value={b.thresholdKg}
                            onChange={e=>updBreakCommodity(c.id, b.id, { thresholdKg:Number(e.target.value||0) })}
                            inputProps={{ min:0, step:1 }} sx={{ width:140 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={b.ratePerKg}
                            onChange={e=>updBreakCommodity(c.id, b.id, { ratePerKg:Number(e.target.value||0) })}
                            inputProps={{ min:0, step:0.01 }} sx={{ width:160 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={()=>delBreakCommodity(c.id, b.id)}><DeleteIcon fontSize="inherit" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {c.breaks.length===0 && (
                      <TableRow><TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">No breaks yet. Click “Add”.</Typography>
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Tester */}
      <Card variant="outlined">
        <CardHeader title="Pricing Tester (applies weight breaks and MIN)" />
        <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField size="small" type="number" label="Chargeable Weight (kg)" value={test.weightKg}
              onChange={e=>setTest(t=> ({ ...t, weightKg:Number(e.target.value||0) }))} sx={{ width:220 }} inputProps={{ min:1, step:1 }} />
            <FormControl size="small" sx={{ minWidth:240 }}>
              <InputLabel>Use Rate Scope</InputLabel>
              <Select label="Use Rate Scope" value={test.useCommodityId}
                onChange={e=>setTest(t=> ({ ...t, useCommodityId:e.target.value }))}>
                <MenuItem value="NONE">General Tariff</MenuItem>
                {sheet.commodities.map(c=> <MenuItem key={c.id} value={c.id}>{c.code || '(unnamed)'} — {c.description}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          {testerResult && (
            <Box display="grid" gridTemplateColumns="repeat(5, minmax(120px,1fr))" gap={12} alignItems="center">
              <Chip label={testerResult.scope} />
              <Box>Applied Break:<br/><strong>≥ {testerResult.appliedBreakKg} kg</strong></Box>
              <Box>Rate / kg:<br/><strong>{money(testerResult.perKgRate, sheet.currency)}</strong></Box>
              <Box>Base Amount:<br/><strong>{money(testerResult.baseAmount, sheet.currency)}</strong></Box>
              <Box>Final Charge:<br/>
                <strong>{money(testerResult.finalCharge, sheet.currency)}</strong>
                {testerResult.appliedMinimum && <Typography variant="caption" color="text.secondary" display="block">(MIN applied: {money(testerResult.minCharge, sheet.currency)})</Typography>}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={2800} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
