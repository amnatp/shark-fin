import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Button, Collapse } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FlightIcon from '@mui/icons-material/Flight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from './auth-context';

function SummaryCard({ title, value, icon }){
  return (
    <Card variant="outlined" sx={{ minWidth:160, boxShadow:2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ width:40, height:40, borderRadius:1, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'#f5f7fb' }}>{icon}</Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{title}</Typography>
            <Typography variant="h5" sx={{ mt:1 }}>{value}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

const sampleAir = [
  { id: 'AWB-846259', etd: '9/20/2025', awb: '846259', reference: '', origin: 'SIN', dest: 'BKK', co2: 0.00, status: 'In progress', steps: [{label:'Pickup', ok:true},{label:'Export Customs', ok:true},{label:'Departure', ok:true},{label:'Arrival', ok:true},{label:'Import Customs', ok:false},{label:'Delivery', ok:false}] },
  { id: 'AWB-846260', etd: '9/18/2025', awb: '846260', reference: 'REF-200', origin: 'HKG', dest: 'BKK', co2: 0.12, status: 'Delivered', steps: [{label:'Pickup', ok:true},{label:'Export Customs', ok:true},{label:'Departure', ok:true},{label:'Arrival', ok:true},{label:'Import Customs', ok:true},{label:'Delivery', ok:true}] }
];

const sampleOcean = [
  { id: 'CNTR-001', etd: '9/4/2025', awb: 'WWSHA2508448', reference: '', origin: 'SHA', dest: 'THLCH', co2: 0.08, status: 'Delivered', steps: [{label:'Pickup', ok:true},{label:'Export Customs', ok:true},{label:'Departure', ok:true},{label:'Arrival', ok:true},{label:'Import Customs', ok:true},{label:'Delivery', ok:true}] },
  { id: 'CNTR-002', etd: '8/13/2025', awb: 'WWSHA2508163', reference: '', origin: 'SHA', dest: 'THLCH', co2: 0.06, status: 'Delivered', steps: [{label:'Pickup', ok:true},{label:'Export Customs', ok:true},{label:'Departure', ok:true},{label:'Arrival', ok:true},{label:'Import Customs', ok:true},{label:'Delivery', ok:true}] }
];

export default function CustomerShipments(){
  const { user } = useAuth();
  const [openMap, setOpenMap] = React.useState({});
  const total20 = sampleOcean.length; // dummy
  const total40 = sampleOcean.length;
  const totalShipments = sampleAir.length + sampleOcean.length;
  const totalWeight = 29814; // sample
  const totalCo2 = (sampleAir.reduce((s,i)=>s+i.co2,0) + sampleOcean.reduce((s,i)=>s+i.co2,0)).toFixed(2);

  function toggle(id){ setOpenMap(m=> ({ ...m, [id]: !m[id] })); }

  const renderTable = (rows, type) => (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb:1 }}>{type} SHIPMENT LIST</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>ETD</TableCell>
              <TableCell>AWB</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Origin</TableCell>
              <TableCell>Dest</TableCell>
              <TableCell>CO2 Emission</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r=> (
              <React.Fragment key={r.id}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size="small" onClick={()=>toggle(r.id)}>
                      {openMap[r.id] ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{r.etd}</TableCell>
                  <TableCell>{r.awb}</TableCell>
                  <TableCell>{r.reference || '-'}</TableCell>
                  <TableCell>{r.origin}</TableCell>
                  <TableCell>{r.dest}</TableCell>
                  <TableCell>{r.co2}</TableCell>
                  <TableCell><Chip label={r.status} color={r.status==='Delivered' ? 'success' : 'default'} size="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ p:0, borderBottom:'none' }}>
                    <Collapse in={!!openMap[r.id]} timeout="auto" unmountOnExit>
                      <Box sx={{ p:2, bgcolor:'background.default' }}>
                        <Grid container spacing={2} alignItems="center">
                          {r.steps.map((s,idx)=> (
                            <Grid item key={idx} xs>
                              <Box display="flex" flexDirection="column" alignItems="center">
                                <Box sx={{ width:44, height:44, borderRadius:'50%', bgcolor: s.ok ? 'success.main' : 'grey.200', color: s.ok? '#fff': 'text.primary', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  {type==='Air' ? <FlightIcon/> : <LocalShippingIcon/>}
                                </Box>
                                <Typography variant="caption" sx={{ mt:1 }}>{s.label}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.ok? 'Completed':'Pending'}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{user?.role === 'Customer' ? 'My Bookings' : 'Shipments'}</Typography>
        <Typography variant="caption" color="text.secondary">Mockup • Bookings</Typography>
      </Box>
      <Grid container spacing={2}>
  <Grid item><SummaryCard title="Total Bookings" value={totalShipments} icon={<LocalShippingIcon/>} /></Grid>
        <Grid item><SummaryCard title="Total 20Ft Containers" value={total20} icon={<LocalShippingIcon/>} /></Grid>
        <Grid item><SummaryCard title="Total 40Ft Containers" value={total40} icon={<LocalShippingIcon/>} /></Grid>
        <Grid item><SummaryCard title="Total Gross weight" value={totalWeight.toLocaleString()} icon={<FlightIcon/>} /></Grid>
        <Grid item><SummaryCard title="CO2 (Tons)" value={totalCo2} icon={<CheckCircleIcon/>} /></Grid>
      </Grid>

      <Box>
        {renderTable(sampleAir, 'AIR')}
      </Box>
      <Box>
        {renderTable(sampleOcean, 'OCEAN')}
      </Box>
    </Box>
  );
}
