import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardHeader, CardContent, Typography, Grid, TextField, Button, IconButton, Chip, Divider,
  FormControlLabel, Checkbox, Snackbar, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/*
  Sea Shipment (simplified) – dedicated screen for Ocean shipments only.
  Reference: shipping-instruction.jsx (structure and UX cues), but trimmed to core sea fields.

  Data shape stored in localStorage key 'seaShipments':
  {
    id, bookingId, status, parties: { shipper:{name,address}, consignee:{name,address} },
    transport: { carrier, vessel, voyage, pol, pod, etd, eta, refNo },
    containers: { '20DC':number, '40DC':number, '40HC':number },
    notes, isDG, isReefer
  }
*/

function emptySeaShipment(base){
  return {
    id: `SEA-${Date.now().toString(36)}`,
    bookingId: base?.bookingId || '',
    status: 'Draft',
    parties: {
      shipper: { name: base?.customerName || '', address: '' },
      consignee: { name: base?.consignee?.name || '', address: '' }
    },
    transport: {
      carrier: base?.carrier || '',
      vessel: base?.vessel || '', voyage: base?.voyage || '',
      pol: base?.pol || base?.origin || '',
      pod: base?.pod || base?.destination || '',
      etd: base?.etd || '', eta: base?.eta || '',
      refNo: base?.bookingNo || base?.id || ''
    },
    containers: { '20DC': base?.containers?.['20DC'] || 0, '40DC': base?.containers?.['40DC'] || 0, '40HC': base?.containers?.['40HC'] || 0 },
    notes: '', isDG: false, isReefer: false
  };
}

export default function SeaShipment(){
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });

  const [sea, setSea] = React.useState(()=>{
    try {
      const sid = search.get('sid');
      const saved = JSON.parse(localStorage.getItem('seaShipments')||'[]');
      const byId = sid ? saved.find(s=> String(s.id)===String(sid)) : null;
      if(byId) return byId;
      const bookings = JSON.parse(localStorage.getItem('bookings')||'[]');
      // If a sea shipment already exists for this bookingId, load it; else prefill from booking
      const byBooking = saved.find(s=> bookingId && String(s.bookingId)===String(bookingId));
      if(byBooking) return byBooking;
      const bk = bookings.find(b=> String(b.id)===String(bookingId));
      return emptySeaShipment(bk || { id: '', bookingId });
    } catch { return emptySeaShipment({ id:'', bookingId }); }
  });

  function update(path, value){
    setSea(prev=>{
      const clone = JSON.parse(JSON.stringify(prev));
      const segs = path.split('.');
      let cur = clone; for(let i=0;i<segs.length-1;i++){ cur[segs[i]] = cur[segs[i]] ?? {}; cur = cur[segs[i]]; }
      cur[segs[segs.length-1]] = value; return clone;
    });
  }

  function validate(){
    const errs = [];
    if(!sea.transport.pol) errs.push('POL');
    if(!sea.transport.pod) errs.push('POD');
    const totalCtr = (Number(sea.containers['20DC']||0)+Number(sea.containers['40DC']||0)+Number(sea.containers['40HC']||0));
    if(totalCtr<=0) errs.push('At least one container');
    return errs;
  }

  function save(status){
    const errs = validate();
    if(errs.length && status==='Ready for BL'){
      setSnack({ open:true, ok:false, msg:'Missing: '+errs.join(', ') });
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem('seaShipments')||'[]');
      const idx = list.findIndex(x=> x.id===sea.id);
      const rec = { ...sea, status: status || sea.status };
      if(idx>=0) list[idx]=rec; else list.unshift(rec);
      localStorage.setItem('seaShipments', JSON.stringify(list));
      setSea(rec);
      setSnack({ open:true, ok:true, msg: status? `Saved – status set to ${status}.` : 'Saved.' });
    } catch(err){ console.error(err); setSnack({ open:true, ok:false, msg:'Save failed.' }); }
  }

  const totalCtr = (Number(sea.containers['20DC']||0)+Number(sea.containers['40DC']||0)+Number(sea.containers['40HC']||0));

  return (
    <Box display="flex" flexDirection="column" gap={2} p={1}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={()=>navigate(-1)} size="small"><ArrowBackIcon fontSize="inherit"/></IconButton>
          <Typography variant="h6">Sea Shipment {sea.id}</Typography>
          {sea.status!=='Draft' && <Chip size="small" color={sea.status==='Ready for BL'?'success':'default'} label={sea.status}/>}
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={()=>save('Draft')}>Save Draft</Button>
          <Button variant="contained" onClick={()=>save('Ready for BL')}>Mark Ready for BL</Button>
        </Box>
      </Box>

      {/* Parties */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Parties"/>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Shipper</Typography>
              <TextField size="small" label="Name" value={sea.parties.shipper.name||''} onChange={e=>update('parties.shipper.name', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="Address" value={sea.parties.shipper.address||''} onChange={e=>update('parties.shipper.address', e.target.value)} fullWidth multiline minRows={2}/>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Consignee</Typography>
              <TextField size="small" label="Name" value={sea.parties.consignee.name||''} onChange={e=>update('parties.consignee.name', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="Address" value={sea.parties.consignee.address||''} onChange={e=>update('parties.consignee.address', e.target.value)} fullWidth multiline minRows={2}/>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transport */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Transport"/>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField size="small" label="Carrier" value={sea.transport.carrier||''} onChange={e=>update('transport.carrier', e.target.value)} fullWidth/></Grid>
            <Grid item xs={6} md={3}><TextField size="small" label="Vessel" value={sea.transport.vessel||''} onChange={e=>update('transport.vessel', e.target.value)} fullWidth/></Grid>
            <Grid item xs={6} md={2}><TextField size="small" label="Voyage" value={sea.transport.voyage||''} onChange={e=>update('transport.voyage', e.target.value)} fullWidth/></Grid>
            <Grid item xs={6} md={2}><TextField size="small" type="date" label="ETD" InputLabelProps={{shrink:true}} value={sea.transport.etd||''} onChange={e=>update('transport.etd', e.target.value)} fullWidth/></Grid>
            <Grid item xs={6} md={2}><TextField size="small" type="date" label="ETA" InputLabelProps={{shrink:true}} value={sea.transport.eta||''} onChange={e=>update('transport.eta', e.target.value)} fullWidth/></Grid>

            <Grid item xs={12} md={3}><TextField size="small" label="POL" value={sea.transport.pol||''} onChange={e=>update('transport.pol', e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} md={3}><TextField size="small" label="POD" value={sea.transport.pod||''} onChange={e=>update('transport.pod', e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="Booking / Reference No." value={sea.transport.refNo||''} onChange={e=>update('transport.refNo', e.target.value)} fullWidth/></Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Containers */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Containers"/>
        <CardContent>
          <Grid container spacing={2}>
            {['20DC','40DC','40HC'].map(code=> (
              <Grid item xs={4} md={2} key={code}>
                <TextField size="small" type="number" label={code} value={sea.containers[code]}
                  onChange={e=>update(`containers.${code}`, Number(e.target.value||0))} fullWidth />
              </Grid>
            ))}
            <Grid item xs={12}><Typography variant="caption" color="text.secondary">Total containers: <strong>{totalCtr}</strong></Typography></Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Options */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Options & Notes"/>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center" mb={1}>
            <FormControlLabel control={<Checkbox checked={!!sea.isDG} onChange={e=>update('isDG', e.target.checked)} />} label="Dangerous Goods"/>
            <FormControlLabel control={<Checkbox checked={!!sea.isReefer} onChange={e=>update('isReefer', e.target.checked)} />} label="Reefer"/>
          </Box>
          <TextField size="small" label="Notes for Operations" value={sea.notes||''} onChange={e=>update('notes', e.target.value)} fullWidth multiline minRows={3}/>
        </CardContent>
      </Card>

      <Divider />
      <Box display="flex" justifyContent="flex-end" gap={1}>
        <Button variant="outlined" onClick={()=>save('Draft')}>Save Draft</Button>
        <Button variant="contained" onClick={()=>save('Ready for BL')}>Mark Ready for BL</Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
