// src/RateWorkspace.jsx
// Renamed from RateHistoryDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardHeader, CardContent, Typography,
  TextField, Autocomplete, Button, Divider, Tooltip, Paper,
  Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, Legend, BarChart, Bar } from 'recharts';
import RateTable from './RateTable';
import { useAuth } from './auth-context';
import { hideCostFor, hideRosFor } from './permissions';
import { Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import sampleRates from './sample-rates.json';

// --- Utilities (copied inline to keep component standalone) ---
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function monthLabel(d) { return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }
function startOfMonth(year, monthIndex) { return new Date(year, monthIndex, 1, 0, 0, 0, 0); }
function endOfMonth(year, monthIndex) { return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999); }
function previousCalendarMonthRange() {
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  const prev = new Date(y, m - 1, 1);
  return { start: startOfMonth(prev.getFullYear(), prev.getMonth()), end: endOfMonth(prev.getFullYear(), prev.getMonth()), label: monthLabel(prev), key: monthKey(prev) };
}
function lastNMonthBuckets(n = 12) {
  const now = new Date(); const buckets = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); buckets.push({ key: monthKey(d), label: monthLabel(d), start: startOfMonth(d.getFullYear(), d.getMonth()), end: endOfMonth(d.getFullYear(), d.getMonth()) }); }
  return buckets;
}
function currencyFmt(v, ccy = 'USD') { if (typeof v !== 'number' || Number.isNaN(v)) return '-'; try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(v); } catch { return Number(v).toFixed(2); } }
function safeNum(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
// Build Origin/Destination options from the Rate Table (sample + dynamic + airline sheets)
function collectPortsFromRateTable(){
  const set = new Set();
  // Prefer the live Rate Table persisted by rate-management under 'managedRates';
  // fall back to bundled sample if not present yet.
  let managed;
  try { managed = JSON.parse(localStorage.getItem('managedRates')||'null'); } catch { managed = null; }
  const base = managed ? {
    FCL: [...(managed.FCL||[])],
    LCL: [...(managed.LCL||[])],
    Air: [...(managed.Air||[])]
  } : {
    FCL: [...(sampleRates.FCL||[])],
    LCL: [...(sampleRates.LCL||[])],
    Air: [...(sampleRates.Air||[])]
  };
  // Merge dynamicRates overlays
  try {
    const dyn = JSON.parse(localStorage.getItem('dynamicRates')||'{}');
    const modes = ['FCL','LCL','Air','Transport','Customs'];
    const mergeByKey = (prev, next, keyFn)=>{ const map=new Map(); [...prev,...next].forEach(r=> map.set(keyFn(r), r)); return Array.from(map.values()); };
    for(const m of modes){ if(Array.isArray(dyn[m]) && dyn[m].length){ base[m] = mergeByKey(base[m], dyn[m], r=> JSON.stringify([r.lane, r.vendor||'', r.container||r.unit||''])); } }
  } catch { /* ignore */ }
  // Include airline sheet routes from managedRates if available; fall back to localStorage
  try {
    const sheets = managed?.airlineSheets ?? JSON.parse(localStorage.getItem('airlineRateSheets')||'[]');
    (sheets||[]).forEach(s=>{
      const o = (s.route?.origin||'').trim();
      const d = (s.route?.destination||'').trim();
      if(o) set.add(o); if(d) set.add(d);
    });
  } catch { /* ignore */ }
  // Collect from table modes only (FCL/LCL/Air). Exclude Transport/Customs for lane selects.
  const groups = [base.FCL, base.LCL, base.Air];
  groups.forEach(arr => (arr||[]).forEach(r=>{
    const parts = String(r.lane||'').split('→').map(s=> s.trim());
    if(parts[0]) set.add(parts[0]);
    if(parts[1]) set.add(parts[1]);
  }));
  return Array.from(set).sort();
}
function matchesLane(line, origin, destination) {
  let o = (line.origin || '').toString();
  let d = (line.destination || '').toString();
  if ((!o || !d) && line.lane) {
    const [lo, ld] = String(line.lane).split('→');
    o = (o || lo || '').toString();
    d = (d || ld || '').toString();
  }
  const O = (origin || '').trim().toUpperCase();
  const D = (destination || '').trim().toUpperCase();
  const OO = o.trim().toUpperCase();
  const DD = d.trim().toUpperCase();
  return (!O || OO.includes(O)) && (!D || DD.includes(D));
}
function aggregateMonthlyForLane({ quotations, bookings, origin, destination, months = 12, customer }){
  const buckets = lastNMonthBuckets(months);
  const points = buckets.map(b=>{
    // compute totals (filter by customer if provided)
    let totalSell = 0, totalCost = 0, totalQty = 0;
    (quotations||[]).forEach(q=>{
      if (customer && String((q.customer||'')).toLowerCase() !== String(customer).toLowerCase()) return;
      const when = new Date(q.createdAt||q.validFrom||q.validTo||Date.now());
      if (when >= b.start && when <= b.end){
        (q.lines||[]).forEach(line=>{
          if(!matchesLane(line, origin, destination)) return;
          const qty = safeNum(line.qty,1);
          const effSell = safeNum(line.sell,0) - safeNum(line.discount,0);
          const effMargin = safeNum(line.margin,0) - safeNum(line.discount,0);
          const effCost = effSell - effMargin;
          totalSell += effSell * qty;
          totalCost += effCost * qty;
          totalQty += qty;
        });
      }
    });

    let volume = 0;
    (bookings||[]).forEach(bk=>{
      if (customer && String((bk.customer||'')).toLowerCase() !== String(customer).toLowerCase()) return;
      const when = new Date(bk.createdAt||Date.now());
      if (when >= b.start && when <= b.end){
        (bk.lines||[]).forEach(line=>{
          if(!matchesLane(line, origin, destination)) return;
          volume += safeNum(line.qty,1);
        });
      }
    });
    const avgSell = totalQty? totalSell/totalQty:0; const avgCost = totalQty? totalCost/totalQty:0;
    return { month:b.label, key:b.key, avgSell:+avgSell.toFixed(2), avgCost:+avgCost.toFixed(2), volume };
  });
  return points;
}
// Lane matcher for strings like "ORIG → DEST" with wildcard support
function laneMatches(lane, origin, destination){
  const [oRaw, dRaw] = String(lane||'').split('→');
  const o = (oRaw||'').trim().toUpperCase();
  const d = (dRaw||'').trim().toUpperCase();
  const O = (origin||'').trim().toUpperCase();
  const D = (destination||'').trim().toUpperCase();
  return (!O || o.includes(O)) && (!D || d.includes(D));
}
// Build a flat list of quotation line items filtered by lane (supports wildcard) over last N months
function computeQuotationLineItems({ quotations, origin, destination, months=6, customer }){
  const buckets = lastNMonthBuckets(months); const start=buckets[0].start; const end=buckets[buckets.length-1].end;
  const rows = [];
  (quotations||[]).forEach(q=>{
    // honor customer filter if provided
    if(customer && String((q.customer||'')).toLowerCase() !== String(customer).toLowerCase()) return;
    const when = new Date(q.createdAt||q.validFrom||q.validTo||Date.now());
    if(when<start||when>end) return;
    (q.lines||[]).forEach(line=>{
      if(!matchesLane(line, origin, destination)) return;
      // Resolve origin/destination in case the line only has lane
      let o = line.origin, d = line.destination;
      if((!o || !d) && line.lane){ const [lo, ld] = String(line.lane).split('→'); o = o||lo; d = d||ld; }
      const sell = safeNum(line.sell,0);
      const discount = safeNum(line.discount,0);
      rows.push({
        id: q.id,
        customer: q.customer||'—',
        createdAt: when,
        origin: (o||'').toString().trim(),
        destination: (d||'').toString().trim(),
        qty: safeNum(line.qty,1),
        sell,
        discount,
        netSell: +(sell - discount).toFixed(2),
        margin: safeNum(line.margin,0)
      });
    });
  });
  // Newest first
  rows.sort((a,b)=> b.createdAt - a.createdAt);
  return rows;
}
// Demo/sample data utilities removed

export default function RateWorkspace(){
  const navigate = useNavigate();
  const [rtVersion, setRtVersion] = useState(0); // bump when rate table changes
  const portOptions = useMemo(()=> { void rtVersion; return collectPortsFromRateTable(); }, [rtVersion]);
  const [origin, setOrigin] = useState(portOptions[0]||'');
  const [destination, setDestination] = useState(portOptions[1]||'');
  const [months, setMonths] = useState(12);
  const [currency, setCurrency] = useState('USD');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [quotations, setQuotations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tableMode, setTableMode] = useState('FCL');
  const [tableRows, setTableRows] = useState({ FCL: [], LCL: [], Air: [], airlineSheets: [], derivedAir: [], bookingCounts: {} });

  const { user } = useAuth() || {};
  // Sales and Customer should not see cost/margin. SalesManager can see ROS but not cost/margin.
  const hideCost = hideCostFor(user);
  const hideRos = hideRosFor(user);
  useEffect(()=>{ try { setQuotations(JSON.parse(localStorage.getItem('quotations')||'[]')); } catch { setQuotations([]); } try { setBookings(JSON.parse(localStorage.getItem('bookings')||'[]')); } catch { setBookings([]); } }, [dataVersion]);
  const trendPoints = useMemo(()=> aggregateMonthlyForLane({ quotations, bookings, origin, destination, months, customer: customerFilter }), [quotations, bookings, origin, destination, months, customerFilter]);
  const lastMonth = previousCalendarMonthRange();
  const lastMonthStats = useMemo(()=>{ const p=trendPoints.find(x=> x.key===lastMonth.key); return p||{ avgSell:0, avgCost:0, volume:0 }; }, [trendPoints, lastMonth.key]);
  const quoteLines = useMemo(()=> computeQuotationLineItems({ quotations, origin, destination, months:6, customer: customerFilter }), [quotations, origin, destination, customerFilter]);
  const hasAnyData = (trendPoints||[]).some(p=> p.avgSell || p.avgCost || p.volume);
  useEffect(()=>{ const onChange=()=> setDataVersion(v=>v+1); window.addEventListener('storage', onChange); window.addEventListener('bookingsUpdated', onChange); return ()=>{ window.removeEventListener('storage', onChange); window.removeEventListener('bookingsUpdated', onChange); }; }, []);
  // Listen for rate table impacting storage keys and refresh port options
  useEffect(()=>{
    function onStorage(e){
      if(!e || !e.key) { setRtVersion(v=>v+1); return; }
      if(['dynamicRates','airlineRateSheets','managedRates'].includes(e.key)) setRtVersion(v=>v+1);
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('ratesUpdated', ()=> setRtVersion(v=>v+1));
    return ()=>{
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('ratesUpdated', ()=> setRtVersion(v=>v+1));
    };
  }, []);

  // Load related table rows from managedRates + compute booking counts
  const laneStr = useMemo(()=> `${origin||''} → ${destination||''}`.trim(), [origin, destination]);
  useEffect(()=>{
    try {
      const managed = JSON.parse(localStorage.getItem('managedRates')||'null');
      const bookingsArr = JSON.parse(localStorage.getItem('bookings')||'[]');
      const counts = {};
      (bookingsArr||[]).forEach(b=> (b.lines||[]).forEach(line=> { if(line.rateId){ counts[line.rateId] = (counts[line.rateId]||0)+1; } }));
      const filterLane = (rows=[])=> rows.filter(r=> laneMatches(r.lane, origin, destination));
      const filterSheet = (s)=> laneMatches(`${s.route?.origin||''} → ${s.route?.destination||''}`, origin, destination);
      const next = managed ? {
        FCL: filterLane(managed.FCL||[]),
        LCL: filterLane(managed.LCL||[]),
        Air: filterLane(managed.Air||[]),
        airlineSheets: (managed.airlineSheets||[]).filter(filterSheet),
        derivedAir: (managed.derivedAir||[]).filter(r=> laneMatches(r.lane, origin, destination)),
        bookingCounts: counts
      } : {
        FCL: filterLane(sampleRates.FCL||[]),
        LCL: filterLane(sampleRates.LCL||[]),
        Air: filterLane(sampleRates.Air||[]),
        airlineSheets: JSON.parse(localStorage.getItem('airlineRateSheets')||'[]').filter(filterSheet),
        derivedAir: JSON.parse(localStorage.getItem('derivedAirRates')||'[]').filter(r=> laneMatches(r.lane, origin, destination)),
        bookingCounts: counts
      };
      setTableRows(next);
    } catch {
      setTableRows({ FCL:[], LCL:[], Air:[], airlineSheets:[], derivedAir:[], bookingCounts:{} });
    }
  }, [laneStr, rtVersion, dataVersion, origin, destination]);
  // Removed auto-loading of bundled sample data

  // (Removed) Related Rates & Quotations card computations

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5" fontWeight={600}>Rate Workspace</Typography>
  <Card variant="outlined" sx={{
        position:'sticky',
        // Keep the filter bar visible below the fixed AppBar
        top: (t)=> {
          const mh = t?.mixins?.toolbar?.minHeight;
          const h = typeof mh === 'number' ? mh : (typeof mh === 'object' && (mh.sm || mh.md)) ? (mh.sm || mh.md) : 64;
          return h + 8; // add small gap
        },
        zIndex: (t)=> Math.max((t?.zIndex?.appBar ?? 1100) - 1, 1),
        bgcolor: (t)=> t?.palette?.background?.paper || '#fff',
        backdropFilter: 'saturate(180%) blur(6px)'
      }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Autocomplete options={portOptions} value={origin} onChange={(_,v)=>setOrigin(v||'')} onInputChange={(_,v)=>setOrigin(v||'')} freeSolo renderInput={(p)=> <TextField {...p} label="Origin" size="small" fullWidth />} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete options={portOptions} value={destination} onChange={(_,v)=>setDestination(v||'')} onInputChange={(_,v)=>setDestination(v||'')} freeSolo renderInput={(p)=> <TextField {...p} label="Destination" size="small" fullWidth />} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={[...new Set((quotations||[]).map(q=> q.customer || '').filter(Boolean))]}
                value={customerFilter}
                onChange={(_,v)=> setCustomerFilter(v||'')}
                freeSolo
                renderInput={(p)=> <TextField {...p} label="Customer (optional)" size="small" fullWidth />}
              />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={2} justifyContent="center" alignItems="center">
                <Grid item xs={6} sm={4} md={2}>
                  <TextField label="Months (3 - 24)" size="small" type="number" value={months} onChange={(e)=> setMonths(Math.max(3, Math.min(24, Number(e.target.value||12))))}  fullWidth />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField label="Currency" size="small" value={currency} onChange={(e)=> setCurrency(e.target.value||'USD')} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4} md={2} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' } }}>
                  <Button variant="outlined" onClick={()=>{ setCustomerFilter(''); setOrigin(''); setDestination(''); setMonths(12); setCurrency('USD'); }}>Clear filters</Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', px: 1 }}> 
                <CardHeader title="Prev Month – Avg Cost" sx={{ '& .MuiCardHeader-title': { textAlign: 'center', width: '100%' } }} />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{currencyFmt(lastMonthStats.avgCost, currency)}</Typography>
                  <Typography variant="caption" color="text.secondary">{lastMonth.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', px: 1 }}>
                <CardHeader title="Prev Month – Avg Sell" sx={{ '& .MuiCardHeader-title': { textAlign: 'center', width: '100%' } }} />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{currencyFmt(lastMonthStats.avgSell, currency)}</Typography>
                  <Typography variant="caption" color="text.secondary">{lastMonth.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', px: 1 }}>
                <CardHeader title="Prev Month – Volume" sx={{ '& .MuiCardHeader-title': { textAlign: 'center', width: '100%' } }} />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{lastMonthStats.volume || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">Total booked units</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Moved up: Related Active Rates (previously below trend) */}
      <Card variant="outlined">
        <CardHeader title="Related Active Rates" subheader="Rates from the Rate Table matching the selected lane" />
        <CardContent>
          <Tabs value={tableMode} onChange={(_,v)=> setTableMode(v)} aria-label="Related rate modes" sx={{ mb: 2 }}>
            <Tab value="FCL" label="Sea – FCL" />
            <Tab value="LCL" label="Sea – LCL" />
            <Tab value="Air" label="Air" />
          </Tabs>
          {tableMode === 'FCL' && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <RateTable mode="FCL" rows={tableRows.FCL} bookingCounts={tableRows.bookingCounts} hideCost={hideCost} hideRos={hideRos} onEdit={()=> navigate(`/rates?q=${encodeURIComponent(laneStr)}&mode=FCL&auto=1`)} />
            </Paper>
          )}
          {tableMode === 'LCL' && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <RateTable mode="LCL" rows={tableRows.LCL} bookingCounts={tableRows.bookingCounts} hideCost={hideCost} hideRos={hideRos} onEdit={()=> navigate(`/rates?q=${encodeURIComponent(laneStr)}&mode=LCL&auto=1`)} />
            </Paper>
          )}
          {tableMode === 'Air' && (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              {/* Prefer airline sheets; append derived rows that aren't part of the visible sheets */}
              {(() => {
                const sheets = tableRows.airlineSheets || [];
                const derived = tableRows.derivedAir || [];
                if (sheets.length) {
                  const sheetIds = new Set(sheets.map(s=> s.id));
                  const extra = derived.filter(r=> !sheetIds.has(r.sheetId));
                  const combined = [...sheets.map(s=> ({
                    type: 'airSheet',
                    id: s.id,
                    lane: `${s.route?.origin||''} → ${s.route?.destination||''}`.trim(),
                    airlineName: s.airline?.name || s.airline?.iata || '-',
                    serviceType: s.flightInfo?.serviceType || '-',
                    currency: s.currency || '-',
                    validFrom: s.validFrom || '',
                    validTo: s.validTo || '',
                    minCharge: s.general?.minCharge ?? 0,
                    breaks: (s.general?.breaks||[]).reduce((acc,b)=>{ acc[b.thresholdKg]=b.ratePerKg; return acc; }, {}),
                    commoditiesCount: (s.commodities||[]).length
                  })), ...extra];
                  return <RateTable mode="Air" rows={combined} bookingCounts={tableRows.bookingCounts} hideCost={hideCost} hideRos={hideRos} onEdit={()=> navigate(`/rates?q=${encodeURIComponent(laneStr)}&mode=Air&auto=1`)} />;
                }
                return <RateTable mode="Air" rows={derived} bookingCounts={tableRows.bookingCounts} hideCost={hideCost} hideRos={hideRos} onEdit={()=> navigate(`/rates?q=${encodeURIComponent(laneStr)}&mode=Air&auto=1`)} />;
              })()}
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Move Quotation line items directly below Related Active Rates */}
      <Card variant="outlined">
        <CardHeader title="Quotation Line Items" subheader="Past 6 months — filtered by selected Origin/Destination" />
        <CardContent>
          {quoteLines.length===0 ? (
            <Typography variant="body2" color="text.secondary">No quotation lines found for this lane in the selected period.</Typography>
          ) : (
            <Paper variant="outlined" sx={{ overflowX:'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Quotation #</TableCell>
                    <TableCell>Trade Lane</TableCell>
                    <TableCell align="right">Selling</TableCell>
                    <TableCell align="right">Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quoteLines.map(row=> (
                    <TableRow key={`${row.id}-${row.createdAt?.toISOString?.()||row.createdAt}`} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{`${row.origin||''} → ${row.destination||''}`.trim()}</TableCell>
                      <TableCell align="right">{currencyFmt(row.sell, currency)}</TableCell>
                      <TableCell align="right">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
  <CardHeader title="Rate Trend (Avg Sell vs Avg Cost)" />
        <CardContent>
          {!hasAnyData && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              No data yet for this lane.
            </Typography>
          )}
          <Box sx={{ width:'100%', height:340 }}>
            <ResponsiveContainer>
              <LineChart data={trendPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RTooltip />
                <Legend />
                <Line type="monotone" dataKey="avgSell" name="Avg Sell" stroke="#1976d2" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avgCost" name="Avg Cost" stroke="#9c27b0" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>


      <Card variant="outlined">
        <CardHeader title="Volume by Month" />
        <CardContent>
          <Box sx={{ width:'100%', height:300 }}>
            <ResponsiveContainer>
              <BarChart data={trendPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RTooltip />
                <Bar dataKey="volume" name="Booked Units" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      

      <Divider />
      <Typography variant="caption" color="text.secondary">Notes: Avg Sell & Cost are computed from quotations for this lane (Cost = (Sell − Discount) − (Margin − Discount)). Volume counts booked line quantities.</Typography>
    </Box>
  );
}
