import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, TextField, Grid, Button, Card, CardContent } from '@mui/material';

function loadBookings(){ try{ return JSON.parse(localStorage.getItem('bookings')||'[]'); }catch{ return []; } }
function saveBookings(b){ try{ localStorage.setItem('bookings', JSON.stringify(b)); }catch{ /* ignore */ } }

export default function AirBooking(){
  const navigate = useNavigate();
  const { id } = useParams();
  const [booking, setBooking] = React.useState(()=> {
    const bs = loadBookings();
    const found = bs.find(b=> b.id===id);
    const parseTradelane = (t) => { if(!t) return { origin:null, destination:null }; const s = String(t).trim(); if(!s) return { origin:null, destination:null }; if(s.includes('/') ){ const [a,b] = s.split('/').map(x=>x.trim()); return { origin: a? String(a).toUpperCase():null, destination: b? String(b).toUpperCase():null }; } if(s.includes('->') || s.includes('→')){ const [a,b] = s.split(/->|→/).map(x=>x.trim()); return { origin: a? String(a).toUpperCase():null, destination: b? String(b).toUpperCase():null }; } if(s.includes('-')){ const parts = s.split('-').map(x=>x.trim()); if(parts.length>=2) return { origin: parts[0]? String(parts[0]).toUpperCase():null, destination: parts[1]? String(parts[1]).toUpperCase():null }; } return { origin:null, destination:null }; };
    if(found){
      const first = (found.lines && found.lines[0]) || null;
      let from = found.from || '';
      let dest = found.dest || '';
      if(!from && first){ from = first.origin || (first.tradelane? parseTradelane(first.tradelane).origin : '') || ''; }
      if(!dest && first){ dest = first.destination || (first.tradelane? parseTradelane(first.tradelane).destination : '') || ''; }
      return { ...found, from, dest };
    }
    return { id, type:'air', bookingNo:id || 'NEW', customer:'', from:'', dest:'', mawb:'', awbPrefix:'', weight:'', pcs:'', remarks:'', status:'Draft' };
  });

  function update(field, value){ setBooking(b=> ({ ...b, [field]: value })); }

  function save(asStatus){
    const bs = loadBookings();
    const idx = bs.findIndex(x=> x.id===booking.id);
    const next = { ...booking, status: asStatus || booking.status, updatedAt: new Date().toISOString() };
    if(idx>=0) bs[idx] = next; else bs.unshift(next);
    saveBookings(bs);
    try{ window.dispatchEvent(new Event('bookingsUpdated')); }catch{ /* ignore */ }
    navigate('/shipments');
  }

  return (
    <Box p={2}>
      <Typography variant="h6">Air Booking</Typography>
      <Card variant="outlined" sx={{ mt:2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}><TextField label="Booking No." value={booking.bookingNo||booking.id} fullWidth onChange={e=>update('bookingNo', e.target.value)} /></Grid>
            <Grid item xs={12} sm={4}><TextField label="Booking Date" value={booking.createdAt? new Date(booking.createdAt).toLocaleString() : ''} fullWidth disabled /></Grid>
            <Grid item xs={12} sm={4}><TextField label="Customer" value={booking.customer||''} fullWidth onChange={e=>update('customer', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="Airport of Departure" value={booking.from||''} fullWidth onChange={e=>update('from', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="Airport of Destination" value={booking.dest||''} fullWidth onChange={e=>update('dest', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="AWB No." value={booking.awbPrefix||''} fullWidth onChange={e=>update('awbPrefix', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="MAWB No." value={booking.mawb||''} fullWidth onChange={e=>update('mawb', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="PCS" value={booking.pcs||''} fullWidth onChange={e=>update('pcs', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="Gross Weight" value={booking.weight||''} fullWidth onChange={e=>update('weight', e.target.value)} /></Grid>
            <Grid item xs={12}><TextField label="Booking Remark" value={booking.remarks||''} fullWidth onChange={e=>update('remarks', e.target.value)} multiline minRows={2} /></Grid>
            <Grid item xs={12}><Box display="flex" gap={1}>
              <Button variant="outlined" onClick={()=>navigate(-1)}>Cancel</Button>
              <Button variant="contained" onClick={()=>save('Draft')}>Save Draft</Button>
              <Button variant="contained" color="success" onClick={()=>save('Confirmed')}>Confirm Booking</Button>
            </Box></Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
