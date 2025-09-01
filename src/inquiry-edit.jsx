import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { Box, Typography, IconButton, Button, TextField, Select, MenuItem, FormControl, InputLabel, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip, Snackbar, Alert, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, Autocomplete } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const MODES = ['Sea FCL','Sea LCL','Air','Transport','Customs'];
const STATUSES = ['Draft','Sourcing','Quoting','Priced','Quoted','Won','Lost'];
function genQuotationNo(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const t = String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+String(d.getSeconds()).padStart(2,'0');
  return `QTN-${y}${m}${day}-${t}`;
}
function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function saveQuotations(rows){ try{ localStorage.setItem('quotations', JSON.stringify(rows)); }catch(e){ console.error(e); } }

function ROSChip({ value }){ const color = value>=20? 'success': value>=12? 'warning':'error'; return <Chip size="small" color={color} label={value.toFixed(1)+'%'} variant={value>=20?'filled':'outlined'} />; }

export default function InquiryEdit(){
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [snack,setSnack] = React.useState({ open:false, ok:true, msg:'' });
  const [original, setOriginal] = React.useState(null);
  const [inq, setInq] = React.useState(null);
  const [reqOpen, setReqOpen] = React.useState(false);
  const [urgency, setUrgency] = React.useState('Normal');
  const [remarks, setRemarks] = React.useState('');
  const [showAllVersions, setShowAllVersions] = React.useState(false);

  React.useEffect(()=>{
    try {
      const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      const found = list.find(x=>x.id===id);
      if(found){
        const processed = {
          ...found,
          // Coerce owner to simple username string if stored as object
          owner: typeof found.owner === 'object' && found.owner ? (found.owner.username || found.owner.display || '') : (found.owner || ''),
          // Default all checkboxes UNSELECTED unless explicitly stored as true
          lines: (found.lines||[]).map(l=> ({ ...l, _selected: l._selected === true }))
        };
        setOriginal(processed);
        setInq(JSON.parse(JSON.stringify(processed)));
      }
    } catch(err){ console.error(err); }
  }, [id]);

  // Live reload when another screen (pricing publish) updates inquiry in storage
  React.useEffect(()=>{
    function reload(){
      try {
        const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
        const fresh = list.find(x=>x.id===id);
        if(!fresh) return;
        // Merge selection flags with new data
        setInq(curr => {
          if(!curr) return curr;
          const merged = {
            ...fresh,
            lines: (fresh.lines||[]).map(fl=>{
              const prev = curr.lines?.find(pl=> pl.rateId===fl.rateId || pl.id===fl.id);
              return { ...fl, _selected: prev? prev._selected === true : false };
            })
          };
          // Only update if something actually changed
          if(JSON.stringify(curr.lines?.map(l=>({ ...l, _selected:undefined }))) !== JSON.stringify(merged.lines.map(l=>({ ...l, _selected:undefined })))){
            return merged;
          }
          return curr;
        });
  } catch{ /* ignore */ }
    }
    window.addEventListener('focus', reload);
    window.addEventListener('storage', reload);
    return ()=>{ window.removeEventListener('focus', reload); window.removeEventListener('storage', reload); };
  }, [id]);

  function updateHeader(patch){ setInq(i=> ({ ...i, ...patch })); }
  function updateLine(idx, patch){ setInq(i=> ({ ...i, lines: i.lines.map((l,i2)=> i2===idx? { ...l, ...patch }: l ) })); }

  const totals = React.useMemo(()=>{
    if(!inq?.lines) return { sell:0, margin:0, ros:0 };
    const visibleLines = (inq.lines||[]).filter(l=> showAllVersions? true : (l.active!==false));
    const sell = visibleLines.reduce((s,l)=> s + (l.sell - (l.discount||0)) * (l.qty||1),0);
    const margin = visibleLines.reduce((s,l)=> s + (l.margin - (l.discount||0)) * (l.qty||1),0);
    const ros = sell? (margin/sell)*100:0; return { sell, margin, ros };
  }, [inq, showAllVersions]);

  function logAudit(action, before, after) {
    try {
      const logs = JSON.parse(localStorage.getItem('auditTrail')||'[]');
      logs.unshift({
        ts: new Date().toISOString(),
        user: user?.username || 'unknown',
        action,
        inquiryId: inq?.id,
        before,
        after
      });
      localStorage.setItem('auditTrail', JSON.stringify(logs.slice(0,1000)));
  } catch { /* ignore */ }
  }

  function save(){
    try {
      const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      const idx = list.findIndex(x=>x.id===inq.id);
      if(idx>=0){ 
        const before = JSON.parse(JSON.stringify(list[idx]));
        list[idx] = inq; 
        localStorage.setItem('savedInquiries', JSON.stringify(list)); 
        setSnack({ open:true, ok:true, msg:'Inquiry saved.' }); 
        setOriginal(JSON.parse(JSON.stringify(inq)));
        logAudit('update', before, inq);
      }
      else { 
        list.unshift(inq); 
        localStorage.setItem('savedInquiries', JSON.stringify(list)); 
        setSnack({ open:true, ok:true, msg:'Inquiry created.' });
        logAudit('create', null, inq);
      }
    } catch(err){ console.error(err); setSnack({ open:true, ok:false, msg:'Failed to save.' }); }
  }

  function submitRequest(){
    if(!inq) return;
  const selected = inq.lines?.filter(l=>l._selected) || [];
    if(!selected.length){ setSnack({ open:true, ok:false, msg:'No lines to request.' }); return; }
    const base = Date.now().toString(36).toUpperCase();
    const createdAt = new Date().toISOString();
    const requests = selected.map((l, idx)=>{
      const effSell = l.sell - (l.discount||0);
      const effMargin = l.margin - (l.discount||0);
      const rosVal = effSell? (effMargin/effSell)*100:0;
      return {
        type: 'rateImprovementRequest',
        id: `REQ-${base}-${(idx+1).toString().padStart(2,'0')}`,
        inquiryId: inq.id,
        customer: inq.customer,
        owner: inq.owner,
        status: 'NEW',
        createdAt,
        urgency,
        remarks,
        rosTarget: inq.rosTarget,
        inquirySnapshot: { origin: inq.origin, destination: inq.destination, notes: inq.notes },
        totals: { sell: effSell, margin: effMargin, ros: rosVal },
        lines: [{
          id: l.rateId || l.id,
            inquiryId: inq.id,
            origin: l.origin,
            destination: l.destination,
            basis: l.basis || l.containerType,
            containerType: l.containerType,
            // Use procuredVendor if present (latest active vendor), fallback to original vendor
            vendor: l.procuredVendor || l.vendor,
            carrier: l.carrier,
            qty: l.qty,
            sell: l.sell,
            discount: l.discount || 0,
            margin: l.margin,
            ros: rosVal,
            status: 'NEW',
            chosenVendor: '',
            chosenPrice: null,
            note: ''
        }]
      };
    });
    try {
      const existing = JSON.parse(localStorage.getItem('rateRequests')||'[]');
      localStorage.setItem('rateRequests', JSON.stringify([...requests, ...existing]));
    } catch(err){ console.error('Persist rateRequests failed', err); }
    setReqOpen(false);
    setSnack({ open:true, ok:true, msg:`Created ${requests.length} request${requests.length!==1?'s':''}.` });
    if(requests[0]) setTimeout(()=> navigate(`/pricing/request/${requests[0].id}`), 350);
  }
  function createQuotation(){
    if(!inq) return;
    // Update inquiry status to Quoting and persist
    const updatedInquiry = { ...inq, status:'Quoting' };
    try {
      const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      const idx = list.findIndex(x=>x.id===updatedInquiry.id);
      if(idx>=0){ list[idx]=updatedInquiry; localStorage.setItem('savedInquiries', JSON.stringify(list)); }
      setInq(updatedInquiry); setOriginal(JSON.parse(JSON.stringify(updatedInquiry)));
    } catch(err){ console.error(err); }
    // Build quotation payload
    const qNo = genQuotationNo();
    const selected = updatedInquiry.lines?.filter(l=> l._selected) || [];
    const baseLines = (selected.length? selected : (updatedInquiry.lines||[]).filter(l=> l.active!==false));
    const quotation = {
      id: qNo,
      inquiryId: updatedInquiry.id,
      customer: updatedInquiry.customer || '',
      mode: updatedInquiry.mode || '',
      incoterm: updatedInquiry.incoterm || '',
      salesOwner: updatedInquiry.owner || '',
      currency: updatedInquiry.currency || 'USD',
      validFrom: new Date().toISOString().slice(0,10),
      validTo: updatedInquiry.validityTo || '',
      notes: updatedInquiry.notes || '',
      status: 'Draft',
      lines: baseLines.map(l=> ({
        rateId: l.rateId || l.id,
        vendor: l.procuredVendor || l.vendor || '',
        carrier: l.carrier || '',
        origin: l.origin,
        destination: l.destination,
        unit: l.containerType || l.basis || '—',
        qty: l.qty || 1,
        sell: Number(l.sell)||0,
        discount: Number(l.discount)||0,
        margin: Number(l.margin)||0,
      })),
      costLines: [],
    };
    try {
      const qs = loadQuotations();
      qs.unshift(quotation);
      saveQuotations(qs);
    } catch(err){ console.error(err); }
    setSnack({ open:true, ok:true, msg:`Created quotation ${qNo}` });
    // Navigate after short delay so snackbar visible
    setTimeout(()=> navigate(`/quotations/${qNo}`, { state:{ fromInquiryId: updatedInquiry.id } }), 300);
  }
  if(!inq) return <Box p={2}><IconButton size="small" onClick={()=>navigate(-1)}><ArrowBackIcon fontSize="inherit"/></IconButton><Typography mt={2} variant="body2" color="text.secondary">Inquiry not found.</Typography></Box>;

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={()=>navigate(-1)} size="small"><ArrowBackIcon fontSize="inherit" /></IconButton>
          <Typography variant="h6">Edit Inquiry {inq.id}</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={()=> original && setInq(JSON.parse(JSON.stringify(original)))} disabled={!original || JSON.stringify(original)===JSON.stringify(inq)}>Reset</Button>
          <Button variant="contained" onClick={save} disabled={!inq.customer}>Save</Button>
          <Button variant="outlined" color="warning" onClick={()=>setReqOpen(true)} disabled={!inq.lines || !inq.lines.length}>Request Better Rate (1 per line)</Button>
          <Button variant="contained" color="secondary" onClick={createQuotation} disabled={!inq.customer || !inq.lines?.length}>Create Quotation</Button>
        </Box>
      </Box>
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Header" />
        <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <TextField size="small" label="Customer" value={inq.customer||''} onChange={e=>updateHeader({ customer:e.target.value })} sx={{ minWidth:220 }}/>
            <Autocomplete
              size="small"
              options={(user && user.USERS ? user.USERS.filter(u=>u.role==='Sales') : []).map(u=>u.username)}
              value={inq.owner||''}
              onChange={(_,v)=>updateHeader({ owner:v })}
              renderInput={(params)=><TextField {...params} label="Sales Owner" sx={{ minWidth:160 }}/>} 
              isOptionEqualToValue={(option, value) => option === value}
            />
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
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell>Rate ID</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Buy</TableCell>
                  <TableCell>Carrier</TableCell>
                  <TableCell>OD</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                    {showAllVersions && <TableCell>Effective</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {(inq.lines.filter(l=> showAllVersions? true : (l.active!==false))).map((l,idx)=>{ const effSell = Number(l.sell)||0; const effMargin = Number(l.margin)||0; const ros = effSell? (effMargin/effSell)*100:0; const improved = l.rateHistory && l.rateHistory.length>0; const buy = l.currentBuy!=null? Number(l.currentBuy) : (effSell - effMargin); const inactive = l.active===false; return (
                  <TableRow key={l.rateId} hover selected={!!l._selected} sx={inactive?{ opacity:0.5 }:{}}>
                    <TableCell padding="checkbox"><Checkbox size="small" checked={!!l._selected} onChange={()=>updateLine(idx,{ _selected: !l._selected })} /></TableCell>
                    <TableCell>{l.rateId}{l.parentRateId && <Typography variant="caption" component="div" color="text.secondary">ver of {l.parentRateId}</Typography>}</TableCell>
                    <TableCell>
                      {l.procuredVendor || l.vendor}
                      {l.procuredVendor && l.procuredVendor!==l.vendor && (
                        <Typography component="span" variant="caption" color="text.secondary"> (was {l.vendor})</Typography>
                      )}
                      {improved && <Chip size="small" color={inactive? 'default':'success'} label={inactive? 'History':'Improved'} sx={{ ml:0.5 }} />}
                    </TableCell>
                    <TableCell align="right">{buy.toFixed(2)}</TableCell>
                    <TableCell>{l.carrier}</TableCell>
                    <TableCell>{l.origin} → {l.destination}</TableCell>
                    <TableCell>{l.containerType || l.basis}</TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={l.qty} onChange={e=>updateLine(idx,{ qty:Number(e.target.value||1) })} inputProps={{ min:1 }} sx={{ width:70 }}/></TableCell>
                    <TableCell align="right">{effSell.toFixed(2)}</TableCell>
                    <TableCell align="right">{effMargin.toFixed(2)}</TableCell>
                    <TableCell align="center"><ROSChip value={ros} /></TableCell>
                    {showAllVersions && <TableCell><Typography variant="caption" display="block">{l.effectiveFrom? new Date(l.effectiveFrom).toLocaleDateString(): '-'}</Typography><Typography variant="caption" color="text.secondary">{l.effectiveTo? '→ '+new Date(l.effectiveTo).toLocaleDateString(): ''}</Typography></TableCell>}
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          )}
          {inq.lines?.some(l=> l.active===false) && <Box mt={1}><Button size="small" onClick={()=>setShowAllVersions(s=>!s)}>{showAllVersions? 'Hide History Versions':'Show History Versions'}</Button></Box>}
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
          <Box mt={2}><Typography variant="caption" color="text.secondary">Selected: {inq.lines?.filter(l=>l._selected).length || 0} / {inq.lines?.length||0} • Sell {totals.sell.toFixed(2)} • ROS {totals.ros.toFixed(1)}%</Typography></Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setReqOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" disabled={!inq.lines?.some(l=>l._selected)} onClick={submitRequest}>Submit</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
      <Dialog open={reqOpen} onClose={()=>setReqOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Better Rate</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>Creates one separate rate improvement request for each line.</Typography>
          <FormControl size="small" fullWidth sx={{ mb:2 }}>
            <InputLabel>Urgency</InputLabel>
            <Select label="Urgency" value={urgency} onChange={e=>setUrgency(e.target.value)}>{['Low','Normal','High','Critical'].map(u=> <MenuItem key={u} value={u}>{u}</MenuItem>)}</Select>
          </FormControl>
          <TextField label="Remarks / Justification" multiline minRows={3} fullWidth value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Customer pushing for better rate on lane(s)." />
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
