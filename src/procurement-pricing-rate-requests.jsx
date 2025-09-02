import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from './auth-context';
import {
  Box, Typography, Button, Divider, Chip, Card, CardHeader, CardContent,
  Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, MenuItem, Select, FormControl, InputLabel, Checkbox, Autocomplete
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

// Sample carrier / vendor list for demo pricing comparisons
const SAMPLE_VENDORS = ['ONE','MSC','Maersk','HMM','CMA CGM','COSCO','Evergreen','Yang Ming','Hapag-Lloyd','ZIM'];

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
  const { user } = useAuth();
  const role = user?.role;
  const carrierLink = user?.carrierLink || (user?.display) || '';
  const filtered = rows.filter(r => r.status === tabs[tab]).filter(r=>{
    if(role==='Pricing' || role==='Sales') return true;
    if(role==='Vendor'){
      if(!['RFQ SENT','QUOTES IN','PRICED','REPLIED'].includes(r.status)) return false;
      const rfqVendors = r.rfq?.vendors || [];
      const inRFQ = rfqVendors.some(v=> v.toLowerCase() === carrierLink.toLowerCase());
      if(inRFQ) return true;
      return (r.lines||[]).some(l=> (l.vendorQuotes||[]).some(q=> (q.vendor||'').toLowerCase() === carrierLink.toLowerCase()));
    }
    return false;
  });
  const navigate = useNavigate();
  const canOpen = role === 'Pricing' || role === 'Vendor';
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
                  <TableCell align="right">
                    <Tooltip title={!canOpen ? 'Only Pricing or included Vendor' : ''}>
                      <span>
                        <Button size="small" variant="contained" onClick={()=>navigate(`/pricing/request/${r.id}`)} disabled={!canOpen}>Open</Button>
                      </span>
                    </Tooltip>
                  </TableCell>
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
  // const location = useLocation(); // unused
  const { user } = useAuth();
  const role = user?.role;
  // const isSalesView = role === 'Sales'; // unused flag
  const canEdit = role === 'Pricing';
  const [request, setRequest] = React.useState(null);
  const [status, setStatus] = React.useState('NEW');
  const [assignee, setAssignee] = React.useState('buyer.panadda');
  const [deadline, setDeadline] = React.useState('');
  const [quoteRows, setQuoteRows] = React.useState([]);
  // Approval states (only meaningful for procurement/pricing view)
  const [approvers, setApprovers] = React.useState({ director:'', management:'' });
  const [approvalStatus, setApprovalStatus] = React.useState('DRAFT'); // DRAFT -> AWAITING -> APPROVED
  // RFQ preparation states
  const [rfqOpen, setRfqOpen] = React.useState(false);
  const [rfqVendors, setRfqVendors] = React.useState([]); // array of vendor codes
  const [rfqMessage, setRfqMessage] = React.useState('');
  // Persistence helpers (prototype): keep request mutations in localStorage
  // const persistRef = React.useRef(false); // unused ref
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
        // Build synthetic vendor quote set (current vendor + other samples)
        const baseVendor = l.vendor || 'CurrentVendor';
        const quotes = [baseVendor, ...SAMPLE_VENDORS.filter(v=> v!==baseVendor)].slice(0, 6) // limit to 6 for readability
          .map((v,i)=>{
            const factor = i===0 ? 1 : (0.9 + (i*0.03)); // ascending slight difference
            const price = Number((currentCost * factor).toFixed(2));
            return { vendor: v, price, transit: i===0? '—' : `${20 + i*2}d`, remark: i===0? 'Current cost' : 'Alt quote'};
          });
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
          proposedSell: l.sell, // pricing can advise a new sell rate
          currentMargin: l.margin,
          currentROS: l.ros,
          vendorQuotes: quotes,
          chosenVendor: '', chosenPrice: null, note:''
        };
      });
    });
  }, [request, deadline]);
  const [snack, setSnack] = React.useState({ open:false, msg:'', ok:true });
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareIdx, setCompareIdx] = React.useState(0);
  // Manual quote entry state per lineId
  const [manualInputs, setManualInputs] = React.useState({}); // { [lineId]: { vendor:'', price:'', sell:'', transit:'', remark:'' } }
  // Publish confirmation modal
  const [publishConfirmOpen, setPublishConfirmOpen] = React.useState(false);

  function setManual(lineId, patch){
    setManualInputs(m => ({ ...m, [lineId]: { ...(m[lineId]||{ vendor:'', price:'', sell:'', transit:'', remark:'' }), ...patch } }));
  }

  function addManualQuote(lineIdx){
    if(!canEdit) return;
    const row = quoteRows[lineIdx]; if(!row) return;
    const mi = manualInputs[row.lineId] || {}; const vendor = (mi.vendor||'').trim();
    const priceNum = Number(mi.price);
    const sellNum = mi.sell === ''? undefined : Number(mi.sell);
    if(!vendor){ setSnack({ open:true, ok:false, msg:'Vendor required' }); return; }
    if(!(priceNum>0)){ setSnack({ open:true, ok:false, msg:'Buy price > 0' }); return; }
    // Prevent duplicate vendor; if exists, update instead
    let isUpdate = false;
    setQuoteRows(rows => rows.map((r,i)=> {
      if(i!==lineIdx) return r;
      const existing = r.vendorQuotes||[];
      const idx = existing.findIndex(q=> q.vendor.toLowerCase()===vendor.toLowerCase());
      let vendorQuotes;
      if(idx>=0){
        isUpdate = true;
        vendorQuotes = existing.map((q,j)=> j===idx? { ...q, price: priceNum, sell: sellNum, transit: mi.transit||q.transit, remark: mi.remark||q.remark } : q);
      } else {
        vendorQuotes = [...existing, { vendor, price: priceNum, sell: sellNum, transit: mi.transit||'', remark: mi.remark||'Manual' }];
      }
      return { ...r, vendorQuotes };
    }));
    // persist to request lines
    setRequest(req => {
      if(!req) return req;
      const targetId = row.lineId;
      const lines = (req.lines||[]).map(l=>{
        if(l.id!==targetId) return l;
        const existing = l.vendorQuotes||[];
        const idx = existing.findIndex(q=> q.vendor.toLowerCase()===vendor.toLowerCase());
        let vendorQuotes;
        if(idx>=0){
          vendorQuotes = existing.map((q,j)=> j===idx? { ...q, price: priceNum, sell: sellNum, transit: mi.transit||q.transit, remark: mi.remark||q.remark } : q);
        } else {
          vendorQuotes = [...existing, { vendor, price: priceNum, sell: sellNum, transit: mi.transit||'', remark: mi.remark||'Manual' }];
        }
        return { ...l, vendorQuotes };
      });
      const updated = { ...req, lines };
      persist(updated);
      return updated;
    });
    // Clear inputs
    setManual(row.lineId, { vendor:'', price:'', sell:'', transit:'', remark:'' });
    setSnack({ open:true, ok:true, msg: isUpdate? 'Quote updated':'Quote added' });
  }

  function rfqSend(){
    setRfqOpen(true);
    // Preselect current line vendors if none chosen yet
    if(!rfqVendors.length){
      const existing = new Set();
      (quoteRows||[]).forEach(r=> existing.add(r.vendor||'CurrentVendor'));
      setRfqVendors(Array.from(existing).filter(Boolean));
    }
  }
  function confirmRFQ(){
    if(!rfqVendors.length){ setSnack({ open:true, ok:false, msg:'Select at least one vendor.' }); return; }
    setStatus('RFQ SENT');
    patchRequest({ status:'RFQ SENT', rfq: { vendors: rfqVendors, message: rfqMessage, sentAt: new Date().toISOString() } });
    setSnack({ open:true, ok:true, msg:`RFQ prepared for ${rfqVendors.length} vendor(s).` });
    setRfqOpen(false);
  }
  function importQuotes(){
    // placeholder: parse file here
    setStatus('QUOTES IN'); patchRequest({ status:'QUOTES IN' }); setSnack({ open:true, ok:true, msg:'Vendor quotes imported.' });
  }
  // chooseVendor deprecated with unified toggleVendor

  function toggleVendor(ix, vendor, price, opts={}){
    setQuoteRows(rows => rows.map((r,i)=> {
      if(i!==ix) return r;
      const ts = new Date().toISOString();
      const history = [...(r.history||[])];
      if(!history.length || history[history.length-1].vendor!==vendor || history[history.length-1].price!==price){ history.push({ ts, vendor, price }); }
      const sel = new Set(r.selectedVendors||[]);
      if(sel.has(vendor) && !opts.forcePrimary) sel.delete(vendor); else sel.add(vendor);
      let chosenVendor = r.chosenVendor;
      if(opts.forcePrimary){ chosenVendor = vendor; }
      else if(!chosenVendor || !sel.has(chosenVendor)) { chosenVendor = Array.from(sel)[0] || ''; }
      const vq = (r.vendorQuotes||[]).find(q=> q.vendor===chosenVendor);
      const proposedSell = vq && vq.sell!=null ? Number(vq.sell)||0 : r.proposedSell;
      const chosenPrice = (r.vendorQuotes||[]).find(q=> q.vendor===chosenVendor)?.price ?? null;
      return { ...r, selectedVendors:Array.from(sel), chosenVendor, chosenPrice, proposedSell, history };
    }));
    setRequest(req => {
      if(!req) return req; const targetId = quoteRows[ix]?.lineId; if(!targetId) return req;
      const lines = (req.lines||[]).map(l=>{
        if(l.id!==targetId) return l;
        const ts = new Date().toISOString();
        const history = [...(l.history||[])];
        if(!history.length || history[history.length-1].vendor!==vendor || history[history.length-1].price!==price){ history.push({ ts, vendor, price }); }
        const sel = new Set(l.selectedVendors||[]);
        if(sel.has(vendor) && !opts.forcePrimary) sel.delete(vendor); else sel.add(vendor);
        let chosenVendor = l.chosenVendor;
        if(opts.forcePrimary){ chosenVendor = vendor; }
        else if(!chosenVendor || !sel.has(chosenVendor)) { chosenVendor = Array.from(sel)[0] || ''; }
        const vq = (l.vendorQuotes||[]).find(q=> q.vendor===chosenVendor);
        const proposedSell = vq && vq.sell!=null ? Number(vq.sell)||0 : l.proposedSell;
        const chosenPrice = (l.vendorQuotes||[]).find(q=> q.vendor===chosenVendor)?.price ?? null;
        return { ...l, selectedVendors:Array.from(sel), chosenVendor, chosenPrice, proposedSell, history };
      });
      const updated = { ...req, lines }; persist(updated); return updated;
    });
  }

  function updateVendorSell(lineIdx, vendor, sellVal){
    if(!canEdit) return;
    const sellNum = sellVal === '' ? '' : Number(sellVal);
    setQuoteRows(rows => rows.map((r,i)=>{
      if(i!==lineIdx) return r;
      const vendorQuotes = (r.vendorQuotes||[]).map(q=> q.vendor===vendor ? { ...q, sell: sellNum } : q);
      let proposedSell = r.proposedSell;
      if(r.chosenVendor===vendor && sellNum !== '') proposedSell = sellNum;
      return { ...r, vendorQuotes, proposedSell };
    }));
    setRequest(req => {
      if(!req) return req;
      const targetId = quoteRows[lineIdx]?.lineId; if(!targetId) return req;
      const lines = (req.lines||[]).map(l=>{
        if(l.id!==targetId) return l;
        const vendorQuotes = (l.vendorQuotes||[]).map(q=> q.vendor===vendor ? { ...q, sell: sellNum } : q);
        let proposedSell = l.proposedSell;
        if(l.chosenVendor===vendor && sellNum !== '') proposedSell = sellNum;
        return { ...l, vendorQuotes, proposedSell };
      });
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
    const publishTs = new Date().toISOString();
    const payload = {
      type: 'rateImprovementResponse',
      requestId: request.id,
      status,
      assignee,
      deadline,
      lines: quoteRows.map(r => {
        const selectedOffers = (r.vendorQuotes||[]).filter(q=> (r.selectedVendors||[]).includes(q.vendor));
        const chosenVendorSell = (r.vendorQuotes||[]).find(q=> q.vendor===r.chosenVendor)?.sell;
        return {
          id: r.lineId,
          origin: r.origin,
          destination: r.destination,
          basis: r.basis,
          chosenVendor: r.chosenVendor,
          selectedVendors: r.selectedVendors||[],
          buyPrice: r.chosenPrice,
          note: r.note,
          oldSell: r.sell,
          newSell: chosenVendorSell != null ? chosenVendorSell : r.proposedSell,
          history: r.history||[],
          offers: selectedOffers.map(q=> ({ vendor:q.vendor, price:q.price, sell:q.sell, transit:q.transit, remark:q.remark }))
        };
      })
    };
    // Write back to linked Inquiry (persist improved buy + history)
    try {
      if(request.inquiryId){
        const inquiries = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
        const idx = inquiries.findIndex(i=>i.id===request.inquiryId);
        if(idx>=0){
          const inq = { ...inquiries[idx] };
          const newLines = [];
          // Only update lines whose IDs were part of this request (fail-safe)
          const targetIds = new Set((request.lines||[]).map(l=> l.id));
          (inq.lines||[]).forEach(line => {
            if(!targetIds.has(line.rateId) && !targetIds.has(line.id)){ // untouched line
              newLines.push(line);
              return;
            }
            const matched = payload.lines.find(pl => pl.id === line.rateId || pl.id === line.id);
            if(!matched){ newLines.push(line); return; }
            const effSellPrev = line.sell;
            const oldBuy = line.currentBuy != null ? line.currentBuy : (effSellPrev - line.margin);
            const updatedSellPrimary = matched.newSell != null ? matched.newSell : line.sell;
            const effSellNewPrimary = updatedSellPrimary;
            const newBuyPrimary = matched.buyPrice != null ? matched.buyPrice : oldBuy;
            const newMarginCorePrimary = matched.buyPrice != null ? (effSellNewPrimary - matched.buyPrice) : line.margin;
            const newMarginPrimary = newMarginCorePrimary;
            const histEntryBase = {
              ts: publishTs,
              prevVendor: line.vendor,
              prevBuy: oldBuy,
              prevMargin: line.margin,
              prevSell: line.sell,
              newVendor: matched.chosenVendor,
              newBuy: matched.buyPrice,
              newMargin: newMarginPrimary,
              newSell: matched.newSell,
              selectedVendors: matched.selectedVendors||[]
            };
            const rootRateId = line.rootRateId || line.rateId || line.id;
            const baseId = line.rootRateId ? line.rootRateId : (line.rateId || line.id);
            const versionRegex = /-v(\d+)$/i;
            const currentId = line.rateId || line.id;
            let seq = 1; const m = currentId.match(versionRegex); if(m) seq = Number(m[1]);
            // push old inactive version first
            const rateHistory = [ ...(line.rateHistory||[]), histEntryBase ];
            newLines.push({ ...line, active:false, latest:false, rateHistory, effectiveTo: publishTs, effectiveFrom: line.effectiveFrom || line.createdAt || line.effectiveFrom });
            // derive offers (selected vendors)
            let offers = matched.offers && matched.offers.length ? matched.offers : [];
            if(!offers.length && (matched.selectedVendors||[]).length){
              const qr = quoteRows.find(q=> q.lineId === matched.id);
              if(qr){
                offers = (qr.vendorQuotes||[]).filter(q=> (matched.selectedVendors||[]).includes(q.vendor)).map(q=> ({ vendor:q.vendor, price:q.price, sell:q.sell, transit:q.transit, remark:q.remark }));
              }
            }
            let localSeq = seq;
            offers.forEach(off => {
              localSeq += 1;
              const offerSellRaw = off.sell != null ? off.sell : (off.vendor === matched.chosenVendor ? matched.newSell : updatedSellPrimary);
              const offerSell = offerSellRaw != null ? offerSellRaw : updatedSellPrimary;
              const effSellOffer = offerSell;
              const offerBuy = off.price != null ? off.price : newBuyPrimary;
              const offerMargin = effSellOffer - offerBuy;
              const newRateId = `${baseId.replace(versionRegex,'')}-v${localSeq}`;
              newLines.push({
                ...line,
                rateId: newRateId,
                rootRateId,
                parentRateId: line.rateId || line.id,
                active:true,
                latest: off.vendor === matched.chosenVendor, // primary chosen vendor marked latest
                procuredVendor: off.vendor,
                vendor: off.vendor,
                currentBuy: offerBuy,
                sell: offerSell,
                margin: offerMargin,
                rateHistory,
                effectiveFrom: publishTs,
                effectiveTo: null,
                altOption: off.vendor !== matched.chosenVendor
              });
            });
            if(!offers.length){
              const nextSeq = seq + 1;
              const newRateId = `${baseId.replace(versionRegex,'')}-v${nextSeq}`;
              newLines.push({
                ...line,
                rateId: newRateId,
                rootRateId,
                parentRateId: line.rateId || line.id,
                active:true,
                latest:true,
                procuredVendor: matched.chosenVendor || line.procuredVendor,
                currentBuy: newBuyPrimary,
                sell: updatedSellPrimary,
                margin: newMarginPrimary,
                rateHistory,
                effectiveFrom: publishTs,
                effectiveTo: null
              });
            }
          });
          inq.lines = newLines;
          inquiries[idx] = inq;
          localStorage.setItem('savedInquiries', JSON.stringify(inquiries));
        }
      }
    } catch(err){ console.warn('Failed to update inquiry with new rate history', err); }
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`response_${request.id}.json`; a.click(); URL.revokeObjectURL(url);
    // Create notification for inquiry owner (Sales) if inquiryId present
    try {
      if(request.inquiryId){
        const inquiries = JSON.parse(localStorage.getItem('savedInquiries')||'[]');
        const inq = inquiries.find(i=>i.id===request.inquiryId);
        const ownerUser = inq?.owner; // expect login user id
        if(ownerUser){
          const notes = JSON.parse(localStorage.getItem('notifications')||'[]');
          notes.unshift({
            id: 'NTF-'+Date.now().toString(36),
            ts: new Date().toISOString(),
            user: ownerUser,
            type: 'ratePublish',
            inquiryId: request.inquiryId,
            requestId: request.id,
            lines: payload.lines.map(l=>({ id:l.id, chosenVendor:l.chosenVendor, selected:l.selectedVendors, newSell:l.newSell })),
            read:false
          });
          // keep only latest 200
          localStorage.setItem('notifications', JSON.stringify(notes.slice(0,200)));
        }
      }
    } catch{/* ignore */}
    setStatus('REPLIED'); patchRequest({ status:'REPLIED' }); setSnack({ open:true, ok:true, msg:'Published response JSON to Sales.' });
  }

  // -------- Approval & Proposal (Procurement view only) --------
  const proposal = React.useMemo(()=>{
    let sellTotal=0, costTotal=0; 
    quoteRows.forEach(r=>{
      const qty = Number(r.qty)||1; const sellLine = Number(r.proposedSell ?? r.sell)||0; const currentCost = (Number(r.sell)||0) - (Number(r.currentMargin)||0);
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
              <FormControl size="small" sx={{ minWidth:160 }} disabled={!canEdit}>
                <InputLabel>Assignee</InputLabel>
                <Select label="Assignee" value={assignee} onChange={e=>{ if(!canEdit) return; setAssignee(e.target.value); patchRequest({ assignee:e.target.value }); }}>
                  {['buyer.panadda','buyer.chai','buyer.mai'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" type="date" label="Deadline" InputLabelProps={{ shrink:true }} value={deadline} onChange={e=>{ if(!canEdit) return; setDeadline(e.target.value); patchRequest({ deadline:e.target.value }); }} disabled={!canEdit} />
              <StatusChip status={status} />
            </Box>
          </Box>
          {request.inquiryId && (
            <Box mt={2} display="flex" flexDirection="column" gap={0.5}>
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
            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
              <Button variant="outlined" startIcon={<SendIcon/>} onClick={rfqSend}>Send RFQ</Button>
              <Button variant="outlined" startIcon={<UploadFileIcon/>} component="label">Import Quotes (Excel)
                <input hidden type="file" accept=".xlsx,.csv" onChange={importQuotes} />
              </Button>
              <Button variant="outlined" startIcon={<CompareIcon/>} onClick={()=>{ setCompareIdx(0); setCompareOpen(true); }}>Compare Vendors</Button>
              <Button variant="contained" color="primary" startIcon={<ReplyIcon/>} onClick={()=>setPublishConfirmOpen(true)} disabled={status==='REPLIED'}>Publish to Sales</Button>
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
                    <TableCell align="right">Sell</TableCell>
                    <TableCell align="center">Transit</TableCell>
                    <TableCell>Remark</TableCell>
                    <TableCell align="center">Select</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {r.vendorQuotes.map(v => { const selected = (r.selectedVendors||[]).includes(v.vendor); const primary = r.chosenVendor===v.vendor; return (
                    <TableRow key={v.vendor} hover selected={selected}>
                      <TableCell>{v.vendor}{primary && <Chip size="small" color="primary" label="Primary" sx={{ ml:0.5 }} />}</TableCell>
                      <TableCell align="right">{money(v.price)}</TableCell>
                      <TableCell align="right">
                        {canEdit ? (
                          <TextField
                            size="small"
                            type="number"
                            value={v.sell != null ? v.sell : ''}
                            onChange={e=>updateVendorSell(ix, v.vendor, e.target.value)}
                            placeholder="--"
                            inputProps={{ step:0.01, min:0, style:{ textAlign:'right' } }}
                            sx={{ width:90 }}
                          />
                        ) : (v.sell != null ? money(v.sell): '—')}
                      </TableCell>
                      <TableCell align="center">{v.transit}</TableCell>
                      <TableCell>{v.remark||''}</TableCell>
                      <TableCell align="center">
                        <Checkbox size="small" color="success" checked={selected} onChange={()=> canEdit && toggleVendor(ix, v.vendor, v.price)} disabled={!canEdit} />
                      </TableCell>
                    </TableRow>
                  ); })}
                  {canEdit && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ backgroundColor:'rgba(0,0,0,0.03)' }}>
                        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                          <TextField size="small" label="Vendor" sx={{ width:140 }} value={(manualInputs[r.lineId]?.vendor)||''} onChange={e=>setManual(r.lineId,{ vendor:e.target.value })} />
                          <TextField size="small" label="Buy" type="number" sx={{ width:110 }} value={(manualInputs[r.lineId]?.price)||''} onChange={e=>setManual(r.lineId,{ price:e.target.value })} />
                          <TextField size="small" label="Sell" type="number" sx={{ width:110 }} value={(manualInputs[r.lineId]?.sell)||''} onChange={e=>setManual(r.lineId,{ sell:e.target.value })} />
                          <TextField size="small" label="Transit" sx={{ width:110 }} value={(manualInputs[r.lineId]?.transit)||''} onChange={e=>setManual(r.lineId,{ transit:e.target.value })} />
                          <TextField size="small" label="Remark" sx={{ width:160 }} value={(manualInputs[r.lineId]?.remark)||''} onChange={e=>setManual(r.lineId,{ remark:e.target.value })} />
                          <Button size="small" variant="outlined" onClick={()=>addManualQuote(ix)}>Add / Update</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Box display="flex" gap={2} mt={2} alignItems="center" flexWrap="wrap">
                <Chip size="small" color={sug.meets ? 'success':'error'} label={sug.meets? 'Meets target':'Above target buy'} />
                <Typography variant="caption" color="text.secondary">Max buy to hit {target}% ROS: <b>{money(sug.maxCost)}</b> (current cost {money(sug.currentCost)})</Typography>
                <Typography variant="caption" color="text.secondary">Best vendor: <b>{sug.bestVendor?.vendor}</b> @ {money(sug.bestVendor?.price)}</Typography>
                {!sug.meets && <Typography variant="caption" color="text.secondary">Need improvement: <b>{money(sug.need)}</b></Typography>}
                <TextField size="small" label="Note to Sales" value={r.note||''} onChange={e=> canEdit && setQuoteRows(rows=>rows.map((row,i)=> i===ix? { ...row, note:e.target.value }: row))} sx={{ minWidth: 260 }} disabled={!canEdit} />
                {r.chosenVendor && <TextField size="small" type="number" label="Negotiated Buy" value={r.chosenPrice ?? ''} onChange={e=> canEdit && setQuoteRows(rows=>rows.map((row,i)=> i===ix? { ...row, chosenPrice:Number(e.target.value)||0 }: row))} sx={{ width:140 }} disabled={!canEdit} />}
                <Typography variant="caption" color="text.secondary">New ROS: {(() => { const cost = r.chosenPrice ?? (r.vendorQuotes[0]?.price||0); const sellVal = (r.vendorQuotes.find(q=>q.vendor===r.chosenVendor)?.sell) ?? r.proposedSell ?? r.sell; return sellVal? (((sellVal - cost)/sellVal)*100).toFixed(1):'0.0'; })()}%</Typography>
              </Box>
              { (r.history && r.history.length>0) && (
                <Box mt={1.5} pl={1} sx={{ borderLeft:'3px solid', borderColor:'divider' }} display="flex" flexDirection="column" gap={0.5}>
                  <Typography variant="caption" color="text.secondary">Selection History:</Typography>
                  {r.history.slice().reverse().map(h => (
                    <Typography key={h.ts} variant="caption" sx={{ fontFamily:'monospace' }}>{new Date(h.ts).toLocaleString()} • {h.vendor} @ {money(h.price)}</Typography>
                  ))}
                </Box>
              )}
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
      <Dialog open={rfqOpen} onClose={()=>setRfqOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Prepare RFQ</DialogTitle>
        <DialogContent dividers sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Typography variant="body2">Select vendors to send the RFQ. (Email sending not implemented; data stored only.)</Typography>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={SAMPLE_VENDORS}
            value={rfqVendors}
            onChange={(e,v)=> setRfqVendors(v)}
            renderInput={(params)=><TextField {...params} label="Vendors" placeholder="Select vendors" />}
          />
          <TextField label="Message to Vendors" multiline minRows={4} value={rfqMessage} onChange={e=>setRfqMessage(e.target.value)} placeholder="Please offer your best rate and transit time for the attached inquiry lines." />
          {!!request?.rfq && (
            <Box>
              <Typography variant="caption" color="text.secondary">Last RFQ sent: {new Date(request.rfq.sentAt).toLocaleString()}</Typography>
              <Box mt={0.5} display="flex" gap={1} flexWrap="wrap">{request.rfq.vendors.map(v=> <Chip key={v} size="small" label={v} />)}</Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setRfqOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={confirmRFQ}>Send</Button>
        </DialogActions>
      </Dialog>
      <PublishConfirmDialog
        open={publishConfirmOpen}
        onClose={()=>setPublishConfirmOpen(false)}
        quoteRows={quoteRows}
        onConfirm={()=>{ setPublishConfirmOpen(false); publishToSales(); }}
        disabled={status==='REPLIED'}
      />
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

function PublishConfirmDialog({ open, onClose, quoteRows, onConfirm, disabled }){
  const lines = quoteRows||[];
  // derive preview data per line
  const preview = lines.map(r=>{
    const selected = (r.selectedVendors||[]);
    const vendors = selected.length? selected : (r.chosenVendor? [r.chosenVendor]:[]);
    const vendorDetails = vendors.map(v=>{
      const q = (r.vendorQuotes||[]).find(x=>x.vendor===v) || {};
      const sell = q.sell != null ? q.sell : r.sell;
      const buy = q.price;
      const rosPct = sell? ((sell - buy)/sell)*100 : 0;
      return { vendor:v, buy, sell, ros:rosPct };
    });
  const oldBuy = (Number(r.sell)||0) - (Number(r.currentMargin)||0);
  const oldROS = r.sell? ((Number(r.currentMargin)||0)/Number(r.sell))*100:0;
  const originalVendor = r.vendor || r.originalLine?.procuredVendor || r.originalLine?.vendor || '—';
  return { lineId:r.lineId, origin:r.origin, destination:r.destination, basis:r.basis, chosen:r.chosenVendor, vendorDetails, oldBuy, oldSell:r.sell, oldROS, originalVendor };
  }).filter(p=> p.vendorDetails.length>0); // only show lines that will create at least one version
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Confirm Publish to Sales</DialogTitle>
      <DialogContent dividers>
        {preview.length===0 && <Typography variant="body2" color="text.secondary">No vendors selected yet. Publishing will not create any new versions.</Typography>}
        {preview.map(p=> (
          <Box key={p.lineId} mb={2}>
            <Typography variant="subtitle2" gutterBottom>{p.origin} → {p.destination} • {p.basis} • Line {p.lineId}</Typography>
            <Table size="small" sx={{ mb:1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Identifier</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Cost (Buy)</TableCell>
                  <TableCell align="right">Sell</TableCell>
                  <TableCell align="center">ROS%</TableCell>
                  <TableCell align="center">Primary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ backgroundColor:'rgba(0,0,0,0.04)' }}>
                  <TableCell>Old Rate</TableCell>
                  <TableCell>{/* original vendor */}{p.originalVendor || '—'}</TableCell>
                  <TableCell align="right">{(p.oldBuy||0).toFixed(2)}</TableCell>
                  <TableCell align="right">{(p.oldSell||0).toFixed(2)}</TableCell>
                  <TableCell align="center">{p.oldROS.toFixed(1)}</TableCell>
                  <TableCell align="center" />
                </TableRow>
                {p.vendorDetails.map(v=> {
                  const primary = p.chosen===v.vendor;
                  return (
                    <TableRow key={v.vendor}>
                      <TableCell>{primary? 'New Rate (Primary)' : 'New Rate'}</TableCell>
                      <TableCell>{v.vendor}</TableCell>
                      <TableCell align="right">{(v.buy||0).toFixed(2)}</TableCell>
                      <TableCell align="right">{(v.sell||0).toFixed(2)}</TableCell>
                      <TableCell align="center">{v.ros.toFixed(1)}</TableCell>
                      <TableCell align="center">{primary? <Chip size="small" color="primary" label="Primary"/>:''}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Divider />
          </Box>
        ))}
        <Typography variant="caption" color="text.secondary">{preview.length} line(s) will have {preview.reduce((a,p)=>a+p.vendorDetails.length,0)} new version(s) created.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={onConfirm} variant="contained" disabled={disabled || preview.length===0}>Confirm Publish</Button>
      </DialogActions>
    </Dialog>
  );
}
