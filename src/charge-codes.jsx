import React from 'react';
import { Box, Card, CardHeader, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function loadCodes(){
  try{ const raw = localStorage.getItem('chargeCodes'); if(!raw) return seed(); const parsed = JSON.parse(raw); if(Array.isArray(parsed)) return parsed; }catch(e){ console.warn('loadCodes failed', e); }
  return seed();
}
function seed(){
  const s = [ { code:'FRT', name:'Freight', description:'Base freight charge (per container)', active:true }, { code:'THC', name:'Terminal Handling Charge', description:'Terminal handling at origin/destination', active:true } ];
  try{ localStorage.setItem('chargeCodes', JSON.stringify(s)); }catch(e){}
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
  }
  function del(code){ if(!confirm(`Delete ${code}?`)) return; const next = codes.filter(c=> c.code!==code); saveCodes(next); setCodes(next); setSnack({ open:true, ok:true, msg:'Deleted.' }); }

  function exportJSON(){ const blob = new Blob([JSON.stringify(codes,null,2)],{ type:'application/json' }); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='charge_codes.json'; a.click(); URL.revokeObjectURL(url); }
  function importJSON(e){ const file = e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ try{ const parsed=JSON.parse(r.result); if(!Array.isArray(parsed)) throw new Error('Array expected'); const byCode=Object.fromEntries(codes.map(c=> [c.code,c])); for(const it of parsed) if(it.code) byCode[it.code]=it; const merged=Object.values(byCode); saveCodes(merged); setCodes(merged); setSnack({ open:true, ok:true, msg:`Imported ${parsed.length}` }); }catch(err){ setSnack({ open:true, ok:false, msg:'Import failed: '+err.message }); } }; r.readAsText(file); e.target.value=''; }

  return (
    <Box p={2}>
      <Card variant="outlined">
        <CardHeader title="Charge Codes" subheader="Manage the set of charge codes used in rates and carts" action={(
          <Box display="flex" gap={1}>
            <input type="file" accept="application/json" hidden id="charge-import" onChange={importJSON} />
            <label htmlFor="charge-import"><Button startIcon={<FileUploadIcon/>} component="span">Import</Button></label>
            <Button startIcon={<FileDownloadIcon/>} onClick={exportJSON}>Export</Button>
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
    </Box>
  );
}
