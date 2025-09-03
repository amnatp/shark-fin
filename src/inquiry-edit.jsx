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
  const [requestTarget, setRequestTarget] = React.useState(''); // customer target price for request
  const [showAllVersions, setShowAllVersions] = React.useState(false);

  React.useEffect(()=>{
    try {
      const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      const found = list.find(x=>x.id===id);
      if(found){
        // Backward compatibility: promote legacy rosTarget to customerTargetPrice
        if(found.customerTargetPrice == null && found.rosTarget != null) {
          found.customerTargetPrice = found.rosTarget;
        }
        const processed = {
          ...found,
          createdAt: found.createdAt || new Date().toISOString(), // ensure creation timestamp for SLA tracking
          // Coerce owner to simple username string if stored as object
          owner: typeof found.owner === 'object' && found.owner ? (found.owner.username || found.owner.display || '') : (found.owner || ''),
          // Default all checkboxes UNSELECTED unless explicitly stored as true
          lines: (found.lines||[]).map(l=> ({ ...l, _selected: l._selected === true }))
        };
        setOriginal(processed);
        setInq(JSON.parse(JSON.stringify(processed)));
        // Seed request target input with any stored value
        if(found.customerTargetPrice != null) setRequestTarget(String(found.customerTargetPrice));
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
  const sell = visibleLines.reduce((s,l)=> s + (Number(l.sell)||0) * (Number(l.qty)||1),0);
  const margin = visibleLines.reduce((s,l)=> s + (Number(l.margin)||0) * (Number(l.qty)||1),0);
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
  list.unshift({ ...inq, createdAt: inq.createdAt || new Date().toISOString() }); 
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
    const createdAt = new Date().toISOString();
    // Generate sequential request id(s) in format REQ-YYMM-#### (running per month)
    function nextRequestIds(count){
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth()+1).padStart(2,'0');
      const prefix = `REQ-${yy}${mm}`;
      let existing = [];
      try {
        existing = JSON.parse(localStorage.getItem('rateRequests')||'[]').map(r=>r.id).filter(id=> typeof id === 'string' && id.startsWith(prefix+'-'));
      } catch {/* ignore */}
      let maxSeq = 0;
      existing.forEach(id=>{ const m = id.match(/^(REQ-\d{4})-(\d{4})$/); if(m){ const n = Number(m[2]); if(n>maxSeq) maxSeq = n; }});
      const ids = [];
      for(let i=1;i<=count;i++){
        const seq = (maxSeq + i).toString().padStart(4,'0');
        ids.push(`${prefix}-${seq}`);
      }
      return ids;
    }
    const newIds = nextRequestIds(selected.length);
  const desiredTarget = Number(requestTarget);
  const requests = selected.map((l, idx)=>{
  const effSell = Number(l.sell)||0;
  const effMargin = Number(l.margin)||0;
      const rosVal = effSell? (effMargin/effSell)*100:0;
      return {
        type: 'rateImprovementRequest',
        id: newIds[idx],
        inquiryId: inq.id,
        customer: inq.customer,
        owner: inq.owner,
        status: 'NEW',
        createdAt,
        urgency,
        remarks,
    rosTarget: isNaN(desiredTarget)? null : desiredTarget,
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
            // discount removed
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
      // Persist inquiry status to Sourcing and optional target price
      setInq(curr => ({ ...curr, status:'Sourcing', customerTargetPrice: !isNaN(desiredTarget)? desiredTarget : curr.customerTargetPrice }));
      try {
        const inqList = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
        const idx = inqList.findIndex(x=>x.id===inq.id);
        if(idx>=0){
          inqList[idx] = { 
            ...inqList[idx], 
            status: 'Sourcing',
            customerTargetPrice: !isNaN(desiredTarget)? desiredTarget : inqList[idx].customerTargetPrice
          }; 
          localStorage.setItem('savedInquiries', JSON.stringify(inqList));
        }
      } catch {/* ignore */}
    } catch(err){ console.error('Persist rateRequests failed', err); }
    setReqOpen(false);
  setSnack({ open:true, ok:true, msg:`Created ${requests.length} request${requests.length!==1?'s':''}.` });
  // Stay on inquiry edit screen (navigation removed per requirement)
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
  // discount removed
        margin: Number(l.margin)||0,
      })),
      costLines: [],
  // SLA tracking placeholders (filled on submit): source inquiry createdAt is stored on inquiry
  createdFromInquiryAt: updatedInquiry.createdAt || null,
  quotationCreatedAt: new Date().toISOString(),
  slaHours: null,
  slaMet: null,
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
          <Button variant="outlined" color="warning" onClick={()=>setReqOpen(true)} disabled={!inq.lines || !inq.lines.length || inq.status!=='Draft'}>Need Better Rate</Button>
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
            {/* Customer Target Price field removed */}
            <FormControl size="small" sx={{ minWidth:140 }}><InputLabel>Status</InputLabel><Select label="Status" value={inq.status} onChange={e=>updateHeader({ status:e.target.value })}>{STATUSES.map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            <TextField size="small" type="date" label="Cargo Ready" InputLabelProps={{ shrink:true }} value={inq.cargoReadyDate||''} onChange={e=>updateHeader({ cargoReadyDate:e.target.value })} sx={{ width:160 }}/>
            {/* Valid To field removed */}
          </Box>
          <TextField size="small" label="Notes" value={inq.notes||''} onChange={e=>updateHeader({ notes:e.target.value })} fullWidth multiline minRows={2} />
          <Divider />
          <Box display="flex" gap={3} flexWrap="wrap" fontSize={14}>
            <span>Sell: <strong>{totals.sell.toFixed(2)}</strong></span>
            <span>Margin: <strong>{totals.margin.toFixed(2)}</strong></span>
            {/* Customer Target Price summary removed */}
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
                  {/* Rate ID hidden per new requirement */}
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Buy</TableCell>
                  <TableCell>Carrier</TableCell>
                  <TableCell>Tradelane</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                  {showAllVersions && <TableCell>Effective</TableCell>}
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(inq.lines.filter(l=> showAllVersions? true : (l.active!==false))).map((l)=>{ 
                  const effSell = Number(l.sell)||0; 
                  const effMargin = Number(l.margin)||0; 
                  const ros = effSell? (effMargin/effSell)*100:0; 
                  const improved = l.rateHistory && l.rateHistory.length>0; 
                  const buy = l.currentBuy!=null? Number(l.currentBuy) : (effSell - effMargin); 
                  const inactive = l.active===false; 
                  const origIndex = inq.lines.indexOf(l); // ensure correct index when filtered
                  return (
                  <TableRow key={l.rateId || origIndex} hover selected={!!l._selected} sx={inactive?{ opacity:0.5 }:{}}>
                    <TableCell padding="checkbox"><Checkbox size="small" checked={!!l._selected} onChange={()=>updateLine(origIndex,{ _selected: !l._selected })} /></TableCell>
                    {/* Rate ID cell removed */}
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
                    <TableCell align="center"><TextField type="number" size="small" value={l.qty} onChange={e=>updateLine(origIndex,{ qty:Number(e.target.value||1) })} inputProps={{ min:1 }} sx={{ width:70 }}/></TableCell>
                    <TableCell align="right">{effSell.toFixed(2)}</TableCell>
                    <TableCell align="right">{effMargin.toFixed(2)}</TableCell>
                    <TableCell align="center"><ROSChip value={ros} /></TableCell>
                    {showAllVersions && <TableCell><Typography variant="caption" display="block">{l.effectiveFrom? new Date(l.effectiveFrom).toLocaleDateString(): '-'}</Typography><Typography variant="caption" color="text.secondary">{l.effectiveTo? '→ '+new Date(l.effectiveTo).toLocaleDateString(): ''}</Typography></TableCell>}
                    <TableCell>{inq.status}</TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="text" disabled={inq.status!=='Draft'} onClick={()=>{
                        // Select only this line, open dialog
                        setInq(curr=> ({ ...curr, lines: curr.lines.map((ln,i2)=> ({ ...ln, _selected: i2===origIndex })) }));
                        setReqOpen(true);
                      }}>Need Better Rate</Button>
                    </TableCell>
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
          <Typography variant="body2" mb={2}>Creates one separate rate improvement request for each selected line.</Typography>
          <FormControl size="small" fullWidth sx={{ mb:2 }}>
            <InputLabel>Urgency</InputLabel>
            <Select label="Urgency" value={urgency} onChange={e=>setUrgency(e.target.value)}>{['Low','Normal','High','Critical'].map(u=> <MenuItem key={u} value={u}>{u}</MenuItem>)}</Select>
          </FormControl>
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <TextField label="Customer Target Price" type="number" size="small" value={requestTarget} onChange={e=>setRequestTarget(e.target.value)} sx={{ width:180 }} placeholder="e.g. 5000" />
            <TextField label="Remarks / Justification" multiline minRows={3} fullWidth value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Customer target above; need improved buy." />
          </Box>
          <Box mt={1}><Typography variant="caption" color="text.secondary">Selected lines: {inq.lines?.filter(l=>l._selected).length || 0} / {inq.lines?.length||0} • Sell {totals.sell.toFixed(2)} • ROS {totals.ros.toFixed(1)}%{requestTarget? ` • Target ${requestTarget}`:''}</Typography></Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setReqOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" disabled={!inq.lines?.some(l=>l._selected)} onClick={submitRequest}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
