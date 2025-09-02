import React from 'react';
import { useAuth } from './auth-context';
import { Box, Typography, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Chip, IconButton, TextField, Tooltip } from '@mui/material';
function StatusChip({ status }) {
  let color = 'default';
  if (status === 'approve') color = 'success';
  else if (status === 'submit') color = 'primary';
  else if (status === 'draft') color = 'warning';
  else if (status === 'reject') color = 'error';
  return <Chip size="small" label={status||'draft'} color={color} variant={status==='approve'?'filled':'outlined'} sx={{ textTransform:'capitalize' }} />;
}
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';

function loadQuotations(){ try{ return JSON.parse(localStorage.getItem('quotations')||'[]'); }catch{ return []; } }
function money(n){ return (Number(n)||0).toFixed(2); }
function ROSChip({ sell, margin }){ const ros = sell? (margin/sell)*100:0; const color = ros>=20?'success': ros>=12?'warning':'error'; return <Chip size="small" color={color} label={ros.toFixed(1)+'%'} variant={ros>=20?'filled':'outlined'} />; }

export default function QuotationList(){
  const navigate = useNavigate();
  const [rows, setRows] = React.useState(()=> loadQuotations());
  const [q, setQ] = React.useState('');
  const { user } = useAuth();

  function reload(){ setRows(loadQuotations()); }
  React.useEffect(()=>{ function onStorage(e){ if(e.key==='quotations') reload(); } window.addEventListener('storage', onStorage); return ()=> window.removeEventListener('storage', onStorage); }, []);

  // Build latest revision per root parent (parentId or self id) for primary list
  const latestByRoot = React.useMemo(()=>{
    const map = new Map();
    for(const r of rows){
      const root = r.parentId || r.id;
      const cur = map.get(root);
      if(!cur || (r.version||0) > (cur.version||0)) map.set(root, r);
    }
    return map;
  }, [rows]);
  const latest = Array.from(latestByRoot.values());
  const filtered = latest
    // Sales role visibility restriction
    .filter(r => {
      if(user?.role !== 'Sales') return true;
      const me1 = (user.display||'').toLowerCase();
      const me2 = (user.username||'').toLowerCase();
      const owner = (r.salesOwner||'').toLowerCase();
      return owner === me1 || owner === me2;
    })
    .filter(r=> {
      const t = (r.id+' '+(r.customer||'')+' '+(r.salesOwner||'')+' '+(r.mode||'')+' '+(r.incoterm||'')).toLowerCase();
      return t.includes(q.toLowerCase());
    });

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
  <Typography variant="h6">Quotations ({latest.length} latest / {rows.length} total)</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <TextField size="small" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} />
          <IconButton size="small" onClick={reload}><RefreshIcon fontSize="inherit" /></IconButton>
          <Button variant="contained" onClick={()=>navigate('/quotations/new')}>New Quotation</Button>
        </Box>
      </Box>
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle2' }} title="All Quotations" />
        <CardContent sx={{ pt:0 }}>
          {!filtered.length && <Typography variant="caption" color="text.secondary">No quotations found.</Typography>}
          {!!filtered.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Incoterm</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="right">Margin</TableCell>
                  <TableCell align="center">ROS</TableCell>
                  <TableCell>Valid</TableCell>
                  <TableCell>Lines</TableCell>
                  <TableCell>Bookings</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(q=> {
                  const sell = (q.lines||[]).reduce((s,l)=> s + (Number(l.sell)||0)*(l.qty||1),0);
                  const margin = (q.lines||[]).reduce((s,l)=> s + (Number(l.margin)||0)*(l.qty||1),0);
                  return (
                    <TableRow key={q.id} hover>
                      <TableCell>
                        {q.id}
                        {q.version && <Chip size="small" label={`v${q.version}`} sx={{ ml:0.5 }}/>} 
                        {q.parentId && <Tooltip title={`Root ${q.parentId}`}><Chip size="small" label="Rev" sx={{ ml:0.5 }}/></Tooltip>}
                      </TableCell>
                      <TableCell>{q.customer}</TableCell>
                      <TableCell>{q.mode}</TableCell>
                      <TableCell>{q.incoterm}</TableCell>
                      <TableCell><StatusChip status={q.status} /></TableCell>
                      <TableCell align="right">{money(sell)}</TableCell>
                      <TableCell align="right">{money(margin)}</TableCell>
                      <TableCell align="center"><ROSChip sell={sell} margin={margin} /></TableCell>
                      <TableCell>{q.validFrom || '-'} → {q.validTo || '-'}</TableCell>
                      <TableCell>{q.lines?.length||0}</TableCell>
                      <TableCell>{q.bookingCount || (Array.isArray(q.relatedBookings)? q.relatedBookings.length : 0) || 0}</TableCell>
                      <TableCell><IconButton size="small" onClick={()=>navigate(`/quotations/${q.id}`)}><EditIcon fontSize="inherit" /></IconButton></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
