// airline-rate-entry.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
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
function blankBreak(th=45, buy=0, sell=0, minRate=0, normalRate=0){
  return {
    id: uid('BRK'),
    thresholdKg: Number(th)||0,
    buyRatePerKg: Number(buy)||0,
    sellRatePerKg: Number(sell)||0,
    // legacy-style published rates (Rate class M = minimum, N = normal)
    minRatePerKg: Number(minRate)||0,
    normalRatePerKg: Number(normalRate)||0
  };
}
function blankCommodity(copyFrom){ // optional copy of breaks from general
  return {
    id: uid('COM'),
    code: '',
    description: '',
  minChargeBuy: 0,
  minChargeSell: 0,
  breaks: copyFrom ? copyFrom.map(b => ({ ...blankBreak(b.thresholdKg, b.buyRatePerKg ?? (b.ratePerKg||0), b.sellRatePerKg ?? (b.ratePerKg||0), b.minRatePerKg ?? b.sellRatePerKg ?? 0, b.normalRatePerKg ?? b.sellRatePerKg ?? 0) })) : []
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
  general: { minChargeBuy: 0, minChargeSell: 0, breaks: DEFAULT_BREAKS.map(th => blankBreak(th, 0, 0, 0, 0)) },
    commodities: [], // array of { code, description, minCharge, breaks[] }
  };
}

// compute stepped charge for weight with min
function priceByBreaks(weightKg, minChargeBuy, minChargeSell, breaks){
  const w = Number(weightKg)||0;
  const list = sortBreaks(breaks||[]);
  let chosen = list[0] || { thresholdKg: 0, buyRatePerKg: 0, sellRatePerKg: 0 };
  for(const b of list){ if(w >= Number(b.thresholdKg)) chosen = b; else break; }
  const buyRate = Number(chosen.buyRatePerKg ?? chosen.ratePerKg) || 0;
  const sellRate = Number(chosen.sellRatePerKg ?? chosen.ratePerKg) || 0;
  const baseBuy = w * buyRate;
  const baseSell = w * sellRate;
  const finalBuy = Math.max(baseBuy, Number(minChargeBuy)||0);
  const finalSell = Math.max(baseSell, Number(minChargeSell)||0);
  const margin = finalSell - finalBuy;
  const ros = finalSell ? (margin / finalSell) * 100 : 0;
  return {
    appliedBreakKg: Number(chosen.thresholdKg)||0,
    buyRate,
    sellRate,
    baseBuy,
    baseSell,
    finalBuy,
    finalSell,
    minChargeBuy: Number(minChargeBuy)||0,
    minChargeSell: Number(minChargeSell)||0,
    appliedMinBuy: finalBuy > baseBuy,
    appliedMinSell: finalSell > baseSell,
    margin,
    ros
  };
}

function BreaksTable({ title, currency, data, onAdd, onUpd, onDel, minChargeBuy, minChargeSell, onMinChangeBuy, onMinChangeSell }){
  return (
    <Card variant="outlined">
      <CardHeader
        title={title}
        action={<Button size="small" startIcon={<AddIcon/>} onClick={onAdd}>Add Break</Button>}
      />
      <CardContent sx={{ pt:0 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={1.5}>
          <TextField size="small" type="number" label="Min Charge (Buy)" value={minChargeBuy}
            onChange={e=>onMinChangeBuy(Number(e.target.value||0))} sx={{ width:200 }} inputProps={{ min:0, step:0.01 }} InputLabelProps={{ shrink:true }} />
          <TextField size="small" type="number" label="Min Charge (Sell)" value={minChargeSell}
            onChange={e=>onMinChangeSell(Number(e.target.value||0))} sx={{ width:200 }} inputProps={{ min:0, step:0.01 }} InputLabelProps={{ shrink:true }} />
          <Chip size="small" label={`Currency: ${currency}`} />
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={120}>Weight Break (≥ kg)</TableCell>
              <TableCell width={120} align="right">M Rate / kg ({currency})</TableCell>
              <TableCell width={120} align="right">N Rate / kg ({currency})</TableCell>
              <TableCell width={140} align="right">Buy Rate / kg ({currency})</TableCell>
              <TableCell width={140} align="right">Sell Rate / kg ({currency})</TableCell>
              <TableCell align="center" width={64}>Del</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length===0 && (
              <TableRow><TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary">No breaks yet. Click “Add Break”.</Typography>
              </TableCell></TableRow>
            )}
            {sortBreaks(data).map((b)=>(
              <TableRow key={b.id} hover>
                <TableCell>
                  <TextField size="small" type="number" value={b.thresholdKg}
                    onChange={e=>onUpd(b.id,{ thresholdKg:Number(e.target.value||0) })}
                    inputProps={{ min:0, step:1 }} sx={{ width:120 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={b.minRatePerKg}
                    onChange={e=>onUpd(b.id,{ minRatePerKg:Number(e.target.value||0) })}
                    inputProps={{ min:0, step:0.01 }} sx={{ width:120 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={b.normalRatePerKg}
                    onChange={e=>onUpd(b.id,{ normalRatePerKg:Number(e.target.value||0) })}
                    inputProps={{ min:0, step:0.01 }} sx={{ width:120 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={b.buyRatePerKg}
                    onChange={e=>onUpd(b.id,{ buyRatePerKg:Number(e.target.value||0) })}
                    inputProps={{ min:0, step:0.01 }} sx={{ width:140 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField size="small" type="number" value={b.sellRatePerKg}
                    onChange={e=>onUpd(b.id,{ sellRatePerKg:Number(e.target.value||0) })}
                    inputProps={{ min:0, step:0.01 }} sx={{ width:140 }}
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
  const [sheet, setSheet] = React.useState(()=> {
    try{ 
      const raw = JSON.parse(localStorage.getItem('airlineRateDraft')||'null');
      return migrateSheet(raw) || blankSheet();
    }catch{ return blankSheet(); }
  });
  const [sheetsList, setSheetsList] = React.useState(()=> {
    try { const arr = JSON.parse(localStorage.getItem('airlineRateSheets')||'[]'); return arr.map(migrateSheet); } catch { return []; }
  });
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });

  // tester
  const [test, setTest] = React.useState({ weightKg: 120, useCommodityId: 'NONE' });

  React.useEffect(()=>{
    try{ localStorage.setItem('airlineRateDraft', JSON.stringify(sheet)); }catch{ /* persist ignore */ }
  }, [sheet]);

  // If a route param is present, load that sheet when list or param changes
  React.useEffect(()=>{
    if(!routeId) return;
    const found = sheetsList.find(s=> s.id===routeId);
    if(found) setSheet(found);
  }, [routeId, sheetsList]);

  // Listen for external changes (other tabs)
  React.useEffect(()=>{
  function reload(){ try { setSheetsList(JSON.parse(localStorage.getItem('airlineRateSheets')||'[]')); } catch { /* ignore */ } }
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

  // Save a copy of the current sheet with new ids
  function saveAsCopy(){
    try{
      const copy = deepCloneSheetWithNewIds(sheet);
      const list = JSON.parse(localStorage.getItem('airlineRateSheets')||'[]');
      list.unshift(copy);
      localStorage.setItem('airlineRateSheets', JSON.stringify(list));
      refreshSheets();
      setSheet(copy);
      deriveAndPersistSimpleAirRates(list);
      setSnack({ open:true, ok:true, msg:`Saved copy ${copy.id}` });
    }catch(e){ console.error(e); setSnack({ open:true, ok:false, msg:'Save copy failed' }); }
  }

  // Delete current sheet from storage and reset to blank
  function deleteSheet(){
    try{
      const list = JSON.parse(localStorage.getItem('airlineRateSheets')||'[]').filter(s=> s.id!==sheet.id);
      localStorage.setItem('airlineRateSheets', JSON.stringify(list));
      refreshSheets();
      // if we were viewing a saved sheet via route, reset to a blank sheet
      if(sheet && sheetsList.find(s=>s.id===sheet.id)) setSheet(blankSheet());
      deriveAndPersistSimpleAirRates(list);
      setSnack({ open:true, ok:true, msg:`Deleted sheet ${sheet.id}` });
    }catch(e){ console.error(e); setSnack({ open:true, ok:false, msg:'Delete failed' }); }
  }

  // Create a Pricing Request (RFQ) from this sheet and persist to rateRequests
  const navigate = useNavigate();
  const { user } = useAuth();
  function createRFQ(){
    try{
      const now = new Date().toISOString();
      const rid = uid('REQ');
      // Build lines from general breaks as representative lanes
      const origin = sheet.route?.origin || '';
      const destination = sheet.route?.destination || '';
      const customer = sheet.airline?.name || sheet.airline?.iata || 'Unknown';
      const vendor = sheet.airline?.iata || sheet.airline?.name || 'Carrier';
      const lines = (sheet.general?.breaks||[]).map(b => {
        const qty = Number(b.thresholdKg) || 1;
        const sell = (Number(b.sellRatePerKg)||0) * qty;
        const buy = (Number(b.buyRatePerKg)||0) * qty;
        const margin = sell - buy;
        const rosVal = sell? (margin/sell)*100 : 0;
        return {
          id: b.id || uid('LR'),
          origin, destination,
          basis: 'Air',
          containerType: 'AIR',
          vendor,
          carrier: vendor,
          qty,
          sell: +(sell||0),
          margin: +(margin||0),
          ros: +(rosVal||0),
          vendorQuotes: []
        };
      });
      const request = {
        id: rid,
        type: 'rateImprovementRequest',
        inquiryId: null,
        customer,
        owner: user?.username || 'unknown',
        status: 'NEW',
        createdAt: now,
        urgency: 'Normal',
        remarks: `RFQ from airline sheet ${sheet.id}`,
        customerTargetPrice: null,
        inquirySnapshot: { origin, destination, notes: '' },
        totals: { sell: lines.reduce((s,l)=> s + (Number(l.sell)||0), 0), margin: lines.reduce((s,l)=> s + (Number(l.margin)||0), 0), ros: 0 },
        lines
      };
      const list = JSON.parse(localStorage.getItem('rateRequests')||'[]');
      list.unshift(request);
      localStorage.setItem('rateRequests', JSON.stringify(list));
      setSnack({ open:true, ok:true, msg:`RFQ created ${rid}` });
      // navigate to detail view
      navigate(`/pricing/request/${rid}`);
    }catch(e){ console.error(e); setSnack({ open:true, ok:false, msg:'Create RFQ failed' }); }
  }

  // loadExisting removed (unused after UI simplification)

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
      const rows = (allSheets||[]).map(rawS=>{ const s = migrateSheet(rawS); // ensure latest structure
        const lane = `${s.route?.origin||''} → ${s.route?.destination||''}`.trim();
        const vendor = s.airline?.iata || s.airline?.name || '-';
        const breaks = (s.general?.breaks||[]);
        if(!breaks.length) return null;
        // pick break 100 if available else the lowest threshold
        const prefer = breaks.find(b=> Number(b.thresholdKg)===100) || breaks.slice().sort((a,b)=>a.thresholdKg-b.thresholdKg)[0];
        const sellRate = Number(prefer.sellRatePerKg ?? prefer.ratePerKg)||0;
        const costRate = Number(prefer.buyRatePerKg ?? (sellRate*0.85))||0;
        const minBuy = Number(s.general?.minChargeBuy ?? (s.general?.minChargeSell||0)*0.85)||0;
        const minSell = Number(s.general?.minChargeSell ?? s.general?.minCharge)||0;
        const ros = sellRate? Math.round(((sellRate - costRate)/sellRate)*100) : 0;
        return {
          lane,
          vendor,
            // retain id link for reverse lookup
          sheetId: s.id,
          ratePerKgCost: costRate,
          ratePerKgSell: sellRate,
          minChargeCost: minBuy,
          minChargeSell: minSell,
          ros,
          chargeCode: 'FRT-A'
        };
      }).filter(Boolean);
      localStorage.setItem('derivedAirRates', JSON.stringify(rows));
    } catch { /* ignore */ }
  }

  // tester calculation
  const testerResult = React.useMemo(()=>{
    const w = Number(test.weightKg)||0;
    if(test.useCommodityId && test.useCommodityId!=='NONE'){
      const c = sheet.commodities.find(x=>x.id===test.useCommodityId);
      if(!c) return null;
      return { scope:`Commodity: ${c.code||'(unnamed)'}`, ...priceByBreaks(w, c.minChargeBuy, c.minChargeSell, c.breaks) };
    }
    return { scope:'General Tariff', ...priceByBreaks(w, sheet.general.minChargeBuy, sheet.general.minChargeSell, sheet.general.breaks) };
  }, [test, sheet]);

  // Migration helper to upgrade legacy sheet structure (single minCharge & ratePerKg) to new buy/sell split.
  function migrateSheet(s){
    if(!s) return s;
    const next = { ...s };
    // General
    if(next.general){
      if(next.general.minChargeBuy===undefined && next.general.minChargeSell===undefined){
        const old = Number(next.general.minCharge)||0;
        next.general.minChargeSell = old;
        next.general.minChargeBuy = +(old*0.85).toFixed(2);
      } else {
        if(next.general.minChargeBuy===undefined) next.general.minChargeBuy = +(Number(next.general.minChargeSell||0)*0.85).toFixed(2);
        if(next.general.minChargeSell===undefined) next.general.minChargeSell = Number(next.general.minChargeBuy||0)/0.85;
      }
      next.general.breaks = (next.general.breaks||[]).map(b=>{
        // preserve legacy ratePerKg into normalRatePerKg if present
        const rate = Number(b.ratePerKg || b.sellRatePerKg || 0);
        const sell = b.sellRatePerKg !== undefined ? Number(b.sellRatePerKg) : rate;
        const buy = b.buyRatePerKg !== undefined ? Number(b.buyRatePerKg) : +(sell * 0.85).toFixed(4);
        const normal = b.normalRatePerKg !== undefined ? Number(b.normalRatePerKg) : sell;
        const minr = b.minRatePerKg !== undefined ? Number(b.minRatePerKg) : (b.minRatePerKg === 0 ? 0 : +(sell * 0.9).toFixed(4));
        return { ...b, buyRatePerKg: buy, sellRatePerKg: sell, normalRatePerKg: normal, minRatePerKg: minr };
      });
    }
    next.commodities = (next.commodities||[]).map(c=>{
      const mcBuy = c.minChargeBuy!==undefined ? c.minChargeBuy : +(Number(c.minCharge||0)*0.85).toFixed(2);
      const mcSell = c.minChargeSell!==undefined ? c.minChargeSell : Number(c.minCharge||0);
      return {
        ...c,
        minChargeBuy: mcBuy,
        minChargeSell: mcSell,
        breaks: (c.breaks||[]).map(b=>{
          const rate = Number(b.ratePerKg || b.sellRatePerKg || 0);
          const sell = b.sellRatePerKg !== undefined ? Number(b.sellRatePerKg) : rate;
          const buy = b.buyRatePerKg !== undefined ? Number(b.buyRatePerKg) : +(sell * 0.85).toFixed(4);
          const normal = b.normalRatePerKg !== undefined ? Number(b.normalRatePerKg) : sell;
          const minr = b.minRatePerKg !== undefined ? Number(b.minRatePerKg) : (b.minRatePerKg === 0 ? 0 : +(sell * 0.9).toFixed(4));
          return { ...b, buyRatePerKg: buy, sellRatePerKg: sell, normalRatePerKg: normal, minRatePerKg: minr };
        })
      };
    });
    return next;
  }

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      {/* Top meta section removed per requirement: title + sheet id + load existing */}
      <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
        <Button size="small" startIcon={<ContentCopyIcon/>} onClick={()=>setSheet(blankSheet())}>New</Button>
        <Button size="small" onClick={saveAsCopy}>Save Copy</Button>
        <Button size="small" startIcon={<DownloadIcon/>} onClick={exportJSON}>Export</Button>
        <Button size="small" color="error" onClick={deleteSheet}>Delete</Button>
        <Button size="small" variant="contained" startIcon={<SaveIcon/>} onClick={saveToStorage}>Save</Button>
        <Button size="small" variant="outlined" onClick={createRFQ}>Create RFQ</Button>
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
        minChargeBuy={sheet.general.minChargeBuy}
        minChargeSell={sheet.general.minChargeSell}
        onMinChangeBuy={(v)=>setSheet(s=> ({ ...s, general:{ ...s.general, minChargeBuy:v } }))}
        onMinChangeSell={(v)=>setSheet(s=> ({ ...s, general:{ ...s.general, minChargeSell:v } }))}
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
                  <TextField size="small" type="number" label="Min Charge (Buy)" value={c.minChargeBuy}
                    onChange={e=>updCommodity(c.id, { minChargeBuy:Number(e.target.value||0) })} sx={{ width:160 }} inputProps={{ min:0, step:0.01 }} InputLabelProps={{ shrink:true }} />
                  <TextField size="small" type="number" label="Min Charge (Sell)" value={c.minChargeSell}
                    onChange={e=>updCommodity(c.id, { minChargeSell:Number(e.target.value||0) })} sx={{ width:160 }} inputProps={{ min:0, step:0.01 }} InputLabelProps={{ shrink:true }} />
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={120}>Weight Break (≥ kg)</TableCell>
                      <TableCell width={120} align="right">M Rate / kg ({sheet.currency})</TableCell>
                      <TableCell width={120} align="right">N Rate / kg ({sheet.currency})</TableCell>
                      <TableCell width={140} align="right">Buy Rate / kg ({sheet.currency})</TableCell>
                      <TableCell width={140} align="right">Sell Rate / kg ({sheet.currency})</TableCell>
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
                            inputProps={{ min:0, step:1 }} sx={{ width:120 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={b.minRatePerKg}
                            onChange={e=>updBreakCommodity(c.id, b.id, { minRatePerKg:Number(e.target.value||0) })}
                            inputProps={{ min:0, step:0.01 }} sx={{ width:120 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={b.normalRatePerKg}
                            onChange={e=>updBreakCommodity(c.id, b.id, { normalRatePerKg:Number(e.target.value||0) })}
                            inputProps={{ min:0, step:0.01 }} sx={{ width:120 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={b.buyRatePerKg}
                            onChange={e=>updBreakCommodity(c.id, b.id, { buyRatePerKg:Number(e.target.value||0) })}
                            inputProps={{ min:0, step:0.01 }} sx={{ width:140 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={b.sellRatePerKg}
                            onChange={e=>updBreakCommodity(c.id, b.id, { sellRatePerKg:Number(e.target.value||0) })}
                            inputProps={{ min:0, step:0.01 }} sx={{ width:140 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={()=>delBreakCommodity(c.id, b.id)}><DeleteIcon fontSize="inherit" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {c.breaks.length===0 && (
                      <TableRow><TableCell colSpan={4}>
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
        <CardHeader title="Pricing Tester (Buy vs Sell)" />
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
            <Box display="grid" gridTemplateColumns="repeat(9, minmax(110px,1fr))" gap={12} alignItems="center" sx={{ overflowX:'auto' }}>
              <Chip label={testerResult.scope} />
              <Box>Break<br/><strong>≥ {testerResult.appliedBreakKg}</strong></Box>
              <Box>Buy Rate/kg<br/><strong>{money(testerResult.buyRate, sheet.currency)}</strong></Box>
              <Box>Sell Rate/kg<br/><strong>{money(testerResult.sellRate, sheet.currency)}</strong></Box>
              <Box>Base Buy<br/><strong>{money(testerResult.baseBuy, sheet.currency)}</strong></Box>
              <Box>Base Sell<br/><strong>{money(testerResult.baseSell, sheet.currency)}</strong></Box>
              <Box>Final Buy<br/><strong>{money(testerResult.finalBuy, sheet.currency)}</strong>{testerResult.appliedMinBuy && <Typography variant="caption" color="text.secondary" display="block">(MIN {money(testerResult.minChargeBuy, sheet.currency)})</Typography>}</Box>
              <Box>Final Sell<br/><strong>{money(testerResult.finalSell, sheet.currency)}</strong>{testerResult.appliedMinSell && <Typography variant="caption" color="text.secondary" display="block">(MIN {money(testerResult.minChargeSell, sheet.currency)})</Typography>}</Box>
              <Box>Margin / ROS<br/><strong>{money(testerResult.margin, sheet.currency)}</strong><Typography variant="caption" color="text.secondary" display="block">{testerResult.ros.toFixed(1)}%</Typography></Box>
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
