import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, IconButton, TextField, Chip, Tooltip, Button, Collapse, Snackbar, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { QUOTATION_DEFAULT_STATUS } from './inquiry-statuses';
import { useAuth } from './auth-context';

function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function money(n){ return (Number(n)||0).toFixed(2); }

export default function CustomerQuotationList(){
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = React.useState(()=> loadQuotations());
  const [q, setQ] = React.useState('');
  const [expanded, setExpanded] = React.useState(()=> new Set());
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });
  const [qtyOverrides, setQtyOverrides] = React.useState({}); // { quotationId: { key: qty } }

  function reload(){ setRows(loadQuotations()); }
  React.useEffect(()=>{ function onStorage(e){ if(e.key==='quotations') reload(); } window.addEventListener('storage', onStorage); return ()=> window.removeEventListener('storage', onStorage); }, []);

  // Determine allowed customer codes for this user. Include customerCode and also any plain customer identifier
  // from user.customer (display name) to be flexible for entries like 'customer.ACE' -> 'CUSTA'.
  const allowed = React.useMemo(()=>{
    const list = new Set();
    const src = user?.allowedCustomers || [];
    for(const c of src) if(c) list.add(String(c).toLowerCase());
    if(user?.customerCode) list.add(String(user.customerCode).toLowerCase());
    // also include username suffix after 'customer.' if present (e.g. 'customer.ace') to help fuzzy matching
    if(user?.username && user.username.startsWith('customer.')){
      const suffix = user.username.split('.').slice(1).join('.');
      if(suffix) list.add(String(suffix).toLowerCase());
    }
    return Array.from(list);
  }, [user]);

  // Build latest revision per root parent (parentId or self id)
  const latestByRoot = React.useMemo(()=>{
    const map = new Map();
    for(const r of rows){
      const root = r.parentId || r.id;
      if(!allowed.length) continue; // if somehow no allowed list, show nothing
    // Flexible matching: allow exact match, substring match, or normalized alphanumeric match
  const normalize = (s) => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  // Prefer explicit customer field, fall back to inquirySnapshot.customer, customerName or customerCode
  const custRaw = (r.customer && String(r.customer).trim()) || (r.inquirySnapshot && r.inquirySnapshot.customer) || r.customerName || r.customerCode || '';
  const cust = String(custRaw).toLowerCase();
  const custNorm = normalize(cust);
  // Tokenize both the stored customer string and allowed values into alphanumeric tokens
  const tokenize = (s) => (s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const custTokens = tokenize(custRaw);
        const matchesAllowed = allowed.some(a => {
          if(!a) return false;
          const allow = String(a).toLowerCase();
          const allowNorm = normalize(allow);
          const allowTokens = tokenize(allow);
          // direct equality
          if(allow === cust) return true;
          // token-level equality or prefix (e.g., 'CUSTA' token at start)
          if(allowTokens.some(at => custTokens.includes(at))) return true;
          // normalized inclusion (handles punctuation differences)
          if(allowNorm && custNorm && custNorm.includes(allowNorm)) return true;
          // also allow if allowed value appears as substring in the raw customer field
          if((cust).includes(allow)) return true;
          return false;
        });
        if(!matchesAllowed) continue;
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
  function createBooking(quote){
    if(!quote || !(quote.lines||[]).length){ setSnack({ open:true, ok:false, msg:'No lines to book.'}); return; }
    const bookings = loadBookings();
    const id = 'B-'+Date.now().toString(36).toUpperCase();
  const overrides = qtyOverrides[quote.id] || {};
    const booking = {
      id,
      quotationId: quote.id,
      customer: quote.customer,
      createdAt: new Date().toISOString(),
      status: QUOTATION_DEFAULT_STATUS,
      lines: (quote.lines||[]).map(l=> ({
        origin:l.origin,
        destination:l.destination,
        carrier:l.carrier||l.vendor||'-',
        transitTime: l.transitTime||null,
        unit: l.unit||l.containerType||l.basis,
    qty: Number(overrides[l.rateId || l.origin+'-'+l.destination] ?? l.qty) || 1,
        sell: l.sell||0,
        rateId: l.rateId || null
      }))
    };
    bookings.unshift(booking); saveBookings(bookings);
    // Link booking back to quotation meta (relatedBookings array)
    try {
      const allQ = loadQuotations();
      const qi = allQ.findIndex(r=> r.id===quote.id);
      if(qi>=0){
        const existing = allQ[qi];
        const related = Array.isArray(existing.relatedBookings)? existing.relatedBookings.slice(): [];
        if(!related.includes(id)) related.push(id);
        allQ[qi] = { ...existing, relatedBookings: related, updatedAt:new Date().toISOString() };
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
    const id = 'B-'+Date.now().toString(36).toUpperCase();
    const overrides = qtyOverrides[quote.id] || {};
    const key = line.rateId || line.origin+'-'+line.destination;
    const booking = {
      id,
      quotationId: quote.id,
      customer: quote.customer,
      createdAt: new Date().toISOString(),
      status: QUOTATION_DEFAULT_STATUS,
      lines: [{
        origin: line.origin,
        destination: line.destination,
        carrier: line.carrier||line.vendor||'-',
        transitTime: line.transitTime||null,
        unit: line.unit||line.containerType||line.basis,
        qty: Number(overrides[key] ?? line.qty) || 1,
        sell: line.sell||0,
        rateId: line.rateId||null
      }]
    };
    bookings.unshift(booking); saveBookings(bookings);
    // Link single-line booking back to quotation
    try {
      const allQ = loadQuotations();
      const qi = allQ.findIndex(r=> r.id===quote.id);
      if(qi>=0){
        const existing = allQ[qi];
        const related = Array.isArray(existing.relatedBookings)? existing.relatedBookings.slice(): [];
        if(!related.includes(id)) related.push(id);
        allQ[qi] = { ...existing, relatedBookings: related, updatedAt:new Date().toISOString() };
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
          {!filtered.length && <>
            <Typography variant="caption" color="text.secondary">No quotations found for your account.</Typography>
            {/* Diagnostics to help identify matching issues for customer accounts */}
            <Box mt={1} p={1} sx={{ border:1, borderColor:'divider', borderRadius:1, backgroundColor:(theme)=> theme.palette.background.paper }}>
              <Typography variant="caption" fontWeight={600}>Diagnostics</Typography>
              <Typography variant="caption" color="text.secondary">Allowed identifiers: {allowed.length? allowed.join(', ') : <i>none</i>}</Typography>
              <Box mt={0.5}>
                <Typography variant="caption" color="text.secondary">Stored quotations (sample) — match diagnostics:</Typography>
                {rows.slice(0,10).map(r=> {
                  // compute same matching logic for display
                  const normalize = (s) => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
                  const tokenize = (s) => (s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
            // const cust = (r.customer||'').toLowerCase();
            // const custNorm = normalize(cust);
                  // Prefer explicit customer field, fall back to inquirySnapshot.customer, customerName or customerCode
                  const custRaw = (r.customer && String(r.customer).trim()) || (r.inquirySnapshot && r.inquirySnapshot.customer) || r.customerName || r.customerCode || '';
                  const cust = String(custRaw).toLowerCase();
                  const custNorm = normalize(cust);
                  const custTokens = tokenize(custRaw);
                  const reasons = [];
                  let matched = false;
                  for(const a of allowed){
                    if(!a) continue;
                    const allow = String(a).toLowerCase();
                    const allowNorm = normalize(allow);
                    const allowTokens = tokenize(allow);
                    if(allow === cust){ reasons.push(`${allow} === full`); matched = true; break; }
                    if(allowTokens.some(at => custTokens.includes(at))){ reasons.push(`${allow} token-match`); matched = true; break; }
                    if(allowNorm && custNorm && custNorm.includes(allowNorm)){ reasons.push(`${allow} norm-includes`); matched = true; break; }
                    if((r.customer||'').toLowerCase().includes(allow)){ reasons.push(`${allow} substr`); matched = true; break; }
                    reasons.push(`${allow} no-match`);
                  }
                  if(!allowed.length) reasons.push('no allowed identifiers');
                  return (
                    <Box key={r.id} sx={{ mb:0.5 }}>
                      <Typography variant="caption"><strong>{r.id}</strong> • <em>{String(r.customer||'')}</em></Typography>
                      <Typography variant="caption" color="text.secondary">Tokens: {custTokens.join(', ') || '-'} • Norm: {custNorm || '-'}</Typography>
                      <Typography variant="caption" color={matched? 'success.main' : 'error.main'}>Match: {matched? 'YES' : 'NO'} • Reasons: {reasons.join(' | ')}</Typography>
                    </Box>
                  );
                })}
                {rows.length===0 && <Typography variant="caption" color="text.secondary">No quotations present in localStorage.</Typography>}
              </Box>
            </Box>
          </>}
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
