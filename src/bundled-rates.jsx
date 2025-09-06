import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Button, TextField, Grid, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableBody, TableRow, TableCell, Select, MenuItem, Paper } from '@mui/material';

export default function BundledRates() {
  const [query, setQuery] = useState('');
  const [kits, setKits] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bundledRates') || '[]');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {/* ignore */}
    return [
      {
        name: 'Asia → US West FCL 40HC – All-In',
        scope: 'FCL',
        lane: 'THBKK → USLAX',
        components: [
          { charge: 'Ocean Freight', basis: 'per container', cost: 1200, sell: 1500 },
          { charge: 'BAF', basis: 'per container', cost: 50, sell: 60 },
          { charge: 'THC + Doc', basis: 'fixed', cost: 120, sell: 160 },
        ],
      },
    ];
  });

  useEffect(() => {
    try { localStorage.setItem('bundledRates', JSON.stringify(kits)); } catch {/* ignore */}
  }, [kits]);

  const [kitOpen, setKitOpen] = useState(false);
  const [kitName, setKitName] = useState('');
  const [kitScope, setKitScope] = useState('FCL');
  const [kitLane, setKitLane] = useState('');
  const [components, setComponents] = useState([{ charge: '', basis: 'per container', cost: '', sell: '' }]);

  const addComponent = () => setComponents((p) => [...p, { charge: '', basis: 'per container', cost: '', sell: '' }]);
  const removeComponent = (idx) => setComponents((p) => p.filter((_, i) => i !== idx));
  const updateComponent = (idx, key, val) => setComponents((p) => p.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const rosFrom = (cost, sell) => (sell ? Math.round(((sell - cost) / sell) * 100) : 0);
  const kitTotals = (kit) => {
    const cost = kit.components.reduce((s, c) => s + (Number(c.cost) || 0), 0);
    const sell = kit.components.reduce((s, c) => s + (Number(c.sell) || 0), 0);
    return { cost, sell, ros: rosFrom(cost, sell) };
  };

  const saveKit = () => {
    if (!kitName.trim()) return;
    const clean = components.filter((c) => c.charge && c.cost !== '' && c.sell !== '');
    setKits((prev) => [...prev, { name: kitName, scope: kitScope, lane: kitLane, components: clean }]);
    setKitName(''); setKitScope('FCL'); setKitLane(''); setComponents([{ charge: '', basis: 'per container', cost: '', sell: '' }]);
    setKitOpen(false);
  };

  const filtered = useMemo(() => kits.filter(k => (k.name + (k.lane||'') + (k.scope||'')).toLowerCase().includes(query.toLowerCase())), [kits, query]);

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5" fontWeight={600}>Bundled Rates</Typography>

      <Card variant="outlined">
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Box display="flex" gap={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <TextField size="small" value={query} onChange={(e)=> setQuery(e.target.value)} label="Search bundles" placeholder="Search by name, lane, or scope" sx={{ minWidth: 260 }} />
            <Button variant="contained" size="small" onClick={() => setKitOpen(true)}>Create Bundle</Button>
          </Box>

          <Paper variant="outlined" sx={{ width:'100%', overflowX:'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Bundle Name</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Lane</TableCell>
                  <TableCell># Components</TableCell>
                  <TableCell>Total Cost</TableCell>
                  <TableCell>Total Sell</TableCell>
                  <TableCell>ROS %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((k, i) => {
                  const t = kitTotals(k);
                  return (
                    <TableRow key={i}>
                      <TableCell>{k.name}</TableCell>
                      <TableCell>{k.scope}</TableCell>
                      <TableCell>{k.lane || '-'}</TableCell>
                      <TableCell>{k.components.length}</TableCell>
                      <TableCell>{t.cost.toLocaleString()}</TableCell>
                      <TableCell>{t.sell.toLocaleString()}</TableCell>
                      <TableCell style={{ color: t.ros < 20 ? '#d32f2f' : 'inherit', fontWeight: t.ros < 20 ? 600 : 400 }}>{t.ros}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>

      <Dialog open={kitOpen} onClose={() => setKitOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create Rate Bundle</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField size="small" label="Bundle Name" value={kitName} onChange={(e) => setKitName(e.target.value)} placeholder="e.g. Asia → US West FCL – All-In" fullWidth />
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Scope</Typography>
              <Select size="small" fullWidth value={kitScope} onChange={(e) => setKitScope(e.target.value)}>
                <MenuItem value="FCL">FCL</MenuItem>
                <MenuItem value="LCL">LCL</MenuItem>
                <MenuItem value="Air">Air</MenuItem>
                <MenuItem value="Transport">Transport</MenuItem>
                <MenuItem value="Customs">Customs</MenuItem>
                <MenuItem value="Multi">Multi</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" label="Lane (optional)" value={kitLane} onChange={(e) => setKitLane(e.target.value)} placeholder="e.g. THBKK → USLAX or *" fullWidth />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2">Components</Typography>
                <Button variant="outlined" size="small" onClick={addComponent}>Add Component</Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Charge</TableCell>
                    <TableCell>Basis</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Sell</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {components.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell style={{ width: 260 }}>
                        <TextField size="small" fullWidth value={c.charge} onChange={(e) => updateComponent(idx, 'charge', e.target.value)} placeholder="e.g. Ocean, BAF, THC, Docs" />
                      </TableCell>
                      <TableCell style={{ width: 200 }}>
                        <Select size="small" fullWidth value={c.basis} onChange={(e) => updateComponent(idx, 'basis', e.target.value)}>
                          <MenuItem value="per container">per container</MenuItem>
                          <MenuItem value="per kg">per kg</MenuItem>
                          <MenuItem value="per cbm">per cbm</MenuItem>
                          <MenuItem value="fixed">fixed</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell style={{ width: 140 }}>
                        <TextField size="small" fullWidth value={c.cost} onChange={(e) => updateComponent(idx, 'cost', e.target.value)} inputProps={{ inputMode: 'decimal' }} placeholder="0" />
                      </TableCell>
                      <TableCell style={{ width: 140 }}>
                        <TextField size="small" fullWidth value={c.sell} onChange={(e) => updateComponent(idx, 'sell', e.target.value)} inputProps={{ inputMode: 'decimal' }} placeholder="0" />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" color="inherit" onClick={() => removeComponent(idx)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {(() => { const { cost, sell, ros } = kitTotals({ components }); return `Preview Total: Cost ${cost || 0} | Sell ${sell || 0} | ROS ${ros || 0}%`; })()}
          </Typography>
          <Box>
            <Button color="inherit" onClick={() => setKitOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveKit} sx={{ ml: 1 }}>Save Bundle</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
