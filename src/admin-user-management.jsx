import React from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, Button } from '@mui/material';
import { useAuth } from './auth-context';

export default function AdminUserManagement(){
  const { USERS, roleOverrides, setUserRoleOverride } = useAuth();
  const [local, setLocal] = React.useState(roleOverrides || {});

  React.useEffect(()=> setLocal(roleOverrides || {}), [roleOverrides]);

  const roles = ['Admin','Director','Pricing','SalesManager','RegionManager','Sales','Vendor','Customer','Guest'];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>User & Role Management</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Use this screen to override a user's role for testing or admin corrections. Overrides are persisted in your browser (localStorage) and apply when logging in.
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Display</TableCell>
            <TableCell>Current Role</TableCell>
            <TableCell>Override</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {USERS.map(u=> (
            <TableRow key={u.username}>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.display}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>
                <Select value={local[u.username]||''} onChange={(e)=> setLocal(prev=> ({ ...prev, [u.username]: e.target.value }))} displayEmpty size="small">
                  <MenuItem value="">(no override)</MenuItem>
                  {roles.map(r=> <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={()=>{
          // apply overrides
          Object.keys(local).forEach(k=> setUserRoleOverride(k, local[k]||null));
          window.location.reload();
        }}>Save & Refresh</Button>
        <Button variant="outlined" sx={{ ml:2 }} onClick={()=>{
          // clear local edits
          setLocal(roleOverrides||{});
        }}>Revert</Button>
      </Box>
    </Box>
  );
}
