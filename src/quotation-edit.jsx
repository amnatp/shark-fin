import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, IconButton, Button, Chip, Card, CardHeader, CardContent, Divider,
  TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

/******************** Helpers ********************/
const money = (n)=> (Number(n)||0).toFixed(2);
const ROSChip = ({ value }) => { const color = value>=20? 'success': value>=12? 'warning':'error'; return <Chip size="small" color={color} label={value.toFixed(1)+'%'} variant={value>=20?'filled':'outlined'} />; };
const MODES = ['Sea FCL','Sea LCL','Air','Transport','Customs'];
const CURRENCIES = ['USD','THB','SGD','CNY','EUR'];

function loadInquiryById(id){ try { const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]'); return list.find(x=>x.id===id) || null; } catch { return null; } }
function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function saveQuotations(rows){ try{ localStorage.setItem('quotations', JSON.stringify(rows)); }catch(e){ console.error(e); } }
function genQuotationNo(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const t = String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+String(d.getSeconds()).padStart(2,'0');
  return `QTN-${y}${m}${day}-${t}`;
}

/******************** Component ********************/
export default function QuotationEdit(){
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // "new" | existing quotation id
  const fromStateId = location?.state?.fromInquiryId;

  // Fallback via breadcrumb if state missing (e.g., refresh after Create Quotation)
  const fromCrumbId = React.useMemo(()=>{ try { return JSON.parse(localStorage.getItem('quotationDraftFromInquiry')||'null')?.fromInquiryId || null; } catch { return null; } },[]);
  const inquiryId = fromStateId || fromCrumbId;

  const srcInquiry = React.useMemo(()=> inquiryId ? loadInquiryById(inquiryId) : null, [inquiryId]);

  // Existing quotation if editing (id != 'new')
  const existing = React.useMemo(()=>{ if(id && id !== 'new'){ const list = loadQuotations(); return list.find(x=>x.id===id) || null; } return null; }, [id]);

  const [snack,setSnack] = React.useState({ open:false, ok:true, msg:'' });
  // Charges (other costs) dialog state
  const [chargesOpen, setChargesOpen] = React.useState(false);
  const [chargesFilterCat, setChargesFilterCat] = React.useState('');
  const [chargesSearch, setChargesSearch] = React.useState('');
  const [chargesSelected, setChargesSelected] = React.useState(()=> new Set());

  function loadChargesLibrary(){
    try{
      const rows = JSON.parse(localStorage.getItem('chargesLibrary')||'[]');
      if(Array.isArray(rows)) return rows;
    }catch{}
    return [];
  }
  const chargesLibrary = React.useMemo(()=> loadChargesLibrary(), []);

  const [q, setQ] = React.useState(()=>{
    if(existing){ return JSON.parse(JSON.stringify(existing)); }
    const baseId = id === 'new' ? '' : (id || '');
    // Build new quotation; if coming from an inquiry, copy header & lines
    if(srcInquiry){
      const selected = (srcInquiry.lines||[]).filter(l=> l._selected);
      const baseLines = (selected.length? selected : (srcInquiry.lines||[]).filter(l=> l.active!==false));
      return {
        id: baseId, // will be assigned when clicking Assign Number/Save
        inquiryId: srcInquiry.id,
        customer: srcInquiry.customer || '',
        mode: srcInquiry.mode || '',
        incoterm: srcInquiry.incoterm || '',
        salesOwner: srcInquiry.owner || '',
        currency: srcInquiry.currency || 'USD',
        validFrom: new Date().toISOString().slice(0,10),
        validTo: srcInquiry.validityTo || '',
        notes: srcInquiry.notes || '',
        status: 'Draft',
        lines: baseLines.map(l => ({
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
        costLines: [], // non-freight charges edited in Cost Table
      };
    }
    // Standalone new
    return { id: baseId, inquiryId:null, customer:'', mode:'', incoterm:'', salesOwner:'', currency:'USD', validFrom:new Date().toISOString().slice(0,10), validTo:'', notes:'', status:'Draft', lines:[], costLines:[] };
  });

  function updateHeader(patch){ setQ(s=>({ ...s, ...patch })); }
  function updateLine(idx, patch){ setQ(s=>({ ...s, lines: s.lines.map((ln,i)=> i===idx? { ...ln, ...patch } : ln ) })); }
  function addLine(){ setQ(s=> ({ ...s, lines:[...s.lines, { rateId:`MAN-${Date.now()}`, vendor:'', carrier:'', origin:'', destination:'', unit:'per CTR', qty:1, sell:0, discount:0, margin:0 }] })); }
  function duplicateLine(idx){ const src = q.lines[idx]; if(!src) return; const copy = { ...src, rateId: src.rateId+'-COPY' }; setQ(s=> ({ ...s, lines:[ ...s.lines.slice(0,idx+1), copy, ...s.lines.slice(idx+1) ] })); }
  function deleteLine(idx){ setQ(s=> ({ ...s, lines: s.lines.filter((_,i)=> i!==idx) })); }

  const totals = React.useMemo(()=>{
    const sell = (q.lines||[]).reduce((s,l)=> s + ((Number(l.sell)||0) - (Number(l.discount)||0))*(Number(l.qty)||1), 0);
    const margin = (q.lines||[]).reduce((s,l)=> s + ((Number(l.margin)||0) - (Number(l.discount)||0))*(Number(l.qty)||1), 0);
    const ros = sell? (margin/sell)*100 : 0; return { sell, margin, ros };
  }, [q.lines]);

  function computeCostLine(l){
    const qty = Number(l.qty)||0;
    const buyLocal = Number(l.buyRateLocal)||0;
    const fx = Number(l.fxToQuote)||1;
    const buyRateQC = buyLocal * fx;
    const buySubQC = qty * buyRateQC;
    const sellRateQC = Number(l.sellRateQC)||0;
    const sellSubQC = qty * sellRateQC;
    const marginQC = sellSubQC - buySubQC;
    const vatPct = Number(l.vatPct)||0;
    const vatAmtQC = sellSubQC * (vatPct/100);
    const totalSellInclVAT = sellSubQC + vatAmtQC;
    return { buyRateQC, buySubQC, sellSubQC, marginQC, vatAmtQC, totalSellInclVAT };
  }
  const otherTotals = React.useMemo(()=>{
    if(!q.costLines) return { buy:0, sell:0, margin:0, vat:0, total:0 };
    return q.costLines.reduce((acc,l)=>{ const c=computeCostLine(l); return {
      buy: acc.buy + c.buySubQC,
      sell: acc.sell + c.sellSubQC,
      margin: acc.margin + c.marginQC,
      vat: acc.vat + c.vatAmtQC,
      total: acc.total + c.totalSellInclVAT,
    }; }, { buy:0, sell:0, margin:0, vat:0, total:0 });
  }, [q.costLines]);

  function removeCostLine(id){
    setQ(prev=> ({ ...prev, costLines: prev.costLines.filter(c=> c.id!==id) }));
    if(q.id){
      const next = { ...q, costLines: q.costLines.filter(c=> c.id!==id) };
      persist(next);
    }
  }

  function persist(nextQ){
    const rows = loadQuotations();
    const idx = rows.findIndex(x=> x.id===nextQ.id);
    let next = rows.slice();
    if(idx>=0) next[idx] = nextQ; else next.unshift(nextQ);
    saveQuotations(next);
  }

  function assignNumber(){
    if(q.id && q.id !== '') return; // already assigned
    const newId = genQuotationNo();
    const withId = { ...q, id:newId };
    setQ(withId);
    persist(withId);
    // If we came from /quotations/new, switch URL to /quotations/:id
    if(id === 'new') navigate(`/quotations/${newId}`, { replace:true });
    setSnack({ open:true, ok:true, msg:`Assigned quotation no. ${newId}` });
  }

  function save(){
    // Ensure id exists
    let cur = { ...q };
    if(!cur.id){ cur.id = genQuotationNo(); setQ(cur); if(id === 'new') navigate(`/quotations/${cur.id}`, { replace:true }); }
    persist(cur);
    setSnack({ open:true, ok:true, msg:`Quotation ${cur.id} saved.` });
  }

  function exportJSON(){
    const payload = { ...q, totals };
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${q.id || 'quotation'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  }

  function openCostTable(){
    if(!q.id){ setSnack({ open:true, ok:false, msg:'Assign a quotation number first.' }); return; }
    persist(q); // keep latest before navigating
    navigate(`/quotations/${q.id}/cost-table`);
  }

  function addChargesFromLibrary(){
    if(chargesSelected.size===0){ setChargesOpen(false); return; }
    const picked = chargesLibrary.filter(c=> chargesSelected.has(c.code));
    const mapped = picked.map(item=> ({
      id: 'COST-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
      section: item.category,
      code: item.code,
      name: item.name,
      unit: item.unit || 'per BL',
      qty: 1,
      vendor: '',
      buyCurr: item.currency || (q.currency||'USD'),
      buyRateLocal: Number(item.rate)||0,
      fxToQuote: 1,
      sellRateQC: Number(item.rate)||0,
      vatPct: Number(item.vatPct)||0,
      validFrom: item.validFrom || '',
      validTo: item.validTo || '',
      show: true,
      notes: item.notes || ''
    }));
    setQ(prev => ({ ...prev, costLines: [ ...(prev.costLines||[]), ...mapped ] }));
    // Persist immediately if id assigned
    if(q.id){
      const next = { ...q, costLines: [ ...(q.costLines||[]), ...mapped ] };
      persist(next);
    }
    setSnack({ open:true, ok:true, msg:`Added ${mapped.length} charge(s).` });
    setChargesOpen(false);
    setChargesSelected(new Set());
  }

  const filteredCharges = React.useMemo(()=> {
    const needle = chargesSearch.trim().toLowerCase();
    return chargesLibrary
      .filter(c=> ['Origin','Destination','Optional'].includes(c.category))
      .filter(c=> !chargesFilterCat || c.category===chargesFilterCat)
      .filter(c=> !needle || [c.code,c.name,c.port,c.country].filter(Boolean).some(v=> String(v).toLowerCase().includes(needle)));
  }, [chargesLibrary, chargesFilterCat, chargesSearch]);

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={()=>navigate(-1)}><ArrowBackIcon fontSize="inherit" /></IconButton>
          <Typography variant="h6">{q.id? 'Edit Quotation' : 'New Quotation'}</Typography>
          {q.id && <Typography variant="body2" color="text.secondary">• {q.id}</Typography>}
        </Box>
        <Box display="flex" gap={1}>
          {!q.id && (
            <Tooltip title="Assign a quotation number">
              <Button variant="outlined" onClick={assignNumber}>Assign Number</Button>
            </Tooltip>
          )}
          <Tooltip title="Export JSON"><Button variant="outlined" startIcon={<DescriptionIcon/>} onClick={exportJSON}>Export</Button></Tooltip>
          <Tooltip title="Save"><Button variant="contained" startIcon={<SaveIcon/>} onClick={save}>Save</Button></Tooltip>
          <Tooltip title="Add origin/destination/optional charges from tariff library"><span><Button variant="outlined" onClick={()=>setChargesOpen(true)}>Add Charges</Button></span></Tooltip>
          <Tooltip title="Open cost table for Origin/Destination/Optional charges"><span><Button variant="outlined" onClick={openCostTable} disabled={!q.id}>Cost Table{q.costLines?.length? ` (${q.costLines.length})`:''}</Button></span></Tooltip>
        </Box>
      </Box>

      <Card variant="outlined">
        <CardHeader title="Header" subheader={q.inquiryId? `From Inquiry ${q.inquiryId}` : 'Standalone quotation'} />
        <CardContent sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <TextField size="small" label="Customer" value={q.customer} onChange={e=>updateHeader({ customer:e.target.value })} sx={{ minWidth:240 }} />
            <TextField size="small" label="Sales Owner" value={q.salesOwner||''} onChange={e=>updateHeader({ salesOwner:e.target.value })} sx={{ minWidth:180 }} />
            <FormControl size="small" sx={{ minWidth:140 }}>
              <InputLabel>Mode</InputLabel>
              <Select label="Mode" value={q.mode||''} onChange={e=>updateHeader({ mode:e.target.value })}>
                {MODES.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Incoterm" value={q.incoterm||''} onChange={e=>updateHeader({ incoterm:e.target.value })} sx={{ width:120 }} />
            <FormControl size="small" sx={{ minWidth:120 }}>
              <InputLabel>Currency</InputLabel>
              <Select label="Currency" value={q.currency||'USD'} onChange={e=>updateHeader({ currency:e.target.value })}>
                {CURRENCIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Valid From" InputLabelProps={{ shrink:true }} value={q.validFrom||''} onChange={e=>updateHeader({ validFrom:e.target.value })} sx={{ width:160 }} />
            <TextField size="small" type="date" label="Valid To" InputLabelProps={{ shrink:true }} value={q.validTo||''} onChange={e=>updateHeader({ validTo:e.target.value })} sx={{ width:160 }} />
          </Box>
          <TextField size="small" label="Notes / Terms" value={q.notes||''} onChange={e=>updateHeader({ notes:e.target.value })} fullWidth multiline minRows={2}/>
          <Divider />
          <Box display="flex" gap={3} flexWrap="wrap" fontSize={14} alignItems="center">
            <span>Sell: <strong>{money(totals.sell)}</strong></span>
            <span>Margin: <strong>{money(totals.margin)}</strong></span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>ROS: <strong>{totals.ros.toFixed(1)}%</strong> <ROSChip value={totals.ros}/></span>
            {q.costLines?.length>0 && <span>Other Charges: <strong>{q.costLines.length}</strong></span>}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Quoted Lines (main carriage)" action={<Button startIcon={<AddIcon/>} onClick={addLine}>Add Line</Button>} />
        <CardContent sx={{ pt:0 }}>
          {(!q.lines || q.lines.length===0) && (
            <Typography variant="caption" color="text.secondary">No lines yet. Use Add Line or create from an inquiry.</Typography>
          )}
          {q.lines && q.lines.length>0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rate ID</TableCell>
                  <TableCell>Vendor / Carrier</TableCell>
                  <TableCell>OD</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Discount</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {q.lines.map((l,idx)=>{
                  const effSell = (Number(l.sell)||0) - (Number(l.discount)||0);
                  const effMargin = (Number(l.margin)||0) - (Number(l.discount)||0);
                  const ros = effSell? (effMargin/effSell)*100 : 0;
                  return (
                    <TableRow key={l.rateId} hover>
                      <TableCell>{l.rateId}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{l.vendor||'—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{l.carrier||'—'}</Typography>
                      </TableCell>
                      <TableCell>{l.origin} → {l.destination}</TableCell>
                      <TableCell>{l.unit}</TableCell>
                      <TableCell align="center"><TextField type="number" size="small" value={l.qty} onChange={e=>updateLine(idx,{ qty:Number(e.target.value||1) })} inputProps={{ min:1 }} sx={{ width:70 }}/></TableCell>
                      <TableCell align="right"><TextField type="number" size="small" value={l.sell} onChange={e=>updateLine(idx,{ sell:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:100 }}/></TableCell>
                      <TableCell align="right"><TextField type="number" size="small" value={l.discount||0} onChange={e=>updateLine(idx,{ discount:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:100 }}/></TableCell>
                      <TableCell align="right"><TextField type="number" size="small" value={l.margin} onChange={e=>updateLine(idx,{ margin:Number(e.target.value||0) })} inputProps={{ min:0, step:0.01 }} sx={{ width:100 }}/></TableCell>
                      <TableCell align="center"><ROSChip value={ros}/></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Duplicate"><IconButton size="small" onClick={()=>duplicateLine(idx)}><ContentCopyIcon fontSize="inherit"/></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={()=>deleteLine(idx)}><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {q.costLines && q.costLines.length>0 && (
        <Card variant="outlined">
          <CardHeader title="Other Charges (Origin / Destination / Optional)" />
          <CardContent sx={{ pt:0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Section</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Buy Rate</TableCell>
                  <TableCell align="right">Buy Sub (QC)</TableCell>
                  <TableCell align="right">Sell Rate</TableCell>
                  <TableCell align="right">Sell Sub (QC)</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">VAT %</TableCell>
                  <TableCell align="right">VAT Amt</TableCell>
                  <TableCell align="right">Total + VAT</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {q.costLines.map(l=>{ const c=computeCostLine(l); return (
                  <TableRow key={l.id} hover>
                    <TableCell>{l.section}</TableCell>
                    <TableCell>{l.code}</TableCell>
                    <TableCell><Typography variant="body2" fontWeight={500}>{l.name}</Typography></TableCell>
                    <TableCell>{l.unit}</TableCell>
                    <TableCell align="center">{l.qty}</TableCell>
                    <TableCell align="right">{(Number(l.buyRateLocal)||0).toFixed(2)} {l.buyCurr}</TableCell>
                    <TableCell align="right">{c.buySubQC.toFixed(2)}</TableCell>
                    <TableCell align="right">{(Number(l.sellRateQC)||0).toFixed(2)}</TableCell>
                    <TableCell align="right">{c.sellSubQC.toFixed(2)}</TableCell>
                    <TableCell align="right">{c.marginQC.toFixed(2)}</TableCell>
                    <TableCell align="center">{(Number(l.vatPct)||0).toFixed(2)}</TableCell>
                    <TableCell align="right">{c.vatAmtQC.toFixed(2)}</TableCell>
                    <TableCell align="right">{c.totalSellInclVAT.toFixed(2)}</TableCell>
                    <TableCell align="right"><Tooltip title="Remove"><IconButton size="small" onClick={()=>removeCostLine(l.id)}><DeleteIcon fontSize="inherit"/></IconButton></Tooltip></TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
            <Box mt={1} display="flex" gap={3} flexWrap="wrap" fontSize={13}>
              <span>Buy: <strong>{otherTotals.buy.toFixed(2)}</strong></span>
              <span>Sell: <strong>{otherTotals.sell.toFixed(2)}</strong></span>
              <span>Margin: <strong>{otherTotals.margin.toFixed(2)}</strong></span>
              <span>VAT: <strong>{otherTotals.vat.toFixed(2)}</strong></span>
              <span>Total + VAT: <strong>{otherTotals.total.toFixed(2)}</strong></span>
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
      {chargesOpen && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} zIndex={1300} display="flex" alignItems="center" justifyContent="center" sx={{ background:'rgba(0,0,0,0.35)' }}>
          <Box bgcolor="background.paper" boxShadow={4} p={2} borderRadius={1} width="min(100%,1000px)" maxHeight="80vh" display="flex" flexDirection="column" gap={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">Add Charges from Tariff Library</Typography>
              <Button size="small" onClick={()=>setChargesOpen(false)}>Close</Button>
            </Box>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <FormControl size="small" sx={{ minWidth:140 }}>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={chargesFilterCat} onChange={e=>setChargesFilterCat(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  {['Origin','Destination','Optional'].map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Search" value={chargesSearch} onChange={e=>setChargesSearch(e.target.value)} sx={{ minWidth:240 }} />
              <Box flexGrow={1} />
              <Typography variant="caption" color="text.secondary">Selected: {chargesSelected.size}</Typography>
              <Button variant="contained" size="small" disabled={chargesSelected.size===0} onClick={addChargesFromLibrary}>Add Selected</Button>
            </Box>
            <Box flexGrow={1} overflow="auto" border={1} borderColor="divider" borderRadius={1}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox"></TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Curr</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>Country</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCharges.map(row=>{
                    const checked = chargesSelected.has(row.code);
                    return (
                      <TableRow key={row.code} hover selected={checked} onClick={()=>{
                        setChargesSelected(prev=>{ const next = new Set(prev); if(next.has(row.code)) next.delete(row.code); else next.add(row.code); return next; });
                      }}>
                        <TableCell padding="checkbox"><input type="checkbox" checked={checked} onChange={()=>{ setChargesSelected(prev=>{ const next=new Set(prev); if(next.has(row.code)) next.delete(row.code); else next.add(row.code); return next; }); }} /></TableCell>
                        <TableCell>{row.code}</TableCell>
                        <TableCell><Typography variant="body2" fontWeight={500}>{row.name}</Typography></TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.unit}</TableCell>
                        <TableCell>{row.currency}</TableCell>
                        <TableCell align="right">{(Number(row.rate)||0).toFixed(2)}</TableCell>
                        <TableCell>{row.port||'—'}</TableCell>
                        <TableCell>{row.country||'—'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCharges.length===0 && (
                    <TableRow><TableCell colSpan={9}><Typography variant="caption" color="text.secondary">No charges match filter.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/******************** Routes ********************/
// Use both routes:
// <Route path="/quotations/new" element={<QuotationEdit/>} />
// <Route path="/quotations/:id" element={<QuotationEdit/>} />
