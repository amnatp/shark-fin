import React from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import {
  Box, Typography, Button, Divider, Chip, Card, CardHeader, CardContent,
  Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, MenuItem, Select, FormControl, InputLabel, Checkbox
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CompareIcon from '@mui/icons-material/Compare';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CachedIcon from '@mui/icons-material/Cached';
import ReplyIcon from '@mui/icons-material/Reply';
import AddIcon from '@mui/icons-material/Add';

/**
 * PROCUREMENT & PRICING WORKBENCH (MUI)
 *
 * Purpose: Let Procurement/Pricing respond to a "Request Better Rate" raised from the Sales Inquiry Cart Detail page.
 *
 * Screens included in this single file:
 * 1) <RateRequestsInbox/> — inbox of improvement requests (by status tab)
 * 2) <RateRequestDetail/> — request header, lines, RFQ/quotes collection, vendor comparison, pricing decision, publish back to Sales
 *
 * Integration notes:
 * - Sales page payload type: 'rateImprovementRequest'. You can pass it as prop `request` to <RateRequestDetail/>.
 * - The "Publish to Sales" action emits a JSON payload type: 'rateImprovementResponse'.
 * - Replace local state with real API calls later (RFQ send, vendor quote ingest, approval workflow).
 */

/************** Utilities **************/
function ros(margin, sell){ const s = Number(sell)||0; const m = Number(margin)||0; return s? (m/s)*100 : 0; }
function money(n){ const v = Number(n)||0; return v.toFixed(2); }
function ROSChip({ value }){ const color = value>=20? 'success': value>=12? 'warning':'error'; return <Chip size="small" color={color} label={`${value.toFixed(1)}%`} variant={value>=20?'filled':'outlined'} />; }
function StatusChip({ status }){
  const map = { 'NEW':'default', 'RFQ SENT':'info', 'QUOTES IN':'primary', 'PRICED':'warning', 'REPLIED':'success' };
  return <Chip size="small" color={map[status]||'default'} label={status} variant="outlined"/>;
}

// Removed SAMPLE_REQUEST: screen must now always reflect an actual stored request created from an Inquiry.

/************** Inbox **************/
export function RateRequestsInbox(){
  const tabs = ['NEW','RFQ SENT','QUOTES IN','PRICED','REPLIED'];
  const [tab, setTab] = React.useState(0);
  const [rows, setRows] = React.useState(()=>{ try { return JSON.parse(localStorage.getItem('rateRequests')||'[]'); } catch { return []; } });
  React.useEffect(()=>{
    const sync = () => { try { setRows(JSON.parse(localStorage.getItem('rateRequests')||'[]')); } catch {/* ignore */} };
    window.addEventListener('focus', sync);
    return ()=> window.removeEventListener('focus', sync);
  }, []);
  const filtered = rows.filter(r => r.status === tabs[tab]);
  const navigate = useNavigate();
  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Typography variant="h6">Rate Improvement Requests</Typography>
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} sx={{ '.MuiTabs-flexContainer':{ flexWrap:'wrap' }}}>
        {tabs.map(t => <Tab key={t} label={t} />)}
      </Tabs>
      <Card variant="outlined">
        <CardHeader title="Inbox"/>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Request</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>OD / Mode</TableCell>
                <TableCell>Urgency</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(r => { const first = r.lines?.[0]; const od = first? `${first.origin}→${first.destination}` : (r.inquirySnapshot?.origin? `${r.inquirySnapshot.origin}→${r.inquirySnapshot.destination}`:'-'); const mode = r.mode || first?.basis || '—'; return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.customer||'—'}</TableCell>
                  <TableCell>{od} • {mode}</TableCell>
                  <TableCell><Chip size="small" label={r.urgency||'Normal'} color={r.urgency==='High'?'warning':'default'} variant="outlined"/></TableCell>
                  <TableCell><StatusChip status={r.status||'NEW'}/></TableCell>
                  <TableCell align="right"><Button size="small" variant="contained" onClick={()=>navigate(`/pricing/request/${r.id}`)}>Open</Button></TableCell>
                </TableRow>
              ); })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}

/************** Request Detail **************/
export default function RateRequestDetail({ request: propRequest }){
  const { id: routeId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;
  const isSalesView = role === 'Sales';
  const canEdit = role === 'Pricing';
  const [request, setRequest] = React.useState(null);
  const [status, setStatus] = React.useState('NEW');
  const [assignee, setAssignee] = React.useState('buyer.panadda');
  const [deadline, setDeadline] = React.useState('');
  const [quoteRows, setQuoteRows] = React.useState([]);
  // Approval states (only meaningful for procurement/pricing view)
  const [approvers, setApprovers] = React.useState({ director:'', management:'' });
  const [approvalStatus, setApprovalStatus] = React.useState('DRAFT'); // DRAFT -> AWAITING -> APPROVED
  // Persistence helpers (prototype): keep request mutations in localStorage
  const persistRef = React.useRef(false);
  function persist(updated){
    if(!updated) return;
    try {
      const list = JSON.parse(localStorage.getItem('rateRequests')||'[]');
      const idx = list.findIndex(r=>r.id===updated.id);
      if(idx>=0) list[idx]=updated; else list.unshift(updated);
      localStorage.setItem('rateRequests', JSON.stringify(list));
    } catch{/* ignore */}
  }
  function patchRequest(p){
    setRequest(curr => {
      if(!curr) return curr;
      const next = { ...curr, ...p };
      persist(next);
      return next;
    });
  }

  // Load request from props or localStorage based on route id
  React.useEffect(()=>{
    if(propRequest){
      setRequest(propRequest);
      return;
    }
    if(routeId){
      try {
        const list = JSON.parse(localStorage.getItem('rateRequests')||'[]');
        const found = list.find(r=>r.id===routeId);
        if(found) setRequest(found);
        else setRequest(null);
      } catch { setRequest(null); }
    }
  }, [routeId, propRequest]);

  // Auto-refresh on window focus or storage changes (another tab updating the request)
  React.useEffect(()=>{
    function reload(){
      if(propRequest) return; // external prop controls
      if(!routeId) return;
      try {
        const list = JSON.parse(localStorage.getItem('rateRequests')||'[]');
        const found = list.find(r=>r.id===routeId);
        if(found) setRequest(found);
      } catch {/* ignore */}
    }
    window.addEventListener('focus', reload);
    window.addEventListener('storage', reload);
    return ()=>{ window.removeEventListener('focus', reload); window.removeEventListener('storage', reload); };
  }, [routeId, propRequest]);

  // When request loads/changes, initialize per-request states
  React.useEffect(()=>{
    if(!request) return;
    setStatus(request.status || 'NEW');
    if(request.assignee) setAssignee(request.assignee);
    if(request.deadline) setDeadline(request.deadline); else if(!deadline) setDeadline(new Date(Date.now()+3*86400000).toISOString().slice(0,10));
    // Build quoteRows if empty or length mismatch
    setQuoteRows(prev => {
      if(prev.length && prev.every(p=> request.lines?.some(l=> l.id===p.lineId))) return prev; // keep existing selections
      return (request.lines||[]).map(l => {
        const currentCost = (Number(l.sell)||0) - (Number(l.margin)||0);
        return {
          lineId: l.id,
            // Preserve full original line for traceability / further fields
          originalLine: { ...l },
          inquiryId: l.inquiryId,
          origin: l.origin,
          destination: l.destination,
          basis: l.basis,
          containerType: l.containerType,
          vendor: l.vendor,
          carrier: l.carrier,
          qty: l.qty,
          sell: l.sell,
          currentMargin: l.margin,
          currentROS: l.ros,
          vendorQuotes: [
            { vendor: l.vendor || 'CurrentVendor', price: currentCost, transit:'—', remark:'Current cost' },
          ],
          chosenVendor: '', chosenPrice: null, note:''
        };
      });
    });
  }, [request]);
  const [snack, setSnack] = React.useState({ open:false, msg:'', ok:true });
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareIdx, setCompareIdx] = React.useState(0);

  function rfqSend(){ setStatus('RFQ SENT'); patchRequest({ status:'RFQ SENT' }); setSnack({ open:true, ok:true, msg:'RFQ sent to selected vendors.' }); }
  function importQuotes(e){
    // placeholder: parse file here
    setStatus('QUOTES IN'); patchRequest({ status:'QUOTES IN' }); setSnack({ open:true, ok:true, msg:'Vendor quotes imported.' });
  }
  function chooseVendor(ix, vendor, price){
    setQuoteRows(rows => rows.map((r,i)=> i===ix?{...r, chosenVendor:vendor, chosenPrice:price}: r));
    setRequest(req => {
      if(!req) return req;
      const targetId = quoteRows[ix]?.lineId;
      if(!targetId) return req;
      const lines = (req.lines||[]).map(l=> l.id===targetId? { ...l, chosenVendor:vendor, chosenPrice:price }: l);
      const updated = { ...req, lines };
      persist(updated);
      return updated;
    });
  }

  function targetBuyForRos(sell, targetROS){ // sell - (sell*targetROS%) = max allowable cost
    const s = Number(sell)||0; const rosPct = Number(targetROS)||0; const marginTarget = (rosPct/100)*s; return s - marginTarget;
  }

  function lineSuggestion(r, targetROS){
    const maxCost = targetBuyForRos(r.sell, targetROS);
    // current cost = sell - currentMargin
    const currentCost = r.sell - r.currentMargin;
    const bestVendor = [...r.vendorQuotes].sort((a,b)=> a.price-b.price)[0];
    const need = Math.max(0, currentCost - maxCost);
    return { maxCost, currentCost, bestVendor, need, meets: bestVendor ? bestVendor.price <= maxCost : false };
  }

  function publishToSales(){
    const payload = {
      type: 'rateImprovementResponse',
      requestId: request.id,
      status,
      assignee,
      deadline,
      lines: quoteRows.map(r => ({
        id: r.lineId,
        origin: r.origin,
        destination: r.destination,
        basis: r.basis,
        chosenVendor: r.chosenVendor,
        buyPrice: r.chosenPrice,
        note: r.note
      }))
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`response_${request.id}.json`; a.click(); URL.revokeObjectURL(url);
  setStatus('REPLIED'); patchRequest({ status:'REPLIED' }); setSnack({ open:true, ok:true, msg:'Published response JSON to Sales.' });
  }

  // -------- Approval & Proposal (Procurement view only) --------
  const proposal = React.useMemo(()=>{
    let sellTotal=0, costTotal=0; 
    quoteRows.forEach(r=>{
      const qty = Number(r.qty)||1; const sellLine = Number(r.sell)||0; const currentCost = sellLine - (Number(r.currentMargin)||0);
      const bestQuote = (r.vendorQuotes||[]).length? [...r.vendorQuotes].sort((a,b)=>a.price-b.price)[0]: null;
      const chosenCost = r.chosenPrice ?? bestQuote?.price ?? currentCost;
      sellTotal += sellLine * qty; costTotal += (Number(chosenCost)||0) * qty;
    });
    const marginTotal = sellTotal - costTotal; const rosPct = sellTotal? (marginTotal/sellTotal)*100:0;
    return { sellTotal, costTotal, marginTotal, rosPct };
  }, [quoteRows]);

  function routeForROS(rosPct){
    if(rosPct < 15) return { required:['Director','Top Management'], label:'Director + Top Management' };
    if(rosPct < 20) return { required:['Director'], label:'Director' };
    return { required:[], label:'None' };
  }
  const approvalRoute = routeForROS(proposal.rosPct);
  const approvalsSatisfied = React.useMemo(()=>{
    if(approvalRoute.required.includes('Director') && !approvers.director) return false;
    if(approvalRoute.required.includes('Top Management') && !approvers.management) return false;
    return true;
  }, [approvalRoute, approvers]);

  function submitForApproval(){
    if(!approvalsSatisfied){ setSnack({ open:true, ok:false, msg:'Select required approver(s) first.' }); return; }
    setApprovalStatus('AWAITING'); setStatus('AWAITING APPROVAL'); patchRequest({ status:'AWAITING APPROVAL', approvalStatus:'AWAITING', approvers }); setSnack({ open:true, ok:true, msg:'Submitted for approval.' });
  }
  function recordApproval(){ setApprovalStatus('APPROVED'); setStatus('APPROVED'); patchRequest({ status:'APPROVED', approvalStatus:'APPROVED', approvers }); setSnack({ open:true, ok:true, msg:'Approval recorded.' }); }

  if(request === null){
    return (
      <Box p={2}><Typography variant="h6">Request not found</Typography></Box>
    );
  }
  if(!request){
    return <Box p={2}><Typography variant="body2">Loading request...</Typography></Box>;
  }

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      {/* Header */}
      <Card variant="outlined">
        <CardHeader title={`Request ${request.id}`} subheader={`From: ${request.owner || '—'} • Urgency: ${request.urgency || 'Normal'}`} />
        <CardContent>
          <Box display="flex" justifyContent="space-between" rowGap={1} columnGap={2} flexWrap="wrap">
            <Box display="flex" gap={2} alignItems="center">
              <Typography variant="body2">Totals</Typography>
              {(() => {
                const lines = request.lines||[];
                const sellSum = lines.reduce((a,l)=> a + (Number(l.sell)||0), 0);
                const marginSum = lines.reduce((a,l)=> a + (Number(l.margin)||0), 0);
                const rosVal = sellSum ? (marginSum / sellSum) * 100 : 0;
                return <React.Fragment>
                  <Chip size="small" label={`Sell ${money(sellSum)}`} />
                  <Chip size="small" label={`Margin ${money(marginSum)}`} />
                  <ROSChip value={rosVal} />
                </React.Fragment>;
              })()}
            </Box>
            <Box display="flex" gap={2} alignItems="center">
              <FormControl size="small"><InputLabel>Assignee</InputLabel><Select label="Assignee" value={assignee} onChange={e=>{ if(!canEdit) return; setAssignee(e.target.value); patchRequest({ assignee:e.target.value }); }} disabled={!canEdit} sx={{ minWidth: 180 }}>
                {['buyer.panadda','buyer.chai','buyer.mai'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select></FormControl>
              <TextField size="small" type="date" label="Deadline" InputLabelProps={{ shrink:true }} value={deadline} onChange={e=>{ if(!canEdit) return; setDeadline(e.target.value); patchRequest({ deadline:e.target.value }); }} disabled={!canEdit} />
              <StatusChip status={status} />
            </Box>
          </Box>
          {request.inquiryId && (
            <Box mt={2} p={1.5} borderRadius={1} sx={{ bgcolor:'action.hover', fontSize:13, display:'flex', flexDirection:'column', gap:.5 }}>
              <Typography variant="subtitle2" gutterBottom>Linked Inquiry</Typography>
              <Box display="flex" gap={3} flexWrap="wrap">
                <span><strong>ID:</strong> <Link to={`/inquiry/${request.inquiryId}`}>{request.inquiryId}</Link></span>
                {request.inquirySnapshot?.origin && <span><strong>OD:</strong> {request.inquirySnapshot.origin} → {request.inquirySnapshot.destination}</span>}
                {request.rosTarget!=null && <span><strong>ROS Target:</strong> {request.rosTarget}%</span>}
                {request.inquirySnapshot?.notes && <span><strong>Notes:</strong> {request.inquirySnapshot.notes}</span>}
              </Box>
            </Box>
          )}
          {canEdit && (
            <Box mt={2} display="flex" gap={1}>
              <Button variant="outlined" startIcon={<SendIcon/>} onClick={rfqSend}>Send RFQ</Button>
              <Button variant="outlined" startIcon={<UploadFileIcon/>} component="label">Import Quotes (Excel)
                <input hidden type="file" accept=".xlsx,.csv" onChange={importQuotes} />
              </Button>
              <Button variant="outlined" startIcon={<CompareIcon/>} onClick={()=>{ setCompareIdx(0); setCompareOpen(true); }}>Compare Vendors</Button>
              <Button variant="contained" color="primary" startIcon={<ReplyIcon/>} onClick={publishToSales} disabled={status==='REPLIED'}>Publish to Sales</Button>
            </Box>
          )}
          {!canEdit && <Box mt={2}><Chip size="small" color="default" label="Read-only (Sales view)" /></Box>}
        </CardContent>
      </Card>

      {/* Lines & Quotes */}
      {quoteRows.map((r, ix) => {
        const target = 14; // example ROS target; replace with policy per lane/customer
        const sug = lineSuggestion(r, target);
        return (
          <Card key={r.lineId} variant="outlined">
            <CardHeader titleTypographyProps={{ variant:'subtitle1' }} title={`${r.origin} → ${r.destination} • ${r.basis}`} subheader={`Sell ${money(r.sell)} | Current Margin ${money(r.currentMargin)} | ROS ${ros(r.currentMargin, r.sell).toFixed(1)}% | Target ROS ${target}%`} />
            <CardContent sx={{ pt:0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="right">Quote (Buy)</TableCell>
                    <TableCell align="center">Transit</TableCell>
                    <TableCell>Remark</TableCell>
                    <TableCell align="center">Pick</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {r.vendorQuotes.map(v => (
                    <TableRow key={v.vendor} hover selected={r.chosenVendor===v.vendor}>
                      <TableCell>{v.vendor}</TableCell>
                      <TableCell align="right">{money(v.price)}</TableCell>
                      <TableCell align="center">{v.transit}</TableCell>
                      <TableCell>{v.remark||''}</TableCell>
                      <TableCell align="center">
                        <Checkbox size="small" color="success" checked={r.chosenVendor===v.vendor} onChange={()=> canEdit && chooseVendor(ix, v.vendor, v.price)} disabled={!canEdit} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box display="flex" gap={2} mt={2} alignItems="center" flexWrap="wrap">
                <Chip size="small" color={sug.meets ? 'success':'error'} label={sug.meets? 'Meets target':'Above target buy'} />
                <Typography variant="caption" color="text.secondary">Max buy to hit {target}% ROS: <b>{money(sug.maxCost)}</b> (current cost {money(sug.currentCost)})</Typography>
                <Typography variant="caption" color="text.secondary">Best vendor: <b>{sug.bestVendor?.vendor}</b> @ {money(sug.bestVendor?.price)}</Typography>
                {!sug.meets && <Typography variant="caption" color="text.secondary">Need improvement: <b>{money(sug.need)}</b></Typography>}
                <TextField size="small" label="Note to Sales" value={r.note||''} onChange={e=> canEdit && setQuoteRows(rows=>rows.map((row,i)=> i===ix? { ...row, note:e.target.value }: row))} sx={{ minWidth: 260 }} disabled={!canEdit} />
              </Box>
            </CardContent>
          </Card>
        );
      })}

      <CompareVendorsDialog open={compareOpen} onClose={()=>setCompareOpen(false)} row={quoteRows[compareIdx]} />

  {role==='Pricing' && (
        <Card variant="outlined">
          <CardHeader title="Response & Approval" subheader="Choose vendors, review proposed ROS, and route for approval per policy." />
          <CardContent>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={1}>
              <Typography variant="body2">Proposed Totals</Typography>
              <Chip size="small" label={`Sell ${money(proposal.sellTotal)}`} />
              <Chip size="small" label={`Cost ${money(proposal.costTotal)}`} />
              <Chip size="small" label={`Margin ${money(proposal.marginTotal)}`} />
              <ROSChip value={proposal.rosPct} />
            </Box>
            <Box display="flex" gap={2} flexWrap="wrap" mb={1}>
              <Typography variant="body2">Approval Route:</Typography>
              {approvalRoute.required.length===0 ? <Chip size="small" color="success" label="None" /> : (
                <>
                  {approvalRoute.required.includes('Director') && <Chip size="small" color="warning" label="Director" />}
                  {approvalRoute.required.includes('Top Management') && <Chip size="small" color="error" label="Top Management" />}
                </>
              )}
            </Box>
            <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
              {approvalRoute.required.includes('Director') && (
                <FormControl size="small" sx={{ minWidth:220 }}>
                  <InputLabel>Director</InputLabel>
                  <Select label="Director" value={approvers.director} onChange={e=>setApprovers(a=>({...a,director:e.target.value}))}>{['dir.somsak','dir.arisa','dir.jirayut'].map(u=> <MenuItem key={u} value={u}>{u}</MenuItem>)}</Select>
                </FormControl>
              )}
              {approvalRoute.required.includes('Top Management') && (
                <FormControl size="small" sx={{ minWidth:240 }}>
                  <InputLabel>Top Management</InputLabel>
                  <Select label="Top Management" value={approvers.management} onChange={e=>setApprovers(a=>({...a,management:e.target.value}))}>{['ceo.kittipong','cfo.suchada','coo.nat'].map(u=> <MenuItem key={u} value={u}>{u}</MenuItem>)}</Select>
                </FormControl>
              )}
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button variant="outlined" onClick={submitForApproval} disabled={approvalRoute.required.length===0 || approvalStatus==='AWAITING'}>Submit for Approval</Button>
              <Button variant="outlined" color="success" onClick={recordApproval} disabled={approvalStatus!=='AWAITING'}>Record Approval</Button>
              <StatusChip status={status} />
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=>setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <Alert severity={snack.ok? 'success':'error'} variant="filled" onClose={()=>setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

/************** Compare Vendors Dialog **************/
function CompareVendorsDialog({ open, onClose, row }){
  if(!row) return null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Compare Vendors • {row.origin} → {row.destination}</DialogTitle>
      <DialogContent dividers>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Vendor</TableCell>
              <TableCell align="right">Quote (Buy)</TableCell>
              <TableCell align="center">Transit</TableCell>
              <TableCell>Remark</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {row.vendorQuotes.map(v => (
              <TableRow key={v.vendor}>
                <TableCell>{v.vendor}</TableCell>
                <TableCell align="right">{money(v.price)}</TableCell>
                <TableCell align="center">{v.transit}</TableCell>
                <TableCell>{v.remark||''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon/>}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
