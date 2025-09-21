import React from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, TextField, IconButton, Button, Divider, Chip, Card, CardHeader, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, Snackbar, Alert, Tooltip, Grid, Autocomplete } from '@mui/material';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { getLaneTrendPoints } from './price-trends';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useCart } from './cart-context';
import { useSettings } from './use-settings'; // retained for potential future logic (even though we don't use settings now)
import { loadInquiries, saveInquiries as persistInquiries, convertInquiryToQuotation } from './sales-docs';

import { useAuth } from './auth-context';
import { hideMarginFor } from './permissions';
import { INQUIRY_STATUSES } from './inquiry-statuses';


function InquiryCartDetail() {
  useSettings(); // invoke hook to stay consistent (no settings usage needed after column removals)
  // ROS logic removed (values still exist internally if needed for future)

  const { grouped, update, remove, totals, items, clear } = useCart();
  const navigate = useNavigate();
  const { user, USERS } = useAuth();
  const hideMargin = hideMarginFor(user);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [quoteOpen, setQuoteOpen] = React.useState(false);
  const CUSTOMER_OPTIONS = [
    { code:'CUSTA', name:'Customer A Co., Ltd.' },
    { code:'CUSTB', name:'Customer B Trading' },
    { code:'CUSTC', name:'Customer C Global' },
    { code:'CUSTD', name:'Customer D Logistics' }
  ];
  const [saveForm, setSaveForm] = React.useState(()=>({ customer:'', owner:'', mode:'Sea FCL', incoterm:'FOB', cargoReadyDate:'' }));
  const [saveStatus, setSaveStatus] = React.useState({ open:false, ok:true, msg:'' });

  // When dialog opens, default sales owner to current user login
  React.useEffect(()=>{
    if((saveOpen || quoteOpen) && user?.username){
      setSaveForm(f=> f.owner ? f : { ...f, owner: user.username });
    }
  }, [saveOpen, quoteOpen, user?.username]);

  function genInquiryNo() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const location = user?.location || 'XXX';
    // Find last running number for this location+month
    let running = 1;
    try {
      const list = loadInquiries();
      const prefix = `INQ-${location}${yy}${mm}`;
      const nums = list
        .map(x => x.id)
        .filter(id => id && id.startsWith(prefix))
        .map(id => parseInt(id.slice(prefix.length), 10))
        .filter(n => !isNaN(n));
      if(nums.length > 0) running = Math.max(...nums) + 1;
  } catch { /* ignore */ }
    return `INQ-${location}${yy}${mm}${String(running).padStart(3,'0')}`;
  }

  // Save cart as an Inquiry (uses unified adapter persistInquiries)
  function handleSaveInquiry(){
  const base = { customer: saveForm.customer, owner: saveForm.owner, mode: saveForm.mode, incoterm: saveForm.incoterm, cargoReadyDate: saveForm.cargoReadyDate };
    const selected = items.some(i=>i.special) ? items.filter(i=>i.special) : items; // if user marked special, treat those as chosen lines
    const uniqueLanes = Array.from(new Set(selected.map(i=> `${i.origin}→${i.destination}`)));
    const origin = uniqueLanes.length===1 ? uniqueLanes[0].split('→')[0] : 'MULTI';
    const destination = uniqueLanes.length===1 ? uniqueLanes[0].split('→')[1] : 'MULTI';
    const lines = selected.map(i=> ({
      // Use stable rateId (same as RateTable) falling back to internal id
      rateId: i.rateId || i.id,
      vendor: i.vendor,
      carrier: i.carrier,
      origin: i.origin,
      destination: i.destination,
      basis: i.basis,
      containerType: i.containerType,
      qty: i.qty,
  timeFrame: i.timeFrame || 'week',
      sell: i.sell,
      margin: i.margin,
      ros: i.sell? (i.margin / i.sell) * 100 : 0
    }));
    const id = genInquiryNo();
  const inquiry = { id, origin, destination, volume: `${lines.length} line${lines.length>1?'s':''}`, weight:'', status: INQUIRY_STATUSES[0], creditOk:true, notes:`Created from cart with ${lines.length} selected line${lines.length>1?'s':''}.`, lines, ...base };
    try {
      const existing = loadInquiries();
      // Persist using unified adapter; prepend new inquiry
      persistInquiries([inquiry, ...existing]);
      setSaveOpen(false);
      clear();
      setSaveStatus({ open:true, ok:true, msg:`Saved inquiry ${inquiry.id}; cart cleared.` });
    } catch(err){
      console.error('Failed saving inquiry', err);
      setSaveStatus({ open:true, ok:false, msg:'Failed to save inquiry.' });
    }
  }

  function exportQuotation(){
    const payload = {
      type: 'quotationDraft',
      createdAt: new Date().toISOString(),
      items: items.map(({ id, vendor, carrier, origin, destination, sell, margin, qty })=>({ id, vendor, carrier, origin, destination, sell, margin, qty })),
      totals,
      groups: grouped.map(g=> ({ od: g.key, count: g.list.length }))
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='quotation_draft.json'; a.click(); URL.revokeObjectURL(url);
  }

  function saveQuotationFromCart(){
    if(!items.length || !saveForm.customer){
      setSaveStatus({ open:true, ok:false, msg:'Customer required and cart cannot be empty.' });
      return;
    }
    // Step 1: create an Inquiry from the cart (same as Save Inquiry flow)
    const base = { customer: saveForm.customer, owner: saveForm.owner, mode: saveForm.mode, incoterm: saveForm.incoterm, cargoReadyDate: saveForm.cargoReadyDate };
    const selected = items.some(i=>i.special) ? items.filter(i=>i.special) : items;
    const uniqueLanes = Array.from(new Set(selected.map(i=> `${i.origin}→${i.destination}`)));
    const origin = uniqueLanes.length===1 ? uniqueLanes[0].split('→')[0] : 'MULTI';
    const destination = uniqueLanes.length===1 ? uniqueLanes[0].split('→')[1] : 'MULTI';
    const lines = selected.map(i=> ({
      rateId: i.rateId || i.id,
      vendor: i.vendor,
      carrier: i.carrier,
      origin: i.origin,
      destination: i.destination,
      basis: i.basis,
      containerType: i.containerType,
      qty: i.qty,
      timeFrame: i.timeFrame || 'week',
      sell: i.sell,
      margin: i.margin,
      ros: i.sell? (i.margin / i.sell) * 100 : 0
    }));
    const inqId = genInquiryNo();
  const inquiry = { id: inqId, origin, destination, volume: `${lines.length} line${lines.length>1?'s':''}`, weight:'', status: INQUIRY_STATUSES[0], creditOk:true, notes:`Created from cart with ${lines.length} selected line${lines.length>1?'s':''}.`, lines, ...base };
    try {
      const existingInq = loadInquiries();
      persistInquiries([inquiry, ...existingInq]);
    } catch(err){
      console.error('Failed creating inquiry for quotation', err);
      setSaveStatus({ open:true, ok:false, msg:'Failed to create inquiry for quotation.' });
      return;
    }
    // Step 2: convert that Inquiry to a Quotation in the unified store (keeps inquiry; creates separate quotation)
    try {
      const q = convertInquiryToQuotation(inqId, { user });
      setQuoteOpen(false);
      clear();
  setSaveStatus({ open:true, ok:true, msg:`Created quotation ${q.id} for inquiry ${inqId}.` });
      navigate(`/quotations/${q.id}`);
    } catch(err){
      console.error('Failed converting inquiry to quotation', err);
      setSaveStatus({ open:true, ok:false, msg:'Failed to convert inquiry to quotation.' });
    }
  }

  // Removed procurement request feature (now initiated from Inquiry Edit screen)

  return (
    <Box display="flex" flexDirection="column" gap={3} p={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={()=>navigate(-1)} size="small"><ArrowBackIcon fontSize="inherit" /></IconButton>
          <Typography variant="h6">{user?.role === 'Customer' ? 'My Inquiry' : 'Inquiry Cart Detail'}</Typography>
          {/* Removed Customer Target Price chip for simplified header */}
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" disabled={items.length===0} onClick={()=>setSaveOpen(true)}>Save as Inquiry</Button>
          <Button variant="contained" color="primary" startIcon={<RequestQuoteIcon />} disabled={items.length===0} onClick={()=>setQuoteOpen(true)}>Save as Quotation</Button>
          <Button variant="contained" startIcon={<DescriptionIcon />} disabled={items.length===0} onClick={exportQuotation}>Export JSON</Button>
        </Box>
      </Box>
      {grouped.length===0 && <Typography variant="body2" color="text.secondary">Cart empty. Add rates from Inquiry Cart Builder.</Typography>}
      {/* ROS / auto-approve legend removed per requirements */}
      {grouped.map(group => {
        const isAirGroup = group.list.length>0 && group.list.every(item => item.mode==='Air' || item.type==='airSheet' || (item.basis||'').toLowerCase().includes('kg'));
        if(isAirGroup){
          const BREAKS = [45,100,300,500,1000];
          return (
            <Card key={group.key} variant="outlined">
              <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title={group.key} />
              <CardContent sx={{ pt:0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th':{ fontWeight:600 } }}>
                      <TableCell>Actions</TableCell>
                      <TableCell>Lane</TableCell>
                      <TableCell>Airline</TableCell>
                      <TableCell>Svc</TableCell>
                      <TableCell>Valid</TableCell>
                      <TableCell align="right">MIN</TableCell>
                      {BREAKS.map(b=> <TableCell key={b} align="right">≥{b}</TableCell>)}
                      <TableCell align="right">Commodities</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.list.map(item => {
                      const vf = item.validFrom || item.validity?.from || '';
                      const vt = item.validTo || item.validity?.to || '';
                      const min = (item.minCharge!=null? item.minCharge : (item.minChargeSell!=null? item.minChargeSell : null));
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ whiteSpace:'nowrap' }}>
                            <Button size="small" variant="outlined" onClick={()=>remove(item.id)}>Remove</Button>
                          </TableCell>
                          <TableCell>{item.origin} → {item.destination}</TableCell>
                          <TableCell>{item.airlineName || item.vendor || '-'}</TableCell>
                          <TableCell>{item.serviceType || item.service || '-'}</TableCell>
                          <TableCell>{vf || '-'} → {vt || '-'}</TableCell>
                          <TableCell align="right">{min!=null? Number(min).toFixed(0) : '-'}</TableCell>
                          {BREAKS.map(b=> (
                            <TableCell key={b} align="right">{item.breaks && item.breaks[b]!=null ? item.breaks[b] : (item.ratePerKgSell!=null ? item.ratePerKgSell : '-')}</TableCell>
                          ))}
                          <TableCell align="right">{item.commoditiesCount!=null? item.commoditiesCount : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        }
        // Default (non-Air) table
        return (
          <Card key={group.key} variant="outlined">
            <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title={group.key} />
            <CardContent sx={{ pt:0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rate</TableCell>
                    <TableCell>Container</TableCell>
                    <TableCell align="right">Sell</TableCell>
                    {!hideMargin && <TableCell align="right">Margin</TableCell>}
                    <TableCell align="center">Trend</TableCell>
                    <TableCell align="center">Qty / Time Frame</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.list.map(item=> { 
                    // Auto derive sell for air sheet rows if missing (weight unknown at add time)
                    let displaySell = item.sell || 0; let extraInfo = null;
                    if(item.type==='airSheet'){
                      // If sell is zero but minChargeSell exists use it as baseline
                      if(displaySell===0 && item.minChargeSell){ displaySell = item.minChargeSell; extraInfo = `Min Charge`; }
                    }
                    return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{item.vendor || item.airlineName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.rateId || item.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight={500} display="block">{item.containerType || (item.type==='airSheet' ? 'Air' : '—')}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.basis || (item.type==='airSheet'? 'Per KG (Sheet)': '')}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {displaySell.toFixed(2)}
                        {extraInfo && <Typography variant="caption" color="text.secondary" display="block">{extraInfo}</Typography>}
                      </TableCell>
                      {!hideMargin && <TableCell align="right">{(item.margin||0).toFixed(2)}</TableCell>}
                      <TableCell align="center" sx={{ width:120 }}>
                        <Box sx={{ height:36 }}>
                          <ResponsiveContainer>
                            <LineChart data={getLaneTrendPoints(`${item.origin} → ${item.destination}`, 12, item.sell)} margin={{ top:4, left:0, right:0, bottom:0 }}>
                              <Line type="monotone" dataKey="y" stroke="#1976d2" strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace:'nowrap' }}>
                        <Box display="inline-flex" alignItems="center" gap={1}>
                          <TextField type="number" size="small" value={item.qty} onChange={e=>update(item.id,{ qty:Number(e.target.value||1)})} inputProps={{ min:1, style:{ textAlign:'center', width:60 } }} />
                          <FormControl size="small" sx={{ minWidth:72 }}>
                            <Select value={item.timeFrame || 'week'} onChange={e=>update(item.id,{ timeFrame:e.target.value })}>
                              <MenuItem value="week">Week</MenuItem>
                              <MenuItem value="month">Month</MenuItem>
                              <MenuItem value="year">Year</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </TableCell>
                      <TableCell align="center"><IconButton size="small" onClick={()=>remove(item.id)}><DeleteIcon fontSize="inherit" /></IconButton></TableCell>
                    </TableRow>
                  ); })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
      {items.length>0 && (
        <>
          <Divider />
          <Box display="flex" justifyContent="space-between" flexWrap="wrap" rowGap={1} columnGap={3} fontSize={14}>
            <Box display="flex" gap={3}>
              <Box>Sell: <strong>{totals.sell.toFixed(2)}</strong></Box>
              <Box>Margin: <strong>{totals.margin.toFixed(2)}</strong></Box>
              {/* Customer Target Price summary removed */}
            </Box>
            <Box display="flex" gap={2} fontSize={13} color="text.secondary">
              {totals.units?.containers>0 && <span>Containers: <strong>{totals.units.containers}</strong></span>}
              {totals.units?.teu>0 && <span>TEU: <strong>{totals.units.teu.toFixed(2)}</strong></span>}
              {totals.units?.kg>0 && <span>KG Qty: <strong>{totals.units.kg}</strong></span>}
            </Box>
          </Box>
        </>
      )}
      <Dialog open={saveOpen} onClose={()=>setSaveOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Save Cart as Inquiry</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>Create a draft inquiry from these cart lines for pricing & quotation workflow.</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                size="small"
                options={(user?.role === 'Pricing')
                  ? CUSTOMER_OPTIONS
                  : CUSTOMER_OPTIONS.filter(c=> !user?.allowedCustomers || user.allowedCustomers.includes(c.code))}
                getOptionLabel={(o)=> o.code + ' – ' + o.name}
                value={CUSTOMER_OPTIONS.find(c=> c.code===saveForm.customer) || null}
                onChange={(e,v)=> setSaveForm(f=>({...f, customer: v? v.code : '' }))}
                renderInput={(params)=><TextField {...params} label="Customer" required error={!saveForm.customer} helperText={!saveForm.customer? 'Required':''} />}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                size="small"
                options={USERS.filter(u=>u.role==='Sales' || u.role==='SalesManager' || u.role==='RegionManager').map(u=>({ username:u.username, display:u.display }))}
                getOptionLabel={o=> o.display || o.username}
                value={USERS.find(u=>u.username===saveForm.owner) || null}
                onChange={(_,v)=> setSaveForm(f=>({...f, owner: v? v.username : '' }))}
                renderInput={(params)=><TextField {...params} label="Sales Owner" />}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3}><FormControl size="small" fullWidth><InputLabel>Mode</InputLabel><Select label="Mode" value={saveForm.mode} onChange={e=>setSaveForm(f=>({...f,mode:e.target.value}))}>{['Sea FCL','Sea LCL','Air','Transport','Customs'].map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} sm={4} md={3}><TextField label="Incoterm" size="small" fullWidth value={saveForm.incoterm} onChange={e=>setSaveForm(f=>({...f,incoterm:e.target.value}))} /></Grid>
            <Grid item xs={6} sm={4} md={3}><TextField label="Cargo Ready" type="date" size="small" fullWidth InputLabelProps={{ shrink:true }} value={saveForm.cargoReadyDate} onChange={e=>setSaveForm(f=>({...f,cargoReadyDate:e.target.value}))} /></Grid>
            <Grid item xs={12} md={3} display="flex" alignItems="center">
              <Box fontSize={13} color="text.secondary" sx={{ lineHeight:1.3 }}>
                <strong>{items.length}</strong> line{items.length!==1?'s':''}<br/>
                <strong>{grouped.length}</strong> lane{grouped.length!==1?'s':''}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" gap={3} flexWrap="wrap" fontSize={13} color="text.secondary">
                <span>Total Sell: <strong>{totals.sell.toFixed(2)}</strong></span>
                <span>Total Margin: <strong>{totals.margin.toFixed(2)}</strong></span>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Mark lines as Special (if supported) to include only those; otherwise all lines are saved.</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setSaveOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" disabled={!items.length || !saveForm.customer} onClick={handleSaveInquiry}>Save Inquiry</Button>
        </DialogActions>
      </Dialog>
      {/* Save as Quotation Dialog */}
      <Dialog open={quoteOpen} onClose={()=>setQuoteOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Save Cart as Quotation</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>Create a draft quotation from these cart lines. You can adjust details on the next screen.</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                size="small"
                options={(user?.role === 'Pricing')
                  ? CUSTOMER_OPTIONS
                  : CUSTOMER_OPTIONS.filter(c=> !user?.allowedCustomers || user.allowedCustomers.includes(c.code))}
                getOptionLabel={(o)=> o.code + ' – ' + o.name}
                value={CUSTOMER_OPTIONS.find(c=> c.code===saveForm.customer) || null}
                onChange={(e,v)=> setSaveForm(f=>({...f, customer: v? v.code : '' }))}
                renderInput={(params)=><TextField {...params} label="Customer" required error={!saveForm.customer} helperText={!saveForm.customer? 'Required':''} />}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                size="small"
                options={USERS.filter(u=>u.role==='Sales' || u.role==='SalesManager' || u.role==='RegionManager').map(u=>({ username:u.username, display:u.display }))}
                getOptionLabel={o=> o.display || o.username}
                value={USERS.find(u=>u.username===saveForm.owner) || null}
                onChange={(_,v)=> setSaveForm(f=>({...f, owner: v? v.username : '' }))}
                renderInput={(params)=><TextField {...params} label="Sales Owner" />}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} sm={4} md={3}><FormControl size="small" fullWidth><InputLabel>Mode</InputLabel><Select label="Mode" value={saveForm.mode} onChange={e=>setSaveForm(f=>({...f,mode:e.target.value}))}>{['Sea FCL','Sea LCL','Air','Transport','Customs'].map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={6} sm={4} md={3}><TextField label="Incoterm" size="small" fullWidth value={saveForm.incoterm} onChange={e=>setSaveForm(f=>({...f,incoterm:e.target.value}))} /></Grid>
            <Grid item xs={12} md={6} display="flex" alignItems="center">
              <Box fontSize={13} color="text.secondary" sx={{ lineHeight:1.3 }}>
                <strong>{items.length}</strong> line{items.length!==1?'s':''} • <strong>{grouped.length}</strong> lane{grouped.length!==1?'s':''}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" gap={3} flexWrap="wrap" fontSize={13} color="text.secondary">
                <span>Total Sell: <strong>{totals.sell.toFixed(2)}</strong></span>
                <span>Total Margin: <strong>{totals.margin.toFixed(2)}</strong></span>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setQuoteOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={saveQuotationFromCart} disabled={!items.length || !saveForm.customer}>Save Quotation</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={saveStatus.open} autoHideDuration={4000} onClose={()=>setSaveStatus(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert severity={saveStatus.ok? 'success':'error'} variant="filled" onClose={()=>setSaveStatus(s=>({...s,open:false}))}>{saveStatus.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

export default InquiryCartDetail;




