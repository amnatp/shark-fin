import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Chip, IconButton, Tooltip, Tabs, Tab
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from './auth-context';
import { seedSampleBookings } from './booking-seed';

// Helper functions
function parseJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function getQuantityAndUnit(booking) {
  const mode = booking.mode?.toLowerCase();
  
  if (mode === 'air') {
    // For air shipments, show pieces
    const pieces = booking.cargo?.pieces || booking.pcs || 0;
    return { qty: pieces, unit: 'pcs' };
  } else if (mode === 'ocean' || mode === 'sea') {
    // Check if it's FCL or LCL
    const serviceType = booking.serviceType?.toLowerCase();
    const containers = booking.containers || {};
    const hasContainers = Object.values(containers).some(count => count > 0);
    
    // Determine if FCL or LCL
    const isFCL = serviceType === 'fcl' || (!serviceType && hasContainers);
    
    if (isFCL) {
      // FCL - show container counts
      const count20 = containers['20DC'] || 0;
      const count40 = containers['40DC'] || 0;
      const count40HC = containers['40HC'] || 0;
      
      const total = count20 + count40 + count40HC;
      
      if (total === 0) {
        return { qty: 0, unit: 'containers' };
      }
      
      // Build unit description showing container breakdown
      const parts = [];
      if (count20 > 0) parts.push(`${count20}×20ft`);
      if (count40 > 0) parts.push(`${count40}×40ft`);
      if (count40HC > 0) parts.push(`${count40HC}×40HC`);
      
      return { qty: total, unit: parts.join(', ') };
    } else {
      // LCL - show dimensions and pallets
      const cargo = booking.cargo || {};
      const dimensions = cargo.dimensions || {};
      const pallets = cargo.pallets || booking.pallets || 0;
      
      // Format dimensions as WxLxH cm
      let dimensionStr = '';
      if (dimensions.width && dimensions.length && dimensions.height) {
        dimensionStr = `${dimensions.width}×${dimensions.length}×${dimensions.height}cm`;
      } else if (cargo.volumeM3) {
        // Fallback to volume if dimensions not available
        dimensionStr = `${cargo.volumeM3}m³`;
      }
      
      if (pallets > 0) {
        const unitStr = dimensionStr ? `pallets (${dimensionStr})` : 'pallets';
        return { qty: pallets, unit: unitStr };
      } else if (dimensionStr) {
        return { qty: 1, unit: dimensionStr };
      } else {
        // Fallback to packages
        const packages = cargo.packages || booking.packages || 0;
        return { qty: packages, unit: 'packages' };
      }
    }
  }
  
  // Default fallback
  return { qty: '-', unit: '-' };
}
export default function BookingList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState(0); // 0: FCL, 1: LCL, 2: Air
  const [selectedBookings, setSelectedBookings] = React.useState([]);

  // Filter bookings based on active tab
  const getFilteredBookings = (bookings, tabIndex) => {
    switch (tabIndex) {
      case 0: // FCL - Full Container Load (Ocean with containers or serviceType FCL)
        return bookings.filter(b => {
          const isOcean = b.mode?.toLowerCase() === 'ocean' || b.mode?.toLowerCase() === 'sea';
          if (!isOcean) return false;
          
          // If serviceType is defined, use it
          if (b.serviceType) {
            return b.serviceType.toLowerCase() === 'fcl';
          }
          
          // If no serviceType, assume FCL if it has container data
          const hasContainers = b.containers && Object.values(b.containers).some(count => count > 0);
          return hasContainers;
        });
      case 1: // LCL - Less than Container Load (Ocean without containers or serviceType LCL)
        return bookings.filter(b => {
          const isOcean = b.mode?.toLowerCase() === 'ocean' || b.mode?.toLowerCase() === 'sea';
          if (!isOcean) return false;
          
          // If serviceType is defined, use it
          if (b.serviceType) {
            return b.serviceType.toLowerCase() === 'lcl';
          }
          
          // If no serviceType, assume LCL if it has no container data
          const hasContainers = b.containers && Object.values(b.containers).some(count => count > 0);
          return !hasContainers;
        });
      case 2: // Air
        return bookings.filter(b => b.mode?.toLowerCase() === 'air');
      default:
        return bookings;
    }
  };

  const filteredBookings = getFilteredBookings(bookings, activeTab);
  
  // Reset selection when filtered data changes
  React.useEffect(() => {
    setSelectedBookings([]);
  }, [filteredBookings.length, activeTab]);
  
  console.log('Current state:', {
    bookings: bookings.length,
    activeTab,
    filteredBookings: filteredBookings.length,
    user: user?.role
  });

  // DataGrid columns
  const columns = [
    { 
      field: 'id', 
      headerName: 'Booking ID', 
      width: 140,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          {params.row.quotationId && (
            <Typography variant="caption" color="text.secondary">
              From: {params.row.quotationId}
            </Typography>
          )}
        </Box>
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => {
        const colors = {
          'DRAFT': 'default',
          'REQUESTED': 'warning', 
          'CONFIRMED': 'success',
          'CANCELLED': 'error'
        };
        return <Chip size="small" color={colors[params.value] || 'default'} label={params.value} />;
      }
    },
    { field: 'customer', headerName: 'Customer', width: 150 },
    { 
      field: 'lane', 
      headerName: 'Lane', 
      width: 140,
      valueGetter: (value, row) => `${row.displayOrigin} → ${row.displayDestination}`
    },
    { 
      field: 'mode', 
      headerName: 'Mode', 
      width: 100,
      renderCell: (params) => (
        <Chip size="small" variant="outlined" label={params.value} />
      )
    },
    { 
      field: 'qty', 
      headerName: 'Qty', 
      width: 80,
      align: 'center',
      valueGetter: (value, row) => getQuantityAndUnit(row).qty
    },
    { 
      field: 'unit', 
      headerName: 'Unit', 
      width: 120,
      align: 'center',
      valueGetter: (value, row) => getQuantityAndUnit(row).unit
    },
    { 
      field: 'lines', 
      headerName: 'Lines', 
      width: 80,
      align: 'center',
      valueGetter: (value, row) => row.lines?.length || 0
    },
    { 
      field: 'totalSell', 
      headerName: 'Total Sell', 
      width: 110,
      align: 'right',
      valueGetter: (value, row) => row.totals?.sell?.toFixed(2) || '0.00'
    },
    { 
      field: 'createdAt', 
      headerName: 'Created', 
      width: 100,
      valueGetter: (value, row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton 
              size="small"
              onClick={() => {
                console.log('View booking:', params.row.id);
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Create Shipping Instruction">
            <IconButton
              size="small"
              onClick={() => navigate(`/shipping-instruction/${params.row.id}`)}
            >
              <DescriptionIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // Handle delete selected bookings
  const handleDeleteSelected = () => {
    if (selectedBookings.length === 0) return;
    
    const updatedBookings = bookings.filter(booking => !selectedBookings.includes(booking.id));
    setBookings(updatedBookings);
    
    // Save to localStorage
    try {
      localStorage.setItem('bookings', JSON.stringify(updatedBookings));
      window.dispatchEvent(new Event('bookingsUpdated'));
    } catch (error) {
      console.error('Failed to save bookings:', error);
    }
    
    setSelectedBookings([]);
  };

  React.useEffect(() => {
    function loadBookings() {
      const list = parseJSON('bookings', []);
      console.log('Raw bookings from localStorage:', list);
      console.log('Current user:', user);
      
      // Filter by customer if user is Customer role (but not CustomerService)
      if (user?.role === 'Customer') {
        const filtered = list.filter(b => b.customer === user.name);
        console.log('Filtered bookings for Customer:', filtered);
        return filtered;
      }
      // CustomerService and other roles see all bookings
      console.log('All bookings for non-Customer role:', list);
      return list;
    }
    
    const loadedBookings = loadBookings();
    console.log('Setting bookings state:', loadedBookings);
    setBookings(loadedBookings);
    
    // Listen for booking updates
    function handleBookingsUpdate() {
      setBookings(loadBookings());
    }
    
    window.addEventListener('bookingsUpdated', handleBookingsUpdate);
    return () => window.removeEventListener('bookingsUpdated', handleBookingsUpdate);
  }, [user]);

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6">
            {user?.role === 'Customer' ? 'My Bookings' : 'Bookings'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/create')}
          >
            Create Booking
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<DescriptionIcon />}
            onClick={() => navigate('/shipping-instruction')}
          >
            Create Shipment
          </Button>
          {selectedBookings.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSelected}
            >
              Delete ({selectedBookings.length})
            </Button>
          )}
          {import.meta.env.DEV && (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  console.log('=== SEEDING DEBUG ===');
                  console.log('Current localStorage bookings:', localStorage.getItem('bookings'));
                  console.log('Seeding sample bookings...');
                  const result = seedSampleBookings();
                  console.log('Seeding result:', result);
                  console.log('New localStorage bookings:', localStorage.getItem('bookings'));
                  console.log('=== END DEBUG ===');
                }}
                sx={{ ml: 1 }}
              >
                Seed Sample Data
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => {
                  console.log('Clearing all data...');
                  localStorage.removeItem('bookings');
                  console.log('Dispatching events...');
                  window.dispatchEvent(new Event('bookingsUpdated'));
                  console.log('Done clearing data');
                }}
                sx={{ ml: 1 }}
              >
                Clear All Data
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="success"
                onClick={() => {
                  console.log('Adding simple test booking...');
                  const testBooking = {
                    id: 'TEST-001',
                    customer: 'Test Customer',
                    mode: 'Ocean',
                    serviceType: 'FCL',
                    status: 'DRAFT',
                    displayOrigin: 'TEST',
                    displayDestination: 'TEST2',
                    createdAt: new Date().toISOString(),
                    containers: { '20DC': 1 },
                    lines: [],
                    totals: { sell: 1000 }
                  };
                  
                  const existing = JSON.parse(localStorage.getItem('bookings') || '[]');
                  const updated = [...existing, testBooking];
                  localStorage.setItem('bookings', JSON.stringify(updated));
                  console.log('Added test booking, new total:', updated.length);
                  window.dispatchEvent(new Event('bookingsUpdated'));
                }}
                sx={{ ml: 1 }}
              >
                Add Test Booking
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Booking Type Tabs */}
      <Card variant="outlined">
        <Tabs 
          value={activeTab} 
          onChange={(event, newValue) => {
            setActiveTab(newValue);
            setSelectedBookings([]); // Clear selection when changing tabs
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={`FCL (${getFilteredBookings(bookings, 0).length})`} 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            label={`LCL (${getFilteredBookings(bookings, 1).length})`} 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            label={`Air (${getFilteredBookings(bookings, 2).length})`} 
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No bookings found
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/bookings/create')}
              >
                Create First Booking
              </Button>
            </Box>
          ) : (
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                key={`datagrid-${activeTab}-${filteredBookings.length}`} // Force re-render on tab change and data change
                rows={filteredBookings}
                columns={columns}
                getRowId={(row) => row.id} // Ensure unique row IDs
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(newSelection) => {
                  // MUI v6 returns an array of selected row IDs
                  console.log('Selection changed:', newSelection);
                  setSelectedBookings(Array.isArray(newSelection) ? newSelection : []);
                }}
                pagination
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  rowSelection: { model: [] },
                  pagination: {
                    paginationModel: { pageSize: 25 }
                  }
                }}
                hideFooter
                sx={{
                  '& .MuiDataGrid-row': {
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  },
                  '& .MuiDataGrid-cell': {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}