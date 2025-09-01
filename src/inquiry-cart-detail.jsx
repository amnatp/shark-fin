import React from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, TextField, IconButton, Button, Divider, Chip, Card, CardHeader, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, Snackbar, Alert, Checkbox, Tooltip, Grid, Autocomplete } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useCart } from './cart-context';

import { useAuth } from './auth-context';


function InquiryCartDetail() {
  function ROSChip({ value }){ const color = value>=20? 'success': value>=12? 'warning':'error'; return <Chip size="small" color={color} label={value.toFixed(1)+'%'} variant={value>=20?'filled':'outlined'} />; }

  const { grouped, update, remove, totals, items, clear } = useCart();
  const navigate = useNavigate();
  const { user, USERS } = useAuth();
  const [saveOpen, setSaveOpen] = React.useState(false);
  const CUSTOMER_OPTIONS = [
    { code:'CUSTA', name:'Customer A Co., Ltd.' },
    { code:'CUSTB', name:'Customer B Trading' },
    { code:'CUSTC', name:'Customer C Global' },
    { code:'CUSTD', name:'Customer D Logistics' }
  ];
  const [saveForm, setSaveForm] = React.useState(()=>({ customer:'', owner:'', mode:'Sea FCL', incoterm:'FOB', validityTo:'', rosTarget: Math.round(totals.ros||12) }));
  const [saveStatus, setSaveStatus] = React.useState({ open:false, ok:true, msg:'' });

  function genInquiryNo() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const location = user?.location || 'XXX';
    // Find last running number for this location+month
    let running = 1;
    try {
      const list = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      const prefix = `INQ-${location}${yy}${mm}`;
      const nums = list
        .map(x => x.id)
        .filter(id => id && id.startsWith(prefix))
        .map(id => parseInt(id.slice(prefix.length), 10))
        .filter(n => !isNaN(n));
      if(nums.length > 0) running = Math.max(...nums) + 1;
    } catch {}
    return `INQ-${location}${yy}${mm}${String(running).padStart(3,'0')}`;
  }

  function saveInquiries(){
    const base = { customer: saveForm.customer, owner: saveForm.owner, mode: saveForm.mode, incoterm: saveForm.incoterm, validityTo: saveForm.validityTo, rosTarget: saveForm.rosTarget };
    const selected = items.some(i=>i.special) ? items.filter(i=>i.special) : items; // if user marked special, treat those as chosen lines
    const uniqueLanes = Array.from(new Set(selected.map(i=> `${i.origin}→${i.destination}`)));
    const origin = uniqueLanes.length===1 ? uniqueLanes[0].split('→')[0] : 'MULTI';
    const destination = uniqueLanes.length===1 ? uniqueLanes[0].split('→')[1] : 'MULTI';
    const lines = selected.map(i=> ({
      rateId: i.id,
      vendor: i.vendor,
      carrier: i.carrier,
      origin: i.origin,
      destination: i.destination,
      basis: i.basis,
      containerType: i.containerType,
      qty: i.qty,
      sell: i.sell,
      margin: i.margin,
      ros: i.sell? (i.margin / i.sell) * 100 : 0
    }));
    const id = genInquiryNo();
    const inquiry = { id, origin, destination, volume: `${lines.length} line${lines.length>1?'s':''}`, weight:'', status:'Draft', creditOk:true, notes:`Created from cart with ${lines.length} selected line${lines.length>1?'s':''}.`, lines, ...base };
    try {
      const existing = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
      localStorage.setItem('savedInquiries', JSON.stringify([inquiry, ...existing]));
      setSaveOpen(false);
      clear();
      setSaveStatus({ open:true, ok:true, msg:`Saved inquiry ${inquiry.id}; cart cleared.` });
    } catch(err){
      console.error('Failed saving inquiry', err);
      setSaveStatus({ open:true, ok:false, msg:'Failed to save inquiry.' });
    }
  }

  function exportQuotation(){
    const payload = {
      type: 'quotationDraft',
      createdAt: new Date().toISOString(),
      items: items.map(({ id, vendor, carrier, origin, destination, sell, margin, qty })=>({ id, vendor, carrier, origin, destination, sell, margin, qty })),
      totals,
      groups: grouped.map(g=> ({ od: g.key, count: g.list.length }))
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='quotation_draft.json'; a.click(); URL.revokeObjectURL(url);
  }

  // Removed procurement request feature (now initiated from Inquiry Edit screen)

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={()=>navigate(-1)} size="small"><ArrowBackIcon fontSize="inherit" /></IconButton>
          <Typography variant="h6">Inquiry Cart Detail</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" disabled={items.length===0} onClick={()=>setSaveOpen(true)}>Save as Inquiry</Button>
          <Button variant="contained" startIcon={<DescriptionIcon />} disabled={items.length===0} onClick={exportQuotation}>Export JSON</Button>
        </Box>
      </Box>
      {grouped.length===0 && <Typography variant="body2" color="text.secondary">Cart empty. Add rates from Inquiry Cart Builder.</Typography>}
      {grouped.map(group => (
        <Card key={group.key} variant="outlined">
          <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title={group.key} />
          <CardContent sx={{ pt:0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rate</TableCell>
                  <TableCell>Container</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="center">Disc</TableCell>
                  <TableCell align="center">ROS</TableCell>
                  <TableCell align="center">Special?</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.list.map(item=>{ const effSell=item.sell-(item.discount||0); const effMargin=item.margin-(item.discount||0); const ros= effSell? (effMargin/effSell)*100:0; return (
                  <TableRow key={item.id} hover selected={item.special}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{item.vendor}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontWeight={500} display="block">{item.containerType || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.basis}</Typography>
                    </TableCell>
                    <TableCell align="right">{effSell.toFixed(2)}</TableCell>
                    <TableCell align="right">{effMargin.toFixed(2)}</TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={item.qty} onChange={e=>update(item.id,{ qty:Number(e.target.value||1)})} inputProps={{ min:1 }} sx={{ width:60 }}/></TableCell>
                    <TableCell align="center"><TextField type="number" size="small" value={item.discount} onChange={e=>update(item.id,{ discount:Number(e.target.value||0)})} inputProps={{ min:0, step:0.01 }} sx={{ width:70 }}/></TableCell>
                    <TableCell align="center"><ROSChip value={ros} /></TableCell>
                    <TableCell align="center">
                      <Tooltip title={item.special? 'Marked for special request':'Mark for special rate'}>
                        <Checkbox size="small" color="warning" checked={!!item.special} onChange={()=>update(item.id,{ special: !item.special })} />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center"><IconButton size="small" onClick={()=>remove(item.id)}><DeleteIcon fontSize="inherit" /></IconButton></TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {items.length>0 && (
        <>
          <Divider />
          <Box display="flex" justifyContent="space-between" flexWrap="wrap" rowGap={1} columnGap={3} fontSize={14}>
            <Box display="flex" gap={3}>
              <Box>Sell: <strong>{totals.sell.toFixed(2)}</strong></Box>
              <Box>Margin: <strong>{totals.margin.toFixed(2)}</strong></Box>
              <Box>ROS: <strong>{totals.ros.toFixed(1)}%</strong></Box>
            </Box>
            <Box display="flex" gap={2} fontSize={13} color="text.secondary">
              {totals.units?.containers>0 && <span>Containers: <strong>{totals.units.containers}</strong></span>}
              {totals.units?.teu>0 && <span>TEU: <strong>{totals.units.teu.toFixed(2)}</strong></span>}
              {totals.units?.kg>0 && <span>KG Qty: <strong>{totals.units.kg}</strong></span>}
            </Box>
          </Box>
        </>
      )}
      <Dialog open={saveOpen} onClose={()=>setSaveOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Save Cart as Inquiry</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>Convert current cart lines into draft inquiry records for later pricing. You can create one inquiry per origin/destination lane or a single combined inquiry.</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={(user?.role === 'Pricing')
                  ? CUSTOMER_OPTIONS
                  : CUSTOMER_OPTIONS.filter(c=> !user?.allowedCustomers || user.allowedCustomers.includes(c.code))}
                getOptionLabel={(o)=> o.code + ' – ' + o.name}
                value={CUSTOMER_OPTIONS.find(c=> c.code===saveForm.customer) || null}
                onChange={(e,v)=> setSaveForm(f=>({...f, customer: v? v.code : '' }))}
                renderInput={(params)=><TextField {...params} label="Customer" />}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={USERS.filter(u=>u.role==='Sales').map(u=>({ username:u.username, display:u.display }))}
                getOptionLabel={o=> o.display || o.username}
                value={USERS.find(u=>u.username===saveForm.owner) || null}
                onChange={(_,v)=> setSaveForm(f=>({...f, owner: v? v.username : '' }))}
                renderInput={(params)=><TextField {...params} label="Sales Owner" />}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}><FormControl size="small" fullWidth><InputLabel>Mode</InputLabel><Select label="Mode" value={saveForm.mode} onChange={e=>setSaveForm(f=>({...f,mode:e.target.value}))}>{['Sea FCL','Sea LCL','Air','Transport','Customs'].map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} sm={2}><TextField label="Incoterm" size="small" fullWidth value={saveForm.incoterm} onChange={e=>setSaveForm(f=>({...f,incoterm:e.target.value}))} /></Grid>
            <Grid item xs={6} sm={2}><TextField label="ROS Target %" type="number" size="small" fullWidth value={saveForm.rosTarget} onChange={e=>setSaveForm(f=>({...f,rosTarget:Number(e.target.value||0)}))} /></Grid>
            <Grid item xs={12} sm={4}><TextField label="Validity To" type="date" size="small" fullWidth InputLabelProps={{ shrink:true }} value={saveForm.validityTo} onChange={e=>setSaveForm(f=>({...f,validityTo:e.target.value}))} /></Grid>
            {/* Removed split-by-lane option; always one inquiry containing selected lines */}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Lines in cart: {items.length} • Unique lanes: {grouped.length} • Mark some lines as Special to limit saved lines, otherwise all lines included.</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setSaveOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" disabled={!items.length || !saveForm.customer} onClick={saveInquiries}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={saveStatus.open} autoHideDuration={4000} onClose={()=>setSaveStatus(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert severity={saveStatus.ok? 'success':'error'} variant="filled" onClose={()=>setSaveStatus(s=>({...s,open:false}))}>{saveStatus.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

export default InquiryCartDetail;




