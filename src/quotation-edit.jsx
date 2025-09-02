import React from 'react';
import { useSettings } from './use-settings';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Button, Chip, Card, CardHeader, CardContent, Divider,
  TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete
} from '@mui/material';
import { useAuth } from './auth-context';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';

const ROSChip = ({ value, band }) => {
  if(value==null) return <Chip size="small" label="-" />;
  const color = band?.color === 'error'? 'error' : band?.color === 'warning'? 'warning' : band?.color === 'success'? 'success' : undefined;
  return <Chip size="small" color={color} label={value.toFixed(1)+'%'} variant={color==='success'?'filled':'outlined'} />;
};
const money = (n)=> (Number(n)||0).toFixed(2);

function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function saveQuotations(rows){ try{ localStorage.setItem('quotations', JSON.stringify(rows)); }catch(e){ console.error(e); } }

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
      <Button variant="outlined" onClick={()=>setTplOpen(true)}>Use Template</Button>
      <Button variant="contained" startIcon={<SaveIcon/>} onClick={saveQuotation}>Save</Button>
    <Button variant="outlined" disabled={!q || q.status==='approve'} onClick={createRevision}>New Revision</Button>
  {totals.ros < autoMin && (
      <Button color="error" variant="contained" onClick={()=>setApprovalOpen(true)}>
        Request Approval
      </Button>
      )}
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
            <TextField size="small" label="Customer" value={q.customer||''} onChange={e=>updateHeader({ customer:e.target.value })} sx={{ minWidth:240 }}/>
            <Autocomplete
              size="small"
              options={(user && user.USERS ? user.USERS.filter(u=>u.role==='Sales') : []).map(u=>u.username)}
              value={q.salesOwner||''}
              onChange={(_,v)=>updateHeader({ salesOwner:v })}
              renderInput={(params)=><TextField {...params} label="Sales Owner" sx={{ minWidth:180 }}/>} 
              isOptionEqualToValue={(option, value) => option === value}
            />
            <FormControl size="small" sx={{ minWidth:140 }}>
              <InputLabel>Mode</InputLabel>
              <Select label="Mode" value={q.mode||''} onChange={e=>updateHeader({ mode:e.target.value })}>
                {['Sea FCL','Sea LCL','Air','Transport','Customs'].map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Incoterm" value={q.incoterm||''} onChange={e=>updateHeader({ incoterm:e.target.value })} sx={{ width:120 }}/>
            <FormControl size="small" sx={{ minWidth:120 }}>
              <InputLabel>Currency</InputLabel>
              <Select label="Currency" value={q.currency||'USD'} onChange={e=>updateHeader({ currency:e.target.value })}>
                {['USD','THB','SGD','CNY','EUR'].map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Valid From" InputLabelProps={{ shrink:true }} value={q.validFrom||''} onChange={e=>updateHeader({ validFrom:e.target.value })} sx={{ width:160 }}/>
            <TextField size="small" type="date" label="Valid To" InputLabelProps={{ shrink:true }} value={q.validTo||''} onChange={e=>updateHeader({ validTo:e.target.value })} sx={{ width:160 }}/>
          </Box>
          <TextField size="small" label="Notes / Terms" value={q.notes||''} onChange={e=>updateHeader({ notes:e.target.value })} fullWidth multiline minRows={2}/>
          <Divider />
          <Box display="flex" gap={3} flexWrap="wrap" fontSize={14}>
            <span>Sell: <strong>{money(totals.sell)}</strong></span>
            <span>Margin: <strong>{money(totals.margin)}</strong></span>
            <span>ROS: <strong>{totals.ros.toFixed(1)}%</strong> <ROSChip value={totals.ros} band={bandFor(totals.ros)}/> {totals.ros>=autoMin && <Chip size="small" color="success" label="Auto-Approve" sx={{ ml:0.5 }}/>}</span>
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
                  <TableCell>OD</TableCell>
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
                      <TableCell align="center"><TextField type="number" size="small" value={l.qty} onChange={e=>updateLine(idx,{ qty:Number(e.target.value||1) })} inputProps={{ min:1 }} sx={{ width:70 }}/></TableCell>
                      <TableCell align="right"><TextField type="number" size="small" value={l.sell} onChange={e=>updateLine(idx,{ sell:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:100 }}/></TableCell>
                      {/* Discount input removed */}
                      <TableCell align="right"><TextField type="number" size="small" value={l.margin} onChange={e=>updateLine(idx,{ margin:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:100 }}/></TableCell>
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
        <CardHeader title="Additional Charges" action={<Button size="small" onClick={addCharge}>Add Charge</Button>} />
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
                    <TableCell><TextField size="small" value={c.name} onChange={e=>updCharge(ix,{ name:e.target.value })}/></TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth:140 }}>
                        <InputLabel>Basis</InputLabel>
                        <Select label="Basis" value={c.basis} onChange={e=>updCharge(ix,{ basis:e.target.value })}>
                          {['Per Shipment','Per Container','Per Unit'].map(b=> <MenuItem key={b} value={b}>{b}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={c.qty} onChange={e=>updCharge(ix,{ qty:Number(e.target.value||1) })} sx={{ width:80 }} inputProps={{ min:1 }} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={c.sell} onChange={e=>updCharge(ix,{ sell:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }}/></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={c.margin} onChange={e=>updCharge(ix,{ margin:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }}/></TableCell>
                    <TableCell><TextField size="small" value={c.notes} onChange={e=>updCharge(ix,{ notes:e.target.value })}/></TableCell>
                    <TableCell><IconButton size="small" onClick={()=>rmCharge(ix)}><DeleteIcon fontSize="inherit" /></IconButton></TableCell>
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
