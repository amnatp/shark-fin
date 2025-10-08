import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardHeader, CardContent, Divider, Typography,
  TextField, Button, IconButton, Grid, Chip, MenuItem, Select, InputLabel, FormControl,
  Checkbox, FormControlLabel, Tooltip, Snackbar, Alert, Dialog, DialogTitle, DialogActions, DialogContent
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/*
  Shipping Instruction (SLI) – works for both customer self‑service and internal CS/Sales.
  Links to a booking (and optionally quotation). Saves to localStorage key 'shippingInstructions'.

  Major sections (mapped from the provided SLI xlsx):
  - Parties: USPPI/Shipper, Consignee, Notify, FPPI/Intermediate Consignee
  - Transportation: Mode, Carrier, Export date, POL/POD, Scope (P2P/P2D/D2P/D2D), Booking ref
  - Commodities (repeatable lines): Description, HTS/Schedule B, Qty, Pkg type, Weight, UOM, Value (USD), ECCN, License/ITN
  - Dangerous Goods, Temperature Control
  - Charges Terms: Freight/Origin/Duty/Tax/Customs – Prepaid vs Collect
  - Authorization: name, title, signature date (typed)

  BL Preview panel summarizes fields typically printed on a Bill of Lading/HAWB.
*/

const SCOPE_OPTIONS = [
  'Port to Port',
  'Port to Door',
  'Door to Port',
  'Door to Door'
];

const MODE_OPTIONS = ['Ocean', 'Air', 'Rail', 'Truck'];
const UOM_OPTIONS = ['KGS', 'LBS'];
const PKG_TYPES = ['CTN', 'PAL', 'BAG', 'DRUM', 'BOX', 'CRATE'];

function emptyCommodity(){
  return {
    origin: '', destination: '', description: '', hts: '', eccn: '',
    qty: 0, pkgType: 'CTN', weight: 0, weightUom: 'KGS', valueUsd: 0,
    itn: '', licNoOrCfr: '', ddtdQtyUom: '', licValue: ''
  };
}

export default function ShippingInstruction(){
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [snack, setSnack] = React.useState({ open:false, ok:true, msg:'' });
  const [confirmPreview, setConfirmPreview] = React.useState(false);

  const [sli, setSli] = React.useState(()=>{
    // Prefill from booking/quotation if available
    try {
      const bookings = JSON.parse(localStorage.getItem('bookings')||'[]');
      const bk = bookings.find(b=> String(b.id)===String(bookingId));
      const base = {
        id: `SLI-${Date.now().toString(36)}`,
        bookingId: bookingId || '',
        quotationId: bk?.quotationId || '',
        status: 'Draft',
        parties: {
          shipper: { name: bk?.customerName || '', ein: '', address: '', contactName: '', contactPhone: '', contactEmail: '' },
          consignee: { name: bk?.consignee?.name || '', type: '', address: '' },
          notify: { name: bk?.notify?.name || '', address: '' },
          fppi: { name: '', address: '' },
          intermediate: { name: '', address: '' }
        },
        transport: {
          mode: bk?.mode || 'Ocean',
          scope: bk?.scope || 'Port to Port',
          exportingCarrier: bk?.carrier || '',
          exportDate: bk?.etd || '',
          pol: bk?.pol || bk?.origin || '',
          pod: bk?.pod || bk?.destination || '',
          placeOfReceipt: bk?.placeOfReceipt || '',
          placeOfDelivery: bk?.placeOfDelivery || '',
          refNo: bk?.bookingNo || bookingId || ''
        },
        compliance: {
          routedExport: null, hazmat: false,
          licenseDetermination: { nlr:true, ddct:false, bis:false, ofac:false },
        },
        commodities: [emptyCommodity()],
        charges: { freight:'Prepaid', origin:'Prepaid', duty:'Collect', tax:'Collect', customs:'Collect' },
        dg: { isDG:false, unNo:'', classSub:'', flashPoint:'', packingGroup:'', contact:'' },
        reefer: { isTempCtrl:false, tempC:'', tempF:'', vent:'', humidity:'' },
        authorization: { signer:'', title:'', date:(new Date()).toISOString().slice(0,10) }
      };
      return base;
    } catch { return {
      id: `SLI-${Date.now().toString(36)}`,
      bookingId: bookingId || '', quotationId: '', status:'Draft',
      parties:{ shipper:{}, consignee:{}, notify:{}, fppi:{}, intermediate:{} },
      transport:{ mode:'Ocean', scope:'Port to Port', exportingCarrier:'', exportDate:'', pol:'', pod:'', placeOfReceipt:'', placeOfDelivery:'', refNo: bookingId||'' },
      compliance:{ routedExport:null, hazmat:false, licenseDetermination:{ nlr:true, ddct:false, bis:false, ofac:false } },
      commodities:[emptyCommodity()],
      charges:{ freight:'Prepaid', origin:'Prepaid', duty:'Collect', tax:'Collect', customs:'Collect' },
      dg:{ isDG:false },
      reefer:{ isTempCtrl:false },
      authorization:{ signer:'', title:'', date:(new Date()).toISOString().slice(0,10) }
    }; }
  });

  function update(path, value){
    // dot-path updater e.g. update('parties.shipper.name', 'ACME')
    setSli(prev=>{
      const clone = JSON.parse(JSON.stringify(prev));
      const segs = path.split('.');
      let cur = clone; for(let i=0;i<segs.length-1;i++){ cur = cur[segs[i]] = cur[segs[i]] ?? {}; }
      cur[segs[segs.length-1]] = value; return clone;
    });
  }

  function updateCommodity(idx, patch){
    setSli(prev=> ({ ...prev, commodities: prev.commodities.map((c,i)=> i===idx? { ...c, ...patch }: c ) }));
  }

  function addCommodity(){ setSli(prev=> ({ ...prev, commodities:[...prev.commodities, emptyCommodity()] })); }
  function removeCommodity(idx){ setSli(prev=> ({ ...prev, commodities: prev.commodities.filter((_,i)=> i!==idx) })); }

  function validate(){
    const errs = [];
    const p = sli.parties || {};
    if(!p.shipper?.name) errs.push('Shipper name');
    if(!sli.transport.pol) errs.push('Port of Loading');
    if(!sli.transport.pod) errs.push('Port of Discharge');
    if(!sli.commodities?.length) errs.push('At least one commodity line');
    const hasDesc = sli.commodities.every(c=> (c.description||'').trim().length>0);
    if(!hasDesc) errs.push('Commodity description');
    return errs;
  }

  function save(status){
    const errs = validate();
    if(errs.length && status==='Ready for BL'){
      setSnack({ open:true, ok:false, msg:'Missing: '+errs.join(', ') });
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem('shippingInstructions')||'[]');
      const idx = list.findIndex(x=> x.id===sli.id);
      const rec = { ...sli, status: status || sli.status };
      if(idx>=0) list[idx]=rec; else list.unshift(rec);
      localStorage.setItem('shippingInstructions', JSON.stringify(list));
      setSli(rec);
      setSnack({ open:true, ok:true, msg: status? `Saved – status set to ${status}.` : 'Saved.' });
    } catch(err){ console.error(err); setSnack({ open:true, ok:false, msg:'Save failed.' }); }
  }

  function blPreview(){ setConfirmPreview(true); }

  const totals = React.useMemo(()=>{
    const pcs = (sli.commodities||[]).reduce((s,c)=> s + (Number(c.qty)||0), 0);
    const wt = (sli.commodities||[]).reduce((s,c)=> s + (Number(c.weight)||0), 0);
    const val = (sli.commodities||[]).reduce((s,c)=> s + (Number(c.valueUsd)||0), 0);
    return { pieces: pcs, weight: wt, valueUsd: val };
  }, [sli.commodities]);

  return (
    <Box display="flex" flexDirection="column" gap={2} p={1}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={()=>navigate(-1)} size="small"><ArrowBackIcon fontSize="inherit"/></IconButton>
          <Typography variant="h6">Shipping Instruction {sli.id}</Typography>
          {sli.status!=='Draft' && <Chip size="small" color={sli.status==='Ready for BL'?'success':'default'} label={sli.status}/>}   
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={()=>save('Draft')}>Save Draft</Button>
          <Button variant="contained" onClick={()=>save('Ready for BL')}>Mark Ready for BL</Button>
          <Button onClick={blPreview}>BL Preview</Button>
        </Box>
      </Box>

      {/* Parties */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Parties"/>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>USPPI / Shipper</Typography>
              <TextField size="small" label="Name" value={sli.parties.shipper.name||''} onChange={e=>update('parties.shipper.name', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="EIN (if applicable)" value={sli.parties.shipper.ein||''} onChange={e=>update('parties.shipper.ein', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="Address / Cargo Location" value={sli.parties.shipper.address||''} onChange={e=>update('parties.shipper.address', e.target.value)} fullWidth multiline minRows={2}/>
              <Box display="flex" gap={1} mt={1}>
                <TextField size="small" label="Contact Name" value={sli.parties.shipper.contactName||''} onChange={e=>update('parties.shipper.contactName', e.target.value)} sx={{ flex:1 }}/>
                <TextField size="small" label="Contact Phone" value={sli.parties.shipper.contactPhone||''} onChange={e=>update('parties.shipper.contactPhone', e.target.value)} sx={{ flex:1 }}/>
                <TextField size="small" label="Contact Email" value={sli.parties.shipper.contactEmail||''} onChange={e=>update('parties.shipper.contactEmail', e.target.value)} sx={{ flex:1 }}/>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Consignee</Typography>
              <TextField size="small" label="Name" value={sli.parties.consignee.name||''} onChange={e=>update('parties.consignee.name', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="Consignee Type" value={sli.parties.consignee.type||''} onChange={e=>update('parties.consignee.type', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="Address" value={sli.parties.consignee.address||''} onChange={e=>update('parties.consignee.address', e.target.value)} fullWidth multiline minRows={2}/>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Notify Party</Typography>
              <TextField size="small" label="Name" value={sli.parties.notify.name||''} onChange={e=>update('parties.notify.name', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="Address" value={sli.parties.notify.address||''} onChange={e=>update('parties.notify.address', e.target.value)} fullWidth multiline minRows={2}/>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>FPPI / Intermediate Consignee</Typography>
              <TextField size="small" label="FPPI Name (if different)" value={sli.parties.fppi.name||''} onChange={e=>update('parties.fppi.name', e.target.value)} fullWidth sx={{ mb:1 }}/>
              <TextField size="small" label="FPPI Address" value={sli.parties.fppi.address||''} onChange={e=>update('parties.fppi.address', e.target.value)} fullWidth multiline minRows={2}/>
              <TextField size="small" label="Intermediate Consignee (Name & Address)" value={sli.parties.intermediate.address||''} onChange={e=>update('parties.intermediate.address', e.target.value)} fullWidth multiline minRows={2} sx={{ mt:1 }}/>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transportation */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Transportation"/>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <FormControl size="small" fullWidth><InputLabel>Mode</InputLabel>
                <Select label="Mode" value={sli.transport.mode} onChange={e=>update('transport.mode', e.target.value)}>
                  {MODE_OPTIONS.map(m=> <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}><TextField size="small" label="Exporting Carrier" value={sli.transport.exportingCarrier||''} onChange={e=>update('transport.exportingCarrier', e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} md={3}><TextField size="small" type="date" label="Date of Export" InputLabelProps={{ shrink:true }} value={sli.transport.exportDate||''} onChange={e=>update('transport.exportDate', e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="Transportation Reference / Booking No." value={sli.transport.refNo||''} onChange={e=>update('transport.refNo', e.target.value)} fullWidth/></Grid>

            <Grid item xs={12} md={3}><TextField size="small" label="Place of Receipt" value={sli.transport.placeOfReceipt||''} onChange={e=>update('transport.placeOfReceipt', e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} md={3}><TextField size="small" label="Port of Loading (POL)" value={sli.transport.pol||''} onChange={e=>update('transport.pol', e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} md={3}><TextField size="small" label="Port of Discharge (POD)" value={sli.transport.pod||''} onChange={e=>update('transport.pod', e.target.value)} fullWidth/></Grid>
            <Grid item xs={12} md={3}><TextField size="small" label="Place of Delivery" value={sli.transport.placeOfDelivery||''} onChange={e=>update('transport.placeOfDelivery', e.target.value)} fullWidth/></Grid>

            <Grid item xs={12} md={3}>
              <FormControl size="small" fullWidth><InputLabel>Scope</InputLabel>
                <Select label="Scope" value={sli.transport.scope} onChange={e=>update('transport.scope', e.target.value)}>
                  {SCOPE_OPTIONS.map(o=> <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={9}>
              <Box display="flex" gap={3} alignItems="center">
                <FormControlLabel control={<Checkbox checked={sli.compliance.routedExport===true} onChange={e=>update('compliance.routedExport', e.target.checked)}/>} label="Routed Export Transaction"/>
                <FormControlLabel control={<Checkbox checked={!!sli.compliance.hazmat} onChange={e=>update('compliance.hazmat', e.target.checked)}/>} label="Hazardous Materials"/>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Commodities */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Commodity Information"/>
        <CardContent>
          {sli.commodities.map((c, idx)=>{
            return (
              <Box key={idx} border={1} borderColor="divider" borderRadius={1} p={2} mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">Line {idx+1}</Typography>
                  <Box display="flex" gap={1}>
                    {sli.commodities.length>1 && <Button size="small" color="error" onClick={()=>removeCommodity(idx)}>Remove</Button>}
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}><TextField size="small" label="Origin" value={c.origin} onChange={e=>updateCommodity(idx,{ origin:e.target.value })} fullWidth/></Grid>
                  <Grid item xs={12} md={3}><TextField size="small" label="Destination" value={c.destination} onChange={e=>updateCommodity(idx,{ destination:e.target.value })} fullWidth/></Grid>
                  <Grid item xs={12} md={6}><TextField size="small" label="Commodity Description" value={c.description} onChange={e=>updateCommodity(idx,{ description:e.target.value })} fullWidth/></Grid>

                  <Grid item xs={12} md={3}><TextField size="small" label="Schedule B / HTS" value={c.hts} onChange={e=>updateCommodity(idx,{ hts:e.target.value })} fullWidth/></Grid>
                  <Grid item xs={12} md={3}><TextField size="small" label="ECCN (if any)" value={c.eccn} onChange={e=>updateCommodity(idx,{ eccn:e.target.value })} fullWidth/></Grid>

                  <Grid item xs={6} md={2}><TextField size="small" type="number" label="Pieces" value={c.qty} onChange={e=>updateCommodity(idx,{ qty:Number(e.target.value||0) })} fullWidth/></Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl size="small" fullWidth><InputLabel>Pkg Type</InputLabel>
                      <Select label="Pkg Type" value={c.pkgType} onChange={e=>updateCommodity(idx,{ pkgType:e.target.value })}>
                        {PKG_TYPES.map(p=> <MenuItem key={p} value={p}>{p}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6} md={2}><TextField size="small" type="number" label="Weight" value={c.weight} onChange={e=>updateCommodity(idx,{ weight:Number(e.target.value||0) })} fullWidth/></Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl size="small" fullWidth><InputLabel>UOM</InputLabel>
                      <Select label="UOM" value={c.weightUom} onChange={e=>updateCommodity(idx,{ weightUom:e.target.value })}>
                        {UOM_OPTIONS.map(u=> <MenuItem key={u} value={u}>{u}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={2}><TextField size="small" type="number" label="Export Value (USD)" value={c.valueUsd} onChange={e=>updateCommodity(idx,{ valueUsd:Number(e.target.value||0) })} fullWidth/></Grid>

                  <Grid item xs={12} md={3}><TextField size="small" label="ITN (if filed)" value={c.itn} onChange={e=>updateCommodity(idx,{ itn:e.target.value })} fullWidth/></Grid>
                  <Grid item xs={12} md={3}><TextField size="small" label="Lic # / CFR Citation" value={c.licNoOrCfr} onChange={e=>updateCommodity(idx,{ licNoOrCfr:e.target.value })} fullWidth/></Grid>
                  <Grid item xs={12} md={3}><TextField size="small" label="DDTC Qty / UOM" value={c.ddtdQtyUom} onChange={e=>updateCommodity(idx,{ ddtdQtyUom:e.target.value })} fullWidth/></Grid>
                  <Grid item xs={12} md={3}><TextField size="small" label="License Value" value={c.licValue} onChange={e=>updateCommodity(idx,{ licValue:e.target.value })} fullWidth/></Grid>
                </Grid>
              </Box>
            );
          })}
          <Button variant="outlined" onClick={addCommodity}>Add Commodity Line</Button>
          <Divider sx={{ my:2 }}/>
          <Typography variant="body2" color="text.secondary">Totals: Pieces <strong>{totals.pieces}</strong> • Weight <strong>{totals.weight} {sli.commodities[0]?.weightUom||'KGS'}</strong> • Declared Value <strong>${totals.valueUsd.toFixed(2)}</strong></Typography>
        </CardContent>
      </Card>

      {/* Dangerous Goods & Temperature */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Special Handling"/>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={!!sli.dg.isDG} onChange={e=>update('dg.isDG', e.target.checked)}/>} label="Dangerous Goods"/>
              {sli.dg.isDG && (
                <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                  <TextField size="small" label="UN No." value={sli.dg.unNo||''} onChange={e=>update('dg.unNo', e.target.value)} sx={{ width:160 }}/>
                  <TextField size="small" label="Class/Sub" value={sli.dg.classSub||''} onChange={e=>update('dg.classSub', e.target.value)} sx={{ width:160 }}/>
                  <TextField size="small" label="Packing Group" value={sli.dg.packingGroup||''} onChange={e=>update('dg.packingGroup', e.target.value)} sx={{ width:180 }}/>
                  <TextField size="small" label="Flash Point" value={sli.dg.flashPoint||''} onChange={e=>update('dg.flashPoint', e.target.value)} sx={{ width:160 }}/>
                  <TextField size="small" label="Emergency Contact" value={sli.dg.contact||''} onChange={e=>update('dg.contact', e.target.value)} sx={{ minWidth:240 }}/>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={!!sli.reefer.isTempCtrl} onChange={e=>update('reefer.isTempCtrl', e.target.checked)}/>} label="Temperature Controlled"/>
              {sli.reefer.isTempCtrl && (
                <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                  <TextField size="small" label="Set Temp °C" value={sli.reefer.tempC||''} onChange={e=>update('reefer.tempC', e.target.value)} sx={{ width:140 }}/>
                  <TextField size="small" label="Set Temp °F" value={sli.reefer.tempF||''} onChange={e=>update('reefer.tempF', e.target.value)} sx={{ width:140 }}/>
                  <TextField size="small" label="Vent (%)" value={sli.reefer.vent||''} onChange={e=>update('reefer.vent', e.target.value)} sx={{ width:140 }}/>
                  <TextField size="small" label="Humidity (%)" value={sli.reefer.humidity||''} onChange={e=>update('reefer.humidity', e.target.value)} sx={{ width:160 }}/>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charges */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Charges & Terms"/>
        <CardContent>
          <Grid container spacing={2}>
            {['freight','origin','duty','tax','customs'].map(key=> (
              <Grid item xs={6} md={2.4} key={key}>
                <FormControl size="small" fullWidth><InputLabel>{key.charAt(0).toUpperCase()+key.slice(1)}</InputLabel>
                  <Select label={key} value={sli.charges[key]} onChange={e=>update(`charges.${key}`, e.target.value)}>
                    <MenuItem value="Prepaid">Prepaid</MenuItem>
                    <MenuItem value="Collect">Collect</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Authorization */}
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title="Authorization"/>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb:1 }}>By signing, you certify the information is true and correct and authorize the forwarder/carrier to file/export on your behalf as applicable.</Typography>
          <Box display="flex" gap={1}>
            <TextField size="small" label="Authorized Signer" value={sli.authorization.signer||''} onChange={e=>update('authorization.signer', e.target.value)} sx={{ minWidth:240 }}/>
            <TextField size="small" label="Title" value={sli.authorization.title||''} onChange={e=>update('authorization.title', e.target.value)} sx={{ minWidth:200 }}/>
            <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink:true }} value={sli.authorization.date||''} onChange={e=>update('authorization.date', e.target.value)} sx={{ minWidth:180 }}/>
          </Box>
        </CardContent>
      </Card>

      {/* BL Preview Dialog */}
      <Dialog open={confirmPreview} onClose={()=>setConfirmPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>BL / AWB Preview (Summary)</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Shipper</Typography>
              <Typography variant="body2">{sli.parties.shipper.name || '-'}<br/>{sli.parties.shipper.address || ''}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Consignee</Typography>
              <Typography variant="body2">{sli.parties.consignee.name || '-'}<br/>{sli.parties.consignee.address || ''}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my:1 }}/>
              <Box display="flex" gap={2} flexWrap="wrap" fontSize={14}>
                <span><strong>Place of Receipt:</strong> {sli.transport.placeOfReceipt||'-'}</span>
                <span><strong>POL:</strong> {sli.transport.pol||'-'}</span>
                <span><strong>POD:</strong> {sli.transport.pod||'-'}</span>
                <span><strong>Place of Delivery:</strong> {sli.transport.placeOfDelivery||'-'}</span>
                <span><strong>Carrier:</strong> {sli.transport.exportingCarrier||'-'}</span>
                <span><strong>Scope:</strong> {sli.transport.scope||'-'}</span>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my:1 }}/>
              <Typography variant="subtitle2" gutterBottom>Cargo</Typography>
              <ul style={{ marginLeft: '1.25rem' }}>
                {sli.commodities.map((c,i)=> (
                  <li key={i}>
                    <Typography variant="body2">{c.qty} {c.pkgType} – {c.description} – {c.weight} {c.weightUom} – USD {Number(c.valueUsd||0).toFixed(2)}</Typography>
                  </li>
                ))}
              </ul>
              <Typography variant="caption" color="text.secondary">Totals: {totals.pieces} pkgs • {totals.weight} {sli.commodities[0]?.weightUom||'KGS'} • USD {totals.valueUsd.toFixed(2)}</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setConfirmPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}