import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button, TextField, Select, MenuItem, FormControl, InputLabel, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip, Snackbar, Alert, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const MODES = ['Sea FCL','Sea LCL','Air','Transport','Customs'];
const STATUSES = ['Draft','Sourcing','Priced','Quoted','Won','Lost'];

function ROSChip({ value }){ const color = value>=20? 'success': value>=12? 'warning':'error'; return <Chip size="small" color={color} label={value.toFixed(1)+'%'} variant={value>=20?'filled':'outlined'} />; }

export default function InquiryEdit(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [snack,setSnack] = React.useState({ open:false, ok:true, msg:'' });
  const [original, setOriginal] = React.useState(null);
  const [inq, setInq] = React.useState(null);
  const [reqOpen, setReqOpen] = React.useState(false);
  const [urgency, setUrgency] = React.useState('Normal');
  const [remarks, setRemarks] = React.useState('');

  React.useEffect(()=>{
    try {
      const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      const found = list.find(x=>x.id===id);
      if(found){
        setOriginal(found);
        // Deep clone simple
        setInq(JSON.parse(JSON.stringify(found)));
      }
    } catch(err){ console.error(err); }
  }, [id]);

  function updateHeader(patch){ setInq(i=> ({ ...i, ...patch })); }
  function updateLine(idx, patch){ setInq(i=> ({ ...i, lines: i.lines.map((l,i2)=> i2===idx? { ...l, ...patch }: l ) })); }

  const totals = React.useMemo(()=>{
    if(!inq?.lines) return { sell:0, margin:0, ros:0 };
    const sell = inq.lines.reduce((s,l)=> s + (l.sell - (l.discount||0)) * (l.qty||1),0);
    const margin = inq.lines.reduce((s,l)=> s + (l.margin - (l.discount||0)) * (l.qty||1),0);
    const ros = sell? (margin/sell)*100:0; return { sell, margin, ros };
  }, [inq]);

  function save(){
    try {
      const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      const idx = list.findIndex(x=>x.id===inq.id);
      if(idx>=0){ list[idx] = inq; localStorage.setItem('savedInquiries', JSON.stringify(list)); setSnack({ open:true, ok:true, msg:'Inquiry saved.' }); setOriginal(JSON.parse(JSON.stringify(inq))); }
      else { list.unshift(inq); localStorage.setItem('savedInquiries', JSON.stringify(list)); setSnack({ open:true, ok:true, msg:'Inquiry created.' }); }
    } catch(err){ console.error(err); setSnack({ open:true, ok:false, msg:'Failed to save.' }); }
  }

  function submitRequest(){
    if(!inq) return;
    const selected = inq.lines?.length? inq.lines : [];
    const reqId = `REQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const payload = {
      type: 'rateImprovementRequest',
      id: reqId,
      inquiryId: inq.id,
      customer: inq.customer,
      owner: inq.owner,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      urgency,
      remarks,
      rosTarget: inq.rosTarget,
      totals: totals,
      // Copy lines 1:1 from inquiry lines (preserve as much detail as possible) and stamp inquiryId on each line
      lines: selected.map(l=> ({
        inquiryId: inq.id,
        id: l.rateId || l.id,
        rateId: l.rateId || l.id,
        origin: l.origin,
        destination: l.destination,
        basis: l.basis || l.containerType,
        containerType: l.containerType,
        vendor: l.vendor,
        carrier: l.carrier,
        qty: l.qty,
        sell: l.sell,
        discount: l.discount || 0,
        margin: l.margin,
        ros: l.sell ? ((l.margin - (l.discount||0)) / (l.sell - (l.discount||0))) * 100 : 0
      })),
      lineCount: selected.length,
      inquirySnapshot: { origin: inq.origin, destination: inq.destination, notes: inq.notes }
    };
    try {
      const list = JSON.parse(localStorage.getItem('rateRequests')||'[]');
      localStorage.setItem('rateRequests', JSON.stringify([payload, ...list]));
    } catch(err){ console.error('Persist rateRequests failed', err); }
    setReqOpen(false);
    setSnack({ open:true, ok:true, msg:`Request ${reqId} created (${selected.length} line${selected.length!==1?'s':''}).` });
    console.log('rateImprovementRequest', payload);
    // Navigate to pricing request detail after short delay so snackbar shows (optional)
    setTimeout(()=> navigate(`/pricing/request/${reqId}`), 300);
  }

  if(!inq) return <Box p={2}><IconButton size="small" onClick={()=>navigate(-1)}><ArrowBackIcon fontSize="inherit"/></IconButton><Typography variant="body2" color="text.secondary" mt={2}>Inquiry not found in local storage.</Typography></Box>;

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={()=>navigate(-1)} size="small"><ArrowBackIcon fontSize="inherit" /></IconButton>
          <Typography variant="h6">Edit Inquiry {inq.id}</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={()=>setInq(JSON.parse(JSON.stringify(original)))} disabled={!original || JSON.stringify(original)===JSON.stringify(inq)}>Reset</Button>
          <Button variant="contained" onClick={save} disabled={!inq.customer}>Save</Button>
          <Button variant="outlined" color="warning" onClick={()=>setReqOpen(true)} disabled={!inq.lines || !inq.lines.length}>Request Better Rate</Button>
        </Box>
      </Box>
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Header" />
        <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <TextField size="small" label="Customer" value={inq.customer||''} onChange={e=>updateHeader({ customer:e.target.value })} sx={{ minWidth:220 }}/>
            <TextField size="small" label="Owner" value={inq.owner||''} onChange={e=>updateHeader({ owner:e.target.value })} sx={{ minWidth:160 }}/>
            <FormControl size="small" sx={{ minWidth:140 }}><InputLabel>Mode</InputLabel><Select label="Mode" value={inq.mode} onChange={e=>updateHeader({ mode:e.target.value })}>{MODES.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl>
            <TextField size="small" label="Incoterm" value={inq.incoterm||''} onChange={e=>updateHeader({ incoterm:e.target.value })} sx={{ width:100 }}/>
            <TextField size="small" type="number" label="ROS Target %" value={inq.rosTarget||0} onChange={e=>updateHeader({ rosTarget:Number(e.target.value||0) })} sx={{ width:120 }}/>
            <FormControl size="small" sx={{ minWidth:140 }}><InputLabel>Status</InputLabel><Select label="Status" value={inq.status} onChange={e=>updateHeader({ status:e.target.value })}>{STATUSES.map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            <TextField size="small" type="date" label="Valid To" InputLabelProps={{ shrink:true }} value={inq.validityTo||''} onChange={e=>updateHeader({ validityTo:e.target.value })} sx={{ width:160 }}/>
          </Box>
          <TextField size="small" label="Notes" value={inq.notes||''} onChange={e=>updateHeader({ notes:e.target.value })} fullWidth multiline minRows={2} />
          <Divider />
          <Box display="flex" gap={3} flexWrap="wrap" fontSize={14}>
            <span>Sell: <strong>{totals.sell.toFixed(2)}</strong></span>
            <span>Margin: <strong>{totals.margin.toFixed(2)}</strong></span>
            <span>ROS: <strong>{totals.ros.toFixed(1)}%</strong></span>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Lines" />
        <CardContent sx={{ pt:0 }}>
          {!inq.lines?.length && <Typography variant="caption" color="text.secondary">No line items captured for this inquiry.</Typography>}
          {!!inq.lines?.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rate ID</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Carrier</TableCell>
                  <TableCell>OD</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Discount</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inq.lines.map((l,idx)=>{ const effSell = l.sell - (l.discount||0); const effMargin = l.margin - (l.discount||0); const ros = effSell? (effMargin/effSell)*100:0; return (
                  <TableRow key={l.rateId} hover>
                    <TableCell>{l.rateId}</TableCell>
                    <TableCell>{l.vendor}</TableCell>
                    <TableCell>{l.carrier}</TableCell>
                    <TableCell>{l.origin} → {l.destination}</TableCell>
                    <TableCell>{l.containerType || l.basis}</TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={l.qty} onChange={e=>updateLine(idx,{ qty:Number(e.target.value||1) })} inputProps={{ min:1 }} sx={{ width:70 }}/></TableCell>
                    <TableCell align="right">{effSell.toFixed(2)}</TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={l.discount||0} onChange={e=>updateLine(idx,{ discount:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:80 }}/></TableCell>
                    <TableCell align="right">{effMargin.toFixed(2)}</TableCell>
                    <TableCell align="center"><ROSChip value={ros} /></TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
      <Dialog open={reqOpen} onClose={()=>setReqOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Better Rate</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>Send a request to Procurement/Pricing for improved buy or margin for this inquiry.</Typography>
          <FormControl size="small" fullWidth sx={{ mb:2 }}>
            <InputLabel>Urgency</InputLabel>
            <Select label="Urgency" value={urgency} onChange={e=>setUrgency(e.target.value)}>{['Low','Normal','High','Critical'].map(u=> <MenuItem key={u} value={u}>{u}</MenuItem>)}</Select>
          </FormControl>
            <TextField label="Remarks / Justification" multiline minRows={3} fullWidth value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Customer pushing for better rate on lane(s); target +2% ROS." />
          <Box mt={2}><Typography variant="caption" color="text.secondary">Lines: {inq.lines?.length||0} • Sell {totals.sell.toFixed(2)} • ROS {totals.ros.toFixed(1)}%</Typography></Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setReqOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" disabled={!inq.lines?.length} onClick={submitRequest}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
