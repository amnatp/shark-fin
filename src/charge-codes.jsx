import React from 'react';
import { Box, Card, CardHeader, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert, Typography, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RuleIcon from '@mui/icons-material/Rule';
import ReplayIcon from '@mui/icons-material/Replay';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { backupChargeCodeStores, runChargeCodeMigration, applyChargeCodeMappings } from './migrations/chargeCodeMigration';

function loadCodes(){
  try{ const raw = localStorage.getItem('chargeCodes'); if(!raw) return seed(); const parsed = JSON.parse(raw); if(Array.isArray(parsed)) return parsed; }catch(e){ console.warn('loadCodes failed', e); }
  return seed();
}
function seed(){
  const s = [ { code:'FRT', name:'Freight', description:'Base freight charge (per container)', active:true }, { code:'THC', name:'Terminal Handling Charge', description:'Terminal handling at origin/destination', active:true } ];
  try{ localStorage.setItem('chargeCodes', JSON.stringify(s)); }catch(e){ console.debug('seed: persist chargeCodes failed', e); }
  return s;
}
function saveCodes(codes){ try{ localStorage.setItem('chargeCodes', JSON.stringify(codes)); }catch(e){ console.error(e); } }

function CodeForm({ open, initial, onClose, onSave, codesInUse }){
  const [item, setItem] = React.useState(initial || { code:'', name:'', description:'', active:true });
  React.useEffect(()=> setItem(initial || { code:'', name:'', description:'', active:true }), [initial]);
  function commit(){
    if(!item.code || !item.name) return; const isNew = !initial || initial.code!==item.code; if(isNew && codesInUse.includes(item.code)){ alert('Code already exists'); return; }
    onSave({ ...item, code: String(item.code).trim().toUpperCase() });
  }
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial? 'Edit Charge Code' : 'New Charge Code'}</DialogTitle>
      <DialogContent>
        <Box display="flex" gap={2} flexDirection="column" mt={1}>
          <TextField label="Code" value={item.code||''} onChange={e=>setItem({...item, code:e.target.value.toUpperCase() })} />
          <TextField label="Name" value={item.name||''} onChange={e=>setItem({...item, name:e.target.value })} />
          <TextField label="Description" value={item.description||''} onChange={e=>setItem({...item, description:e.target.value })} multiline minRows={2} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={commit}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ChargeCodes(){
  const [codes, setCodes] = React.useState(()=> loadCodes());
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });
  // migration UI state
  const [migOpen, setMigOpen] = React.useState(false);
  const [migRunning, setMigRunning] = React.useState(false);
  const [migReport, setMigReport] = React.useState(null);
  const [migBackups, setMigBackups] = React.useState(null);
  const [selections, setSelections] = React.useState({}); // key -> chosen code

  function newCode(){ setEditing(null); setOpen(true); }
  function editCode(c){ setEditing(c); setOpen(true); }
  function save(code){
    setCodes(prev => {
      const idx = prev.findIndex(p=> p.code===code.code);
      let next;
      if(idx>=0) next = prev.map(p=> p.code===code.code? code : p);
      else next = [code, ...prev];
      saveCodes(next); return next;
    });
    setOpen(false); setSnack({ open:true, ok:true, msg:'Saved.' });
      try{ window.dispatchEvent(new Event('chargeCodesUpdated')); }catch(e){ console.debug('dispatch chargeCodesUpdated failed after save', e); }
  }
  function del(code){ if(!confirm(`Delete ${code}?`)) return; const next = codes.filter(c=> c.code!==code); saveCodes(next); setCodes(next); setSnack({ open:true, ok:true, msg:'Deleted.' }); }

  function exportJSON(){ const blob = new Blob([JSON.stringify(codes,null,2)],{ type:'application/json' }); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='charge_codes.json'; a.click(); URL.revokeObjectURL(url); }
  function importJSON(e){ const file = e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ try{ const parsed=JSON.parse(r.result); if(!Array.isArray(parsed)) throw new Error('Array expected'); const byCode=Object.fromEntries(codes.map(c=> [c.code,c])); for(const it of parsed) if(it.code) byCode[it.code]=it; const merged=Object.values(byCode); saveCodes(merged); setCodes(merged); setSnack({ open:true, ok:true, msg:`Imported ${parsed.length}` }); }catch(err){ setSnack({ open:true, ok:false, msg:'Import failed: '+err.message }); } }; r.readAsText(file); e.target.value=''; }
  // notify other components
  React.useEffect(()=>{ try{ window.dispatchEvent(new Event('chargeCodesUpdated')); }catch(e){ console.debug('dispatch chargeCodesUpdated failed after codes change', e); } }, [codes]);

  function keyOf(row){
    if(row.type==='localCharges') return `${row.type}:${row.index}`;
    if(row.type==='tariffs') return `${row.type}:${row.id}`;
    if(row.type==='managedRates') return `${row.type}:${row.mode}:${row.index}`;
    if(row.type==='quotations') return `${row.type}:${row.id}:${row.lineIndex}`;
    return JSON.stringify(row);
  }
  function startMigration(){
    try{
      const backups = backupChargeCodeStores();
      setMigBackups(backups);
      setMigRunning(true);
      // First pass: auto-apply exact matches
      const report = runChargeCodeMigration({ applyExact: true, dryRun: false });
      setMigReport(report);
      setMigOpen(true);
      setSnack({ open:true, ok:true, msg:`Charge code scan complete. Applied ${report.summary.localCharges.applied + report.summary.tariffs.applied + report.summary.managedRates.applied + report.summary.quotations.applied}.` });
    } catch(err){
      console.error('Migration failed to start', err);
      setSnack({ open:true, ok:false, msg:'Migration failed to start: '+ String(err) });
    } finally {
      setMigRunning(false);
    }
  }
  function reScan(){
    try{
      setMigRunning(true);
      const report = runChargeCodeMigration({ applyExact: false, dryRun: true });
      setMigReport(report);
    } finally { setMigRunning(false); }
  }
  function applySelected(){
    if(!migReport) return;
    const chosen = Object.entries(selections).map(([k,v])=> ({ key:k, chosen:v })).filter(x=> !!x.chosen);
    if(!chosen.length){ setSnack({ open:true, ok:false, msg:'Select mappings to apply.' }); return; }
    const list = [];
    for(const row of migReport.ambiguous){
      const k = keyOf(row);
      const chosenCode = selections[k];
      if(!chosenCode) continue;
      if(row.type==='localCharges') list.push({ type:'localCharges', index: row.index, chosen: chosenCode });
      else if(row.type==='tariffs') list.push({ type:'tariffs', id: row.id, chosen: chosenCode });
      else if(row.type==='managedRates') list.push({ type:'managedRates', mode: row.mode, index: row.index, id: row.id||null, chosen: chosenCode });
      else if(row.type==='quotations') list.push({ type:'quotations', id: row.id, lineIndex: row.lineIndex, chosen: chosenCode });
    }
    if(!list.length){ setSnack({ open:true, ok:false, msg:'No selections to apply.' }); return; }
    const res = applyChargeCodeMappings(list);
    setSnack({ open:true, ok:true, msg:`Applied ${res.applied}/${res.total} mappings.` });
    // Re-scan to refresh state
    reScan();
  }

  return (
    <Box p={2}>
      <Card variant="outlined">
        <CardHeader title="Charge Codes" subheader="Manage the set of charge codes used in rates and carts" action={(
          <Box display="flex" gap={1}>
            <input type="file" accept="application/json" hidden id="charge-import" onChange={importJSON} />
            <label htmlFor="charge-import"><Button startIcon={<FileUploadIcon/>} component="span">Import</Button></label>
            <Button startIcon={<FileDownloadIcon/>} onClick={exportJSON}>Export</Button>
            <Button color="secondary" startIcon={<RuleIcon/>} onClick={startMigration} disabled={migRunning} title="Scan and backfill legacy charge codes">Migrate Legacy Data</Button>
            <Button variant="contained" startIcon={<AddIcon/>} onClick={newCode}>New</Button>
          </Box>
        )} />
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Code</TableCell><TableCell>Name</TableCell><TableCell>Description</TableCell><TableCell align="right">Actions</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {codes.map(c=> (
                <TableRow key={c.code} hover>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit"><IconButton size="small" onClick={()=>editCode(c)}><EditIcon/></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" onClick={()=>del(c.code)}><DeleteIcon/></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CodeForm open={open} initial={editing} onClose={()=>setOpen(false)} onSave={save} codesInUse={codes.map(c=>c.code)} />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack(s=>({...s,open:false}))}>
        <Alert severity={snack.ok? 'success' : 'error'} onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>

      <Dialog open={migOpen} onClose={()=>setMigOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Charge Code Migration</DialogTitle>
        <DialogContent dividers>
          {migRunning && <Typography variant="body2">Running scan...</Typography>}
          {!migRunning && migReport && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="body2">Backups created:</Typography>
              <Box sx={{ fontFamily:'monospace', fontSize:12, bgcolor:'background.default', p:1, borderRadius:1 }}>
                {migBackups && Object.entries(migBackups).map(([k,v])=> (
                  <div key={k}>{k} → {v}</div>
                ))}
              </Box>
              <Divider />
              <Typography variant="subtitle2">Summary</Typography>
              <Box sx={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:1, fontSize:13 }}>
                <Box>Local Charges: {migReport.summary.localCharges.scanned} scanned • {migReport.summary.localCharges.applied} auto-fixed</Box>
                <Box>Tariffs: {migReport.summary.tariffs.scanned} scanned • {migReport.summary.tariffs.applied} auto-fixed</Box>
                <Box>Managed Rates: {migReport.summary.managedRates.scanned} scanned • {migReport.summary.managedRates.applied} auto-fixed</Box>
                <Box>Quotations: {migReport.summary.quotations.scanned} scanned • {migReport.summary.quotations.applied} auto-fixed</Box>
              </Box>
              <Divider />
              <Typography variant="subtitle2">Ambiguous mappings ({migReport.ambiguous.length})</Typography>
              {!migReport.ambiguous.length && <Typography variant="caption" color="text.secondary">None</Typography>}
              {!!migReport.ambiguous.length && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Context</TableCell>
                      <TableCell>Current</TableCell>
                      <TableCell>Choose Code</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {migReport.ambiguous.map((r,ix)=>{
                      const k = keyOf(r);
                      const options = Array.from(new Set([...(r.candidates||[]), ...codes.map(c=>c.code)]));
                      const ctx = r.type==='localCharges' ? `#${r.index}` : r.type==='tariffs' ? r.id : r.type==='managedRates' ? `${r.mode} #${r.index}` : r.type==='quotations' ? `${r.id} • line ${r.lineIndex}` : '';
                      return (
                        <TableRow key={k+':'+ix}>
                          <TableCell>{r.type}</TableCell>
                          <TableCell>{ctx}</TableCell>
                          <TableCell>{r.current}</TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth:180 }}>
                              <InputLabel id={`sel-${ix}`}>Code</InputLabel>
                              <Select labelId={`sel-${ix}`} label="Code" value={selections[k]||''} onChange={e=> setSelections(s=> ({ ...s, [k]: e.target.value }))}>
                                <MenuItem value=""><em>Pick…</em></MenuItem>
                                {options.map(opt=> (<MenuItem key={opt} value={opt}>{opt}</MenuItem>))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Divider />
              <Typography variant="subtitle2">Unknown items ({migReport.unknown.length})</Typography>
              {!migReport.unknown.length && <Typography variant="caption" color="text.secondary">None</Typography>}
              {!!migReport.unknown.length && (
                <Box sx={{ fontSize:12, maxHeight:160, overflow:'auto', p:1, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                  {migReport.unknown.slice(0,100).map((u,ix)=> (
                    <div key={ix}>
                      {u.type}: {u.type==='localCharges'? `#${u.index}` : u.type==='tariffs'? u.id : u.type==='managedRates'? `${u.mode} #${u.index}` : u.type==='quotations'? `${u.id} • line ${u.lineIndex}` : ''} — <strong>{u.current}</strong>
                    </div>
                  ))}
                  {migReport.unknown.length>100 && <Typography variant="caption" color="text.secondary">…and {migReport.unknown.length-100} more</Typography>}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ReplayIcon/>} onClick={reScan} disabled={migRunning}>Re-scan</Button>
          <Box flexGrow={1} />
          <Button onClick={()=>setMigOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<DoneAllIcon/>} onClick={applySelected} disabled={migRunning || !(migReport && migReport.ambiguous.length)}>Apply Selected</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
