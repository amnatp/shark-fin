import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Button, Chip, Table, TableHead, TableRow, TableCell, TableBody, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';

const CATEGORIES = ['Origin','Destination','Optional'];
const MODES = ['Sea FCL','Sea LCL','Air','Transport','Customs'];
const UNITS = ['per BL','per CTR','per KG','per CBM','per Shipment','per AWB'];
const CURRENCIES = ['USD','THB','SGD','CNY','EUR'];
const EQUIPMENT_TYPES = ['20GP','40GP','40HC','45HC','LCL','AIR','ALL'];

function loadLocalCharges(){
  if(typeof window === 'undefined') return [];
  try{
    const raw = localStorage.getItem('localChargesLibrary') || localStorage.getItem('chargesLibrary');
    if(!raw) return seed();
    const rows = JSON.parse(raw);
    if(Array.isArray(rows)) {
      // Migration: normalize equipment to equipmentList (array) and default to ['ALL'] if missing
      let changed = false;
      let migrated = rows.map(r => {
        let list = Array.isArray(r.equipmentList) ? r.equipmentList : [];
        if(!list.length){
          if(typeof r.equipment === 'string' && r.equipment.trim().length){
            list = r.equipment.split(/[,&/|]+/).map(s=> s.trim()).filter(Boolean);
          }
        }
        if(!list.length) list = ['ALL'];
        // normalize 'all' case
        list = list.map(x => (x.toUpperCase()==='ALL' ? 'ALL' : x));
        // dedupe
        list = Array.from(new Set(list));
        const changedRow = (!Array.isArray(r.equipmentList)) || (r.equipmentList.join(',') !== list.join(',')) || (r.equipment !== list.join(', '));
        if(changedRow){ changed = true; return { ...r, equipmentList: list, equipment: list.join(', ') }; }
        return r;
      }).filter(r=> r.category !== 'Freight');

      // Ensure sample rows with 2-3 equipment combinations exist
      const byCode = Object.fromEntries(migrated.map(r => [r.code, r]));
      const additions = [];
      if(!byCode['THC']) additions.push({ code:'THC', name:'Terminal Handling Charge', category:'Origin', mode:'Sea FCL', unit:'per CTR', currency:'THB', rate:3200, vendor:'THAI PORT', cost:3000, atCost:false, country:'TH', port:'BKK', equipmentList:['20GP','40HC'], equipment:'20GP, 40HC', vatPct:7, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Applies per container at origin terminal' });
      if(!byCode['DOF']) additions.push({ code:'DOF', name:'Destination D/O Fee', category:'Destination', mode:'Sea FCL', unit:'per BL', currency:'THB', rate:1500, vendor:'DEST AGENT', cost:1200, atCost:false, country:'TH', port:'LCH', equipmentList:['ALL'], equipment:'ALL', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Delivery Order issuance' });
      if(!byCode['OWS']) additions.push({ code:'OWS', name:'Warehouse Sorting', category:'Optional', mode:'Sea FCL', unit:'per Shipment', currency:'THB', rate:900, vendor:'3PL', cost:700, atCost:false, country:'TH', port:'BKK', equipmentList:['20GP','40GP','40HC'], equipment:'20GP, 40GP, 40HC', vatPct:7, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Optional warehouse sorting service' });
      if(additions.length){
        changed = true;
        migrated = [...additions, ...migrated];
      }
      if(changed){ try{ localStorage.setItem('localChargesLibrary', JSON.stringify(migrated)); localStorage.setItem('chargesLibrary', JSON.stringify(migrated)); }catch{/* ignore */} }
      return migrated;
    }
  }catch(e){ console.warn('Failed to parse local charges, reseeding', e); }
  return seed();
}
function seed(){
  const seedRows = [
    { code:'DOC', name:'Documentation / BL Fee', category:'Origin', mode:'Sea FCL', unit:'per BL', currency:'THB', rate:1000, country:'TH', port:'BKK', equipmentList:['20GP','40HC'], equipment:'20GP, 40HC', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'One per shipment', vendor:'THAI PORT', cost:800, atCost:true },
    { code:'THC', name:'Terminal Handling Charge', category:'Origin', mode:'Sea FCL', unit:'per CTR', currency:'THB', rate:3200, country:'TH', port:'BKK', equipmentList:['20GP','40HC'], equipment:'20GP, 40HC', vatPct:7, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Per container terminal handling', vendor:'THAI PORT', cost:3000, atCost:false },
    { code:'DOF', name:'Destination D/O Fee', category:'Destination', mode:'Sea FCL', unit:'per BL', currency:'THB', rate:1500, country:'TH', port:'LCH', equipmentList:['ALL'], equipment:'ALL', vatPct:0, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Delivery Order issuance', vendor:'DEST AGENT', cost:1200, atCost:false },
    { code:'OWS', name:'Warehouse Sorting', category:'Optional', mode:'Sea FCL', unit:'per Shipment', currency:'THB', rate:900, country:'TH', port:'BKK', equipmentList:['20GP','40GP','40HC'], equipment:'20GP, 40GP, 40HC', vatPct:7, validFrom:'2025-01-01', validTo:'2025-12-31', active:true, notes:'Optional warehouse sorting service', vendor:'3PL', cost:700, atCost:false }
  ];
  try{ localStorage.setItem('localChargesLibrary', JSON.stringify(seedRows)); }catch{ /* ignore quota */ }
  return seedRows;
}
function saveLocalCharges(rows){ if(typeof window==='undefined') return; try{ localStorage.setItem('localChargesLibrary', JSON.stringify(rows)); localStorage.setItem('chargesLibrary', JSON.stringify(rows)); }catch(e){ console.error(e); } }

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

function ChargeForm({ open, onClose, initial, onSave, codesInUse }){
  const BLANK = React.useMemo(()=>({ code:'', name:'', category:'Origin', mode:'Sea FCL', unit:'per BL', currency:'USD', rate:0, vendor:'', cost:0, atCost:false, active:true, equipmentList:['ALL'] }),[]);
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
    // Persist both equipmentList (array) and equipment (joined string) for compatibility
    const equipList = Array.isArray(item.equipmentList) ? item.equipmentList : ['ALL'];
    const normalized = { ...item, equipmentList: equipList, equipment: equipList.join(', ') };
    onSave(normalized);
  }
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initial? 'Edit Charge' : 'New Charge'}</DialogTitle>
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
          <FormControl>
            <InputLabel>Equipment (max 3)</InputLabel>
            <Select
              multiple
              label="Equipment (max 3)"
              value={item.equipmentList || []}
              onChange={e=>{
                let val = e.target.value;
                if(val.includes('ALL')) val = ['ALL'];
                if(val.length > 3) val = val.slice(0,3);
                setItem({...item, equipmentList: val});
              }}
              renderValue={(selected)=> selected.join(', ')}
            >
              {EQUIPMENT_TYPES.map(eq=> (
                <MenuItem key={eq} value={eq} disabled={item.equipmentList && item.equipmentList.length>=3 && !item.equipmentList.includes(eq) && !item.equipmentList.includes('ALL')}>
                  <Checkbox size="small" checked={item.equipmentList?.indexOf(eq) > -1} />
                  <Typography variant="body2" sx={{ ml:1 }}>{eq}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

class LocalChargeErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={ error:null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(err, info){ console.error('LocalCharge crashed', err, info); }
  render(){ if(this.state.error) return <Box p={2}><Alert severity="error" variant="filled">Local Charges failed to load: {String(this.state.error.message||this.state.error)}</Alert></Box>; return this.props.children; }
}

export default function LocalCharge(){
  const [rows, setRows] = React.useState(()=> loadLocalCharges());
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
               .filter(r => !needle || [r.code, r.name, r.port, r.country, Array.isArray(r.equipmentList)? r.equipmentList.join(' ') : r.equipment]
                 .filter(Boolean).some(v=> String(v).toLowerCase().includes(needle)));
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
      saveLocalCharges(next);
      return next;
    });
    setFormOpen(false); setSnack({ open:true, ok:true, msg:'Saved.' });
  }
  function onDelete(code){
    const next = rows.filter(r=> r.code!==code);
    saveLocalCharges(next); setRows(next);
    setSnack({ open:true, ok:true, msg:`Deleted ${code}.` });
  }
  function onDuplicate(row){
    const copy = { ...row, code: `${row.code}-COPY` };
    setEditing(copy); setFormOpen(true);
  }
  function exportJSON(){
    const blob = new Blob([JSON.stringify(rows,null,2)],{ type:'application/json' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download='local_charges.json'; a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(e){
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const parsed = JSON.parse(reader.result);
        if(!Array.isArray(parsed)) throw new Error('JSON must be an array');
        const byCode = Object.fromEntries(rows.map(r=> [r.code,r]));
        for(const it of parsed){ if(it.code){ byCode[it.code] = it; } }
        const merged = Object.values(byCode).filter(r=> r.category !== 'Freight');
        saveLocalCharges(merged); setRows(merged);
        setSnack({ open:true, ok:true, msg:`Imported ${parsed.length} item(s).` });
      }catch(err){ setSnack({ open:true, ok:false, msg:'Import failed. '+err.message }); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <LocalChargeErrorBoundary>
      <Box p={2} display="flex" flexDirection="column" gap={2}>
        <Card variant="outlined">
          <CardHeader title="Local Charges" subheader="Maintain origin/destination and optional charges (includes Customs). Freight excluded." />
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
              <Button variant="contained" startIcon={<AddIcon/>} onClick={openNew}>New Charge</Button>
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
                    <TableCell>
                      {Array.isArray(row.equipmentList) ? (
                        <Box sx={{ display:'flex', gap:0.5, flexWrap:'wrap' }}>
                          {row.equipmentList.map(eq => <Chip key={eq} size="small" label={eq} />)}
                        </Box>
                      ) : (row.equipment||'—')}
                    </TableCell>
                    <TableCell align="right">{Number(row.vatPct||0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{row.validFrom||'-'}{row.validTo? ` → ${row.validTo}`:''}</Typography>
                    </TableCell>
                    <TableCell align="center"><Checkbox size="small" checked={row.active!==false} onChange={()=>{
                      const next = rows.map(r=> r.code===row.code? { ...r, active: !(row.active!==false) } : r);
                      saveLocalCharges(next); setRows(next);
                    }}/></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" onClick={()=>openEdit(row)}><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                      <Tooltip title="Duplicate"><IconButton size="small" onClick={()=>onDuplicate(row)}><ContentCopyIcon fontSize="inherit"/></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={()=>onDelete(row.code)}><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length===0 && (
                  <TableRow><TableCell colSpan={17}><Typography variant="body2" color="text.secondary">No items match filters.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ChargeForm
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
    </LocalChargeErrorBoundary>
  );
}
