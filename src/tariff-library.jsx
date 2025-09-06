import React from 'react';
import {
  Box, Typography, Card, CardHeader, CardContent, Button, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';

/********************** Constants **********************/
const CATEGORIES = ['Origin','Destination','Freight','Optional'];
const MODES = ['Sea FCL','Sea LCL','Air','Transport','Customs'];
const UNITS = ['per BL','per CTR','per KG','per CBM','per Shipment','per AWB'];
const CURRENCIES = ['USD','THB','SGD','CNY','EUR'];

/********************** Storage Helpers **********************/
function loadChargesLibrary(){
  if(typeof window === 'undefined') return [];
  try{
    const raw = localStorage.getItem('chargesLibrary');
    if(!raw) return seedCharges();
    const rows = JSON.parse(raw);
    if(Array.isArray(rows)) return rows;
  }catch(e){ console.warn('Failed to parse chargesLibrary, reseeding', e); }
  return seedCharges();
}
function seedCharges(){
  const seed = [
    { code:'PICKUP', name:'Origin - Pickup', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:1500, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Pickup from shipper', vendor:'Local Truck', cost:1200, atCost:true },
    { code:'HANDLING', name:'Origin - Handling', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:800, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Warehouse handling', vendor:'Warehouse', cost:700, atCost:true },
    { code:'ATF', name:'Origin - Airline Terminal Fee', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:1200, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Terminal fee', vendor:'Airline', cost:1000, atCost:false },
    { code:'CUSTCL', name:'Origin - Customs Clearance', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:2000, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Customs clearance', vendor:'Broker', cost:1800, atCost:true },
    { code:'DOCFEE', name:'Origin - Document Fee', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:500, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Document preparation', vendor:'Broker', cost:400, atCost:true },
    { code:'XRAY', name:'Origin - X-Ray Screening Fee', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:600, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'X-Ray screening', vendor:'Screening Co', cost:500, atCost:true },
    { code:'EXPTF', name:'Origin - Export Transfer Fee', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:700, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Export transfer', vendor:'Transfer Co', cost:600, atCost:true },
    { code:'CFS', name:'Origin - CFS / Stuffing', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:900, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'CFS/Stuffing', vendor:'Warehouse', cost:800, atCost:true },
    { code:'CGEDI', name:'Origin - CG / EDI Fee', category:'Origin', mode:'Air', unit:'per Shipment', currency:'THB', rate:300, country:'TH', port:'BKK', equipment:'-', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'CG/EDI', vendor:'EDI Provider', cost:250, atCost:true },
    // ...existing seed items...
    { code:'THC-O', name:'Terminal Handling Origin', category:'Origin', mode:'Sea FCL', unit:'per CTR', currency:'THB', rate:2500, country:'TH', port:'BKK', equipment:'All', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Applies at POL', vendor:'THAI PORT', cost:2000, atCost:false },
    { code:'DOC',   name:'Documentation / BL Fee',   category:'Origin', mode:'Sea FCL', unit:'per BL',  currency:'THB', rate:1000, country:'TH', port:'BKK', equipment:'All', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'One per shipment', vendor:'THAI PORT', cost:800, atCost:true },
    { code:'THC-D', name:'Terminal Handling Destination', category:'Destination', mode:'Sea FCL', unit:'per CTR', currency:'SGD', rate:120, country:'SG', port:'SIN', equipment:'All', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Applies at POD', vendor:'SG PORT', cost:100, atCost:false },
    { code:'DO',    name:'Delivery Order Fee',       category:'Destination', mode:'Sea FCL', unit:'per BL',  currency:'SGD', rate:60,  country:'SG', port:'SIN', equipment:'All', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'One per shipment', vendor:'SG PORT', cost:50, atCost:true },
    { code:'BAF',   name:'BAF (Fuel)',               category:'Freight', mode:'Sea FCL', unit:'per CTR', currency:'USD', rate:80, country:'-', port:'-', equipment:'All', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Carrier published', vendor:'MAERSK', cost:70, atCost:false },
  ];
  try{ localStorage.setItem('chargesLibrary', JSON.stringify(seed)); }catch{ /* ignore */ }
  return seed;
}
function saveChargesLibrary(rows){ if(typeof window==='undefined') return; try{ localStorage.setItem('chargesLibrary', JSON.stringify(rows)); }catch(e){ console.error(e); } }

/********************** Utilities **********************/
const money = (n)=> (Number(n)||0).toFixed(2);
function validate(item){
  const errors = {};
  if(!item.code) errors.code = 'Required';
  if(!item.name) errors.name = 'Required';
  if(!item.category) errors.category = 'Required';
  if(!item.unit) errors.unit = 'Required';
  if(!item.currency) errors.currency = 'Required';
  if(item.rate==='' || item.rate==null || isNaN(Number(item.rate))) errors.rate = 'Numeric';
  return errors;
}

/********************** Tariff Form (Dialog) **********************/
function TariffForm({ open, onClose, initial, onSave, codesInUse }){
  const BLANK = React.useMemo(()=>({ code:'', name:'', category:'Origin', mode:'Sea FCL', unit:'per BL', currency:'USD', rate:0, vendor:'', cost:0, atCost:false, active:true }),[]);
  const [item, setItem] = React.useState(()=> initial? { ...BLANK, ...initial } : BLANK);
  const [errors, setErrors] = React.useState({});

  React.useEffect(()=>{ setItem(initial? { ...BLANK, ...initial } : BLANK); setErrors({}); }, [initial, BLANK]);

  function commit(){
    const errs = validate(item);
    if(Object.keys(errs).length){ setErrors(errs); return; }
  const isNewCode = !initial || (initial.code !== item.code);
    if(isNewCode && codesInUse.includes(item.code)){
      setErrors({ ...errs, code: 'Already exists' });
      return;
    }
    onSave(item);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initial? 'Edit Tariff' : 'New Tariff'}</DialogTitle>
      <DialogContent dividers>
  <Box display="grid" gridTemplateColumns="repeat(4, minmax(0,1fr))" gap={2}>
          <TextField label="Code" value={item.code||''} onChange={e=>setItem(prev=>({ ...prev, code:e.target.value.trim().toUpperCase() }))} error={!!errors.code} helperText={errors.code||'Unique key'} />
          <FormControl>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={item.category||''} onChange={e=>setItem({...item, category:e.target.value})}>
              {CATEGORIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Mode</InputLabel>
            <Select label="Mode" value={item.mode||''} onChange={e=>setItem({...item, mode:e.target.value})}>
              {MODES.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Unit</InputLabel>
            <Select label="Unit" value={item.unit||''} onChange={e=>setItem({...item, unit:e.target.value})}>
              {UNITS.map(u=> <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Name" value={item.name||''} onChange={e=>setItem({...item, name:e.target.value})} error={!!errors.name} helperText={errors.name||''} sx={{ gridColumn:'1 / span 2' }} />
          <FormControl>
            <InputLabel>Currency</InputLabel>
            <Select label="Currency" value={item.currency||''} onChange={e=>setItem({...item, currency:e.target.value})}>
              {CURRENCIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Default Rate" type="number" value={item.rate||0} onChange={e=>setItem({...item, rate:Number(e.target.value||0)})} error={!!errors.rate} helperText={errors.rate||''} />

          <TextField label="Vendor" value={item.vendor||''} onChange={e=>setItem({...item, vendor:e.target.value})} />
          <TextField label="Cost" type="number" value={item.cost??''} onChange={e=>setItem({...item, cost: e.target.value===''? null : Number(e.target.value) })} />
          <Box display="flex" alignItems="center" gap={1}>
            <Checkbox checked={item.atCost===true} onChange={e=>setItem({...item, atCost:e.target.checked})}/>
            <Typography variant="body2">At Cost</Typography>
          </Box>
          <TextField label="Country" value={item.country||''} onChange={e=>setItem({...item, country:e.target.value.toUpperCase()})} />
          <TextField label="Port" value={item.port||''} onChange={e=>setItem({...item, port:e.target.value.toUpperCase()})} />

          <TextField label="Equipment" value={item.equipment||''} onChange={e=>setItem({...item, equipment:e.target.value})} />
          <TextField label="VAT %" type="number" value={item.vatPct??0} onChange={e=>setItem({...item, vatPct: Number(e.target.value||0) })} />
          <TextField label="Valid From" type="date" InputLabelProps={{ shrink:true }} value={item.validFrom||''} onChange={e=>setItem({...item, validFrom:e.target.value})} />
          <TextField label="Valid To" type="date" InputLabelProps={{ shrink:true }} value={item.validTo||''} onChange={e=>setItem({...item, validTo:e.target.value})} />

          <TextField label="Notes" value={item.notes||''} onChange={e=>setItem({...item, notes:e.target.value})} multiline minRows={2} sx={{ gridColumn:'1 / span 4' }} />
          <Box display="flex" alignItems="center" gap={1}><Checkbox checked={item.active!==false} onChange={e=>setItem({...item, active:e.target.checked})}/> <Typography variant="body2">Active</Typography></Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={commit} startIcon={<SaveIcon/>}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/********************** List Screen **********************/
class TariffErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={ error:null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(err, info){ console.error('TariffLibrary crashed', err, info); }
  render(){ if(this.state.error) return <Box p={2}><Alert severity="error" variant="filled">Tariff Library failed to load: {String(this.state.error.message||this.state.error)}</Alert></Box>; return this.props.children; }
}

export default function TariffLibrary(){
  const [rows, setRows] = React.useState(()=> loadChargesLibrary());
  const [snack,setSnack] = React.useState({ open:false, ok:true, msg:'' });

  const [q, setQ] = React.useState('');
  const [fCat, setFCat] = React.useState('');
  const [fMode, setFMode] = React.useState('');
  const [fCountry, setFCountry] = React.useState('');
  const [fPort, setFPort] = React.useState('');

  const filtered = React.useMemo(()=>{
    const needle = q.trim().toLowerCase();
    return rows.filter(r => !fCat || r.category===fCat)
               .filter(r => !fMode || r.mode===fMode)
               .filter(r => !fCountry || (r.country||'').toLowerCase().includes(fCountry.toLowerCase()))
               .filter(r => !fPort || (r.port||'').toLowerCase().includes(fPort.toLowerCase()))
               .filter(r => !needle || [r.code, r.name, r.port, r.country, r.equipment].filter(Boolean).some(v=> String(v).toLowerCase().includes(needle)));
  }, [rows, q, fCat, fMode, fCountry, fPort]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  function openNew(){ setEditing({ code:'', name:'', category:'Origin', mode:'Sea FCL', unit:'per BL', currency:'USD', rate:0, active:true }); setFormOpen(true); }
  function openEdit(row){ setEditing({ ...row }); setFormOpen(true); }
  function onSave(item){
    setRows(prev => {
      const idx = prev.findIndex(x=> x.code===item.code);
      let next;
      if(idx>=0){ next = prev.map(x=> x.code===item.code? item : x); }
      else { next = [item, ...prev]; }
      saveChargesLibrary(next);
      return next;
    });
    setFormOpen(false); setSnack({ open:true, ok:true, msg:'Saved.' });
  }
  function onDelete(code){
    const next = rows.filter(r=> r.code!==code);
    saveChargesLibrary(next); setRows(next);
    setSnack({ open:true, ok:true, msg:`Deleted ${code}.` });
  }
  function onDuplicate(row){
    const copy = { ...row, code: `${row.code}-COPY` };
    setEditing(copy); setFormOpen(true);
  }
  function exportJSON(){
    const blob = new Blob([JSON.stringify(rows,null,2)],{ type:'application/json' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download='charges_library.json'; a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(e){
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const parsed = JSON.parse(reader.result);
        if(!Array.isArray(parsed)) throw new Error('JSON must be an array');
        // merge by code (overwrite existing)
        const byCode = Object.fromEntries(rows.map(r=> [r.code,r]));
        for(const it of parsed){ if(it.code){ byCode[it.code] = it; } }
        const merged = Object.values(byCode);
        saveChargesLibrary(merged); setRows(merged);
        setSnack({ open:true, ok:true, msg:`Imported ${parsed.length} item(s).` });
      }catch(err){ setSnack({ open:true, ok:false, msg:'Import failed. '+err.message }); }
    };
    reader.readAsText(file);
    // reset input so same file can be imported again
    e.target.value = '';
  }

  // Component mount log removed to satisfy lint on missing deps/noise.

  const body = (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Card variant="outlined">
        <CardHeader title="Tariff Library" subheader="Maintain slower-changing Origin/Destination tariffs, plus optional Freight/Other" />
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField size="small" label="Search (code/name/port)" value={q} onChange={e=>setQ(e.target.value)} sx={{ minWidth:260 }} />
            <FormControl size="small" sx={{ minWidth:140 }}>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={fCat} onChange={e=>setFCat(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {CATEGORIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth:140 }}>
              <InputLabel>Mode</InputLabel>
              <Select label="Mode" value={fMode} onChange={e=>setFMode(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {MODES.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Country" value={fCountry} onChange={e=>setFCountry(e.target.value)} sx={{ width:120 }} />
            <TextField size="small" label="Port" value={fPort} onChange={e=>setFPort(e.target.value)} sx={{ width:120 }} />

            <Box flex={1} />
            <Tooltip title="Export JSON"><span><Button variant="outlined" startIcon={<FileDownloadIcon/>} onClick={exportJSON}>Export</Button></span></Tooltip>
            <Tooltip title="Import JSON">
              <label>
                <input type="file" accept="application/json" hidden onChange={importJSON} />
                <Button variant="outlined" startIcon={<FileUploadIcon/>} component="span">Import</Button>
              </label>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon/>} onClick={openNew}>New Tariff</Button>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title={`Items (${filtered.length})`} />
        <CardContent sx={{ pt:0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>At Cost</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Port</TableCell>
                <TableCell>Equip</TableCell>
                <TableCell align="right">VAT %</TableCell>
                <TableCell>Valid</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.code} hover>
                  <TableCell>{row.code}</TableCell>
                  <TableCell><Typography variant="body2" fontWeight={500}>{row.name}</Typography></TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.mode||'—'}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell align="right">{money(row.rate)}</TableCell>
                  <TableCell>{row.vendor||'—'}</TableCell>
                  <TableCell align="right">{money(row.cost)}</TableCell>
                  <TableCell>{row.atCost? <Chip size="small" label="At Cost" color="info"/> : ''}</TableCell>
                  <TableCell>{row.country||'—'}</TableCell>
                  <TableCell>{row.port||'—'}</TableCell>
                  <TableCell>{row.equipment||'—'}</TableCell>
                  <TableCell align="right">{Number(row.vatPct||0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{row.validFrom||'-'}{row.validTo? ` → ${row.validTo}`:''}</Typography>
                  </TableCell>
                  <TableCell align="center"><Checkbox size="small" checked={row.active!==false} onChange={()=>{
                    const next = rows.map(r=> r.code===row.code? { ...r, active: !(row.active!==false) } : r);
                    saveChargesLibrary(next); setRows(next);
                  }}/></TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit"><IconButton size="small" onClick={()=>openEdit(row)}><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                    <Tooltip title="Duplicate"><IconButton size="small" onClick={()=>onDuplicate(row)}><ContentCopyIcon fontSize="inherit"/></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" onClick={()=>onDelete(row.code)}><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length===0 && (
                <TableRow><TableCell colSpan={14}><Typography variant="body2" color="text.secondary">No items match filters.</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TariffForm
        open={formOpen}
        onClose={()=>setFormOpen(false)}
        initial={editing}
        onSave={onSave}
        codesInUse={rows.map(r=>r.code)}
      />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );

  return <TariffErrorBoundary>{body}</TariffErrorBoundary>;
}

/********************** Routes **********************/
// Add this route in your app router:
// <Route path="/tariffs" element={<TariffLibrary/>} />
