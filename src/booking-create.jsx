// booking-create.jsx
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardHeader, CardContent, Typography, TextField, Grid,
  Button, Checkbox, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Snackbar, Alert, Divider, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// --- small helpers -----------------------------------------------------------
function parseJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function loadQuotations() {
  // Try common keys used across the prototype
  const a = parseJSON('quotations', []);
  const b = parseJSON('savedQuotations', []);
  // Merge by id (b takes precedence if duplicate)
  const map = new Map();
  [...a, ...b].forEach(q => q?.id && map.set(q.id, q));
  return Array.from(map.values());
}
function saveBookings(list) {
  try { localStorage.setItem('bookings', JSON.stringify(list)); }
  catch {/* ignore */}
  try { window.dispatchEvent(new Event('bookingsUpdated')); } catch {/* ignore */}
}
function nextBookingId() {
  const list = parseJSON('bookings', []);
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`; // e.g., 202510
  const sameMonth = list.filter(b => (b.id||'').startsWith(`BKG-${ym}-`));
  const seq = sameMonth.length + 1;
  return `BKG-${ym}-${String(seq).padStart(4,'0')}`;
}
function rosChip(v){
  const color = v>=20 ? 'success' : v>=12 ? 'warning' : 'error';
  return <Chip size="small" color={color} label={`${(v||0).toFixed?.(1) ?? v}%`} variant={v>=20?'filled':'outlined'} />;
}
// Basic scope choices (you already have a more complete list elsewhere)
const SCOPE_OPTIONS = [
  { value:'CY_CY', label:'Port → Port (CY/CY)' },
  { value:'DOOR_CY', label:'Door → Port (Door/CY)' },
  { value:'CY_DOOR', label:'Port → Door (CY/Door)' },
  { value:'DOOR_DOOR', label:'Door → Door' },
];

// --- main component ----------------------------------------------------------
export default function BookingCreate(){
  const navigate = useNavigate();
  const { qid: qidFromRoute } = useParams();
  const [sp] = useSearchParams();
  const qidFromQuery = sp.get('quotationId');
  const quotationId = qidFromRoute || qidFromQuery || '';

  const quotations = React.useMemo(()=> loadQuotations(), []);
  const quote = React.useMemo(()=> quotations.find(q=>q.id===quotationId) || null, [quotations, quotationId]);

  // Selected lines (default = all lines if any)
  const [lineSelections, setLineSelections] = React.useState(()=> {
    const ids = (quote?.lines||[]).map((_,i)=> i);
    return new Set(ids);
  });
  React.useEffect(()=>{
    if(quote?.lines?.length){
      setLineSelections(new Set(quote.lines.map((_,i)=>i)));
    }
  }, [quote?.id, quote?.lines]); // reset if quotation changes

  // Header / party / cargo details
  const [form, setForm] = React.useState(()=>{
    const today = new Date().toISOString().slice(0,10);
    return {
      customer: quote?.customer || '',
      quotationId: quotationId || '',
      mode: quote?.mode || '',
      incoterm: quote?.incoterm || 'DAP',
      scope: 'CY_CY',
      displayOrigin: quote?.displayOrigin || quote?.origin || '',
      displayDestination: quote?.displayDestination || quote?.destination || '',
      shipperName: '', consigneeName: '', notifyName: '',
      pickupAddress: '', deliveryAddress: '',
      cargoDesc: '', hsCode: '', pkgs: 1, weightKg: '', volumeM3: '',
      readyDate: today, etdPreferred: today, etaPreferred: today,
      customerRef: '', internalRef: '',
      notes: '',
    };
  });

  // Snackbar
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });

  // totals from selected lines
  const totals = React.useMemo(()=>{
    if(!quote?.lines?.length) return { sell:0, margin:0, ros:0, count:0 };
    const sel = [...lineSelections].map(i => quote.lines[i]).filter(Boolean);
    const sell = sel.reduce((s,l)=> s + ((l.sell - (l.discount||0)) * (l.qty||1)), 0);
    const margin = sel.reduce((s,l)=> s + ((l.margin - (l.discount||0)) * (l.qty||1)), 0);
    const ros = sell ? (margin / sell) * 100 : 0;
    return { sell, margin, ros, count: sel.length };
  }, [quote, lineSelections]);

  function update(k,v){ setForm(f=> ({ ...f, [k]: v })); }

  function toggleLine(idx){
    setLineSelections(s=> {
      const n = new Set(s);
      if(n.has(idx)) n.delete(idx); else n.add(idx);
      return n;
    });
  }

  function validate(){
    const errs = [];
    if(!form.customer) errs.push('Customer');
    if(!form.displayOrigin) errs.push('Origin');
    if(!form.displayDestination) errs.push('Destination');
    if(lineSelections.size===0) errs.push('At least one quotation line');
    return errs;
  }

  function buildPayload(status){
    const selectedLines = [...lineSelections].map(i => quote.lines[i]).filter(Boolean);
    return {
      id: nextBookingId(),
      status,                        // DRAFT | REQUESTED | CONFIRMED (future)
      createdAt: new Date().toISOString(),
      quotationId: quotationId || null,
      customer: form.customer,
      mode: form.mode,
      incoterm: form.incoterm,
      scope: form.scope,
      displayOrigin: form.displayOrigin,
      displayDestination: form.displayDestination,
      parties: {
        shipper: form.shipperName,
        consignee: form.consigneeName,
        notify: form.notifyName
      },
      locations: {
        pickupAddress: form.pickupAddress || null,
        deliveryAddress: form.deliveryAddress || null
      },
      cargo: {
        description: form.cargoDesc,
        hsCode: form.hsCode,
        packages: Number(form.pkgs)||1,
        weightKg: Number(form.weightKg)||0,
        volumeM3: Number(form.volumeM3)||0
      },
      dates: {
        readyDate: form.readyDate || null,
        etdPreferred: form.etdPreferred || null,
        etaPreferred: form.etaPreferred || null
      },
      references: {
        customerRef: form.customerRef || null,
        internalRef: form.internalRef || null
      },
      notes: form.notes || '',
      // keep the line↔rate linkage
      lines: selectedLines.map((l,idx)=>({
        idx,
        rateId: l.rateId || l.id || null,
        vendor: l.vendor || null,
        carrier: l.carrier || null,
        lane: `${l.origin || l.pol || ''} → ${l.destination || l.pod || ''}`,
        unit: l.containerType || l.basis || l.unit || '',
        qty: Number(l.qty)||1,
        sell: Number(l.sell)||0,
        discount: Number(l.discount||0)||0,
        margin: Number(l.margin)||0,
        ros: (()=>{ const effSell=(l.sell-(l.discount||0)); return effSell? ((l.margin-(l.discount||0))/effSell)*100 : 0; })(),
      })),
      totals: {
        sell: Number(totals.sell.toFixed(2)),
        margin: Number(totals.margin.toFixed(2)),
        ros: Number(totals.ros.toFixed(1))
      }
    };
  }

  function doSave(status){
    const missing = validate();
    if(missing.length){
      setSnack({ open:true, ok:false, msg:`Please fill: ${missing.join(', ')}` });
      return;
    }
    const payload = buildPayload(status);
    const list = parseJSON('bookings', []);
    list.unshift(payload);
    saveBookings(list);
    setSnack({ open:true, ok:true, msg: status==='REQUESTED' ? `Booking request submitted (${payload.id}).` : `Draft saved (${payload.id}).` });
    // navigate to booking list or detail route if you have one
    setTimeout(()=> navigate('/bookings'), 600);
  }

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={()=>navigate(-1)} size="small" color="inherit">Back</Button>
          <Typography variant="h6">Create Booking</Typography>
        </Box>
        {quotationId && <Chip size="small" label={`Quotation: ${quotationId}`} />}
      </Box>

      {/* Quotation lines to select */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Select Quotation Lines" subheader={quote ? `${quote.customer || ''} • ${quote.mode || ''}` : 'No quotation loaded — you can still create an ad-hoc booking.'} />
        <CardContent>
          {!quote?.lines?.length && <Typography variant="body2" color="text.secondary">No lines on this quotation. You can still fill booking details below and submit a request.</Typography>}
          {!!quote?.lines?.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={48}></TableCell>
                  <TableCell>Lane</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Discount</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                  <TableCell>Rate ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quote.lines.map((l,idx)=>{
                  const effSell = (l.sell-(l.discount||0));
                  const effMargin = (l.margin-(l.discount||0));
                  const ros = effSell ? (effMargin/effSell)*100 : 0;
                  return (
                    <TableRow key={idx} hover selected={lineSelections.has(idx)}>
                      <TableCell>
                        <Checkbox size="small" checked={lineSelections.has(idx)} onChange={()=>toggleLine(idx)} />
                      </TableCell>
                      <TableCell>{(l.origin||l.pol||'—')} → {(l.destination||l.pod||'—')}</TableCell>
                      <TableCell>{l.containerType || l.basis || l.unit || '—'}</TableCell>
                      <TableCell align="center">{l.qty||1}</TableCell>
                      <TableCell align="right">{effSell.toFixed(2)}</TableCell>
                      <TableCell align="right">{(l.discount||0).toFixed(2)}</TableCell>
                      <TableCell align="right">{effMargin.toFixed(2)}</TableCell>
                      <TableCell align="center">{rosChip(ros)}</TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{l.rateId || l.id || '—'}</Typography></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Box mt={2} display="flex" justifyContent="space-between" flexWrap="wrap" rowGap={1} columnGap={2}>
            <Typography variant="body2" color="text.secondary">Selected: <strong>{totals.count}</strong> line(s)</Typography>
            <Box display="flex" gap={3} fontSize={14}>
              <span>Total Sell: <strong>{totals.sell.toFixed(2)}</strong></span>
              <span>Total Margin: <strong>{totals.margin.toFixed(2)}</strong></span>
              <span>Total ROS: <strong>{totals.ros.toFixed(1)}%</strong></span>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Booking details */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Booking Details" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField size="small" label="Customer" value={form.customer} onChange={e=>update('customer', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" label="Mode" value={form.mode} onChange={e=>update('mode', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" label="Incoterm" value={form.incoterm} onChange={e=>update('incoterm', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Service Scope</InputLabel>
                <Select label="Service Scope" value={form.scope} onChange={e=>update('scope', e.target.value)}>
                  {SCOPE_OPTIONS.map(o=> <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="Display Origin (door/port)" value={form.displayOrigin} onChange={e=>update('displayOrigin', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="Display Destination (door/port)" value={form.displayDestination} onChange={e=>update('displayDestination', e.target.value)} fullWidth /></Grid>

            <Grid item xs={12}><Divider /></Grid>

            <Grid item xs={12} md={4}><TextField size="small" label="Shipper" value={form.shipperName} onChange={e=>update('shipperName', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="Consignee" value={form.consigneeName} onChange={e=>update('consigneeName', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="Notify Party" value={form.notifyName} onChange={e=>update('notifyName', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="Pickup Address (if Door)" value={form.pickupAddress} onChange={e=>update('pickupAddress', e.target.value)} fullWidth multiline minRows={2} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="Delivery Address (if Door)" value={form.deliveryAddress} onChange={e=>update('deliveryAddress', e.target.value)} fullWidth multiline minRows={2} /></Grid>

            <Grid item xs={12}><Divider /></Grid>

            <Grid item xs={12} md={4}><TextField size="small" label="Cargo Description" value={form.cargoDesc} onChange={e=>update('cargoDesc', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" label="HS Code" value={form.hsCode} onChange={e=>update('hsCode', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" type="number" label="Packages" value={form.pkgs} onChange={e=>update('pkgs', e.target.value)} fullWidth inputProps={{ min:1 }} /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" type="number" label="Weight (kg)" value={form.weightKg} onChange={e=>update('weightKg', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" type="number" label="Volume (m³)" value={form.volumeM3} onChange={e=>update('volumeM3', e.target.value)} fullWidth /></Grid>

            <Grid item xs={12}><Divider /></Grid>

            <Grid item xs={6} md={3}><TextField size="small" type="date" label="Cargo Ready" InputLabelProps={{ shrink:true }} value={form.readyDate} onChange={e=>update('readyDate', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} md={3}><TextField size="small" type="date" label="Preferred ETD" InputLabelProps={{ shrink:true }} value={form.etdPreferred} onChange={e=>update('etdPreferred', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} md={3}><TextField size="small" type="date" label="Preferred ETA" InputLabelProps={{ shrink:true }} value={form.etaPreferred} onChange={e=>update('etaPreferred', e.target.value)} fullWidth /></Grid>

            <Grid item xs={12}><Divider /></Grid>

            <Grid item xs={12} md={6}><TextField size="small" label="Customer Reference / PO" value={form.customerRef} onChange={e=>update('customerRef', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="Internal Ref" value={form.internalRef} onChange={e=>update('internalRef', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12}><TextField size="small" label="Notes" value={form.notes} onChange={e=>update('notes', e.target.value)} fullWidth multiline minRows={2} /></Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Actions */}
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button onClick={()=>navigate(-1)} color="inherit">Cancel</Button>
        <Button variant="outlined" onClick={()=>doSave('DRAFT')}>Save Draft</Button>
        <Button variant="contained" onClick={()=>doSave('REQUESTED')} disabled={lineSelections.size===0}>Submit Booking Request</Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}