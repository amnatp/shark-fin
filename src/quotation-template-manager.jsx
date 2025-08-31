import React from 'react';
import {
  Box, Card, CardHeader, CardContent, Typography, Button, TextField, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Chip,
  Select, MenuItem, FormControl, InputLabel, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';

const money = (n)=> (Number(n)||0).toFixed(2);
const ros = (margin, sell)=> { const s=Number(sell)||0; const m=Number(margin)||0; return s? (m/s)*100:0; };
const ROSChip = ({ value }) => { const color = value>=20? 'success': value>=12? 'warning':'error'; return <Chip size="small" color={color} label={`${value.toFixed(1)}%`} variant={value>=20?'filled':'outlined'} />; };
const uid = (p='T')=> `${p}-${Date.now()}-${Math.random().toString(16).slice(2,7)}`;

function lsGet(key, fallback){ try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }catch{ return fallback; } }
function lsSet(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ console.error(e); } }

export default function QuotationTemplateManager(){
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });
  const [templates, setTemplates] = React.useState(()=> lsGet('quotationTemplates', []));
  const [selId, setSelId] = React.useState(templates[0]?.id || null);
  const sel = templates.find(t=>t.id===selId) || null;

  const [form, setForm] = React.useState(()=> sel || { id: uid('TPL'), name: 'New Pricing Template', header:{ currency:'USD', incoterm:'', validTo:'', notes:'' }, lines: [], charges: [] });
  React.useEffect(()=>{ if(sel){ setForm(sel); } }, [selId]);

  function newTemplate(){ const t = { id: uid('TPL'), name: 'New Pricing Template', header:{ currency:'USD', incoterm:'', validTo:'', notes:'' }, lines: [], charges: [] }; setTemplates(prev=>[t, ...prev]); setSelId(t.id); setForm(t); }
  function dupTemplate(){ if(!sel) return; const t = { ...sel, id: uid('TPL'), name: sel.name+' (Copy)', createdAt: new Date().toISOString() }; const next=[t, ...templates]; setTemplates(next); setSelId(t.id); lsSet('quotationTemplates', next); setSnack({ open:true, ok:true, msg:'Template duplicated.' }); }
  function delTemplate(){ if(!sel) return; const next = templates.filter(t=>t.id!==selId); setTemplates(next); setSelId(next[0]?.id || null); lsSet('quotationTemplates', next); setSnack({ open:true, ok:true, msg:'Template deleted.' }); }
  function saveTemplate(){ const t = { ...form, updatedAt: new Date().toISOString() }; const i = templates.findIndex(x=>x.id===t.id); const next = i>=0? templates.map((x,ix)=> ix===i? t : x) : [t, ...templates]; setTemplates(next); lsSet('quotationTemplates', next); setSnack({ open:true, ok:true, msg:'Template saved.' }); }

  function setHeader(p){ setForm(f=> ({ ...f, header:{ ...f.header, ...p } })); }
  function addLine(){ setForm(f=> ({ ...f, lines: [...(f.lines||[]), { id: uid('L'), origin:'', destination:'', unit:'', qty:1, sell:0, discount:0, margin:0, vendor:'', carrier:'', notes:'' }] })); }
  function updLine(ix, p){ setForm(f=> ({ ...f, lines: f.lines.map((ln,i)=> i===ix? { ...ln, ...p } : ln ) })); }
  function rmLine(ix){ setForm(f=> ({ ...f, lines: f.lines.filter((_,i)=> i!==ix) })); }

  function addCharge(){ setForm(f => ({ ...f, charges: [...(f.charges||[]), { id: uid('C'), name:'', basis:'Per Shipment', qty:1, sell:0, margin:0, notes:'' }] })); }
  function updCharge(ix, p){ setForm(f=> ({ ...f, charges: f.charges.map((c,i)=> i===ix? { ...c, ...p } : c ) })); }
  function rmCharge(ix){ setForm(f=> ({ ...f, charges: f.charges.filter((_,i)=> i!==ix) })); }

  const totals = React.useMemo(()=>{
    const sell = (form.lines||[]).reduce((s,l)=> s + (Number(l.sell)-(Number(l.discount)||0))*(Number(l.qty)||1), 0)
                + (form.charges||[]).reduce((s,c)=> s + (Number(c.sell)||0)*(Number(c.qty)||1), 0);
    const margin = (form.lines||[]).reduce((s,l)=> s + (Number(l.margin)-(Number(l.discount)||0))*(Number(l.qty)||1), 0)
                + (form.charges||[]).reduce((s,c)=> s + (Number(c.margin)||0)*(Number(c.qty)||1), 0);
    return { sell, margin, ros: ros(margin, sell) };
  }, [form.lines, form.charges]);

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Typography variant="h6">Quotation Templates (Pricing + Additional Charges)</Typography>
      <Box display="grid" gridTemplateColumns="280px 1fr" gap={12}>
        <Card variant="outlined">
          <CardHeader title="Templates" action={<>
            <Button size="small" startIcon={<AddIcon/>} onClick={newTemplate}>New</Button>
            <Button size="small" startIcon={<ContentCopyIcon/>} onClick={dupTemplate} disabled={!sel}>Duplicate</Button>
            <Button size="small" color="error" startIcon={<DeleteIcon/>} onClick={delTemplate} disabled={!sel}>Delete</Button>
          </>} />
          <CardContent>
            {(templates||[]).map(t => (
              <Box key={t.id} onClick={()=>setSelId(t.id)} sx={{ p:1, borderRadius:1, cursor:'pointer', bgcolor: selId===t.id? 'action.selected':'transparent' }}>
                <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
                <Typography variant="caption" color="text.secondary">Lines: {t.lines?.length||0} • Charges: {t.charges?.length||0}</Typography>
              </Box>
            ))}
            {(!templates || templates.length===0) && <Typography variant="body2" color="text.secondary">No templates yet.</Typography>}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title={sel? sel.name : 'New Pricing Template'} action={<Button startIcon={<SaveIcon/>} onClick={saveTemplate}>Save</Button>} />
          <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
            <TextField size="small" label="Template Name" value={form.name||''} onChange={e=>setForm(f=>({...f, name:e.target.value}))} sx={{ maxWidth: 420 }} />
            <Box display="flex" gap={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth:120 }}>
                <InputLabel>Currency</InputLabel>
                <Select label="Currency" value={form.header?.currency||'USD'} onChange={e=>setHeader({ currency:e.target.value })}>
                  {['USD','THB','SGD','CNY','EUR'].map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Incoterm" value={form.header?.incoterm||''} onChange={e=>setHeader({ incoterm:e.target.value })} sx={{ width:140 }} />
              <TextField size="small" type="date" label="Valid To" InputLabelProps={{ shrink:true }} value={form.header?.validTo||''} onChange={e=>setHeader({ validTo:e.target.value })} sx={{ width:180 }} />
              <TextField size="small" label="Header Notes" value={form.header?.notes||''} onChange={e=>setHeader({ notes:e.target.value })} fullWidth />
            </Box>

            <Divider />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">Lines</Typography>
              <Button size="small" startIcon={<AddIcon/>} onClick={addLine}>Add Row</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Origin</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Disc</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Carrier</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(form.lines||[]).map((l,ix)=> (
                  <TableRow key={l.id||ix} hover>
                    <TableCell>{ix+1}</TableCell>
                    <TableCell><TextField size="small" value={l.origin} onChange={e=>updLine(ix,{ origin:e.target.value })} sx={{ width:110 }} /></TableCell>
                    <TableCell><TextField size="small" value={l.destination} onChange={e=>updLine(ix,{ destination:e.target.value })} sx={{ width:110 }} /></TableCell>
                    <TableCell><TextField size="small" value={l.unit} onChange={e=>updLine(ix,{ unit:e.target.value })} sx={{ width:90 }} /></TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={l.qty} onChange={e=>updLine(ix,{ qty:Number(e.target.value||1) })} sx={{ width:70 }} inputProps={{ min:1 }} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={l.sell} onChange={e=>updLine(ix,{ sell:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={l.discount} onChange={e=>updLine(ix,{ discount:Number(e.target.value||0) })} sx={{ width:90 }} inputProps={{ min:0, step:0.01 }} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={l.margin} onChange={e=>updLine(ix,{ margin:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }} /></TableCell>
                    <TableCell><TextField size="small" value={l.vendor} onChange={e=>updLine(ix,{ vendor:e.target.value })} sx={{ width:120 }} /></TableCell>
                    <TableCell><TextField size="small" value={l.carrier} onChange={e=>updLine(ix,{ carrier:e.target.value })} sx={{ width:120 }} /></TableCell>
                    <TableCell><TextField size="small" value={l.notes} onChange={e=>updLine(ix,{ notes:e.target.value })} /></TableCell>
                    <TableCell><IconButton size="small" onClick={()=>rmLine(ix)}><DeleteIcon fontSize="inherit" /></IconButton></TableCell>
                  </TableRow>
                ))}
                {(form.lines||[]).length===0 && (
                  <TableRow><TableCell colSpan={12}><Typography variant="body2" color="text.secondary">No rows. Click Add Row.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Divider sx={{ my:2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">Additional Charges</Typography>
              <Button size="small" startIcon={<AddIcon/>} onClick={addCharge}>Add Charge</Button>
            </Box>
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
                {(form.charges||[]).map((c,ix)=> (
                  <TableRow key={c.id||ix} hover>
                    <TableCell><TextField size="small" value={c.name} onChange={e=>updCharge(ix,{ name:e.target.value })} /></TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth:140 }}>
                        <InputLabel>Basis</InputLabel>
                        <Select label="Basis" value={c.basis} onChange={e=>updCharge(ix,{ basis:e.target.value })}>
                          {['Per Shipment','Per Container','Per Unit'].map(b=> <MenuItem key={b} value={b}>{b}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={c.qty} onChange={e=>updCharge(ix,{ qty:Number(e.target.value||1) })} sx={{ width:80 }} inputProps={{ min:1 }} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={c.sell} onChange={e=>updCharge(ix,{ sell:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }} /></TableCell>
                    <TableCell align="right"><TextField type="number" size="small" value={c.margin} onChange={e=>updCharge(ix,{ margin:Number(e.target.value||0) })} sx={{ width:100 }} inputProps={{ min:0, step:0.01 }} /></TableCell>
                    <TableCell><TextField size="small" value={c.notes} onChange={e=>updCharge(ix,{ notes:e.target.value })} /></TableCell>
                    <TableCell><IconButton size="small" onClick={()=>rmCharge(ix)}><DeleteIcon fontSize="inherit" /></IconButton></TableCell>
                  </TableRow>
                ))}
                {(form.charges||[]).length===0 && (
                  <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">No charges yet. Click “Add Charge”.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Box display="flex" gap={2} mt={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2">Totals</Typography>
              <Chip size="small" label={`Sell ${money(totals.sell)}`} />
              <Chip size="small" label={`Margin ${money(totals.margin)}`} />
              <ROSChip value={totals.ros} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
