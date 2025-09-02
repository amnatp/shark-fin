import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { Card, CardContent, CardHeader, CardActions, Typography, Tabs, Tab, Button, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Box, Grid, Table, TableHead, TableBody, TableCell, TableRow, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FileDownload as FileDown, Add as Plus, Send, CheckCircle, Phone, Mail, ArrowUpward, Upload, Cancel as XCircle, Description as FileText, Warning as ShieldAlert } from '@mui/icons-material';

/**
 * Inquiry Management Mockup (React + shadcn/ui)
 * Pipeline: Draft → Sourcing → Priced → Quoted → Won / Lost
 * Aligned with process: Forecast → Inquiry → Quotation → SysFreight job creation
 * Key features:
 *  - Inquiry form (customer, mode, tradelane, specs, validity)
 *  - Procurement handoff (RFQ to vendors/agents via Excel/API)
 *  - Credit alert (placeholder for SysFreight feedback)
 *  - Compute quick target (ROS threshold gate) then create quotation
 *  - List with filters, bulk export
 * NOTE: Dummy data only; wire backend later.
 */

const MODES = ["Sea FCL", "Sea LCL", "Air", "Transport", "Customs"]; 
const STATUSES = ["Draft", "Sourcing", "Priced", "Quoted", "Won", "Lost"]; 
const STATUS_ORDER = ["Draft","Sourcing","Priced","Quoted","Won","Lost"];
const NEXT_STATUS = {
  Draft: ["Sourcing", "Cancelled"],
  Sourcing: ["Priced", "Cancelled"],
  Priced: ["Quoted", "Cancelled"],
  Quoted: ["Won", "Lost"],
  Won: [],
  Lost: []
};
// Activity log entry: { ts, user, action, note }

const seed = [
  {
    id: "INQ-250801",
    customer: "CP Foods TH",
    mode: "Sea FCL",
    origin: "THBKK",
    destination: "SGSIN",
    volume: "1x40HC",
    weight: "9,500 kg",
    incoterm: "FOB",
    validityTo: "2025-09-30",
    owner: "Sales-A",
    status: "Sourcing",
    rosTarget: 12,
    notes: "Direct or via SIN, weekly.",
    creditOk: true,
  },
  {
    id: "INQ-250814",
    customer: "Delta TH",
    mode: "Air",
    origin: "THBKK",
    destination: "HKHKG",
    volume: "3 cbm",
    weight: "550 kg",
    incoterm: "EXW",
    validityTo: "2025-10-15",
    owner: "Sales-Co-01",
    status: "Priced",
    rosTarget: 15,
    notes: "Direct TG preferred.",
    creditOk: false,
  },
  {
    id: "INQ-250820",
    customer: "PTT GC",
    mode: "Transport",
    origin: "THBKK",
    destination: "THRAY",
    volume: "1 trailer",
    weight: "20,000 kg",
    incoterm: "DAP",
    validityTo: "2025-12-31",
    owner: "Sales-B",
    status: "Quoted",
    rosTarget: 14,
    notes: "Hazmat class 3; night delivery.",
    creditOk: true,
  },
];

function CustomerTargetBadge({ value }){ return <Chip size="small" label={`Target ${value}`} color={value>=20? 'success': value>=12? 'warning':'error'} variant={value>=20? 'filled':'outlined'} />; }

function StatusBadge({ status }){ return <Chip size="small" label={status} color={status==='Won' ? 'success': status==='Lost' ? 'error':'default'} variant="outlined" />; }

function Filters({ filters, setFilters, onReset }){
  return (
    <Grid container spacing={2} alignItems="flex-end">
      <Grid item xs={6} sm={3} md={2}><TextField size="small" label="Customer" value={filters.customer} onChange={(e)=>setFilters(f=>({...f,customer:e.target.value}))} fullWidth/></Grid>
      <Grid item xs={6} sm={3} md={2}>
        <FormControl fullWidth size="small"><InputLabel>Mode</InputLabel><Select label="Mode" value={filters.mode} onChange={(e)=>setFilters(f=>({...f,mode:e.target.value}))}><MenuItem value="">Any</MenuItem>{MODES.map(m=><MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl>
      </Grid>
      <Grid item xs={6} sm={3} md={2}><TextField size="small" label="Owner" value={filters.owner} onChange={(e)=>setFilters(f=>({...f,owner:e.target.value}))} fullWidth/></Grid>
      <Grid item xs={6} sm={3} md={2}>
        <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select label="Status" value={filters.status} onChange={(e)=>setFilters(f=>({...f,status:e.target.value}))}><MenuItem value="">Any</MenuItem>{STATUSES.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
      </Grid>
      <Grid item xs={6} sm={3} md={2}><TextField size="small" label="Origin" value={filters.origin} onChange={(e)=>setFilters(f=>({...f,origin:e.target.value}))} fullWidth/></Grid>
      <Grid item xs={6} sm={3} md={2}><TextField size="small" label="Destination" value={filters.destination} onChange={(e)=>setFilters(f=>({...f,destination:e.target.value}))} fullWidth/></Grid>
      <Grid item xs={12} display="flex" justifyContent="flex-end"><Button variant="outlined" onClick={onReset}>Reset</Button></Grid>
    </Grid>
  );
}

function List({ rows, onSort, onView, onEdit }){
  const header = (key,label) => <Button size="small" onClick={()=>onSort(key)}>{label}</Button>;
  return (
    <Table size="small">
      <TableHead><TableRow>
        <TableCell>Inquiry</TableCell>
        <TableCell>{header('customer','Customer')}</TableCell>
        <TableCell>Mode</TableCell>
        <TableCell>{header('origin','Origin')}</TableCell>
        <TableCell>{header('destination','Destination')}</TableCell>
        <TableCell>Owner</TableCell>
  <TableCell>Cargo Ready</TableCell>
        <TableCell>Status</TableCell>
    <TableCell align="center">Actions</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {rows.map(r=>(
          <TableRow key={r.id} hover>
            <TableCell>{r.id}</TableCell>
            <TableCell>{r.customer}</TableCell>
            <TableCell><Chip size="small" label={r.mode} /></TableCell>
            <TableCell>{r.origin}</TableCell>
            <TableCell>{r.destination}</TableCell>
            <TableCell>{r.owner}</TableCell>
            <TableCell>{r.cargoReadyDate || '-'}</TableCell>
            <TableCell><StatusBadge status={r.status}/></TableCell>
      <TableCell align="center" sx={{ display:'flex', gap:1 }}>
        <Button size="small" variant="outlined" onClick={()=>onView && onView(r)}>View</Button>
        <Button size="small" variant="contained" onClick={()=>onEdit && onEdit(r)}>Edit</Button>
      </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function NewInquiryDialog({ onAdd, currentUser }){
  const [open,setOpen] = useState(false);
  const [form,setForm] = useState({ customer:'', mode:'Sea FCL', origin:'', destination:'', incoterm:'FOB', volume:'', weight:'', cargoReadyDate:'', owner: currentUser?.role==='Sales' ? (currentUser.display || currentUser.username) : '', notes:'' });
  const save = () => { const id = `INQ-${Math.random().toString(36).slice(2,8).toUpperCase()}`; onAdd({ id, status:'Draft', creditOk:true, ...form }); setOpen(false); };
  return <>
    <Button startIcon={<Plus />} variant="contained" size="small" onClick={()=>setOpen(true)}>New Inquiry</Button>
    <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>Create Inquiry</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {['customer','owner','origin','destination','volume','weight','incoterm','notes'].map(()=>null) /* placeholder for brevity */}
          <Grid item xs={12} sm={6}><TextField size="small" label="Customer" value={form.customer} onChange={e=>setForm({...form,customer:e.target.value})} fullWidth/></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" label="Owner" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} fullWidth/></Grid>
          <Grid item xs={12} sm={6}><FormControl size="small" fullWidth><InputLabel>Mode</InputLabel><Select label="Mode" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}>{MODES.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6} sm={3}><TextField size="small" label="Incoterm" value={form.incoterm} onChange={e=>setForm({...form,incoterm:e.target.value})} fullWidth/></Grid>
          {/* Customer Target Price input removed */}
          <Grid item xs={6} sm={3}><TextField size="small" label="Origin" value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})} fullWidth/></Grid>
          <Grid item xs={6} sm={3}><TextField size="small" label="Destination" value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} fullWidth/></Grid>
          <Grid item xs={6} sm={3}><TextField size="small" label="Volume" value={form.volume} onChange={e=>setForm({...form,volume:e.target.value})} fullWidth/></Grid>
          <Grid item xs={6} sm={3}><TextField size="small" label="Weight" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} fullWidth/></Grid>
          <Grid item xs={6} sm={3}><TextField size="small" label="Cargo Ready" type="date" value={form.cargoReadyDate} onChange={e=>setForm({...form,cargoReadyDate:e.target.value})} fullWidth InputLabelProps={{ shrink:true }}/></Grid>
          {/* Valid To input removed */}
          <Grid item xs={12}><TextField size="small" label="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} fullWidth multiline minRows={2}/></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setOpen(false)} color="inherit">Cancel</Button>
        <Button onClick={save} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  </>;
}

export default function InquiryManagement(){
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(()=>{
    try { const saved = JSON.parse(localStorage.getItem('savedInquiries')||'[]'); return [...saved, ...seed]; } catch { return seed; }
  });
  const [tab, setTab] = useState("All");
  const [filters, setFilters] = useState({ customer:"", mode:"", owner:"", status:"", origin:"", destination:"" });
  const [sort, setSort] = useState({ key: "customer", dir: "asc"});
  const [selected, setSelected] = useState(null);

  const rows = useMemo(()=>{
    const base = data
      .filter(r => tab === "All" ? true : r.status === tab)
      .filter(r => !filters.customer || r.customer.toLowerCase().includes(filters.customer.toLowerCase()))
      .filter(r => !filters.mode || r.mode === filters.mode)
      .filter(r => !filters.owner || r.owner.toLowerCase().includes(filters.owner.toLowerCase()))
      .filter(r => !filters.status || r.status === filters.status)
      .filter(r => !filters.origin || r.origin.toLowerCase().includes(filters.origin.toLowerCase()))
      .filter(r => !filters.destination || r.destination.toLowerCase().includes(filters.destination.toLowerCase()))
      .sort((a,b)=>{
        const ka = a[sort.key]; const kb = b[sort.key];
        if(ka < kb) return sort.dir === "asc" ? -1 : 1;
        if(ka > kb) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    // Role-based visibility: Sales only see their own inquiries
    if(user?.role === 'Sales'){
      const idOrDisplay = (val) => (val||'').toLowerCase();
      const meDisplay = idOrDisplay(user.display);
      const meUser = idOrDisplay(user.username);
      return base.filter(r => {
        const owner = idOrDisplay(r.owner);
        return owner === meDisplay || owner === meUser;
      });
    }
    return base;
  }, [data, tab, filters, sort, user?.role, user?.display, user?.username]);

  function onSort(key){
    setSort(s => ({ key, dir: s.key===key && s.dir==="asc" ? "desc" : "asc" }));
  }

  function onAdd(inq){
    const withLog = { ...inq, activity:[{ ts:Date.now(), user:user?.username||'system', action:'create', note:`Inquiry created with status ${inq.status}` }] };
    setData(d => [withLog, ...d]);
  }

  function appendLog(id, entry){
    setData(d=> d.map(r=> r.id===id ? { ...r, activity:[...(r.activity||[]), entry] }: r));
  }

  function transition(id, to){
    setData(d=> d.map(r=> r.id===id ? { ...r, status: to }: r));
    appendLog(id, { ts:Date.now(), user:user?.username||'system', action:'status', note:`Status -> ${to}` });
  }

  // Listen for external additions (e.g., cart save) when user returns to this tab
  useEffect(()=>{
    const sync = () => {
      try { const saved = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
        setData(d=>{
          const existingIds = new Set(d.map(x=>x.id));
            const merged = [...saved.filter(s=>!existingIds.has(s.id)), ...d];
            return merged;
        });
      } catch {/* ignore */}
    };
    window.addEventListener('focus', sync);
    return ()=> window.removeEventListener('focus', sync);
  }, []);

  function onExport(){
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `inquiries_${(tab||'all').toLowerCase()}.json`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Inquiry Management</Typography>
        <Typography variant="caption" color="text.secondary">Mockup • MUI</Typography>
      </Box>
      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle1">Pipeline & Tools</Typography>} />
        <CardContent sx={{ display:'flex', gap:2, flexWrap:'wrap', alignItems:'center' }}>
          <NewInquiryDialog onAdd={onAdd} currentUser={user} />
          <Button variant="outlined" size="small" onClick={onExport} startIcon={<FileDown fontSize="inherit"/>}>Export</Button>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle2">Filters</Typography>} />
        <CardContent>
          <Filters filters={filters} setFilters={setFilters} onReset={()=>setFilters({ customer:"", mode:"", owner:"", status:"", origin:"", destination:"" })}/>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable" allowScrollButtonsMobile>
            {['All', ...STATUSES].map(s=> <Tab key={s} value={s} label={s} />)}
          </Tabs>
          <Box mt={2}><List rows={rows} onSort={onSort} onView={setSelected} onEdit={(r)=>navigate(`/inquiry/${r.id}`)} /></Box>
        </CardContent>
      </Card>
      <Dialog open={!!selected} onClose={()=>setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle>Inquiry Detail {selected?.id && `• ${selected.id}`}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" flexWrap="wrap" columnGap={4} rowGap={1} fontSize={14}>
                <span><strong>Customer:</strong> {selected.customer||'-'}</span>
                <span><strong>Owner:</strong> {selected.owner||'-'}</span>
                <span><strong>Mode:</strong> {selected.mode}</span>
                <span><strong>Incoterm:</strong> {selected.incoterm||'-'}</span>
                <span><strong>Status:</strong> {selected.status}</span>
                <span><strong>Cargo Ready:</strong> {selected.cargoReadyDate||'-'}</span>
                <span><strong>Tradelane:</strong> {selected.origin} → {selected.destination}</span>
                <span><strong>Volume:</strong> {selected.volume||'-'}</span>
              </Box>
              {selected.notes && <Typography variant="body2">Notes: {selected.notes}</Typography>}
              <Box display="flex" gap={1} flexWrap="wrap">
                {NEXT_STATUS[selected.status]?.map(ns=> (
                  <Button key={ns} size="small" variant="outlined" onClick={()=>transition(selected.id, ns)} disabled={ns==='Cancelled'}>{ns}</Button>
                ))}
              </Box>
              {selected.activity && (
                <Box>
                  <Typography variant="subtitle2" mt={2}>Activity</Typography>
                  <Table size="small"><TableHead><TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {selected.activity.slice().reverse().map((a,idx)=>(
                      <TableRow key={idx}>
                        <TableCell>{new Date(a.ts).toLocaleString()}</TableCell>
                        <TableCell>{a.user}</TableCell>
                        <TableCell>{a.action}</TableCell>
                        <TableCell>{a.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </Box>
              )}
              {selected.lines?.length>0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Lines ({selected.lines.length})</Typography>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>Rate ID</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Carrier</TableCell>
                      <TableCell>Tradelane</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Sell</TableCell>
                      {/* Discount column removed */}
                      <TableCell align="right">Margin</TableCell>
                      <TableCell align="center">ROS%</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {selected.lines.map(l=>{
                        const effSell = l.sell;
                        const effMargin = l.margin;
                        const ros = effSell? (effMargin/effSell)*100:0;
                        return (
                          <TableRow key={l.rateId}>
                            <TableCell>{l.rateId}</TableCell>
                            <TableCell>{l.vendor}</TableCell>
                            <TableCell>{l.carrier}</TableCell>
                            <TableCell>{l.origin} → {l.destination}</TableCell>
                            <TableCell>{l.containerType || l.basis}</TableCell>
                            <TableCell align="center">{l.qty}</TableCell>
                            <TableCell align="right">{effSell.toFixed(2)}</TableCell>
                            {/* Discount cell removed */}
                            <TableCell align="right">{effMargin.toFixed(2)}</TableCell>
                            <TableCell align="center"><ROSBadge value={ros} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
              {!selected.lines && <Typography variant="caption" color="text.secondary">No line breakdown stored for this inquiry.</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setSelected(null)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>
      <Typography variant="caption" color="text.secondary">* Future: quotation approval workflow & backend integration.</Typography>
    </Box>
  );
}
