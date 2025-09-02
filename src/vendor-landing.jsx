import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button, Tooltip, Tabs, Tab, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
// Removed navigation to detail for vendor landing (Open button removed)
import { useAuth } from './auth-context';

// Vendor Landing: shows RFQs (rateRequests) relevant to logged-in vendor user.
// Visibility criteria: status in RFQ SENT, QUOTES IN, PRICED, REPLIED and vendor included in rfq.vendors or vendorQuotes list.

const STATUS_ORDER = ['RFQ SENT','QUOTES IN','PRICED','REPLIED'];

function StatusChip({ status }){
  const map = { 'RFQ SENT':'info', 'QUOTES IN':'primary', 'PRICED':'warning', 'REPLIED':'success' };
  return <Chip size="small" color={map[status]||'default'} label={status} variant="outlined"/>;
}

export default function VendorLanding(){
  const { user } = useAuth();
  const carrierLink = user?.carrierLink || (user?.display)||'';
  const [tab, setTab] = React.useState(0);
  const [rows, setRows] = React.useState(()=>{ try { return JSON.parse(localStorage.getItem('rateRequests')||'[]'); } catch { return []; } });
  React.useEffect(()=>{
    function sync(){ try { setRows(JSON.parse(localStorage.getItem('rateRequests')||'[]')); } catch{/* ignore */} }
    window.addEventListener('focus', sync); window.addEventListener('storage', sync); return ()=>{ window.removeEventListener('focus', sync); window.removeEventListener('storage', sync); };
  }, []);
  // no navigation needed after removing Open button
  const [snack, setSnack] = React.useState({ open:false, msg:'', ok:true });
  const fileInputRef = React.useRef(null);
  const [uploadTarget, setUploadTarget] = React.useState(null);
  const [previewDialog, setPreviewDialog] = React.useState({ open:false, lines:[], requestId:null });
  const statusFilter = STATUS_ORDER[tab];
  const filtered = rows.filter(r=> STATUS_ORDER.includes(r.status))
    .filter(r => r.status===statusFilter)
    .filter(r => {
      const inRFQ = (r.rfq?.vendors||[]).some(v=> v.toLowerCase()===carrierLink.toLowerCase());
      if(inRFQ) return true;
      return (r.lines||[]).some(l=> (l.vendorQuotes||[]).some(q=> (q.vendor||'').toLowerCase()===carrierLink.toLowerCase()));
    });
  const counts = STATUS_ORDER.reduce((acc,s)=>{ acc[s] = rows.filter(r=> r.status===s && rows.includes(r)).filter(r=>{
    const inRFQ = (r.rfq?.vendors||[]).some(v=> v.toLowerCase()===carrierLink.toLowerCase());
    if(inRFQ) return true; return (r.lines||[]).some(l=> (l.vendorQuotes||[]).some(q=> (q.vendor||'').toLowerCase()===carrierLink.toLowerCase()));
  }).length; return acc; }, {});

  function persistRequest(updated){
    try {
      const list = JSON.parse(localStorage.getItem('rateRequests')||'[]');
      const idx = list.findIndex(r=> r.id===updated.id);
      if(idx>=0) list[idx]=updated; else list.unshift(updated);
      localStorage.setItem('rateRequests', JSON.stringify(list));
      setRows(list);
    } catch {/* ignore */}
  }

  function handleAccept(r){
    if(!r) return;
    const already = (r.rfq?.accepted||[]).some(v=> v.toLowerCase()===carrierLink.toLowerCase());
    if(already){ setSnack({ open:true, ok:false, msg:'Already accepted.' }); return; }
    const next = { ...r, rfq: { ...(r.rfq||{}), accepted: [ ...(r.rfq?.accepted||[]), carrierLink ] } };
    persistRequest(next);
    setSnack({ open:true, ok:true, msg:'RFQ accepted.' });
  }

  function openUpload(r){
    setUploadTarget(r); fileInputRef.current?.click();
  }

  async function handleFileChange(e){
    const file = e.target.files?.[0]; if(!file){ setUploadTarget(null); return; }
    try {
      const text = await file.text();
    // Simple heuristic parse: expect CSV with columns lineId,price,transit(optional),remark(optional)
    // NOTE: Any provided 'sell' values are ignored (only internal Pricing team sets selling prices).
      const lines = text.split(/\r?\n/).filter(Boolean); if(lines.length<=1){ throw new Error('No data rows'); }
      const header = lines[0].toLowerCase();
      const hasLine = header.includes('line');
      const parsedQuotes = [];
      for(let i=1;i<lines.length;i++){
        const cols = lines[i].split(',').map(c=>c.trim());
        if(!cols.length) continue; if(hasLine){
      const [lineId, priceStr, transit, remark] = cols; // deliberately ignore any 3rd column that might be 'sell'
      if(!lineId) continue; const price = Number(priceStr)||0;
      parsedQuotes.push({ lineId, price, transit, remark });
        } else {
          // fallback layout just price per line order
          const price = Number(cols[0])||0; parsedQuotes.push({ lineId:String(i), price });
        }
      }
      // Apply quotes to request lines
      const r = uploadTarget; if(!r) throw new Error('Missing request');
      const accepted = (r.rfq?.accepted||[]).some(v=> v.toLowerCase()===carrierLink.toLowerCase());
      const patchLines = (r.lines||[]).map(l=>{
        const match = parsedQuotes.find(p=> p.lineId===l.id || p.lineId===String(l.id) || p.lineId===l.rateId);
        if(!match) return l;
        const existing = l.vendorQuotes||[];
        const idx = existing.findIndex(q=> (q.vendor||'').toLowerCase()===carrierLink.toLowerCase());
  // Vendor-provided sell ignored; ensure sell not persisted
  const quote = { vendor: carrierLink.toUpperCase(), price: match.price, transit: match.transit||existing[idx]?.transit||'—', remark: match.remark||'File Upload' };
        let vendorQuotes;
        if(idx>=0) vendorQuotes = existing.map((q,i)=> i===idx? quote : q); else vendorQuotes = [...existing, quote];
        return { ...l, vendorQuotes };
      });
      let nextStatus = r.status;
      if(r.status==='RFQ SENT') nextStatus='QUOTES IN';
      const updated = { ...r, status: nextStatus, rfq:{ ...(r.rfq||{}), accepted:[...(r.rfq?.accepted|| accepted? r.rfq.accepted:[]), carrierLink], submissions:[...(r.rfq?.submissions||[]), { vendor:carrierLink, file:file.name, ts: new Date().toISOString(), quotes: parsedQuotes.length }] }, lines: patchLines };
      persistRequest(updated);
      // Auto-create or update a quotation for internal team once vendor submits quotes
      try {
        const qStore = JSON.parse(localStorage.getItem('quotations')||'[]');
        const vendorKey = carrierLink.toUpperCase();
        // Identify existing quotation for this rate request + vendor
        let existing = qStore.find(q=> q.sourceRateRequestId===r.id && q.vendor===vendorKey);
        const buildLines = () => (updated.lines||[]).map(l => {
          const vq = (l.vendorQuotes||[]).find(v=> (v.vendor||'').toUpperCase()===vendorKey);
          return {
            rateId: l.rateId || l.id || `${r.id}-${l.origin||''}-${l.destination||''}`,
            vendor: vendorKey,
            carrier: l.carrier || l.vendor || vendorKey,
            origin: l.origin,
            destination: l.destination,
            unit: l.unit || l.containerType || l.basis || 'Unit',
            qty: 1,
            sell: vq?.sell!=null? Number(vq.sell): Number(vq?.price)||0,
            margin: 0
          };
        });
        if(!existing){
          const newId = `Q-${r.id}-${vendorKey}`.replace(/[^A-Z0-9-]/gi,'');
            existing = {
              id: newId,
              version:1,
              parentId:null,
              status:'draft',
              sourceRateRequestId: r.id,
              vendor: vendorKey,
              customer: r.customer || updated.inquirySnapshot?.customer || '—',
              mode: updated.inquirySnapshot?.mode || 'Sea FCL',
              incoterm: updated.inquirySnapshot?.incoterm || '',
              currency:'USD',
              lines: buildLines(),
              charges:[],
              activity:[{ ts:Date.now(), user: vendorKey, action:'import', note:`Created from vendor upload ${file.name}` }]
            };
            qStore.unshift(existing);
        } else {
          // Update lines and append activity
          existing.lines = buildLines();
          existing.activity = [...(existing.activity||[]), { ts:Date.now(), user: vendorKey, action:'update', note:`Updated from vendor upload ${file.name}` }];
          existing.updatedAt = new Date().toISOString();
        }
        localStorage.setItem('quotations', JSON.stringify(qStore));
  } catch{ /* ignore quotation creation errors so vendor flow not blocked */ }
      setSnack({ open:true, ok:true, msg:`Uploaded ${parsedQuotes.length} quote line(s).` });
      setPreviewDialog({ open:true, lines: parsedQuotes.slice(0,20), requestId: r.id });
    } catch(err){
      setSnack({ open:true, ok:false, msg:`Upload failed: ${err.message||err}` });
    } finally {
      e.target.value='';
      setUploadTarget(null);
    }
  }

  function closeStatus(r){
    // Optional helper: mark vendor portion complete (does not change global status beyond QUOTES IN)
    const updated = { ...r, rfq:{ ...(r.rfq||{}), vendorDone: [ ...(r.rfq?.vendorDone||[]).filter(v=> v!==carrierLink), carrierLink ] } };
    persistRequest(updated);
    setSnack({ open:true, ok:true, msg:'Marked as complete.' });
  }

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Typography variant="h6">Vendor RFQs • {carrierLink || user?.display}</Typography>
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} sx={{ '.MuiTabs-flexContainer':{ flexWrap:'wrap' }}}>
        {STATUS_ORDER.map((s,i)=> <Tab key={s} label={`${s} (${counts[s]||0})`} value={i} />)}
      </Tabs>
      <Card variant="outlined">
        <CardHeader titleTypographyProps={{ variant:'subtitle2' }} title={`Requests: ${STATUS_ORDER[tab]}`} />
        <CardContent sx={{ pt:0 }}>
          {!filtered.length && <Typography variant="caption" color="text.secondary">No requests for you in this status.</Typography>}
          {!!filtered.length && (
            <Table size="small">
               <TableHead>
                 <TableRow>
                   <TableCell>Request</TableCell>
                   <TableCell>Customer</TableCell>
                   <TableCell>Tradelane</TableCell>
                   <TableCell>Status</TableCell>
                   <TableCell align="right">Actions</TableCell>
                 </TableRow>
               </TableHead>
              <TableBody>
                {filtered.map(r=>{ 
                  const first=r.lines?.[0]; 
                  const od = first? `${first.origin}→${first.destination}` : (r.inquirySnapshot?.origin? `${r.inquirySnapshot.origin}→${r.inquirySnapshot.destination}`:'-'); 
                  const accepted = (r.rfq?.accepted||[]).some(v=> v.toLowerCase()===carrierLink.toLowerCase()); 
                  const vendorDone = (r.rfq?.vendorDone||[]).some(v=> v.toLowerCase()===carrierLink.toLowerCase()); 
                  const submissionsForVendor = (r.rfq?.submissions||[]).filter(s=> s.vendor===carrierLink);
                  const canClose = accepted && submissionsForVendor.length>0 && !vendorDone && r.status!=='REPLIED';
                  return (
                  <TableRow key={r.id} hover selected={vendorDone}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>{r.customer||'—'}</TableCell>
                    <TableCell>{od}</TableCell>
                    <TableCell><StatusChip status={r.status} />{vendorDone && <Chip size="small" sx={{ ml:0.5 }} color="success" label="Done" />}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace:'nowrap' }}>
                      {r.status==='RFQ SENT' && !accepted && (
                        <Button size="small" variant="outlined" onClick={()=>handleAccept(r)}>Accept</Button>
                      )}
                      {accepted && r.status!=='REPLIED' && (
                        <Button size="small" variant="outlined" sx={{ ml:0.5 }} onClick={()=>openUpload(r)}>Upload Quote</Button>
                      )}
                      {canClose && (
                        <Tooltip title="Close submission (after upload)"><span><Button size="small" color="success" sx={{ ml:0.5 }} onClick={()=>closeStatus(r)}>Close</Button></span></Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.txt,.json" style={{ display:'none' }} onChange={handleFileChange} />
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert onClose={()=>setSnack(s=>({...s,open:false}))} severity={snack.ok? 'success':'error'} variant="filled">{snack.msg}</Alert>
      </Snackbar>
      <Dialog open={previewDialog.open} onClose={()=>setPreviewDialog({ open:false, lines:[], requestId:null })} fullWidth maxWidth="sm">
        <DialogTitle>Uploaded Quotes Preview • {previewDialog.requestId}</DialogTitle>
        <DialogContent dividers>
          {!previewDialog.lines.length && <Typography variant="caption">No parsed lines.</Typography>}
          {!!previewDialog.lines.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Line</TableCell>
                  <TableCell align="right">Price</TableCell>
                  {/* Sell intentionally omitted for vendors */}
                  <TableCell>Transit</TableCell>
                  <TableCell>Remark</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewDialog.lines.map((l,i)=>(
                  <TableRow key={i}>
                    <TableCell>{l.lineId}</TableCell>
                    <TableCell align="right">{l.price}</TableCell>
                    {/* Sell not shown to vendors */}
                    <TableCell>{l.transit || '—'}</TableCell>
                    <TableCell>{l.remark || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {previewDialog.lines.length > 20 && <Typography variant="caption" color="text.secondary">Showing first 20 lines…</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setPreviewDialog({ open:false, lines:[], requestId:null })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
