import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Chip, IconButton, Tooltip, Drawer, Divider, TextField, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { seedSampleSeaShipments } from './sea-shipment-seed';
import { normalizeAllData } from './data-normalizer';

function parseJSON(key, fallback){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function formatDate(d){ if(!d) return '-'; try { return new Date(d).toLocaleDateString(); } catch { return d; } }

export default function SeaShipmentList(){
  const navigate = useNavigate();
  const [rows, setRows] = React.useState(()=> parseJSON('seaShipments', []));
  const [selection, setSelection] = React.useState([]);
  const [preview, setPreview] = React.useState(null);
  const [searchText, setSearchText] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState(''); // '' = All, 'Draft', 'Ready for BL'
  const [from, setFrom] = React.useState(''); // ETD from (yyyy-MM-dd)
  const [to, setTo] = React.useState('');   // ETD to (yyyy-MM-dd)

  React.useEffect(()=>{
    function onUpdate(){ setRows(parseJSON('seaShipments', [])); }
    window.addEventListener('storage', onUpdate);
    // Auto-seed on first visit if empty
    try {
      const initial = parseJSON('seaShipments', []);
      const flagged = localStorage.getItem('seaShipmentsAutoSeeded');
      if((!initial || initial.length===0) && !flagged){
        const next = seedSampleSeaShipments();
  try { localStorage.setItem('seaShipmentsAutoSeeded', 'true'); } catch(e){ console.warn('Failed to set auto-seed flag', e); }
        setRows(next);
      }
    } catch{/* ignore */}
    return ()=> window.removeEventListener('storage', onUpdate);
  },[]);

  const columns = [
    { field:'id', headerName:'Shipment ID', width:160 },
    { field:'status', headerName:'Status', width:120, renderCell:(p)=> <Chip size="small" color={p.value==='Ready for BL' ? 'success':'default'} label={p.value||'Draft'} /> },
    { field:'bookingId', headerName:'Booking ID', width:140 },
    { field:'carrier', headerName:'Carrier', width:140, valueGetter:(v,r)=> r.transport?.carrier || '-' },
    { field:'vv', headerName:'Vessel/Voy', width:160, valueGetter:(v,r)=>{
      const t=r.transport||{}; const vsl=t.vessel||''; const voy=t.voyage||''; return [vsl,voy].filter(Boolean).join(' / ')||'-';
    } },
    { field:'lane', headerName:'Lane', width:150, valueGetter:(v,r)=> `${r.transport?.pol||'-'} → ${r.transport?.pod||'-'}` },
    { field:'etd', headerName:'ETD', width:110, valueGetter:(v,r)=> formatDate(r.transport?.etd) },
    { field:'eta', headerName:'ETA', width:110, valueGetter:(v,r)=> formatDate(r.transport?.eta) },
    { field:'containers', headerName:'Containers', width:160, valueGetter:(v,r)=>{
      const c=r.containers||{}; const c20=c['20DC']||0, c40=c['40DC']||0, c40h=c['40HC']||0; const total = c20+c40+c40h; const parts=[]; if(c20) parts.push(`${c20}×20`); if(c40) parts.push(`${c40}×40`); if(c40h) parts.push(`${c40h}×40HC`); return total? `${total} (${parts.join(', ')})`:'0';
    } },
    { field:'flags', headerName:'Flags', width:130, renderCell:(p)=> {
      const chips=[]; if(p.row.isDG) chips.push(<Chip key="dg" size="small" label="DG" color="warning" sx={{ mr:0.5 }}/>) ; if(p.row.isReefer) chips.push(<Chip key="rf" size="small" label="Reefer" sx={{ mr:0.5 }}/>); return <Box>{chips}</Box>;
    }},
    { field:'actions', headerName:'Actions', width:120, sortable:false, renderCell:(params)=> (
      <Box>
        <Tooltip title="Preview">
          <IconButton size="small" onClick={()=> setPreview(params.row)}>
            <DescriptionIcon fontSize="small"/>
          </IconButton>
        </Tooltip>
        <Tooltip title="Open">
          <IconButton size="small" onClick={()=>{
            const sid=params.row.id; const bid=params.row.bookingId; const path = bid? `/sea-shipment/${bid}?sid=${encodeURIComponent(sid)}` : `/sea-shipment?sid=${encodeURIComponent(sid)}`; navigate(path);
          }}>
            <VisibilityIcon fontSize="small"/>
          </IconButton>
        </Tooltip>
      </Box>
    )}
  ];

  function handleDelete(){
    if(selection.length===0) return;
    const next = rows.filter(r=> !selection.includes(r.id));
  try { localStorage.setItem('seaShipments', JSON.stringify(next)); } catch(e){ console.warn('Failed to persist seaShipments:', e); }
    setRows(next); setSelection([]);
  }

  const filteredRows = React.useMemo(()=>{
    const txt = searchText.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() : null;
    return rows.filter(r=>{
      const statusVal = r.status || 'Draft';
      if(statusFilter && statusVal !== statusFilter) return false;
      const etdTs = r.transport?.etd ? new Date(r.transport.etd).getTime() : null;
      if(fromTs && (etdTs==null || etdTs < fromTs)) return false;
      if(toTs && (etdTs==null || etdTs > toTs)) return false;
      if(!txt) return true;
      const t = r.transport||{};
      const hay = [r.id, r.bookingId, t.carrier, t.vessel, t.voyage, t.pol, t.pod].map(v=> String(v||'').toLowerCase()).join(' ');
      return hay.includes(txt);
    });
  }, [rows, searchText, statusFilter, from, to]);

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6">Sea Shipments</Typography>
          <Typography variant="caption" color="text.secondary">{filteredRows.length} record{filteredRows.length!==1?'s':''}</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={()=>{
            const header=['Shipment ID','Status','Booking ID','Carrier','Vessel','Voyage','POL','POD','ETD','ETA','20DC','40DC','40HC','DG','Reefer'];
            const lines = filteredRows.map(r=>{
              const t=r.transport||{}; const c=r.containers||{};
              return [r.id, r.status||'Draft', r.bookingId||'', t.carrier||'', t.vessel||'', t.voyage||'', t.pol||'', t.pod||'', t.etd||'', t.eta||'', c['20DC']||0, c['40DC']||0, c['40HC']||0, r.isDG? 'Y':'N', r.isReefer? 'Y':'N'];
            });
            const csv = [header, ...lines].map(arr=> arr.map(v=> `${String(v).replaceAll('"','""')}`).map(v=> (/[,"\n]/.test(v)? '"'+v+'"': v)).join(',')).join('\n');
            const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'sea-shipments.csv'; a.click(); URL.revokeObjectURL(url);
          }}>Export CSV</Button>
          {import.meta.env.DEV && (
            <>
              <Button variant="outlined" onClick={()=>{ const next = seedSampleSeaShipments(); setRows(next); }}>Seed Sample Data</Button>
              <Button variant="outlined" onClick={()=>{ normalizeAllData(); setRows(parseJSON('seaShipments', [])); }}>Normalize Data</Button>
            </>
          )}
          {selection.length>0 && (
            <Button variant="outlined" color="error" startIcon={<DeleteIcon/>} onClick={handleDelete}>Delete ({selection.length})</Button>
          )}
          <Button variant="contained" startIcon={<AddIcon/>} onClick={()=> navigate('/sea-shipment')}>New Sea Shipment</Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField size="small" label="Search" placeholder="ID, Booking, Carrier, POL/POD, Vessel/Voyage" value={searchText} onChange={e=> setSearchText(e.target.value)} sx={{ minWidth: 260 }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={e=> setStatusFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Ready for BL">Ready for BL</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="ETD From" InputLabelProps={{ shrink: true }} value={from} onChange={e=> setFrom(e.target.value)} />
            <TextField size="small" type="date" label="ETD To" InputLabelProps={{ shrink: true }} value={to} onChange={e=> setTo(e.target.value)} />
            <Button onClick={()=>{ setSearchText(''); setStatusFilter(''); setFrom(''); setTo(''); }}>Clear Filters</Button>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              getRowId={(r)=> r.id}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={(m)=> setSelection(Array.isArray(m)? m: [])}
              pageSizeOptions={[10,25,50]}
              initialState={{ pagination:{ paginationModel:{ pageSize:25 } } }}
              hideFooter
            />
          </Box>
        </CardContent>
      </Card>

      {/* Preview Drawer */}
      <Drawer anchor="right" open={!!preview} onClose={()=> setPreview(null)} sx={{ '& .MuiDrawer-paper': { width: 360 } }}>
        <Box p={2} display="flex" flexDirection="column" gap={1}>
          <Typography variant="h6">Shipment Summary</Typography>
          <Divider />
          {preview ? (
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography variant="subtitle2">ID</Typography>
              <Typography variant="body2">{preview.id}</Typography>
              <Typography variant="subtitle2" sx={{ mt:1 }}>Status</Typography>
              <Chip size="small" label={preview.status||'Draft'} color={preview.status==='Ready for BL' ? 'success':'default'} sx={{ alignSelf:'flex-start' }}/>
              <Typography variant="subtitle2" sx={{ mt:1 }}>Lane</Typography>
              <Typography variant="body2">{preview.transport?.pol || '-'} → {preview.transport?.pod || '-'}</Typography>
              <Typography variant="subtitle2" sx={{ mt:1 }}>Carrier / Vsl-Voy</Typography>
              <Typography variant="body2">{preview.transport?.carrier || '-'} • {(preview.transport?.vessel || '-')}/{(preview.transport?.voyage || '-')}</Typography>
              <Typography variant="subtitle2" sx={{ mt:1 }}>ETD / ETA</Typography>
              <Typography variant="body2">{formatDate(preview.transport?.etd)} → {formatDate(preview.transport?.eta)}</Typography>
              <Typography variant="subtitle2" sx={{ mt:1 }}>Containers</Typography>
              <Typography variant="body2">20: {preview.containers?.['20DC']||0} • 40: {preview.containers?.['40DC']||0} • 40HC: {preview.containers?.['40HC']||0}</Typography>
              <Typography variant="subtitle2" sx={{ mt:1 }}>Flags</Typography>
              <Box>
                {preview.isDG && <Chip size="small" label="DG" color="warning" sx={{ mr:0.5 }}/>} 
                {preview.isReefer && <Chip size="small" label="Reefer" sx={{ mr:0.5 }}/>} 
                {!preview.isDG && !preview.isReefer && <Typography variant="caption" color="text.secondary">None</Typography>}
              </Box>
              {preview.notes && (
                <>
                  <Typography variant="subtitle2" sx={{ mt:1 }}>Notes</Typography>
                  <Typography variant="body2" sx={{ whiteSpace:'pre-wrap' }}>{preview.notes}</Typography>
                </>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Select a shipment to preview.</Typography>
          )}
          <Box flexGrow={1} />
          <Button variant="contained" onClick={()=> setPreview(null)}>Close</Button>
        </Box>
      </Drawer>
    </Box>
  );
}
