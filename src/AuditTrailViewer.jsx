import React from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/ManageSearch';

export default function AuditTrailViewer({ open, onClose }) {
  const [logs, setLogs] = React.useState([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    try {
      setLogs(JSON.parse(localStorage.getItem('auditTrail') || '[]'));
    } catch {
      setLogs([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Audit Trail</DialogTitle>
      <DialogContent>
        <Box mb={2} display="flex" alignItems="center" gap={2}>
          <Button onClick={() => { localStorage.removeItem('auditTrail'); setLogs([]); }} color="error" variant="outlined" size="small">Clear Audit Trail</Button>
          <Button onClick={()=>navigate('/inquiries')} variant="outlined" size="small" startIcon={<SearchIcon />}>Go to Inquiry Management</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date/Time</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Inquiry ID</TableCell>
              <TableCell>Before</TableCell>
              <TableCell>After</TableCell>
              <TableCell>Navigate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">No audit logs found.</Typography></TableCell></TableRow>
            )}
            {logs.map((log, i) => (
              <TableRow key={i}>
                <TableCell>{new Date(log.ts).toLocaleString()}</TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.inquiryId}</TableCell>
                <TableCell>
                  <pre style={{ maxWidth: 200, maxHeight: 120, overflow: 'auto', fontSize: 11, background: '#f6f6f6', borderRadius: 4, padding: 4 }}>{log.before ? JSON.stringify(log.before, null, 2) : '-'}</pre>
                </TableCell>
                <TableCell>
                  <pre style={{ maxWidth: 200, maxHeight: 120, overflow: 'auto', fontSize: 11, background: '#f6f6f6', borderRadius: 4, padding: 4 }}>{log.after ? JSON.stringify(log.after, null, 2) : '-'}</pre>
                </TableCell>
                <TableCell>
                  {log.inquiryId && (
                    <Tooltip title="Go to Inquiry">
                      <IconButton size="small" onClick={()=>{ onClose && onClose(); setTimeout(()=>navigate(`/inquiry/${log.inquiryId}`), 200); }}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
