import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, IconButton, TextField, Chip, Tooltip, Button, Collapse, Snackbar, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { getRateById, computeBookingCounts } from './rates-store';
import { useAuth } from './auth-context';

function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function money(n){ return (Number(n)||0).toFixed(2); }

export default function CustomerQuotationList(){
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = React.useState(()=> loadQuotations());
  const [bookingCounts, setBookingCounts] = React.useState(()=>computeBookingCounts());
  const [quotationBookingCounts, setQuotationBookingCounts] = React.useState(()=>{
    try {
      const idx = JSON.parse(localStorage.getItem('bookingIndex')||'{}');
      const byQ = idx.byQuotation || {};
      const map = {}; Object.keys(byQ).forEach(k=> { map[k] = (byQ[k]||[]).length; });
      return map;
    } catch { return {}; }
  });
  const [q, setQ] = React.useState('');
  const [expanded, setExpanded] = React.useState(()=> new Set());
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });
  const [qtyOverrides, setQtyOverrides] = React.useState({}); // { quotationId: { key: qty } }

  function reload(){ setRows(loadQuotations()); }
  React.useEffect(()=>{ function onStorage(e){ if(e.key==='quotations') reload(); } window.addEventListener('storage', onStorage); return ()=> window.removeEventListener('storage', onStorage); }, []);
  // Refresh quotation booking counts when bookings change
  React.useEffect(()=>{
    function refreshQ(){
      try {
        const idx = JSON.parse(localStorage.getItem('bookingIndex')||'{}');
        const byQ = idx.byQuotation || {};
        setQuotationBookingCounts(Object.fromEntries(Object.entries(byQ).map(([k,v])=>[k,(v||[]).length])));
      } catch { /* ignore */ }
    }
    function onStorage(e){ if(e.key==='bookingIndex' || e.key==='bookings') refreshQ(); }
    window.addEventListener('bookingsUpdated', refreshQ);
    window.addEventListener('storage', onStorage);
    return ()=> { window.removeEventListener('bookingsUpdated', refreshQ); window.removeEventListener('storage', onStorage); };
  }, []);
  // Listen for bookings changes to refresh booking counts
  React.useEffect(()=>{
    function refresh(){ setBookingCounts(computeBookingCounts()); }
    function onStorage(e){ if(e.key==='bookings' || e.key==='rateBookings') refresh(); }
    window.addEventListener('bookingsUpdated', refresh);
    window.addEventListener('storage', onStorage);
    return ()=> { window.removeEventListener('bookingsUpdated', refresh); window.removeEventListener('storage', onStorage); };
  }, []);

  // Determine allowed customer codes for this user
  const allowed = React.useMemo(()=> (user?.allowedCustomers || (user?.customerCode? [user.customerCode]: []))?.map(c=> (c||'').toLowerCase()) || [], [user]);

  // Build latest revision per root parent (parentId or self id)
  const latestByRoot = React.useMemo(()=>{
    const map = new Map();
    for(const r of rows){
      const root = r.parentId || r.id;
      if(!allowed.length) continue; // if somehow no allowed list, show nothing
      const cust = (r.customer||'').toLowerCase();
      if(!allowed.includes(cust)) continue;
      const cur = map.get(root);
      if(!cur || (r.version||0) > (cur.version||0)) map.set(root, r);
    }
    return map;
  }, [rows, allowed]);
  const latest = Array.from(latestByRoot.values());

  const filtered = latest.filter(r=>{
    const text = (r.id+' '+(r.customer||'')+' '+(r.mode||'')+' '+(r.incoterm||'')).toLowerCase();
    return text.includes(q.toLowerCase());
  });

  function toggleExpand(id){
    setExpanded(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function loadBookings(){ try{ return JSON.parse(localStorage.getItem('bookings')||'[]'); }catch{ return []; } }
  function saveBookings(list){ try{ localStorage.setItem('bookings', JSON.stringify(list)); }catch{/* ignore */} }
  function updateBookingIndex({ bookingId, quotationId, rateIds }){
    try {
      const idx = JSON.parse(localStorage.getItem('bookingIndex')||'{}');
      // quotation index
      if(quotationId){
        if(!Array.isArray(idx.byQuotation)) idx.byQuotation = {};
        const arr = idx.byQuotation[quotationId] || [];
        if(!arr.includes(bookingId)) arr.unshift(bookingId);
        idx.byQuotation[quotationId] = arr;
      }
      if(rateIds?.length){
        if(!Array.isArray(idx.byRate)) idx.byRate = {}; // intentionally check type
        if(!idx.byRate || typeof idx.byRate !== 'object') idx.byRate = {};
        rateIds.forEach(rid => {
          if(!rid) return;
          const arr = idx.byRate[rid] || [];
            if(!arr.includes(bookingId)) arr.unshift(bookingId);
            idx.byRate[rid] = arr;
        });
      }
      localStorage.setItem('bookingIndex', JSON.stringify(idx));
    } catch {/* ignore index errors */ }
  }
  function createBooking(quote){
    if(!quote || !(quote.lines||[]).length){ setSnack({ open:true, ok:false, msg:'No lines to book.'}); return; }
    const bookings = loadBookings();
    // Attempt to backfill missing rateIds so downstream rate booking counts work
    try {
      const rateIdMap = JSON.parse(localStorage.getItem('rateIdMap')||'{}');
      (quote.lines||[]).forEach(l=> {
        if(!l.rateId){
          const lane = `${l.origin} → ${l.destination}`;
          const sig = `${quote.mode||''}|${lane}|${l.vendor||l.carrier||''}|${l.containerType||l.unit||''}`;
          if(rateIdMap[sig]) l.rateId = rateIdMap[sig];
        }
      });
    } catch {/* ignore */}
    const rateIds = Array.from(new Set((quote.lines||[]).map(l=> l.rateId).filter(Boolean)));
    const id = (rateIds.length===1? `BK-${rateIds[0]}-${Date.now().toString(36)}` : `BK-${quote.id}-${Date.now().toString(36)}`).toUpperCase();
  const overrides = qtyOverrides[quote.id] || {};
    const lineObjects = (quote.lines||[]).map(l=>{
      const qty = Number(overrides[l.rateId || l.origin+'-'+l.destination] ?? l.qty) || 1;
      const rid = l.rateId || null;
      const rateSnapshot = rid ? getRateById(rid) : null; // snapshot full rate for audit/history
      return {
        origin: l.origin,
        destination: l.destination,
        carrier: l.carrier||l.vendor||'-',
        transitTime: l.transitTime||null,
        unit: l.unit||l.containerType||l.basis,
        qty,
        sell: l.sell||0,
        rateId: rid,
        rateSnapshot
      };
    });
    const distinctSnapshots = Object.values(lineObjects.reduce((acc,ln)=>{ if(ln.rateId && ln.rateSnapshot && !acc[ln.rateId]) acc[ln.rateId]=ln.rateSnapshot; return acc; }, {}));
    const booking = {
      id,
      quotationId: quote.id,
      customer: quote.customer,
      createdAt: new Date().toISOString(),
      status:'draft',
      rateIds,
      rates: distinctSnapshots, // distinct rate snapshots referenced
      lines: lineObjects
    };
    bookings.unshift(booking); saveBookings(bookings);
    updateBookingIndex({ bookingId:id, quotationId:quote.id, rateIds });
    // Update rateBookings mapping
    try {
      const rb = JSON.parse(localStorage.getItem('rateBookings')||'{}');
      rateIds.forEach(rid=>{
        if(!rid) return;
        if(!Array.isArray(rb[rid])) rb[rid]=[];
        if(!rb[rid].includes(id)) rb[rid].push(id);
      });
      localStorage.setItem('rateBookings', JSON.stringify(rb));
    } catch {/* ignore */}
    // Link booking back to quotation meta (relatedBookings array)
    try {
      const allQ = loadQuotations();
      const qi = allQ.findIndex(r=> r.id===quote.id);
      if(qi>=0){
        const existing = allQ[qi];
        const related = Array.isArray(existing.relatedBookings)? existing.relatedBookings.slice(): [];
        if(!related.includes(id)) related.push(id);
  allQ[qi] = { ...existing, relatedBookings: related, bookingCount: related.length, updatedAt:new Date().toISOString() };
        localStorage.setItem('quotations', JSON.stringify(allQ));
        setRows(allQ);
      }
    } catch{/* ignore */}
  try { window.dispatchEvent(new Event('bookingsUpdated')); } catch {/* ignore */}
  setSnack({ open:true, ok:true, msg:`Booking ${id} created (draft).` });
  }

  function createBookingForLine(quote, line){
    if(!quote || !line){ setSnack({ open:true, ok:false, msg:'Line not available.' }); return; }
    const bookings = loadBookings();
    // Backfill missing rateId for this line if possible
    let rid = line.rateId || null;
    if(!rid){
      try {
        const rateIdMap = JSON.parse(localStorage.getItem('rateIdMap')||'{}');
        const lane = `${line.origin} → ${line.destination}`;
        const sig = `${quote.mode||''}|${lane}|${line.vendor||line.carrier||''}|${line.containerType||line.unit||''}`;
        if(rateIdMap[sig]) { rid = rateIdMap[sig]; line.rateId = rid; }
      } catch {/* ignore */}
    }
    const id = (`BK-${rid || quote.id}-${Date.now().toString(36)}`).toUpperCase();
    const overrides = qtyOverrides[quote.id] || {};
    const key = line.rateId || line.origin+'-'+line.destination;
    const rateSnapshot = rid ? getRateById(rid) : null;
    const booking = {
      id,
      quotationId: quote.id,
      customer: quote.customer,
      createdAt: new Date().toISOString(),
      status:'draft',
      rateIds: rid? [rid]: [],
      rates: rateSnapshot? [rateSnapshot]: [],
      lines: [{
        origin: line.origin,
        destination: line.destination,
        carrier: line.carrier||line.vendor||'-',
        transitTime: line.transitTime||null,
        unit: line.unit||line.containerType||line.basis,
        qty: Number(overrides[key] ?? line.qty) || 1,
        sell: line.sell||0,
        rateId: line.rateId||null,
        rateSnapshot
      }]
    };
    bookings.unshift(booking); saveBookings(bookings);
    updateBookingIndex({ bookingId:id, quotationId:quote.id, rateIds: booking.rateIds });
    // Update rateBookings mapping for single rate
    try {
      if(rid){
        const rb = JSON.parse(localStorage.getItem('rateBookings')||'{}');
        if(!Array.isArray(rb[rid])) rb[rid]=[];
        if(!rb[rid].includes(id)) rb[rid].push(id);
        localStorage.setItem('rateBookings', JSON.stringify(rb));
      }
    } catch {/* ignore */}
    // Link single-line booking back to quotation
    try {
      const allQ = loadQuotations();
      const qi = allQ.findIndex(r=> r.id===quote.id);
      if(qi>=0){
        const existing = allQ[qi];
        const related = Array.isArray(existing.relatedBookings)? existing.relatedBookings.slice(): [];
        if(!related.includes(id)) related.push(id);
  allQ[qi] = { ...existing, relatedBookings: related, bookingCount: related.length, updatedAt:new Date().toISOString() };
        localStorage.setItem('quotations', JSON.stringify(allQ));
        setRows(allQ);
      }
    } catch{/* ignore */}
  try { window.dispatchEvent(new Event('bookingsUpdated')); } catch {/* ignore */}
  setSnack({ open:true, ok:true, msg:`Booking ${id} created for lane ${line.origin}→${line.destination}.` });
  }

  function setQty(quotationId, line, value){
    setQtyOverrides(prev => {
      const next = { ...prev };
      const key = line.rateId || line.origin+'-'+line.destination;
      const v = Number(value);
      if(!next[quotationId]) next[quotationId] = {};
      if(!value || v<=0){ delete next[quotationId][key]; }
      else next[quotationId][key] = v;
      return next;
    });
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h6">Your Quotations ({filtered.length} / {latest.length})</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <TextField size="small" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} />
          <IconButton size="small" onClick={reload}><RefreshIcon fontSize="inherit" /></IconButton>
        </Box>
      </Box>
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle2' }} title="Quotations" />
        <CardContent sx={{ pt:0 }}>
          {!filtered.length && <Typography variant="caption" color="text.secondary">No quotations found for your account.</Typography>}
          {!!filtered.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Incoterm</TableCell>
                  <TableCell align="right">Offer</TableCell>
                  <TableCell>Valid</TableCell>
                  <TableCell>Lines</TableCell>
                  <TableCell>Bookings</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(q=>{
                  const sell = (q.lines||[]).reduce((s,l)=> s + (Number(l.sell)||0)*(l.qty||1),0) + (q.charges||[]).reduce((s,c)=> s + (Number(c.sell)||0)*(c.qty||1),0);
                  return (
                    <React.Fragment key={q.id}>
                      <TableRow hover>
                        <TableCell width={40}>
                          <IconButton size="small" onClick={()=>toggleExpand(q.id)}>{expanded.has(q.id)? <ExpandLessIcon fontSize="inherit" /> : <ExpandMoreIcon fontSize="inherit" />}</IconButton>
                        </TableCell>
                        <TableCell>
                          {q.id}
                          {q.version && <Chip size="small" label={`v${q.version}`} sx={{ ml:0.5 }}/>} 
                          {q.parentId && <Tooltip title={`Root ${q.parentId}`}><Chip size="small" label="Rev" sx={{ ml:0.5 }}/></Tooltip>}
                        </TableCell>
                        <TableCell>{q.customer}</TableCell>
                        <TableCell>{q.mode}</TableCell>
                        <TableCell>{q.incoterm}</TableCell>
                        <TableCell align="right">{money(sell)}</TableCell>
                        <TableCell>{q.validFrom || '-'} → {q.validTo || '-'}</TableCell>
                        <TableCell>{q.lines?.length||0}</TableCell>
                        <TableCell>{quotationBookingCounts[q.id] || (Array.isArray(q.relatedBookings)? q.relatedBookings.length : 0) || 0}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={()=>navigate(`/quotations/${q.id}`)} title="Open"><EditIcon fontSize="inherit" /></IconButton>
                          <IconButton size="small" onClick={()=>createBooking(q)} title="Book" disabled={!(q.lines||[]).length}><AddShoppingCartIcon fontSize="inherit" /></IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom:0, paddingTop:0 }} colSpan={9}>
                          <Collapse in={expanded.has(q.id)} timeout="auto" unmountOnExit>
                            <Box m={1}>
                              <Typography variant="caption" fontWeight={600} gutterBottom>Quote Detail</Typography>
                              {!(q.lines||[]).length && <Typography variant="caption" color="text.secondary">No lines in this quotation.</Typography>}
                              {!!(q.lines||[]).length && (
                                <Table size="small" sx={{ mb:1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Lane</TableCell>
                                      <TableCell>Shipping Line</TableCell>
                                      <TableCell>Transit Time</TableCell>
                                      <TableCell>Unit</TableCell>
                                      <TableCell align="center">Qty</TableCell>
                                      <TableCell align="right">Offer</TableCell>
                                      <TableCell align="center">Bookings</TableCell>
                                      <TableCell align="center">Book</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {q.lines.map((l,i)=> (
                                      <TableRow key={l.rateId||i}>
                                        <TableCell>{l.origin} → {l.destination}</TableCell>
                                        <TableCell>{l.carrier || l.vendor || '-'}</TableCell>
                                        <TableCell>{l.transitTime || '-'}</TableCell>
                                        <TableCell>{l.unit || l.containerType || l.basis}</TableCell>
                                        <TableCell align="center">
                                          <TextField
                                            size="small"
                                            type="number"
                                            inputProps={{ min:1, style:{ textAlign:'center', width:70 } }}
                                            value={qtyOverrides[q.id]?.[l.rateId || l.origin+'-'+l.destination] ?? l.qty ?? 1}
                                            onChange={e=> setQty(q.id, l, e.target.value)}
                                          />
                                        </TableCell>
                                        <TableCell align="right">{money(l.sell)}</TableCell>
                                        <TableCell align="center">{l.rateId ? (bookingCounts[l.rateId] || 0) : '-'}</TableCell>
                                        <TableCell align="center">
                                          <IconButton size="small" onClick={()=>createBookingForLine(q,l)} title="Book this lane" disabled={!l.sell}>
                                            <AddShoppingCartIcon fontSize="inherit" />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                              <Typography variant="caption" color="text.secondary">Adjust Qty to request different volume for booking. This does not change the original quotation.</Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Typography mt={1} variant="caption" color="text.secondary">Margin and ROS are hidden in customer view.</Typography>
        </CardContent>
      </Card>
      <Box>
        <Button size="small" variant="outlined" onClick={reload}>Refresh</Button>
      </Box>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert variant="filled" severity={snack.ok? 'success':'error'} onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
