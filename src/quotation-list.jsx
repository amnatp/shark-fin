import React from 'react';
import { useAuth } from './auth-context';
import { Box, Typography, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Chip, IconButton, TextField, Tooltip, Snackbar, Alert } from '@mui/material';
function StatusChip({ status }) {
  let color = 'default';
  if (status === 'approve') color = 'success';
  else if (status === 'submit') color = 'primary';
  else if (status === 'draft') color = 'warning';
  else if (status === 'reject') color = 'error';
  return <Chip size="small" label={status||'draft'} color={color} variant={status==='approve'?'filled':'outlined'} sx={{ textTransform:'capitalize' }} />;
}
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function saveQuotations(rows){ try{ localStorage.setItem('quotations', JSON.stringify(rows)); }catch{/* ignore */} }
function money(n){ return (Number(n)||0).toFixed(2); }
function ROSChip({ sell, margin }){ const ros = sell? (margin/sell)*100:0; const color = ros>=20?'success': ros>=12?'warning':'error'; return <Chip size="small" color={color} label={ros.toFixed(1)+'%'} variant={ros>=20?'filled':'outlined'} />; }
function laneOfLine(line){
  let o = line?.origin; let d = line?.destination;
  if((!o || !d) && line?.lane){ const parts = String(line.lane).split('→'); o = o || (parts[0]||''); d = d || (parts[1]||''); }
  return `${(o||'').toString().trim()} → ${(d||'').toString().trim()}`.trim();
}

export default function QuotationList(){
  const navigate = useNavigate();
  const [rows, setRows] = React.useState(()=> loadQuotations());
  const [q, setQ] = React.useState('');
  const [openMap, setOpenMap] = React.useState({});
  const { user } = useAuth();
  const [snack, setSnack] = React.useState({ open:false, msg:'' });
  const [seededOnce, setSeededOnce] = React.useState(()=>{ try { return localStorage.getItem('quotationSamplesSeeded')==='1'; } catch { return false; } });

  // Generate ID similar to quotation-edit: Q-<base36 timestamp>
  const genQId = React.useCallback((offset=0)=> `Q-${(Date.now()+offset).toString(36).toUpperCase()}`,[/* none */]);
  const seedSamples = React.useCallback((count=8)=>{
    const owner = (user?.display || user?.username || 'Demo Sales');
    const now = new Date();
    const dests = ['USLAX','USSEA','DEHAM','NLRTM','CNSHA','JPTYO','GBFXT','AUMEL','SGSIN','HKKOW'];
    const existing = loadQuotations();
    const makeLine = (dest, i)=> ({ origin:'THBKK', destination:dest, qty:(i%2)+1, sell:1200+(i*45), margin:200+(i*15), unit:'Shipment', vendor:'Sample Vendor', carrier:'Sample Carrier' });
    const created = [];
    for(let i=0;i<count;i++){
      const id = genQId(i);
      const createdAt = new Date(now.getFullYear(), now.getMonth(), Math.min(25, (i+3)), 10, 0, 0).toISOString();
      const row = {
        id,
        status:'draft',
        version:1,
        parentId:null,
        salesOwner: owner,
        customer: `CUST${String.fromCharCode(65+i)} – Sample Customer ${i+1}`,
        mode:'Sea FCL', incoterm:'FOB', currency:'USD',
        validFrom: now.toISOString().slice(0,10),
        validTo: new Date(now.getFullYear(), now.getMonth()+2, 0).toISOString().slice(0,10),
        createdAt,
        lines:[ makeLine(dests[i % dests.length], i) ],
        charges:[],
        activity:[{ ts:Date.now(), user:user?.username||'system', action:'create', note:'Sample quotation created (v1)' }]
      };
      existing.unshift(row); created.push(row);
    }
    // Persist then refresh state with a new array reference to ensure re-render
  saveQuotations(existing);
    setRows([...existing]);
    setQ(''); // clear any search filter
    try { window.dispatchEvent(new Event('storage')); } catch {/* ignore */}
    setSnack({ open:true, msg:`Seeded ${created.length} sample quotation${created.length>1?'s':''}.` });
  try { localStorage.setItem('quotationSamplesSeeded','1'); } catch{/* ignore */}
  setSeededOnce(true);
    return created.length;
  }, [user, genQId]);

  function reload(){ setRows(loadQuotations()); }
  React.useEffect(()=>{ function onStorage(e){ if(e.key==='quotations') reload(); } window.addEventListener('storage', onStorage); return ()=> window.removeEventListener('storage', onStorage); }, []);
  // Auto-seed if there is 0 or 1 quotation to help demos
  React.useEffect(()=>{
    const list = loadQuotations();
    if((list?.length||0) < 2) { seedSamples(8); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build latest revision per root parent (parentId or self id) for primary list
  const latestByRoot = React.useMemo(()=>{
    const map = new Map();
    for(const r of rows){
      const root = r.parentId || r.id;
      const cur = map.get(root);
      if(!cur || (r.version||0) > (cur.version||0)) map.set(root, r);
    }
    return map;
  }, [rows]);
  const latest = Array.from(latestByRoot.values());
  const filtered = latest
    // Sales role visibility restriction
    .filter(r => {
      if(user?.role !== 'Sales') return true;
      const me1 = (user.display||'').toLowerCase();
      const me2 = (user.username||'').toLowerCase();
      const owner = (r.salesOwner||'').toLowerCase();
      return owner === me1 || owner === me2;
    })
    .filter(r=> {
      const t = (r.id+' '+(r.customer||'')+' '+(r.salesOwner||'')+' '+(r.mode||'')+' '+(r.incoterm||'')).toLowerCase();
      return t.includes(q.toLowerCase());
    });

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
  <Typography variant="h6">Quotations ({latest.length} latest / {rows.length} total)</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <TextField size="small" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} />
          <IconButton size="small" onClick={reload}><RefreshIcon fontSize="inherit" /></IconButton>
          {!seededOnce && <Button variant="outlined" onClick={()=>seedSamples(8)}>Seed 8 Samples</Button>}
          <Button variant="contained" onClick={()=>navigate('/quotations/new')}>New Quotation</Button>
        </Box>
      </Box>
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle2' }} title="All Quotations" />
        <CardContent sx={{ pt:0 }}>
          {!filtered.length && <Typography variant="caption" color="text.secondary">No quotations found. Use “Seed 8 Samples” to add demo data.</Typography>}
          {!!filtered.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Incoterm</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                  <TableCell>Valid</TableCell>
                  <TableCell>Lines</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(q=> {
                  const sell = (q.lines||[]).reduce((s,l)=> s + (Number(l.sell)||0)*(l.qty||1),0);
                  const margin = (q.lines||[]).reduce((s,l)=> s + (Number(l.margin)||0)*(l.qty||1),0);
                  const isOpen = !!openMap[q.id];
                  const toggle = () => setOpenMap(prev=> ({ ...prev, [q.id]: !prev[q.id] }));
                  const colSpan = 11;
                  return (
                    <React.Fragment key={q.id}>
                      <TableRow hover sx={{ cursor:'pointer', bgcolor: isOpen? 'action.selected': undefined, borderTop: '2px solid', borderTopColor: 'divider' }} onClick={toggle}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                            <Typography component="span" variant="body2" fontWeight={600}>{q.id}</Typography>
                            {q.version && <Chip size="small" label={`v${q.version}`} sx={{ ml:0.5 }}/>} 
                            {q.parentId && <Tooltip title={`Root ${q.parentId}`}><Chip size="small" label="Rev" sx={{ ml:0.5 }}/></Tooltip>}
                          </Box>
                        </TableCell>
                        <TableCell>{q.customer}</TableCell>
                        <TableCell>{q.mode}</TableCell>
                        <TableCell>{q.incoterm}</TableCell>
                        <TableCell><StatusChip status={q.status} /></TableCell>
                        <TableCell align="right">{money(sell)}</TableCell>
                        <TableCell align="right">{money(margin)}</TableCell>
                        <TableCell align="center"><ROSChip sell={sell} margin={margin} /></TableCell>
                        <TableCell>{q.validFrom || '-'} → {q.validTo || '-'}</TableCell>
                        <TableCell>{q.lines?.length||0}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); navigate(`/quotations/${q.id}`); }}>
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={colSpan} sx={{ p:0, bgcolor:'background.default' }}>
                            <Box sx={{ px:2, py:1, borderLeft: (theme)=> `4px solid ${theme.palette.primary.light}`, bgcolor:'action.hover' }}>
                              <Table size="small">
                                <TableHead sx={{ backgroundColor: 'primary.dark', '& th': { color: 'common.white' } }}>
                                  <TableRow>
                                    <TableCell width="10%">Line #</TableCell>
                                    <TableCell width="40%">Trade Lane</TableCell>
                                    <TableCell align="right" width="10%">Qty</TableCell>
                                    <TableCell align="right" width="20%">Sell</TableCell>
                                    <TableCell align="right" width="20%">Margin</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(q.lines||[]).length===0 && (
                                    <TableRow>
                                      <TableCell colSpan={5}><Typography variant="caption" color="text.secondary">No lines</Typography></TableCell>
                                    </TableRow>
                                  )}
                                  {(q.lines||[]).map((ln, idx)=> (
                                    <TableRow key={`${q.id}-ln-${idx}`}>
                                      <TableCell>{idx+1}</TableCell>
                                      <TableCell>{laneOfLine(ln)}</TableCell>
                                      <TableCell align="right">{ln.qty||1}</TableCell>
                                      <TableCell align="right">{money(ln.sell)}</TableCell>
                                      <TableCell align="right">{money(ln.margin)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Snackbar open={snack.open} autoHideDuration={2500} onClose={()=>setSnack(s=>({ ...s, open:false }))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity="success" variant="filled" onClose={()=>setSnack(s=>({ ...s, open:false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
