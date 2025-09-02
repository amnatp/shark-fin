import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import sampleRates from "./sample-rates.json";
import { Box, Card, CardContent, Button, TextField, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Grid, Paper } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import RateTable from "./RateTable";
import { useRates } from './rates-context';

// Plain JS version (types removed). Data shape docs:
// FCL rows: { lane, vendor?, container, transitDays?, transship?, costPerCntr, sellPerCntr, ros }
// LCL/Air rows: { lane, vendor?, transitDays?, transship?, ratePerKgCost, ratePerKgSell, minChargeCost?, minChargeSell?, ros }
// Transport/Customs rows: { lane, vendor?, transitDays?, transship?, cost, sell, ros }

export default function RateManagement() {
  const ratesCtx = useRates();
  const [modeTab, setModeTab] = useState("FCL");
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const isVendor = role === 'Vendor';
  const carrierLink = (user?.carrierLink || '').toLowerCase();

  // Load all rates from shared sample-rates.json
  const [fclRows, setFclRows] = useState(sampleRates.FCL);
  const [lclRows, setLclRows] = useState(sampleRates.LCL);
  const [airRows, setAirRows] = useState(sampleRates.Air);
  // Airline sheet-based rates (structured breaks) from airline-rate-entry
  const [airlineSheets, setAirlineSheets] = useState(()=>{ try { return JSON.parse(localStorage.getItem('airlineRateSheets')||'[]'); } catch { return []; } });
  // Derived simple air rates produced from sheets
  const [derivedAirRows, setDerivedAirRows] = useState(()=>{ try { return JSON.parse(localStorage.getItem('derivedAirRates')||'[]'); } catch { return []; } });
  const [transportRows, setTransportRows] = useState(sampleRates.Transport);
  const [customsRows, setCustomsRows] = useState(sampleRates.Customs);
  const [bookingCounts, setBookingCounts] = useState(ratesCtx?.bookingCounts || {}); // rateId -> count

  const [query, setQuery] = useState("");
  const fileInputRef = useRef(null);

  // Add dialog state (fields adapt by mode)
  const [open, setOpen] = useState(false);
  const [innerTab, setInnerTab] = useState('table');
  const [lane, setLane] = useState("");
  const [vendor, setVendor] = useState("");
  const [transitDays, setTransitDays] = useState("");
  const [transship, setTransship] = useState("");
  // FCL
  const [container, setContainer] = useState("40HC");
  const [costPerCntr, setCostPerCntr] = useState("");
  const [sellPerCntr, setSellPerCntr] = useState("");
  // Weight (LCL/Air)
  const [ratePerKgCost, setRatePerKgCost] = useState("");
  const [ratePerKgSell, setRatePerKgSell] = useState("");
  const [minChargeCost, setMinChargeCost] = useState("");
  const [minChargeSell, setMinChargeSell] = useState("");
  // Simple (Transport/Customs)
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");

  // importInfo removed (unused after vendor view restriction)
  const [error, setError] = useState(null);
  // View/Edit dialogs
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  // utilities
  const uid = (p='RID') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  function ensureRateIds(mode, rows){
    let map = {};
    try { map = JSON.parse(localStorage.getItem('rateIdMap')||'{}'); } catch {/* ignore */}
    let changed = false;
    const withIds = rows.map(r=>{
      if(r.rateId) return r;
      const sig = `${mode}|${r.lane}|${r.vendor||''}|${r.container||r.unit||''}`;
      let id = map[sig];
      if(!id){ id = uid(); map[sig]=id; changed=true; }
      return { ...r, rateId:id };
    });
    if(changed){ try { localStorage.setItem('rateIdMap', JSON.stringify(map)); } catch {/* ignore */} }
    return withIds;
  }
  function rosFrom(cost, sell) {
    if (!sell) return 0;
    return Math.round(((sell - cost) / sell) * 100);
  }

  // filtering per tab
  const filteredFCL = useMemo(() => fclRows
    .filter(r => (r.lane + (r.vendor||"") + r.container).toLowerCase().includes(query.toLowerCase()))
    .filter(r => !isVendor || (r.vendor||'').toLowerCase() === carrierLink), [fclRows, query, isVendor, carrierLink]);
  const filteredLCL = useMemo(() => lclRows
    .filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase()))
    .filter(r => !isVendor || (r.vendor||'').toLowerCase() === carrierLink), [lclRows, query, isVendor, carrierLink]);
  const filteredAir = useMemo(() => airRows
    .filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase()))
    .filter(r => !isVendor || (r.vendor||'').toLowerCase() === carrierLink), [airRows, query, isVendor, carrierLink]);
  // Transform airlineSheets into table-friendly rows (if any)
  const airSheetRows = useMemo(()=>{
    const q = query.toLowerCase();
    const STANDARD_BREAKS = [45,100,300,500,1000];
    return airlineSheets.map(s => {
      const lane = `${s.route?.origin||''} → ${s.route?.destination||''}`.trim();
      const breaks = {};
      (s.general?.breaks||[]).forEach(b=> { breaks[b.thresholdKg] = b.ratePerKg; });
      const row = {
        type: 'airSheet',
        id: s.id,
        lane,
        airlineName: s.airline?.name || s.airline?.iata || '-',
        serviceType: s.flightInfo?.serviceType || '-',
        currency: s.currency || '-',
        validFrom: s.validFrom || '',
        validTo: s.validTo || '',
        minCharge: s.general?.minCharge ?? 0,
        breaks: STANDARD_BREAKS.reduce((acc,th)=>{ acc[th] = breaks[th]; return acc; }, {}),
        commoditiesCount: (s.commodities||[]).length
      };
      return row;
    }).filter(r => (r.lane + r.airlineName).toLowerCase().includes(q))
      .filter(r => !isVendor || (r.airlineName||'').toLowerCase() === carrierLink);
  }, [airlineSheets, query, isVendor, carrierLink]);

  // Auto-reload airline sheets on focus/storage changes
  useEffect(()=>{
    function reload(){ try { setAirlineSheets(JSON.parse(localStorage.getItem('airlineRateSheets')||'[]')); } catch {/* ignore */} }
  function reloadDerived(){ try { setDerivedAirRows(JSON.parse(localStorage.getItem('derivedAirRates')||'[]')); } catch {/* ignore */} }
  function reloadBookings(){ setBookingCounts(ratesCtx?.bookingCounts || {}); }
    window.addEventListener('focus', reload);
    window.addEventListener('storage', reload);
  window.addEventListener('focus', reloadDerived);
  window.addEventListener('storage', reloadDerived);
    window.addEventListener('focus', reloadBookings);
    window.addEventListener('storage', reloadBookings);
    window.addEventListener('bookingsUpdated', reloadBookings);
  reloadBookings();
    return ()=>{ 
      window.removeEventListener('focus', reload); 
      window.removeEventListener('storage', reload); 
      window.removeEventListener('focus', reloadDerived);
      window.removeEventListener('storage', reloadDerived);
      window.removeEventListener('focus', reloadBookings);
      window.removeEventListener('storage', reloadBookings);
      window.removeEventListener('bookingsUpdated', reloadBookings);
    };
  }, [ratesCtx]);

  // Assign rateIds to initial sample rows once
  useEffect(()=>{
    setFclRows(r=> ensureRateIds('FCL', r));
    setLclRows(r=> ensureRateIds('LCL', r));
    setAirRows(r=> ensureRateIds('Air', r));
    setTransportRows(r=> ensureRateIds('Transport', r));
    setCustomsRows(r=> ensureRateIds('Customs', r));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load dynamic improved rates (persisted from pricing responses)
  useEffect(()=>{
    try {
      const dyn = JSON.parse(localStorage.getItem('dynamicRates')||'{}');
  if(dyn.FCL && dyn.FCL.length) setFclRows(prev => ensureRateIds('FCL', mergeByKey(prev, dyn.FCL, r=> `${r.lane}__${r.vendor}__${r.container}`)));
  if(dyn.LCL && dyn.LCL.length) setLclRows(prev => ensureRateIds('LCL', mergeByKey(prev, dyn.LCL, r=> `${r.lane}__${r.vendor}`)));
  if(dyn.Air && dyn.Air.length) setAirRows(prev => ensureRateIds('Air', mergeByKey(prev, dyn.Air, r=> `${r.lane}__${r.vendor}`)));
  if(dyn.Transport && dyn.Transport.length) setTransportRows(prev => ensureRateIds('Transport', mergeByKey(prev, dyn.Transport, r=> `${r.lane}__${r.vendor}`)));
  if(dyn.Customs && dyn.Customs.length) setCustomsRows(prev => ensureRateIds('Customs', mergeByKey(prev, dyn.Customs, r=> `${r.lane}__${r.vendor}`)));
    } catch{/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute derived simple air rows if we have sheets but derived list is stale/missing entries
  useEffect(()=>{
    try {
      const derivedIds = new Set(derivedAirRows.map(r=> r.sheetId));
      if(airlineSheets.length && (!derivedAirRows.length || airlineSheets.some(s=> !derivedIds.has(s.id)))){
        const rows = airlineSheets.map(s=>{
          const lane = `${s.route?.origin||''} → ${s.route?.destination||''}`.trim();
          const vendor = s.airline?.iata || s.airline?.name || '-';
          const breaks = (s.general?.breaks||[]);
          if(!breaks.length) return null;
          const prefer = breaks.find(b=> Number(b.thresholdKg)===100) || breaks.slice().sort((a,b)=>a.thresholdKg-b.thresholdKg)[0];
          const baseRate = Number(prefer.ratePerKg)||0;
          const costRate = +(baseRate*0.85).toFixed(4);
          const sellRate = baseRate;
          const minCharge = Number(s.general?.minCharge)||0;
          const minCost = +(minCharge*0.85).toFixed(2);
          const minSell = minCharge;
          const ros = sellRate? Math.round(((sellRate - costRate)/sellRate)*100) : 0;
          return { lane, vendor, sheetId: s.id, ratePerKgCost: costRate, ratePerKgSell: sellRate, minChargeCost: minCost, minChargeSell: minSell, ros, chargeCode: 'FRT-A', rateId: s.id };
        }).filter(Boolean);
        setDerivedAirRows(rows);
        localStorage.setItem('derivedAirRates', JSON.stringify(rows));
      }
    } catch {
      /* ignore derive errors */
    }
  }, [airlineSheets, derivedAirRows]);
  const filteredTransport = useMemo(() => transportRows
    .filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase()))
    .filter(r => !isVendor || (r.vendor||'').toLowerCase() === carrierLink), [transportRows, query, isVendor, carrierLink]);
  const filteredCustoms = useMemo(() => customsRows
    .filter(r => (r.lane + (r.vendor||"")).toLowerCase().includes(query.toLowerCase()))
    .filter(r => !isVendor || (r.vendor||'').toLowerCase() === carrierLink), [customsRows, query, isVendor, carrierLink]);

  // CSV Template per mode
  function downloadTemplate() {
    let csv = "";
    if (modeTab === "FCL") {
      csv = [
        "lane,vendor,container,transitDays,transship,costPerCntr,sellPerCntr",
        "THBKK → USLAX,Evergreen,40HC,22,SGSIN,1200,1500",
      ].join("\n");
    } else if (modeTab === "LCL" || modeTab === "Air") {
      csv = [
        "lane,vendor,transitDays,transship,ratePerKgCost,ratePerKgSell,minChargeCost,minChargeSell",
        "THBKK → HKHKG,ConsolCo,6,SGSIN,0.15,0.20,30,40",
      ].join("\n");
    } else {
      csv = [
        "lane,vendor,transitDays,transship,cost,sell",
        "BKK City → Laem Chabang,WICE Truck,1,-,120,160",
      ].join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rate_${modeTab.toLowerCase()}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // onClickUpload removed (unused)

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length <= 1) { return; }
  const parts = (s) => s.split(",").map(x => x.trim());

    try {
      if (modeTab === "FCL") {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("container") && header.includes("costpercntr") && header.includes("sellpercntr"))) throw new Error("Missing required FCL columns");
  const newRows = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, container, td, ts, cost, sell] = parts(lines[i]);
          if (!lane) continue;
          const c = Number(cost), s = Number(sell);
          newRows.push({ lane, vendor, container, transitDays: td?Number(td):undefined, transship: ts||undefined, costPerCntr: c, sellPerCntr: s, ros: rosFrom(c, s) });
        }
        setFclRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}__${r.container}`));
  // imported FCL rows
      } else if (modeTab === "LCL" || modeTab === "Air") {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("rateperkgcost") && header.includes("rateperkgsell"))) throw new Error("Missing required LCL/Air columns");
  const newRows = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, td, ts, rpc, rps, mcc, mcs] = parts(lines[i]);
          if (!lane) continue;
          const c = Number(rpc), s = Number(rps);
          newRows.push({ lane, vendor, transitDays: td?Number(td):undefined, transship: ts||undefined, ratePerKgCost: c, ratePerKgSell: s, minChargeCost: mcc?Number(mcc):undefined, minChargeSell: mcs?Number(mcs):undefined, ros: rosFrom(c, s) });
        }
        if (modeTab === "LCL") setLclRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
        else setAirRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
  // imported LCL/Air rows
      } else {
        const header = lines[0].toLowerCase();
        if (!(header.includes("lane") && header.includes("cost") && header.includes("sell"))) throw new Error("Missing required columns");
  const newRows = [];
        for (let i = 1; i < lines.length; i++) {
          const [lane, vendor, td, ts, cost, sell] = parts(lines[i]);
          if (!lane) continue; const c = Number(cost), s = Number(sell);
          newRows.push({ lane, vendor, transitDays: td?Number(td):undefined, transship: ts||undefined, cost: c, sell: s, ros: rosFrom(c, s) });
        }
        if (modeTab === "Transport") setTransportRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
        else setCustomsRows(prev => mergeByKey(prev, newRows, r => `${r.lane}__${r.vendor}`));
  // imported Transport/Customs rows
      }
  } catch {
  // ignore import error in prototype
    }

    e.target.value = "";
  }

  function mergeByKey(prev, next, keyFn) {
    const map = new Map();
    [...prev, ...next].forEach(r => map.set(keyFn(r), r));
    return Array.from(map.values());
  }

  function resetForm() {
    setLane(""); setVendor(""); setTransitDays(""); setTransship("");
    setContainer("40HC"); setCostPerCntr(""); setSellPerCntr("");
    setRatePerKgCost(""); setRatePerKgSell(""); setMinChargeCost(""); setMinChargeSell("");
    setCost(""); setSell("");
  }

  function addRate() {
    setError(null);
    if (!lane.trim()) return setError("Lane is required");

    if (modeTab === "FCL") {
      const c = Number(costPerCntr), s = Number(sellPerCntr);
      if (Number.isNaN(c) || Number.isNaN(s)) return setError("Cost/Sell per container must be numbers");
  const row = { lane, vendor: vendor || "-", container, transitDays: transitDays?Number(transitDays):undefined, transship: transship || undefined, costPerCntr: c, sellPerCntr: s, ros: rosFrom(c, s) };
      setFclRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}__${r.container}`));
    } else if (modeTab === "LCL" || modeTab === "Air") {
      const c = Number(ratePerKgCost), s = Number(ratePerKgSell);
      if (Number.isNaN(c) || Number.isNaN(s)) return setError("Rate per kg must be numbers");
  const row = { lane, vendor: vendor || "-", transitDays: transitDays?Number(transitDays):undefined, transship: transship || undefined, ratePerKgCost: c, ratePerKgSell: s, minChargeCost: minChargeCost?Number(minChargeCost):undefined, minChargeSell: minChargeSell?Number(minChargeSell):undefined, ros: rosFrom(c, s) };
      if (modeTab === "LCL") setLclRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
      else setAirRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
    } else {
      const c = Number(cost), s = Number(sell);
      if (Number.isNaN(c) || Number.isNaN(s)) return setError("Cost/Sell must be numbers");
  const row = { lane, vendor: vendor || "-", transitDays: transitDays?Number(transitDays):undefined, transship: transship || undefined, cost: c, sell: s, ros: rosFrom(c, s) };
      if (modeTab === "Transport") setTransportRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
      else setCustomsRows(prev => mergeByKey(prev, [row], r => `${r.lane}__${r.vendor}`));
    }

    resetForm();
    setOpen(false);
  }

  // Editing existing (simplified: only cost/sell fields depending on mode)
  function openEdit(r){ setEditRow(r); }
  function saveEdit(){
    if(!editRow) return;
    const updater = (arr, matchFn, patch) => arr.map(r=> matchFn(r)? { ...r, ...patch, ros: rosFrom(patch.costPerCntr??patch.ratePerKgCost??patch.cost ?? r.costPerCntr??r.ratePerKgCost??r.cost, patch.sellPerCntr??patch.ratePerKgSell??patch.sell ?? r.sellPerCntr??r.ratePerKgSell??r.sell) }: r);
    if(modeTab==='FCL') setFclRows(a=> updater(a, r=> r.lane===editRow.lane && r.vendor===editRow.vendor && r.container===editRow.container, editRow));
    else if(modeTab==='LCL') setLclRows(a=> updater(a, r=> r.lane===editRow.lane && r.vendor===editRow.vendor, editRow));
    else if(modeTab==='Air' && !editRow.type) setAirRows(a=> updater(a, r=> r.lane===editRow.lane && r.vendor===editRow.vendor, editRow));
    else if(modeTab==='Transport') setTransportRows(a=> updater(a, r=> r.lane===editRow.lane && r.vendor===editRow.vendor, editRow));
    else if(modeTab==='Customs') setCustomsRows(a=> updater(a, r=> r.lane===editRow.lane && r.vendor===editRow.vendor, editRow));
    setEditRow(null);
  }

  // Air-specific edit redirect: when editing an Air rate, send user to Airline Rate Entry.
  function handleAirEdit(row){
    try {
      if(row?.type==='airSheet') {
        const full = airlineSheets.find(s=> s.id===row.id);
        if(full) {
          localStorage.setItem('airlineRateDraft', JSON.stringify(full));
          navigate(`/airline-rate-entry/${full.id}`);
          return;
        }
      }
      // simple air row -> ensure a sheet exists (create if needed) then open
      const simple = row;
      const parseLane = (laneStr='')=> {
        const parts = laneStr.split('→').map(s=>s.trim());
        return { origin: parts[0]||'', destination: parts[1]||'' };
      };
      const { origin, destination } = parseLane(simple.lane||'');
      const iata = simple.vendor||'';
      // try find existing by route + airline iata
      let sheets = [];
  try { sheets = JSON.parse(localStorage.getItem('airlineRateSheets')||'[]'); } catch { /* ignore */ }
      let found = sheets.find(s=> (s.route?.origin||'')===origin && (s.route?.destination||'')===destination && (s.airline?.iata||'')===iata);
      const DEFAULT_BREAKS = [45,100,300,500,1000];
      if(!found){
        const uid = (p='AIR') => `${p}-${Date.now()}-${Math.random().toString(16).slice(2,7)}`;
        const newSheet = {
          id: uid('SHEET'),
          airline: { name:'', iata },
          route: { origin, destination, via:'' },
          flightInfo: { flightNo:'', serviceType:'Airport/Airport' },
          currency: 'USD',
          validFrom: new Date().toISOString().slice(0,10),
          validTo: new Date().toISOString().slice(0,10),
          general: { minCharge: simple.minChargeSell||0, breaks: DEFAULT_BREAKS.map(th => ({ id: uid('BRK'), thresholdKg: th, ratePerKg: simple.ratePerKgSell||0 })) },
          commodities: []
        };
        sheets = [newSheet, ...sheets];
  try { localStorage.setItem('airlineRateSheets', JSON.stringify(sheets)); } catch { /* ignore */ }
        found = newSheet;
      }
      // set draft & navigate
  try { localStorage.setItem('airlineRateDraft', JSON.stringify(found)); } catch { /* ignore */ }
      navigate(`/airline-rate-entry/${found.id}`);
    } catch {/* ignore */}
  }

  function addAirBlank(){
    try { localStorage.removeItem('airlineRateDraft'); } catch {/* ignore */}
    navigate('/airline-rate-entry');
  }

  // --- Render helpers ---
  function renderToolbar() {
    return (
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex gap-2 md:w-1/2">
          <TextField size="small" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by lane or vendor..." label="Search" fullWidth />
        </div>
        <div className="flex gap-2">
          {modeTab==='Air' && (
            <Button variant="outlined" color="secondary" onClick={()=> window.open('/airline-rate-entry','_blank')}>Airline Rate Entry</Button>
          )}
          <Button variant="outlined" onClick={downloadTemplate}>Template</Button>
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>Upload CSV</Button>
          <Button variant="contained" onClick={() => modeTab==='Air' ? addAirBlank() : setOpen(true)}>{modeTab==='Air' ? 'New Sheet' : 'Add Rate'}</Button>
          <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
            <DialogTitle>Add {modeTab} Rate</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField label="Lane" value={lane} onChange={(e) => setLane(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Vendor / Carrier" value={vendor} onChange={(e) => setVendor(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField label="Transit Days" value={transitDays} onChange={(e) => setTransitDays(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField label="Transship Port" value={transship} onChange={(e) => setTransship(e.target.value)} fullWidth size="small" />
                </Grid>

                {modeTab === 'FCL' && (
                  <>
                    <Grid item xs={12} md={3}><TextField label="Container" value={container} onChange={(e) => setContainer(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Cost / Cntr" value={costPerCntr} onChange={(e) => setCostPerCntr(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Sell / Cntr" value={sellPerCntr} onChange={(e) => setSellPerCntr(e.target.value)} fullWidth size="small" /></Grid>
                  </>
                )}

                {(modeTab === 'LCL' || modeTab === 'Air') && (
                  <>
                    <Grid item xs={6} md={3}><TextField label="Cost / Kg" value={ratePerKgCost} onChange={(e) => setRatePerKgCost(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Sell / Kg" value={ratePerKgSell} onChange={(e) => setRatePerKgSell(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Min Cost" value={minChargeCost} onChange={(e) => setMinChargeCost(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Min Sell" value={minChargeSell} onChange={(e) => setMinChargeSell(e.target.value)} fullWidth size="small" /></Grid>
                  </>
                )}

                {(modeTab === 'Transport' || modeTab === 'Customs') && (
                  <>
                    <Grid item xs={6} md={3}><TextField label="Cost" value={cost} onChange={(e) => setCost(e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={6} md={3}><TextField label="Sell" value={sell} onChange={(e) => setSell(e.target.value)} fullWidth size="small" /></Grid>
                  </>
                )}

                {error && <Grid item xs={12}><Typography color="error" variant="body2">{error}</Typography></Grid>}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
              <Button onClick={addRate} variant="contained">Save Rate</Button>
            </DialogActions>
          </Dialog>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>
    );
  }

  function renderTable() {
    const commonProps = { onView: (r)=>setViewRow(r), onEdit: (r)=>openEdit(r) };
  if (modeTab === 'FCL') return <RateTable mode="FCL" rows={filteredFCL} bookingCounts={bookingCounts} hideRateId {...commonProps} />;
  if (modeTab === 'LCL') return <RateTable mode="LCL" rows={filteredLCL} bookingCounts={bookingCounts} hideRateId {...commonProps} />;
    if (modeTab === 'Air') {
    const airProps = { onView:(r)=>setViewRow(r), onEdit:(r)=>handleAirEdit(r) };
    // Prefer sheet rows; also show derived simplified rows below divider (combine arrays with tag)
    if (airSheetRows.length) {
      // Optionally append derived rows that aren't directly from displayed sheets (sheetId not in list)
      const sheetIds = new Set(airlineSheets.map(s=>s.id));
      const extra = derivedAirRows.filter(r=> !sheetIds.has(r.sheetId));
      const combined = [...airSheetRows, ...extra];
  return <RateTable mode="Air" rows={combined} bookingCounts={bookingCounts} hideRateId {...airProps} />;
    }
    // Fallback: if no sheet yet but have derived rows, show them instead of static sample
  if(derivedAirRows.length) return <RateTable mode="Air" rows={derivedAirRows} bookingCounts={bookingCounts} hideRateId {...airProps} />;
  return <RateTable mode="Air" rows={filteredAir} bookingCounts={bookingCounts} hideRateId {...airProps} />;
    }
  if (modeTab === 'Transport') return <RateTable mode="Transport" rows={filteredTransport} bookingCounts={bookingCounts} hideRateId {...commonProps} />;
  if (modeTab === 'Customs') return <RateTable mode="Customs" rows={filteredCustoms} bookingCounts={bookingCounts} hideRateId {...commonProps} />;
    return null;
  }

  function renderTrends() {
    // quick trend using numeric x-axis index since labels vary by mode
    const data = (modeTab === "FCL" ? fclRows.map((r, i) => ({ idx: i + 1, cost: r.costPerCntr, sell: r.sellPerCntr }))
      : modeTab === "LCL" ? lclRows.map((r, i) => ({ idx: i + 1, cost: r.ratePerKgCost, sell: r.ratePerKgSell }))
      : modeTab === "Air" ? airRows.map((r, i) => ({ idx: i + 1, cost: r.ratePerKgCost, sell: r.ratePerKgSell }))
      : modeTab === "Transport" ? transportRows.map((r, i) => ({ idx: i + 1, cost: r.cost, sell: r.sell }))
      : customsRows.map((r, i) => ({ idx: i + 1, cost: r.cost, sell: r.sell })));

    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <XAxis dataKey="idx" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="cost" />
          <Line type="monotone" dataKey="sell" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5" fontWeight={600}>Rate Management Dashboard</Typography>
      <Tabs value={modeTab} onChange={(_,v)=> setModeTab(v)} aria-label="Mode tabs">
        <Tab value="FCL" label="Sea – FCL" />
        <Tab value="LCL" label="Sea – LCL" />
        <Tab value="Air" label="Air" />
        <Tab value="Transport" label="Transport" />
        <Tab value="Customs" label="Customs" />
      </Tabs>
      <Card variant="outlined">
        <CardContent>
          <Tabs value={innerTab} onChange={(_,v)=> setInnerTab(v)} aria-label="Inner view tabs" sx={{ mb:2 }}>
            <Tab value="table" label="Rate Table" />
            <Tab value="trends" label="Trends" />
            <Tab value="alerts" label="Alerts" />
          </Tabs>
          {innerTab === 'table' && <Box display="flex" flexDirection="column" gap={2}>{renderToolbar()}<Paper variant="outlined" sx={{ width:'100%', overflowX:'auto' }}>{renderTable()}</Paper></Box>}
          {innerTab === 'trends' && <Box>{renderTrends()}</Box>}
          {innerTab === 'alerts' && <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Alerts</Typography>
            <ul style={{ marginLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.4 }}>
              <li>ROS below threshold on CNSHA → GBFXT (18%)</li>
              <li>Missing vendor rate on current tab ({modeTab})</li>
              <li>Expired contract rate on selected lane</li>
            </ul>
          </Box>}
        </CardContent>
      </Card>
      {/* View Dialog */}
      <Dialog open={!!viewRow} onClose={()=>setViewRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>View {modeTab} Rate</DialogTitle>
        <DialogContent dividers>
          <pre style={{ fontSize:12, margin:0 }}>{JSON.stringify(viewRow, null, 2)}</pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setViewRow(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Dialog (simplified) */}
      <Dialog open={!!editRow} onClose={()=>setEditRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit {modeTab} Rate</DialogTitle>
        <DialogContent dividers sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          {editRow && (
            <>
              <TextField size="small" label="Lane" value={editRow.lane} disabled />
              <TextField size="small" label="Vendor" value={editRow.vendor||''} disabled />
              {modeTab==='FCL' && <>
                <TextField size="small" label="Cost / Cntr" value={editRow.costPerCntr} onChange={e=>setEditRow(r=>({...r, costPerCntr:Number(e.target.value)||0}))} />
                <TextField size="small" label="Sell / Cntr" value={editRow.sellPerCntr} onChange={e=>setEditRow(r=>({...r, sellPerCntr:Number(e.target.value)||0}))} />
              </>}
              {(modeTab==='LCL' || (modeTab==='Air' && !editRow.type)) && <>
                <TextField size="small" label="Cost / Kg" value={editRow.ratePerKgCost} onChange={e=>setEditRow(r=>({...r, ratePerKgCost:Number(e.target.value)||0}))} />
                <TextField size="small" label="Sell / Kg" value={editRow.ratePerKgSell} onChange={e=>setEditRow(r=>({...r, ratePerKgSell:Number(e.target.value)||0}))} />
                <TextField size="small" label="Min Cost" value={editRow.minChargeCost||''} onChange={e=>setEditRow(r=>({...r, minChargeCost:Number(e.target.value)||0}))} />
                <TextField size="small" label="Min Sell" value={editRow.minChargeSell||''} onChange={e=>setEditRow(r=>({...r, minChargeSell:Number(e.target.value)||0}))} />
              </>}
              {(modeTab==='Transport' || modeTab==='Customs') && <>
                <TextField size="small" label="Cost" value={editRow.cost} onChange={e=>setEditRow(r=>({...r, cost:Number(e.target.value)||0}))} />
                <TextField size="small" label="Sell" value={editRow.sell} onChange={e=>setEditRow(r=>({...r, sell:Number(e.target.value)||0}))} />
              </>}
              {modeTab==='Air' && editRow.type==='airSheet' && <Box><Typography variant="caption" color="text.secondary">Editing sheet rows not supported here. Use Airline Rate Entry.</Typography></Box>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setEditRow(null)} color="inherit">Cancel</Button>
          <Button onClick={saveEdit} variant="contained" disabled={editRow && editRow.type==='airSheet'}>Save</Button>
        </DialogActions>
      </Dialog>
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleFile} />
    </Box>
  );
}
