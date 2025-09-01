import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardHeader, CardContent, Typography, Grid, TextField, Button, Chip, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material';
import RateTable from './RateTable';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
// Removed unused icons
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { useCart } from './cart-context';
import sampleRates from './sample-rates.json';
import { useAuth } from './auth-context';

/**
 * Inquiry Cart Mockup (React + shadcn/ui)
 * Cart icon top-right like shopping sites + click to open cart detail (Sheet).
 */

// Modes limited to primary Freightify categories we care about here
const MODES = ["Sea FCL", "Sea LCL", "Air"]; // others can be added later
const CUSTOMER_OPTIONS = [
  { code:'CUSTA', name:'Customer A Co., Ltd.' },
  { code:'CUSTB', name:'Customer B Trading' },
  { code:'CUSTC', name:'Customer C Global' },
  { code:'CUSTD', name:'Customer D Logistics' }
];

// Use shared sample rates for all modes
const FREIGHTIFY_SAMPLE = {
  reqId: 636287654356789,
  offers: [
    // FCL
    ...sampleRates.FCL.map((r, idx) => ({
      freightifyId: `FCL_SAMPLE_${idx}`,
      match: "EXACT",
      productOffer: {
        carrierScac: r.vendor?.slice(0,4).toUpperCase() || "CARR",
        carrierName: r.vendor || "Carrier",
        offerType: { source: "SPOT", referenceId: `FCLREF${idx}` },
        originPort: r.lane?.split(" → ")[0] || "-",
        destinationPort: r.lane?.split(" → ")[1] || "-",
        origin: r.lane?.split(" → ")[0] || "-",
        destination: r.lane?.split(" → ")[1] || "-",
        vendorId: 1000+idx,
        serviceType: "CY/CY",
      },
      productPrice: {
        validFrom: "2025-08-01",
        validTo: "2025-12-31",
        transitTimeInDays: r.transitDays,
        commodity: "FAK",
        viaPort: r.transship || "-",
        charges: [
          {
            amount: r.sellPerCntr,
            description: "Basic Ocean Freight",
            rateCurrency: "USD",
            qty: 1,
            rate: r.sellPerCntr,
            rateBasis: "PER_CONTAINER",
            containerSizeType: r.container
          }
        ]
      }
    })),
    // LCL
    ...sampleRates.LCL.map((r, idx) => ({
      freightifyId: `LCL_SAMPLE_${idx}`,
      match: "EXACT",
      productOffer: {
        carrierScac: r.vendor?.slice(0,4).toUpperCase() || "CARR",
        carrierName: r.vendor || "Carrier",
        offerType: { source: "TARIFF", referenceId: `LCLREF${idx}` },
        originPort: r.lane?.split(" → ")[0] || "-",
        destinationPort: r.lane?.split(" → ")[1] || "-",
        origin: r.lane?.split(" → ")[0] || "-",
        destination: r.lane?.split(" → ")[1] || "-",
        vendorId: 2000+idx,
        serviceType: "CFS/CFS",
      },
      productPrice: {
        validFrom: "2025-08-01",
        validTo: "2025-12-31",
        transitTimeInDays: r.transitDays,
        commodity: "General Cargo",
        viaPort: r.transship || "-",
        charges: [
          {
            description: "LCL Freight",
            rateBasis: "PER_KG",
            rateCurrency: "USD",
            qty: 1000,
            rate: r.ratePerKgSell,
            amount: r.ratePerKgSell * 1000
          }
        ]
      }
    })),
    // Air
    ...sampleRates.Air.map((r, idx) => ({
      freightifyId: `AIR_SAMPLE_${idx}`,
      match: "EXACT",
      productOffer: {
        carrierScac: r.vendor?.slice(0,2).toUpperCase() || "AI",
        carrierName: r.vendor || "Carrier",
        offerType: { source: "SPOT", referenceId: `AIRREF${idx}` },
        originPort: r.lane?.split(" → ")[0] || "-",
        destinationPort: r.lane?.split(" → ")[1] || "-",
        origin: r.lane?.split(" → ")[0] || "-",
        destination: r.lane?.split(" → ")[1] || "-",
        vendorId: 3000+idx,
        serviceType: "Airport/Airport",
      },
      productPrice: {
        validFrom: "2025-08-01",
        validTo: "2025-12-31",
        transitTimeInDays: r.transitDays,
        commodity: "Electronics",
        viaPort: r.transship || "-",
        charges: [
          {
            description: "Air Freight",
            rateBasis: "PER_KG",
            rateCurrency: "USD",
            qty: 500,
            rate: r.ratePerKgSell,
            amount: r.ratePerKgSell * 500
          }
        ]
      }
    }))
  ]
};

// Normalization: convert Freightify offer to internal rate row expected by table
function normalizeFreightify(resp){
  if(!resp?.offers) return [];
  const rows = [];
  for(const offer of resp.offers){
    const po = offer.productOffer || {}; const pp = offer.productPrice || {}; const charges = (pp.charges||[]);
    // We treat first freight charge as primary
    const main = charges[0] || {};
    const basis = main.rateBasis === 'PER_CONTAINER' ? 'Per Container' : main.rateBasis === 'PER_KG' ? 'Per KG' : main.rateBasis || 'N/A';
    // Mode heuristic
    let mode = 'Sea FCL';
    if(basis === 'Per KG') mode = po.carrierScac?.length===2 ? 'Air' : 'Sea LCL';
    if(basis === 'Per Container' && (main.description||'').toLowerCase().includes('lcl')) mode = 'Sea LCL';
    const containerType = basis === 'Per Container' ? (main.containerSizeType || '40HC') : '-';
  const sell = typeof main.amount === 'number' ? main.amount : (main.rate||0) * (main.qty||1);
    // Attempt enrichment from sample-rates to align with RateTable model
    let enriched = {};
    const laneStr = (po.originPort || po.origin || '-') + ' → ' + (po.destinationPort || po.destination || '-');
    if(mode==='Sea FCL'){
      const match = sampleRates.FCL.find(r=> r.lane===laneStr && r.vendor=== (po.carrierName || po.vendorId || '-') && r.container===containerType);
      if(match){
        enriched = {
          costPerCntr: match.costPerCntr,
          sellPerCntr: match.sellPerCntr,
          ros: match.ros,
          freetime: match.freetime,
          service: match.service,
          contractService: match.contractService,
          chargeCode: match.chargeCode
        };
      }
    } else if(mode==='Sea LCL') {
      const match = sampleRates.LCL.find(r=> r.lane===laneStr && r.vendor=== (po.carrierName || po.vendorId || '-'));
      if(match){
        enriched = {
          ratePerKgCost: match.ratePerKgCost,
          ratePerKgSell: match.ratePerKgSell,
          minChargeCost: match.minChargeCost,
          minChargeSell: match.minChargeSell,
          ros: match.ros,
          chargeCode: match.chargeCode
        };
      }
    } else if(mode==='Air') {
      const match = sampleRates.Air.find(r=> r.lane===laneStr && r.vendor=== (po.carrierName || po.vendorId || '-'));
      if(match){
        enriched = {
          ratePerKgCost: match.ratePerKgCost,
          ratePerKgSell: match.ratePerKgSell,
          minChargeCost: match.minChargeCost,
            minChargeSell: match.minChargeSell,
          ros: match.ros,
          chargeCode: match.chargeCode
        };
      }
    }
    // Fallback ROS if not enriched yet
    if(enriched.ros===undefined){
      const margin = sell * 0.15; // fallback assumption
      enriched.ros = sell ? Math.round((margin / sell)*100) : 0;
    }
    // Derive unified sell & margin fields for cart usage AFTER enrichment & ros available
    let unifiedSell = sell;
    let unifiedCost = null;
    if(mode==='Sea FCL'){
      unifiedSell = enriched.sellPerCntr ?? sell;
      unifiedCost = enriched.costPerCntr ?? (unifiedSell * (1 - (enriched.ros||0)/100));
    } else if(mode==='Sea LCL' || mode==='Air'){
      unifiedSell = enriched.minChargeSell ?? (enriched.ratePerKgSell ? enriched.ratePerKgSell * 100 : sell);
      unifiedCost = enriched.minChargeCost ?? (enriched.ratePerKgCost ? enriched.ratePerKgCost * 100 : (unifiedSell * (1 - (enriched.ros||0)/100)));
    } else {
      unifiedSell = sell;
      unifiedCost = sell * (1 - (enriched.ros||0)/100);
    }
    if(typeof unifiedSell !== 'number' || isNaN(unifiedSell)) unifiedSell = 0;
    if(typeof unifiedCost !== 'number' || isNaN(unifiedCost)) unifiedCost = 0;
    const unifiedMargin = unifiedSell - unifiedCost;
    rows.push({
      id: offer.freightifyId,
      mode,
      carrier: po.carrierScac || '-',
      vendor: po.carrierName || po.vendorId || '-',
      containerType,
      basis,
      origin: po.originPort || po.origin || '-',
      destination: po.destinationPort || po.destination || '-',
      transitTime: pp.transitTimeInDays,
      validity: { from: pp.validFrom, to: pp.validTo },
      trend: [sell*0.92, sell*0.95, sell*0.97, sell, sell*1.02, sell*0.99, sell],
      raw: offer,
      sell: unifiedSell,
      margin: unifiedMargin,
      ...enriched
    });
  }
  return rows;
}

function ROSBadge({ value }){ const color = value >= 20 ? 'success' : value >= 12 ? 'warning' : 'error'; return <Chip size="small" color={color} label={value.toFixed(1)+"%"} variant={value>=20?'filled':'outlined'} />; }

function TrendSpark({ data }){ const points = data.map((y,i)=>({ x:i, y })); return <Box sx={{ height:34, width:96 }}><ResponsiveContainer><LineChart data={points} margin={{ top:4, left:0, right:0, bottom:0 }}><Line type="monotone" dataKey="y" dot={false} strokeWidth={2} stroke="#1976d2" /></LineChart></ResponsiveContainer></Box>; }


function InquiryCart(){
  const { user, USERS } = useAuth();
  const [mode, setMode] = useState('Sea FCL');
  const [customer, setCustomer] = useState('');
  const [owner, setOwner] = useState(user?.role === 'Sales' ? user.username : '');
  const [pairs, setPairs] = useState([{ origin:'', destination:'' }]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sort] = useState({ key:'vendor', dir:'asc' }); // sort static for now (remove setter)
  const [rawResponse] = useState(FREIGHTIFY_SAMPLE); // static sample data
  const [allRates, setAllRates] = useState([]);
  // Airline sheets (structured breaks) from airline-rate-entry for Air alignment
  const [airlineSheets, setAirlineSheets] = useState(()=>{ try { return JSON.parse(localStorage.getItem('airlineRateSheets')||'[]'); } catch { return []; } });
  const { add, items } = useCart();
  const [missingConfirm, setMissingConfirm] = useState(null); // { origin, destination, mode }
  const [dismissedMissing, setDismissedMissing] = useState([]); // keys already dismissed this session
  // Build simple port code suggestions from sample offers
  const portOptions = useMemo(()=>{
    const set = new Set();
    (FREIGHTIFY_SAMPLE.offers||[]).forEach(o=>{ if(o.productOffer?.originPort) set.add(o.productOffer.originPort); if(o.productOffer?.destinationPort) set.add(o.productOffer.destinationPort); });
    return Array.from(set).sort();
  }, []);

  // Normalize when rawResponse changes
  useEffect(()=>{ 
    const base = normalizeFreightify(rawResponse);
    // Append airline sheet rows (Air) if any
    if(airlineSheets.length){
      const STANDARD_BREAKS = [45,100,300,500,1000];
      const sheetRows = airlineSheets.map(s=>{
        const lane = `${s.route?.origin||''} → ${s.route?.destination||''}`.trim();
        const breaks = {};
        (s.general?.breaks||[]).forEach(b=> { breaks[b.thresholdKg] = b.ratePerKg; });
        return {
          id: s.id,
          type: 'airSheet',
          mode: 'Air',
          lane,
          airlineName: s.airline?.name || s.airline?.iata || '-',
          serviceType: s.flightInfo?.serviceType || '-',
          currency: s.currency || '-',
          validFrom: s.validFrom || '',
          validTo: s.validTo || '',
          minCharge: s.general?.minCharge ?? 0,
          breaks: STANDARD_BREAKS.reduce((acc,th)=>{ acc[th] = breaks[th]; return acc; }, {}),
          commoditiesCount: (s.commodities||[]).length,
          origin: s.route?.origin || '',
          destination: s.route?.destination || ''
        };
      });
      base.push(...sheetRows);
    }
    // Annotate a few sample customer-specific rates for demo (would come from API in real impl)
    const demoMap = {
      'FCL_636203xxxxxxxxxxxxx004':'CUSTA',
      'AIR_636203xxxxxxxxxxxxx002':'CUSTB'
    };
    const enriched = base.map(r => demoMap[r.id] ? { ...r, customerCode: demoMap[r.id] } : r);
    setAllRates(enriched); 
  }, [rawResponse, airlineSheets]);

  // Reload airline sheets on focus/storage to stay in sync
  useEffect(()=>{
    function reload(){ try { setAirlineSheets(JSON.parse(localStorage.getItem('airlineRateSheets')||'[]')); } catch {/* ignore */} }
    window.addEventListener('focus', reload);
    window.addEventListener('storage', reload);
    return ()=>{ window.removeEventListener('focus', reload); window.removeEventListener('storage', reload); };
  }, []);

  const currentPair = React.useMemo(()=> pairs[activeIdx] || { origin:'', destination:'' }, [pairs, activeIdx]);
  const matches = useMemo(()=> {
    let filtered = allRates
      .filter(r=> r.mode === mode)
      .filter(r=> !currentPair.origin || r.origin.toLowerCase().includes(currentPair.origin.toLowerCase()))
      .filter(r=> !currentPair.destination || r.destination.toLowerCase().includes(currentPair.destination.toLowerCase()));
    const cust = customer.trim();
    if(!cust){
      // Standard list: exclude customer-specific rates
      filtered = filtered.filter(r=> !r.customerCode);
    } else {
      const specific = filtered.filter(r=> r.customerCode && r.customerCode.toLowerCase() === cust.toLowerCase());
      if(specific.length>0) filtered = specific; else filtered = filtered.filter(r=> !r.customerCode); // fallback to generic if none specific
    }
    return filtered.sort((a,b)=>{ const ka=a[sort.key]; const kb=b[sort.key]; if(ka<kb) return sort.dir==='asc'?-1:1; if(ka>kb) return sort.dir==='asc'?1:-1; return 0; });
  },[mode, currentPair, sort, allRates, customer]);

  // Auto-create placeholder missing rate when both origin & destination provided and no matches
  useEffect(()=>{
    if(!currentPair.origin || !currentPair.destination) return;
    if(matches.length>0) return; // we have matches, no placeholder
    const key = `${mode}|${currentPair.origin.trim().toUpperCase()}|${currentPair.destination.trim().toUpperCase()}`;
    const placeholderId = `MISSING-${mode}-${currentPair.origin.trim().toUpperCase()}-${currentPair.destination.trim().toUpperCase()}`;
    if(items.some(i=>i.id===placeholderId)) return; // already added
    if(dismissedMissing.includes(key)) return; // user declined
    if(missingConfirm && missingConfirm.key === key) return; // already prompting
    setMissingConfirm({ key, origin: currentPair.origin.trim().toUpperCase(), destination: currentPair.destination.trim().toUpperCase(), mode });
  }, [currentPair.origin, currentPair.destination, matches.length, mode, items, dismissedMissing, missingConfirm]);

  function addPlaceholder(mc){
    const placeholderId = `MISSING-${mc.mode}-${mc.origin}-${mc.destination}`;
    add({
      id: placeholderId,
      mode: mc.mode,
      carrier: '',
      vendor: 'NO RATE',
      containerType: '-',
      basis: 'N/A',
      origin: mc.origin,
      destination: mc.destination,
      transitTime: null,
      validity: { from: '', to: '' },
      sell: 0,
      margin: 0,
      ros: 0,
      trend: [],
      raw: { placeholder:true }
    });
  }

  function addToCart(rate){
    // Ensure rate has numeric sell & margin for cart detail calculations
    if(rate && (rate.sell===undefined || rate.margin===undefined)){
      let sell = 0, margin = 0;
      if(rate.mode==='Sea FCL'){
        sell = rate.sellPerCntr ?? rate.sell ?? 0;
        const cost = rate.costPerCntr ?? (sell * (1 - (rate.ros||0)/100));
        margin = sell - cost;
      } else if(rate.mode==='Sea LCL' || rate.mode==='Air'){
        // pick min charge else derive from per KG * 100
        const perKgSell = rate.ratePerKgSell;
        const perKgCost = rate.ratePerKgCost;
        sell = rate.minChargeSell ?? (perKgSell ? perKgSell * 100 : rate.sell ?? 0);
        const cost = rate.minChargeCost ?? (perKgCost ? perKgCost * 100 : (sell * (1 - (rate.ros||0)/100)));
        margin = sell - cost;
      } else {
        sell = rate.sell ?? 0; margin = rate.margin ?? 0;
      }
      rate = { ...rate, sell, margin };
    }
    add(rate);
  }
  function addPair(){ setPairs(p=> [...p, { origin:'', destination:'' }]); }
  function updatePair(idx, patch){ setPairs(p=> p.map((row,i)=> i===idx? { ...row, ...patch }: row)); }
  function removePair(idx){ setPairs(p=> p.filter((_,i)=> i!==idx)); if(activeIdx>=idx && activeIdx>0) setActiveIdx(a=> a-1); }

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Inquiry Cart Builder</Typography>
        <Tooltip title="Use top-right global cart icon"><span><IconButton color="primary" disabled><ShoppingCartIcon /></IconButton></span></Tooltip>
      </Box>

      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle1">Select Mode, Customer & Multiple OD Pairs</Typography>} />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select label="Mode" value={mode} onChange={e=>setMode(e.target.value)}>{MODES.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
      <Grid item xs={12} sm={4} md={3}>
        <Autocomplete
          size="small"
          options={(user?.role === 'Pricing')
            ? CUSTOMER_OPTIONS
            : CUSTOMER_OPTIONS.filter(c=> !user?.allowedCustomers || user.allowedCustomers.includes(c.code))}
          getOptionLabel={(o)=> o.code + ' – ' + o.name}
          value={CUSTOMER_OPTIONS.find(c=> c.code===customer) || null}
          onChange={(e,v)=> setCustomer(v? v.code : '')}
          renderInput={(params)=><TextField {...params} label="Customer" />}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={4} md={3}>
        <Autocomplete
          size="small"
          options={USERS.filter(u=>u.role==='Sales').map(u=>({ username:u.username, display:u.display }))}
          getOptionLabel={o=> o.display || o.username}
          value={USERS.find(u=>u.username===owner) || null}
          onChange={(_,v)=> setOwner(v? v.username : '')}
          renderInput={(params)=><TextField {...params} label="Sales Owner" />}
          fullWidth
        />
      </Grid>
            {pairs.map((p,idx)=>(
              <Grid key={idx} item xs={12} md={6}>
                <Box display="flex" gap={1} alignItems="flex-end">
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={portOptions}
                    value={p.origin}
                    onChange={(e,v)=>updatePair(idx,{ origin:v||'' })}
                    onInputChange={(e,v)=>updatePair(idx,{ origin:v })}
                    sx={{ flex:1 }}
                    renderInput={(params)=><TextField {...params} label={`Origin ${idx+1}`} />}
                  />
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={portOptions}
                    value={p.destination}
                    onChange={(e,v)=>updatePair(idx,{ destination:v||'' })}
                    onInputChange={(e,v)=>updatePair(idx,{ destination:v })}
                    sx={{ flex:1 }}
                    renderInput={(params)=><TextField {...params} label={`Destination ${idx+1}`} />}
                  />
                  {pairs.length>1 && <IconButton size="small" onClick={()=>removePair(idx)}>✕</IconButton>}
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}><Button size="small" variant="outlined" onClick={addPair}>Add OD Pair</Button></Grid>
          </Grid>
          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            {pairs.map((p,idx)=>(
              <Button key={idx} size="small" variant={idx===activeIdx? 'contained':'outlined'} onClick={()=>setActiveIdx(idx)}>{p.origin||'---'} → {p.destination||'---'}</Button>
            ))}
          </Box>
          <Typography mt={1} variant="caption" color="text.secondary">Select a pair to filter matched rates. Add rates; they appear in global cart (icon top-right).</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle1">Matched Rates (Pair {activeIdx+1})</Typography>} />
        <CardContent>
          <RateTable
            mode={mode.replace('Sea ','').replace(' ','')}
            rows={matches.map(r => ({
              ...(r.type==='airSheet' ? r : {}),
              lane: r.origin + ' → ' + r.destination,
              vendor: r.vendor,
              container: r.containerType,
              transitDays: r.transitTime,
              transship: '-',
              costPerCntr: r.costPerCntr,
              sellPerCntr: r.sellPerCntr,
              ratePerKgCost: r.ratePerKgCost,
              ratePerKgSell: r.ratePerKgSell,
              minChargeCost: r.minChargeCost,
              minChargeSell: r.minChargeSell,
              cost: r.cost,
              sell: r.sell,
              freetime: r.freetime,
              service: r.service,
              contractService: r.contractService,
              ros: r.ros,
              chargeCode: r.chargeCode,
              _raw: r
            }))}
            onSelect={row => { if(row._raw) addToCart(row._raw); }}
          />
          {matches.length===0 && currentPair.origin && currentPair.destination && (
            <Typography mt={2} variant="caption" color="text.secondary">No offers found. You can add a placeholder line to alert Pricing.</Typography>
          )}
          {matches.length===0 && (!currentPair.origin || !currentPair.destination) && (
            <Typography mt={2} variant="caption" color="text.secondary">Enter both origin and destination to search offers.</Typography>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!missingConfirm} onClose={()=>{ if(missingConfirm){ setDismissedMissing(d=>[...d, missingConfirm.key]); setMissingConfirm(null);} }}> 
        <DialogTitle>No Rate Found</DialogTitle>
        <DialogContent dividers>
          {missingConfirm && (
            <Typography variant="body2">No rates available for <strong>{missingConfirm.origin} → {missingConfirm.destination}</strong> ({missingConfirm.mode}). Add a placeholder line to the inquiry cart for sourcing?</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ if(missingConfirm){ setDismissedMissing(d=>[...d, missingConfirm.key]); setMissingConfirm(null);} }} color="inherit">No</Button>
          <Button variant="contained" onClick={()=>{ if(missingConfirm){ addPlaceholder(missingConfirm); setMissingConfirm(null);} }}>Add to Inquiry</Button>
        </DialogActions>
      </Dialog>


  {/* Cart drawer moved to global shell */}
    </Box>
  );
}

export default InquiryCart;
