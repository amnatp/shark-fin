import React from 'react';
import { useSettings } from './use-settings';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Button, Chip, Card, CardHeader, CardContent, Divider,
  TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete
} from '@mui/material';
import { useAuth } from './auth-context';
import { loadQuotations, saveQuotations, loadInquiries, saveInquiries } from './sales-docs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';

const ROSChip = ({ value, band }) => {
  if(value==null) return <Chip size="small" label="-" />;
  const color = band?.color === 'error'? 'error' : band?.color === 'warning'? 'warning' : band?.color === 'success'? 'success' : undefined;
  return <Chip size="small" color={color} label={value.toFixed(1)+'%'} variant={color==='success'?'filled':'outlined'} />;
};
const money = (n)=> (Number(n)||0).toFixed(2);

export default function QuotationEdit(){
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings() || {};
  const bands = settings?.rosBands || [];
  const autoMin = settings?.autoApproveMin ?? 15;
  function bandFor(v){ if(v==null) return null; return bands.find(b => (b.min==null || v>=b.min) && (b.max==null || v < b.max)); }

  const [snack,setSnack] = React.useState({ open:false, ok:true, msg:'' });
  const [tplOpen, setTplOpen] = React.useState(false);
  const [applyMode, setApplyMode] = React.useState('replace'); // replace | append
  const [templates] = React.useState(()=>{ try { return JSON.parse(localStorage.getItem('quotationTemplates')||'[]'); } catch { return []; } });
  // Submit to customer dialog
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState('');
  const [submitRecipients, setSubmitRecipients] = React.useState(()=>{
    // derive initial recipients from quotation if present
    const rows = loadQuotations();
    const existing = rows.find(x=>x.id===id);
    if(existing && Array.isArray(existing.customerRecipients) && existing.customerRecipients.length) return existing.customerRecipients;
    // heuristic seed example using customer code if looks like code
    return [];
  });
  function isValidEmail(e){ return /.+@.+\..+/.test(e); }

  const [q, setQ] = React.useState(()=>{
  const rows = loadQuotations();
  const found = rows.find(x=>x.id===id);
    if(found) return found;
    // If creating new (id likely 'new' handled elsewhere) or not found, initialize skeleton
    if(id === 'new'){
      const newId = `Q-${Date.now().toString(36).toUpperCase()}`;
      return { id:newId, status:'draft', version:1, parentId:null, salesOwner: user?.role==='Sales' ? (user.display || user.username) : '', lines:[], charges:[], activity:[{ ts:Date.now(), user:user?.username||'system', action:'create', note:'Quotation created (v1)' }] };
    }
    return null;
  });

  React.useEffect(()=>{
  const rows = loadQuotations(); setQ(rows.find(x=>x.id===id) || null);
  }, [id, user]);

  function updateHeader(patch){ setQ(s=> ({ ...s, ...patch })); }
  function log(action, note){ setQ(s=> ({ ...s, activity:[...(s.activity||[]), { ts:Date.now(), user:user?.username||'system', action, note }] })); }
  function updateLine(idx, patch){ setQ(s=> ({ ...s, lines: s.lines.map((ln,i)=> i===idx? { ...ln, ...patch } : ln ) })); }

  function addCharge(){ setQ(s => ({ ...s, charges: [...(s.charges||[]), { id:`C-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, name:'', basis:'Per Shipment', qty:1, sell:0, margin:0, notes:'' }] })); }
  function updCharge(ix, patch){ setQ(s => ({ ...s, charges: s.charges.map((c,i)=> i===ix? { ...c, ...patch } : c) })); }
  function rmCharge(ix){ setQ(s => ({ ...s, charges: s.charges.filter((_,i)=> i!==ix) })); }

  function applyChargesFromTemplate(tpl){
    const incoming = (tpl?.charges||[]).map(c => ({ id:`C-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, name:c.name||'', basis:c.basis||'Per Shipment', qty:Number(c.qty)||1, sell:Number(c.sell)||0, margin:Number(c.margin)||0, notes:c.notes||'' }));
    setQ(curr => ({ ...curr, charges: applyMode==='append' ? [ ...(curr.charges||[]), ...incoming ] : incoming }));
    setTplOpen(false);
    setSnack({ open:true, ok:true, msg:`Applied ${incoming.length} charge(s) from template.` });
  }

  const totals = React.useMemo(()=>{
    if(!q) return { sell:0, margin:0, ros:0, parts:{} };
  const lineSell = (q.lines||[]).reduce((s,l)=> s + (Number(l.sell)||0)*(Number(l.qty)||1), 0);
  const lineMargin = (q.lines||[]).reduce((s,l)=> s + (Number(l.margin)||0)*(Number(l.qty)||1), 0);
    const chSell = (q.charges||[]).reduce((s,c)=> s + (Number(c.sell)||0) * (Number(c.qty)||1), 0);
    const chMargin = (q.charges||[]).reduce((s,c)=> s + (Number(c.margin)||0) * (Number(c.qty)||1), 0);
    const sell = lineSell + chSell; const margin = lineMargin + chMargin; const ros = sell ? (margin/sell)*100 : 0;
    return { sell, margin, ros, parts:{ lineSell, lineMargin, chSell, chMargin } };
  }, [q]);

  function saveQuotation(){
    const rows = loadQuotations();
    let status = q.status || 'draft';
  if (totals.ros >= autoMin) status = 'approve';
    else if (status !== 'submit') status = 'draft';
    const i = rows.findIndex(x=>x.id===q.id);
    const newQ = { ...q, status, totals, updatedAt: new Date().toISOString() };
    if(i>=0) rows[i] = newQ; else rows.unshift(newQ);
    saveQuotations(rows);
    setQ(newQ);
    setSnack({ open:true, ok:true, msg:`Quotation ${q.id} saved. Status: ${status}` });
    log('save',`Saved as ${status}`);
  }

  function persistAndSet(newQ){
    const rows = loadQuotations();
    const i = rows.findIndex(x=>x.id===newQ.id);
    if(i>=0) rows[i]=newQ; else rows.unshift(newQ);
    saveQuotations(rows);
    setQ(newQ);
  }

  function submitToCustomer(){
    if(!q) return; 
    const validRecipients = (submitRecipients||[]).filter(isValidEmail);
    if(!validRecipients.length){ setSnack({ open:true, ok:false, msg:'Add at least one valid recipient email.' }); return; }
    // SLA calculation: hours from linked inquiry.createdAt to now
    let slaHours = null; let slaMet = null; let slaTarget = null;
    try {
      const inquiries = loadInquiries();
      const inq = inquiries.find(i=> i.id === q.inquiryId);
      if(inq && inq.createdAt){
        const start = new Date(inq.createdAt).getTime();
        const end = Date.now();
        slaHours = (end - start)/(1000*60*60);
        // read target hours from settings if provided
        slaTarget = (settings && settings.quotationSlaTargetHours)!=null ? settings.quotationSlaTargetHours : 48;
        slaMet = slaHours <= slaTarget;
      }
    } catch{/* ignore */}
    // Build payload for customer (simplified)
    const exportPayload = {
      type:'quotationSubmission',
      id: q.id,
      version: q.version,
      customer: q.customer,
      salesOwner: q.salesOwner,
      mode: q.mode,
      incoterm: q.incoterm,
      currency: q.currency,
      validFrom: q.validFrom,
      validTo: q.validTo,
      totals,
      message: submitMsg||null,
      recipients: validRecipients,
      lines: (q.lines||[]).map(l=> ({ rateId:l.rateId, origin:l.origin, destination:l.destination, unit:l.unit||l.basis, qty:l.qty, sell:l.sell, margin:l.margin, ros: l.sell? (l.margin/l.sell)*100:0 })),
      charges: (q.charges||[]).map(c=> ({ name:c.name, basis:c.basis, qty:c.qty, sell:c.sell, margin:c.margin, notes:c.notes })),
      submittedAt: new Date().toISOString(),
      slaHours: slaHours!=null? Number(slaHours.toFixed(2)) : null,
      slaMet,
      slaTarget
    };
    const nextStatus = q.status==='approve'? 'approve':'submit';
    const newQ = { ...q, status: nextStatus, customerMessage: submitMsg, customerRecipients: validRecipients, submittedAt: exportPayload.submittedAt, updatedAt: exportPayload.submittedAt, slaHours: exportPayload.slaHours, slaMet: exportPayload.slaMet, slaTarget: exportPayload.slaTarget, activity:[...(q.activity||[]), { ts:Date.now(), user:user?.username||'system', action:'submit', note:`Submitted to customer (${nextStatus}) -> ${validRecipients.join('; ')}${exportPayload.slaHours!=null? ` | SLA ${exportPayload.slaHours.toFixed(2)}h (${exportPayload.slaMet? 'MET':'MISS'})`:''}` }] };
    // Update linked inquiry status to Submitted
    try {
      const inqs = loadInquiries();
      const ix = inqs.findIndex(i=> i.id === q.inquiryId);
      if(ix>=0){
        const before = inqs[ix];
        const updated = { ...before, status:'Submitted', stage: 'submitted', activity:[...(before.activity||[]), { ts:Date.now(), user:user?.username||'system', action:'submit', note:`Quotation ${q.quotationNo || q.id} submitted to customer` }] };
        inqs[ix] = updated;
        saveInquiries(inqs);
      }
    } catch {/* ignore */}
    persistAndSet(newQ);
    try {
      const blob = new Blob([JSON.stringify(exportPayload,null,2)], { type:'application/json'});
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`quotation_${q.id}.json`; a.click(); URL.revokeObjectURL(url);
    } catch{/* ignore */}
    setSnack({ open:true, ok:true, msg:`Quotation ${q.id} submitted.` });
    setSubmitOpen(false); setSubmitMsg('');
  }

  const STATUS_FLOW = { draft:['submit','approve'], submit:['approve','reject'], approve:[], reject:[] };
  function transitionStatus(next){
    setQ(s=> ({ ...s, status: next }));
    log('status', `Status -> ${next}`);
  }
  function createRevision(){
    // Persist current as historical, create new revision with incremented version referencing parentId root
    const rows = loadQuotations();
    const base = q;
    const rootParent = base.parentId || base.id; // original parent or self
    // mark existing as frozen (optional flag)
    const idx = rows.findIndex(r=>r.id===base.id);
    if(idx>=0){ rows[idx] = { ...rows[idx], frozen:true }; }
    const newId = `${rootParent}-R${(base.version||1)+1}`;
    const newQ = { ...base, id:newId, version:(base.version||1)+1, parentId:rootParent, status:'draft', updatedAt:new Date().toISOString(), activity:[...(base.activity||[]), { ts:Date.now(), user:user?.username||'system', action:'revise', note:`Revision created from ${base.id}` }] };
    rows.unshift(newQ);
    saveQuotations(rows);
    navigate(`/quotations/${newId}`);
  }

  // Approval dialog state
  const [approvalOpen, setApprovalOpen] = React.useState(false);
  const [approvalMsg, setApprovalMsg] = React.useState('');
  if(!q){
    return (
      <Box p={2}>
        <IconButton size="small" onClick={()=>navigate(-1)}><ArrowBackIcon fontSize="inherit" /></IconButton>
        <Typography variant="body2" color="text.secondary" mt={2}>Quotation not found. Make sure it exists in localStorage.</Typography>
      </Box>
    );
  }
  function handleRequestApproval() {
    setApprovalMsg('Approval request sent to director.');
    setTimeout(()=>setApprovalOpen(false), 2000);
  }

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={()=>navigate(-1)}><ArrowBackIcon fontSize="inherit" /></IconButton>
      <Typography variant="h6">Edit Quotation • {q.id} <Chip size="small" label={q.status||'draft'} sx={{ ml:1 }}/>{q.version && <Chip size="small" label={`v${q.version}`} sx={{ ml:1 }} />}{q.parentId && <Chip size="small" color="info" label={`Parent ${q.parentId}`} sx={{ ml:1 }} />}</Typography>
        </Box>
    <Box display="flex" gap={1}>
      {user?.role!=='Customer' && <Button variant="outlined" onClick={()=>setTplOpen(true)}>Use Template</Button>}
      {user?.role!=='Customer' && <Button variant="contained" startIcon={<SaveIcon/>} onClick={saveQuotation}>Save</Button>}
      {user?.role!=='Customer' && <Button variant="outlined" disabled={!q || q.status==='approve'} onClick={createRevision}>New Revision</Button>}
      {user?.role!=='Customer' && <Button variant="contained" color="primary" startIcon={<SendIcon />} disabled={!q || q.status==='submit' || !q.customer || (q.lines||[]).length===0} onClick={()=>setSubmitOpen(true)}>Submit to Customer</Button>}
      {user?.role!=='Customer' && totals.ros < autoMin && (
          <Button color="error" variant="contained" onClick={()=>setApprovalOpen(true)}>
        Request Approval
          </Button>
          )}
      {user?.role==='Customer' && <Chip size="small" label="Read-only Customer View" />}
    </Box>

    {/* Approval Request Dialog */}
    <Dialog open={approvalOpen} onClose={()=>setApprovalOpen(false)}>
    <DialogTitle>Director Approval Required</DialogTitle>
    <DialogContent>
      <Typography gutterBottom>
      This quotation has a ROS below {autoMin}%. Director approval is required to proceed.
      </Typography>
      {approvalMsg && <Alert severity="success">{approvalMsg}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={()=>setApprovalOpen(false)} color="inherit">Cancel</Button>
      <Button onClick={handleRequestApproval} color="error" variant="contained">Request Approval</Button>
    </DialogActions>
    </Dialog>
      </Box>

      <Card variant="outlined">
        <CardHeader title="Header" subheader={`Inquiry ${q.inquiryId || '—'}`} />
        <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <TextField size="small" label="Customer" value={q.customer||''} onChange={e=> user?.role!=='Customer' && updateHeader({ customer:e.target.value })} sx={{ minWidth:240 }} disabled={user?.role==='Customer'}/>
            {user?.role!=='Customer' && (<Autocomplete
              size="small"
              options={(user && user.USERS ? user.USERS.filter(u=>u.role==='Sales') : []).map(u=>u.username)}
              value={q.salesOwner||''}
              onChange={(_,v)=>updateHeader({ salesOwner:v })}
              renderInput={(params)=><TextField {...params} label="Sales Owner" sx={{ minWidth:180 }}/>} 
              isOptionEqualToValue={(option, value) => option === value}
            />)}
            <FormControl size="small" sx={{ minWidth:140 }} disabled={user?.role==='Customer'}>
              <InputLabel>Mode</InputLabel>
              <Select label="Mode" value={q.mode||''} onChange={e=>updateHeader({ mode:e.target.value })}>
                {['Sea FCL','Sea LCL','Air','Transport','Customs'].map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Incoterm" value={q.incoterm||''} onChange={e=> user?.role!=='Customer' && updateHeader({ incoterm:e.target.value })} sx={{ width:120 }} disabled={user?.role==='Customer'}/>
            <FormControl size="small" sx={{ minWidth:120 }} disabled={user?.role==='Customer'}>
              <InputLabel>Currency</InputLabel>
              <Select label="Currency" value={q.currency||'USD'} onChange={e=>updateHeader({ currency:e.target.value })}>
                {['USD','THB','SGD','CNY','EUR'].map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Valid From" InputLabelProps={{ shrink:true }} value={q.validFrom||''} onChange={e=> user?.role!=='Customer' && updateHeader({ validFrom:e.target.value })} sx={{ width:160 }} disabled={user?.role==='Customer'}/>
            <TextField size="small" type="date" label="Valid To" InputLabelProps={{ shrink:true }} value={q.validTo||''} onChange={e=> user?.role!=='Customer' && updateHeader({ validTo:e.target.value })} sx={{ width:160 }} disabled={user?.role==='Customer'}/>
          </Box>
          <TextField size="small" label="Notes / Terms" value={q.notes||''} onChange={e=> user?.role!=='Customer' && updateHeader({ notes:e.target.value })} fullWidth multiline minRows={2} disabled={user?.role==='Customer'}/>
          <Divider />
          <Box display="flex" gap={3} flexWrap="wrap" fontSize={14}>
            <span>Sell: <strong>{money(totals.sell)}</strong></span>
            <span>Margin: <strong>{money(totals.margin)}</strong></span>
            <span>ROS: <strong>{totals.ros.toFixed(1)}%</strong> <ROSChip value={totals.ros} band={bandFor(totals.ros)}/> {totals.ros>=autoMin && <Chip size="small" color="success" label="Auto-Approve" sx={{ ml:0.5 }}/>}</span>
            {q.slaHours!=null && <span>SLA: <strong>{q.slaHours.toFixed(2)}h</strong> {q.slaMet!=null && <Chip size="small" color={q.slaMet? 'success':'error'} label={q.slaMet? 'MET':'MISS'} sx={{ ml:0.5 }}/>} {q.slaTarget && <Chip size="small" label={`Target ${q.slaTarget}h`} sx={{ ml:0.5 }}/>}</span>}
          </Box>
          {bands.length>0 && (
            <Typography variant="caption" color="text.secondary">
              ROS Bands: {bands.map(b=> `${b.label} ${b.min!=null?'>='+b.min:''}${b.min!=null && b.max!=null?'–':''}${b.max!=null?'<'+b.max:''}`).join(' | ')} • Auto-Approve ≥ {autoMin}% • Guardrail min ROS {settings?.minRosGuardrail?.[q.mode||'Sea FCL'] ?? '-'}%
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Lines" />
        <CardContent sx={{ pt:0 }}>
          <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
            {STATUS_FLOW[q.status||'draft']?.map(s=> (
              <Button key={s} size="small" variant="outlined" onClick={()=>transitionStatus(s)} disabled={s==='approve' && totals.ros < autoMin}>{s}</Button>
            ))}
          </Box>
          {(!q.lines || q.lines.length===0) && (
            <Typography variant="caption" color="text.secondary">No lines in this quotation.</Typography>
          )}
          {q.lines?.length>0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rate ID</TableCell>
                  <TableCell>Vendor / Carrier</TableCell>
                  <TableCell>Tradelane</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  {/* Discount column removed */}
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {q.lines.map((l,idx)=>{
                  const effSell = (Number(l.sell)||0);
                  const effMargin = (Number(l.margin)||0);
                  const ros = effSell? (effMargin/effSell)*100 : 0;
                  const band = bandFor(ros);
                  const mode = q.mode || 'Sea FCL';
                  const guardrail = settings?.minRosGuardrail?.[mode];
                  const violates = guardrail!=null && ros < guardrail;
                  return (
                    <TableRow key={l.rateId||idx} hover>
                      <TableCell>{l.rateId}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{l.vendor||'—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{l.carrier||'—'}</Typography>
                      </TableCell>
                      <TableCell>{l.origin} → {l.destination}</TableCell>
                      <TableCell>{l.unit || l.containerType || l.basis}</TableCell>
                      <TableCell align="center"><TextField type="number" size="small" value={l.qty} onChange={e=> user?.role!=='Customer' && updateLine(idx,{ qty:Number(e.target.value||1) })} inputProps={{ min:1 }} sx={{ width:70 }} disabled={user?.role==='Customer'}/></TableCell>
                      <TableCell align="right"><TextField type="number" size="small" value={l.sell} onChange={e=> user?.role!=='Customer' && updateLine(idx,{ sell:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:100 }} disabled={user?.role==='Customer'}/></TableCell>
                      {/* Discount input removed */}
                      <TableCell align="right"><TextField type="number" size="small" value={l.margin} onChange={e=> user?.role!=='Customer' && updateLine(idx,{ margin:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:100 }} disabled={user?.role==='Customer'}/></TableCell>
                      <TableCell align="center" sx={violates? { backgroundColor:(theme)=> theme.palette.error.light + '22' }: undefined}>
                        <ROSChip value={ros} band={band}/>
                        {violates && <Chip size="small" color="error" label={`<${guardrail}%`} sx={{ ml:0.5 }}/>} 
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
  <CardHeader title="Additional Charges" action={user?.role!=='Customer' && <Button size="small" onClick={addCharge}>Add Charge</Button>} />
        <CardContent sx={{ pt:0 }}>
          {(!q.charges || q.charges.length===0) && (
            <Typography variant="caption" color="text.secondary">No charges. Click “Add Charge” or use a template.</Typography>
          )}
          {q.charges?.length>0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Charge</TableCell>
                  <TableCell>Basis</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {q.charges.map((c,ix)=>(
                  <TableRow key={c.id||ix} hover>
                    <TableCell><TextField size="small" value={c.name} onChange={e=> user?.role!=='Customer' && updCharge(ix,{ name:e.target.value })} disabled={user?.role==='Customer'}/></TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth:140 }}>
                        <InputLabel>Basis</InputLabel>
                        <Select label="Basis" value={c.basis} onChange={e=> user?.role!=='Customer' && updCharge(ix,{ basis:e.target.value })} disabled={user?.role==='Customer'}>
                          {['Per Shipment','Per Container','Per Unit'].map(b=> <MenuItem key={b} value={b}>{b}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={c.qty} onChange={e=> user?.role!=='Customer' && updCharge(ix,{ qty:Number(e.target.value||1) })} sx={{ width:80 }} inputProps={{ min:1 }} disabled={user?.role==='Customer'} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={c.sell} onChange={e=> user?.role!=='Customer' && updCharge(ix,{ sell:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }} disabled={user?.role==='Customer'} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={c.margin} onChange={e=> user?.role!=='Customer' && updCharge(ix,{ margin:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }} disabled={user?.role==='Customer'} /></TableCell>
                    <TableCell><TextField size="small" value={c.notes} onChange={e=> user?.role!=='Customer' && updCharge(ix,{ notes:e.target.value })} disabled={user?.role==='Customer'} /></TableCell>
                    <TableCell>{user?.role!=='Customer' && <IconButton size="small" onClick={()=>rmCharge(ix)}><DeleteIcon fontSize="inherit" /></IconButton>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template chooser: charges only */}
      <Dialog open={tplOpen} onClose={()=>setTplOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Select Template for Additional Charges</DialogTitle>
        <DialogContent dividers>
          {templates.length===0 && (
            <Typography variant="body2" color="text.secondary">No pricing templates found. Create one under Templates → Quotation.</Typography>
          )}
          {templates.map((t)=> (
            <Card key={t.id} variant="outlined" sx={{ mb:1 }}>
              <CardHeader titleTypographyProps={{ variant:'subtitle2' }} title={t.name} subheader={`Lines: ${t.lines?.length||0} • Charges: ${t.charges?.length||0}`} action={<Button size="small" onClick={()=>applyChargesFromTemplate(t)}>Apply Charges</Button>} />
            </Card>
          ))}
          <Box mt={1} display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth:200 }}>
              <InputLabel>Apply Mode</InputLabel>
              <Select label="Apply Mode" value={applyMode} onChange={e=>setApplyMode(e.target.value)}>
                <MenuItem value="replace">Replace current charges</MenuItem>
                <MenuItem value="append">Append to current charges</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setTplOpen(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Submit to Customer Dialog */}
      <Dialog open={submitOpen} onClose={()=>setSubmitOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Submit Quotation to Customer</DialogTitle>
        <DialogContent dividers sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Typography variant="body2">Confirm sending this quotation to the customer. A JSON export will download (placeholder for email/send API).</Typography>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={submitRecipients}
            onChange={(e,v)=> setSubmitRecipients(v.map(x=>x.trim()).filter(Boolean))}
            renderInput={(params)=>(
              <TextField {...params} label="Recipient Emails" placeholder="type email and press Enter" helperText={submitRecipients.length? submitRecipients.some(r=>!isValidEmail(r))? 'Invalid emails highlighted' : `${submitRecipients.length} recipient(s)` : 'Add at least one email'} />
            )}
            filterSelectedOptions
            getOptionLabel={o=>o}
            sx={{ '.MuiChip-root': { m:0.25 } }}
          />
          {!!submitRecipients.length && submitRecipients.some(r=>!isValidEmail(r)) && (
            <Alert severity="warning" variant="outlined" sx={{ fontSize:12 }}>One or more emails look invalid. They will be ignored unless corrected.</Alert>
          )}
          <TextField label="Message / Cover Note" multiline minRows={3} value={submitMsg} onChange={e=>setSubmitMsg(e.target.value)} placeholder="Dear Customer, please find our quotation..." />
          <Box display="flex" gap={3} flexWrap="wrap" fontSize={13}>
            <span>Lines: <strong>{(q.lines||[]).length}</strong></span>
            <span>Charges: <strong>{(q.charges||[]).length}</strong></span>
            <span>Sell: <strong>{(totals.sell||0).toFixed(2)}</strong></span>
            <span>ROS: <strong>{totals.ros.toFixed(1)}%</strong></span>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setSubmitOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={submitToCustomer} variant="contained" startIcon={<SendIcon />} disabled={!submitRecipients.filter(isValidEmail).length}>Submit</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
      {q.activity && (
        <Card variant="outlined" sx={{ mt:2 }}>
          <CardHeader title="Activity" subheader={`${q.activity.length} event(s)`} />
          <CardContent sx={{ maxHeight:240, overflow:'auto', pt:0 }}>
            {q.activity.slice().reverse().map((a,i)=>(
              <Box key={i} display="flex" gap={2} borderBottom={1} borderColor="divider" py={0.5} fontSize={12}>
                <span style={{ width:160 }}>{new Date(a.ts).toLocaleString()}</span>
                <span style={{ width:100 }}>{a.user}</span>
                <span style={{ width:70 }}>{a.action}</span>
                <span style={{ flex:1 }}>{a.note}</span>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
