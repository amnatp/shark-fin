import React from 'react';
import { useAuth } from './auth-context';
import { hideCostFor, hideRosFor } from './permissions';
import { Box, Typography, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Chip, IconButton, TextField, Tooltip, Snackbar, Alert, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { loadSalesDocs, loadQuotations, saveQuotations, convertInquiryToQuotation, migrateNormalizeQuotationNumbers, generateQuotationId } from './sales-docs';
import { QUOTATION_DEFAULT_STATUS, QUOTATION_STATUS_APPROVE, QUOTATION_STATUS_SUBMIT, QUOTATION_STATUS_REJECT } from './inquiry-statuses';
function StatusChip({ status }) {
  let color = 'default';
  if (status === QUOTATION_STATUS_APPROVE) color = 'success';
  else if (status === QUOTATION_STATUS_SUBMIT) color = 'primary';
  else if (status === QUOTATION_DEFAULT_STATUS) color = 'warning';
  else if (status === QUOTATION_STATUS_REJECT) color = 'error';
  return <Chip size="small" label={status||'draft'} color={color} variant={status===QUOTATION_STATUS_APPROVE?'filled':'outlined'} sx={{ textTransform:'capitalize' }} />;
}
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

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
  const hideCost = hideCostFor(user);
  const hideRos = hideRosFor(user);
  const [snack, setSnack] = React.useState({ open:false, msg:'' });
  const [migrateResult, setMigrateResult] = React.useState(null);
  const [seededOnce, setSeededOnce] = React.useState(()=>{ try { return localStorage.getItem('quotationSamplesSeeded')==='1'; } catch { return false; } });
  const [view, setView] = React.useState('quotes'); // all | quotes | inquiries

  const seedSamples = React.useCallback((count=8)=>{
    const owner = (user?.display || user?.username || 'Demo Sales');
    const now = new Date();
    const dests = ['USLAX','USSEA','DEHAM','NLRTM','CNSHA','JPTYO','GBFXT','AUMEL','SGSIN','HKKOW'];
    const existing = loadQuotations();
    const makeLine = (dest, i)=> ({ origin:'THBKK', destination:dest, qty:(i%2)+1, sell:1200+(i*45), margin:200+(i*15), unit:'Shipment', vendor:'Sample Vendor', carrier:'Sample Carrier' });
    const created = [];
    // Seed samples as if they were created in August of this year
    const sampleMonth = 7; // August (0-indexed)
    const sampleYear = now.getFullYear();
    const sampleBase = new Date(sampleYear, sampleMonth, 1);
    const yy = String(sampleBase.getFullYear()).slice(-2);
    const mm = String(sampleBase.getMonth()+1).padStart(2,'0');
    const prefix = `Q-${yy}${mm}`;
    // Find existing max sequence for the month
    let maxSeq = 0;
    for(const ex of existing){
      const no = ex?.quotationNo || ex?.id || '';
      if(typeof no === 'string' && no.startsWith(prefix)){
        const tail = no.slice(prefix.length).replace(/[^0-9]/g,'');
        const n = parseInt(tail || '0', 10);
        if(!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
    for(let i=0;i<count;i++){
      // generate a unique id for samples (do not create business-facing quotationNo)
      const id = generateQuotationId(new Date(sampleYear, sampleMonth, Math.min(25, (i+3))));
      const day = Math.min(25, (i+3));
      const createdAt = new Date(sampleYear, sampleMonth, day, 10, 0, 0).toISOString();
      const validFrom = new Date(sampleYear, sampleMonth, 1).toISOString().slice(0,10);
      const validTo = new Date(sampleYear, sampleMonth+2, 0).toISOString().slice(0,10);
      const row = {
        id,
        status:QUOTATION_DEFAULT_STATUS,
        version:1,
        parentId:null,
        salesOwner: owner,
        customer: `CUST${String.fromCharCode(65+i)} – Sample Customer ${i+1}`,
        mode:'Sea FCL', incoterm:'FOB', currency:'USD',
        validFrom,
        validTo,
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
  }, [user]);

  function reload(){ setRows(loadQuotations()); }
  React.useEffect(()=>{ function onStorage(e){ if(e.key==='quotations' || e.key==='savedInquiries' || e.key==='salesDocs') reload(); } window.addEventListener('storage', onStorage); return ()=> window.removeEventListener('storage', onStorage); }, []);
  // Auto-seed if there is 0 or 1 quotation to help demos
  React.useEffect(()=>{
    const list = loadQuotations();
    if((list?.length||0) < 2) { seedSamples(8); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build latest revision per root parent (parentId or self id) for primary list (quotations only)
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
  const filteredQuotes = latest
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

  // Unified view data (includes inquiries). We won’t show lines expansion for inquiries yet; they’ll appear as flat rows with fewer columns.
  const unifiedDocs = React.useMemo(()=>{
    const all = loadSalesDocs();
    // Role visibility: for sales, only their own
  const visible = (user?.role==='Sales' || user?.role==='SalesManager' || user?.role==='RegionManager') ? all.filter(d=>{
      const me1 = (user.display||'').toLowerCase();
      const me2 = (user.username||'').toLowerCase();
      const owner = (d.salesOwner||'').toLowerCase();
      return owner===me1 || owner===me2; }) : all;
    const text = q.toLowerCase();
    return visible.filter(d=> (
      (d.id||'').toLowerCase().includes(text) ||
      (d.customer||'').toLowerCase().includes(text) ||
      (d.salesOwner||'').toLowerCase().includes(text) ||
      (d.mode||'').toLowerCase().includes(text) ||
      (d.incoterm||'').toLowerCase().includes(text)
    ));
  }, [q, user]);
  const inquiriesOnly = React.useMemo(()=> unifiedDocs.filter(d=> d.docType==='inquiry'), [unifiedDocs]);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
  <Box display="flex" alignItems="center" gap={1}>
  <Typography variant="h6">{user?.role === 'Customer' ? 'My Quotations' : 'Quotations'}</Typography>
    <ToggleButtonGroup size="small" value={view} exclusive onChange={(_,v)=> v && setView(v)} sx={{ ml:1 }}>
      <ToggleButton value="all">All</ToggleButton>
      <ToggleButton value="quotes">Quotations</ToggleButton>
      <ToggleButton value="inquiries">Inquiries</ToggleButton>
    </ToggleButtonGroup>
    <Typography variant="caption" color="text.secondary" sx={{ ml:1 }}>
      {view==='all' ? `${unifiedDocs.length} items` : view==='quotes' ? `${latest.length} latest / ${rows.length} total` : `${unifiedDocs.filter(d=>d.docType==='inquiry').length} items`}
    </Typography>
  </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Button size="small" variant="outlined" onClick={()=> setOpenMap({})}>Collapse all</Button>
          <TextField size="small" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} />
          <IconButton size="small" onClick={reload}><RefreshIcon fontSize="inherit" /></IconButton>
          {!seededOnce && <Button variant="outlined" onClick={()=>seedSamples(8)}>Seed 8 Samples</Button>}
          <Button variant="contained" onClick={()=>navigate('/quotations/new')}>New Quotation</Button>
          <Button variant="outlined" onClick={()=>{
            const res = migrateNormalizeQuotationNumbers(new Date());
            setMigrateResult(res);
            setSnack({ open:true, msg: res.error ? `Migration error` : `Migration updated ${res.updated}` });
            // reload rows from storage after migration
            setTimeout(()=> reload(), 50);
          }} title="Normalize existing quotation id/number format">Normalize Quotation Numbers</Button>
        </Box>
      </Box>
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle2' }} title={view==='all' ? 'Sales Docs (Quotes + Inquiries)' : view==='inquiries' ? 'Inquiries' : 'All Quotations'} />
        <CardContent sx={{ pt:0 }}>
          {view==='quotes' && !filteredQuotes.length && <Typography variant="caption" color="text.secondary">No quotations found. Use “Seed 8 Samples” to add demo data.</Typography>}
          {view==='quotes' && !!filteredQuotes.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Incoterm</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  {!hideCost && <TableCell align="right">Margin</TableCell>}
                  {!hideRos && <TableCell align="center">ROS</TableCell>}
                  <TableCell>Valid</TableCell>
                  <TableCell>Lines</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredQuotes.map(q=> {
                  const sell = (q.lines||[]).reduce((s,l)=> s + (Number(l.sell)||0)*(l.qty||1),0);
                  const margin = (q.lines||[]).reduce((s,l)=> s + (Number(l.margin)||0)*(l.qty||1),0);
                  const isOpen = !!openMap[q.id];
                  const toggle = () => setOpenMap(prev=> ({ ...prev, [q.id]: !prev[q.id] }));
                  const colSpan = 10;
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
                        {!hideCost && <TableCell align="right">{money(margin)}</TableCell>}
                        {!hideRos && <TableCell align="center"><ROSChip sell={sell} margin={margin} /></TableCell>}
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
                                      {!hideCost && <TableCell align="right" width="20%">Margin</TableCell>}
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
                    {!hideCost && <TableCell align="right">{money(ln.margin)}</TableCell>}
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
          {view==='inquiries' && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Incoterm</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Valid</TableCell>
                  <TableCell>Lines</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inquiriesOnly.map(d=>{
                  const rowKey = `inquiry:${d.id}`;
                  const isOpen = !!openMap[rowKey];
                  const toggle = () => setOpenMap(prev=> ({ ...prev, [rowKey]: !prev[rowKey] }));
                  const colSpan = 7;
                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow hover sx={{ cursor:'pointer', bgcolor: isOpen? 'action.selected': undefined }} onClick={toggle}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                            <Typography component="span" variant="body2" fontWeight={600}>{d.id}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{d.customer||'—'}</TableCell>
                        <TableCell>{d.mode||'—'}</TableCell>
                        <TableCell>{d.incoterm||'—'}</TableCell>
                        <TableCell><StatusChip status={d.stage} /></TableCell>
                        <TableCell>{(d.validFrom||'-')} → {(d.validTo||'-')}</TableCell>
                        <TableCell>{d.lines?.length||0}</TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={colSpan} sx={{ p:0, bgcolor:'background.default' }}>
                            <Box sx={{ px:2, py:1, borderLeft: (theme)=> `4px solid ${theme.palette.info.light}`, bgcolor:'action.hover' }}>
                              <Table size="small">
                                  <TableHead sx={{ backgroundColor: 'info.dark', '& th': { color: 'common.white' } }}>
                                  <TableRow>
                                    <TableCell width="10%">Line #</TableCell>
                                    <TableCell width="40%">Trade Lane</TableCell>
                                    <TableCell align="right" width="10%">Qty</TableCell>
                                    <TableCell align="right" width="20%">Sell</TableCell>
                                    {!hideCost && <TableCell align="right" width="20%">Margin</TableCell>}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(d.lines||[]).length===0 && (
                                    <TableRow>
                                      <TableCell colSpan={5}><Typography variant="caption" color="text.secondary">No lines</Typography></TableCell>
                                    </TableRow>
                                  )}
                                  {(d.lines||[]).map((ln, idx)=> (
                                    <TableRow key={`${rowKey}-ln-${idx}`}>
                                      <TableCell>{idx+1}</TableCell>
                                      <TableCell>{laneOfLine(ln)}</TableCell>
                                      <TableCell align="right">{ln.qty||1}</TableCell>
                                      <TableCell align="right">{money(ln.sell)}</TableCell>
                                      {!hideCost && <TableCell align="right">{money(ln.margin)}</TableCell>}
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
          {view==='all' && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Incoterm</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Valid</TableCell>
                  <TableCell>Lines</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unifiedDocs.map(d=> {
                  const rowKey = `${d.docType}:${d.id}`;
                  const isInquiry = d.docType==='inquiry';
                  const isOpen = !!openMap[rowKey];
                  const toggle = () => isInquiry && setOpenMap(prev=> ({ ...prev, [rowKey]: !prev[rowKey] }));
                  const colSpan = 8;
                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow hover sx={{ cursor: isInquiry? 'pointer':'default', bgcolor: isOpen? 'action.selected': undefined }} onClick={toggle}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isInquiry && (isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />)}
                            <Typography component="span" variant="body2" fontWeight={600}>{d.id}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Chip size="small" label={d.docType} /></TableCell>
                        <TableCell>{d.customer||'—'}</TableCell>
                        <TableCell>{d.mode||'—'}</TableCell>
                        <TableCell>{d.incoterm||'—'}</TableCell>
                        <TableCell><StatusChip status={d.stage} /></TableCell>
                        <TableCell>{(d.validFrom||'-')} → {(d.validTo||'-')}</TableCell>
                        <TableCell>{d.lines?.length||0}</TableCell>
                        <TableCell sx={{ whiteSpace:'nowrap' }} onClick={(e)=> e.stopPropagation()}>
                          {isInquiry && (
                            <Button size="small" variant="outlined" onClick={()=>{
                              const q = convertInquiryToQuotation(d.id, {});
                              if(q){ setSnack({ open:true, msg:`Created quotation ${q.id}` }); reload(); }
                            }}>Create Quotation</Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isInquiry && isOpen && (
                        <TableRow>
                          <TableCell colSpan={colSpan} sx={{ p:0, bgcolor:'background.default' }}>
                            <Box sx={{ px:2, py:1, borderLeft: (theme)=> `4px solid ${theme.palette.info.light}`, bgcolor:'action.hover' }}>
                              <Table size="small">
                                <TableHead sx={{ backgroundColor: 'info.dark', '& th': { color: 'common.white' } }}>
                                  <TableRow>
                                    <TableCell width="10%">Line #</TableCell>
                                    <TableCell width="40%">Trade Lane</TableCell>
                                    <TableCell align="right" width="10%">Qty</TableCell>
                                    <TableCell align="right" width="20%">Sell</TableCell>
                                    <TableCell align="right" width="20%">Margin</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(d.lines||[]).length===0 && (
                                    <TableRow>
                                      <TableCell colSpan={5}><Typography variant="caption" color="text.secondary">No lines</Typography></TableCell>
                                    </TableRow>
                                  )}
                                  {(d.lines||[]).map((ln, idx)=> (
                                    <TableRow key={`${rowKey}-ln-${idx}`}>
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
      {migrateResult && <Box sx={{ px:2 }}><Typography variant="caption">Migration: {migrateResult.error ? `Error: ${migrateResult.error}` : `${migrateResult.updated} updated, prefix=${migrateResult.prefix}`}</Typography></Box>}
      <Snackbar open={snack.open} autoHideDuration={2500} onClose={()=>setSnack(s=>({ ...s, open:false }))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity="success" variant="filled" onClose={()=>setSnack(s=>({ ...s, open:false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
