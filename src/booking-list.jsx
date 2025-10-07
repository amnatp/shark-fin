import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Table, TableHead, TableRow, 
  TableCell, TableBody, Chip, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from './auth-context';

// Helper functions
function parseJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function statusChip(status) {
  const colors = {
    'DRAFT': 'default',
    'REQUESTED': 'warning', 
    'CONFIRMED': 'success',
    'CANCELLED': 'error'
  };
  return <Chip size="small" color={colors[status] || 'default'} label={status} />;
}

export default function BookingList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = React.useState([]);

  React.useEffect(() => {
    function loadBookings() {
      const list = parseJSON('bookings', []);
      // Filter by customer if user is Customer role (but not CustomerService)
      if (user?.role === 'Customer') {
        return list.filter(b => b.customer === user.name);
      }
      // CustomerService and other roles see all bookings
      return list;
    }
    
    setBookings(loadBookings());
    
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
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/bookings/create')}
        >
          Create Booking
        </Button>
      </Box>

      <Card variant="outlined">
        <CardContent>
          {bookings.length === 0 ? (
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
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Booking ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Lane</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell align="center">Lines</TableCell>
                  <TableCell align="right">Total Sell</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell width={80}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {booking.id}
                      </Typography>
                      {booking.quotationId && (
                        <Typography variant="caption" color="text.secondary">
                          From: {booking.quotationId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{statusChip(booking.status)}</TableCell>
                    <TableCell>{booking.customer}</TableCell>
                    <TableCell>
                      {booking.displayOrigin} → {booking.displayDestination}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={booking.mode} />
                    </TableCell>
                    <TableCell align="center">{booking.lines?.length || 0}</TableCell>
                    <TableCell align="right">
                      {booking.totals?.sell?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            // Navigate to booking detail or edit - you can implement this
                            console.log('View booking:', booking.id);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}