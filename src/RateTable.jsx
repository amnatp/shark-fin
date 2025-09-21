import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Chip, Tooltip, IconButton, Collapse, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSettings } from './use-settings';
import { loadTariffs } from './tariffs-store';
import { useState } from 'react';

// Shared RateTable component for all modes
export default function RateTable({ mode, rows, onSelect, onView, onEdit, bookingCounts, hideCostRos=false, hideCost, hideRos, showOnlyCost=false }) {
  const { settings } = useSettings() || {}; // graceful if provider missing
  const [openIndex, setOpenIndex] = useState(null);
  const bands = settings?.rosBands || [];
  const autoMin = settings?.autoApproveMin;
  function bandFor(v){
    if(v==null) return null;
    return bands.find(b => (b.min==null || v>=b.min) && (b.max==null || v < b.max));
  }
  const headStyles = { fontWeight: 600 };
  const styleFor = (v) => {
    if(v==null) return undefined;
    const b = bandFor(v);
    if(!b) return undefined;
    return { color: b.color === 'error'? 'error.main': b.color==='warning'? 'warning.main': b.color==='success'? 'success.main': undefined, fontWeight:500 };
  };
  const autoApprove = (v) => autoMin!=null && v>=autoMin;
  const keyFor = (r, i) => (r && (r.id || r.rateId)) ? (r.id || r.rateId) : `idx-${i}`;
  // Backwards compatibility: if caller passed the old `hideCostRos` boolean, derive both flags
  const resolvedHideCost = hideCost !== undefined ? hideCost : (hideCostRos === true);
  const resolvedHideRos = hideRos !== undefined ? hideRos : (hideCostRos === true);

  const commonHead = (cells) => (
    <TableHead>
      <TableRow>
        {cells.map((c,i)=><TableCell key={i} sx={headStyles}>{c}</TableCell>)}
      </TableRow>
    </TableHead>
  );
  const wrapper = (children) => <Table size="small">{children}</Table>;

  const actionsCell = (r) => (
    <TableCell sx={{ whiteSpace:'nowrap' }}>
      {onView && <Button size="small" onClick={()=>onView(r)} sx={{ mr:0.5 }}>View</Button>}
      {onEdit && <Button size="small" variant="outlined" onClick={()=>onEdit(r)}>Edit</Button>}
      {onSelect && <Button size="small" variant="contained" sx={{ ml:0.5 }} onClick={()=>onSelect(r)}>Select</Button>}
    </TableCell>
  );

  function bookingBadge(r){
  if(!bookingCounts) return null;
  const rid = r.rateId;
  if(!rid) return null;
  const count = bookingCounts[rid];
  if(!count) return null;
  return <Tooltip title={`Bookings: ${count}`}><Chip size="small" color="primary" label={count} sx={{ ml:0.5 }} /></Tooltip>;
  }
  if (mode === 'FCL') {
    // If showOnlyCost is true, display only Cost / Cntr (no Sell, no ROS)
    const fclHead = [ (onView||onEdit||onSelect)?'Actions':null, 'Lane','Vendor','Container','Transit (d)','Transship' ];
    if(showOnlyCost){ fclHead.push('Cost / Cntr'); }
    else { fclHead.push(...([...( !resolvedHideCost ? ['Cost / Cntr','Sell / Cntr'] : [] ), ...( !resolvedHideRos ? ['ROS %'] : [] )])); }
    fclHead.push('Freetime','Service','Contract Service','Charge Code');
    return wrapper(<>
      {commonHead(fclHead.filter(Boolean))}
      <TableBody>
          {rows.map((r,i)=>{
          // determine if this row has related surcharges
          const tariffs = loadTariffs();
          const matching = tariffs.filter(t=> {
            try{
              if(!t.active) return false;
              const carrierMatch = (t.carrier||'').toLowerCase() === (r.vendor||'').toLowerCase();
              if(!carrierMatch) return false;
              const tradelane = (t.tradelane||'').trim();
              if(!tradelane) return true; // applies broadly for carrier
              const lane = (r.lane||'').replace(' → ', '/');
              const pattern = tradelane.replace(/\s+/g,'');
              if(pattern==='ALL/ALL') return true;
              // simple wildcard: ALL/US* or THBKK/USLAX
              const [pFrom,pTo] = pattern.split('/');
              const [rFrom,rTo] = lane.split('/');
              const fromMatch = !pFrom || pFrom.toUpperCase()==='ALL' || (rFrom && rFrom.toUpperCase().startsWith(pFrom.toUpperCase().replace('*','')));
              const toMatch = !pTo || pTo.toUpperCase()==='ALL' || (rTo && rTo.toUpperCase().startsWith(pTo.toUpperCase().replace('*','')));
              return fromMatch && toMatch;
            }catch{ return false; }
          });
          const hasSurcharges = matching && matching.length>0;
          return (<React.Fragment key={keyFor(r,i)}>
            <TableRow hover>
              {(onView||onEdit||onSelect) && actionsCell(r)}
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  {hasSurcharges && <IconButton size="small" onClick={()=> setOpenIndex(openIndex===i? null : i)}>{openIndex===i ? <ExpandLessIcon/> : <ExpandMoreIcon/>}</IconButton>}
                  <span>{r.lane}</span>
                  {bookingBadge(r)}
                </Box>
              </TableCell>
              <TableCell>{r.vendor||'-'}</TableCell>
              <TableCell>{r.container}</TableCell>
              <TableCell>{r.transitDays ?? '-'}</TableCell>
              <TableCell>{r.transship ?? '-'}</TableCell>
              {showOnlyCost ? (
                <TableCell>{r.costPerCntr?.toLocaleString?.() ?? '-'}</TableCell>
              ) : (
                <>
                  {!resolvedHideCost && <TableCell>{r.costPerCntr?.toLocaleString?.() ?? '-'}</TableCell>}
                  {!resolvedHideCost && <TableCell>{r.sellPerCntr?.toLocaleString?.() ?? '-'}</TableCell>}
                  {!resolvedHideRos && <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>}
                </>
              )}
              <TableCell>{r.freetime || '-'}</TableCell>
              <TableCell>{r.service || '-'}</TableCell>
              <TableCell>{r.contractService || '-'}</TableCell>
        <TableCell>{r.chargeCode || '-'}</TableCell>
            </TableRow>
              {hasSurcharges && <TableRow key={`surch-${keyFor(r,i)}`}>
              <TableCell style={{ padding:0 }} colSpan={12}>
                <Collapse in={openIndex===i} timeout="auto" unmountOnExit>
                  <Box sx={{ margin:1, paddingLeft:3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight:600 }}>Surcharge ID</TableCell>
                          <TableCell sx={{ fontWeight:600 }}>Currency</TableCell>
                          <TableCell sx={{ fontWeight:600 }} align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {matching.filter(ms => String(ms.basis||'').toLowerCase().includes('container')).map(ms=> (
                          <TableRow key={ms.id} hover>
                            <TableCell>{ms.id}</TableCell>
                            <TableCell>{ms.currency}</TableCell>
                            <TableCell align="right">{Number(ms.amount||0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Collapse>
              </TableCell>
            </TableRow>}
          </React.Fragment>);
        })}
      </TableBody>
    </>);
  }
  if (mode === 'LCL') {
    return wrapper(<>
      {commonHead([
        (onView||onEdit||onSelect)?'Actions':null,
        'Lane','Vendor','Transit (d)','Transship',
        ...([...( !resolvedHideCost ? ['Cost / Kg','Sell / Kg','Min Cost','Min Sell'] : [] ), ...( !resolvedHideRos ? ['ROS %'] : [] )]),
        'Charge Code'
      ].filter(Boolean))}
      <TableBody>
        {rows.map((r,i)=>(
          <TableRow key={keyFor(r,i)}>
            {(onView||onEdit||onSelect) && actionsCell(r)}
            <TableCell>{r.lane}{bookingBadge(r)}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            {!resolvedHideCost && <TableCell>{r.ratePerKgCost?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideCost && <TableCell>{r.ratePerKgSell?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideCost && <TableCell>{r.minChargeCost?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideCost && <TableCell>{r.minChargeSell?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideRos && <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>}
            <TableCell>{r.chargeCode || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>);
  }
  if (mode === 'Air') {
    // If rows look like airlineSheetRows (have type airSheet) show expanded breaks
    const isSheet = rows.some(r=> r.type === 'airSheet');
    if (isSheet) {
      const BREAKS = [45,100,300,500,1000];
      return wrapper(<>
        {commonHead([
          (onView||onEdit||onSelect)?'Actions':null,
          'Lane','Airline','Svc','Valid','MIN','≥45','≥100','≥300','≥500','≥1000','Commodities'
        ].filter(Boolean))}
        <TableBody>
          {rows.map((r,i)=> (
            <TableRow key={keyFor(r,i)}>
              {(onView||onEdit||onSelect) && actionsCell(r)}
              <TableCell>{r.lane}{bookingBadge(r)}</TableCell>
              <TableCell>{r.airlineName}</TableCell>
              <TableCell>{r.serviceType}</TableCell>
              <TableCell>{r.validFrom || '-'} → {r.validTo || '-'}</TableCell>
              <TableCell>{r.minCharge}</TableCell>
              {BREAKS.map(b => <TableCell key={b}>{r.breaks?.[b] ?? '-'}</TableCell>)}
              <TableCell>
                {r.commoditiesCount ? <Tooltip title="Commodity specific tariffs available"><Chip size="small" label={r.commoditiesCount} /> </Tooltip> : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </>);
    }
    // Fallback to simple air rows
    return wrapper(<>
        {commonHead([
        (onView||onEdit||onSelect)?'Actions':null,
        'Lane','Vendor','Transit (d)','Transship',
        ...([...( !resolvedHideCost ? ['Cost / Kg','Sell / Kg','Min Cost','Min Sell'] : [] ), ...( !resolvedHideRos ? ['ROS %'] : [] )]),
        'Charge Code'
      ].filter(Boolean))}
      <TableBody>
          {rows.map((r,i)=>(
          <TableRow key={keyFor(r,i)}>
            {(onView||onEdit||onSelect) && actionsCell(r)}
            <TableCell>{r.lane}{bookingBadge(r)}</TableCell>
            <TableCell>{r.vendor||'-'}</TableCell>
            <TableCell>{r.transitDays ?? '-'}</TableCell>
            <TableCell>{r.transship ?? '-'}</TableCell>
            {!resolvedHideCost && <TableCell>{r.ratePerKgCost?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideCost && <TableCell>{r.ratePerKgSell?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideCost && <TableCell>{r.minChargeCost?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideCost && <TableCell>{r.minChargeSell?.toLocaleString?.() ?? '-'}</TableCell>}
            {!resolvedHideRos && <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>}
            <TableCell>{r.chargeCode || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>);
  }
  // Transport/Customs
  const codeLabel = mode === 'Transport' ? 'Charge Code' : mode === 'Customs' ? 'Charge Code' : '';
  return wrapper(<>
    {commonHead([
      (onView||onEdit||onSelect)?'Actions':null,
      'Lane','Vendor','Transit (d)','Transship', ...( !resolvedHideCost ? ['Cost','Sell'] : [] ), ...( !resolvedHideRos ? ['ROS %'] : [] ), codeLabel
    ].filter(Boolean))}
    <TableBody>
      {rows.map((r,i)=>(
        <TableRow key={keyFor(r,i)}>
          {(onView||onEdit||onSelect) && actionsCell(r)}
          <TableCell>{r.lane}{bookingBadge(r)}</TableCell>
          <TableCell>{r.vendor||'-'}</TableCell>
          <TableCell>{r.transitDays ?? '-'}</TableCell>
          <TableCell>{r.transship ?? '-'}</TableCell>
          {!resolvedHideCost && <TableCell>{r.cost?.toLocaleString?.() ?? '-'}</TableCell>}
          {!resolvedHideCost && <TableCell>{r.sell?.toLocaleString?.() ?? '-'}</TableCell>}
          {!resolvedHideRos && <TableCell sx={styleFor(r.ros)}>{r.ros ?? '-'}%{autoApprove(r.ros)?'*':''}</TableCell>}
          {r.chargeCode && <TableCell>{r.chargeCode}</TableCell>}
        </TableRow>
      ))}
    </TableBody>
  </>);
}
