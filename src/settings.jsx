import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Divider } from '@mui/material';
import { useSettings } from './use-settings';

export default function SettingsPage(){
  const { settings, update } = useSettings();
  const [draft, setDraft] = React.useState(settings);
  React.useEffect(()=>{ setDraft(settings); }, [settings]);

  function save(){ update(draft); }
  function updBand(ix, field, value){
    const bands = draft.rosBands.map((b,i)=> i===ix? { ...b, [field]: value===''? undefined : (field==='label'? value : Number(value)) } : b);
    setDraft(d => ({ ...d, rosBands: bands }));
  }

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Typography variant="h6">System Settings</Typography>
      <Card variant="outlined">
        <CardHeader title="ROS Bands & Thresholds" subheader="Define color bands and auto-approval cutoff" />
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Label</TableCell>
                <TableCell align="right">Min %</TableCell>
                <TableCell align="right">Max %</TableCell>
                <TableCell>Color</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.rosBands.map((b,ix)=>(
                <TableRow key={ix} hover>
                  <TableCell><TextField size="small" value={b.label} onChange={e=>updBand(ix,'label',e.target.value)} /></TableCell>
                  <TableCell align="right"><TextField size="small" type="number" value={b.min ?? ''} onChange={e=>updBand(ix,'min',e.target.value)} sx={{ width:100 }} inputProps={{ min:0, step:0.1 }} /></TableCell>
                  <TableCell align="right"><TextField size="small" type="number" value={b.max ?? ''} onChange={e=>updBand(ix,'max',e.target.value)} sx={{ width:100 }} inputProps={{ min:0, step:0.1 }} /></TableCell>
                  <TableCell>{b.color}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            <TextField size="small" label="Auto-Approve Min ROS %" type="number" value={draft.autoApproveMin} sx={{ width:200 }} onChange={e=>setDraft(d=>({...d,autoApproveMin:Number(e.target.value||0)}))} />
            <TextField size="small" label="Default Currency" value={draft.defaultCurrency} sx={{ width:160 }} onChange={e=>setDraft(d=>({...d,defaultCurrency:e.target.value.toUpperCase()}))} />
            <TextField size="small" label="Business Cut-off (local)" value={draft.businessCutoffLocal} sx={{ width:200 }} onChange={e=>setDraft(d=>({...d,businessCutoffLocal:e.target.value}))} />
          </Box>
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>ROS Target by Mode</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {Object.entries(draft.rosTargetByMode).map(([mode,val])=> (
                <TextField key={mode} size="small" label={mode} type="number" value={val} sx={{ width:140 }} onChange={e=>setDraft(d=>({ ...d, rosTargetByMode: { ...d.rosTargetByMode, [mode]: Number(e.target.value||0) } }))} />
              ))}
            </Box>
          </Box>
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>Free-time Policy Text</Typography>
            <TextField size="small" multiline minRows={2} fullWidth value={draft.freeTimePolicy} onChange={e=>setDraft(d=>({...d, freeTimePolicy:e.target.value}))} />
          </Box>
          <Divider sx={{ my:2 }} />
          <Button variant="contained" size="small" onClick={save}>Save Settings</Button>
        </CardContent>
      </Card>
      <Typography variant="caption" color="text.secondary">Prototype settings stored locally only.</Typography>
    </Box>
  );
}
