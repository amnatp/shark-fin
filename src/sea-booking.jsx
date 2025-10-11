import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, Typography, TextField, Grid, Button, Card, CardContent, Chip,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

function loadBookings(){ try{ return JSON.parse(localStorage.getItem('bookings')||'[]'); }catch{ return []; } }
function saveBookings(b){ try{ localStorage.setItem('bookings', JSON.stringify(b)); }catch{ /* ignore storage errors */ } }

export default function SeaBooking(){
  const navigate = useNavigate();
  const { id } = useParams();
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [booking, setBooking] = React.useState(()=> {
    const bs = loadBookings();
    const found = bs.find(b=> b.id===id);
    // helper to parse tradelane text
    const parseTradelane = (t) => { if(!t) return { origin:null, destination:null }; const s = String(t).trim(); if(!s) return { origin:null, destination:null }; if(s.includes('/') ){ const [a,b] = s.split('/').map(x=>x.trim()); return { origin: a? String(a).toUpperCase():null, destination: b? String(b).toUpperCase():null }; } if(s.includes('->') || s.includes('→')){ const [a,b] = s.split(/->|→/).map(x=>x.trim()); return { origin: a? String(a).toUpperCase():null, destination: b? String(b).toUpperCase():null }; } if(s.includes('-')){ const parts = s.split('-').map(x=>x.trim()); if(parts.length>=2) return { origin: parts[0]? String(parts[0]).toUpperCase():null, destination: parts[1]? String(parts[1]).toUpperCase():null }; } return { origin:null, destination:null }; };
    if(found){
      // Prefill from/dest from first line if present
      const first = (found.lines && found.lines[0]) || null;
      let from = found.from || '';
      let dest = found.dest || '';
      if(!from && first){ from = first.origin || (first.tradelane? parseTradelane(first.tradelane).origin : '') || ''; }
      if(!dest && first){ dest = first.destination || (first.tradelane? parseTradelane(first.tradelane).destination : '') || ''; }
      
      // Initialize container lines for DataGrid
      const containerLines = [];
      const containers = found.containers || { '20DC':0,'40DC':0,'40HC':0 };
      Object.entries(containers).forEach(([type, qty]) => {
        for(let i = 0; i < qty; i++) {
          containerLines.push({
            id: `${type}-${i+1}`,
            containerType: type,
            containerNumber: '',
            sealNumber: '',
            weight: '',
            status: 'Empty',
            depot: '',
            remarks: ''
          });
        }
      });
      
      return { 
        ...found, 
        from, 
        dest, 
        containerLines: found.containerLines || containerLines,
        serviceType: found.serviceType || 'FCL'
      };
    }
    return { 
      id, 
      type:'sea', 
      serviceType: 'FCL',
      bookingNo:id || 'NEW', 
      customer:'', 
      from:'', 
      dest:'', 
      containers:{ '20DC':0,'40DC':0,'40HC':0 }, 
      containerLines: [],
      weight:'', 
      remarks:'', 
      status:'Draft' 
    };
  });

  function update(field, value){ setBooking(b=> ({ ...b, [field]: value })); }
  // removed unused updateLine to satisfy lint

  // Add new container line
  function addContainerLine() {
    const newLine = {
      id: `new-${Date.now()}`,
      containerType: '20DC',
      containerNumber: '',
      sealNumber: '',
      weight: '',
      status: 'Empty',
      depot: '',
      remarks: ''
    };
    setBooking(b => ({ 
      ...b, 
      containerLines: [...(b.containerLines || []), newLine] 
    }));
  }

  // Remove selected container lines
  function removeSelectedLines() {
    setBooking(b => ({
      ...b,
      containerLines: b.containerLines.filter(line => !selectedRows.includes(line.id))
    }));
    setSelectedRows([]);
  }

  // Update container line
  function updateContainerLine(id, field, value) {
    setBooking(b => ({
      ...b,
      containerLines: b.containerLines.map(line => 
        line.id === id ? { ...line, [field]: value } : line
      )
    }));
  }

  // DataGrid columns for FCL container management
  const columns = [
    { 
      field: 'containerType', 
      headerName: 'Container Type', 
      width: 130,
      editable: true,
      type: 'singleSelect',
      valueOptions: ['20DC', '20GP', '40DC', '40GP', '40HC', '45HC']
    },
    { 
      field: 'containerNumber', 
      headerName: 'Container Number', 
      width: 150,
      editable: true 
    },
    { 
      field: 'sealNumber', 
      headerName: 'Seal Number', 
      width: 120,
      editable: true 
    },
    { 
      field: 'weight', 
      headerName: 'Weight (KG)', 
      width: 110,
      editable: true,
      type: 'number'
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 100,
      editable: true,
      type: 'singleSelect',
      valueOptions: ['Empty', 'Loaded', 'Sealed']
    },
    { 
      field: 'depot', 
      headerName: 'Depot', 
      width: 120,
      editable: true 
    },
    { 
      field: 'remarks', 
      headerName: 'Remarks', 
      width: 150,
      editable: true 
    }
  ];

  function save(asStatus){
    const bs = loadBookings();
    const idx = bs.findIndex(x=> x.id===booking.id);
    const next = { ...booking, status: asStatus || booking.status, updatedAt: new Date().toISOString() };
    if(idx>=0) bs[idx] = next; else bs.unshift(next);
    saveBookings(bs);
    try{ window.dispatchEvent(new Event('bookingsUpdated')); }catch{ /* ignore */ }
    navigate('/bookings');
  }

  return (
    <Box p={2}>
      <Typography variant="h6">Sea Booking - {booking.serviceType}</Typography>
      
      {/* Basic Booking Information */}
      <Card variant="outlined" sx={{ mt:2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Booking Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}><TextField label="Booking No." value={booking.bookingNo||booking.id} fullWidth onChange={e=>update('bookingNo', e.target.value)} /></Grid>
            <Grid item xs={12} sm={4}><TextField label="Booking Date" value={booking.createdAt? new Date(booking.createdAt).toLocaleString() : ''} fullWidth disabled /></Grid>
            <Grid item xs={12} sm={4}><TextField label="Customer" value={booking.customer||''} fullWidth onChange={e=>update('customer', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="From" value={booking.from||''} fullWidth onChange={e=>update('from', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}><TextField label="Dest" value={booking.dest||''} fullWidth onChange={e=>update('dest', e.target.value)} /></Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select value={booking.serviceType||'FCL'} label="Service Type" onChange={e=>update('serviceType', e.target.value)}>
                  <MenuItem value="FCL">FCL</MenuItem>
                  <MenuItem value="LCL">LCL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}><TextField label="Total Weight" value={booking.weight||''} fullWidth onChange={e=>update('weight', e.target.value)} /></Grid>
            <Grid item xs={12}><TextField label="Booking Remark" value={booking.remarks||''} fullWidth onChange={e=>update('remarks', e.target.value)} multiline minRows={2} /></Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* FCL Container Management */}
      {booking.serviceType === 'FCL' && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">Container Management</Typography>
              <Box display="flex" gap={1}>
                <Button variant="outlined" onClick={addContainerLine} size="small">
                  Add Container
                </Button>
                {selectedRows.length > 0 && (
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={removeSelectedLines}
                    size="small"
                  >
                    Remove Selected ({selectedRows.length})
                  </Button>
                )}
              </Box>
            </Box>
            
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={booking.containerLines || []}
                columns={columns}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(model)=> setSelectedRows(Array.isArray(model)? model: [])}
                initialState={{ rowSelection: { model: [] } }}
                hideFooter
                processRowUpdate={(newRow) => {
                  updateContainerLine(newRow.id, 'containerType', newRow.containerType);
                  updateContainerLine(newRow.id, 'containerNumber', newRow.containerNumber);
                  updateContainerLine(newRow.id, 'sealNumber', newRow.sealNumber);
                  updateContainerLine(newRow.id, 'weight', newRow.weight);
                  updateContainerLine(newRow.id, 'status', newRow.status);
                  updateContainerLine(newRow.id, 'depot', newRow.depot);
                  updateContainerLine(newRow.id, 'remarks', newRow.remarks);
                  return newRow;
                }}
                onProcessRowUpdateError={(error) => console.error('Row update error:', error)}
                sx={{
                  '& .MuiDataGrid-row': {
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* LCL Information */}
      {booking.serviceType === 'LCL' && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>LCL Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={2}><TextField label="Packages" type="number" value={booking.packages||0} fullWidth onChange={e=>update('packages', Number(e.target.value)||0)} /></Grid>
              <Grid item xs={12} sm={2}><TextField label="Pallets" type="number" value={booking.pallets||0} fullWidth onChange={e=>update('pallets', Number(e.target.value)||0)} /></Grid>
              <Grid item xs={12} sm={2}><TextField label="Width (cm)" type="number" value={booking.width||''} fullWidth onChange={e=>update('width', e.target.value)} /></Grid>
              <Grid item xs={12} sm={2}><TextField label="Length (cm)" type="number" value={booking.length||''} fullWidth onChange={e=>update('length', e.target.value)} /></Grid>
              <Grid item xs={12} sm={2}><TextField label="Height (cm)" type="number" value={booking.height||''} fullWidth onChange={e=>update('height', e.target.value)} /></Grid>
              <Grid item xs={12} sm={2}><TextField label="Volume (m³)" type="number" value={booking.volumeM3||''} fullWidth onChange={e=>update('volumeM3', e.target.value)} /></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Box display="flex" gap={1}>
            <Button variant="outlined" onClick={()=>navigate(-1)}>Cancel</Button>
            <Button variant="contained" onClick={()=>save('Draft')}>Save Draft</Button>
            <Button variant="contained" color="success" onClick={()=>save('Confirmed')}>Confirm Booking</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
